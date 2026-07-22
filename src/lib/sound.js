let context = null
let masterGain = null
let bgmTimer = null
let bgmOn = false
let muted = false

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
  button() { tone(660, 0.08, 'triangle', 0.25) },
  hit(combo = 0) { const base = 520 + Math.min(combo, 20) * 18; tone(base, 0.1, 'square', 0.3); tone(base * 1.5, 0.08, 'square', 0.15, 0.02) },
  combo() { tone(880, 0.09, 'sawtooth', 0.2); tone(1174, 0.09, 'sawtooth', 0.2, 0.06) },
  rare() { tone(392, 0.14, 'sawtooth', 0.28); tone(587, 0.14, 'sawtooth', 0.24, 0.08); tone(784, 0.18, 'sawtooth', 0.24, 0.16) },
  miss() { tone(180, 0.18, 'sine', 0.25) },
  start() { tone(523, 0.12, 'square', 0.25); tone(659, 0.12, 'square', 0.25, 0.1); tone(784, 0.18, 'square', 0.25, 0.2) },
  over() { tone(659, 0.18, 'triangle', 0.28); tone(523, 0.18, 'triangle', 0.28, 0.14); tone(392, 0.3, 'triangle', 0.28, 0.28) },
  startBGM() {
    if (bgmOn || muted) return
    ensureContext(); bgmOn = true
    const notes = [523, 587, 659, 784, 659, 587, 523, 440]; let index = 0
    const step = () => { if (!bgmOn) return; tone(notes[index % notes.length], 0.22, 'triangle', 0.08); tone(notes[index % notes.length] / 2, 0.22, 'sine', 0.06); index += 1; bgmTimer = setTimeout(step, 260) }
    step()
  },
  stopBGM() { bgmOn = false; if (bgmTimer) clearTimeout(bgmTimer); bgmTimer = null },
  setMuted(value) { muted = value; if (value) this.stopBGM(); if (masterGain) masterGain.gain.value = value ? 0 : 0.5 },
  isMuted() { return muted },
  unlock() { ensureContext() },
}
