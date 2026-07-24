import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import BottomNav from '../components/BottomNav'
import { getLevelProgress, LEVEL_UNLOCKS, resolveProgress } from '../lib/progression'

export default function Home() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [best, setBest] = useState(0)
  const [delta, setDelta] = useState(null)
  const [rank, setRank] = useState(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [muted, setMuted] = useState(sound.isMuted())

  useEffect(() => { if (user) loadStats() }, [user])

  async function loadStats() {
    const { data: mine } = await supabase.from('scores').select('score').eq('user_id', user.id).order('score', { ascending: false }).limit(2)
    const myBest = mine?.[0]?.score ?? 0
    setBest(myBest)

    const previous = mine?.[1]?.score
    if (myBest > 0 && previous > 0) setDelta(Math.round(((myBest - previous) / previous) * 100))

    if (myBest > 0) {
      const { data: all } = await supabase.from('scores').select('user_id, score').order('score', { ascending: false })
      const bestByUser = {}
      for (const row of all || []) if (bestByUser[row.user_id] === undefined) bestByUser[row.user_id] = row.score
      const scores = Object.values(bestByUser).sort((a, b) => b - a)
      const currentRank = scores.indexOf(myBest) + 1
      setRank(currentRank)
      setTotalPlayers(scores.length)
    }
  }

  function go(path) {
    sound.unlock()
    sound.button()
    navigate(path)
  }

  function toggleMute() {
    const next = !muted
    sound.setMuted(next)
    setMuted(next)
  }

  const missionDone = best > 0
  const progress = getLevelProgress(resolveProgress(profile, user.id).xp)
  const nextUnlock = LEVEL_UNLOCKS[Math.min(10, progress.level + 1)]
  const featured = progress.level >= 5
    ? { label: 'TODAY’S BOSS', name: '그림자 대왕 출현!', copy: '길게 눌러 방어막을 깨고\n최고 기록에 도전하세요.', image: '/images/boss.png' }
    : progress.level >= 3
      ? { label: 'TODAY’S HUNT', name: '불꽃 여우 출현!', copy: '빠르게 두 번 터치해\n고득점 몬스터를 사냥하세요.', image: '/images/fox.png' }
      : { label: 'TODAY’S HUNT', name: '번개 토끼 출현!', copy: '좌우로 빠르게 밀어\n번개 토끼를 사냥하세요.', image: '/images/rabbit.png' }

  return <main className="page home-page home-v2">
    <header className="home-welcome">
      <div>
        <h1>안녕하세요, <strong>{profile?.nickname || '헌터'} 헌터님!</strong></h1>
        <p>오늘도 최고 기록에 도전해보세요.</p>
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'}><Icon name={muted ? 'mute' : 'sound'} /></button>
        <button className="icon-btn" onClick={() => go('/settings')} aria-label="설정"><Icon name="settings" /></button>
      </div>
    </header>

    <section className="hunter-progress" aria-label="헌터 레벨">
      <div className="hunter-progress-head"><span>LV.{progress.level}</span><div><strong>{profile?.nickname || '헌터'} · {progress.level >= 10 ? '마스터 헌터' : '성장 중인 헌터'}</strong><small>{progress.level >= 10 ? '최고 레벨 달성!' : `다음 해금 · ${nextUnlock?.title}`}</small></div><b>{progress.level >= 10 ? `${progress.total.toLocaleString()} XP` : `${progress.current.toLocaleString()} / ${progress.needed.toLocaleString()} XP`}</b></div>
      <div className="hunter-xp-bar"><i style={{ width: `${progress.percent}%` }} /></div>
      {progress.level >= 2 ? <div className={`progress-mission ${missionDone ? 'complete' : ''}`}><span><Icon name={missionDone ? 'check' : 'spark'} size={16} /></span><div><small>오늘의 미션</small><strong>오늘 사냥 1회 완료</strong></div><b>{missionDone ? '완료' : '+40 XP · ★ 200'}</b></div> : <div className="progress-next"><Icon name="lock" size={14} /><span>Lv.2 달성 시 오늘의 미션과 보상이 열려요</span></div>}
    </section>

    <section className="hero-card boss-card">
      <div className="hero-copy">
        <span className="boss-label">{featured.label}</span>
        <h2>{featured.name}</h2>
        <p>{featured.copy.split('\n').map((line) => <span key={line}>{line}<br /></span>)}</p>
        <button className="boss-start" onClick={() => go('/game')}><img src="/images/ui/hunt-swords.png" alt="" /><span>사냥 시작</span><b>›</b></button>
      </div>
      <div className="boss-visual" aria-hidden="true">
        <span />
        <img className="hero-monster" src={featured.image} alt="" />
      </div>
    </section>

    <section className="home-record" aria-label="나의 기록">
      <div className="home-record-title"><span>내 기록</span><button onClick={() => go('/ranking')}>랭킹 보기 ›</button></div>
      <div className="home-record-grid"><article>
        <span className="stat-icon purple art-tile"><img src="/images/ui/trophy.png" alt="" /></span>
        <div><small>최고 점수</small><strong>{best.toLocaleString()}</strong><em>{delta === null ? '첫 기록을 세워보세요' : <>이전 기록 대비 <b>{delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%</b></>}</em></div>
      </article><i /><article>
        <span className="stat-icon pink art-tile"><img src="/images/ui/crown.png" alt="" /></span>
        <div><small>현재 순위</small><strong>{rank ? `${rank}위` : '도전 전'}</strong><em>{rank ? <>전체 {totalPlayers.toLocaleString()}명 중 <b>{rank}위</b></> : '순위에 도전하세요'}</em></div>
      </article></div>
    </section>
    <BottomNav />
  </main>
}
