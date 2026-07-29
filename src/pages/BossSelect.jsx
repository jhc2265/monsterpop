import { useNavigate } from 'react-router-dom'
import { DAILY_BOSSES, getBossRecord, getDailyBoss } from '../lib/bosses'
import { useAuth } from '../context/AuthContext'
import { getLevel, resolveProgress } from '../lib/progression'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

export default function BossSelect() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const level = getLevel(resolveProgress(profile, user.id).xp)
  const todayBossId = getDailyBoss().id

  function challenge(boss) {
    sound.unlock()
    sound.button()
    navigate(`/boss/${boss.id}`)
  }

  return <main className="page boss-select-page">
    <header className="topbar">
      <button className="icon-btn" onClick={() => navigate('/home')} aria-label="뒤로"><Icon name="back" /></button>
      <div className="title-stack"><span className="overline">DAILY BOSS</span><h1>보스 선택</h1></div>
      <span className="topbar-spacer" />
    </header>

    <p className="boss-select-intro">모든 보스는 자유롭게 도전할 수 있어요. 오늘의 보스를 처음 처치하면 일일 보너스 XP를 받습니다.</p>

    <ul className="boss-select-list">
      {DAILY_BOSSES.map((boss) => {
        const record = getBossRecord(user.id, boss.id)
        const levelLocked = level < boss.unlockLevel
        const locked = levelLocked
        const isToday = boss.id === todayBossId
        return <li key={boss.id}>
          <button
            className={`boss-select-card${isToday ? ' today' : ''}${locked ? ' locked' : ''}`}
            style={{ '--boss-color': boss.color }}
            onClick={() => challenge(boss)}
            disabled={locked}
          >
            <span className="boss-select-visual" aria-hidden="true"><i /><img src={boss.image} alt="" /></span>
            <span className="boss-select-body">
              <span className="boss-select-tags">
                <em>{boss.element}</em>
                {isToday && <b className="tag-today">오늘의 보스</b>}
                {!isToday && <b className="tag-open">자유 도전</b>}
                {record.clearedToday && <b className="tag-cleared">클리어</b>}
              </span>
              <strong>{boss.name}</strong>
              <small>{boss.title}</small>
              <span className="boss-select-meta">
                <span>난이도 {'★'.repeat(boss.difficulty)}</span>
                <span>{isToday ? `첫 처치 +${boss.firstClearXp} XP` : '연습 · 기록'}</span>
                <span>{boss.timeLimit}초 제한</span>
              </span>
            </span>
            <span className="boss-select-go">{locked ? <Icon name="lock" size={16} /> : '›'}</span>
          </button>
        </li>
      })}
    </ul>
  </main>
}
