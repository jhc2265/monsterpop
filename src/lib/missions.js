import { koreaToday } from './bosses'
import { pushState, readCached, writeCached } from './stateCache'

// 하루 경계는 한국시간 자정이다.
// 예전에는 new Date().toISOString() 을 잘라 썼는데 그건 UTC 기준이라, 한국 사용자에게는
// 오전 9시에 미션이 초기화됐다. 보스는 koreaToday 를 쓰고 있어 두 시스템이 9시간 어긋나 있었다.
const today = () => koreaToday()

// 지표별 누적 방식. 콤보와 점수는 "한 판" 기록이라 합산하면 안 된다.
const METRICS = {
  games: 'sum', kills: 'sum', rareKills: 'sum', bossDamage: 'sum', bossClears: 'sum',
  combo: 'max', score: 'max',
}

// 아이콘은 미션 정의가 들고 있는다. 화면 쪽에서 id 로 짝을 맞추면
// 미션 id 를 바꾸는 순간 조용히 기본 아이콘으로 떨어진다(실제로 그렇게 깨졌다).
//
// minLevel 은 그 미션이 가능해지는 레벨이다. 번개 토끼가 Lv.3, 보스가 Lv.10 에 열리므로
// 그 전에 뽑히면 하루 종일 손댈 수 없는 숙제가 된다.
const MISSION_POOL = [
  { id: 'play3', title: '사냥 3회 완료', metric: 'games', goal: 3, rewardXp: 30, icon: 'missionSword', minLevel: 1 },
  { id: 'kills30', title: '몬스터 30마리 처치', metric: 'kills', goal: 30, rewardXp: 30, icon: 'skull', minLevel: 1 },
  // 제목은 320px 화면에서 한 줄에 들어가야 한다 (가용폭 131px). "한 판에서" 는 142px 로 넘쳐 줄이 접혔다.
  { id: 'combo30', title: '한 판 콤보 30 달성', metric: 'combo', goal: 30, rewardXp: 40, icon: 'bolt', minLevel: 1 },
  { id: 'score3000', title: '한 판 3,000점 달성', metric: 'score', goal: 3000, rewardXp: 30, icon: 'trophy', minLevel: 1 },
  { id: 'rare10', title: '희귀 이상 10마리 처치', metric: 'rareKills', goal: 10, rewardXp: 40, icon: 'crown', minLevel: 3 },
  { id: 'play5', title: '사냥 5회 완료', metric: 'games', goal: 5, rewardXp: 40, icon: 'missionSword', minLevel: 1 },
  { id: 'kills50', title: '몬스터 50마리 처치', metric: 'kills', goal: 50, rewardXp: 40, icon: 'skull', minLevel: 1 },
  { id: 'bossDamage300', title: '보스에게 피해 300', metric: 'bossDamage', goal: 300, rewardXp: 50, icon: 'sword', minLevel: 10 },
  { id: 'combo45', title: '한 판 콤보 45 달성', metric: 'combo', goal: 45, rewardXp: 50, icon: 'bolt', minLevel: 1 },
  { id: 'score6000', title: '한 판 6,000점 달성', metric: 'score', goal: 6000, rewardXp: 40, icon: 'trophy', minLevel: 1 },
  { id: 'rare20', title: '희귀 이상 20마리 처치', metric: 'rareKills', goal: 20, rewardXp: 50, icon: 'crown', minLevel: 5 },
  { id: 'bossClear1', title: '보스 1회 격파', metric: 'bossClears', goal: 1, rewardXp: 60, icon: 'sword', minLevel: 10 },
]

export const DAILY_MISSION_COUNT = 3

// 날짜를 시드로 후보를 훑어 세 개를 고른다. 같은 지표가 둘 이상 뽑히면
// "몬스터 30마리"와 "몬스터 50마리"가 같은 날 나란히 떠서 하나가 무의미해진다.
// level 을 넘기지 않으면 가장 보수적으로(1레벨) 본다 — 호출부가 빠뜨려도
// 저레벨에게 불가능한 미션이 뜨는 쪽으로는 실패하지 않게.
export function getMissionsForDate(date = today(), level = 1) {
  const eligible = MISSION_POOL.filter((mission) => level >= mission.minLevel)
  // YYYYMMDD 를 그대로 시드로 쓰면 월이 바뀔 때 숫자가 크게 튀어(0731 → 0801) 회전이 어긋난다.
  // 경과 일수를 쓰면 달이 바뀌어도 하루에 한 칸씩 일정하게 돈다.
  const seed = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000) || 0
  const picked = []
  const usedMetrics = new Set()
  for (let step = 0; step < eligible.length && picked.length < DAILY_MISSION_COUNT; step += 1) {
    const mission = eligible[(seed + step) % eligible.length]
    if (usedMetrics.has(mission.metric)) continue
    usedMetrics.add(mission.metric)
    picked.push(mission)
  }
  return picked
}

const STATE_KEY = 'missions'
const emptyProgress = () => Object.fromEntries(Object.keys(METRICS).map((key) => [key, 0]))

// 날짜를 지우지 않는 정규화. 병합은 어느 쪽이 더 최근인지 알아야 하므로 원본 날짜가 필요하다.
function normalizeState(raw) {
  const state = raw && typeof raw === 'object' ? raw : {}
  return {
    date: typeof state.date === 'string' ? state.date : '',
    // 지표가 늘어난 뒤에도 예전 저장본을 읽을 수 있어야 한다.
    progress: { ...emptyProgress(), ...(state.progress && typeof state.progress === 'object' ? state.progress : {}) },
    claimed: Array.isArray(state.claimed) ? state.claimed : [],
  }
}

function readState(userId) {
  const state = normalizeState(readCached(STATE_KEY, userId))
  if (state.date !== today()) return { date: today(), progress: emptyProgress(), claimed: [] }
  return state
}

function writeState(userId, state) {
  writeCached(STATE_KEY, userId, state)
  pushState(STATE_KEY, userId, state)
}

// 로그인할 때 서버 값과 이 기기 값을 합친다. 어느 쪽도 잃지 않는 방향으로만 움직인다.
//   같은 날이면 지표는 큰 쪽, 받은 보상(claimed)은 합집합 —
//   합산하면 한 기기에서 한 판이 두 판으로 불어나고, claimed 를 빠뜨리면 같은 미션 보상을 두 번 준다.
export function mergeMissionState(localRaw, remoteRaw) {
  if (!localRaw) return remoteRaw ? normalizeState(remoteRaw) : null
  if (!remoteRaw) return normalizeState(localRaw)
  const local = normalizeState(localRaw)
  const remote = normalizeState(remoteRaw)
  if (local.date !== remote.date) {
    // 날짜가 다르면 오늘치가 이긴다. 둘 다 지난 날이면 최신 쪽을 남긴다(어차피 읽을 때 비워진다).
    if (local.date === today()) return local
    if (remote.date === today()) return remote
    return local.date >= remote.date ? local : remote
  }
  return {
    date: local.date,
    progress: Object.fromEntries(Object.keys(METRICS).map((key) => [key, Math.max(local.progress[key] || 0, remote.progress[key] || 0)])),
    claimed: [...new Set([...local.claimed, ...remote.claimed])],
  }
}

// 한 판이 끝났을 때 호출: 진행도를 갱신하고, 이번에 '새로' 완료된 미션의 보상 XP 합계를 반환합니다.
export function recordGameForMissions(userId, stats = {}, level = 1) {
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
  for (const mission of getMissionsForDate(today(), level)) {
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
export function getDailyMissions(userId, level = 1) {
  const state = readState(userId)
  return getMissionsForDate(today(), level).map((mission) => {
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
