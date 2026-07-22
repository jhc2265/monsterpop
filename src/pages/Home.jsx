import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

export default function Home() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [best, setBest] = useState(0)
  const [rank, setRank] = useState(null)
  const [muted, setMuted] = useState(sound.isMuted())

  useEffect(() => { if (user) loadStats() }, [user])
  async function loadStats() {
    const { data: mine } = await supabase.from('scores').select('score').eq('user_id', user.id).order('score', { ascending: false }).limit(1)
    const myBest = mine?.[0]?.score ?? 0; setBest(myBest)
    if (myBest > 0) {
      const { data: all } = await supabase.from('scores').select('user_id, score').order('score', { ascending: false })
      const bestByUser = {}; for (const row of all || []) if (bestByUser[row.user_id] === undefined) bestByUser[row.user_id] = row.score
      setRank(Object.values(bestByUser).sort((a, b) => b - a).indexOf(myBest) + 1)
    }
  }
  function go(path) { sound.unlock(); sound.button(); navigate(path) }
  function toggleMute() { const next = !muted; sound.setMuted(next); setMuted(next) }

  return <main className="page home-page">
    <header className="topbar home-topbar">
      <div><span className="overline">WELCOME BACK</span><h1>{profile?.nickname || '헌터'}님</h1></div>
      <div className="topbar-actions">
        <button className="icon-btn" onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'}><Icon name={muted ? 'mute' : 'sound'} /></button>
        <button className="icon-btn" onClick={() => { sound.button(); signOut() }} aria-label="로그아웃"><Icon name="logout" /></button>
      </div>
    </header>
    <section className="hero-card">
      <div className="hero-copy"><span className="pill pill-live"><i /> TODAY'S HUNT</span><p>30초 안에 최대한 많이!</p><h2>콤보를 이어<br />랭킹을 정복하세요</h2></div>
      <img className="hero-monster" src="/images/boss.png" alt="그림자 대왕" />
      <div className="hero-glow" />
    </section>
    <section className="quick-stats" aria-label="나의 기록">
      <div className="stat-card"><span className="stat-icon purple"><Icon name="trophy" /></span><div><small>최고 점수</small><strong>{best.toLocaleString()}</strong></div></div>
      <div className="stat-card"><span className="stat-icon pink">#</span><div><small>현재 순위</small><strong>{rank ? `${rank}위` : '도전 전'}</strong></div></div>
    </section>
    <button className="hunt-button" onClick={() => go('/game')}><span className="hunt-icon"><Icon name="play" size={25} /></span><span><strong>사냥 시작</strong><small>30초 · 최고 콤보에 도전</small></span><span className="hunt-arrow">›</span></button>
    <section className="section-block"><div className="section-heading"><div><span className="overline">EXPLORE</span><h2>헌터 메뉴</h2></div></div>
      <div className="menu-cards">
        <button className="menu-card" onClick={() => go('/ranking')}><span className="menu-icon purple"><Icon name="trophy" /></span><span><strong>랭킹</strong><small>최고의 헌터를 확인하세요</small></span><b>›</b></button>
        <button className="menu-card" onClick={() => go('/community')}><span className="menu-icon cyan"><Icon name="chat" /></span><span><strong>커뮤니티</strong><small>공략과 기록을 나눠보세요</small></span><b>›</b></button>
      </div>
    </section>
  </main>
}
