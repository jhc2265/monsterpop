export const DAILY_BOSSES = [
  {
    id: 'neon-nightmare',
    name: '네온 나이트메어',
    title: '밤을 삼키는 네온 왕',
    element: '그림자',
    image: '/images/monsters/boss-neon-nightmare.webp',
    color: '#f04cbd',
    timeLimit: 40,
    maxHp: 32,
    unlockLevel: 10,
    difficulty: 3,
    firstClearXp: 120,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    description: '깨진 네온 왕관으로 그림자 포털을 지배하는 첫 번째 일일 보스예요.',
    cardCopy: '깨진 네온 왕관의 지배자를 사냥하고 최고 기록에 도전하세요.',
  },
  {
    id: 'glitch-king-slime',
    name: '글리치 킹 슬라임',
    title: '왕관을 쓴 시스템 오류',
    element: '글리치',
    image: '/images/monsters/boss-glitch-king-slime-v2.webp',
    color: '#55f5ca',
    timeLimit: 40,
    maxHp: 34,
    unlockLevel: 10,
    difficulty: 3,
    firstClearXp: 130,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    description: '픽셀 왕관에서 쏟아지는 오류로 사냥터를 뒤틀어 버리는 두 번째 일일 보스예요.',
    cardCopy: '멈춰 버린 표정 뒤에 숨은 시스템 오류를 빠르게 정리하세요.',
  },
]

// 보스는 한국시간 자정에 바뀐다. 클리어 기록도 같은 기준을 써야 해서 함수로 뺐다.
export function koreaToday(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getDailyBoss(date = new Date()) {
  const dayNumber = Number(koreaToday(date).replaceAll('-', ''))
  return DAILY_BOSSES[dayNumber % DAILY_BOSSES.length]
}

// 반복 클리어로 보상을 무한히 받지 못하도록 "오늘 첫 클리어"를 기록한다.
// 미션과 같은 localStorage 방식이라 별도 DB 세팅이 필요 없다.
const storageKey = (userId) => `monsterpop-boss-${userId}`

function readState(userId) {
  let state = null
  try { state = JSON.parse(localStorage.getItem(storageKey(userId)) || 'null') } catch { state = null }
  if (!state || typeof state !== 'object') state = {}
  return {
    date: state.date || '',
    clearedToday: Array.isArray(state.clearedToday) ? state.clearedToday : [],
    bestTimeLeft: state.bestTimeLeft && typeof state.bestTimeLeft === 'object' ? state.bestTimeLeft : {},
    streak: Number.isFinite(state.streak) ? state.streak : 0,
  }
}

function writeState(userId, state) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(state)) } catch { /* 저장 실패는 무시 */ }
}

export function hasClearedBossToday(userId, bossId) {
  const state = readState(userId)
  return state.date === koreaToday() && state.clearedToday.includes(bossId)
}

export function getBossRecord(userId, bossId) {
  const state = readState(userId)
  return {
    bestTimeLeft: state.bestTimeLeft[bossId] ?? null,
    streak: state.date === koreaToday() ? state.streak : 0,
    clearedToday: state.date === koreaToday() && state.clearedToday.includes(bossId),
  }
}

// 클리어를 기록하고, 오늘 첫 클리어인지와 개인 최고 기록 갱신 여부를 돌려준다.
export function recordBossClear(userId, bossId, { timeLeft = 0 } = {}) {
  const today = koreaToday()
  const state = readState(userId)
  const isNewDay = state.date !== today
  const firstToday = isNewDay || !state.clearedToday.includes(bossId)

  // 어제 클리어했으면 스트릭을 잇고, 하루라도 걸렀으면 1부터 다시 센다.
  const yesterday = koreaToday(new Date(Date.now() - 86400000))
  const streak = isNewDay ? (state.date === yesterday ? state.streak + 1 : 1) : state.streak

  const previousBest = state.bestTimeLeft[bossId] ?? -1
  const newRecord = timeLeft > previousBest

  writeState(userId, {
    date: today,
    clearedToday: isNewDay ? [bossId] : [...new Set([...state.clearedToday, bossId])],
    bestTimeLeft: { ...state.bestTimeLeft, [bossId]: newRecord ? timeLeft : previousBest },
    streak,
  })

  return { firstToday, newRecord, streak, bestTimeLeft: newRecord ? timeLeft : previousBest }
}
