import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import BottomNav from '../components/BottomNav'
import { getHunterTitle, getLevelProgress, getMonsterUnlockLevel, resolveProgress } from '../lib/progression'
import { getDailyMissions } from '../lib/missions'
import { getDailyBoss, koreaToday } from '../lib/bosses'

export default function Home() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [best, setBest] = useState(0)
  const [rank, setRank] = useState(null)

  useEffect(() => { if (user) loadStats() }, [user])

  async function loadStats() {
    const { data: mine } = await supabase.from('scores').select('score').eq('user_id', user.id).order('score', { ascending: false }).limit(1)
    const myBest = mine?.[0]?.score ?? 0
    setBest(myBest)

    if (myBest > 0) {
      const { data: all } = await supabase.from('scores').select('user_id, score').order('score', { ascending: false })
      const bestByUser = {}
      for (const row of all || []) if (bestByUser[row.user_id] === undefined) bestByUser[row.user_id] = row.score
      const scores = Object.values(bestByUser).sort((a, b) => b - a)
      const currentRank = scores.indexOf(myBest) + 1
      setRank(currentRank)
    }
  }

  function go(path) {
    sound.unlock()
    sound.button()
    navigate(path)
  }

  const progress = getLevelProgress(resolveProgress(profile, user.id).xp)
  const missions = progress.level >= 2 ? getDailyMissions(user.id) : []
  const dailyBoss = getDailyBoss()
  const isPopGreeting = Number(koreaToday().slice(-2)) % 2 === 0
  // 보스 카드는 최고 레벨이 아니라 보스 해금 레벨(MONSTER_LEVEL.boss)을 따른다
  const featured = progress.level >= getMonsterUnlockLevel('boss')
    ? {
        label: 'TODAY’S BOSS',
        name: `${dailyBoss.name} 출현!`,
        copy: dailyBoss.cardCopy || dailyBoss.description,
        image: dailyBoss.image,
        grade: '일일 보스',
        score: `${dailyBoss.firstClearXp} XP`,
        difficulty: '★'.repeat(dailyBoss.difficulty),
        path: '/boss',
        bossId: dailyBoss.id,
        bossColor: dailyBoss.color,
      }
    : progress.level >= 3
      ? { label: 'TODAY’S HUNT', name: '불꽃 여우 출현!', copy: '고득점 몬스터 불꽃 여우를 30초 안에 사냥하세요.', image: '/images/monsters/fox.webp', grade: '영웅 몬스터', score: '300점', difficulty: '★★☆', path: '/game' }
      : { label: 'TODAY’S HUNT', name: '번개 토끼 출현!', copy: '빠르게 움직이는 번개 토끼를 30초 안에 사냥하세요.', image: '/images/monsters/rabbit.webp', grade: '희귀 몬스터', score: '200점', difficulty: '★★☆', path: '/game' }

  return <main className="page home-page home-v2">
    <div className="home-daily-row">
      <p className={`home-daily-greeting ${isPopGreeting ? 'pop' : 'signal'}`}>
        <i>✦</i> {isPopGreeting ? '오늘도 팝! 터뜨릴 준비됐나요?' : '몬스터 출현 신호를 발견했어요!'}
      </p>
      <button className="home-utility-btn" onClick={() => go('/settings')} aria-label="설정"><Icon name="settings" size={20} /></button>
    </div>
    <header className="home-welcome">
      <button className="home-hunter-identity" onClick={() => go('/profile')} aria-label="내 프로필 보기">
        <span className="home-hunter-avatar"><i /><img src={profile?.avatar_url || '/images/monsters/slime.webp'} alt="" /></span>
        <span className="home-hunter-copy">
          <strong>{profile?.nickname || '헌터'} 헌터</strong>
          <small><b>LV.{progress.level}</b> · {getHunterTitle(progress.level)}</small>
          <em>{best > 0 ? <>최고 <b>{best.toLocaleString()}점</b>{rank ? ` · ${rank}위` : ''} <i>›</i></> : <>첫 기록에 도전해보세요 <i>›</i></>}</em>
        </span>
      </button>
    </header>

    <section className="hunter-progress mission-card" aria-label="오늘의 미션">
      {progress.level >= 2 ? <div className="mission-list">
        <div className="mission-list-head"><small>오늘의 미션</small><span>{missions.filter((m) => m.done).length}/{missions.length} 완료</span></div>
        {missions.map((mission) => <div key={mission.id} className={`mission-item ${mission.done ? 'done' : ''}`}>
          <span className="mission-check"><Icon name={mission.done ? 'check' : 'spark'} size={15} /></span>
          <div className="mission-body">
            <div className="mission-body-top"><strong>{mission.title}</strong><em>{mission.value}/{mission.goal}</em><b>{mission.done ? '완료' : `+${mission.rewardXp} XP`}</b></div>
            <div className="mission-track"><i style={{ width: `${mission.percent}%` }} /></div>
          </div>
        </div>)}
      </div> : <div className="progress-mission locked"><span><Icon name="lock" size={17} /></span><div><small>오늘의 미션</small><strong>일일 미션 준비 중</strong><em>Lv.2부터 매일 새로운 성장 목표가 열려요</em></div><b>LV.2</b></div>}
    </section>

    <section
      className={`hero-card boss-card${featured.bossId ? ' is-daily-boss' : ''}`}
      style={featured.bossColor ? { '--featured-boss-color': featured.bossColor } : undefined}
    >
      <div className="boss-main">
        <div className="hero-copy">
          {/* 스펙(메타)은 이름 뒤에 온다. 앞에 두면 무엇인지 알기 전에 숫자부터 읽게 된다 */}
          <span className="boss-label">{featured.label}</span>
          <h2>{featured.name}</h2>
          <p>{featured.copy}</p>
        </div>
        <div className="boss-visual" aria-hidden="true">
          <span />
          <img className="hero-monster" src={featured.image} alt="" />
        </div>
      </div>
      {/* 메타는 boss-main 밖에 둔다. 안에 두면 몬스터가 가장 넓어지는 높이와 겹쳐,
          화면이 좁아질 때마다 칩이 그림 아래로 파고든다 */}
      <div className="hunt-meta"><span>{featured.grade}</span><span>+{featured.score}</span><span>난이도 {featured.difficulty}</span></div>
      <button className="boss-start" onClick={() => go(featured.path)}><img src="/images/ui/hunt-swords.webp" alt="" /><span>{featured.path === '/boss' ? '보스 도전하기' : '지금 사냥하기'}</span><b>›</b></button>
    </section>
    <BottomNav />
  </main>
}
