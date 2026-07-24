import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import { getLevel, LEVEL_UNLOCKS, resolveProgress, saveStoredProgress } from '../lib/progression'
import { MONSTERS } from '../lib/monsters'

export default function Result() {
  const { user, refreshProfile } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const { score = 0, maxCombo = 0, monsterCounts = {} } = location.state || {}
  const [saving, setSaving] = useState(true); const [isBest, setIsBest] = useState(false); const [rank, setRank] = useState(null); const [saveError, setSaveError] = useState(''); const [xpGain, setXpGain] = useState(0); const [levelUp, setLevelUp] = useState(null); const savedRef = useRef(false)
  useEffect(() => { if (!location.state) { navigate('/home', { replace: true }); return } if (!savedRef.current) { savedRef.current = true; saveAndRank() } }, [])
  async function saveAndRank() {
    try {
      const { data: prev } = await supabase.from('scores').select('score').eq('user_id', user.id).order('score', { ascending: false }).limit(1); const prevBest = prev?.[0]?.score ?? 0
      let { error } = await supabase.from('scores').insert({ user_id: user.id, score, max_combo: maxCombo, monster_counts: monsterCounts })
      if (error?.message?.includes('monster_counts')) ({ error } = await supabase.from('scores').insert({ user_id: user.id, score, max_combo: maxCombo }))
      if (error) throw error
      await saveMonsterCounts(user.id, monsterCounts)
      const newBest = score > prevBest
      if (newBest) setIsBest(true)
      await saveProgress(newBest)
      const { data: all } = await supabase.from('scores').select('user_id, score').order('score', { ascending: false }); const bestByUser = {}
      for (const row of all || []) if (bestByUser[row.user_id] === undefined || row.score > bestByUser[row.user_id]) bestByUser[row.user_id] = row.score
      setRank(Object.values(bestByUser).sort((a, b) => b - a).indexOf(Math.max(prevBest, score)) + 1)
    } catch (err) { setSaveError(`점수를 저장하지 못했습니다: ${err.message}`) } finally { setSaving(false) }
  }
  async function saveProgress(newBest) {
    const totalKills = Object.values(monsterCounts).reduce((sum, count) => sum + count, 0)
    const gained = 20 + totalKills * 2 + (monsterCounts.boss || 0) * 10 + (newBest ? 15 : 0)
    setXpGain(gained)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const previous = resolveProgress(profile, user.id)
    const next = {
      xp: previous.xp + gained,
      discovered: [...new Set([...previous.discovered, ...Object.keys(monsterCounts).filter((id) => monsterCounts[id] > 0)])],
    }
    saveStoredProgress(user.id, next)
    const oldLevel = getLevel(previous.xp)
    const newLevel = getLevel(next.xp)
    if (newLevel > oldLevel) setLevelUp({ oldLevel, newLevel, unlock: LEVEL_UNLOCKS[newLevel] })
    const { error } = await supabase.from('profiles').update({ xp: next.xp, discovered_monsters: next.discovered }).eq('id', user.id)
    if (!error) await refreshProfile()
  }
  async function saveMonsterCounts(userId, counts) {
    for (const [monsterId, count] of Object.entries(counts)) {
      const { data } = await supabase.from('user_monster_stats').select('kill_count').eq('user_id', userId).eq('monster_id', monsterId).maybeSingle()
      const nextCount = (data?.kill_count || 0) + count
      await supabase.from('user_monster_stats').upsert({ user_id: userId, monster_id: monsterId, kill_count: nextCount, last_hunted_at: new Date().toISOString() }, { onConflict: 'user_id,monster_id' })
    }
  }
  function go(path, options) { sound.button(); navigate(path, options) }
  return <main className="page result-page">
    <div className="result-burst" aria-hidden="true"><span /><span /><span /></div>
    <section className="result-header"><span className="eyebrow"><Icon name="spark" size={14} /> HUNT COMPLETE</span><h1>{isBest ? '새로운 최고 기록!' : '사냥 완료!'}</h1><p>훌륭한 사냥이었어요, 헌터.</p></section>
    <section className="result-card"><div className="result-monster-wrap"><img src="/images/fox.png" alt="불꽃 여우" /></div><small>FINAL SCORE</small><strong className="result-score">{score.toLocaleString()}</strong>{isBest && <span className="best-badge">NEW BEST</span>}<div className="result-stats"><div><span>최고 콤보</span><strong>{maxCombo}</strong></div><i /><div><span>전체 순위</span><strong>{saving ? '...' : rank ? `${rank}위` : '-'}</strong></div></div><div className="xp-earned"><span>획득 경험치</span><strong>{saving ? '집계 중' : `+${xpGain} XP`}</strong></div></section>
    {saving && <p className="status-copy"><span className="loader small" /> 기록을 저장하는 중...</p>}{saveError && <div className="notice notice-error">{saveError}</div>}
    <div className="action-stack"><button className="btn btn-primary" onClick={() => go('/game', { replace: true })}><Icon name="refresh" size={19} /> 다시 도전하기</button><button className="btn btn-secondary" onClick={() => go('/ranking')}><Icon name="trophy" size={19} /> 랭킹 확인하기</button><button className="text-button" onClick={() => go('/')}><Icon name="home" size={17} /> 홈으로 돌아가기</button></div>
    {levelUp && <LevelUpModal levelUp={levelUp} onClose={() => setLevelUp(null)} onCollection={() => go('/collection')} />}
  </main>
}

function LevelUpModal({ levelUp, onClose, onCollection }) {
  const monster = MONSTERS.find((item) => levelUp.unlock?.monsters?.includes(item.id))
  return <div className="modal-overlay level-up-overlay"><section className="level-up-modal">
    <span className="eyebrow"><Icon name="spark" size={15} /> LEVEL UP!</span>
    <h2>Lv.{levelUp.oldLevel} → Lv.{levelUp.newLevel}</h2>
    {monster ? <img src={monster.image} alt={monster.name} /> : <div className="level-up-symbol"><Icon name={levelUp.unlock?.skill ? 'sword' : 'spark'} size={34} /></div>}
    <strong>{levelUp.unlock?.title}</strong>
    <p>{levelUp.unlock?.description}</p>
    <div className="btn-row"><button className="btn btn-secondary" onClick={onClose}>계속하기</button><button className="btn btn-primary" onClick={onCollection}>도감 확인</button></div>
  </section></div>
}
