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
  const [delta, setDelta] = useState(null)
  const [rank, setRank] = useState(null)
  const [rankPercent, setRankPercent] = useState(null)
  const [muted, setMuted] = useState(sound.isMuted())
  const [settingsOpen, setSettingsOpen] = useState(false)

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
      setRankPercent(Math.max(1, Math.ceil((currentRank / scores.length) * 100)))
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
        <button className={`icon-btn art-button ${muted ? 'is-muted' : ''}`} onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'}><img src="/images/ui/sound.png" alt="" /></button>
        <button className="icon-btn art-button" onClick={() => setSettingsOpen((open) => !open)} aria-label="설정" aria-expanded={settingsOpen}><img src="/images/ui/settings.png" alt="" /></button>
      </div>
      {settingsOpen && <div className="home-settings">
        <span>계정 설정</span>
        <button onClick={() => { sound.button(); signOut() }}><Icon name="logout" size={17} /> 로그아웃</button>
      </div>}
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
        <div><small>현재 순위</small><strong>{rank ? `${rank}위` : '도전 전'}</strong><em>{rankPercent ? <>상위 <b>{rankPercent}%</b></> : '순위에 도전하세요'}</em></div>
      </article>
    </section>

    <button className="hunt-button hunt-button-v2" onClick={() => go('/game')}>
      <span className="hunt-icon art-tile"><img src="/images/ui/play.png" alt="" /></span>
      <span><strong>지금 사냥 시작하기</strong><small>30초 동안 최고 기록에 도전</small></span>
      <span className="hunt-arrow">›</span>
    </button>

    <section className="daily-mission" aria-label="오늘의 미션">
      <div className="mission-label"><span>오늘의</span><strong>미션</strong></div>
      <div className="mission-main">
        <div><strong>오늘 사냥 1회 완료</strong><span>{missionDone ? '1 / 1' : '0 / 1'}</span></div>
        <div className="mission-bar"><i style={{ width: missionDone ? '100%' : '8%' }} /></div>
      </div>
      <div className="mission-reward"><small>보상</small><strong>★ 200</strong></div>
    </section>

    <section className="section-block hunter-menu">
      <div className="section-heading"><div><h2>헌터 메뉴</h2></div></div>
      <div className="menu-cards">
        <button className="menu-card menu-rank" onClick={() => go('/ranking')}><span className="menu-icon purple art-tile"><img src="/images/ui/trophy.png" alt="" /></span><span><strong>랭킹</strong><small>실시간 순위 확인</small></span></button>
        <button className="menu-card menu-book" onClick={() => go('/collection')}><span className="menu-icon pink art-tile"><img src="/images/ui/book.png" alt="" /></span><span><strong>몬스터 도감</strong><small>몬스터 확인</small></span></button>
        <button className="menu-card menu-chat" onClick={() => go('/community')}><span className="menu-icon cyan art-tile"><img src="/images/ui/community.png" alt="" /></span><span><strong>커뮤니티</strong><small>헌터들과 소통</small></span></button>
      </div>
    </section>
  </main>
}
