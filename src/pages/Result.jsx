import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'
import { getLevel, getLevelProgress, isMaxLevel, LEVEL_UNLOCKS, resolveProgress, saveStoredProgress } from '../lib/progression'
import { DAILY_MISSION_COUNT, getDailyMissions, recordGameForMissions } from '../lib/missions'
import { getBossById, getDailyBoss, hasClearedBossToday, recordBossAttempt, recordBossClear } from '../lib/bosses'
import { flushState } from '../lib/stateCache'
import { MONSTERS } from '../lib/monsters'

// 보스 반복 도전은 기록 갱신과 연습용이다. 큰 보상은 오늘 첫 클리어 한 번만 지급한다.
const BOSS_REPEAT_XP = 0
// 실패한 도전의 보상 상한 — 첫 격파 보상 대비 비율. 격파와의 격차가 충분해야 지고 반복하지 않는다.
const ATTEMPT_XP_RATIO = 0.3

export default function Result() {
  const { user, refreshProfile } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const { score = 0, maxCombo = 0, monsterCounts = {}, mode = 'hunt', bossClear = false, bossId = '', bossTimeLeft = 0, bossDamage = 0, bossMaxHp = 30 } = location.state || {}
  const activeBoss = mode === 'boss' ? (getBossById(bossId) || getDailyBoss()) : null
  const [saving, setSaving] = useState(true); const [isBest, setIsBest] = useState(false); const [rank, setRank] = useState(null); const [saveError, setSaveError] = useState(''); const [xpGain, setXpGain] = useState(0); const [xpProgress, setXpProgress] = useState(null); const [newDiscoveries, setNewDiscoveries] = useState([]); const [levelUp, setLevelUp] = useState(null); const savedRef = useRef(false)
  const [bossReward, setBossReward] = useState(null)
  const [missionXp, setMissionXp] = useState(0)
  const [missionsDone, setMissionsDone] = useState(null)
  const [bossAttempt, setBossAttempt] = useState(null)
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
    // 미션 후보가 레벨에 따라 달라지므로 기록 전에 레벨을 알아야 한다.
    // 홈 화면과 같은 값(resolveProgress)을 써야 두 화면의 미션 목록이 어긋나지 않는다.
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    const previous = resolveProgress(profile, user.id)
    const level = getLevel(previous.xp)
    // 미션 지표 이름으로 맞춰 넘긴다. 콤보·점수는 한 판 최고값으로 기록된다.
    const missionBonus = recordGameForMissions(user.id, {
      kills: totalKills,
      rareKills: countRareKills(monsterCounts),
      combo: maxCombo,
      score,
      bossDamage: mode === 'boss' ? bossDamage : 0,
      bossClears: mode === 'boss' && bossClear ? 1 : 0,
    }, level)
    setMissionXp(missionBonus)
    setMissionsDone(getDailyMissions(user.id, level).filter((mission) => mission.done).length)
    // 보스전은 사냥 공식 대신 오늘의 보스 첫 처치 보상을 쓴다.
    // 다른 보스와 반복 도전은 기록·연습용이며 일일 보스 XP를 중복 지급하지 않는다.
    let gained
    if (mode === 'boss') {
      const boss = activeBoss
      if (bossClear) {
        const record = recordBossClear(user.id, boss.id, { timeLeft: bossTimeLeft })
        setBossReward(record)
        gained = (record.firstToday ? boss.firstClearXp : BOSS_REPEAT_XP) + missionBonus
      } else {
        // 격파하지 못해도 깎아낸 만큼은 돌려준다. 다만 오늘 최고 피해를 넘어선 몫만 준다.
        const attempt = recordBossAttempt(user.id, boss.id, {
          progress: bossDamage / Math.max(1, bossMaxHp),
          maxXp: Math.round(boss.firstClearXp * ATTEMPT_XP_RATIO),
        })
        setBossAttempt(attempt)
        gained = attempt.gain + missionBonus
      }
    } else {
      gained = 20 + totalKills * 2 + (monsterCounts.boss || 0) * 10 + (newBest ? 15 : 0) + missionBonus
    }
    setXpGain(gained)
    const next = {
      xp: previous.xp + gained,
      discovered: [...new Set([...previous.discovered, ...Object.keys(monsterCounts).filter((id) => monsterCounts[id] > 0)])],
    }
    setXpProgress(getLevelProgress(next.xp))
    setNewDiscoveries(next.discovered.filter((id) => !previous.discovered.includes(id)))
    saveStoredProgress(user.id, next)
    const oldLevel = level
    const newLevel = getLevel(next.xp)
    if (newLevel > oldLevel) setLevelUp({ oldLevel, newLevel, unlock: LEVEL_UNLOCKS[newLevel] })
    // 서버 저장 실패를 조용히 넘기면 안 된다. 화면은 localStorage 값으로 정상처럼 보이지만
    // 다른 기기로 로그인하는 순간 이 판의 기록이 없다.
    const { error } = await supabase.from('profiles').update({ xp: next.xp, discovered_monsters: next.discovered }).eq('id', user.id)
    if (error) setSaveError(`성장 기록을 서버에 저장하지 못했습니다: ${error.message}`)
    else await refreshProfile()
    // 미션·보스 기록 업로드가 끝난 뒤에 저장 중 표시를 내린다.
    await flushState()
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
  const representative = isBossMode ? activeBoss : getRepresentativeMonster(monsterCounts)
  const scoreGrade = getScoreGrade(score)
  const baseXp = 20
  const huntBonusXp = totalKills * 2 + (monsterCounts.boss || 0) * 10
  const recordBonusXp = isBest ? 15 : 0
  // 내역 세 칸이 TOTAL 을 설명해야 한다. 예전에는 기본+사냥+기록만 보여줘서
  // 미션으로 받은 XP 가 통째로 빠졌고, 합이 총합과 어긋났다.
  const bonusXp = recordBonusXp + missionXp
  const bonusParts = [
    recordBonusXp > 0 && `최고 기록 +${recordBonusXp}`,
    missionXp > 0 && `미션 +${missionXp}`,
  ].filter(Boolean)
  // 이번 판에 미션을 새로 채우지 못하면 XP는 늘 +0 이다. 그때는 금액 대신 오늘 미션 진행 상황을 보여준다.
  const missionTile = missionXp > 0
    ? <div><small>미션</small><strong>+{missionXp}</strong></div>
    : <div><small>오늘의 미션</small><strong>{missionsDone === null ? '...' : `${missionsDone}/${DAILY_MISSION_COUNT}`}</strong></div>
  // 세 번째 칸에 격파율(%)을 두면 바로 옆 "가한 피해 90/300"을 나눗셈한 값이라 새 정보가 없다.
  // 대신 이번 판 이전의 오늘 최고 피해를 보여준다 — 도전 보상의 기준선이라 비교할 값이 된다.
  const todaysBestDamage = !bossAttempt ? '...'
    : bossAttempt.previousBest > 0 ? `${Math.round(bossAttempt.previousBest * bossMaxHp)}` : '첫 도전'
  // "격파하면 전체 보상"은 오늘의 보스, 그것도 아직 안 잡았을 때만 참이다.
  // 자유 도전은 격파해도 0 XP 라, 재도전 버튼에 실제 값을 적어야 브리핑(격파 보상 '기록만')과 어긋나지 않는다.
  const retryNote = !isBossMode ? null
    : activeBoss.id === getDailyBoss().id && !hasClearedBossToday(user.id, activeBoss.id)
      ? <>오늘의 보스예요. 격파하면 <strong>+{activeBoss.firstClearXp} XP</strong></>
      : <>자유 도전은 XP 없이 <strong>기록 갱신</strong>만 남아요</>
  const nextUnlock = xpProgress && LEVEL_UNLOCKS[xpProgress.level + 1]
  const nextUnlockMonster = MONSTERS.find((item) => nextUnlock?.monsters?.includes(item.id))
  return <main
    className={`page result-page result-step-${resultStep}${isBossMode ? ` boss-result boss-result-${activeBoss.id} ${bossClear ? 'boss-cleared' : 'boss-escaped'}` : ''}`}
    style={isBossMode ? { '--result-boss-accent': activeBoss.color } : undefined}
  >
    <div className="result-burst" aria-hidden="true"><span /><span /><span /></div>
    <section className={`result-header ${resultStep === 2 ? 'result-header-compact' : ''}`}>
      {resultStep === 2 && <button className="result-step-back" onClick={() => { sound.button(); setResultStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="전투 결과로 돌아가기"><Icon name="back" size={23} /></button>}
      <span className="eyebrow"><Icon name="spark" size={14} /> {resultStep === 1 ? (isBossMode ? (bossClear ? 'BOSS DEFEATED' : 'BOSS ESCAPED') : 'HUNT COMPLETE') : 'REWARD COMPLETE'}</span><h1>{resultStep === 1 ? (isBossMode ? (bossClear ? '보스 격파!' : '도전 종료') : '사냥 완료!') : '보상 정산 완료!'}</h1><p>{resultStep === 1 ? (isBossMode ? (bossClear ? `${activeBoss.name}을 물리쳤어요!` : `${activeBoss.name}이 도망쳤어요. 다음 도전에서 다시 만나요!`) : isBest ? '최고 기록을 경신했어요, 헌터!' : '훌륭한 사냥이었어요, 헌터!') : '이번 도전으로 한층 더 성장했어요!'}</p>
    </section>
    {resultStep === 1 ? <section className="result-card result-card-v2">
      {isBest && <div className="result-best-flag"><strong>NEW BEST!</strong><span>최고 기록 경신!</span></div>}
      <div className="result-monster-stage">
        {isBossMode && <span className="result-boss-aura" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        </span>}
        <img src={representative.image} alt={representative.name} /><strong>{isBossMode
          ? bossClear ? `${representative.name} 격파!` : bossDamage >= bossMaxHp * 0.75 ? '한 걸음 남았어요!' : '다시 도전해 볼까요?'
          : `${representative.name} ${monsterCounts[representative.id] || 0}마리 처치!`}</strong>
      </div>
      <div className="score-panel">
        <div className={`score-grade grade-${scoreGrade.toLowerCase()}`}><img src={`/images/ranks/rank-${scoreGrade.toLowerCase()}.webp`} alt={`${scoreGrade} 랭크 배지`} /></div>
        <div className="score-copy"><small>FINAL SCORE</small><strong className="result-score">{score.toLocaleString()}</strong></div>
      </div>
      {isBossMode ? <div className="result-summary"><div><img src="/images/ui/stat-combo.webp" alt="" /><span>최고 콤보</span><strong>{maxCombo}</strong></div><i /><div><img src="/images/ui/stat-kills.webp" alt="" /><span>{bossClear ? '처치 시간' : '가한 피해'}</span><strong>{bossClear ? `${activeBoss.timeLimit - bossTimeLeft}초` : `${bossDamage}/${bossMaxHp}`}</strong></div><i /><div><img src="/images/ui/stat-rank.webp" alt="" /><span>{bossClear ? '남은 시간' : '오늘 최고'}</span><strong>{bossClear ? `${bossTimeLeft}초` : todaysBestDamage}</strong></div></div> : <div className="result-summary"><div><img src="/images/ui/stat-combo.webp" alt="" /><span>최고 콤보</span><strong>{maxCombo}</strong></div><i /><div><img src="/images/ui/stat-kills.webp" alt="" /><span>처치 몬스터</span><strong>{totalKills}마리</strong></div><i /><div><img src="/images/ui/stat-rank.webp" alt="" /><span>현재 순위</span><strong>{saving ? '...' : rank ? `${rank}위` : '-'}</strong></div></div>}
    </section> : <section className="result-reward-card">
      <div className="reward-settlement">
        <div className="reward-total">
          {/* 별은 라벨과 한 줄로 묶는다. 이 앱의 다른 표제(REWARD COMPLETE · LEVEL UP · 홈 인사말)가
              전부 그 규칙이고, 혼자 윗줄을 차지하면 주인공인 숫자가 밀린다. */}
          <small><Icon name="spark" size={15} /> TOTAL XP <Icon name="spark" size={15} /></small>
          <strong>+{xpGain}</strong>
          <span>경험치를 획득했어요</span>
        </div>
        <div className="reward-sources">
          {isBossMode ? bossClear ? <>
            <div><small>{bossReward?.firstToday ? '오늘의 보스' : bossReward?.isDailyBoss ? '보상 완료' : '자유 도전'}</small><strong>+{Math.max(0, xpGain - missionXp)}</strong></div>
            {missionTile}
            <div><small>남은 시간</small><strong>{bossTimeLeft}초</strong></div>
          </> : <>
            <div><small>도전 보상</small><strong>+{bossAttempt?.gain ?? 0}</strong></div>
            <div><small>입힌 피해</small><strong>{bossDamage}/{bossMaxHp}</strong></div>
            {missionTile}
          </> : <>
            <div><small>기본</small><strong>+{baseXp}</strong></div>
            <div><small>사냥</small><strong>+{huntBonusXp}</strong></div>
            <div><small>보너스</small><strong>+{bonusXp}</strong></div>
          </>}
        </div>
        <p className="reward-kills">{isBossMode
          ? bossClear
            ? bossReward?.firstToday
              ? <>오늘 첫 격파! {bossReward.streak > 1 ? <><strong>{bossReward.streak}일 연속</strong> 달성</> : <>내일도 이어가 보세요</>}</>
              : bossReward?.isDailyBoss
                ? <>오늘의 보상은 이미 받았어요. 재도전은 <strong>기록 갱신</strong>으로 남습니다</>
                : <>자유 도전이라 XP 없이 <strong>기록 갱신</strong>만 남습니다</>
            : bossAttempt?.improved
              ? <>오늘 최고 기록 갱신! 다음은 피해 <strong>{Math.round(bossAttempt.best * bossMaxHp)}</strong> 넘게 줘야 추가 보상이 나와요</>
              : <>피해 <strong>{Math.round((bossAttempt?.previousBest ?? 0) * bossMaxHp)}</strong> 넘게 줘야 도전 보상이 더 나와요</>
          : bonusParts.length > 0
            ? <>보너스 내역 · <strong>{bonusParts.join(' · ')}</strong></>
            : <>최고 기록을 세우거나 미션을 채우면 <strong>보너스 XP</strong>를 받아요</>}</p>
      </div>
      <div className="xp-progress-card">{xpProgress && <><div className="xp-level-head"><strong>LV.{xpProgress.level}</strong><span>{isMaxLevel(xpProgress.level) ? 'MAX LEVEL' : 'LEVEL PROGRESS'}</span><b>{isMaxLevel(xpProgress.level) ? 'MAX' : `LV.${xpProgress.level + 1}`}</b></div><div className="xp-progress-line"><span><i style={{ width: `${xpProgress.percent}%` }} /></span></div><div className="xp-progress-values"><small>{xpProgress.current} / {xpProgress.needed} XP</small><small>{isMaxLevel(xpProgress.level) ? '최고 레벨 달성' : `${(xpProgress.needed - xpProgress.current).toLocaleString()} XP 남음`}</small></div></>}</div>
      {nextUnlock && <div className="next-reward-card">{nextUnlockMonster ? <img src={nextUnlockMonster.image} alt="" /> : nextUnlock.image ? <img src={nextUnlock.image} alt="" /> : <span><Icon name={nextUnlock.skill ? 'sword' : 'spark'} size={27} /></span>}<div><small>NEXT UNLOCK · LV.{xpProgress.level + 1}</small><strong>{nextUnlock.title}</strong><p>{nextUnlock.description}</p></div><Icon name="lock" size={18} /></div>}
      {newDiscoveries.length > 0 && <div className="reward-discovery"><span>NEW</span><strong>새로운 몬스터가 도감에 등록됐어요!</strong></div>}
    </section>}
    {saving && <p className="status-copy"><span className="loader small" /> 기록을 저장하는 중...</p>}{saveError && <div className="notice notice-error">{saveError}</div>}
    {resultStep === 1 ? <div className="result-next-wrap">
      <button className="btn btn-primary result-next-button" onClick={() => { sound.button(); setResultStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>보상 확인하기 <span aria-hidden="true">→</span></button>
    </div> : <>
      {/* 재도전 여부를 정하는 자리는 버튼 바로 앞이다. 격파 보상 안내가 화면 위쪽에 있으면
          레벨 바와 다음 해금 카드를 지나오는 사이에 잊힌다. */}
      {retryNote && <p className="result-retry-note">{retryNote}</p>}
      <div className="result-reward-actions"><button className="btn btn-primary" onClick={() => go(isBossMode ? `/boss/${activeBoss.id}` : '/game', { replace: true })}><img src="/images/ui/hunt-swords.webp" alt="" /><span>{isBossMode ? '보스 재도전' : '다시 사냥'}</span></button><button className="btn btn-secondary" onClick={() => go('/ranking')}><Icon name="trophy" size={19} /><span>랭킹</span></button><button className="btn btn-secondary" onClick={() => go('/home')}><Icon name="home" size={18} /><span>홈</span></button></div>
    </>}
    {levelUp && <LevelUpModal levelUp={levelUp} onClose={() => setLevelUp(null)} onCollection={() => go('/collection')} onTrySkill={() => go('/game', { replace: true })} onOpenMission={() => go('/home')} />}
  </main>
}

// "희귀 이상"은 일반 등급이 아닌 모든 처치를 센다. 보스는 MONSTERS 에 없어서
// 목록에 없는 id 는 보스로 보고 포함시킨다.
function countRareKills(counts) {
  return Object.entries(counts).reduce((sum, [id, count]) => {
    const monster = MONSTERS.find((item) => item.id === id)
    return monster && monster.grade === '일반' ? sum : sum + count
  }, 0)
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
