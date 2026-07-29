import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { haptics } from '../lib/haptics'
import { getPreferences, savePreferences } from '../lib/preferences'
import Icon from '../components/Icon'

// iOS 사파리는 Vibration API 자체가 없다. 켤 수는 있지만 아무 일도 안 일어나므로 미리 알려준다.
const supportsVibration = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export default function Settings() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [preferences, setPreferences] = useState(getPreferences)
  const [notice, setNotice] = useState('')

  // savePreferences 가 applyPreferences 를 거쳐 배경음·효과음·진동·모션을 한 번에 반영한다.
  useEffect(() => { savePreferences(preferences) }, [preferences])

  function toggle(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
  }

  function setValue(key, value) {
    setPreferences((current) => ({ ...current, [key]: value }))
  }

  async function resetPassword() {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/login` })
    setNotice(error ? error.message : '비밀번호 변경 링크를 이메일로 보냈어요.')
  }

  async function logout() {
    sound.button()
    await signOut()
    navigate('/login', { replace: true })
  }

  return <main className="page settings-page">
    <header className="topbar"><button className="icon-btn" onClick={() => navigate('/home')} aria-label="뒤로"><Icon name="back" /></button><div className="title-stack"><span className="overline">PREFERENCES</span><h1>설정</h1></div><span className="topbar-spacer" /></header>
    <button className="settings-profile" onClick={() => navigate('/profile')}><div className="avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.nickname || '헌')[0]}</div><div><strong>{profile?.nickname || '헌터'} 헌터님</strong><span>{user.email}</span></div><b>›</b></button>
    <SettingsGroup icon="sound" title="게임">
      <SettingToggle label="배경음악" checked={preferences.bgm} onChange={() => toggle('bgm')} />
      {preferences.bgm && <SettingSlider
        label="배경음 크기"
        value={preferences.bgmVolume ?? 1}
        onChange={(value) => setValue('bgmVolume', value)}
      />}
      <SettingToggle label="효과음" checked={preferences.effects} onChange={() => toggle('effects')} />
      <SettingToggle label="진동" checked={preferences.vibration} onChange={() => { toggle('vibration'); if (!preferences.vibration) haptics.hit() }} hint={supportsVibration ? undefined : '이 브라우저는 진동을 지원하지 않아요'} />
      <SettingToggle label="애니메이션 줄이기" checked={preferences.reduceMotion} onChange={() => toggle('reduceMotion')} />
    </SettingsGroup>
    <SettingsGroup icon="bell" title="알림">
      <SettingToggle label="일일 미션 알림" checked={preferences.missionNotifications} onChange={() => toggle('missionNotifications')} />
      <SettingToggle label="댓글 알림" checked={preferences.commentNotifications} onChange={() => toggle('commentNotifications')} />
      <SettingToggle label="랭킹 마감 알림" checked={preferences.rankingNotifications} onChange={() => toggle('rankingNotifications')} />
    </SettingsGroup>
    <SettingsGroup icon="user" title="계정">
      <SettingAction label="비밀번호 변경" onClick={resetPassword} />
      <SettingAction label="로그아웃" onClick={logout} />
    </SettingsGroup>
    <SettingsGroup icon="info" title="정보">
      <SettingAction label="이용약관" muted="준비 중" />
      <SettingAction label="개인정보처리방침" muted="준비 중" />
      <SettingAction label="앱 버전" muted="1.0.0" plain />
    </SettingsGroup>
    {notice && <div className="notice">{notice}</div>}
  </main>
}

function SettingsGroup({ icon, title, children }) {
  return <section className="settings-section"><h2><Icon name={icon} size={18} />{title}</h2><div className="settings-card">{children}</div></section>
}

function SettingToggle({ label, checked, onChange, hint }) {
  return <div className="setting-row"><span>{label}{hint && <em className="setting-hint">{hint}</em>}</span><button className={`switch ${checked ? 'on' : ''}`} onClick={onChange} role="switch" aria-checked={checked} aria-label={label}><i /></button></div>
}

// 배경음만 슬라이더를 둔다. 효과음은 0.1초짜리 톤이라 미세 조절 수요가 없고,
// 진동은 웹에서 세기 자체를 지정할 수 없다.
function SettingSlider({ label, value, onChange }) {
  const percent = Math.round(value * 100)
  return <div className="setting-row setting-row-slider">
    <span>{label}<em className="setting-hint">{percent}%</em></span>
    <input
      type="range"
      min="0"
      max="100"
      step="5"
      value={percent}
      onChange={(event) => onChange(Number(event.target.value) / 100)}
      aria-label={label}
    />
  </div>
}

function SettingAction({ label, muted, onClick, plain }) {
  return <button className="setting-row action" onClick={onClick} disabled={!onClick && !plain}><span>{label}</span><b>{muted || '›'}</b></button>
}
