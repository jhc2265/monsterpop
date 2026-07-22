import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'

export default function Result() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { score = 0, maxCombo = 0 } = location.state || {}

  const [saving, setSaving] = useState(true)
  const [isBest, setIsBest] = useState(false)
  const [rank, setRank] = useState(null)
  const [saveError, setSaveError] = useState('')
  const savedRef = useRef(false)

  useEffect(() => {
    if (!location.state) {
      navigate('/', { replace: true })
      return
    }
    if (savedRef.current) return
    savedRef.current = true
    saveAndRank()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveAndRank() {
    try {
      // 이전 최고점 조회 (신기록 여부 판단용)
      const { data: prev } = await supabase
        .from('scores')
        .select('score')
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(1)
      const prevBest = prev?.[0]?.score ?? 0

      // 점수 서버 저장
      const { error } = await supabase.from('scores').insert({
        user_id: user.id,
        score,
        max_combo: maxCombo,
      })
      if (error) throw error

      if (score > prevBest) setIsBest(true)

      // 전체 순위 계산 (사용자별 최고점 기준)
      const { data: all } = await supabase
        .from('scores')
        .select('user_id, score')
        .order('score', { ascending: false })
      const bestByUser = {}
      for (const row of all || []) {
        const cur = bestByUser[row.user_id]
        if (cur === undefined || row.score > cur) bestByUser[row.user_id] = row.score
      }
      const myBest = Math.max(prevBest, score)
      const sorted = Object.values(bestByUser).sort((a, b) => b - a)
      setRank(sorted.indexOf(myBest) + 1)
    } catch (err) {
      setSaveError('점수 저장에 실패했습니다: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <h2>게임 결과</h2>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="result-score">
          <div className="muted">최종 점수</div>
          <div className="num">{score.toLocaleString()}</div>
          {isBest && <div className="best-badge">🎉 신기록 달성!</div>}
        </div>

        <div className="stat-row" style={{ marginBottom: 0 }}>
          <div className="stat">
            <div className="num">{maxCombo}</div>
            <div className="lbl">최대 콤보</div>
          </div>
          <div className="stat">
            <div className="num">
              {saving ? '…' : rank ? `${rank}위` : '-'}
            </div>
            <div className="lbl">전체 순위</div>
          </div>
        </div>
      </div>

      {saving && <p className="muted mt" style={{ textAlign: 'center' }}>점수 저장 중…</p>}
      {saveError && <p className="error-text mt">{saveError}</p>}

      <div className="menu-grid mt">
        <button className="btn btn-primary" onClick={() => { sound.button(); navigate('/game', { replace: true }) }}>
          🔁 다시 하기
        </button>
        <button className="btn btn-secondary" onClick={() => { sound.button(); navigate('/ranking') }}>
          🏆 랭킹 보기
        </button>
        <button className="btn btn-ghost" onClick={() => { sound.button(); navigate('/') }}>
          홈으로
        </button>
      </div>
    </div>
  )
}
