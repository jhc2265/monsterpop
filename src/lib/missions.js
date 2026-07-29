import { koreaToday } from './bosses'

// 하루 경계는 한국시간 자정이다.
// 예전에는 new Date().toISOString() 을 잘라 썼는데 그건 UTC 기준이라, 한국 사용자에게는
// 오전 9시에 미션이 초기화됐다. 보스는 koreaToday 를 쓰고 있어 두 시스템이 9시간 어긋나 있었다.
const today = () => koreaToday()

// 지표별 누적 방식. 콤보와 점수는 "한 판" 기록이라 합산하면 안 된다.
const METRICS = { games: 'sum', kills: 'sum', combo: 'max', score: 'max' }

// 날마다 도는 후보. 미션이 열리는 Lv.2(말랑 슬라임만 등장) 에서도 전부 달성 가능해야 한다.
// 희귀 몬스터나 보스를 요구하는 미션을 넣으면 저레벨에게는 불가능한 숙제가 된다.
const MISSION_POOL = [
  { id: 'play3', title: '사냥 3회 완료', metric: 'games', goal: 3, rewardXp: 30 },
  { id: 'kills30', title: '몬스터 30마리 처치', metric: 'kills', goal: 30, rewardXp: 30 },
  // 제목은 320px 화면에서 한 줄에 들어가야 한다 (가용폭 131px). "한 판에서" 는 142px 로 넘쳐 줄이 접혔다.
  { id: 'combo30', title: '한 판 콤보 30 달성', metric: 'combo', goal: 30, rewardXp: 40 },
  { id: 'score3000', title: '한 판 3,000점 달성', metric: 'score', goal: 3000, rewardXp: 30 },
  { id: 'play5', title: '사냥 5회 완료', metric: 'games', goal: 5, rewardXp: 40 },
  { id: 'kills50', title: '몬스터 50마리 처치', metric: 'kills', goal: 50, rewardXp: 40 },
  { id: 'combo45', title: '한 판 콤보 45 달성', metric: 'combo', goal: 45, rewardXp: 50 },
  { id: 'score6000', title: '한 판 6,000점 달성', metric: 'score', goal: 6000, rewardXp: 40 },
]

export const DAILY_MISSION_COUNT = 3

// 날짜를 시드로 후보를 훑어 세 개를 고른다. 같은 지표가 둘 이상 뽑히면
// "몬스터 30마리"와 "몬스터 50마리"가 같은 날 나란히 떠서 하나가 무의미해진다.
export function getMissionsForDate(date = today()) {
  // YYYYMMDD 를 그대로 시드로 쓰면 월이 바뀔 때 숫자가 크게 튀어(0731 → 0801) 회전이 어긋난다.
  // 경과 일수를 쓰면 달이 바뀌어도 하루에 한 칸씩 일정하게 돈다.
  const seed = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000) || 0
  const picked = []
  const usedMetrics = new Set()
  for (let step = 0; step < MISSION_POOL.length && picked.length < DAILY_MISSION_COUNT; step += 1) {
    const mission = MISSION_POOL[(seed + step) % MISSION_POOL.length]
    if (usedMetrics.has(mission.metric)) continue
    usedMetrics.add(mission.metric)
    picked.push(mission)
  }
  return picked
}

const storageKey = (userId) => `monsterpop-missions-${userId}`
const emptyProgress = () => Object.fromEntries(Object.keys(METRICS).map((key) => [key, 0]))

function readState(userId) {
  let state = null
  try { state = JSON.parse(localStorage.getItem(storageKey(userId)) || 'null') } catch { state = null }
  if (!state || state.date !== today()) {
    state = { date: today(), progress: emptyProgress(), claimed: [] }
  }
  // 지표가 늘어난 뒤에도 예전 저장본을 읽을 수 있어야 한다.
  state.progress = { ...emptyProgress(), ...state.progress }
  state.claimed = Array.isArray(state.claimed) ? state.claimed : []
  return state
}

function writeState(userId, state) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(state)) } catch { /* 저장 실패는 무시 */ }
}

// 한 판이 끝났을 때 호출: 진행도를 갱신하고, 이번에 '새로' 완료된 미션의 보상 XP 합계를 반환합니다.
export function recordGameForMissions(userId, stats = {}) {
  const state = readState(userId)
  state.progress.games += 1
  for (const [key, mode] of Object.entries(METRICS)) {
    if (key === 'games') continue
    const value = Number(stats[key]) || 0
    state.progress[key] = mode === 'max'
      ? Math.max(state.progress[key] || 0, value)
      : (state.progress[key] || 0) + value
  }

  let bonusXp = 0
  for (const mission of getMissionsForDate()) {
    const done = (state.progress[mission.metric] || 0) >= mission.goal
    if (done && !state.claimed.includes(mission.id)) {
      bonusXp += mission.rewardXp
      state.claimed.push(mission.id)
    }
  }
  writeState(userId, state)
  return bonusXp
}

// 홈 화면 표시용: 오늘 뽑힌 미션 각각의 현재 진행값·완료 여부·퍼센트
export function getDailyMissions(userId) {
  const state = readState(userId)
  return getMissionsForDate().map((mission) => {
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
