import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDailyBoss } from '../lib/bosses'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

export default function Boss() {
  const navigate = useNavigate()
  const boss = getDailyBoss()
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(boss.timeLimit)
  const [hp, setHp] = useState(boss.maxHp)
  const [combo, setCombo] = useState(0)
  const [attackCount, setAttackCount] = useState(0)
  const [judge, setJudge] = useState('보스의 공격 신호를 확인하세요')
  const [effect, setEffect] = useState(null)
  const playingRef = useRef(false)
  const pointerDownRef = useRef(0)
  const maxComboRef = useRef(0)

  const phase = hp > boss.maxHp * 0.7 ? 1 : hp > boss.maxHp * 0.4 ? 2 : 3
  const action = phase === 1 ? 'tap' : phase === 2 ? 'hold' : attackCount % 2 === 0 ? 'tap' : 'hold'

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
    return () => clearTimeout(musicTimer)
  }, [countdown])

  useEffect(() => {
    if (!playingRef.current || hp <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((value) => {
        if (value > 1) return value - 1
        clearInterval(timer)
        finish(false)
        return 0
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown, hp])

  useEffect(() => () => sound.stopBossBGM(), [])

  function flash(text, type) {
    setEffect({ text, type, id: Date.now() })
    setTimeout(() => setEffect(null), 500)
  }

  function hit() {
    if (!playingRef.current) return
    const nextHp = Math.max(0, hp - 1)
    const nextCombo = combo + 1
    setHp(nextHp)
    setCombo(nextCombo)
    setAttackCount((value) => value + 1)
    maxComboRef.current = Math.max(maxComboRef.current, nextCombo)
    sound.hit(nextCombo)
    setJudge(phase === 3 ? 'FINAL RUSH!' : 'NICE!')
    flash(`-${boss.maxHp - nextHp}`, phase === 3 ? 'rush' : 'hit')
    if (nextHp === 0) finish(true)
  }

  function miss(message) {
    setCombo(0)
    sound.miss()
    setJudge(message)
    flash('MISS', 'miss')
  }

  function handlePointerDown(event) {
    if (!playingRef.current) return
    event.preventDefault()
    pointerDownRef.current = Date.now()
  }

  function handlePointerUp(event) {
    if (!playingRef.current) return
    event.preventDefault()
    const heldFor = Date.now() - pointerDownRef.current
    if (action === 'tap' && heldFor < 350) hit()
    else if (action === 'hold' && heldFor >= 600) hit()
    else miss(action === 'hold' ? '더 길게 눌러주세요!' : '빠르게 터치하세요!')
  }

  function finish(cleared) {
    if (!playingRef.current) return
    playingRef.current = false
    sound.stopBossBGM()
    if (!cleared) sound.over()
    navigate('/result', {
      replace: true,
      state: {
        score: cleared ? 15000 + timeLeft * 250 : Math.max(0, (boss.maxHp - hp) * 300),
        maxCombo: maxComboRef.current,
        monsterCounts: cleared ? { boss: 1 } : {},
        mode: 'boss',
        bossClear: cleared,
      },
    })
  }

  function quit() {
    playingRef.current = false
    sound.stopBossBGM()
    navigate('/home', { replace: true })
  }

  return <main className={`battle-page boss-battle phase-${phase}`}>
    <header className="battle-hud boss-hud">
      <button className="battle-pause" onClick={quit} aria-label="보스전 나가기"><Icon name="back" size={18} /></button>
      <div className="battle-score"><small>DAILY BOSS</small><strong>{boss.name}</strong><span>{boss.element}</span></div>
      <div className="battle-timer"><span>◆</span><strong>00:{String(timeLeft).padStart(2, '0')}</strong></div>
      <div className={`battle-combo ${combo > 0 ? 'active' : ''}`}><small>COMBO</small><strong>{combo}</strong></div>
    </header>

    <div className="boss-healthbar"><div><small>PHASE {phase}</small><strong>{hp} / {boss.maxHp}</strong></div><span><i style={{ width: `${(hp / boss.maxHp) * 100}%` }} /></span></div>

    <section className="battle-arena boss-arena">
      <img className="battle-background" src="/images/bg/battle-arena.webp" alt="" />
      <div className="battle-vignette" />
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
      <button className={`boss-target action-${action} ${effect ? `react-${effect.type}` : ''}`} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={() => { pointerDownRef.current = 0 }}>
        <span className="action-cue">{action === 'hold' ? 'HOLD' : 'TAP'}</span>
        <img src={boss.image} alt={boss.name} draggable="false" />
      </button>
      {effect && <div key={effect.id} className={`boss-hit-effect ${effect.type}`}>{effect.text}</div>}
      {countdown > 0 && <div className="battle-countdown"><span>DAILY BOSS</span><strong key={countdown}>{countdown}</strong><p>{boss.title}</p></div>}
    </section>

    <section className="boss-command">
      <small>{phase === 3 ? 'FINAL PHASE' : `PHASE ${phase}`}</small>
      <strong>{judge}</strong>
      <span>{action === 'hold' ? '왕관이 빛날 때 길게 누르세요' : '방어막이 열릴 때 빠르게 터치하세요'}</span>
    </section>
  </main>
}
