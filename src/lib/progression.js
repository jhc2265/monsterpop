export const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700]

export const LEVEL_UNLOCKS = {
  1: { title: '초보 사냥터', description: '말랑 슬라임과 번개 토끼 출현', monsters: ['slime', 'rabbit'] },
  2: { title: '오늘의 미션', description: '매일 새로운 미션에 도전할 수 있어요' },
  3: { title: '불꽃 여우', description: '불꽃 여우가 사냥터에 출현합니다', monsters: ['fox'] },
  4: { title: '섀도우 버스트', description: '쌍검 스킬을 충전해 사용할 수 있어요', skill: 'burst' },
  5: { title: '그림자 대왕', description: '그림자 대왕이 사냥터에 출현합니다', monsters: ['boss'] },
  6: { title: '숙련 헌터 배지', description: '레벨 배지가 한 단계 빛납니다' },
  7: { title: '도감 보너스', description: '몬스터 발견 보상이 증가합니다' },
  8: { title: '엘리트 헌터 배지', description: '엘리트 헌터의 증표를 획득합니다' },
  9: { title: '랭킹 도전자', description: '랭킹 전용 칭호를 획득합니다' },
  10: { title: '보스 챌린지', description: '강화 보스 도전 자격을 획득합니다' },
}

const MONSTER_LEVEL = { slime: 1, rabbit: 1, fox: 3, boss: 5 }

export function getLevel(xp = 0) {
  let level = 1
  LEVEL_XP.forEach((required, index) => {
    if (xp >= required) level = index + 1
  })
  return Math.min(level, LEVEL_XP.length)
}

export function getLevelProgress(xp = 0) {
  const level = getLevel(xp)
  const start = LEVEL_XP[level - 1] ?? 0
  const end = LEVEL_XP[level] ?? start
  const current = Math.max(0, xp - start)
  const needed = Math.max(0, end - start)
  return { level, current, needed, percent: needed ? Math.min(100, (current / needed) * 100) : 100, total: xp, nextTotal: end }
}

export function getMonsterUnlockLevel(monsterId) {
  return MONSTER_LEVEL[monsterId] || 1
}

export function getUnlockedMonsterIds(level) {
  return Object.entries(MONSTER_LEVEL).filter(([, required]) => level >= required).map(([id]) => id)
}

export function getStoredProgress(userId) {
  try {
    return JSON.parse(localStorage.getItem(`monsterpop-progress-${userId}`) || '{"xp":0,"discovered":[]}')
  } catch {
    return { xp: 0, discovered: [] }
  }
}

export function saveStoredProgress(userId, progress) {
  localStorage.setItem(`monsterpop-progress-${userId}`, JSON.stringify(progress))
}

export function resolveProgress(profile, userId) {
  const stored = getStoredProgress(userId)
  return {
    xp: Number.isFinite(profile?.xp) ? profile.xp : stored.xp,
    discovered: Array.isArray(profile?.discovered_monsters) ? profile.discovered_monsters : stored.discovered,
  }
}
