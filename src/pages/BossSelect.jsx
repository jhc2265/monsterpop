import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DAILY_BOSSES, getBossRecord, getDailyBoss, hasSeenBossTutorial, markBossTutorialSeen } from '../lib/bosses'
import { useAuth } from '../context/AuthContext'
import { getLevel, resolveProgress } from '../lib/progression'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

// 네 보스가 똑같이 쓰는 신호다. 보스마다 반복하면 읽지 않게 되므로
// 보스전에 처음 들어올 때 한 번만 보여주고, 이후엔 상단 안내 버튼으로만 연다.
// 글로 적어두면 안 읽는다. 손가락이 실제로 그 동작을 하는 걸 보여준다.
const CUE_GUIDE = [
  { id: 'tap', label: 'TAP', copy: '짧게 톡' },
  { id: 'hold', label: 'HOLD', copy: '길게 꾹' },
  { id: 'swipe', label: 'SWIPE', copy: '좌우로 슥' },
  { id: 'wait', label: 'WAIT', copy: '손 떼고 대기' },
]

const BATTLE_RULES = [
  { key: '시간', copy: '신호가 뜨면 제한 시간 안에 반응하세요' },
  { key: '실수', copy: '놓치거나 잘못 입력하면 남은 시간이 깎여요' },
  { key: '페이즈', copy: '보스 체력이 줄면 신호가 빨라지고 종류가 늘어요' },
]

// 보스마다 저만 쓰는 신호가 하나씩 있다. 이게 그 보스를 다른 보스와 구분한다.
const SIGNATURE_GUIDE = {
  double: { label: 'DOUBLE', copy: '두 번 연속 톡톡' },
  reverse: { label: 'REVERSE', copy: '화살표와 반대로 밀기' },
  charge: { label: 'CHARGE', copy: '초록 구간에서 떼기 · 넘기면 폭발' },
  vertical: { label: 'VERTICAL', copy: '좌우가 아니라 위아래로' },
}

export default function BossSelect() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const level = getLevel(resolveProgress(profile, user.id).xp)
  const todayBossId = getDailyBoss().id
  const [briefing, setBriefing] = useState(null)
  const [tutorial, setTutorial] = useState(() => !hasSeenBossTutorial(user.id))

  function closeTutorial() {
    sound.button()
    markBossTutorialSeen(user.id)
    setTutorial(false)
  }

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
      <button className="icon-btn" onClick={() => { sound.button(); setTutorial(true) }} aria-label="조작 안내 다시 보기"><Icon name="info" /></button>
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

    {/* 튜토리얼이 브리핑보다 뒤에 있어야 둘이 겹칠 때 위로 올라온다. */}
    {tutorial && <BossTutorial onClose={closeTutorial} />}
  </main>
}

// 공통 조작법. 보스별 브리핑에서 이걸 반복하지 않는다 — 네 번 같은 걸 보면 아무도 안 읽는다.
function BossTutorial({ onClose }) {
  return <div className="modal-overlay boss-tutorial-overlay">
    <section className="boss-briefing boss-tutorial">
      <header className="boss-tutorial-head">
        <span className="overline">BOSS BASICS</span>
        <strong>보스전 조작법</strong>
        <small>네 보스 모두에게 공통으로 나오는 신호예요</small>
      </header>

      <ul className="cue-demos">
        {CUE_GUIDE.map((cue) => <li key={cue.id} className={`cue-demo cue-demo-${cue.id}`}>
          <span className="cue-demo-stage" aria-hidden="true"><i className="cue-demo-hand" /></span>
          <b>{cue.label}</b>
          <span>{cue.copy}</span>
        </li>)}
      </ul>

      <ul className="boss-tutorial-rules">
        {BATTLE_RULES.map((rule) => <li key={rule.key}><b>{rule.key}</b><span>{rule.copy}</span></li>)}
      </ul>

      <p className="boss-briefing-note">보스마다 저만 쓰는 신호와 기믹이 하나씩 더 있어요. 도전 전 브리핑에서 확인할 수 있습니다.</p>

      <button className="btn btn-primary boss-briefing-start" onClick={onClose}><span>알겠어요</span></button>
    </section>
  </div>
}

// 기믹을 글로 나열하는 대신 실제 전투 화면을 축소해 3박자로 재생한다.
// 자막(beats)과 연출은 같은 타임라인을 공유하므로 bosses.js 의 beats 순서를 바꾸면 연출도 어긋난다.
function MechanicDemo({ boss }) {
  return <div className={`mechanic-demo mechanic-demo-${boss.id}`} style={{ '--boss-color': boss.color }}>
    <div className="mechanic-demo-stage" aria-hidden="true">
      <img className="mechanic-demo-bg" src={boss.background} alt="" />
      <span className="mechanic-demo-fx" />
      <img className="mechanic-demo-boss" src={boss.image} alt="" />
      <span className="mechanic-demo-cue" />
      <i className="mechanic-demo-hand" />
      <span className="mechanic-demo-hp"><i /></span>
      <span className="mechanic-demo-meter"><em>{boss.mechanic.meter}</em><i /></span>
    </div>
    <ol className="mechanic-demo-beats">
      {boss.mechanic.beats.map((beat, index) => <li key={beat} style={{ '--beat': index }}>{beat}</li>)}
    </ol>
  </div>
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

      {/* 공통 신호(TAP/HOLD/SWIPE/WAIT)는 보스전 첫 진입 튜토리얼에서 한 번만 다룬다.
          여기엔 이 보스에서만 나오는 것만 남긴다. */}
      <div className="boss-briefing-block">
        <span className="overline">이 보스만의 신호</span>
        <ul className="cue-demos">
          <li className={`cue-demo cue-demo-signature cue-demo-${boss.signature}`}>
            <span className="cue-demo-stage" aria-hidden="true"><i className="cue-demo-hand" /></span>
            <b>{SIGNATURE_GUIDE[boss.signature].label}</b>
            <span>{SIGNATURE_GUIDE[boss.signature].copy}</span>
          </li>
        </ul>
      </div>

      <div className="boss-briefing-block">
        <span className="overline">{boss.mechanic.short} · {boss.mechanic.name}</span>
        <MechanicDemo boss={boss} />
      </div>

      <p className="boss-briefing-note">격파하지 못해도 깎아낸 만큼 도전 보상을 받아요. 오늘 최고 진행도를 넘을 때마다 추가로 지급됩니다.</p>

      <button className="btn btn-primary boss-briefing-start" onClick={onStart}>
        <img src="/images/ui/hunt-swords.webp" alt="" /><span>도전 시작</span>
      </button>
    </section>
  </div>
}
