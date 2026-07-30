import { MONSTERS } from './monsters'
import { DAILY_BOSSES } from './bosses'
import { getStoredProgress, LEVEL_XP, saveStoredProgress } from './progression'
import { GUEST_ID } from './guest'

// 체험을 시작할 때 진행도를 최고 레벨로 채운다.
//
// LV.1 로 시작하면 말랑 슬라임 하나만 나오고 보스는 Lv.10 이라 열리지 않는다.
// 게임을 보여주려고 만든 모드인데 정작 재미있는 부분을 못 보여준다.
//
// 이 파일이 guest.js 와 따로인 이유: guest.js 는 stateCache 가 import 한다.
// 여기 있는 MONSTERS·DAILY_BOSSES 를 guest.js 에 넣으면
// stateCache → guest → bosses → stateCache 로 순환 참조가 생긴다.
// 또 masterAccount.js 를 재사용하지 않는 이유는 그 파일이 비밀번호를 들고 있어
// 정적 import 하는 순간 배포본 번들에 들어가기 때문이다.

const MAX_XP = LEVEL_XP[LEVEL_XP.length - 1]

// 보스는 MONSTERS 에 없어서 따로 합쳐야 도감이 전부 채워진다.
function allMonsterIds() {
  return [...new Set([...MONSTERS.map((monster) => monster.id), ...DAILY_BOSSES.map((boss) => boss.id)])]
}

export function seedGuestProgress() {
  const ids = allMonsterIds()
  const stored = getStoredProgress(GUEST_ID)
  const discovered = [...new Set([...(Array.isArray(stored.discovered) ? stored.discovered : []), ...ids])]
  // 체험 중 쌓은 것을 깎지 않는다. XP 는 큰 쪽, 도감은 합집합.
  saveStoredProgress(GUEST_ID, { xp: Math.max(Number(stored.xp) || 0, MAX_XP), discovered })
}
