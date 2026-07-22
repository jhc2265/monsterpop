export const MONSTERS = [
  { id: 'slime', name: '말랑 슬라임', grade: '일반', score: 100, weight: 50, image: '/images/slime.png', color: '#b84dff', emoji: '●' },
  { id: 'rabbit', name: '번개 토끼', grade: '희귀', score: 200, weight: 28, image: '/images/rabbit.png', color: '#3ee8ff', emoji: '◆' },
  { id: 'fox', name: '불꽃 여우', grade: '영웅', score: 300, weight: 16, image: '/images/fox.png', color: '#ff6b57', emoji: '▲' },
  { id: 'boss', name: '그림자 대왕', grade: '보스', score: 500, weight: 6, image: '/images/boss.png', color: '#ff4fc8', emoji: '★' },
]

export function pickRandomMonster() {
  const total = MONSTERS.reduce((sum, monster) => sum + monster.weight, 0)
  let random = Math.random() * total
  for (const monster of MONSTERS) {
    if (random < monster.weight) return monster
    random -= monster.weight
  }
  return MONSTERS[0]
}
