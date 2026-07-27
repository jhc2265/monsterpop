export const MONSTERS = [
  { id: 'slime', name: '말랑 슬라임', grade: '일반', score: 100, weight: 50, hp: 1, speed: '느림', gesture: 'tap', cue: 'TAP', hint: '한 번 터치', escapeDuration: 5600, image: '/images/monsters/slime.webp', color: '#b84dff', emoji: '●', description: '말랑한 몸으로 통통 튀어 다니는 가장 기본적인 몬스터예요.' },
  { id: 'rabbit', name: '번개 토끼', grade: '희귀', score: 200, weight: 28, hp: 1, speed: '매우 빠름', gesture: 'swipe-x', cue: '↔', hint: '좌우로 밀기', behavior: 'teleport', escapeDuration: 3600, image: '/images/monsters/rabbit.webp', color: '#3ee8ff', emoji: '◆', description: '전기를 두른 채 순식간에 사냥터를 가로지르는 재빠른 몬스터예요.' },
  { id: 'fox', name: '불꽃 여우', grade: '영웅', score: 300, weight: 16, hp: 1, speed: '빠름', gesture: 'double-tap', cue: '×2', hint: '빠르게 두 번', escapeDuration: 4300, image: '/images/monsters/fox.webp', color: '#ff6b57', emoji: '▲', description: '뜨거운 불꽃 꼬리로 헌터를 교란하는 영웅 등급 몬스터예요.' },
  { id: 'owl', name: '시간 부엉이', grade: '특수', score: 150, weight: 7, hp: 1, speed: '빠름', gesture: 'tap', cue: '+2s', hint: '터치해 시간 획득', reward: 'time', escapeDuration: 2800, image: '/images/monsters/owl.webp', color: '#67e8ff', emoji: '◷', description: '시간의 조각을 품고 있으며, 처치하면 사냥 시간이 2초 늘어납니다.' },
  { id: 'hedgehog', name: '수정 고슴도치', grade: '희귀', score: 250, weight: 11, hp: 1, speed: '보통', gesture: 'tap', cue: 'WAIT', hint: '가시가 내려갈 때 터치', behavior: 'guard-cycle', escapeDuration: 4800, image: '/images/monsters/hedgehog.webp', color: '#b98cff', emoji: '◇', description: '수정 가시가 내려가는 짧은 순간을 노려야 합니다.' },
  { id: 'mimic', name: '황금 미믹', grade: '특수', score: 100, weight: 3, hp: 1, speed: '매우 빠름', gesture: 'double-tap', cue: '×2', hint: '빠르게 두 번', reward: 'coins', noEscapePenalty: true, escapeDuration: 2200, image: '/images/monsters/mimic.webp', color: '#ffd45b', emoji: '▣', description: '아주 잠깐 모습을 드러내는 보물 몬스터. 처치하면 많은 코인을 획득합니다.' },
  { id: 'golem', name: '바위 골렘', grade: '영웅', score: 400, weight: 8, hp: 3, speed: '느림', gesture: 'tap', cue: '×3', hint: '세 번 터치', behavior: 'armored', escapeDuration: 7200, image: '/images/monsters/golem.webp', color: '#d66cff', emoji: '⬟', description: '단단한 몸을 세 번 공격해야 쓰러지는 작은 중간 보스입니다.' },
  { id: 'boss', name: '네온 나이트메어', grade: '보스', score: 500, weight: 0, hp: 30, speed: '보통', gesture: 'hold', cue: 'HOLD', hint: '길게 누르기', escapeDuration: 40000, image: '/images/monsters/boss-neon-nightmare.webp', color: '#ff4fc8', emoji: '★', description: '깨진 네온 왕관으로 그림자 포털을 지배하는 일일 보스예요.' },
  { id: 'penguin', name: '얼음 펭귄', grade: '희귀', score: 250, weight: 9, hp: 1, speed: '보통', gesture: 'swipe-y', cue: '↑', hint: '위로 밀어 얼음 깨기', behavior: 'freeze-field', escapeDuration: 5200, image: '/images/monsters/penguin.webp', color: '#8feaff', emoji: '❄', description: '사냥터를 얼려 시야를 좁힙니다. 위로 밀어 얼음을 깨면 효과가 사라집니다.' },
  { id: 'jellyfish', name: '별빛 해파리', grade: '특수', score: 200, weight: 6, hp: 1, speed: '느림', gesture: 'release-perfect', cue: 'HOLD', hint: '빛이 모일 때 손 떼기', reward: 'combo', noEscapePenalty: true, escapeDuration: 5600, image: '/images/monsters/jellyfish.webp', color: '#79dcff', emoji: '✦', description: '별빛이 가장 밝아지는 순간에 손을 떼면 콤보 보너스를 얻습니다.' },
  { id: 'cat', name: '환영 고양이', grade: '영웅', score: 350, weight: 6, hp: 1, speed: '빠름', gesture: 'tap', cue: 'FIND', hint: '다이아 눈동자 본체 터치', behavior: 'illusion', escapeDuration: 4600, image: '/images/monsters/cat.webp', color: '#ff67db', emoji: '◇', description: '가짜 분신 사이에서 다이아 눈동자와 꼬리 룬을 가진 본체를 찾아야 합니다.' },
  { id: 'wolf', name: '달빛 늑대', grade: '영웅', score: 350, weight: 5, hp: 2, speed: '매우 빠름', gesture: 'swipe-direction', cue: '↔×2', hint: '잔상 방향으로 두 번 밀기', behavior: 'predict-dash', escapeDuration: 5000, image: '/images/monsters/wolf.webp', color: '#75dfff', emoji: '◐', description: '달빛 잔상을 보고 이동 방향을 예측해 두 번 공격해야 합니다.' },
]

// 몬스터 이미지를 미리 디코딩해 두어, 첫 스폰 시 곧바로 표시되도록 합니다.
export function preloadMonsterImages() {
  if (typeof Image === 'undefined') return
  for (const monster of MONSTERS) {
    if (monster.image) {
      const img = new Image()
      img.src = monster.image
    }
  }
}

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
