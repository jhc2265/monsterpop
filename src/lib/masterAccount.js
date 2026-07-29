import { supabase } from './supabase'
import { MONSTERS } from './monsters'
import { DAILY_BOSSES } from './bosses'
import { LEVEL_XP, saveStoredProgress } from './progression'

// 개발·시연용 마스터 계정. 첫 화면의 숨은 탭으로만 들어간다.
//
// 이 파일은 개발 빌드에만 들어간다. Hero 에서 import.meta.env.DEV 뒤의 동적 import 로만
// 불러오므로, 프로덕션 빌드에서는 조건이 false 로 치환되며 이 모듈째 번들에서 빠진다.
// 여기 있는 비밀번호가 배포본에 노출되지 않는 건 그 구조에 달려 있으니,
// 다른 곳에서 정적 import 하지 말 것.
export const MASTER_EMAIL = 'test@gmail.com'
const MASTER_PASSWORD = 'test1234'
const MASTER_NICKNAME = '마스터'

// 도감을 전부 채운다. 보스는 MONSTERS 에 없어서 따로 합쳐야 한다.
function allMonsterIds() {
  return [...new Set([...MONSTERS.map((monster) => monster.id), ...DAILY_BOSSES.map((boss) => boss.id)])]
}

const MAX_XP = LEVEL_XP[LEVEL_XP.length - 1]

export async function enterMasterAccount() {
  let { data, error } = await supabase.auth.signInWithPassword({ email: MASTER_EMAIL, password: MASTER_PASSWORD })

  // 계정이 아직 없으면 만들고 다시 로그인한다.
  if (error) {
    const signUp = await supabase.auth.signUp({
      email: MASTER_EMAIL,
      password: MASTER_PASSWORD,
      options: { data: { nickname: MASTER_NICKNAME } },
    })
    if (signUp.error) throw new Error(`마스터 계정을 만들지 못했습니다: ${signUp.error.message}`)
    if (signUp.data.session) data = signUp.data
    else {
      const retry = await supabase.auth.signInWithPassword({ email: MASTER_EMAIL, password: MASTER_PASSWORD })
      // 이메일 인증이 켜져 있으면 여기서 막힌다 — 그때는 인증을 끄거나 한 번 수동 확인해야 한다.
      if (retry.error) throw new Error('마스터 계정을 만들었지만 로그인하지 못했습니다. Supabase 이메일 인증 설정을 확인해 주세요.')
      data = retry.data
    }
  }

  const userId = data?.user?.id
  if (!userId) throw new Error('마스터 계정 세션을 얻지 못했습니다.')

  const discovered = allMonsterIds()
  // 서버 저장이 막혀도 로컬 진행도는 채워두면 화면상 만렙으로 보인다.
  saveStoredProgress(userId, { xp: MAX_XP, discovered })
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ nickname: MASTER_NICKNAME, xp: MAX_XP, discovered_monsters: discovered })
    .eq('id', userId)

  return { userId, xp: MAX_XP, discovered: discovered.length, profileSynced: !profileError }
}
