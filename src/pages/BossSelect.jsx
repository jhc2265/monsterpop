import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DAILY_BOSSES, getBossRecord, getDailyBoss } from '../lib/bosses'
import { useAuth } from '../context/AuthContext'
import { getLevel, resolveProgress } from '../lib/progression'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

// 전투 중에는 신호를 읽느라 설명을 볼 여유가 없다. 규칙은 들어가기 전에 알려준다.
const CUE_GUIDE = [
  { label: 'TAP', copy: '짧게 터치' },
  { label: 'HOLD', copy: '게이지가 찰 때까지 누르기' },
  { label: 'SWIPE', copy: '좌우로 밀기' },
  { label: 'WAIT', copy: '건드리지 않고 버티기' },
]

export default function BossSelect() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const level = getLevel(resolveProgress(profile, user.id).xp)
  const todayBossId = getDailyBoss().id
  const [briefing, setBriefing] = useState(null)

  function openBriefing(boss) {
    sound.button()
    setBriefing(boss)
  }

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
            onClick={() => openBriefing(boss)}
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

    {briefing && <BossBriefing
      boss={briefing}
      isToday={briefing.id === todayBossId}
      onClose={() => { sound.button(); setBriefing(null) }}
      onStart={() => challenge(briefing)}
    />}
  </main>
}

function BossBriefing({ boss, isToday, onClose, onStart }) {
  return <div className="modal-overlay boss-briefing-overlay" onClick={onClose}>
    <section className="boss-briefing" style={{ '--boss-color': boss.color }} onClick={(event) => event.stopPropagation()}>
      <header className="boss-briefing-head">
        <img src={boss.image} alt="" />
        <div>
          <span className="overline">{boss.element} · 난이도 {'★'.repeat(boss.difficulty)}</span>
          <strong>{boss.name}</strong>
          <small>{boss.title}</small>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="닫기"><Icon name="close" size={17} /></button>
      </header>

      <div className="boss-briefing-stats">
        <div><small>제한 시간</small><strong>{boss.timeLimit}초</strong></div>
        <div><small>체력</small><strong>{boss.maxHp}</strong></div>
        <div><small>격파 보상</small><strong>{isToday ? `+${boss.firstClearXp} XP` : '기록만'}</strong></div>
      </div>

      <div className="boss-briefing-block">
        <span className="overline">신호 읽기</span>
        <ul className="boss-briefing-cues">
          {CUE_GUIDE.map((cue) => <li key={cue.label}><b>{cue.label}</b><span>{cue.copy}</span></li>)}
        </ul>
      </div>

      <div className="boss-briefing-block boss-briefing-mechanic">
        <span className="overline">{boss.mechanic.short}</span>
        <strong>{boss.mechanic.name}</strong>
        <ul>
          <li><em>언제</em><span>{boss.mechanic.when}</span></li>
          <li><em>무슨 일이</em><span>{boss.mechanic.effect}</span></li>
          <li><em>대응</em><span>{boss.mechanic.counter}</span></li>
        </ul>
      </div>

      <p className="boss-briefing-note">격파하지 못해도 깎아낸 만큼 도전 보상을 받아요. 오늘 최고 진행도를 넘을 때마다 추가로 지급됩니다.</p>

      <button className="btn btn-primary boss-briefing-start" onClick={onStart}>
        <img src="/images/ui/hunt-swords.webp" alt="" /><span>도전 시작</span>
      </button>
    </section>
  </div>
}
