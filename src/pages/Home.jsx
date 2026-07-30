import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import BottomNav from '../components/BottomNav'
import { getHunterTitle, getLevelProgress, getMonsterUnlockLevel, getUnlockedMonsterIds, resolveProgress } from '../lib/progression'
import { MONSTERS } from '../lib/monsters'
import { getDailyMissions } from '../lib/missions'
import { getBossById, getDailyBoss, hasClearedBossToday, koreaToday } from '../lib/bosses'
import { resolveAvatarUrl } from '../lib/avatar'

const GRADE_STARS = { 일반: '★☆☆', 희귀: '★★☆', 특수: '★★☆', 영웅: '★★★' }

// 예전에는 카드 내용이 하드코딩이라 해금 테이블과 따로 놀았다.
// Lv.1 에게 Lv.3 몬스터인 번개 토끼를, Lv.3 에게 Lv.5 인 불꽃 여우를 사냥하라고 띄웠다.
// 실제 출현 목록에서 뽑아야 다시 어긋나지 않는다. weight 0 인 보스는 사냥터에 나오지 않으니 뺀다.
function getTodaysHunt(level, today) {
  const unlocked = getUnlockedMonsterIds(level)
  const huntable = MONSTERS.filter((monster) => monster.weight > 0 && unlocked.includes(monster.id))
  const pool = huntable.length ? huntable : [MONSTERS[0]]
  // 'TODAY’S' 라고 써 붙였으면 날마다 바뀌어야 한다. 예전에는 레벨 구간마다 고정이었다.
  const monster = pool[Number(today.replaceAll('-', '')) % pool.length]
  return {
    label: 'TODAY’S HUNT',
    name: `${monster.name} 출현!`,
    copy: monster.description,
    image: monster.image,
    grade: `${monster.grade} 몬스터`,
    score: `+${monster.score}점`,
    difficulty: GRADE_STARS[monster.grade] || '★★☆',
    path: '/game',
  }
}

export default function Home() {
  const { user, profile, syncError } = useAuth()
  const navigate = useNavigate()

  function go(path) {
    sound.unlock()
    sound.button()
    navigate(path)
  }

  const progress = getLevelProgress(resolveProgress(profile, user.id).xp)
  const missions = progress.level >= 2 ? getDailyMissions(user.id, progress.level) : []
  const previewBossId = new URLSearchParams(window.location.search).get('boss')
  const dailyBoss = getBossById(previewBossId) || getDailyBoss()
  const dailyBossRewardClaimed = hasClearedBossToday(user.id, dailyBoss.id)
  const isPopGreeting = Number(koreaToday().slice(-2)) % 2 === 0
  // 보스 카드는 최고 레벨이 아니라 보스 해금 레벨(MONSTER_LEVEL.boss)을 따른다
  const featured = progress.level >= getMonsterUnlockLevel('boss')
    ? {
        label: 'TODAY’S BOSS',
        name: `${dailyBoss.name} 출현!`,
        copy: dailyBoss.cardCopy || dailyBoss.description,
        image: dailyBoss.image,
        grade: '일일 보스',
        score: dailyBossRewardClaimed ? '보상 획득 완료' : `+${dailyBoss.firstClearXp} XP`,
        difficulty: '★'.repeat(dailyBoss.difficulty),
        path: '/boss',
        bossId: dailyBoss.id,
        bossColor: dailyBoss.color,
      }
    : getTodaysHunt(progress.level, koreaToday())

  return <main className="page home-page home-v2">
    <div className="home-daily-row">
      <p className={`home-daily-greeting ${isPopGreeting ? 'pop' : 'signal'}`}>
        <span className="home-greeting-burst" aria-hidden="true"><Icon name="spark" size={18} strokeWidth={2.1} /></span>
        <span className="home-greeting-text">{isPopGreeting ? '오늘도 팝! 터뜨릴 준비됐나요?' : '몬스터 출현 신호를 발견했어요!'}</span>
        <span className="home-greeting-burst home-greeting-burst-tail" aria-hidden="true" />
      </p>
      <button className="ghost-icon-btn" onClick={() => go('/settings')} aria-label="설정"><Icon name="settings" size={20} /></button>
    </div>
    {/* 서버에 닿지 않는 상태를 여기서 알려야 한다. 예전에는 이 화면이 localStorage 값으로
        멀쩡하게 그려져서, 다른 기기로 로그인할 때까지 저장 실패를 알 수 없었다. */}
    {syncError && <div className="notice notice-error home-sync-error">{syncError}<span>이 기기에는 기록이 남아 있어요. 연결이 돌아오면 다시 올라갑니다.</span></div>}
    <header className="home-welcome">
      <button className="home-hunter-identity" onClick={() => go('/profile')} aria-label="내 프로필 보기">
        <span className="home-hunter-avatar"><i /><img src={resolveAvatarUrl(profile?.avatar_url)} alt="" /><em aria-hidden="true">✎</em></span>
        <span className="home-hunter-copy">
          <small><b>LV.{progress.level}</b><span>{getHunterTitle(progress.level)}</span></small>
          <strong>{profile?.nickname || '헌터'} 헌터</strong>
          <span className="home-hunter-xp">
            {/* 퍼센트는 바로 아래 진행 바가 이미 보여준다. 그 자리에 분모를 적어야
                "다음 레벨까지 얼마"가 전체 중 어디쯤인지 알 수 있다. */}
            <em>
              <span>{progress.needed > 0 ? <>다음 레벨까지 <b>{(progress.needed - progress.current).toLocaleString()} XP</b></> : <b>MAX LEVEL</b>}</span>
              <i>{progress.needed > 0 ? `${progress.current.toLocaleString()} / ${progress.needed.toLocaleString()}` : progress.total.toLocaleString()}</i>
            </em>
            <span><i style={{ width: `${progress.percent}%` }} /></span>
          </span>
        </span>
        <i className="home-profile-chevron" aria-hidden="true">›</i>
      </button>
    </header>

    <section className="hunter-progress mission-card" aria-label="오늘의 미션">
      {progress.level >= 2 ? <div className="mission-list">
        <div className="mission-list-head"><small>TODAY’S MISSIONS</small><span>{missions.filter((m) => m.done).length}/{missions.length} 완료</span></div>
        {missions.map((mission) => <div key={mission.id} className={`mission-item ${mission.done ? 'done' : ''}`}>
          {/* 아이콘·색 클래스는 미션 id 가 아니라 정의(icon)와 지표(metric)를 따른다.
              id 로 짝을 맞추면 미션을 추가하거나 이름을 바꿀 때 조용히 기본 아이콘으로 떨어진다. */}
          <span className={`mission-check mission-icon-${mission.metric}`}><Icon name={mission.icon} size={23} strokeWidth={2.1} /></span>
          <div className="mission-body">
            <div className="mission-body-top"><strong>{mission.title}</strong><em>{mission.value}/{mission.goal}</em><b>{mission.done ? '완료' : `+${mission.rewardXp} XP`}</b></div>
            <div className="mission-track"><i style={{ width: `${mission.percent}%` }} /></div>
          </div>
        </div>)}
      </div> : <div className="progress-mission locked"><span><Icon name="lock" size={17} /></span><div><small>TODAY’S MISSIONS</small><strong>일일 미션 준비 중</strong><em>Lv.2부터 매일 새로운 성장 목표가 열려요</em></div><b>LV.2</b></div>}
    </section>

    <section
      className={`hero-card boss-card${featured.bossId ? ` is-daily-boss boss-card-${featured.bossId}` : ''}`}
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
          <img className="hero-monster" src={featured.image} alt="" />
        </div>
      </div>
      {/* 메타는 boss-main 밖에 둔다. 안에 두면 몬스터가 가장 넓어지는 높이와 겹쳐,
          화면이 좁아질 때마다 칩이 그림 아래로 파고든다 */}
      <div className="hunt-meta"><span>{featured.grade}</span><span>{featured.score}</span><span>난이도 {featured.difficulty}</span></div>
      <button className="boss-start" onClick={() => go(featured.path)}><img src="/images/ui/hunt-swords.webp" alt="" /><span>{featured.path === '/boss' ? '보스 도전하기' : '지금 사냥하기'}</span><b>›</b></button>
    </section>
    <BottomNav />
  </main>
}
