export const DAILY_BOSSES = [
  {
    id: 'neon-nightmare',
    name: '네온 나이트메어',
    title: '밤을 삼키는 네온 왕',
    element: '그림자',
    image: '/images/monsters/boss-neon-nightmare.webp',
    background: '/images/bg/battle-arena.webp',
    color: '#f04cbd',
    timeLimit: 40,
    maxHp: 32,
    unlockLevel: 10,
    difficulty: 3,
    firstClearXp: 120,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    description: '깨진 네온 왕관으로 그림자 포털을 지배하는 첫 번째 일일 보스예요.',
    cardCopy: '깨진 네온 왕관의 지배자를 사냥하고 최고 기록에 도전하세요.',
    holdHint: '왕관이 빛나요. 길게 눌러 힘을 모으세요',
  },
  {
    id: 'glitch-king-slime',
    name: '글리치 킹 슬라임',
    title: '왕관을 쓴 시스템 오류',
    element: '글리치',
    image: '/images/monsters/boss-glitch-king-slime-v2.webp',
    background: '/images/bg/battle-arena-glitch-king.webp',
    color: '#55f5ca',
    timeLimit: 40,
    maxHp: 34,
    unlockLevel: 10,
    difficulty: 3,
    firstClearXp: 130,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    description: '픽셀 왕관에서 쏟아지는 오류로 사냥터를 뒤틀어 버리는 두 번째 일일 보스예요.',
    cardCopy: '멈춰 버린 표정 뒤에 숨은 시스템 오류를 빠르게 정리하세요.',
    holdHint: '몸 안의 코어가 열렸어요. 길게 눌러 오류를 멈추세요',
  },
  {
    id: 'solar-eclipse-phoenix',
    name: '이클립스 피닉스',
    title: '꺼진 태양의 잠든 불새',
    element: '일식',
    image: '/images/monsters/boss-solar-eclipse-phoenix-v4.webp',
    background: '/images/bg/battle-arena-solar-eclipse.webp',
    color: '#ff8a2a',
    timeLimit: 40,
    maxHp: 36,
    unlockLevel: 10,
    difficulty: 4,
    firstClearXp: 140,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    description: '검은 태양 파편을 품고 잿빛 사냥터에 잠든 세 번째 일일 보스예요.',
    cardCopy: '잠든 불새가 눈을 뜨기 전에 검은 태양 파편을 식혀 주세요.',
    holdHint: '불꽃이 잦아들었어요. 길게 눌러 열기를 흡수하세요',
  },
  {
    id: 'polar-pod',
    name: '폴라포드',
    title: '미래를 본 빙하의 예언자',
    element: '빙결',
    image: '/images/monsters/boss-polar-pod-v2.webp',
    background: '/images/bg/battle-arena-polar-pod.webp',
    color: '#7fc9ff',
    timeLimit: 40,
    maxHp: 38,
    unlockLevel: 10,
    difficulty: 4,
    firstClearXp: 150,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    description: '얼어붙은 시계 조각으로 사냥터의 시간을 늦추는 네 번째 일일 보스예요.',
    cardCopy: '불안한 예언자의 외눈을 피해 얼어붙은 시간을 다시 움직이세요.',
    holdHint: '시계가 멈췄어요. 길게 눌러 얼음을 녹이세요',
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

export function getBossById(bossId) {
  return DAILY_BOSSES.find((boss) => boss.id === bossId) || null
}

// 도감은 MONSTERS 를 읽는데 보스는 여기에만 있어 넷 중 셋이 빠져 있었다.
// 같은 데이터를 양쪽에 두면 또 어긋나므로, 원본은 여기 하나로 두고
// 도감이 쓰는 모양(등급 · 동작 신호 · 출현 주기)으로 변환만 해서 넘긴다.
export function getBossArchiveEntries() {
  return DAILY_BOSSES.map((boss) => ({
    ...boss,
    grade: '보스',
    isBoss: true,
    cycleDays: DAILY_BOSSES.length,
    // 보스는 한 동작만 쓰지 않는다. 신호가 무작위로 바뀌는 게 핵심이라 그렇게 적는다.
    cue: 'MIX',
    hint: '신호에 맞춰 탭 · 홀드 · 스와이프',
  }))
}

// 예전에는 어떤 보스를 잡아도 'boss' 하나로만 기록됐다.
// 그 시절 기록을 네온 나이트메어 발견으로 인정해 준다.
export function isMonsterDiscovered(discovered = [], monsterId) {
  if (discovered.includes(monsterId)) return true
  return monsterId === 'neon-nightmare' && discovered.includes('boss')
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
