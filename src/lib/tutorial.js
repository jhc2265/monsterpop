import { pushState, readCached, writeCached } from './stateCache'

// 조작 안내는 게임 안에 상시로 띄워두면 자리만 차지하고 결국 아무도 읽지 않는다.
// 처음 들어갈 때 한 번만 보여주고, 이후엔 각 화면의 안내 버튼으로만 연다.
// 신호 구성이 바뀌면 해당 VERSION 을 올려 전원에게 다시 띄운다.
const VERSIONS = { hunt: 1, boss: 1, burst: 1 }

// 종류별로 키를 따로 두면 안내를 하나 늘릴 때마다 서버 왕복이 하나씩 붙는다.
// 한 덩어리에 { 종류: 본 버전 } 으로 담는다.
const STATE_KEY = 'tutorial'
// 계정 단위로 옮기기 전에 쓰던 기기별 키. 여기엔 이미 userId 가 붙어 있어 그대로 이어받을 수 있다.
const legacyKey = (kind, userId) => `monsterpop-tutorial-${kind}-${userId}`

function normalizeState(raw) {
  const state = raw && typeof raw === 'object' ? raw : {}
  return Object.fromEntries(Object.keys(VERSIONS).map((kind) => [kind, Number(state[kind]) || 0]))
}

// 예전 키에 하나라도 기록이 있으면 그 계정은 이미 안내를 본 것이다.
// 아무것도 없으면 null 을 돌려줘, "안 본 상태"와 "옮길 게 없는 상태"를 구별한다.
function readLegacyState(userId) {
  let found = false
  const state = {}
  for (const kind of Object.keys(VERSIONS)) {
    let seen = 0
    try { seen = Number(localStorage.getItem(legacyKey(kind, userId))) || 0 } catch { seen = 0 }
    if (seen > 0) found = true
    state[kind] = seen
  }
  return found ? state : null
}

function readState(userId) {
  const cached = readCached(STATE_KEY, userId)
  if (cached) return normalizeState(cached)
  return normalizeState(readLegacyState(userId))
}

export function hasSeenTutorial(kind, userId) {
  return readState(userId)[kind] >= VERSIONS[kind]
}

export function markTutorialSeen(kind, userId) {
  const state = { ...readState(userId), [kind]: VERSIONS[kind] }
  writeCached(STATE_KEY, userId, state)
  pushState(STATE_KEY, userId, state)
}

// 한 번 본 안내는 어느 기기에서 봤든 본 것이다. 그래서 종류별로 큰 쪽을 남긴다.
// VERSION 을 올리면 저장된 값이 그보다 작아져 전원에게 다시 뜨는 동작은 그대로다.
export function mergeTutorialState(localRaw, remoteRaw, userId) {
  // 이 기기에 계정 기록이 아직 없으면 예전 키를 이어받는다.
  // 안 하면 이미 다 본 사람에게 다른 기기에서 안내가 한 번 다시 뜬다.
  const localBase = localRaw || readLegacyState(userId)
  if (!localBase && !remoteRaw) return null
  const local = normalizeState(localBase)
  const remote = normalizeState(remoteRaw)
  return Object.fromEntries(Object.keys(VERSIONS).map((kind) => [kind, Math.max(local[kind], remote[kind])]))
}
