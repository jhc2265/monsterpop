// 조작 안내는 게임 안에 상시로 띄워두면 자리만 차지하고 결국 아무도 읽지 않는다.
// 처음 들어갈 때 한 번만 보여주고, 이후엔 각 화면의 안내 버튼으로만 연다.
// 신호 구성이 바뀌면 해당 VERSION 을 올려 전원에게 다시 띄운다.
const VERSIONS = { hunt: 1, boss: 1, burst: 1 }

const storageKey = (kind, userId) => `monsterpop-tutorial-${kind}-${userId}`

export function hasSeenTutorial(kind, userId) {
  try { return Number(localStorage.getItem(storageKey(kind, userId))) >= VERSIONS[kind] } catch { return false }
}

export function markTutorialSeen(kind, userId) {
  try { localStorage.setItem(storageKey(kind, userId), String(VERSIONS[kind])) } catch { /* 저장 실패는 무시 */ }
}
