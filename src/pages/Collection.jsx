import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MONSTERS, MONSTER_GRADES, getGradeKey } from '../lib/monsters'
import Icon from '../components/Icon'
import MonsterImage from '../components/MonsterImage'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'
import { getLevel, getMonsterUnlockLevel, resolveProgress } from '../lib/progression'
import { getBossArchiveEntries, isMonsterDiscovered } from '../lib/bosses'

export default function Collection() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const playerProgress = resolveProgress(profile, user.id)
  const playerLevel = getLevel(playerProgress.xp)
  const [filter, setFilter] = useState('전체')
  const [sort, setSort] = useState('default')
  const [selected, setSelected] = useState(null)
  const selectedDiscovered = !!selected && isMonsterDiscovered(playerProgress.discovered, selected.id)
  const totalWeight = MONSTERS.reduce((sum, monster) => sum + monster.weight, 0)
  // MONSTERS 의 'boss' 는 도감 한 칸을 채우려고 둔 자리(weight 0 이라 사냥터에 안 나온다)였다.
  // 실제 보스 넷으로 갈아끼워, 보스가 늘어도 도감이 저절로 따라오게 한다.
  const archive = useMemo(() => [
    ...MONSTERS.filter((monster) => monster.id !== 'boss'),
    ...getBossArchiveEntries(),
  ], [])
  const monsters = useMemo(() => {
    const filtered = filter === '전체' ? archive : archive.filter((monster) => monster.grade === filter)
    // 보스에는 score/weight 가 없다. 정렬 기준만 대체하고 순서 의미는 그대로 둔다.
    if (sort === 'score') return [...filtered].sort((a, b) => (b.score ?? b.firstClearXp ?? 0) - (a.score ?? a.firstClearXp ?? 0))
    if (sort === 'rare') return [...filtered].sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0))
    return filtered
  }, [archive, filter, sort])

  return <main className="page collection-page">
    <header className="topbar topbar-plain">
      <div className="title-stack"><span className="overline">MONSTER ARCHIVE</span><h1>몬스터 도감</h1></div>
    </header>
    <p className="collection-intro">사냥터에서 발견한 몬스터와 특징을 확인하세요.</p>
    <section className="collection-tools" aria-label="몬스터 필터와 정렬">
      {/* '전체'는 등급이 아니라 필터 해제라서 data-grade 를 붙이지 않고 기본 선택색을 그대로 쓴다 */}
      <div className="filter-chips">{['전체', ...MONSTER_GRADES.map((grade) => grade.label)].map((grade) => <button key={grade} data-grade={grade === '전체' ? undefined : getGradeKey(grade)} className={filter === grade ? 'active' : ''} onClick={() => setFilter(grade)}>{grade}</button>)}</div>
      <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="몬스터 정렬">
        <option value="default">기본 순서</option>
        <option value="score">점수 높은 순</option>
        <option value="rare">희귀한 순</option>
      </select>
    </section>
    <section className="collection-grid">
      {monsters.map((monster) => {
        // 보스는 MONSTER_LEVEL 에 없어 자기 unlockLevel 을 쓴다(없으면 Lv.1 로 떨어진다).
        const requiredLevel = monster.isBoss ? monster.unlockLevel : getMonsterUnlockLevel(monster.id)
        const unlocked = playerLevel >= requiredLevel
        const discovered = isMonsterDiscovered(playerProgress.discovered, monster.id)
        // 해금되면 상세를 연다. 처치 방법은 보상이 아니라 도움말이라,
        // 처음 만나 당황할 몬스터일수록 먼저 볼 수 있어야 한다.
        return <button className={`collection-card ${!unlocked ? 'locked' : !discovered ? 'undiscovered' : ''}`} key={monster.id} data-grade={getGradeKey(monster.grade)} style={{ '--monster-color': monster.color }} onClick={() => unlocked && setSelected(monster)} disabled={!unlocked}>
        <span className="collection-grade" data-grade={getGradeKey(monster.grade)}>{monster.grade}</span>
        <MonsterImage monster={monster} />
        {!unlocked && <span className="collection-lock"><Icon name="lock" size={18} /></span>}
        <div><h2>{unlocked ? monster.name : '???'}</h2>{!unlocked ? <p><strong>Lv.{requiredLevel}</strong>에서 출현 가능</p> : !discovered ? <><p>{monster.isBoss ? '아직 쓰러뜨리지 못했습니다' : '흔적이 발견되었습니다'}</p><small>{monster.isBoss ? '보스전에서 도전해보세요' : '사냥터에서 직접 만나보세요'}</small></> : monster.isBoss ? <><p>첫 클리어 <strong>{monster.firstClearXp}</strong> XP</p><small>{monster.cycleDays}일마다 출현</small></> : <><p>처치 점수 <strong>{monster.score}</strong></p><small>출현 확률 {Math.round((monster.weight / totalWeight) * 100)}%</small></>}</div>
      </button>
      })}
    </section>
    {selected && <div className="modal-overlay monster-detail-overlay" onClick={() => setSelected(null)}><section className={`modal monster-detail ${selectedDiscovered ? '' : 'undiscovered'}`} onClick={(event) => event.stopPropagation()} data-grade={getGradeKey(selected.grade)} style={{ '--monster-color': selected.color }}>
      <div className="modal-handle" />
      <button className="monster-detail-close" onClick={() => setSelected(null)} aria-label="닫기">×</button>
      {/* 배지는 이미지 아래 — 이미지 위에 두면 인라인 한 줄로 묶여 몬스터가 옆으로 밀린다 */}
      <MonsterImage monster={selected} />
      <span className="collection-grade" data-grade={getGradeKey(selected.grade)}>{selected.grade}</span>
      <h2>{selected.name}</h2>
      {/* 설화와 원본 그림은 수집의 보상이라 직접 만나야 풀린다 */}
      <p>{selectedDiscovered ? selected.description : selected.isBoss ? '아직 쓰러뜨리지 못한 보스예요. 보스전에서 이기면 모습과 이야기가 드러납니다.' : '아직 직접 만나지 못한 몬스터예요. 사냥터에서 마주치면 모습과 이야기가 드러납니다.'}</p>
      <div className="monster-howto"><span className="howto-cue">{selected.cue}</span><span className="howto-body"><small>처치 방법</small><strong>{selected.hint}</strong></span></div>
      {/* 보스는 처치 점수·출현 확률·이동 속도가 없다. 보스전에서 의미 있는 값으로 바꾼다. */}
      {selected.isBoss
        ? <div className="monster-facts"><div><small>첫 클리어</small><strong>{selected.firstClearXp} XP</strong></div><div><small>제한 시간</small><strong>{selected.timeLimit}초</strong></div><div><small>출현 주기</small><strong>{selected.cycleDays}일마다</strong></div></div>
        : <div className="monster-facts"><div><small>처치 점수</small><strong>{selected.score}점</strong></div><div><small>이동 속도</small><strong>{selected.speed}</strong></div><div><small>출현 확률</small><strong>{Math.round((selected.weight / totalWeight) * 100)}%</strong></div></div>}
      <button className="btn btn-primary" onClick={() => navigate(selected.isBoss ? `/boss/${selected.id}` : '/game')}>{selected.isBoss ? '이 보스 도전하러 가기' : '이 몬스터 사냥하러 가기'}</button>
    </section></div>}
    <BottomNav />
  </main>
}
