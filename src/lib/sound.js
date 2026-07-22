// Web Audio API 기반 사운드 엔진.
// 외부 mp3 파일 없이 배경음(BGM)과 효과음을 코드로 합성합니다.
// 브라우저 자동재생 정책 때문에 첫 사용자 클릭 이후에만 소리가 납니다.

let ctx = null
let masterGain = null
let bgmTimer = null
let bgmOn = false
let muted = false

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, duration = 0.12, type = 'square', vol = 0.3, when = 0) {
  if (muted) return
  const c = ensureCtx()
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(masterGain)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

export const sound = {
  // 버튼 클릭음
  button() {
    tone(660, 0.08, 'triangle', 0.25)
  },
  // 몬스터 명중음 (콤보가 올라갈수록 음이 높아짐)
  hit(combo = 0) {
    const base = 520 + Math.min(combo, 20) * 18
    tone(base, 0.1, 'square', 0.3)
    tone(base * 1.5, 0.08, 'square', 0.15, 0.02)
  },
  // 콤보 달성음
  combo() {
    tone(880, 0.09, 'sawtooth', 0.2)
    tone(1174, 0.09, 'sawtooth', 0.2, 0.06)
  },
  // 희귀/보스 등장·명중음
  rare() {
    tone(392, 0.14, 'sawtooth', 0.28)
    tone(587, 0.14, 'sawtooth', 0.24, 0.08)
    tone(784, 0.18, 'sawtooth', 0.24, 0.16)
  },
  // 실수(미스)음
  miss() {
    tone(180, 0.18, 'sine', 0.25)
  },
  // 게임 시작음
  start() {
    tone(523, 0.12, 'square', 0.25)
    tone(659, 0.12, 'square', 0.25, 0.1)
    tone(784, 0.18, 'square', 0.25, 0.2)
  },
  // 게임 종료음
  over() {
    tone(659, 0.18, 'triangle', 0.28)
    tone(523, 0.18, 'triangle', 0.28, 0.14)
    tone(392, 0.3, 'triangle', 0.28, 0.28)
  },

  // ---- 배경음(BGM): 간단한 반복 멜로디 ----
  startBGM() {
    if (bgmOn || muted) return
    ensureCtx()
    bgmOn = true
    const notes = [523, 587, 659, 784, 659, 587, 523, 440]
    let i = 0
    const step = () => {
      if (!bgmOn) return
      tone(notes[i % notes.length], 0.22, 'triangle', 0.08)
      tone(notes[i % notes.length] / 2, 0.22, 'sine', 0.06)
      i++
      bgmTimer = setTimeout(step, 260)
    }
    step()
  },
  stopBGM() {
    bgmOn = false
    if (bgmTimer) clearTimeout(bgmTimer)
    bgmTimer = null
  },

  setMuted(v) {
    muted = v
    if (v) this.stopBGM()
    if (masterGain) masterGain.gain.value = v ? 0 : 0.5
  },
  isMuted() {
    return muted
  },
  // 사용자 첫 상호작용에서 오디오 컨텍스트를 깨웁니다.
  unlock() {
    ensureCtx()
  },
}
