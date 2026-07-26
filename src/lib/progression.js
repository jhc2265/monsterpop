export const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700]

export const LEVEL_UNLOCKS = {
  1: { title: '초보 사냥터', description: '말랑 슬라임 출현', monsters: ['slime'] },
  2: { title: '오늘의 미션', description: '매일 새로운 미션에 도전할 수 있어요', image: '/images/rewards/level-2-daily-mission.webp' },
  3: { title: '번개 토끼', description: '번개 토끼가 사냥터에 출현합니다', monsters: ['rabbit'] },
  4: { title: '섀도우 버스트', description: '쌍검 스킬을 충전해 사용할 수 있어요', skill: 'burst', image: '/images/ui/hunt-swords.webp' },
  5: { title: '불꽃 여우', description: '불꽃 여우가 사냥터에 출현합니다', monsters: ['fox'] },
  6: { title: '시간 부엉이', description: '처치하면 사냥 시간이 늘어납니다', monsters: ['owl'] },
  7: { title: '수정 고슴도치', description: '방어가 풀리는 순간을 노려보세요', monsters: ['hedgehog'] },
  8: { title: '황금 미믹', description: '희귀한 코인 보물 몬스터가 출현합니다', monsters: ['mimic'] },
  9: { title: '바위 골렘', description: '세 번 공격해야 하는 강적이 출현합니다', monsters: ['golem'] },
  10: { title: '그림자 대왕', description: '그림자 대왕 보스전에 도전할 수 있어요', monsters: ['boss'], image: '/images/rewards/level-10-boss-challenge.webp' },
}

const MONSTER_LEVEL = { slime: 1, rabbit: 3, fox: 5, owl: 6, hedgehog: 7, mimic: 8, golem: 9, boss: 10 }

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
