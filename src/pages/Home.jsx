import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'

export default function Home() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [best, setBest] = useState(0)
  const [rank, setRank] = useState(null)
  const [muted, setMuted] = useState(sound.isMuted())

  useEffect(() => {
    if (!user) return
    loadStats()
  }, [user])

  async function loadStats() {
    // 내 최고 점수
    const { data: mine } = await supabase
      .from('scores')
      .select('score')
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .limit(1)
    const myBest = mine?.[0]?.score ?? 0
    setBest(myBest)

    // 내 순위: 사용자별 최고점 기준으로 나보다 높은 사람 수 + 1
    if (myBest > 0) {
      const { data: all } = await supabase
        .from('scores')
        .select('user_id, score')
        .order('score', { ascending: false })
      const bestByUser = {}
      for (const row of all || []) {
        if (bestByUser[row.user_id] === undefined) bestByUser[row.user_id] = row.score
      }
      const sorted = Object.values(bestByUser).sort((a, b) => b - a)
      setRank(sorted.indexOf(myBest) + 1)
    }
  }

  const go = (path) => {
    sound.unlock()
    sound.button()
    navigate(path)
  }

  const toggleMute = () => {
    const next = !muted
    sound.setMuted(next)
    setMuted(next)
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>🎯 몬스터 헌트</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" onClick={toggleMute} title="소리">
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="icon-btn" onClick={() => { sound.button(); signOut() }} title="로그아웃">
            ⎋
          </button>
        </div>
      </div>

      <div className="hero-card">
        <div className="big">{profile?.nickname || '헌터'} 님, 환영합니다</div>
        <div className="score">{best.toLocaleString()}</div>
        <div className="big">내 최고 점수</div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="num">{rank ? `${rank}위` : '-'}</div>
          <div className="lbl">현재 순위</div>
        </div>
        <div className="stat">
          <div className="num">30초</div>
          <div className="lbl">한 판 시간</div>
        </div>
      </div>

      <div className="menu-grid">
        <button className="btn btn-primary" onClick={() => go('/game')}>
          ⚔️ 게임 시작
        </button>
        <button className="btn btn-secondary" onClick={() => go('/ranking')}>
          🏆 랭킹 보기
        </button>
        <button className="btn btn-secondary" onClick={() => go('/community')}>
          💬 커뮤니티
        </button>
      </div>

      <div className="spacer" />
      <p className="muted" style={{ textAlign: 'center', fontSize: 12 }}>
        제한 시간 안에 몬스터를 사냥해 최고 점수에 도전하세요!
      </p>
    </div>
  )
}
