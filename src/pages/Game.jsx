import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pickRandomMonster } from '../lib/monsters'
import MonsterImage from '../components/MonsterImage'
import Icon from '../components/Icon'
import { sound } from '../lib/sound'

const GAME_TIME = 30
const MAX_ENEMIES = 9
const SKILL_MAX = 6
const POSITIONS = [
  { x: 16, y: 22 }, { x: 40, y: 18 }, { x: 66, y: 21 }, { x: 86, y: 29 },
  { x: 25, y: 39 }, { x: 53, y: 36 }, { x: 76, y: 47 },
  { x: 13, y: 56 }, { x: 41, y: 54 }, { x: 63, y: 62 }, { x: 87, y: 66 },
  { x: 29, y: 70 },
]
const HP = { 일반: 1, 희귀: 1, 영웅: 2, 보스: 3 }
const TIMING_DURATION = { 일반: 1900, 희귀: 1200, 영웅: 1450, 보스: 1650 }
let entityId = 0
let effectId = 0

function makeEnemy(index = 0, randomize = false) {
  const monster = pickRandomMonster()
  const positionIndex = randomize ? Math.floor(Math.random() * POSITIONS.length) : index % POSITIONS.length
  const position = POSITIONS[positionIndex]
  const maxHp = HP[monster.grade] || 1
  return {
    ...monster,
    entityId: ++entityId,
    hp: maxHp,
    maxHp,
    bornAt: Date.now(),
    timingDuration: TIMING_DURATION[monster.grade] || 1700,
    x: position.x + (Math.random() * 5 - 2.5),
    y: position.y + (Math.random() * 4 - 2),
  }
}

export default function Game() {
  const navigate = useNavigate()
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
  const [lastJudge, setLastJudge] = useState('몬스터를 타이밍에 맞춰 터치하세요')

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const monsterCountsRef = useRef({})
  const energyRef = useRef(0)
  const playingRef = useRef(false)
  const pausedRef = useRef(false)

  const fillArena = useCallback(() => {
    const next = Array.from({ length: MAX_ENEMIES }, (_, index) => makeEnemy(index))
    setEnemies(next)
  }, [])

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

  useEffect(() => () => sound.stopBGM(), [])

  useEffect(() => {
    if (!playing) return
    const teleporter = setInterval(() => {
      if (pausedRef.current) return
      setEnemies((items) => items.map((enemy) => {
        if (enemy.id !== 'rabbit' || Math.random() > .55) return enemy
        const position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
        return { ...enemy, x: position.x, y: position.y, bornAt: Date.now() }
      }))
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
    setTimeout(() => setEnemies((current) => [...current, makeEnemy(deadId, true)]), 320)
  }

  function judgeTiming(target) {
    const phase = ((Date.now() - target.bornAt) % target.timingDuration) / target.timingDuration
    const distance = Math.abs(phase - .56)
    if (distance <= .065) return { label: 'PERFECT', multiplier: 1.5, combo: 2, energy: 2, type: 'perfect' }
    if (distance <= .14) return { label: 'GREAT', multiplier: 1.2, combo: 1, energy: 1, type: 'great' }
    if (distance <= .26) return { label: 'GOOD', multiplier: 1, combo: 0, energy: 0, type: 'good' }
    return { label: 'MISS', multiplier: 0, combo: -3, energy: 0, type: 'miss' }
  }

  function attackEnemy(target) {
    if (!playing || paused || !target) return
    const judgment = judgeTiming(target)
    setLastJudge(judgment.label)
    if (judgment.type === 'miss') {
      comboRef.current = Math.max(0, comboRef.current - 3)
      setCombo(comboRef.current)
      sound.miss()
      addEffect(target.x, target.y, 'MISS', 'miss')
      setEnemies((items) => items.map((enemy) => enemy.entityId === target.entityId ? { ...enemy, bornAt: Date.now() } : enemy))
      return
    }

    const damage = 1
    const remaining = target.hp - damage
    const nextCombo = Math.max(0, comboRef.current + judgment.combo)
    comboRef.current = nextCombo
    maxComboRef.current = Math.max(maxComboRef.current, nextCombo)
    const killed = remaining <= 0
    const nextEnergy = Math.min(SKILL_MAX, energyRef.current + judgment.energy + (killed ? 1 : 0))
    energyRef.current = nextEnergy
    setEnergy(nextEnergy)
    sound.hit(comboRef.current)
    addEffect(target.x, target.y, judgment.label, judgment.type)

    const gained = Math.round((target.score / target.maxHp) * judgment.multiplier * (1 + Math.min(nextCombo, 30) * .08))
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

  function useBurst() {
    if (!playing || paused || energyRef.current < SKILL_MAX) return
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
    setTimeout(() => setEnemies((items) => [...items, ...Array.from({ length: defeated.length }, (_, index) => makeEnemy(index, true))]), 280)
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
      <div className="timing-legend"><span>GOOD</span><span>GREAT</span><b>PERFECT</b></div>

      {enemies.map((enemy) => {
        return <button
          key={enemy.entityId}
          className={`battle-enemy grade-${enemy.grade}`}
          style={{ left: `${enemy.x}%`, top: `${enemy.y}%`, '--enemy-color': enemy.color, '--timing-duration': `${enemy.timingDuration}ms` }}
          onClick={(event) => { event.stopPropagation(); attackEnemy(enemy) }}
          aria-label={`${enemy.name} 타이밍 공격`}
        >
          <span className="target-ring" />
          <MonsterImage monster={enemy} />
          {enemy.maxHp > 1 && <span className="enemy-health"><i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} /></span>}
        </button>
      })}

      {effects.map((effect) => <div key={effect.id} className={`battle-effect ${effect.type}`} style={{ left: `${effect.x}%`, top: `${effect.y}%` }}>{effect.text}</div>)}

      {countdown > 0 && <div className="battle-countdown"><span>GET READY</span><strong>{countdown}</strong></div>}
      {paused && <div className="battle-pause-overlay"><span className="eyebrow">GAME PAUSED</span><h2>잠시 쉬어갈까요?</h2><button className="btn btn-primary" onClick={togglePause}><Icon name="play" size={18} /> 계속하기</button><button className="btn btn-secondary" onClick={quit}>그만하기</button></div>}
    </section>

    <section className="battle-controls">
      <div className="timing-status"><small>TIMING ATTACK</small><strong>{lastJudge}</strong><span>몬스터의 링이 겹칠 때 직접 터치!</span></div>
      <button className={`burst-button ${energy >= SKILL_MAX ? 'ready' : ''}`} onClick={useBurst} disabled={energy < SKILL_MAX} aria-label="섀도우 버스트">
        <img src="/images/ui/hunt-swords.png" alt="" /><small>{energy >= SKILL_MAX ? 'BURST!' : `${energy} / ${SKILL_MAX}`}</small>
      </button>
      <div className="skill-meter"><span><i style={{ width: `${(energy / SKILL_MAX) * 100}%` }} /></span><small>섀도우 버스트</small></div>
    </section>

  </main>
}
