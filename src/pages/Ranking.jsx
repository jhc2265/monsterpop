import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'

export default function Ranking() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('all') // 'all' | 'today'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function load() {
    setLoading(true)

    let query = supabase
      .from('scores')
      .select('user_id, score, max_combo, created_at, profiles(nickname, avatar_url)')
      .order('score', { ascending: false })

    if (tab === 'today') {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      query = query.gte('created_at', start.toISOString())
    }

    const { data, error } = await query.limit(300)
    if (error) {
      setRows([])
      setLoading(false)
      return
    }

    // 사용자별 최고 기록만 남기기
    const seen = new Set()
    const best = []
    for (const r of data || []) {
      if (seen.has(r.user_id)) continue
      seen.add(r.user_id)
      best.push(r)
    }
    setRows(best.slice(0, 50))
    setLoading(false)
  }

  const myIndex = rows.findIndex((r) => r.user_id === user.id)

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn" onClick={() => { sound.button(); navigate('/') }}>←</button>
        <h2>🏆 랭킹</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className="tabs">
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          전체 랭킹
        </button>
        <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>
          오늘 랭킹
        </button>
      </div>

      {loading ? (
        <p className="empty">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="empty">아직 기록이 없어요. 첫 번째 헌터가 되어보세요!</p>
      ) : (
        <div>
          {rows.map((r, i) => (
            <RankRow key={r.user_id} row={r} num={i + 1} me={r.user_id === user.id} />
          ))}
        </div>
      )}

      {myIndex === -1 && !loading && (
        <p className="muted mt" style={{ textAlign: 'center', fontSize: 13 }}>
          아직 이 랭킹에 기록이 없어요. 게임을 플레이해 순위에 등록하세요!
        </p>
      )}

      <div className="spacer" />
      <button className="btn btn-primary mt" onClick={() => { sound.button(); navigate('/game') }}>
        ⚔️ 게임하러 가기
      </button>
    </div>
  )
}

function RankRow({ row, num, me }) {
  const nickname = row.profiles?.nickname || '익명 헌터'
  const rankClass = num === 1 ? 'top1' : num === 2 ? 'top2' : num === 3 ? 'top3' : ''
  const medal = num === 1 ? '👑' : num
  return (
    <div className={`rank-item ${me ? 'me' : ''}`}>
      <div className={`rank-num ${rankClass}`}>{medal}</div>
      <div className="rank-avatar">{nickname[0]?.toUpperCase() || '?'}</div>
      <div className="rank-name">
        {nickname} {me && <span className="muted" style={{ fontSize: 12 }}>(나)</span>}
      </div>
      <div className="rank-score">{row.score.toLocaleString()}</div>
    </div>
  )
}
