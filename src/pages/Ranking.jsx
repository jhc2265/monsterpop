import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

export default function Ranking() {
  const { user } = useAuth(); const navigate = useNavigate()
  const [tab, setTab] = useState('all'); const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true)
  useEffect(() => { load() }, [tab])
  async function load() {
    setLoading(true)
    let query = supabase.from('scores').select('user_id, score, max_combo, created_at, profiles(nickname, avatar_url)').order('score', { ascending: false })
    if (tab === 'today') { const start = new Date(); start.setHours(0, 0, 0, 0); query = query.gte('created_at', start.toISOString()) }
    const { data, error } = await query.limit(300)
    if (error) { setRows([]); setLoading(false); return }
    const seen = new Set(); const best = []
    for (const row of data || []) { if (!seen.has(row.user_id)) { seen.add(row.user_id); best.push(row) } }
    setRows(best.slice(0, 50)); setLoading(false)
  }
  const podium = rows.slice(0, 3); const rest = rows.slice(3)
  return <main className="page ranking-page">
    <header className="topbar"><button className="icon-btn" onClick={() => navigate('/')} aria-label="뒤로"><Icon name="back" /></button><div className="title-stack"><span className="overline">HALL OF FAME</span><h1>헌터 랭킹</h1></div><span className="topbar-spacer" /></header>
    <div className="tabs"><button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>전체 랭킹</button><button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>오늘의 랭킹</button></div>
    {loading ? <div className="empty-state"><span className="loader" />랭킹을 집계하는 중...</div> : rows.length === 0 ? <Empty /> : <>
      <section className="podium">{[podium[1], podium[0], podium[2]].map((row, index) => row && <Podium key={row.user_id} row={row} rank={[2,1,3][index]} me={row.user_id === user.id} />)}</section>
      {rest.length > 0 && <section className="rank-list"><div className="list-label">전체 순위</div>{rest.map((row, index) => <RankRow key={row.user_id} row={row} rank={index + 4} me={row.user_id === user.id} />)}</section>}
    </>}
    <button className="btn btn-primary sticky-action" onClick={() => { sound.button(); navigate('/game') }}><Icon name="play" size={18} /> 새로운 기록에 도전</button>
  </main>
}

function Avatar({ row }) { const name = row.profiles?.nickname || '헌터'; return <div className="avatar">{row.profiles?.avatar_url ? <img src={row.profiles.avatar_url} alt="" /> : name[0]?.toUpperCase()}</div> }
function Podium({ row, rank, me }) { return <article className={`podium-item rank-${rank} ${me ? 'me' : ''}`}><div className="crown">{rank === 1 ? '♛' : rank}</div><Avatar row={row} /><strong>{row.profiles?.nickname || '익명 헌터'}</strong><span>{row.score.toLocaleString()}</span><div className="podium-base">{rank}</div></article> }
function RankRow({ row, rank, me }) { return <article className={`rank-item ${me ? 'me' : ''}`}><b className="rank-num">{rank}</b><Avatar row={row} /><div className="rank-name"><strong>{row.profiles?.nickname || '익명 헌터'}</strong><small>최고 콤보 {row.max_combo || 0}</small></div><b className="rank-score">{row.score.toLocaleString()}</b></article> }
function Empty() { return <div className="empty-state"><span className="empty-icon"><Icon name="trophy" size={28} /></span><h3>아직 기록이 없어요</h3><p>첫 번째 헌터가 되어 순위를 차지해 보세요.</p></div> }
