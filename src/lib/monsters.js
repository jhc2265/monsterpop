// 몬스터 정의. image 경로에 본인이 만든 AI PNG 를 넣으면 자동 반영됩니다.
// public/images/ 폴더에 아래 파일명으로 넣어주세요.
// 파일이 없으면 컬러 원형 플레이스홀더가 대신 표시됩니다(앱은 정상 작동).

export const MONSTERS = [
  {
    id: 'slime',
    name: '말랑 슬라임',
    grade: '일반',
    score: 100,
    weight: 50, // 등장 확률 가중치
    image: '/images/slime.png',
    color: '#22D3EE',
    emoji: '🟦',
  },
  {
    id: 'rabbit',
    name: '번개 토끼',
    grade: '빠름',
    score: 200,
    weight: 28,
    image: '/images/rabbit.png',
    color: '#FBBF24',
    emoji: '⚡',
  },
  {
    id: 'fox',
    name: '불꽃 여우',
    grade: '희귀',
    score: 300,
    weight: 16,
    image: '/images/fox.png',
    color: '#EC4899',
    emoji: '🔥',
  },
  {
    id: 'boss',
    name: '그림자 박쥐',
    grade: '보스',
    score: 500,
    weight: 6,
    image: '/images/boss.png',
    color: '#7C3AED',
    emoji: '🦇',
  },
]

export function pickRandomMonster() {
  const total = MONSTERS.reduce((sum, m) => sum + m.weight, 0)
  let r = Math.random() * total
  for (const m of MONSTERS) {
    if (r < m.weight) return m
    r -= m.weight
  }
  return MONSTERS[0]
}
