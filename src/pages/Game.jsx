import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pickRandomMonster } from '../lib/monsters'
import MonsterImage from '../components/MonsterImage'
import Icon from '../components/Icon'
import { sound } from '../lib/sound'

const GAME_TIME = 30
const MAX_ENEMIES = 9
const POSITIONS = [
  { x: 16, y: 22 }, { x: 40, y: 18 }, { x: 66, y: 21 }, { x: 86, y: 29 },
  { x: 25, y: 39 }, { x: 53, y: 36 }, { x: 76, y: 47 },
  { x: 13, y: 56 }, { x: 41, y: 54 }, { x: 63, y: 62 }, { x: 87, y: 66 },
  { x: 29, y: 70 },
]
const HP = { 일반: 1, 희귀: 1, 영웅: 2, 보스: 3 }
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
    x: position.x + (Math.random() * 5 - 2.5),
    y: position.y + (Math.random() * 4 - 2),
  }
}

function pickAutoTarget(enemies) {
  if (!enemies.length) return null
  return [...enemies].sort((a, b) => {
    const aPriority = (a.grade === '보스' ? 1000 : a.grade === '영웅' ? 300 : 0) + a.y
    const bPriority = (b.grade === '보스' ? 1000 : b.grade === '영웅' ? 300 : 0) + b.y
    return bPriority - aPriority
  })[0]
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
  const [selectedId, setSelectedId] = useState(null)
  const [effects, setEffects] = useState([])
  const [attacking, setAttacking] = useState(false)

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const monsterCountsRef = useRef({})
  const playingRef = useRef(false)
  const pausedRef = useRef(false)

  const selected = useMemo(
    () => enemies.find((enemy) => enemy.entityId === selectedId) || null,
    [enemies, selectedId],
  )

  const fillArena = useCallback(() => {
    const next = Array.from({ length: MAX_ENEMIES }, (_, index) => makeEnemy(index))
    setEnemies(next)
    setSelectedId(pickAutoTarget(next)?.entityId || null)
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
    const survivors = enemies.filter((enemy) => enemy.entityId !== deadId)
    setEnemies(survivors)
    setSelectedId(pickAutoTarget(survivors)?.entityId || null)
    setTimeout(() => setEnemies((current) => [...current, makeEnemy(deadId, true)]), 320)
  }

  function attackEnemy(target) {
    if (!playing || paused || !target || attacking) return
    setAttacking(true)
    setTimeout(() => setAttacking(false), 120)

    setSelectedId(target.entityId)
    const damage = target.grade === '보스' ? 1 : target.grade === '영웅' ? 1 : target.maxHp
    const remaining = target.hp - damage
    const nextEnergy = Math.min(8, energy + 1)
    setEnergy(nextEnergy)
    sound.hit(comboRef.current)
    addEffect(target.x, target.y, remaining <= 0 ? 'PERFECT!' : 'HIT!', remaining <= 0 ? 'perfect' : 'hit')

    if (remaining > 0) {
      setEnemies((items) => items.map((enemy) => enemy.entityId === target.entityId ? { ...enemy, hp: remaining } : enemy))
      return
    }

    const nextCombo = comboRef.current + 1
    comboRef.current = nextCombo
    maxComboRef.current = Math.max(maxComboRef.current, nextCombo)
    const gained = Math.round(target.score * (1 + Math.min(nextCombo, 30) * 0.1))
    scoreRef.current += gained
    setScore(scoreRef.current)
    setCombo(nextCombo)
    setCoins((value) => value + Math.max(1, Math.round(target.score / 100)))
    addEffect(target.x, target.y + 7, `+${gained}`, target.grade === '보스' ? 'boss' : 'score')
    if (nextCombo % 5 === 0) sound.combo()
    if (target.grade === '영웅' || target.grade === '보스') sound.rare()
    monsterCountsRef.current[target.id] = (monsterCountsRef.current[target.id] || 0) + 1
    replaceEnemy(target.entityId)
  }

  function attack() {
    attackEnemy(selected || pickAutoTarget(enemies))
  }

  function useBurst() {
    if (!playing || paused || energy < 8) return
    sound.combo()
    let bonus = 0
    enemies.forEach((enemy) => {
      bonus += enemy.score
      monsterCountsRef.current[enemy.id] = (monsterCountsRef.current[enemy.id] || 0) + 1
      addEffect(enemy.x, enemy.y, 'BURST!', 'burst')
    })
    scoreRef.current += bonus
    comboRef.current += enemies.length
    maxComboRef.current = Math.max(maxComboRef.current, comboRef.current)
    setScore(scoreRef.current)
    setCombo(comboRef.current)
    setCoins((value) => value + enemies.length)
    setEnergy(0)
    setEnemies([])
    setSelectedId(null)
    setTimeout(fillArena, 180)
  }

  function togglePause() {
    const next = !paused
    pausedRef.current = next
    setPaused(next)
    sound.button()
    if (next) sound.stopBGM()
    else sound.startBGM()
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

    <section className={`battle-arena ${energy >= 8 ? 'burst-ready' : ''}`}>
      <img className="battle-background" src="/images/battle-arena.png" alt="" />
      <div className="battle-vignette" />

      {enemies.map((enemy) => {
        const isSelected = selected?.entityId === enemy.entityId
        return <button
          key={enemy.entityId}
          className={`battle-enemy ${isSelected ? 'selected' : ''} grade-${enemy.grade}`}
          style={{ left: `${enemy.x}%`, top: `${enemy.y}%`, '--enemy-color': enemy.color }}
          onClick={(event) => { event.stopPropagation(); attackEnemy(enemy) }}
          aria-label={`${enemy.name} 바로 공격`}
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
      <div className="auto-target-badge"><i /><span><small>AUTO TARGET</small><strong>{selected?.name || '탐색 중'}</strong></span></div>
      <button className={`attack-button ${attacking ? 'attacking' : ''}`} onClick={attack} disabled={!playing || paused || !selected} aria-label="자동 타깃 공격">
        <span className="attack-rings" /><span className="attack-shine" /><Icon name="sword" size={34} strokeWidth={2.25} /><strong>ATTACK</strong>
      </button>
      <button className={`burst-button ${energy >= 8 ? 'ready' : ''}`} onClick={useBurst} disabled={energy < 8} aria-label="버스트 스킬">
        <span><Icon name="spark" size={22} /></span><b>{energy >= 8 ? '!' : energy}</b><small>SKILL</small>
      </button>
    </section>

  </main>
}
