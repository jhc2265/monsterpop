import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getBossById, getDailyBoss } from '../lib/bosses'
import { sound } from '../lib/sound'
import { haptics } from '../lib/haptics'
import Icon from '../components/Icon'

// 보스마다 고유 신호가 하나씩 있다. 가중치만 다르면 한 판에 신호가 수십 번 뜨는 통에
// tap 20% 와 35% 를 구분할 방법이 없어서, 네 보스가 사실상 같은 게임이 된다.
const BOSS_PATTERNS = {
  'neon-nightmare': {
    cueDelay: 340,
    holdMs: 600,
    shieldMs: 900,
    phases: {
      1: { weights: { tap: 55, hold: 25, double: 20 }, window: 2800 },
      2: { weights: { tap: 35, hold: 25, swipe: 12, shield: 8, double: 20 }, window: 2300 },
      3: { weights: { tap: 26, hold: 20, swipe: 18, shield: 12, double: 24 }, window: 1850 },
    },
  },
  'glitch-king-slime': {
    cueDelay: 285,
    holdMs: 620,
    shieldMs: 860,
    phases: {
      1: { weights: { tap: 45, hold: 20, swipe: 15, reverse: 20 }, window: 2500 },
      2: { weights: { tap: 25, hold: 20, swipe: 20, shield: 12, reverse: 23 }, window: 1900 },
      3: { weights: { tap: 18, hold: 16, swipe: 22, shield: 18, reverse: 26 }, window: 1450 },
    },
  },
  'solar-eclipse-phoenix': {
    cueDelay: 265,
    holdMs: 720,
    shieldMs: 940,
    phases: {
      1: { weights: { tap: 40, hold: 35, charge: 25 }, window: 2600 },
      2: { weights: { tap: 22, hold: 28, swipe: 12, shield: 12, charge: 26 }, window: 1950 },
      3: { weights: { tap: 16, hold: 24, swipe: 16, shield: 16, charge: 28 }, window: 1450 },
    },
  },
  'polar-pod': {
    cueDelay: 240,
    holdMs: 680,
    shieldMs: 800,
    phases: {
      1: { weights: { tap: 40, hold: 25, swipe: 15, vertical: 20 }, window: 2350 },
      2: { weights: { tap: 22, hold: 20, swipe: 18, shield: 18, vertical: 22 }, window: 1700 },
      3: { weights: { tap: 15, hold: 18, swipe: 20, shield: 22, vertical: 25 }, window: 1250 },
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

// 방향이 있는 신호는 매번 다른 쪽을 가리켜야 외워서 치지 못한다.
function pickDir(type) {
  if (type === 'reverse') return Math.random() < 0.5 ? 'left' : 'right'
  if (type === 'vertical') return Math.random() < 0.5 ? 'up' : 'down'
  return null
}

const TAP_MAX_MS = 320       // 이보다 오래 누르면 탭으로 인정하지 않는다
const SWIPE_MIN_PX = 34
const MISS_TIME_PENALTY = 2  // 반격 — 이게 있어야 제한 시간이 실제 압박이 된다
const PHASE_BREAK_MS = 900   // 페이즈 전환 무적 연출
const DOUBLE_TAP_MAX_MS = 520 // 두 번째 탭까지의 여유
// CHARGE 는 HOLD 와 달리 "더 눌러도 손해 없음"이 아니다. 구간을 지나치면 터진다.
const CHARGE_MIN = 0.7
const CHARGE_BURST = 1.3

const CUE_LABEL = { tap: 'TAP', hold: 'HOLD', swipe: 'SWIPE', shield: 'WAIT', thaw: 'SWIPE', double: 'DOUBLE', charge: 'CHARGE' }
function cueLabel(cue) {
  if (!cue) return ''
  if (cue.type === 'reverse') return cue.dir === 'left' ? 'REVERSE ←' : 'REVERSE →'
  if (cue.type === 'vertical') return cue.dir === 'up' ? 'UP ↑' : 'DOWN ↓'
  return CUE_LABEL[cue.type]
}

// 힌트는 보스별로 갈라둔다. 예전에는 하나를 공유해서 폴라포드를 치는데
// 네온의 "왕관이 빛나요"가 떴다.
const CUE_HINT = {
  tap: '빠르게 터치하세요',
  hold: '길게 눌러 힘을 모으세요',
  swipe: '좌우로 밀어내세요',
  shield: '방어막이 올라왔어요. 건드리지 마세요',
  thaw: '좌우로 빠르게 밀어 시간 정지를 막으세요',
}
const GLITCH_SCRAMBLE_CHANCE = 0.4

export default function Boss() {
  const navigate = useNavigate()
  const { bossId } = useParams()
  // 오늘의 보스 여부는 보상만 결정한다. 전투 자체는 해금된 모든 보스를 자유롭게 연습할 수 있다.
  const [boss] = useState(() => {
    const requestedBoss = getBossById(bossId)
    return requestedBoss || getDailyBoss()
  })
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
  const [cueScrambling, setCueScrambling] = useState(false)
  const [shadowVeil, setShadowVeil] = useState(false)
  const [heat, setHeat] = useState(0)
  const [burst, setBurst] = useState(false)
  const [timeHit, setTimeHit] = useState(null)   // { amount, id } — 깎인 초를 타이머 위에 띄운다
  const [frozen, setFrozen] = useState(false)

  const playingRef = useRef(false)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const pointerRef = useRef(null)
  const cueTimerRef = useRef(null)
  const revealTimerRef = useRef(null)
  const mechanicTimerRef = useRef(null)
  const holdRafRef = useRef(null)
  const punishRef = useRef(null)
  const phaseRef = useRef(1)
  const hpRef = useRef(boss.maxHp)
  const timeRef = useRef(boss.timeLimit)
  const heatRef = useRef(0)
  const frozenRef = useRef(false)
  const shadowVeilRef = useRef(false)
  const cueCountRef = useRef(0)
  const doubleTapRef = useRef(0)

  const phase = hp > boss.maxHp * 0.7 ? 1 : hp > boss.maxHp * 0.4 ? 2 : 3
  const mechanic = boss.mechanic

  function flash(text, type) {
    setEffect({ text, type, id: Date.now() + Math.random() })
    setTimeout(() => setEffect(null), 520)
  }

  const clearTimers = useCallback(() => {
    if (cueTimerRef.current) { clearTimeout(cueTimerRef.current); cueTimerRef.current = null }
    if (revealTimerRef.current) { clearTimeout(revealTimerRef.current); revealTimerRef.current = null }
    if (mechanicTimerRef.current) { clearTimeout(mechanicTimerRef.current); mechanicTimerRef.current = null }
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
      setCue({ type, id: Date.now(), dir: pickDir(type) })
      resetHold()
      doubleTapRef.current = 0
      cueCountRef.current += 1

      setShadowVeil(false)
      shadowVeilRef.current = false
      if (boss.id === 'neon-nightmare' && cueCountRef.current % 4 === 0) {
        setShadowVeil(true)
        shadowVeilRef.current = true
        sound.mechanic(); haptics.mechanic()
      }

      const startResponseWindow = () => {
        setCueScrambling(false)
        if (boss.id === 'glitch-king-slime') setJudge('신호 확인!')
        // 그림자 장막은 어둡게 보이기만 하면 연출에 그친다. 반응 시간을 실제로 줄여 압박을 만든다.
        const responseWindow = shadowVeilRef.current ? Math.round(settings.window * 0.72) : settings.window
        // 방어막은 버티면 통과, 나머지는 시간 내 반응하지 못하면 실패.
        cueTimerRef.current = setTimeout(() => {
          if (!playingRef.current) return
          if (type === 'shield') {
            comboRef.current += 1
            maxComboRef.current = Math.max(maxComboRef.current, comboRef.current)
            setCombo(comboRef.current)
            setJudge('잘 버텼어요!')
            if (boss.id === 'neon-nightmare') {
              shadowVeilRef.current = false
              setShadowVeil(false)
            }
            nextCue(240)
          } else {
            punishRef.current('반응이 늦었어요!')
          }
        }, type === 'shield' ? pattern.shieldMs : responseWindow)
      }

      // 매 신호마다 가리면 그건 페이크가 아니라 그냥 딜레이다.
      // 일부만 가려야 "이번 건 진짜인가"라는 판단이 생긴다.
      if (boss.id === 'glitch-king-slime' && Math.random() < GLITCH_SCRAMBLE_CHANCE) {
        setCueScrambling(true)
        setJudge('신호 복구 중...')
        const scrambleMs = phaseRef.current === 1 ? 520 : phaseRef.current === 2 ? 380 : 240
        revealTimerRef.current = setTimeout(startResponseWindow, scrambleMs)
      } else {
        startResponseWindow()
      }
    }, delay)
  }, [boss.id, clearTimers, pattern, resetHold])

  // 실패 처리 — 콤보를 끊고 제한 시간을 깎는다.
  function punish(message, options = {}) {
    let penalty = MISS_TIME_PENALTY
    let penaltyLabel = 'MISS'
    if (options.penalty) {
      penalty = options.penalty
      penaltyLabel = options.label || 'MISS'
    } else if (boss.id === 'neon-nightmare' && shadowVeilRef.current) {
      penalty = 3
      penaltyLabel = 'SHADOW HIT'
    } else if (boss.id === 'glitch-king-slime') {
      penalty = 3
      penaltyLabel = 'SYSTEM ERROR'
    }

    if (boss.id === 'solar-eclipse-phoenix') {
      const nextHeat = heatRef.current + 40
      const erupted = nextHeat >= 100
      heatRef.current = erupted ? 0 : nextHeat
      setHeat(heatRef.current)
      if (erupted) {
        penalty += 4
        penaltyLabel = 'SOLAR BURST'
        message = '태양 폭발이 일어났어요!'
        // 시간만 깎으면 타이머 숫자 하나가 바뀔 뿐이라 손해가 보이지 않는다.
        // 불사조가 터진 열기를 흡수해 체력을 되찾게 해 체력바로 손해를 드러낸다.
        // 다만 페이즈 경계는 넘지 않는다 — 패턴이 뒤로 돌아가면 억울한 난이도가 된다.
        const phaseCeiling = phaseRef.current === 1 ? boss.maxHp : phaseRef.current === 2 ? boss.maxHp * 0.7 : boss.maxHp * 0.4
        const healed = Math.min(Math.floor(phaseCeiling), hpRef.current + (boss.damagePerHit || 1) * 3)
        const healAmount = healed - hpRef.current
        if (healAmount > 0) {
          hpRef.current = healed
          setHp(healed)
          message = `불사조가 열기를 흡수했어요 · HP ${healAmount} 회복`
          penaltyLabel = `SOLAR BURST  +${healAmount}HP`
        }
        setBurst(true)
        setTimeout(() => setBurst(false), 620)
        sound.mechanic(); haptics.mechanic()
      } else if (heatRef.current >= 80) {
        // 다음 실수에 폭발한다는 걸 이때 알려야 HOLD 냉각을 노릴 수 있다.
        sound.mechanic(); haptics.mechanic()
      }
    }

    comboRef.current = 0
    setCombo(0)
    sound.miss(); haptics.miss()
    setJudge(message)
    shadowVeilRef.current = false
    setShadowVeil(false)
    flash(`${penaltyLabel}  -${penalty}초`, 'miss')
    timeRef.current = Math.max(0, timeRef.current - penalty)
    setTimeLeft(timeRef.current)
    // 아레나 한복판의 문구만으로는 "시간이 깎였다"가 안 읽힌다. 줄어드는 당사자인 타이머가 직접 반응해야 한다.
    setTimeHit({ amount: penalty, id: Date.now() })
    setTimeout(() => setTimeHit(null), 760)
    resetHold()
    if (timeRef.current <= 0) { finish(false); return }
    nextCue(460)
  }

  punishRef.current = punish

  function hit(label, options = {}) {
    // 장막은 반응 시간을 깎는 대신 뚫으면 피해가 커진다. 위험만 있고 이득이 없으면 세금일 뿐이다.
    const veiled = boss.id === 'neon-nightmare' && shadowVeilRef.current
    const damage = Math.round((boss.damagePerHit || 1) * (veiled ? 1.5 : 1) * (options.multiplier || 1))
    const ventedHeat = boss.id === 'solar-eclipse-phoenix' && (cue?.type === 'hold' || cue?.type === 'charge') && heatRef.current > 0
    if (ventedHeat) {
      heatRef.current = Math.max(0, heatRef.current - 40)
      setHeat(heatRef.current)
    }
    const nextHp = Math.max(0, hpRef.current - damage)
    const nextCombo = comboRef.current + 1
    comboRef.current = nextCombo
    hpRef.current = nextHp
    setHp(nextHp)
    setCombo(nextCombo)
    maxComboRef.current = Math.max(maxComboRef.current, nextCombo)
    sound.hit(nextCombo); haptics.hit()
    shadowVeilRef.current = false
    setShadowVeil(false)
    setJudge(ventedHeat ? 'COOLED DOWN!' : veiled ? '장막을 뚫었어요!' : label)
    flash(
      options.flashLabel ? `${options.flashLabel}  -${damage}` : ventedHeat ? `COOL  -${damage}` : veiled ? `SHADOW BREAK  -${damage}` : `-${damage}`,
      options.multiplier > 1 || phaseRef.current === 3 ? 'rush' : 'hit',
    )
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

    // 5연속으로 맞히면 보스가 시간을 멈추려 든다. 막으면 반격 기회, 놓치면 시간을 빼앗긴다.
    // 예전에는 누적 성공 5회마다 걸려서 "잘하면 방해받는" 구조였고, 막아도 이득이 없었다.
    if (boss.id === 'polar-pod' && nextCombo % 5 === 0) {
      clearTimers()
      setCue({ type: 'thaw', id: Date.now() })
      frozenRef.current = true
      setFrozen(true)
      setJudge('보스가 시간을 멈추려 해요!')
      sound.mechanic(); haptics.mechanic()
      mechanicTimerRef.current = setTimeout(() => {
        frozenRef.current = false
        setFrozen(false)
        setCue(null)
        comboRef.current = 0
        setCombo(0)
        timeRef.current = Math.max(0, timeRef.current - 3)
        setTimeLeft(timeRef.current)
        setJudge('시간을 빼앗겼어요!')
        flash('TIME STOLEN  -3초', 'miss')
        setTimeHit({ amount: 3, id: Date.now() })
        setTimeout(() => setTimeHit(null), 760)
        if (timeRef.current <= 0) { finish(false); return }
        nextCue(260)
      }, 1600)
      return
    }
    nextCue()
  }

  function handlePointerDown(event) {
    if (!playingRef.current || !cue || phaseBreak || (frozen && cue.type !== 'thaw')) return
    event.preventDefault()
    // 신호가 확정되기 전에 누르면 오작동. 그냥 무시하면 페이크에 속아도 손해가 없어
    // "기다렸다가 친다"는 이 보스의 요구가 성립하지 않는다. 판단 실수라 패널티는 기본치로 둔다.
    if (cueScrambling) { punish('신호가 확정되기 전에 눌렀어요!', { penalty: MISS_TIME_PENALTY, label: 'MISFIRE' }); return }
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

    // CHARGE 는 링이 다 차기를 기다리는 게 아니라 구간 안에서 떼는 신호다.
    // 지나치면 손을 떼기도 전에 터진다 — 그래야 HOLD 와 다른 긴장이 생긴다.
    if (cue.type === 'charge') {
      const step = () => {
        if (!pointerRef.current) return
        const ratio = (Date.now() - pointerRef.current.at) / pattern.holdMs
        setHoldProgress(Math.min(1, ratio / CHARGE_BURST))
        setHoldReady(ratio >= CHARGE_MIN && ratio <= 1)
        if (ratio >= CHARGE_BURST) { resetHold(); punish('너무 오래 달궜어요!'); return }
        holdRafRef.current = requestAnimationFrame(step)
      }
      holdRafRef.current = requestAnimationFrame(step)
    }
  }

  function handlePointerUp(event) {
    if (!playingRef.current || !cue || !pointerRef.current || phaseBreak || cueScrambling || (frozen && cue.type !== 'thaw')) return
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
    } else if (cue.type === 'double') {
      // 첫 탭은 판정하지 않고 세기만 한다. 두 번째가 안 오면 응답 시간 타이머가 실패로 잡는다.
      if (heldFor > TAP_MAX_MS) { punish('짧게 두 번 터치하세요!'); return }
      doubleTapRef.current += 1
      if (doubleTapRef.current >= 2) hit('DOUBLE HIT!')
      else {
        pointerRef.current = null
        setJudge('한 번 더!')
      }
    } else if (cue.type === 'reverse') {
      // 화살표가 가리키는 쪽의 반대로 밀어야 한다.
      const wanted = cue.dir === 'left' ? 1 : -1
      if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) && Math.sign(dx) === wanted) hit('REVERSED!')
      else punish('화살표 반대로 미세요!')
    } else if (cue.type === 'vertical') {
      const wanted = cue.dir === 'up' ? -1 : 1
      if (Math.abs(dy) >= SWIPE_MIN_PX && Math.abs(dy) > Math.abs(dx) && Math.sign(dy) === wanted) hit('BREAK!')
      else punish(cue.dir === 'up' ? '위로 밀어주세요!' : '아래로 밀어주세요!')
    } else if (cue.type === 'charge') {
      const ratio = heldFor / pattern.holdMs
      if (ratio >= CHARGE_MIN && ratio <= 1) hit('PERFECT CHARGE!')
      else if (ratio < CHARGE_MIN) punish('덜 달궈졌어요!')
      else punish('너무 오래 달궜어요!')
    } else if (cue.type === 'thaw') {
      if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) {
        // 막아냈으면 그냥 원상복귀가 아니라 반격이다. 그래야 연속 성공이 벌이 아니라 기회가 된다.
        clearTimers()
        frozenRef.current = false
        setFrozen(false)
        setCue(null)
        hit('시간 정지를 깨뜨렸어요!', { multiplier: 2, flashLabel: 'ICE BREAK' })
      } else {
        resetHold()
        setJudge('더 빠르게 밀어 얼음을 깨세요!')
      }
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
      if (!playingRef.current || frozenRef.current) return
      timeRef.current -= 1
      setTimeLeft(timeRef.current)
      if (timeRef.current <= 0) finish(false)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  useEffect(() => () => { clearTimers(); sound.stopBossBGM() }, [clearTimers])

  const cueType = phaseBreak ? null : cue?.type
  const overheated = boss.id === 'solar-eclipse-phoenix' && heat >= 80
  const mechanicActive = shadowVeil || cueScrambling || frozen || overheated
  // 기믹이 무슨 짓을 하는지 문장으로 못 박아야 플레이어가 대응을 선택할 수 있다.
  const mechanicNotice = shadowVeil
    ? { title: 'SHADOW VEIL', copy: '반응 시간 단축 · 뚫으면 피해 1.5배' }
    : cueScrambling
      ? { title: 'SIGNAL ERROR', copy: '확정 전에 누르면 오작동' }
      : frozen
        ? { title: 'TIME FREEZE', copy: '막으면 피해 2배 · 놓치면 시간 -3초' }
        : overheated
          ? { title: `OVERHEAT ${heat}%`, copy: '다음 실수 시 태양 폭발 · HOLD로 냉각' }
          : null
  return <main
    className={`battle-page boss-battle boss-${boss.id} phase-${phase}${shadowVeil ? ' mechanic-shadow-active' : ''}${cueScrambling ? ' mechanic-glitch-active' : ''}${frozen ? ' mechanic-frozen' : ''}${heat > 0 ? ' mechanic-heat' : ''}${overheated ? ' mechanic-overheat' : ''}${burst ? ' mechanic-burst' : ''}`}
    style={{ '--boss-heat': heat / 100 }}
  >
    <header className="battle-hud boss-hud">
      <button className="battle-pause" onClick={quit} aria-label="보스전 나가기"><Icon name="back" size={18} /></button>
      <div className="battle-score"><small>DAILY BOSS</small><strong>{boss.name}</strong><span>{boss.element}</span></div>
      <div className={`battle-timer${timeHit ? ' time-damaged' : ''}`}><span>◆</span><strong>00:{String(Math.max(0, timeLeft)).padStart(2, '0')}</strong>{timeHit && <b key={timeHit.id} className="timer-penalty">-{timeHit.amount}초</b>}</div>
      <div className={`battle-combo ${combo > 0 ? 'active' : ''}`}><small>COMBO</small><strong>{combo}</strong></div>
    </header>

    <div className="boss-healthbar"><div><small>PHASE {phase}</small><span className={`boss-mechanic-chip${mechanicActive ? ' active' : ''}`}>{mechanic.name}{boss.id === 'solar-eclipse-phoenix' ? ` ${heat}%` : ''}</span><strong><em>HP</em> {hp} / {boss.maxHp}</strong></div><span><i style={{ width: `${(hp / boss.maxHp) * 100}%` }} /></span></div>

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
      {/* 속성 기믹 전용 레이어. 아레나 ::after 는 보스별 상시 연출이 이미 쓰고 있어 따로 둔다.
          같은 z-index 2 안에서 젬 비보다 뒤에 둬야 폭발이 가려지지 않는다. */}
      <div className="boss-mechanic-field" aria-hidden="true" />
      <div className="boss-crown-glow" />
      <button
        className={`boss-target ${cueType ? `action-${cueType}` : 'action-idle'} ${effect ? `react-${effect.type}` : ''} ${holdProgress > 0 ? 'holding' : ''} ${holdReady ? 'hold-ready' : ''} ${phaseBreak ? 'phase-break' : ''}`}
        style={{ '--hold-progress': holdProgress }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetHold}
      >
        {cueType && <span className="action-cue">{cueScrambling ? 'ERROR' : cueLabel(cue)}</span>}
        <img src={boss.image} alt={boss.name} draggable="false" />
      </button>
      {/* 홀드 링은 boss-target(z-index 3) 밖에 둬야 진행 표시가 보스 이미지에 가리지 않는다. */}
      {(cue?.type === 'hold' || cue?.type === 'charge') && holdProgress > 0 && <div
        className={`boss-hold-ring ${cue.type === 'charge' ? 'charge' : ''} ${holdReady ? 'ready' : ''}`}
        style={{ '--hold-progress': holdProgress }}
        aria-hidden="true"
      >
        <b>{cue.type === 'charge' ? (holdReady ? '지금 떼세요!' : '더 달구기') : holdReady ? '지금 떼세요!' : '유지'}</b>
      </div>}
      {effect && <div key={effect.id} className={`boss-hit-effect ${effect.type}`}>{effect.text}</div>}
      {mechanicNotice && <div className="boss-mechanic-notice" aria-live="polite"><small>{mechanicNotice.title}</small><strong>{mechanicNotice.copy}</strong></div>}
      {phaseBreak && <div className="boss-phase-banner"><span>PHASE {phase}</span><strong>{phase === 3 ? '마지막 단계' : '패턴이 늘어납니다'}</strong></div>}
      {countdown > 0 && <div className="battle-countdown"><span>DAILY BOSS</span><strong key={countdown}>{countdown}</strong><p>{boss.title}</p><em>{boss.element} · {mechanic.name}</em></div>}
    </section>

    <section className="boss-command">
      <small>{phase === 3 ? 'FINAL PHASE' : `PHASE ${phase}`}</small>
      <strong>{judge}</strong>
      <span>{cueScrambling ? '신호가 확정된 뒤 판정이 시작됩니다' : frozen ? CUE_HINT.thaw : cueType ? (boss.hints?.[cueType] || CUE_HINT[cueType]) : '다음 신호를 기다리세요'}</span>
    </section>
  </main>
}
