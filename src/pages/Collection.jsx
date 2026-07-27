import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MONSTERS, MONSTER_GRADES, getGradeKey } from '../lib/monsters'
import Icon from '../components/Icon'
import MonsterImage from '../components/MonsterImage'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'
import { getLevel, getMonsterUnlockLevel, resolveProgress } from '../lib/progression'

export default function Collection() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const playerProgress = resolveProgress(profile, user.id)
  const playerLevel = getLevel(playerProgress.xp)
  const [filter, setFilter] = useState('전체')
  const [sort, setSort] = useState('default')
  const [selected, setSelected] = useState(null)
  const totalWeight = MONSTERS.reduce((sum, monster) => sum + monster.weight, 0)
  const monsters = useMemo(() => {
    const filtered = filter === '전체' ? MONSTERS : MONSTERS.filter((monster) => monster.grade === filter)
    if (sort === 'score') return [...filtered].sort((a, b) => b.score - a.score)
    if (sort === 'rare') return [...filtered].sort((a, b) => a.weight - b.weight)
    return filtered
  }, [filter, sort])

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
        const requiredLevel = getMonsterUnlockLevel(monster.id)
        const unlocked = playerLevel >= requiredLevel
        const discovered = playerProgress.discovered.includes(monster.id)
        return <button className={`collection-card ${!unlocked ? 'locked' : !discovered ? 'undiscovered' : ''}`} key={monster.id} data-grade={getGradeKey(monster.grade)} style={{ '--monster-color': monster.color }} onClick={() => discovered && setSelected(monster)} disabled={!discovered}>
        <span className="collection-grade" data-grade={getGradeKey(monster.grade)}>{monster.grade}</span>
        <MonsterImage monster={monster} />
        {!unlocked && <span className="collection-lock"><Icon name="lock" size={18} /></span>}
        <div><h2>{unlocked ? monster.name : '???'}</h2>{!unlocked ? <p><strong>Lv.{requiredLevel}</strong>에서 출현 가능</p> : !discovered ? <><p>흔적이 발견되었습니다</p><small>사냥터에서 직접 만나보세요</small></> : <><p>처치 점수 <strong>{monster.score}</strong></p><small>출현 확률 {Math.round((monster.weight / totalWeight) * 100)}%</small></>}</div>
      </button>
      })}
    </section>
    {selected && <div className="modal-overlay monster-detail-overlay" onClick={() => setSelected(null)}><section className="modal monster-detail" onClick={(event) => event.stopPropagation()} style={{ '--monster-color': selected.color }}>
      <div className="modal-handle" />
      <button className="monster-detail-close" onClick={() => setSelected(null)} aria-label="닫기">×</button>
      <span className="collection-grade" data-grade={getGradeKey(selected.grade)}>{selected.grade}</span>
      <MonsterImage monster={selected} />
      <h2>{selected.name}</h2>
      <p>{selected.description}</p>
      <div className="monster-facts"><div><small>처치 점수</small><strong>{selected.score}점</strong></div><div><small>이동 속도</small><strong>{selected.speed}</strong></div><div><small>출현 확률</small><strong>{Math.round((selected.weight / totalWeight) * 100)}%</strong></div></div>
      <button className="btn btn-primary" onClick={() => navigate('/game')}>이 몬스터 사냥하러 가기</button>
    </section></div>}
    <BottomNav />
  </main>
}
