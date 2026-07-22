import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { pickRandomMonster } from '../lib/monsters'
import MonsterImage from '../components/MonsterImage'
import { sound } from '../lib/sound'

const GAME_TIME = 30
const MONSTER_LIFETIME = { slime: 1300, rabbit: 950, fox: 1100, boss: 1500 }

let floaterId = 0

export default function Game() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [monster, setMonster] = useState(null)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [spawnKey, setSpawnKey] = useState(0)
  const [hitKey, setHitKey] = useState(0)
  const [floaters, setFloaters] = useState([])

  const maxComboRef = useRef(0)
  const comboRef = useRef(0)
  const scoreRef = useRef(0)
  const lifeTimer = useRef(null)
  const pausedRef = useRef(false)

  // ----- 몬스터 스폰 -----
  const spawn = useCallback(() => {
    if (pausedRef.current) return
    const m = pickRandomMonster()
    setMonster(m)
    setPos({
      x: Math.random() * 76 + 12,
      y: Math.random() * 62 + 18,
    })
    setSpawnKey((k) => k + 1)
    if (m.grade === '희귀' || m.grade === '보스') sound.rare()

    clearTimeout(lifeTimer.current)
    lifeTimer.current = setTimeout(() => {
      // 시간 내에 못 잡음 = 미스, 콤보 초기화
      comboRef.current = 0
      setCombo(0)
      sound.miss()
      spawn()
    }, MONSTER_LIFETIME[m.id] || 1200)
  }, [])

  // ----- 카운트다운 -----
  useEffect(() => {
    sound.unlock()
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 700)
    return () => clearTimeout(t)
  }, [countdown])

  useEffect(() => {
    if (countdown === 0 && !playing) {
      setPlaying(true)
      sound.start()
      sound.startBGM()
      spawn()
    }
  }, [countdown, playing, spawn])

  // ----- 게임 타이머 -----
  useEffect(() => {
    if (!playing) return
    const iv = setInterval(() => {
      if (pausedRef.current) return
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(iv)
          endGame()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  function endGame() {
    clearTimeout(lifeTimer.current)
    sound.stopBGM()
    sound.over()
    setPlaying(false)
    navigate('/result', {
      state: { score: scoreRef.current, maxCombo: maxComboRef.current },
      replace: true,
    })
  }

  // ----- 몬스터 클릭 -----
  function hitMonster(e) {
    if (!playing || paused || !monster) return
    e.stopPropagation()
    clearTimeout(lifeTimer.current)

    const newCombo = comboRef.current + 1
    comboRef.current = newCombo
    if (newCombo > maxComboRef.current) maxComboRef.current = newCombo

    const comboMult = 1 + Math.min(newCombo, 30) * 0.1
    const gained = Math.round(monster.score * comboMult)
    scoreRef.current += gained

    setCombo(newCombo)
    setScore(scoreRef.current)
    setHitKey((k) => k + 1)

    // 시각 피드백
    const perfect = monster.grade === '희귀' || monster.grade === '보스'
    addFloater(pos.x, pos.y, `+${gained}`, perfect)

    sound.hit(newCombo)
    if (newCombo > 0 && newCombo % 5 === 0) sound.combo()

    spawn()
  }

  // 빈 곳 클릭 = 헛방(콤보 감소 없이 살짝 페널티 느낌만)
  function missClick() {
    if (!playing || paused) return
    sound.miss()
  }

  function addFloater(x, y, text, perfect) {
    const id = ++floaterId
    setFloaters((f) => [...f, { id, x, y, text, perfect }])
    setTimeout(() => {
      setFloaters((f) => f.filter((fl) => fl.id !== id))
    }, 700)
  }

  function togglePause() {
    const next = !paused
    setPaused(next)
    pausedRef.current = next
    sound.button()
    if (next) {
      clearTimeout(lifeTimer.current)
      sound.stopBGM()
    } else {
      sound.startBGM()
      spawn()
    }
  }

  function quit() {
    clearTimeout(lifeTimer.current)
    sound.stopBGM()
    navigate('/', { replace: true })
  }

  useEffect(() => () => clearTimeout(lifeTimer.current), [])

  return (
    <div className="page" style={{ paddingBottom: 20 }}>
      <div className="game-hud">
        <button className="icon-btn" onClick={togglePause}>
          {paused ? '▶' : '⏸'}
        </button>
        <div className="hud-box">
          <div className="lbl">SCORE</div>
          <div className="val">{score.toLocaleString()}</div>
        </div>
        <div className="hud-box">
          <div className="lbl">TIME</div>
          <div className="val">{timeLeft}</div>
        </div>
        <div className="hud-box">
          <div className="lbl">COMBO</div>
          <div className="val combo-val">{combo}</div>
        </div>
      </div>

      <div className="timer-bar">
        <div
          className="timer-fill"
          style={{ width: `${(timeLeft / GAME_TIME) * 100}%` }}
        />
      </div>

      <div className="arena" onClick={missClick}>
        {countdown > 0 && <div className="countdown">{countdown}</div>}

        {combo >= 2 && playing && (
          <div className="combo-badge" key={hitKey}>
            COMBO {combo}
          </div>
        )}

        {playing && monster && (
          <div
            key={spawnKey}
            className={`monster ${monster.grade === '보스' ? 'boss' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onClick={hitMonster}
            onTouchStart={hitMonster}
          >
            <MonsterImage monster={monster} />
          </div>
        )}

        {floaters.map((f) => (
          <div
            key={f.id}
            className={`floater ${f.perfect ? 'perfect' : ''}`}
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
          >
            {f.perfect ? `PERFECT ${f.text}` : f.text}
          </div>
        ))}

        {paused && (
          <div className="countdown" style={{ flexDirection: 'column', fontSize: 28, gap: 16 }}>
            일시정지
            <button className="btn btn-primary" style={{ width: 180 }} onClick={togglePause}>
              계속하기
            </button>
            <button className="btn btn-ghost" style={{ width: 180 }} onClick={quit}>
              그만두기
            </button>
          </div>
        )}
      </div>

      <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 10 }}>
        몬스터를 빠르게 탭! 연속으로 잡으면 콤보 보너스 ↑
      </p>
    </div>
  )
}
