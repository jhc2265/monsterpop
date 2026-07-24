import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import BottomNav from '../components/BottomNav'
import { timeAgo } from '../lib/format'

export default function Home() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [best, setBest] = useState(0)
  const [delta, setDelta] = useState(null)
  const [rank, setRank] = useState(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [recent, setRecent] = useState(null)
  const [muted, setMuted] = useState(sound.isMuted())

  useEffect(() => { if (user) loadStats() }, [user])

  async function loadStats() {
    const [{ data: mine }, { data: latest }] = await Promise.all([
      supabase.from('scores').select('score').eq('user_id', user.id).order('score', { ascending: false }).limit(2),
      supabase.from('scores').select('score, max_combo, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
    ])
    const myBest = mine?.[0]?.score ?? 0
    setBest(myBest)
    setRecent(latest?.[0] || null)

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

    <section className="hero-card boss-card">
      <div className="hero-copy">
        <span className="boss-label">TODAY&apos;S BOSS</span>
        <h2>그림자 대왕 출현!</h2>
        <p>30초 동안 콤보를 이어<br />최고 기록에 도전하세요.</p>
        <span className="boss-reward">보상 <b>★ ×2</b></span>
      </div>
      <div className="boss-visual" aria-hidden="true">
        <span />
        <img className="hero-monster" src="/images/boss.png" alt="" />
      </div>
    </section>

    <section className="quick-stats enhanced-stats" aria-label="나의 기록">
      <article className="stat-card">
        <span className="stat-icon purple art-tile"><img src="/images/ui/trophy.png" alt="" /></span>
        <div><small>최고 점수</small><strong>{best.toLocaleString()}</strong><em>{delta === null ? '첫 기록을 세워보세요' : <>지난 기록 대비 <b>{delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%</b></>}</em></div>
      </article>
      <article className="stat-card">
        <span className="stat-icon pink art-tile"><img src="/images/ui/crown.png" alt="" /></span>
        <div><small>현재 순위</small><strong>{rank ? `${rank}위` : '도전 전'}</strong><em>{rank ? <>전체 {totalPlayers.toLocaleString()}명 중 <b>{rank}위</b></> : '순위에 도전하세요'}</em></div>
      </article>
    </section>

    <button className="hunt-button hunt-button-v2" onClick={() => go('/game')}>
      <span className="hunt-icon art-tile"><img src="/images/ui/hunt-swords.png" alt="" /></span>
      <span><strong>지금 사냥 시작하기</strong><small>30초 동안 최고 기록에 도전</small></span>
      <span className="hunt-arrow">›</span>
    </button>

    <section className={`daily-mission mission-v2 ${missionDone ? 'complete' : ''}`} aria-label="오늘의 미션">
      <div className="mission-v2-head"><strong>오늘의 미션</strong><span>★ 200</span></div>
      <div className="mission-v2-body"><strong>{missionDone ? '✓' : '○'} 오늘 사냥 1회 완료</strong>{!missionDone && <span>0 / 1</span>}</div>
      {!missionDone && <div className="mission-bar"><i style={{ width: '8%' }} /></div>}
    </section>

    <section className="recent-hunt" aria-label="최근 사냥 기록">
      <div className="recent-hunt-head"><strong>최근 사냥</strong><span>{recent ? timeAgo(recent.created_at) : '기록 없음'}</span></div>
      {recent ? <div className="recent-hunt-stats">
        <div><small>획득 점수</small><strong>{recent.score.toLocaleString()}</strong></div>
        <i />
        <div><small>최고 콤보</small><strong>{recent.max_combo || 0}</strong></div>
        <i />
        <div><small>현재 순위</small><strong>{rank ? `${rank}위` : '-'}</strong></div>
      </div> : <button onClick={() => go('/game')}>아직 사냥 기록이 없어요. <strong>첫 사냥 시작하기 →</strong></button>}
    </section>
    <BottomNav />
  </main>
}
