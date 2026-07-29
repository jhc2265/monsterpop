export const DAILY_BOSSES = [
  {
    id: 'neon-nightmare',
    name: '네온 나이트메어',
    title: '밤을 삼키는 네온 왕',
    element: '그림자',
    image: '/images/monsters/boss-neon-nightmare.webp',
    background: '/images/bg/battle-arena.webp',
    color: '#f04cbd',
    timeLimit: 45,
    maxHp: 300,
    damagePerHit: 10,
    unlockLevel: 10,
    difficulty: 2,
    firstClearXp: 120,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    // 데모 스테이지가 3박자로 돌아간다. beats 는 각 박자의 자막이라 순서가 곧 연출 순서다.
    mechanic: {
      name: '그림자 장막',
      short: 'SHADOW VEIL',
      meter: '반응 시간',
      beats: [
        '네 번째 신호마다 장막이 내려와요',
        '반응 시간이 28% 짧아져요',
        '걷히기 전에 맞추면 피해 1.5배!',
      ],
    },
    description: '깨진 네온 왕관으로 그림자 포털을 지배하는 첫 번째 일일 보스예요.',
    cardCopy: '깨진 네온 왕관의 지배자를\n사냥해 최고 기록에 도전하세요.',
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
    timeLimit: 48,
    maxHp: 420,
    damagePerHit: 12,
    unlockLevel: 10,
    difficulty: 3,
    firstClearXp: 130,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    mechanic: {
      name: '신호 오류',
      short: 'SIGNAL ERROR',
      meter: '신호 복구',
      beats: [
        '신호 10번 중 4번은 ERROR로 가려져요',
        '가려진 동안 누르면 오작동 · 시간 -2초',
        'ERROR가 사라진 뒤에 누르세요',
      ],
    },
    description: '픽셀 왕관에서 쏟아지는 오류로 사냥터를 뒤틀어 버리는 두 번째 일일 보스예요.',
    cardCopy: '왕관에 숨은 시스템 오류를 찾아\n뒤틀린 사냥터를 복구하세요.',
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
    timeLimit: 52,
    maxHp: 560,
    damagePerHit: 14,
    unlockLevel: 10,
    difficulty: 4,
    firstClearXp: 140,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    mechanic: {
      name: '과열',
      short: 'OVERHEAT',
      meter: '열기',
      beats: [
        '실수할 때마다 열기가 40%씩 쌓여요',
        '100%가 되면 태양 폭발 · 시간 -6초 + 보스 체력 회복',
        'HOLD를 성공하면 열기가 40% 식어요',
      ],
    },
    description: '검은 태양 파편을 품고 잿빛 사냥터에 잠든 세 번째 일일 보스예요.',
    cardCopy: '잠든 불새가 깨어나기 전에\n검은 태양의 열기를 식혀 주세요.',
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
    timeLimit: 58,
    maxHp: 720,
    damagePerHit: 16,
    unlockLevel: 10,
    difficulty: 5,
    firstClearXp: 150,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    mechanic: {
      name: '시간 동결',
      short: 'TIME FREEZE',
      meter: '해동',
      beats: [
        '5번 성공하면 얼어붙어요',
        '제한 시간은 멈추지만 1.6초 안에 깨야 해요',
        '좌우로 밀어 탈출! 놓치면 시간 -3초',
      ],
    },
    description: '얼어붙은 시계 조각으로 사냥터의 시간을 늦추는 네 번째 일일 보스예요.',
    cardCopy: '빙하 예언자의 외눈을 피해\n멈춰 버린 시간을 움직이세요.',
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

export function koreaWeekday(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(date)
}

const WEEKDAY_BOSS = {
  Mon: 'neon-nightmare',
  Tue: 'glitch-king-slime',
  Wed: 'solar-eclipse-phoenix',
  Thu: 'neon-nightmare',
  Fri: 'glitch-king-slime',
  Sat: 'solar-eclipse-phoenix',
  Sun: 'polar-pod',
}
const BOSS_SCHEDULE_LABEL = {
  'neon-nightmare': '월·목 출현',
  'glitch-king-slime': '화·금 출현',
  'solar-eclipse-phoenix': '수·토 출현',
  'polar-pod': '일요일 출현',
}

export function getDailyBoss(date = new Date()) {
  return getBossById(WEEKDAY_BOSS[koreaWeekday(date)]) || DAILY_BOSSES[0]
}

export function isSundayBossDay(date = new Date()) {
  return koreaWeekday(date) === 'Sun'
}

export function getAvailableBosses(date = new Date()) {
  return DAILY_BOSSES
}

export function isBossAvailableToday(bossId, date = new Date()) {
  return DAILY_BOSSES.some((boss) => boss.id === bossId)
}

export function getBossScheduleLabel(bossId) {
  return BOSS_SCHEDULE_LABEL[bossId] || '출현 일정 확인'
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
    rewardDate: state.rewardDate || state.date || '',
    clearedToday: Array.isArray(state.clearedToday) ? state.clearedToday : [],
    bestTimeLeft: state.bestTimeLeft && typeof state.bestTimeLeft === 'object' ? state.bestTimeLeft : {},
    // 도전 보상은 스트릭용 date 와 따로 날짜를 물고 있어야 한다.
    // 여기서 date 를 건드리면 실패 후 클리어했을 때 recordBossClear 가 "새 날"을 놓친다.
    attempts: state.attempts && typeof state.attempts === 'object'
      ? { date: state.attempts.date || '', values: state.attempts.values || {} }
      : { date: '', values: {} },
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
  // 모든 보스는 자유롭게 플레이할 수 있지만 일일 XP는 오늘의 보스 첫 처치에만 지급한다.
  const isDailyBoss = bossId === getDailyBoss().id
  const firstToday = isDailyBoss && (isNewDay || !state.clearedToday.includes(bossId))

  // 자유 도전은 스트릭에 영향을 주지 않고 오늘의 보스 첫 처치만 이어간다.
  const yesterday = koreaToday(new Date(Date.now() - 86400000))
  const streak = firstToday ? (state.rewardDate === yesterday ? state.streak + 1 : 1) : state.streak

  const previousBest = state.bestTimeLeft[bossId] ?? -1
  const newRecord = timeLeft > previousBest

  writeState(userId, {
    date: today,
    rewardDate: firstToday ? today : state.rewardDate,
    clearedToday: isNewDay ? [bossId] : [...new Set([...state.clearedToday, bossId])],
    bestTimeLeft: { ...state.bestTimeLeft, [bossId]: newRecord ? timeLeft : previousBest },
    // 격파했으면 진행도는 100%. 이후 같은 보스에서 져도 도전 보상이 다시 나오지 않는다.
    attempts: { date: today, values: { ...todayAttempts(state, today), [bossId]: 1 } },
    streak,
  })

  return { firstToday, isDailyBoss, newRecord, streak, bestTimeLeft: newRecord ? timeLeft : previousBest }
}

function todayAttempts(state, today) {
  return state.attempts.date === today ? state.attempts.values : {}
}

// 실패한 도전의 보상. 진행도에 비례하되 "오늘 세운 최고 기록을 넘어선 만큼"만 지급한다.
// 매번 전액을 주면 62% 에서 일부러 지고 반복하는 편이 격파보다 이득이 되어버린다.
export function recordBossAttempt(userId, bossId, { progress = 0, maxXp = 0 } = {}) {
  const today = koreaToday()
  const state = readState(userId)
  const attempts = todayAttempts(state, today)
  const previousBest = attempts[bossId] ?? 0
  const best = Math.max(previousBest, Math.min(1, progress))
  const gain = Math.max(0, Math.round(maxXp * best) - Math.round(maxXp * previousBest))

  writeState(userId, { ...state, attempts: { date: today, values: { ...attempts, [bossId]: best } } })

  return { gain, best, previousBest, improved: best > previousBest }
}
