let context = null
let masterGain = null
let bgmTimer = null
let bgmOn = false
let muted = false
let bgmEnabled = true
let effectsEnabled = true
let lobbyAudio = null
let collectionAudio = null
let rankingAudio = null
let lobbyIntroAudio = null
let logoAudio = null
let rewardAudio = null
let resultAudio = null
let bossAlertAudio = null
let battleAudio = null
let sceneRequested = 'silent'
let lobbyNeedsIntro = true

function ensureLobbyAudio() {
  if (!lobbyAudio) {
    lobbyAudio = new Audio('/audio/soundtrack/lobby-loop.mp3')
    lobbyAudio.loop = true
    lobbyAudio.preload = 'auto'
    lobbyAudio.volume = 0.17
  }
  return lobbyAudio
}

function ensureLobbyIntroAudio() {
  if (!lobbyIntroAudio) {
    lobbyIntroAudio = new Audio('/audio/soundtrack/theme-intro.mp3')
    lobbyIntroAudio.preload = 'auto'
    lobbyIntroAudio.volume = 0.17
    lobbyIntroAudio.addEventListener('ended', () => syncSceneBGM())
  }
  return lobbyIntroAudio
}

function ensureSceneAudio(scene) {
  if (scene === 'lobby') return ensureLobbyAudio()
  if (scene === 'collection') {
    if (!collectionAudio) {
      collectionAudio = new Audio('/audio/soundtrack/collection-loop.mp3')
      collectionAudio.loop = true
      collectionAudio.preload = 'auto'
      collectionAudio.volume = 0.16
    }
    return collectionAudio
  }
  if (scene === 'ranking') {
    if (!rankingAudio) {
      rankingAudio = new Audio('/audio/soundtrack/ranking-loop.mp3')
      rankingAudio.loop = true
      rankingAudio.preload = 'auto'
      rankingAudio.volume = 0.15
    }
    return rankingAudio
  }
  return null
}

function ensureThemeClip(type) {
  if (type === 'logo') {
    if (!logoAudio) {
      logoAudio = new Audio('/audio/soundtrack/theme-logo.mp3')
      logoAudio.preload = 'auto'
      logoAudio.volume = 0.2
    }
    return logoAudio
  }
  if (type === 'reward') {
    if (!rewardAudio) {
      rewardAudio = new Audio('/audio/soundtrack/reward-sting.mp3')
      rewardAudio.preload = 'auto'
      rewardAudio.volume = 0.2
    }
    return rewardAudio
  }
  if (type === 'result') {
    if (!resultAudio) {
      resultAudio = new Audio('/audio/soundtrack/result-jingle.mp3')
      resultAudio.preload = 'auto'
      resultAudio.volume = 0.19
    }
    return resultAudio
  }
  if (!bossAlertAudio) {
    bossAlertAudio = new Audio('/audio/soundtrack/boss-alert.mp3')
    bossAlertAudio.preload = 'auto'
    bossAlertAudio.volume = 0.22
  }
  return bossAlertAudio
}

function syncSceneBGM() {
  const audio = ensureSceneAudio(sceneRequested)
  const intro = ensureLobbyIntroAudio()
  const sceneAudios = [lobbyAudio, collectionAudio, rankingAudio].filter(Boolean)
  sceneAudios.forEach((item) => {
    if (item !== audio) item.pause()
  })
  if (!audio || !bgmEnabled || muted) {
    intro.pause()
    if (audio) audio.pause()
    return
  }
  if (sceneRequested === 'lobby' && lobbyNeedsIntro) {
    intro.currentTime = 0
    intro.play().then(() => {
      lobbyNeedsIntro = false
    }).catch(() => {
      // Browsers block autoplay until the first user interaction.
    })
    return
  }
  if (sceneRequested !== 'lobby' || intro.ended || intro.paused) {
    audio.play().catch(() => {
      // Browsers block autoplay until the first user interaction.
    })
  }
}

function playThemeClip(type) {
  if (!bgmEnabled || muted) return
  const audio = ensureThemeClip(type)
  if (type === 'reward' && resultAudio) resultAudio.pause()
  audio.currentTime = 0
  audio.play().catch(() => {
    // The next user interaction can retry scene audio.
  })
}

function ensureContext() {
  if (!context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    context = new AudioContext()
    masterGain = context.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(context.destination)
  }
  if (context.state === 'suspended') context.resume()
  return context
}

function tone(frequency, duration = 0.12, type = 'square', volume = 0.3, delay = 0) {
  if (muted) return
  const audio = ensureContext()
  const start = audio.currentTime + delay
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(masterGain)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

export const sound = {
  button() { if (effectsEnabled) tone(660, 0.08, 'triangle', 0.25) },
  hit(combo = 0) { if (!effectsEnabled) return; const base = 520 + Math.min(combo, 20) * 18; tone(base, 0.1, 'square', 0.3); tone(base * 1.5, 0.08, 'square', 0.15, 0.02) },
  combo() { if (!effectsEnabled) return; tone(880, 0.09, 'sawtooth', 0.2); tone(1174, 0.09, 'sawtooth', 0.2, 0.06) },
  rare() { if (!effectsEnabled) return; tone(392, 0.14, 'sawtooth', 0.28); tone(587, 0.14, 'sawtooth', 0.24, 0.08); tone(784, 0.18, 'sawtooth', 0.24, 0.16) },
  miss() { if (effectsEnabled) tone(180, 0.18, 'sine', 0.25) },
  start() { if (!effectsEnabled) return; tone(523, 0.12, 'square', 0.25); tone(659, 0.12, 'square', 0.25, 0.1); tone(784, 0.18, 'square', 0.25, 0.2) },
  over() { if (!effectsEnabled) return; tone(659, 0.18, 'triangle', 0.28); tone(523, 0.18, 'triangle', 0.28, 0.14); tone(392, 0.3, 'triangle', 0.28, 0.28) },
  startBGM() {
    if (bgmOn || muted || !bgmEnabled) return
    if (!battleAudio) {
      battleAudio = new Audio('/audio/soundtrack/battle-loop.mp3')
      battleAudio.loop = true
      battleAudio.preload = 'auto'
      battleAudio.volume = 0.22
    }
    bgmOn = true
    battleAudio.currentTime = 0
    battleAudio.play().catch(() => {})
  },
  stopBGM() {
    bgmOn = false
    if (bgmTimer) clearTimeout(bgmTimer)
    bgmTimer = null
    if (battleAudio) {
      battleAudio.pause()
      battleAudio.currentTime = 0
    }
  },
  setScene(scene) {
    const previousScene = sceneRequested
    sceneRequested = scene
    if (sceneRequested === 'lobby' && previousScene === 'silent') lobbyNeedsIntro = true
    if (sceneRequested !== 'lobby') {
      if (lobbyIntroAudio) {
        lobbyIntroAudio.pause()
        lobbyIntroAudio.currentTime = 0
      }
    }
    syncSceneBGM()
  },
  logoTheme() { playThemeClip('logo') },
  rewardTheme() { playThemeClip('reward') },
  resultTheme() { playThemeClip('result') },
  bossAlert() { playThemeClip('boss') },
  setMuted(value) {
    muted = value
    if (value) this.stopBGM()
    if (value) {
      if (logoAudio) logoAudio.pause()
      if (rewardAudio) rewardAudio.pause()
      if (resultAudio) resultAudio.pause()
      if (bossAlertAudio) bossAlertAudio.pause()
    }
    if (masterGain) masterGain.gain.value = value ? 0 : 0.5
    syncSceneBGM()
  },
  isMuted() { return muted },
  setBgmEnabled(value) {
    bgmEnabled = value
    if (!value) this.stopBGM()
    syncSceneBGM()
  },
  setEffectsEnabled(value) { effectsEnabled = value },
  unlock() {
    ensureContext()
    syncSceneBGM()
  },
}
