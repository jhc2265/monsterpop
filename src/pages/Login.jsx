import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user, navigate])

  function switchMode(next) { setMode(next); setError(''); setInfo('') }

  async function submit(event) {
    event.preventDefault(); setError(''); setInfo(''); sound.unlock(); sound.button(); setBusy(true)
    try {
      if (mode === 'signup') {
        if (nickname.trim().length < 2) { setError('닉네임은 2자 이상 입력해 주세요.'); return }
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { nickname: nickname.trim() } } })
        if (signUpError) throw signUpError
        if (data.session) navigate('/', { replace: true })
        else { setInfo('가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.'); setMode('login') }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        navigate('/', { replace: true })
      }
    } catch (err) { setError(translate(err.message)) } finally { setBusy(false) }
  }

  return <main className="page login-page">
    <div className="login-visual" aria-hidden="true">
      <span className="orb orb-one" /><span className="orb orb-two" />
      <img className="login-monster" src="/images/boss.png" alt="" />
    </div>
    <section className="login-logo">
      <div className="eyebrow"><Icon name="spark" size={14} /> 30초 몬스터 헌팅</div>
      <h1 className="title">MONSTER<span>POP</span></h1>
      <p className="sub">빠르게 사냥하고, 콤보를 쌓아<br />최고의 헌터에 도전하세요.</p>
    </section>
    <div className="tabs" role="tablist">
      <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>로그인</button>
      <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>회원가입</button>
    </div>
    <form onSubmit={submit} className="card form-card">
      {mode === 'signup' && <div className="field"><label htmlFor="nickname">닉네임</label><input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="랭킹에 표시할 이름" maxLength={16} /></div>}
      <div className="field"><label htmlFor="email">이메일</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></div>
      <div className="field"><label htmlFor="password">비밀번호</label><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상 입력" minLength={6} required /></div>
      {error && <div className="notice notice-error">{error}</div>}
      {info && <div className="notice notice-info">{info}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? '처리 중...' : mode === 'signup' ? '헌터로 등록하기' : '사냥 시작하기'}</button>
    </form>
    <button className="text-button login-switch" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
      {mode === 'login' ? '처음이신가요? 회원가입' : '이미 계정이 있나요? 로그인'}
    </button>
  </main>
}

function translate(message = '') {
  if (message.includes('Invalid login')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (message.includes('already registered')) return '이미 가입된 이메일입니다.'
  if (message.includes('Password should be')) return '비밀번호는 6자 이상이어야 합니다.'
  if (message.includes('Email not confirmed')) return '이메일 인증이 필요합니다.'
  return message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
