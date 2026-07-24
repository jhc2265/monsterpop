export const MONSTERS = [
  { id: 'slime', name: '말랑 슬라임', grade: '일반', score: 100, weight: 50, speed: '느림', image: '/images/slime.png', color: '#b84dff', emoji: '●', description: '말랑한 몸으로 통통 튀어 다니는 가장 기본적인 몬스터예요.' },
  { id: 'rabbit', name: '번개 토끼', grade: '희귀', score: 200, weight: 28, speed: '매우 빠름', image: '/images/rabbit.png', color: '#3ee8ff', emoji: '◆', description: '전기를 두른 채 순식간에 사냥터를 가로지르는 재빠른 몬스터예요.' },
  { id: 'fox', name: '불꽃 여우', grade: '영웅', score: 300, weight: 16, speed: '빠름', image: '/images/fox.png', color: '#ff6b57', emoji: '▲', description: '뜨거운 불꽃 꼬리로 헌터를 교란하는 영웅 등급 몬스터예요.' },
  { id: 'boss', name: '그림자 대왕', grade: '보스', score: 500, weight: 6, speed: '보통', image: '/images/boss.png', color: '#ff4fc8', emoji: '★', description: '어둠의 포털을 지배하는 강력한 보스. 여러 번 공격해야 처치할 수 있어요.' },
]

export function pickRandomMonster(allowedIds = MONSTERS.map((monster) => monster.id)) {
  const pool = MONSTERS.filter((monster) => allowedIds.includes(monster.id))
  const available = pool.length ? pool : [MONSTERS[0]]
  const total = available.reduce((sum, monster) => sum + monster.weight, 0)
  let random = Math.random() * total
  for (const monster of available) {
    if (random < monster.weight) return monster
    random -= monster.weight
  }
  return available[0]
}
