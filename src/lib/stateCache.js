import { supabase } from './supabase'
import { isGuest } from './guest'

// 미션·보스 기록의 원본은 서버(user_state 테이블)이고, localStorage 는 그 캐시다.
//
// 왜 캐시가 필요한가: 홈의 미션 목록과 보스 선택의 기록은 렌더 도중 동기로 읽힌다.
// 그걸 전부 await 로 바꾸면 화면마다 로딩 상태를 새로 만들어야 한다.
// 그래서 읽기는 캐시가 즉시 답하고, 쓰기는 캐시에 먼저 적은 뒤 서버로 밀어 올린다.
// 캐시를 서버 값과 맞추는 일은 로그인 직후 syncState.pullUserState 한 곳에서만 한다.
//
// 키 이름은 예전 그대로다 — 'missions' → monsterpop-missions-{userId}.
// 바꾸면 지금 사용자의 기기에 남아 있는 기록이 그대로 고아가 된다.
const cacheKey = (key, userId) => `monsterpop-${key}-${userId}`

export function readCached(key, userId) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(key, userId)) || 'null')
  } catch {
    return null
  }
}

export function writeCached(key, userId, value) {
  try { localStorage.setItem(cacheKey(key, userId), JSON.stringify(value)) } catch { /* 저장 실패는 무시 */ }
}

// 동기화 실패는 조용히 넘기지 않는다. 예전에는 서버 저장이 막혀도 화면이 로컬 값을 보여줘서,
// 다른 기기로 로그인해 기록이 사라진 뒤에야 실패를 알 수 있었다.
let syncError = ''
const listeners = new Set()

export function getSyncError() {
  return syncError
}

export function subscribeSyncError(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function setSyncError(message) {
  syncError = message
  listeners.forEach((listener) => listener(syncError))
}

// 밀어 올리는 중인 요청들. 결과 화면처럼 저장 직후 이동할 수 있는 곳에서 flushState 로 기다린다.
const pending = new Set()

export function pushState(key, userId, value) {
  // 게스트는 서버 계정이 없다. 올리려 하면 user_id(uuid) 형변환부터 실패하고,
  // 그 에러가 동기화 실패 배너로 떠서 체험 중에 경고가 뜬다.
  if (isGuest(userId)) return Promise.resolve()
  const task = (async () => {
    try {
      const { error } = await supabase
        .from('user_state')
        .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' })
      setSyncError(error ? `기록을 서버에 저장하지 못했어요: ${error.message}` : '')
    } catch (err) {
      setSyncError(`기록을 서버에 저장하지 못했어요: ${err.message}`)
    }
  })()
  pending.add(task)
  task.finally(() => pending.delete(task))
  return task
}

export async function flushState() {
  await Promise.all([...pending])
}

// 실패와 "행이 없음"은 다르다. 실패에 null 을 돌려주면 부르는 쪽이 빈 상태로 덮어쓸 수 있으므로
// 성공 여부를 따로 알려준다.
export async function fetchState(userId) {
  try {
    const { data, error } = await supabase.from('user_state').select('key, value').eq('user_id', userId)
    if (error) {
      setSyncError(`기록을 불러오지 못했어요: ${error.message}`)
      return { ok: false, state: {} }
    }
    setSyncError('')
    return { ok: true, state: Object.fromEntries((data || []).map((row) => [row.key, row.value])) }
  } catch (err) {
    setSyncError(`기록을 불러오지 못했어요: ${err.message}`)
    return { ok: false, state: {} }
  }
}
