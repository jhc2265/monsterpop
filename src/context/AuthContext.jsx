import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getStoredProgress, saveStoredProgress } from '../lib/progression'
import { getSyncError, subscribeSyncError } from '../lib/stateCache'
import { pullUserState } from '../lib/syncState'
import { GUEST_ID, GUEST_PROFILE, readGuestFlag, writeGuestFlag } from '../lib/guest'

const AuthContext = createContext(null)

// 프로필 행을 읽고, 없으면 만든다.
// 가입 트리거(on_auth_user_created)보다 먼저 만들어진 계정은 행이 없다. 그걸 그대로 두면
// 닉네임과 레벨이 늘 기본값으로 보이고, 진행도 저장(update)은 0행을 갱신하며 조용히 성공한다.
async function loadProfile(user) {
  // .single() 은 0행을 에러로 돌려준다. 없을 수 있는 값이라 maybeSingle 로 읽는다.
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) return { profile: null, error: `프로필을 불러오지 못했어요: ${error.message}` }
  if (data) return { profile: data, error: '' }

  const nickname = user.user_metadata?.nickname || user.email?.split('@')[0] || '헌터'
  const created = await supabase.from('profiles').insert({ id: user.id, nickname }).select().single()
  if (created.error) return { profile: null, error: `프로필을 만들지 못했어요: ${created.error.message}` }
  return { profile: created.data, error: '' }
}

// 이 기기에만 쌓여 있던 진행도를 서버로 올린다.
//
// 예전에는 서버 저장이 실패해도 화면이 localStorage 값을 대신 보여줬다(progression.resolveProgress).
// 그래서 원래 쓰던 기기에서는 정상으로 보이고, 다른 기기로 로그인한 순간에야 기록이 사라진 걸 알게 됐다.
// XP 는 큰 쪽, 도감은 합집합 — 어느 방향으로도 줄지 않으니 여러 기기를 오가도 안전하다.
async function reconcileProgress(user, profile) {
  const stored = getStoredProgress(user.id)
  const serverXp = Number.isFinite(profile?.xp) ? profile.xp : 0
  const serverDiscovered = Array.isArray(profile?.discovered_monsters) ? profile.discovered_monsters : []
  const xp = Math.max(serverXp, Number(stored.xp) || 0)
  const discovered = [...new Set([...serverDiscovered, ...(Array.isArray(stored.discovered) ? stored.discovered : [])])]

  saveStoredProgress(user.id, { xp, discovered })
  if (xp === serverXp && discovered.length === serverDiscovered.length) return { profile, error: '' }

  const { data, error } = await supabase
    .from('profiles')
    .update({ xp, discovered_monsters: discovered })
    .eq('id', user.id)
    .select()
    .single()
  if (error) return { profile, error: `진행도를 서버에 올리지 못했어요: ${error.message}` }
  return { profile: data, error: '' }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // 프로필·미션·보스 기록을 서버와 맞추는 동안은 true. 이게 끝나기 전에 화면을 그리면
  // 새 기기에서 LV.1 · 미션 0개가 한 번 스쳐 보인다.
  const [syncing, setSyncing] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [pushError, setPushError] = useState(getSyncError())
  // 가입 없이 체험하는 상태. 새로고침해도 유지되도록 localStorage 에 표시만 남긴다.
  const [guest, setGuest] = useState(readGuestFlag)

  useEffect(() => {
    // 새로고침 후에도 로그인 유지
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // 게임 중 저장 실패도 알려야 한다. 결과 화면을 떠난 뒤에 실패하면 아무도 못 본다.
  useEffect(() => subscribeSyncError((error) => setPushError(error)), [])

  useEffect(() => {
    const user = session?.user
    if (!user) {
      setProfile(null)
      setProfileError('')
      setSyncing(false)
      return
    }

    let cancelled = false
    setSyncing(true)
    ;(async () => {
      const loaded = await loadProfile(user)
      if (cancelled) return
      if (!loaded.profile) {
        setProfile(null)
        setProfileError(loaded.error)
      } else {
        const reconciled = await reconcileProgress(user, loaded.profile)
        if (cancelled) return
        setProfile(reconciled.profile)
        setProfileError(reconciled.error)
      }
      await pullUserState(user.id)
      if (cancelled) return
      setSyncing(false)
    })()

    return () => { cancelled = true }
  }, [session])

  // 실제 로그인이 있으면 그쪽이 이긴다 — 체험 중 가입하면 자연히 계정 사용자로 넘어간다.
  const guestActive = guest && !session?.user

  const value = {
    session,
    user: session?.user ?? (guestActive ? { id: GUEST_ID, isGuest: true } : null),
    isGuest: guestActive,
    profile: guestActive ? GUEST_PROFILE : profile,
    loading,
    syncing,
    // 계정 데이터가 서버에 닿지 않는 상태를 화면에 드러내기 위한 값이다.
    // 게스트는 서버에 저장할 것이 없으므로 경고할 것도 없다.
    syncError: guestActive ? '' : (profileError || pushError),
    enterGuest: () => { writeGuestFlag(true); setGuest(true) },
    exitGuest: () => { writeGuestFlag(false); setGuest(false) },
    signOut: async () => {
      writeGuestFlag(false)
      setGuest(false)
      await supabase.auth.signOut()
    },
    refreshProfile: async () => {
      if (!session?.user) return
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (error) {
        setProfileError(`프로필을 불러오지 못했어요: ${error.message}`)
        return
      }
      setProfileError('')
      setProfile(data)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
