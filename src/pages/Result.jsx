import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import { getLevel, getLevelProgress, isMaxLevel, LEVEL_UNLOCKS, resolveProgress, saveStoredProgress } from '../lib/progression'
import { recordGameForMissions } from '../lib/missions'
import { getDailyBoss, recordBossClear } from '../lib/bosses'
import { MONSTERS } from '../lib/monsters'

// 보스 반복 도전은 연습으로 본다. 첫 클리어(firstClearXp)와 격차를 둬야
// 반복 파밍 유인이 생기지 않는다.
const BOSS_REPEAT_XP = 30

export default function Result() {
  const { user, refreshProfile } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const { score = 0, maxCombo = 0, monsterCounts = {}, mode = 'hunt', bossClear = false, bossTimeLeft = 0, bossDamage = 0, bossMaxHp = 30 } = location.state || {}
  const [saving, setSaving] = useState(true); const [isBest, setIsBest] = useState(false); const [rank, setRank] = useState(null); const [saveError, setSaveError] = useState(''); const [xpGain, setXpGain] = useState(0); const [xpProgress, setXpProgress] = useState(null); const [newDiscoveries, setNewDiscoveries] = useState([]); const [levelUp, setLevelUp] = useState(null); const savedRef = useRef(false)
  const [bossReward, setBossReward] = useState(null)
  const [missionXp, setMissionXp] = useState(0)
  const rewardThemePlayedRef = useRef(false)
  const [resultStep, setResultStep] = useState(1)
  useEffect(() => {
    if (!location.state) { navigate('/home', { replace: true }); return }
    sound.resultTheme()
    if (!savedRef.current) { savedRef.current = true; saveAndRank() }
  }, [])
  useEffect(() => {
    if (rewardThemePlayedRef.current || (!bossClear && !isBest && !levelUp && newDiscoveries.length === 0)) return
    rewardThemePlayedRef.current = true
    sound.rewardTheme()
  }, [bossClear, isBest, levelUp, newDiscoveries])
  async function saveAndRank() {
    try {
      if (mode === 'boss') {
        if (bossClear) await saveMonsterCounts(user.id, { boss: 1 })
        await saveProgress(false)
        return
      }
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
    const missionBonus = recordGameForMissions(user.id, { maxCombo, totalKills })
    setMissionXp(missionBonus)
    // 보스전은 사냥 공식(몬스터 수 기반)을 쓰면 32XP 밖에 안 나온다.
    // 하루 첫 클리어에만 firstClearXp 를 주고, 반복 도전은 연습으로 취급해 소액만 준다.
    let gained
    if (mode === 'boss') {
      const boss = getDailyBoss()
      if (bossClear) {
        const record = recordBossClear(user.id, boss.id, { timeLeft: bossTimeLeft })
        setBossReward(record)
        gained = (record.firstToday ? boss.firstClearXp : BOSS_REPEAT_XP) + missionBonus
      } else {
        // 실패해도 준 피해만큼은 인정한다 (최대 BOSS_REPEAT_XP)
        gained = Math.round((bossDamage / Math.max(1, bossMaxHp)) * BOSS_REPEAT_XP) + missionBonus
      }
    } else {
      gained = 20 + totalKills * 2 + (monsterCounts.boss || 0) * 10 + (newBest ? 15 : 0) + missionBonus
    }
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
  const isBossMode = mode === 'boss'
  const representative = isBossMode ? MONSTERS.find((monster) => monster.id === 'boss') : getRepresentativeMonster(monsterCounts)
  const scoreGrade = getScoreGrade(score)
  const baseXp = 20
  const huntBonusXp = totalKills * 2 + (monsterCounts.boss || 0) * 10
  const recordBonusXp = isBest ? 15 : 0
  const nextUnlock = xpProgress && LEVEL_UNLOCKS[xpProgress.level + 1]
  const nextUnlockMonster = MONSTERS.find((item) => nextUnlock?.monsters?.includes(item.id))
  return <main className={`page result-page result-step-${resultStep}`}>
    <div className="result-burst" aria-hidden="true"><span /><span /><span /></div>
    <section className={`result-header ${resultStep === 2 ? 'result-header-compact' : ''}`}>
      {resultStep === 2 && <button className="result-step-back" onClick={() => { sound.button(); setResultStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="전투 결과로 돌아가기"><Icon name="back" size={23} /></button>}
      <span className="eyebrow"><Icon name="spark" size={14} /> {resultStep === 1 ? (isBossMode ? (bossClear ? 'BOSS DEFEATED' : 'BOSS ESCAPED') : 'HUNT COMPLETE') : 'REWARD COMPLETE'}</span><h1>{resultStep === 1 ? (isBossMode ? (bossClear ? '보스 격파!' : '도전 종료') : '사냥 완료!') : '보상 정산 완료!'}</h1><p>{resultStep === 1 ? (isBossMode ? (bossClear ? '네온 나이트메어를 물리쳤어요!' : '다음 도전에서는 반드시 쓰러뜨릴 수 있어요.') : isBest ? '최고 기록을 경신했어요, 헌터!' : '훌륭한 사냥이었어요, 헌터!') : '이번 도전으로 한층 더 성장했어요!'}</p>
    </section>
    {resultStep === 1 ? <section className="result-card result-card-v2">
      {isBest && <div className="result-best-flag"><strong>NEW BEST!</strong><span>최고 기록 경신!</span></div>}
      <div className="result-monster-stage"><img src={representative.image} alt={representative.name} /><strong>{isBossMode ? (bossClear ? `${representative.name} 격파!` : `${representative.name} ${bossDamage} 피해`) : `${representative.name} ${monsterCounts[representative.id] || 0}마리 처치!`}</strong></div>
      <div className="score-panel">
        <div className={`score-grade grade-${scoreGrade.toLowerCase()}`}><img src={`/images/ranks/rank-${scoreGrade.toLowerCase()}.webp`} alt={`${scoreGrade} 랭크 배지`} /></div>
        <div className="score-copy"><small>FINAL SCORE</small><strong className="result-score">{score.toLocaleString()}</strong></div>
      </div>
      {isBossMode ? <div className="result-summary"><div><img src="/images/ui/stat-combo.webp" alt="" /><span>최고 콤보</span><strong>{maxCombo}</strong></div><i /><div><img src="/images/ui/stat-kills.webp" alt="" /><span>{bossClear ? '처치 시간' : '가한 피해'}</span><strong>{bossClear ? `${40 - bossTimeLeft}초` : `${bossDamage}/${bossMaxHp}`}</strong></div><i /><div><img src="/images/ui/stat-rank.webp" alt="" /><span>남은 시간</span><strong>{bossClear ? `${bossTimeLeft}초` : '실패'}</strong></div></div> : <div className="result-summary"><div><img src="/images/ui/stat-combo.webp" alt="" /><span>최고 콤보</span><strong>{maxCombo}</strong></div><i /><div><img src="/images/ui/stat-kills.webp" alt="" /><span>처치 몬스터</span><strong>{totalKills}마리</strong></div><i /><div><img src="/images/ui/stat-rank.webp" alt="" /><span>현재 순위</span><strong>{saving ? '...' : rank ? `${rank}위` : '-'}</strong></div></div>}
    </section> : <section className="result-reward-card">
      <div className="reward-settlement">
        <div className="reward-total">
          <Icon name="spark" size={17} />
          <small>TOTAL XP</small>
          <strong>+{xpGain}</strong>
          <span>경험치를 획득했어요</span>
        </div>
        <div className="reward-sources">
          {isBossMode ? <>
            <div><small>{bossClear ? (bossReward?.firstToday ? '첫 격파' : '반복 도전') : '입힌 피해'}</small><strong>+{Math.max(0, xpGain - missionXp)}</strong></div>
            <div><small>미션</small><strong>+{missionXp}</strong></div>
            <div><small>남은 시간</small><strong>{bossClear ? `${bossTimeLeft}초` : '-'}</strong></div>
          </> : <>
            <div><small>기본</small><strong>+{baseXp}</strong></div>
            <div><small>사냥</small><strong>+{huntBonusXp}</strong></div>
            <div><small>기록</small><strong>+{recordBonusXp}</strong></div>
          </>}
        </div>
        <p className="reward-kills">{isBossMode
          ? bossClear
            ? bossReward?.firstToday
              ? <>오늘 첫 격파! {bossReward.streak > 1 ? <><strong>{bossReward.streak}일 연속</strong> 달성</> : <>내일도 이어가 보세요</>}</>
              : <>오늘은 이미 격파했어요. 반복 도전은 <strong>연습</strong>으로 기록됩니다</>
            : <>보스에게 <strong>{bossDamage} 피해</strong>를 입혔어요</>
          : <>이번 사냥에서 몬스터 <strong>{totalKills}마리</strong>를 처치했어요</>}</p>
      </div>
      <div className="xp-progress-card">{xpProgress && <><div className="xp-level-head"><strong>LV.{xpProgress.level}</strong><span>{isMaxLevel(xpProgress.level) ? 'MAX LEVEL' : 'LEVEL PROGRESS'}</span><b>{isMaxLevel(xpProgress.level) ? 'MAX' : `LV.${xpProgress.level + 1}`}</b></div><div className="xp-progress-line"><span><i style={{ width: `${xpProgress.percent}%` }} /></span></div><div className="xp-progress-values"><small>{xpProgress.current} / {xpProgress.needed} XP</small><small>{isMaxLevel(xpProgress.level) ? '최고 레벨 달성' : `${(xpProgress.needed - xpProgress.current).toLocaleString()} XP 남음`}</small></div></>}</div>
      {nextUnlock && <div className="next-reward-card">{nextUnlockMonster ? <img src={nextUnlockMonster.image} alt="" /> : nextUnlock.image ? <img src={nextUnlock.image} alt="" /> : <span><Icon name={nextUnlock.skill ? 'sword' : 'spark'} size={27} /></span>}<div><small>NEXT UNLOCK · LV.{xpProgress.level + 1}</small><strong>{nextUnlock.title}</strong><p>{nextUnlock.description}</p></div><Icon name="lock" size={18} /></div>}
      {newDiscoveries.length > 0 && <div className="reward-discovery"><span>NEW</span><strong>새로운 몬스터가 도감에 등록됐어요!</strong></div>}
    </section>}
    {saving && <p className="status-copy"><span className="loader small" /> 기록을 저장하는 중...</p>}{saveError && <div className="notice notice-error">{saveError}</div>}
    {resultStep === 1 ? <div className="result-next-wrap">
      <button className="btn btn-primary result-next-button" onClick={() => { sound.button(); setResultStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>보상 확인하기 <span aria-hidden="true">→</span></button>
    </div> : <div className="result-reward-actions"><button className="btn btn-primary" onClick={() => go(isBossMode ? '/boss' : '/game', { replace: true })}><img src="/images/ui/hunt-swords.webp" alt="" /><span>{isBossMode ? '보스 재도전' : '다시 사냥'}</span></button><button className="btn btn-secondary" onClick={() => go('/ranking')}><Icon name="trophy" size={19} /><span>랭킹</span></button><button className="btn btn-secondary" onClick={() => go('/home')}><Icon name="home" size={18} /><span>홈</span></button></div>}
    {levelUp && <LevelUpModal levelUp={levelUp} onClose={() => setLevelUp(null)} onCollection={() => go('/collection')} onTrySkill={() => go('/game', { replace: true })} onOpenMission={() => go('/home')} />}
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

function LevelUpModal({ levelUp, onClose, onCollection, onTrySkill, onOpenMission }) {
  const monster = MONSTERS.find((item) => levelUp.unlock?.monsters?.includes(item.id))
  const isSkill = Boolean(levelUp.unlock?.skill)
  const isMission = levelUp.newLevel === 2
  const rewardImage = levelUp.unlock?.image
  const unlockType = monster ? 'NEW MONSTER' : isSkill ? 'NEW SKILL' : isMission ? 'DAILY CONTENT' : 'NEW REWARD'
  const primaryAction = monster ? onCollection : isSkill ? onTrySkill : isMission ? onOpenMission : onClose
  const primaryLabel = monster ? '도감 확인' : isSkill ? '사용해보기' : isMission ? '미션 보러가기' : '확인'
  return <div className="modal-overlay level-up-overlay"><section className={`level-up-modal ${isSkill ? 'skill-unlock' : ''} ${isMission ? 'mission-unlock' : ''}`}>
    <div className="level-up-confetti" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
    <span className="level-up-kicker"><Icon name="spark" size={14} /> LEVEL UP</span>
    <h2><span>Lv.{levelUp.oldLevel}</span><i aria-hidden="true">→</i><strong>Lv.{levelUp.newLevel}</strong></h2>
    <div className="unlock-showcase">
      <div className="unlock-rays" aria-hidden="true" />
      <span className="unlock-type">{unlockType}</span>
      <div className="unlock-art">
        {monster ? <img src={monster.image} alt={monster.name} /> : isSkill ? <img src="/images/ui/hunt-swords.webp" alt="섀도우 버스트 쌍검" /> : rewardImage ? <img src={rewardImage} alt={levelUp.unlock?.title} /> : isMission ? <MissionUnlockArt /> : <Icon name="spark" size={54} />}
      </div>
      {(isSkill || isMission) && <span className="unlock-skill-tag">{isSkill ? 'ACTIVE SKILL' : 'EVERY DAY'}</span>}
    </div>
    <div className="unlock-copy">
      <small>새로운 힘을 획득했어요</small>
      <strong>{levelUp.unlock?.title}</strong>
      <p>{levelUp.unlock?.description}</p>
    </div>
    <div className="btn-row"><button className="btn btn-secondary" onClick={onClose}>계속하기</button><button className="btn btn-primary" onClick={primaryAction}>{primaryLabel}</button></div>
  </section></div>
}

function MissionUnlockArt() {
  return <div className="mission-unlock-art" role="img" aria-label="오늘의 미션 체크리스트">
    <div className="mission-board-clip"><Icon name="spark" size={15} /></div>
    <div className="mission-board-head"><span>TODAY</span><strong>3</strong></div>
    <div className="mission-board-row complete"><i><Icon name="check" size={11} /></i><span /></div>
    <div className="mission-board-row"><i /><span /></div>
    <div className="mission-board-row"><i /><span /></div>
    <b><Icon name="spark" size={18} /></b>
  </div>
}
