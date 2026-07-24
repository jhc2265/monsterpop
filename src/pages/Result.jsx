import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

export default function Result() {
  const { user } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const { score = 0, maxCombo = 0 } = location.state || {}
  const [saving, setSaving] = useState(true); const [isBest, setIsBest] = useState(false); const [rank, setRank] = useState(null); const [saveError, setSaveError] = useState(''); const savedRef = useRef(false)
  useEffect(() => { if (!location.state) { navigate('/home', { replace: true }); return } if (!savedRef.current) { savedRef.current = true; saveAndRank() } }, [])
  async function saveAndRank() {
    try {
      const { data: prev } = await supabase.from('scores').select('score').eq('user_id', user.id).order('score', { ascending: false }).limit(1); const prevBest = prev?.[0]?.score ?? 0
      const { error } = await supabase.from('scores').insert({ user_id: user.id, score, max_combo: maxCombo }); if (error) throw error
      if (score > prevBest) setIsBest(true)
      const { data: all } = await supabase.from('scores').select('user_id, score').order('score', { ascending: false }); const bestByUser = {}
      for (const row of all || []) if (bestByUser[row.user_id] === undefined || row.score > bestByUser[row.user_id]) bestByUser[row.user_id] = row.score
      setRank(Object.values(bestByUser).sort((a, b) => b - a).indexOf(Math.max(prevBest, score)) + 1)
    } catch (err) { setSaveError(`점수를 저장하지 못했습니다: ${err.message}`) } finally { setSaving(false) }
  }
  function go(path, options) { sound.button(); navigate(path, options) }
  return <main className="page result-page">
    <div className="result-burst" aria-hidden="true"><span /><span /><span /></div>
    <section className="result-header"><span className="eyebrow"><Icon name="spark" size={14} /> HUNT COMPLETE</span><h1>{isBest ? '새로운 최고 기록!' : '사냥 완료!'}</h1><p>훌륭한 사냥이었어요, 헌터.</p></section>
    <section className="result-card"><div className="result-monster-wrap"><img src="/images/fox.png" alt="불꽃 여우" /></div><small>FINAL SCORE</small><strong className="result-score">{score.toLocaleString()}</strong>{isBest && <span className="best-badge">NEW BEST</span>}<div className="result-stats"><div><span>최고 콤보</span><strong>{maxCombo}</strong></div><i /><div><span>전체 순위</span><strong>{saving ? '...' : rank ? `${rank}위` : '-'}</strong></div></div></section>
    {saving && <p className="status-copy"><span className="loader small" /> 기록을 저장하는 중...</p>}{saveError && <div className="notice notice-error">{saveError}</div>}
    <div className="action-stack"><button className="btn btn-primary" onClick={() => go('/game', { replace: true })}><Icon name="refresh" size={19} /> 다시 도전하기</button><button className="btn btn-secondary" onClick={() => go('/ranking')}><Icon name="trophy" size={19} /> 랭킹 확인하기</button><button className="text-button" onClick={() => go('/')}><Icon name="home" size={17} /> 홈으로 돌아가기</button></div>
  </main>
}
