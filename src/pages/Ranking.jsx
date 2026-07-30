import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import BottomNav from '../components/BottomNav'
import SharedAvatar from '../components/Avatar'

export default function Ranking() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('all'); const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [prevScore, setPrevScore] = useState(null)
  useEffect(() => { load() }, [tab, profile?.avatar_url, profile?.nickname])
  useEffect(() => {
    if (!user) return
    supabase.from('scores').select('score').eq('user_id', user.id).order('score', { ascending: false }).limit(2)
      .then(({ data }) => setPrevScore(data?.[1]?.score ?? null))
  }, [user])
  async function load() {
    setLoading(true)
    let query = supabase.from('scores').select('user_id, score, max_combo, created_at, profiles(nickname, avatar_url)').order('score', { ascending: false })
    if (tab === 'today') { const start = new Date(); start.setHours(0, 0, 0, 0); query = query.gte('created_at', start.toISOString()) }
    if (tab === 'week') {
      const start = new Date()
      const day = start.getDay() || 7
      start.setDate(start.getDate() - day + 1)
      start.setHours(0, 0, 0, 0)
      query = query.gte('created_at', start.toISOString())
    }
    const { data, error } = await query.limit(300)
    if (error) { setRows([]); setLoading(false); return }
    const seen = new Set(); const best = []
    for (const original of data || []) {
      const row = original.user_id === user.id
        ? { ...original, profiles: { ...original.profiles, nickname: profile?.nickname || original.profiles?.nickname, avatar_url: profile?.avatar_url || original.profiles?.avatar_url } }
        : original
      if (!seen.has(row.user_id)) { seen.add(row.user_id); best.push(row) }
    }
    setRows(best.slice(0, 50)); setLoading(false)
  }
  const podium = rows.slice(0, 3)
  const myRank = rows.findIndex((row) => row.user_id === user.id)
  const myBest = myRank >= 0 ? rows[myRank].score : 0
  const myDelta = (myBest > 0 && prevScore > 0) ? Math.round(((myBest - prevScore) / prevScore) * 100) : null
  const weekEnd = getWeekEnd()
  return <main className="page ranking-page">
    <header className="topbar ranking-topbar topbar-plain"><div className="title-stack"><span className="overline">HALL OF FAME</span><h1>헌터 랭킹</h1></div></header>
    <p className="ranking-intro">실시간 랭킹으로 최고의 헌터에 도전하세요.</p>
    <div className="tabs ranking-tabs"><button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>전체</button><button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>오늘</button><button className={tab === 'week' ? 'active' : ''} onClick={() => setTab('week')}>주간</button></div>
    {loading ? <div className="empty-state"><span className="loader" />랭킹을 집계하는 중...</div> : rows.length === 0 ? <Empty /> : <>
      <section className="ranking-hero"><div className="ranking-hero-title"><span><Icon name="spark" size={13} /> TOP HUNTERS</span><small>{tab === 'week' ? `이번 주 마감 ${weekEnd}` : `${rows.length}명의 헌터가 경쟁 중`}</small></div><div className="podium">{[podium[1], podium[0], podium[2]].map((row, index) => row ? <Podium key={row.user_id} row={row} rank={[2,1,3][index]} me={row.user_id === user.id} /> : <PodiumPlaceholder key={index} rank={[2,1,3][index]} />)}</div></section>
      {myRank >= 0 && <section className="my-rank-card"><div className="my-rank-head"><span>MY RANK</span><strong>{myRank + 1}위</strong></div><RankRow row={rows[myRank]} rank={myRank + 1} me /><div className="my-rank-stats"><div><span className="stat-icon purple art-tile"><img src="/images/ui/trophy.webp" alt="" /></span><div className="stat-text"><small>최고 점수</small><strong>{myBest.toLocaleString()}</strong><em>{myDelta === null ? '첫 기록에 도전' : <>이전 대비 <b className={myDelta >= 0 ? '' : 'down'}>{myDelta >= 0 ? '▲' : '▼'} {Math.abs(myDelta)}%</b></>}</em></div></div><i /><div><span className="stat-icon pink art-tile"><img src="/images/ui/crown.webp" alt="" /></span><div className="stat-text"><small>전체 순위</small><strong>{myRank + 1}위</strong><em>전체 {rows.length}명</em></div></div></div></section>}
      <section className="rank-list"><div className="list-label"><span>전체 순위</span><small>총 {rows.length}명</small></div>{rows.map((row, index) => <RankRow key={row.user_id} row={row} rank={index + 1} me={row.user_id === user.id} />)}</section>
    </>}
    <BottomNav />
  </main>
}

function Avatar({ row }) { return <SharedAvatar avatarUrl={row?.profiles?.avatar_url} /> }
function Podium({ row, rank, me }) { return <article className={`podium-item rank-${rank} ${me ? 'me' : ''}`}><div className="podium-medal"><Avatar row={row} /><img className="podium-frame" src={`/images/ranking/frame-${rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze'}.png`} alt="" /><b>{rank}</b></div><strong>{row.profiles?.nickname || '익명 헌터'}</strong><span>{row.score.toLocaleString()}점</span><small>최고 콤보 {row.max_combo || 0}</small></article> }
function PodiumPlaceholder({ rank }) { return <article className={`podium-item rank-${rank} placeholder`}><div className="podium-medal"><Avatar /><img className="podium-frame" src={`/images/ranking/frame-${rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze'}.png`} alt="" /><b>{rank}</b></div><strong>도전자를 기다려요</strong><span>-</span></article> }
function RankRow({ row, rank, me }) { return <article className={`rank-item ${me ? 'me' : ''}`}><b className="rank-num">{rank}</b><Avatar row={row} /><div className="rank-name"><strong>{row.profiles?.nickname || '익명 헌터'}{me && <em>나</em>}</strong><small>최고 콤보 {row.max_combo || 0}</small></div><b className="rank-score">{row.score.toLocaleString()}점</b></article> }
function Empty() { return <div className="empty-state"><span className="empty-icon"><Icon name="trophy" size={28} /></span><h3>아직 기록이 없어요</h3><p>첫 번째 헌터가 되어 순위를 차지해 보세요.</p></div> }
function getWeekEnd() {
  const now = new Date()
  const day = now.getDay() || 7
  const end = new Date(now)
  end.setDate(now.getDate() + (7 - day))
  end.setHours(23, 59, 59, 999)
  const diff = Math.max(0, end - now)
  return `${Math.floor(diff / 86400000)}일 ${Math.floor((diff % 86400000) / 3600000)}시간 후`
}
