import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pickRandomMonster } from '../lib/monsters'
import MonsterImage from '../components/MonsterImage'
import Icon from '../components/Icon'
import { sound } from '../lib/sound'
import { useAuth } from '../context/AuthContext'
import { getLevel, getUnlockedMonsterIds, resolveProgress } from '../lib/progression'

const GAME_TIME = 30
const MAX_ENEMIES = 5
const SKILL_MAX = 6
const POSITIONS = [
  { x: 18, y: 25 }, { x: 50, y: 20 }, { x: 82, y: 27 },
  { x: 28, y: 52 }, { x: 70, y: 52 }, { x: 50, y: 70 },
]
const HP = { 일반: 1, 희귀: 1, 영웅: 1, 보스: 3 }
const ESCAPE_DURATION = { slime: 5600, rabbit: 3600, fox: 4300, boss: 7600 }
const ACTIONS = {
  slime: { cue: 'TAP', hint: '한 번 터치' },
  rabbit: { cue: '↔', hint: '좌우로 밀기' },
  fox: { cue: '×2', hint: '빠르게 두 번' },
  boss: { cue: 'HOLD', hint: '길게 누르기' },
}
let entityId = 0
let effectId = 0

function makeEnemy(index = 0, randomize = false, allowedIds, occupied = []) {
  const monster = pickRandomMonster(allowedIds)
  const freeIndexes = POSITIONS.map((_, positionIndex) => positionIndex).filter((positionIndex) => !occupied.includes(positionIndex))
  const positionIndex = randomize && freeIndexes.length ? freeIndexes[Math.floor(Math.random() * freeIndexes.length)] : index % POSITIONS.length
  const position = POSITIONS[positionIndex]
  const maxHp = HP[monster.grade] || 1
  return {
    ...monster,
    entityId: ++entityId,
    hp: maxHp,
    maxHp,
    bornAt: Date.now(),
    escapeDuration: ESCAPE_DURATION[monster.id] || 5000,
    positionIndex,
    x: position.x + (Math.random() * 5 - 2.5),
    y: position.y + (Math.random() * 4 - 2),
  }
}

export default function Game() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const playerLevel = getLevel(resolveProgress(profile, user.id).xp)
  const allowedMonsterIds = getUnlockedMonsterIds(playerLevel)
  const skillUnlocked = playerLevel >= 4
  const [countdown, setCountdown] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [coins, setCoins] = useState(0)
  const [energy, setEnergy] = useState(0)
  const [enemies, setEnemies] = useState([])
  const [effects, setEffects] = useState([])
  const [lastJudge, setLastJudge] = useState('몬스터 위의 조작 표시를 확인하세요')
  const [holdingId, setHoldingId] = useState(null)

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const monsterCountsRef = useRef({})
  const energyRef = useRef(0)
  const playingRef = useRef(false)
  const pausedRef = useRef(false)
  const pointerRef = useRef(null)
  const holdTimerRef = useRef(null)
  const lastTapRef = useRef({})

  const fillArena = useCallback(() => {
    const next = Array.from({ length: MAX_ENEMIES }, (_, index) => makeEnemy(index, false, allowedMonsterIds))
    setEnemies(next)
  }, [playerLevel])

  useEffect(() => {
    sound.unlock()
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((value) => value - 1), 720)
    return () => clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (countdown !== 0 || playingRef.current) return
    playingRef.current = true
    setPlaying(true)
    fillArena()
    sound.start()
    sound.startBGM()
  }, [countdown, fillArena])

  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      if (pausedRef.current) return
      setTimeLeft((value) => {
        if (value > 1) return value - 1
        clearInterval(interval)
        finishGame()
        return 0
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [playing])

  useEffect(() => {
    if (!playing) return
    const escapeWatcher = setInterval(() => {
      if (pausedRef.current) return
      const now = Date.now()
      setEnemies((items) => {
        const escaped = items.filter((enemy) => now - enemy.bornAt >= enemy.escapeDuration)
        if (!escaped.length) return items
        setTimeout(() => {
          comboRef.current = Math.max(0, comboRef.current - escaped.length)
          setCombo(comboRef.current)
          setLastJudge(`${escaped.length}마리가 도망갔어요!`)
          escaped.forEach((enemy) => addEffect(enemy.x, enemy.y, 'ESCAPE', 'miss'))
        }, 0)
        const survivors = items.filter((enemy) => now - enemy.bornAt < enemy.escapeDuration)
        const replacements = []
        escaped.forEach((_, index) => {
          const occupied = [...survivors, ...replacements].map((enemy) => enemy.positionIndex)
          replacements.push(makeEnemy(index, true, allowedMonsterIds, occupied))
        })
        return [...survivors, ...replacements]
      })
    }, 180)
    return () => clearInterval(escapeWatcher)
  }, [playing])

  useEffect(() => () => sound.stopBGM(), [])

  useEffect(() => {
    if (!playing) return
    const teleporter = setInterval(() => {
      if (pausedRef.current) return
      setEnemies((items) => {
        const occupied = new Set(items.map((enemy) => enemy.positionIndex))
        return items.map((enemy) => {
          if (enemy.id !== 'rabbit' || Math.random() > .55) return enemy
          occupied.delete(enemy.positionIndex)
          const freeIndexes = POSITIONS.map((_, index) => index).filter((index) => !occupied.has(index))
          const positionIndex = freeIndexes[Math.floor(Math.random() * freeIndexes.length)] ?? enemy.positionIndex
          occupied.add(positionIndex)
          const position = POSITIONS[positionIndex]
          return { ...enemy, positionIndex, x: position.x, y: position.y, bornAt: Date.now() }
        })
      })
    }, 900)
    return () => clearInterval(teleporter)
  }, [playing])

  function addEffect(x, y, text, type = 'hit') {
    const id = ++effectId
    setEffects((items) => [...items, { id, x, y, text, type }])
    setTimeout(() => setEffects((items) => items.filter((item) => item.id !== id)), 650)
  }

  function finishGame() {
    playingRef.current = false
    setPlaying(false)
    sound.stopBGM()
    sound.over()
    navigate('/result', {
      state: { score: scoreRef.current, maxCombo: maxComboRef.current, monsterCounts: monsterCountsRef.current },
      replace: true,
    })
  }

  function replaceEnemy(deadId) {
    setEnemies((items) => items.filter((enemy) => enemy.entityId !== deadId))
    setTimeout(() => setEnemies((current) => [...current, makeEnemy(deadId, true, allowedMonsterIds, current.map((enemy) => enemy.positionIndex))]), 320)
  }

  function completeGesture(target) {
    if (!playing || paused || !target) return
    const quick = Date.now() - target.bornAt < target.escapeDuration * .45
    const label = quick ? 'QUICK!' : 'NICE!'
    const multiplier = quick ? 1.3 : 1
    const damage = 1
    const remaining = target.hp - damage
    const nextCombo = comboRef.current + (quick ? 2 : 1)
    comboRef.current = nextCombo
    maxComboRef.current = Math.max(maxComboRef.current, nextCombo)
    const killed = remaining <= 0
    const nextEnergy = skillUnlocked ? Math.min(SKILL_MAX, energyRef.current + 1 + (quick ? 1 : 0)) : 0
    energyRef.current = nextEnergy
    setEnergy(nextEnergy)
    sound.hit(comboRef.current)
    setLastJudge(`${label} ${target.name}`)
    addEffect(target.x, target.y, label, quick ? 'perfect' : 'good')

    const gained = Math.round((target.score / target.maxHp) * multiplier * (1 + Math.min(nextCombo, 30) * .08))
    scoreRef.current += gained
    setScore(scoreRef.current)
    setCombo(nextCombo)
    setCoins((value) => value + Math.max(1, Math.round(gained / 100)))
    addEffect(target.x, target.y + 7, `+${gained}`, target.grade === '보스' ? 'boss' : 'score')
    if (nextCombo > 0 && nextCombo % 5 === 0) sound.combo()

    if (remaining > 0) {
      setEnemies((items) => items.map((enemy) => enemy.entityId === target.entityId ? { ...enemy, hp: remaining, bornAt: Date.now() } : enemy))
      return
    }

    if (target.grade === '영웅' || target.grade === '보스') sound.rare()
    monsterCountsRef.current[target.id] = (monsterCountsRef.current[target.id] || 0) + 1
    replaceEnemy(target.entityId)
  }

  function wrongGesture(target, message) {
    comboRef.current = Math.max(0, comboRef.current - 1)
    setCombo(comboRef.current)
    setLastJudge(message)
    sound.miss()
    addEffect(target.x, target.y, 'TRY AGAIN', 'miss')
  }

  function handlePointerDown(event, target) {
    if (!playing || paused) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointerRef.current = { entityId: target.entityId, x: event.clientX, y: event.clientY, completed: false }
    if (target.id === 'boss') {
      setHoldingId(target.entityId)
      holdTimerRef.current = setTimeout(() => {
        if (!pointerRef.current || pointerRef.current.entityId !== target.entityId) return
        pointerRef.current.completed = true
        setHoldingId(null)
        completeGesture(target)
      }, 620)
    }
  }

  function handlePointerUp(event, target) {
    event.preventDefault()
    const pointer = pointerRef.current
    if (!pointer || pointer.entityId !== target.entityId) return
    clearTimeout(holdTimerRef.current)
    setHoldingId(null)
    if (pointer.completed) { pointerRef.current = null; return }

    const dx = event.clientX - pointer.x
    const dy = event.clientY - pointer.y
    const distance = Math.hypot(dx, dy)
    if (target.id === 'slime') completeGesture(target)
    else if (target.id === 'rabbit') {
      if (Math.abs(dx) >= 30 && Math.abs(dx) > Math.abs(dy)) completeGesture(target)
      else wrongGesture(target, '토끼는 좌우로 밀어주세요')
    } else if (target.id === 'fox') {
      const previous = lastTapRef.current[target.entityId] || 0
      if (Date.now() - previous <= 420 && distance < 16) {
        delete lastTapRef.current[target.entityId]
        completeGesture(target)
      } else {
        lastTapRef.current[target.entityId] = Date.now()
        setLastJudge('한 번 더 빠르게 터치!')
        addEffect(target.x, target.y, 'ONE MORE!', 'good')
      }
    } else if (target.id === 'boss') wrongGesture(target, '보스는 길게 눌러주세요')
    pointerRef.current = null
  }

  function handlePointerCancel() {
    clearTimeout(holdTimerRef.current)
    pointerRef.current = null
    setHoldingId(null)
  }

  function useBurst() {
    if (!skillUnlocked || !playing || paused || energyRef.current < SKILL_MAX) return
    sound.combo()
    let bonus = 0
    const defeated = []
    enemies.forEach((enemy) => {
      addEffect(enemy.x, enemy.y, 'BURST!', 'burst')
      if (enemy.grade === '일반' || enemy.grade === '희귀' || enemy.hp <= 1) {
        bonus += enemy.score
        defeated.push(enemy.entityId)
        monsterCountsRef.current[enemy.id] = (monsterCountsRef.current[enemy.id] || 0) + 1
      }
    })
    scoreRef.current += bonus
    setScore(scoreRef.current)
    setCoins((value) => value + defeated.length)
    energyRef.current = 0
    setEnergy(0)
    setLastJudge('SHADOW BURST!')
    setEnemies((items) => items.filter((enemy) => !defeated.includes(enemy.entityId)).map((enemy) => ({ ...enemy, hp: enemy.hp - 1, bornAt: Date.now() })))
    setTimeout(() => setEnemies((items) => {
      const replacements = []
      defeated.forEach((_, index) => replacements.push(makeEnemy(index, true, allowedMonsterIds, [...items, ...replacements].map((enemy) => enemy.positionIndex))))
      return [...items, ...replacements]
    }), 280)
  }

  function togglePause() {
    const next = !paused
    pausedRef.current = next
    setPaused(next)
    sound.button()
    if (next) sound.stopBGM()
    else {
      setEnemies((items) => items.map((enemy) => ({ ...enemy, bornAt: Date.now() })))
      sound.startBGM()
    }
  }

  function quit() {
    playingRef.current = false
    sound.stopBGM()
    navigate('/home', { replace: true })
  }

  return <main className="battle-page">
    <header className="battle-hud">
      <button className="battle-pause" onClick={togglePause} aria-label={paused ? '계속하기' : '일시정지'}>
        <Icon name={paused ? 'play' : 'pause'} size={18} />
      </button>
      <div className="battle-score"><small>SCORE</small><strong>{score.toLocaleString()}</strong><span>● {coins}</span></div>
      <div className="battle-timer"><span>◷</span><strong>00:{String(timeLeft).padStart(2, '0')}</strong></div>
      <div className={`battle-combo ${combo > 0 ? 'active' : ''}`}><small>COMBO</small><strong>{combo}</strong></div>
    </header>

    <div className="battle-timebar"><span style={{ width: `${(timeLeft / GAME_TIME) * 100}%` }} /></div>

    <section className={`battle-arena ${energy >= SKILL_MAX ? 'burst-ready' : ''}`}>
      <img className="battle-background" src="/images/battle-arena.png" alt="" />
      <div className="battle-vignette" />
      <div className="gesture-legend"><span>TAP</span><span>↔ SWIPE</span><span>×2</span><span>HOLD</span></div>

      {enemies.map((enemy) => {
        const action = ACTIONS[enemy.id]
        return <button
          key={`${enemy.entityId}-${enemy.bornAt}`}
          className={`battle-enemy gesture-${enemy.id} grade-${enemy.grade} ${holdingId === enemy.entityId ? 'holding' : ''}`}
          style={{ left: `${enemy.x}%`, top: `${enemy.y}%`, '--enemy-color': enemy.color, '--escape-duration': `${enemy.escapeDuration}ms` }}
          onPointerDown={(event) => handlePointerDown(event, enemy)}
          onPointerUp={(event) => handlePointerUp(event, enemy)}
          onPointerCancel={handlePointerCancel}
          aria-label={`${enemy.name}, ${action.hint}`}
        >
          <span className="action-cue">{action.cue}</span>
          <MonsterImage monster={enemy} />
          <span className="escape-bar"><i /></span>
          {enemy.maxHp > 1 && <span className="enemy-health"><i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} /></span>}
        </button>
      })}

      {effects.map((effect) => <div key={effect.id} className={`battle-effect ${effect.type}`} style={{ left: `${effect.x}%`, top: `${effect.y}%` }}>{effect.text}</div>)}

      {countdown > 0 && <div className="battle-countdown"><span>REACTION HUNT</span><strong key={countdown}>{countdown}</strong><p>표시를 보고 탭 · 스와이프 · 더블 탭 · 길게 누르기</p></div>}
      {paused && <div className="battle-pause-overlay"><span className="eyebrow">GAME PAUSED</span><h2>잠시 쉬어갈까요?</h2><button className="btn btn-primary" onClick={togglePause}><Icon name="play" size={18} /> 계속하기</button><button className="btn btn-secondary" onClick={quit}>그만하기</button></div>}
    </section>

    <section className="battle-controls">
      <div className="timing-status"><small>REACTION HUNT</small><strong>{lastJudge}</strong><span>표시된 동작으로 도망가기 전에 사냥하세요!</span></div>
      <button className={`burst-button ${energy >= SKILL_MAX ? 'ready' : ''} ${!skillUnlocked ? 'locked' : ''}`} onClick={useBurst} disabled={!skillUnlocked || energy < SKILL_MAX} aria-label={skillUnlocked ? '섀도우 버스트' : '레벨 4에서 해금'}>
        <img src="/images/ui/hunt-swords.png" alt="" /><small>{!skillUnlocked ? 'LV.4' : energy >= SKILL_MAX ? 'BURST!' : `${energy} / ${SKILL_MAX}`}</small>
      </button>
      <div className="skill-meter"><span><i style={{ width: `${skillUnlocked ? (energy / SKILL_MAX) * 100 : 0}%` }} /></span><small>{skillUnlocked ? '섀도우 버스트' : 'Lv.4에서 스킬 해금'}</small></div>
    </section>

  </main>
}
