import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBossById, getDailyBoss } from '../lib/bosses'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

// 보스마다 신호 구성과 속도가 다르다. 뒤로 갈수록 입력 종류가 일찍 늘고
// 반응 시간이 짧아지지만, 각 보스의 제한 시간 안에서 숙련 플레이로 완주할 수 있게 맞춘다.
const BOSS_PATTERNS = {
  'neon-nightmare': {
    cueDelay: 340,
    holdMs: 600,
    shieldMs: 900,
    phases: {
      1: { weights: { tap: 70, hold: 30 }, window: 2800 },
      2: { weights: { tap: 45, hold: 30, swipe: 15, shield: 10 }, window: 2300 },
      3: { weights: { tap: 35, hold: 25, swipe: 25, shield: 15 }, window: 1850 },
    },
  },
  'glitch-king-slime': {
    cueDelay: 285,
    holdMs: 620,
    shieldMs: 860,
    phases: {
      1: { weights: { tap: 55, hold: 25, swipe: 20 }, window: 2500 },
      2: { weights: { tap: 30, hold: 25, swipe: 30, shield: 15 }, window: 1900 },
      3: { weights: { tap: 22, hold: 22, swipe: 34, shield: 22 }, window: 1450 },
    },
  },
  'solar-eclipse-phoenix': {
    cueDelay: 265,
    holdMs: 720,
    shieldMs: 940,
    phases: {
      1: { weights: { tap: 45, hold: 55 }, window: 2600 },
      2: { weights: { tap: 25, hold: 45, swipe: 15, shield: 15 }, window: 1950 },
      3: { weights: { tap: 20, hold: 40, swipe: 20, shield: 20 }, window: 1450 },
    },
  },
  'polar-pod': {
    cueDelay: 240,
    holdMs: 680,
    shieldMs: 800,
    phases: {
      1: { weights: { tap: 45, hold: 35, swipe: 20 }, window: 2350 },
      2: { weights: { tap: 25, hold: 25, swipe: 25, shield: 25 }, window: 1700 },
      3: { weights: { tap: 18, hold: 22, swipe: 30, shield: 30 }, window: 1250 },
    },
  },
}

function pickCue(weights) {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  let roll = Math.random() * total
  for (const [type, weight] of Object.entries(weights)) {
    roll -= weight
    if (roll < 0) return type
  }
  return 'tap'
}

const TAP_MAX_MS = 320       // 이보다 오래 누르면 탭으로 인정하지 않는다
const SWIPE_MIN_PX = 34
const MISS_TIME_PENALTY = 2  // 반격 — 이게 있어야 제한 시간이 실제 압박이 된다
const PHASE_BREAK_MS = 900   // 페이즈 전환 무적 연출

const CUE_LABEL = { tap: 'TAP', hold: 'HOLD', swipe: 'SWIPE', shield: 'WAIT' }
const CUE_HINT = {
  tap: '방어막이 열렸어요. 빠르게 터치하세요',
  hold: '왕관이 빛나요. 길게 눌러 힘을 모으세요',
  swipe: '틈이 생겼어요. 좌우로 밀어내세요',
  shield: '방어막이 올라왔어요. 건드리지 마세요',
}

export default function Boss() {
  const navigate = useNavigate()
  const { bossId } = useParams()
  // 주소로 직접 들어오거나 없는 id 가 오면 오늘의 보스로 떨어뜨린다.
  const [boss] = useState(() => getBossById(bossId) || getDailyBoss())
  const pattern = BOSS_PATTERNS[boss.id] || BOSS_PATTERNS['neon-nightmare']

  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(boss.timeLimit)
  const [hp, setHp] = useState(boss.maxHp)
  const [combo, setCombo] = useState(0)
  const [cue, setCue] = useState(null)          // { type, id }
  const [holdProgress, setHoldProgress] = useState(0)
  const [holdReady, setHoldReady] = useState(false)
  const [phaseBreak, setPhaseBreak] = useState(false)
  const [judge, setJudge] = useState('보스의 공격 신호를 확인하세요')
  const [effect, setEffect] = useState(null)

  const playingRef = useRef(false)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const pointerRef = useRef(null)
  const cueTimerRef = useRef(null)
  const holdRafRef = useRef(null)
  const punishRef = useRef(null)
  const phaseRef = useRef(1)
  const hpRef = useRef(boss.maxHp)
  const timeRef = useRef(boss.timeLimit)

  const phase = hp > boss.maxHp * 0.7 ? 1 : hp > boss.maxHp * 0.4 ? 2 : 3

  function flash(text, type) {
    setEffect({ text, type, id: Date.now() + Math.random() })
    setTimeout(() => setEffect(null), 520)
  }

  const clearTimers = useCallback(() => {
    if (cueTimerRef.current) { clearTimeout(cueTimerRef.current); cueTimerRef.current = null }
    if (holdRafRef.current) { cancelAnimationFrame(holdRafRef.current); holdRafRef.current = null }
  }, [])

  const resetHold = useCallback(() => {
    if (holdRafRef.current) { cancelAnimationFrame(holdRafRef.current); holdRafRef.current = null }
    pointerRef.current = null
    setHoldProgress(0)
    setHoldReady(false)
  }, [])

  // 다음 신호를 띄운다. 제한 시간 안에 반응하지 못하면 보스의 반격으로 이어진다.
  const nextCue = useCallback((delay = pattern.cueDelay) => {
    clearTimers()
    cueTimerRef.current = setTimeout(() => {
      if (!playingRef.current) return
      const settings = pattern.phases[phaseRef.current]
      const type = pickCue(settings.weights)
      setCue({ type, id: Date.now() })
      resetHold()

      // 방어막은 버티면 통과, 나머지는 시간 내 반응하지 못하면 실패.
      cueTimerRef.current = setTimeout(() => {
        if (!playingRef.current) return
        if (type === 'shield') {
          comboRef.current += 1
          maxComboRef.current = Math.max(maxComboRef.current, comboRef.current)
          setCombo(comboRef.current)
          setJudge('잘 버텼어요!')
          nextCue(240)
        } else {
          punishRef.current('반응이 늦었어요!')
        }
      }, type === 'shield' ? pattern.shieldMs : settings.window)
    }, delay)
  }, [clearTimers, pattern, resetHold])

  // 실패 처리 — 콤보를 끊고 제한 시간을 깎는다.
  function punish(message) {
    comboRef.current = 0
    setCombo(0)
    sound.miss()
    setJudge(message)
    flash(`MISS  -${MISS_TIME_PENALTY}초`, 'miss')
    timeRef.current = Math.max(0, timeRef.current - MISS_TIME_PENALTY)
    setTimeLeft(timeRef.current)
    resetHold()
    if (timeRef.current <= 0) { finish(false); return }
    nextCue(460)
  }

  punishRef.current = punish

  function hit(label) {
    const damage = boss.damagePerHit || 1
    const nextHp = Math.max(0, hpRef.current - damage)
    const nextCombo = comboRef.current + 1
    comboRef.current = nextCombo
    hpRef.current = nextHp
    setHp(nextHp)
    setCombo(nextCombo)
    maxComboRef.current = Math.max(maxComboRef.current, nextCombo)
    sound.hit(nextCombo)
    setJudge(label)
    flash(`-${damage}`, phaseRef.current === 3 ? 'rush' : 'hit')
    resetHold()

    if (nextHp === 0) { finish(true); return }

    // 페이즈가 바뀌면 잠깐 멈추고 신호를 준다 — 조용히 규칙이 바뀌면 억울한 실패가 된다.
    const nextPhase = nextHp > boss.maxHp * 0.7 ? 1 : nextHp > boss.maxHp * 0.4 ? 2 : 3
    if (nextPhase !== phaseRef.current) {
      phaseRef.current = nextPhase
      clearTimers()
      setCue(null)
      setPhaseBreak(true)
      setJudge(nextPhase === 3 ? 'FINAL PHASE!' : `PHASE ${nextPhase}`)
      sound.bossAlert()
      setTimeout(() => { setPhaseBreak(false); nextCue(220) }, PHASE_BREAK_MS)
      return
    }
    nextCue()
  }

  function handlePointerDown(event) {
    if (!playingRef.current || !cue || phaseBreak) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)

    if (cue.type === 'shield') { punish('방어막을 쳤어요!'); return }

    pointerRef.current = { at: Date.now(), x: event.clientX, y: event.clientY }

    if (cue.type === 'hold') {
      const step = () => {
        if (!pointerRef.current) return
        const ratio = Math.min(1, (Date.now() - pointerRef.current.at) / pattern.holdMs)
        setHoldProgress(ratio)
        if (ratio >= 1) { setHoldReady(true); return }
        holdRafRef.current = requestAnimationFrame(step)
      }
      holdRafRef.current = requestAnimationFrame(step)
    }
  }

  function handlePointerUp(event) {
    if (!playingRef.current || !cue || !pointerRef.current || phaseBreak) return
    event.preventDefault()
    const pointer = pointerRef.current
    const heldFor = Date.now() - pointer.at
    const dx = event.clientX - pointer.x
    const dy = event.clientY - pointer.y

    if (cue.type === 'tap') {
      if (heldFor <= TAP_MAX_MS) hit('NICE!')
      else punish('너무 오래 눌렀어요!')
    } else if (cue.type === 'hold') {
      if (heldFor >= pattern.holdMs) hit('PERFECT!')
      else punish('더 길게 눌러주세요!')
    } else if (cue.type === 'swipe') {
      if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) hit('SLASH!')
      else punish('좌우로 밀어주세요!')
    }
  }

  function finish(cleared) {
    if (!playingRef.current) return
    playingRef.current = false
    clearTimers()
    sound.stopBossBGM()
    if (!cleared) sound.over()
    navigate('/result', {
      replace: true,
      state: {
        score: cleared
          ? 15000 + timeRef.current * 250
          : Math.max(0, ((boss.maxHp - hpRef.current) / (boss.damagePerHit || 1)) * 300),
        maxCombo: maxComboRef.current,
        // 예전엔 어떤 보스를 잡아도 'boss' 로 고정 전송해, 폴라포드를 잡아도
        // 도감에는 네온 나이트메어가 발견 처리됐다. 실제 id 로 기록한다.
        monsterCounts: cleared ? { [boss.id]: 1 } : {},
        mode: 'boss',
        bossClear: cleared,
        bossId: boss.id,
        bossTimeLeft: timeRef.current,
        bossDamage: boss.maxHp - hpRef.current,
        bossMaxHp: boss.maxHp,
      },
    })
  }

  function quit() {
    playingRef.current = false
    clearTimers()
    sound.stopBossBGM()
    navigate('/boss', { replace: true })
  }

  useEffect(() => {
    sound.unlock()
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((value) => value - 1), 720)
    return () => clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (countdown !== 0 || playingRef.current) return
    playingRef.current = true
    sound.bossAlert()
    const musicTimer = setTimeout(() => sound.startBossBGM(), 550)
    nextCue(900)
    return () => clearTimeout(musicTimer)
  }, [countdown, nextCue])

  useEffect(() => {
    if (countdown !== 0) return
    const timer = setInterval(() => {
      if (!playingRef.current) return
      timeRef.current -= 1
      setTimeLeft(timeRef.current)
      if (timeRef.current <= 0) finish(false)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  useEffect(() => () => { clearTimers(); sound.stopBossBGM() }, [clearTimers])

  const cueType = phaseBreak ? null : cue?.type
  return <main className={`battle-page boss-battle boss-${boss.id} phase-${phase}`}>
    <header className="battle-hud boss-hud">
      <button className="battle-pause" onClick={quit} aria-label="보스전 나가기"><Icon name="back" size={18} /></button>
      <div className="battle-score"><small>DAILY BOSS</small><strong>{boss.name}</strong><span>{boss.element}</span></div>
      <div className="battle-timer"><span>◆</span><strong>00:{String(Math.max(0, timeLeft)).padStart(2, '0')}</strong></div>
      <div className={`battle-combo ${combo > 0 ? 'active' : ''}`}><small>COMBO</small><strong>{combo}</strong></div>
    </header>

    <div className="boss-healthbar"><div><small>PHASE {phase}</small><strong><em>HP</em> {hp} / {boss.maxHp}</strong></div><span><i style={{ width: `${(hp / boss.maxHp) * 100}%` }} /></span></div>

    <section className="battle-arena boss-arena">
      <img className="battle-background" src={boss.background || '/images/bg/battle-arena.webp'} alt="" />
      <div className="battle-vignette" />
      <div className="boss-glitch-field" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
      </div>
      <div className="boss-gem-rain" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => <i key={index} style={{
          '--gem-x': `${6 + ((index * 23) % 90)}%`,
          '--gem-delay': `${-((index * 0.47) % 4.8)}s`,
          '--gem-duration': `${3.1 + (index % 5) * 0.42}s`,
          '--gem-size': `${8 + (index % 4) * 4}px`,
          '--gem-drift': `${-24 + (index % 7) * 8}px`,
        }} />)}
      </div>
      <div className="boss-crown-glow" />
      <div className="boss-aurora-ring ring-back" aria-hidden="true"><i /><b /></div>
      <button
        className={`boss-target ${cueType ? `action-${cueType}` : 'action-idle'} ${effect ? `react-${effect.type}` : ''} ${holdProgress > 0 ? 'holding' : ''} ${holdReady ? 'hold-ready' : ''} ${phaseBreak ? 'phase-break' : ''}`}
        style={{ '--hold-progress': holdProgress }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetHold}
      >
        {cueType && <span className="action-cue">{CUE_LABEL[cueType]}</span>}
        <img src={boss.image} alt={boss.name} draggable="false" />
      </button>
      <div className="boss-aurora-ring ring-front" aria-hidden="true"><i /><b /></div>
      {/* 홀드 링은 boss-target 밖에 둔다 — 안에 두면 오로라 ring-front(z-index 4)가
          boss-target(z-index 3) 통째로 덮어서 진행 표시가 가려진다. */}
      {cue?.type === 'hold' && holdProgress > 0 && <div className={`boss-hold-ring ${holdReady ? 'ready' : ''}`} style={{ '--hold-progress': holdProgress }} aria-hidden="true">
        <b>{holdReady ? '지금 떼세요!' : '유지'}</b>
      </div>}
      {effect && <div key={effect.id} className={`boss-hit-effect ${effect.type}`}>{effect.text}</div>}
      {phaseBreak && <div className="boss-phase-banner"><span>PHASE {phase}</span><strong>{phase === 3 ? '마지막 단계' : '패턴이 늘어납니다'}</strong></div>}
      {countdown > 0 && <div className="battle-countdown"><span>DAILY BOSS</span><strong key={countdown}>{countdown}</strong><p>{boss.title}</p></div>}
    </section>

    <section className="boss-command">
      <small>{phase === 3 ? 'FINAL PHASE' : `PHASE ${phase}`}</small>
      <strong>{judge}</strong>
      <span>{cueType ? (cueType === 'hold' && boss.holdHint ? boss.holdHint : CUE_HINT[cueType]) : '다음 신호를 기다리세요'}</span>
    </section>
  </main>
}
