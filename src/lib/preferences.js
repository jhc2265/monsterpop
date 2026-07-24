const DEFAULTS = {
  bgm: true,
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

export function applyPreferences(preferences = getPreferences()) {
  document.documentElement.classList.toggle('reduce-motion', preferences.reduceMotion)
}
