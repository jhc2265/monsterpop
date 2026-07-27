export const DAILY_BOSSES = [
  {
    id: 'neon-nightmare',
    name: '네온 나이트메어',
    title: '밤을 삼키는 네온 왕',
    element: '그림자',
    image: '/images/monsters/boss-neon-nightmare.webp',
    color: '#f04cbd',
    timeLimit: 40,
    maxHp: 30,
    unlockLevel: 10,
    difficulty: 3,
    firstClearXp: 120,
    clearCoins: 500,
    mechanics: ['shield', 'mixed-gestures', 'final-rush'],
    description: '깨진 네온 왕관으로 그림자 포털을 지배하는 첫 번째 일일 보스예요.',
  },
]

export function getDailyBoss(date = new Date()) {
  const koreaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const dayNumber = Number(koreaDate.replaceAll('-', ''))
  return DAILY_BOSSES[dayNumber % DAILY_BOSSES.length]
}
