import { fetchState, pushState, readCached, writeCached } from './stateCache'
import { mergeMissionState } from './missions'
import { mergeBossState } from './bosses'
import { mergePreferenceState } from './preferences'
import { mergeTutorialState } from './tutorial'

// 병합 규칙은 각 상태를 아는 파일이 들고 있는다. 여기서 모양을 다시 적으면
// missions.js 의 지표를 하나 늘릴 때 이쪽이 조용히 뒤처진다.
// 규칙이 종류마다 다르다는 점도 그 파일에 남아야 한다 —
// 진행도와 안내 확인 여부는 "잃지 않는 쪽", 설정은 "마지막에 저장한 쪽"이 이긴다.
//
// 각 함수는 (이 기기 값, 서버 값, userId) 를 받는다. userId 는 계정 단위로 옮기기 전
// 예전 키를 이어받아야 하는 쪽(tutorial)에만 필요하고, 나머지는 무시한다.
const MERGERS = {
  missions: mergeMissionState,
  boss: mergeBossState,
  preferences: mergePreferenceState,
  tutorial: mergeTutorialState,
}

// 로그인 직후 한 번 부른다.
// 서버 값과 이 기기에 남아 있던 값을 합쳐 캐시에 쓰고, 합친 결과가 서버와 다르면 되밀어 올린다.
// 되밀어 올리는 쪽이 중요하다 — 그동안 한 기기에만 쌓여 있던 기록이 이때 서버로 올라간다.
export async function pullUserState(userId) {
  const { ok, state: remote } = await fetchState(userId)
  // 못 읽었을 때 빈 값으로 병합하면 이 기기 기록을 서버의 '없음'으로 덮어쓸 수 있다.
  if (!ok) return false

  for (const [key, merge] of Object.entries(MERGERS)) {
    const local = readCached(key, userId)
    const remoteValue = remote[key] ?? null
    const merged = merge(local, remoteValue, userId)
    if (!merged) continue
    writeCached(key, userId, merged)
    if (JSON.stringify(merged) !== JSON.stringify(remoteValue)) pushState(key, userId, merged)
  }
  return true
}
