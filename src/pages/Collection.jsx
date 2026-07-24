import { useNavigate } from 'react-router-dom'
import { MONSTERS } from '../lib/monsters'
import Icon from '../components/Icon'
import MonsterImage from '../components/MonsterImage'
import BottomNav from '../components/BottomNav'

export default function Collection() {
  const navigate = useNavigate()

  return <main className="page collection-page">
    <header className="topbar">
      <button className="icon-btn" onClick={() => navigate('/home')} aria-label="뒤로"><Icon name="back" /></button>
      <div className="title-stack"><span className="overline">MONSTER ARCHIVE</span><h1>몬스터 도감</h1></div>
      <span className="topbar-spacer" />
    </header>
    <p className="collection-intro">사냥터에서 만날 수 있는 몬스터를 확인하세요.</p>
    <section className="collection-grid">
      {MONSTERS.map((monster) => <article className="collection-card" key={monster.id} style={{ '--monster-color': monster.color }}>
        <span className="collection-grade">{monster.grade}</span>
        <MonsterImage monster={monster} />
        <div><h2>{monster.name}</h2><p>처치 점수 <strong>{monster.score}</strong></p></div>
      </article>)}
    </section>
    <BottomNav />
  </main>
}
