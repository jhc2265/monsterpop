import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import { getLevel, getLevelProgress, LEVEL_UNLOCKS, resolveProgress, saveStoredProgress } from '../lib/progression'
import { MONSTERS } from '../lib/monsters'

export default function Result() {
  const { user, refreshProfile } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const { score = 0, maxCombo = 0, monsterCounts = {} } = location.state || {}
  const [saving, setSaving] = useState(true); const [isBest, setIsBest] = useState(false); const [rank, setRank] = useState(null); const [saveError, setSaveError] = useState(''); const [xpGain, setXpGain] = useState(0); const [xpProgress, setXpProgress] = useState(null); const [newDiscoveries, setNewDiscoveries] = useState([]); const [levelUp, setLevelUp] = useState(null); const savedRef = useRef(false)
  const [resultStep, setResultStep] = useState(1)
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
    setXpProgress(getLevelProgress(next.xp))
    setNewDiscoveries(next.discovered.filter((id) => !previous.discovered.includes(id)))
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
  const totalKills = Object.values(monsterCounts).reduce((sum, count) => sum + count, 0)
  const representative = getRepresentativeMonster(monsterCounts)
  const scoreGrade = getScoreGrade(score)
  return <main className={`page result-page result-step-${resultStep}`}>
    <div className="result-burst" aria-hidden="true"><span /><span /><span /></div>
    <section className={`result-header ${resultStep === 2 ? 'result-header-compact' : ''}`}><span className="eyebrow"><Icon name="spark" size={14} /> {resultStep === 1 ? 'HUNT COMPLETE' : 'REWARD COMPLETE'}</span><h1>{resultStep === 1 ? (isBest ? '새로운 최고 기록!' : '사냥 완료!') : '보상을 확인하세요!'}</h1>{resultStep === 1 && <p>{isBest ? '기록을 경신했어요. 멋진 사냥이었어요!' : '훌륭한 사냥이었어요, 헌터.'}</p>}</section>
    {resultStep === 1 ? <section className="result-card result-card-v2">
      <div className="result-achievements">{isBest && <span className="achievement best"><Icon name="spark" size={13} /> NEW BEST</span>}{rank === 1 && <span className="achievement crown"><Icon name="crown" size={14} /> 랭킹 1위</span>}{newDiscoveries.length > 0 && <span className="achievement discovery">NEW MONSTER</span>}</div>
      <div className="result-monster-stage"><img src={representative.image} alt={representative.name} /><strong>{representative.id === 'boss' ? '그림자 대왕 격파!' : `${representative.name} ${monsterCounts[representative.id] || 0}마리 처치!`}</strong></div>
      <div className="score-panel"><div><small>FINAL SCORE</small><strong className="result-score">{score.toLocaleString()}</strong></div><div className={`score-grade grade-${scoreGrade.toLowerCase()}`}><span>{scoreGrade}</span><small>RANK</small></div></div>
      <div className="result-summary"><div><span>최고 콤보</span><strong>{maxCombo}</strong></div><i /><div><span>처치 몬스터</span><strong>{totalKills}마리</strong></div><i /><div><span>현재 순위</span><strong>{saving ? '...' : rank ? `${rank}위` : '-'}</strong></div></div>
    </section> : <section className="result-reward-card">
      <div className="reward-orb"><Icon name="spark" size={26} /><span>HUNT XP</span><strong>+{xpGain}</strong></div>
      <div className="xp-progress-card"><div className="xp-progress-head"><span>획득 경험치</span><strong>{saving ? '집계 중' : `+${xpGain} XP`}</strong></div>{xpProgress && <><div className="xp-progress-line"><b>LV.{xpProgress.level}</b><span><i style={{ width: `${xpProgress.percent}%` }} /></span><small>{xpProgress.level >= 10 ? 'MAX' : `${xpProgress.current} / ${xpProgress.needed} XP`}</small></div><p>{xpProgress.level >= 10 ? '최고 레벨을 달성했어요!' : `다음 레벨까지 ${(xpProgress.needed - xpProgress.current).toLocaleString()} XP`}</p></>}</div>
      {newDiscoveries.length > 0 && <div className="reward-discovery"><span>NEW</span><strong>새로운 몬스터가 도감에 등록됐어요!</strong></div>}
    </section>}
    {saving && <p className="status-copy"><span className="loader small" /> 기록을 저장하는 중...</p>}{saveError && <div className="notice notice-error">{saveError}</div>}
    {resultStep === 1 ? <div className="result-next-wrap">
      <button className="btn btn-primary result-next-button" onClick={() => { sound.button(); setResultStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>다음으로 <span aria-hidden="true">→</span></button>
      <div className="result-step-dots" aria-label="결과 2단계 중 1단계"><b /><i /></div>
    </div> : <div className="action-stack result-reward-actions"><button className="btn btn-primary" onClick={() => go('/game', { replace: true })}><img src="/images/ui/hunt-swords.png" alt="" /> 다시 사냥하기</button><button className="btn btn-secondary" onClick={() => go('/ranking')}><Icon name="trophy" size={19} /> 랭킹 보기</button><button className="text-button" onClick={() => go('/home')}><Icon name="home" size={17} /> 홈으로</button><button className="result-back-button" onClick={() => { sound.button(); setResultStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>← 결과 다시 보기</button><div className="result-step-dots" aria-label="결과 2단계 중 2단계"><i /><b /></div></div>}
    {levelUp && <LevelUpModal levelUp={levelUp} onClose={() => setLevelUp(null)} onCollection={() => go('/collection')} />}
  </main>
}

function getRepresentativeMonster(counts) {
  if (!Object.values(counts).some((count) => count > 0)) return MONSTERS[0]
  if ((counts.boss || 0) > 0) return MONSTERS.find((monster) => monster.id === 'boss')
  return [...MONSTERS].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || b.score - a.score)[0]
}

function getScoreGrade(score) {
  if (score >= 18000) return 'SS'
  if (score >= 12000) return 'S'
  if (score >= 7000) return 'A'
  if (score >= 3000) return 'B'
  return 'C'
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
