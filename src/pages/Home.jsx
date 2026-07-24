import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import BottomNav from '../components/BottomNav'
import { getLevelProgress, LEVEL_UNLOCKS, resolveProgress } from '../lib/progression'
import { MONSTERS } from '../lib/monsters'

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
  const nextMonster = MONSTERS.find((monster) => nextUnlock?.monsters?.includes(monster.id))
  const featured = progress.level >= 5
    ? { label: 'TODAY’S BOSS', name: '그림자 대왕 출현!', copy: '강력한 그림자 대왕을 사냥하고 최고 기록에 도전하세요.', image: '/images/boss.png', grade: '보스 몬스터', score: '500점', difficulty: '★★★' }
    : progress.level >= 3
      ? { label: 'TODAY’S HUNT', name: '불꽃 여우 출현!', copy: '고득점 몬스터 불꽃 여우를 30초 안에 사냥하세요.', image: '/images/fox.png', grade: '영웅 몬스터', score: '300점', difficulty: '★★☆' }
      : { label: 'TODAY’S HUNT', name: '번개 토끼 출현!', copy: '빠르게 움직이는 번개 토끼를 30초 안에 사냥하세요.', image: '/images/rabbit.png', grade: '희귀 몬스터', score: '200점', difficulty: '★★☆' }

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
      <div className="hunter-progress-head"><span>LV.{progress.level}</span><div><strong>{profile?.nickname || '헌터'} · {progress.level >= 10 ? '마스터 헌터' : '성장 중인 헌터'}</strong></div><b>{progress.level >= 10 ? `${progress.total.toLocaleString()} XP` : `${progress.current.toLocaleString()} / ${progress.needed.toLocaleString()} XP`}</b></div>
      <div className="hunter-xp-bar"><i style={{ width: `${progress.percent}%` }} /></div>
      {progress.level < 10 && <div className="next-unlock"><span>{nextMonster ? <img src={nextMonster.image} alt="" /> : <Icon name="spark" size={18} />}</span><div><small>다음 해금</small><strong>{nextUnlock?.title}</strong></div><b>LV.{progress.level + 1}</b></div>}
      {progress.level >= 2 ? <div className={`progress-mission ${missionDone ? 'complete' : ''}`}><span><Icon name={missionDone ? 'check' : 'spark'} size={16} /></span><div><small>오늘의 미션</small><strong>오늘 사냥 1회 완료</strong></div><b>{missionDone ? '완료' : '+40 XP · ★ 200'}</b></div> : <div className="progress-next"><Icon name="lock" size={14} /><span>Lv.2 달성 시 오늘의 미션과 보상이 열려요</span></div>}
    </section>

    <section className="hero-card boss-card">
      <div className="boss-main">
        <div className="hero-copy">
          <span className="boss-label">{featured.label}</span>
          <div className="hunt-meta"><span>{featured.grade}</span><span>+{featured.score}</span><span>난이도 {featured.difficulty}</span></div>
          <h2>{featured.name}</h2>
          <p>{featured.copy}</p>
        </div>
        <div className="boss-visual" aria-hidden="true">
          <span />
          <img className="hero-monster" src={featured.image} alt="" />
        </div>
      </div>
      <button className="boss-start" onClick={() => go('/game')}><img src="/images/ui/hunt-swords.png" alt="" /><span>지금 사냥하기</span><b>›</b></button>
    </section>

    <section className="home-record" aria-label="나의 기록">
      <div className="home-record-title"><span>내 기록</span><button onClick={() => go('/ranking')}>랭킹 보기 ›</button></div>
      <div className="record-list"><div><span>최고 점수</span><strong>{best.toLocaleString()}</strong><small>{delta === null ? '첫 기록에 도전' : <>이전 기록 대비 <b>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</b></>}</small></div><div><span>현재 순위</span><strong>{rank ? `${rank}위` : '도전 전'}</strong><small>{rank ? `전체 ${totalPlayers.toLocaleString()}명` : '기록을 세워보세요'}</small></div></div>
    </section>
    <BottomNav />
  </main>
}
