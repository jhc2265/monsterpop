// 일일 미션 — 매일(자정 기준) 진행도가 초기화됩니다. localStorage 기반이라 별도 DB 세팅이 필요 없습니다.
export const DAILY_MISSIONS = [
  { id: 'play', title: '사냥 3회 완료', metric: 'games', goal: 3, rewardXp: 30 },
  { id: 'kills', title: '몬스터 30마리 처치', metric: 'kills', goal: 30, rewardXp: 30 },
  { id: 'combo', title: '한 판에서 콤보 30 달성', metric: 'combo', goal: 30, rewardXp: 40 },
]

const today = () => new Date().toISOString().slice(0, 10)
const storageKey = (userId) => `monsterpop-missions-${userId}`

function readState(userId) {
  let state = null
  try { state = JSON.parse(localStorage.getItem(storageKey(userId)) || 'null') } catch { state = null }
  if (!state || state.date !== today()) {
    state = { date: today(), progress: { games: 0, kills: 0, combo: 0 }, claimed: [] }
  }
  state.progress = { games: 0, kills: 0, combo: 0, ...state.progress }
  state.claimed = Array.isArray(state.claimed) ? state.claimed : []
  return state
}

function writeState(userId, state) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(state)) } catch { /* 저장 실패는 무시 */ }
}

// 한 판이 끝났을 때 호출: 진행도를 갱신하고, 이번에 '새로' 완료된 미션의 보상 XP 합계를 반환합니다.
export function recordGameForMissions(userId, { maxCombo = 0, totalKills = 0 } = {}) {
  const state = readState(userId)
  state.progress.games += 1
  state.progress.kills += totalKills
  state.progress.combo = Math.max(state.progress.combo, maxCombo)
  let bonusXp = 0
  for (const mission of DAILY_MISSIONS) {
    const done = (state.progress[mission.metric] || 0) >= mission.goal
    if (done && !state.claimed.includes(mission.id)) {
      bonusXp += mission.rewardXp
      state.claimed.push(mission.id)
    }
  }
  writeState(userId, state)
  return bonusXp
}

// 홈 화면 표시용: 각 미션의 현재 진행값·완료 여부·퍼센트
export function getDailyMissions(userId) {
  const state = readState(userId)
  return DAILY_MISSIONS.map((mission) => {
    const raw = state.progress[mission.metric] || 0
    return {
      ...mission,
      raw,
      value: Math.min(raw, mission.goal),
      done: raw >= mission.goal,
      percent: Math.min(100, Math.round((raw / mission.goal) * 100)),
    }
  })
}
