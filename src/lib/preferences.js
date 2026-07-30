import { sound } from './sound'
import { setVibrationEnabled } from './haptics'
import { pushState, readCached, writeCached } from './stateCache'

const DEFAULTS = {
  bgm: true,
  bgmVolume: 1,          // 0~1 배율. 1 이 트랙별 기준 음량 그대로다.
  effects: true,
  vibration: false,
  reduceMotion: false,
  missionNotifications: true,
  commentNotifications: true,
  rankingNotifications: false,
}

const STATE_KEY = 'preferences'
// 계정 단위로 옮기기 전에 쓰던 브라우저 공용 키.
// 로그인 전 화면(히어로 · 로그인)이 읽을 값이 필요하고, 계정에 설정이 아직 없을 때
// 이어받을 값도 여기 있어서 계속 갱신한다.
const LEGACY_KEY = 'monsterpop-preferences'

function normalizeValues(raw) {
  return { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) }
}

// 설정에는 "큰 쪽이 이긴다"가 성립하지 않는다 — 진동을 끈 것이 켠 것보다 못한 선택이 아니다.
// 그래서 미션·보스 기록과 달리 마지막에 저장한 쪽이 이긴다. updatedAt 을 같이 들고 다니는 이유다.
function normalizeState(raw) {
  const state = raw && typeof raw === 'object' ? raw : {}
  return {
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : '',
    values: normalizeValues(state.values),
  }
}

function readLegacyValues() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    return raw ? normalizeValues(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

// userId 없이도 답해야 한다. 첫 화면과 로그인 화면에도 배경음과 모션 설정이 걸려 있다.
export function getPreferences(userId) {
  const cached = userId ? readCached(STATE_KEY, userId) : null
  if (cached) return normalizeState(cached).values
  return readLegacyValues() || { ...DEFAULTS }
}

export function savePreferences(userId, values) {
  const next = normalizeValues(values)
  applyPreferences(next)
  try { localStorage.setItem(LEGACY_KEY, JSON.stringify(next)) } catch { /* 저장 실패는 무시 */ }
  if (!userId) return

  // 설정 화면을 열기만 해도 저장 effect 가 한 번 돈다. 값이 그대로면 서버까지 올릴 일은 없다.
  const current = readCached(STATE_KEY, userId)
  if (current && JSON.stringify(normalizeState(current).values) === JSON.stringify(next)) return

  const state = { updatedAt: new Date().toISOString(), values: next }
  writeCached(STATE_KEY, userId, state)
  pushState(STATE_KEY, userId, state)
}

export function mergePreferenceState(localRaw, remoteRaw) {
  if (!localRaw && !remoteRaw) {
    // 이 계정에 설정이 아직 없다. 이 브라우저에 남아 있던 값을 그대로 이어받아
    // 계정 단위로 옮기는 과정에서 설정이 초기화되지 않게 한다.
    // (한 브라우저를 여러 계정이 쓰면 앞 사람 설정을 기본값으로 물려받는다 — 기기 기본값으로 본다.)
    const legacy = readLegacyValues()
    return legacy ? { updatedAt: '', values: legacy } : null
  }
  if (!localRaw) return normalizeState(remoteRaw)
  if (!remoteRaw) return normalizeState(localRaw)
  const local = normalizeState(localRaw)
  const remote = normalizeState(remoteRaw)
  // 나중에 저장한 쪽이 이긴다. 같으면 지금 쓰는 기기 값을 남긴다.
  return remote.updatedAt > local.updatedAt ? remote : local
}

// 설정을 실제 동작에 반영하는 곳은 여기 하나다.
// 예전에는 App 시작과 설정 화면 두 군데에서 따로 불러서, 진동처럼 한쪽에만 없으면 영영 죽어 있었다.
export function applyPreferences(preferences = getPreferences()) {
  document.documentElement.classList.toggle('reduce-motion', preferences.reduceMotion)
  sound.setBgmEnabled(preferences.bgm)
  sound.setBgmVolume(preferences.bgmVolume ?? 1)
  sound.setEffectsEnabled(preferences.effects)
  setVibrationEnabled(preferences.vibration)
}
