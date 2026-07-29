import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { isMonsterDiscovered } from '../lib/bosses'
import { getProfileAvatarOptions, resolveAvatarUrl } from '../lib/avatar'
import { getHunterTitle, getLevelProgress, resolveProgress } from '../lib/progression'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const progress = getLevelProgress(resolveProgress(profile, user.id).xp)
  const discovered = resolveProgress(profile, user.id).discovered
  const [nickname, setNickname] = useState(profile?.nickname || '')
  const [avatarUrl, setAvatarUrl] = useState(() => resolveAvatarUrl(profile?.avatar_url))
  const [stats, setStats] = useState({ bestScore: 0, bestCombo: 0, hunts: 0 })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const avatars = useMemo(getProfileAvatarOptions, [])

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '')
      setAvatarUrl(resolveAvatarUrl(profile.avatar_url))
    }
  }, [profile])

  useEffect(() => {
    supabase
      .from('scores')
      .select('score, max_combo')
      .eq('user_id', user.id)
      .order('score', { ascending: false })
      .then(({ data }) => {
        const rows = data || []
        setStats({
          bestScore: rows[0]?.score || 0,
          bestCombo: rows.reduce((best, row) => Math.max(best, row.max_combo || 0), 0),
          hunts: rows.length,
        })
      })
  }, [user.id])

  async function saveProfile() {
    const trimmed = nickname.trim()
    if (trimmed.length < 2) {
      setNotice('닉네임은 2자 이상 입력해 주세요.')
      return
    }
    setSaving(true)
    setNotice('')
    sound.button()
    const { error } = await supabase
      .from('profiles')
      .update({ nickname: trimmed, avatar_url: avatarUrl })
      .eq('id', user.id)
    if (error) {
      setNotice('프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } else {
      await refreshProfile()
      setNotice('프로필을 저장했어요!')
    }
    setSaving(false)
  }

  const selected = avatars.find((monster) => monster.image === avatarUrl) || avatars[0]
  const monsterAvatars = avatars.filter((avatar) => !avatar.profileExtra)
  const isAvatarUnlocked = (avatar) => avatar.profileExtra
    ? progress.level >= avatar.unlockLevel
    : avatar.id === 'slime' || isMonsterDiscovered(discovered, avatar.id)
  const discoveredCount = monsterAvatars.filter((monster) => monster.id === 'slime' || isMonsterDiscovered(discovered, monster.id)).length
  const unlockedAvatarCount = avatars.filter(isAvatarUnlocked).length

  return <main className="page profile-page">
    <header className="topbar">
      <button className="icon-btn" onClick={() => navigate('/home')} aria-label="뒤로"><Icon name="back" /></button>
      <div className="title-stack"><span className="overline">HUNTER PROFILE</span><h1>내 프로필</h1></div>
      <button className="ghost-icon-btn" onClick={() => navigate('/settings')} aria-label="설정"><Icon name="settings" size={20} /></button>
    </header>

    <section className="profile-hero" style={{ '--avatar-color': selected?.color || '#b84dff' }}>
      <div className="profile-avatar-stage">
        <span className="profile-avatar-glow" />
        <img src={selected?.image} alt={selected?.name || '대표 몬스터'} />
        <b>LV.{progress.level}</b>
      </div>
      <div className="profile-identity">
        <small>{getHunterTitle(progress.level)}</small>
        <h2>{profile?.nickname || '헌터'}</h2>
        <p>대표 프로필 · {selected?.name}</p>
      </div>
      <div className="profile-xp"><span><i style={{ width: `${progress.percent}%` }} /></span><small>{progress.needed ? `${progress.current} / ${progress.needed} XP` : `${progress.total} XP · MAX`}</small></div>
    </section>

    <section className="profile-stats" aria-label="헌터 기록">
      <div><small>최고 점수</small><strong>{stats.bestScore.toLocaleString()}</strong></div>
      <div><small>최고 콤보</small><strong>{stats.bestCombo}</strong></div>
      <div><small>발견 몬스터</small><strong>{discoveredCount}/{monsterAvatars.length}</strong></div>
    </section>

    <section className="profile-edit">
      <div className="section-heading"><div><span className="overline">IDENTITY</span><h2>헌터 정보</h2></div></div>
      <label htmlFor="profile-nickname">닉네임</label>
      <div className="profile-name-input"><Icon name="user" size={19} /><input id="profile-nickname" value={nickname} onChange={(event) => { setNickname(event.target.value); setNotice('') }} maxLength={16} /></div>
    </section>

    <section className="profile-avatar-picker">
      <div className="section-heading"><div><span className="overline">PROFILE AVATAR</span><h2>프로필 이미지 선택</h2></div><small>{unlockedAvatarCount}개 획득</small></div>
      <p>성장 보상과 직접 발견하거나 격파한 몬스터를 프로필 이미지로 사용할 수 있어요.</p>
      <div className="profile-avatar-grid">
        {avatars.map((monster) => {
          const unlocked = isAvatarUnlocked(monster)
          const active = monster.image === avatarUrl
          return <button
            key={monster.id}
            className={`${active ? 'active' : ''} ${!unlocked ? 'locked' : ''}`}
            style={{ '--avatar-color': monster.color }}
            onClick={() => { if (unlocked) { setAvatarUrl(monster.image); setNotice('') } }}
            disabled={!unlocked}
            aria-label={unlocked ? `${monster.name} 선택` : `${monster.name} 잠김`}
          >
            <span><img src={monster.image} alt="" /></span>
            <small>{unlocked ? monster.name : '???'}</small>
            {active && <i><Icon name="check" size={13} /></i>}
            {!unlocked && <i><Icon name="lock" size={13} /></i>}
          </button>
        })}
      </div>
    </section>

    {notice && !notice.includes('저장했어요') && <p className="profile-notice">{notice}</p>}
    <button className={`btn btn-primary profile-save ${notice.includes('저장했어요') ? 'saved' : ''}`} onClick={saveProfile} disabled={saving}>{saving ? '저장 중...' : notice.includes('저장했어요') ? '✓ 프로필 저장 완료!' : '프로필 저장하기'}</button>
  </main>
}
