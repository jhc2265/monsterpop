import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MONSTERS } from '../lib/monsters'
import Icon from '../components/Icon'
import MonsterImage from '../components/MonsterImage'
import BottomNav from '../components/BottomNav'

export default function Collection() {
  const navigate = useNavigate()
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
    <header className="topbar">
      <button className="icon-btn" onClick={() => navigate('/home')} aria-label="뒤로"><Icon name="back" /></button>
      <div className="title-stack"><span className="overline">MONSTER ARCHIVE</span><h1>몬스터 도감</h1></div>
      <span className="topbar-spacer" />
    </header>
    <p className="collection-intro">사냥터에서 발견한 몬스터와 특징을 확인하세요.</p>
    <section className="collection-tools" aria-label="몬스터 필터와 정렬">
      <div className="filter-chips">{['전체', '일반', '희귀', '영웅', '보스'].map((grade) => <button key={grade} className={filter === grade ? 'active' : ''} onClick={() => setFilter(grade)}>{grade}</button>)}</div>
      <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="몬스터 정렬">
        <option value="default">기본 순서</option>
        <option value="score">점수 높은 순</option>
        <option value="rare">희귀한 순</option>
      </select>
    </section>
    <section className="collection-grid">
      {monsters.map((monster) => <button className="collection-card" key={monster.id} style={{ '--monster-color': monster.color }} onClick={() => setSelected(monster)}>
        <span className="collection-grade">{monster.grade}</span>
        <MonsterImage monster={monster} />
        <div><h2>{monster.name}</h2><p>처치 점수 <strong>{monster.score}</strong></p><small>출현 확률 {Math.round((monster.weight / totalWeight) * 100)}%</small></div>
      </button>)}
    </section>
    {selected && <div className="modal-overlay monster-detail-overlay" onClick={() => setSelected(null)}><section className="modal monster-detail" onClick={(event) => event.stopPropagation()} style={{ '--monster-color': selected.color }}>
      <div className="modal-handle" />
      <button className="monster-detail-close" onClick={() => setSelected(null)} aria-label="닫기">×</button>
      <span className="collection-grade">{selected.grade}</span>
      <MonsterImage monster={selected} />
      <h2>{selected.name}</h2>
      <p>{selected.description}</p>
      <div className="monster-facts"><div><small>처치 점수</small><strong>{selected.score}점</strong></div><div><small>이동 속도</small><strong>{selected.speed}</strong></div><div><small>출현 확률</small><strong>{Math.round((selected.weight / totalWeight) * 100)}%</strong></div></div>
      <button className="btn btn-primary" onClick={() => navigate('/game')}>이 몬스터 사냥하러 가기</button>
    </section></div>}
    <BottomNav />
  </main>
}
