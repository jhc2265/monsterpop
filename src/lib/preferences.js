import { sound } from './sound'
import { setVibrationEnabled } from './haptics'

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

export function getPreferences() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('monsterpop-preferences') || '{}') }
  } catch {
    return DEFAULTS
  }
}

export function savePreferences(preferences) {
  localStorage.setItem('monsterpop-preferences', JSON.stringify(preferences))
  applyPreferences(preferences)
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
