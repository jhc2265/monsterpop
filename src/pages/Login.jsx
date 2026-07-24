import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import Icon from '../components/Icon'

export default function Login({ initialMode = 'login' }) {
  const isLogin = initialMode === 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { if (user) navigate('/home', { replace: true }) }, [user, navigate])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setInfo('')
    sound.unlock()
    sound.button()
    setBusy(true)

    try {
      if (!isLogin) {
        if (nickname.trim().length < 2) {
          setError('닉네임을 2자 이상 입력해 주세요.')
          return
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname: nickname.trim() } },
        })
        if (signUpError) throw signUpError
        if (data.session) navigate('/home', { replace: true })
        else {
          setInfo('가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.')
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        if (remember) localStorage.setItem('monsterpop-remember-email', email)
        else localStorage.removeItem('monsterpop-remember-email')
        navigate('/home', { replace: true })
      }
    } catch (err) {
      setError(translate(err.message))
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    setError('')
    setInfo('')
    if (!email) {
      setError('비밀번호를 찾을 이메일을 먼저 입력해 주세요.')
      return
    }
    setBusy(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) throw resetError
      setInfo('비밀번호 재설정 메일을 보냈습니다.')
    } catch (err) {
      setError(translate(err.message))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (isLogin) setEmail(localStorage.getItem('monsterpop-remember-email') || '')
  }, [isLogin])

  return <main className="page login-page auth-page">
    <div className="login-ambient" aria-hidden="true">
      <span className="login-grid" />
      <span className="login-glow login-glow-left" />
      <span className="login-glow login-glow-right" />
    </div>

    <section className="auth-brand">
      <div className="auth-monster-wrap" aria-hidden="true">
        <span className="auth-monster-glow" />
        <img src="/images/boss.png" alt="" />
      </div>
      <h1>MONSTER<span>POP</span></h1>
      <div className="auth-welcome">
        <h2>{isLogin ? '다시 오셨군요!' : '새로운 헌터군요!'}</h2>
        <p>{isLogin ? '사냥 기록을 이어가세요.' : '헌터 정보를 등록하고 사냥을 시작하세요.'}</p>
      </div>
    </section>

    <form onSubmit={submit} className="auth-form">
      {!isLogin && <div className="field">
        <label htmlFor="nickname">닉네임</label>
        <div className="auth-input"><Icon name="spark" size={19} /><input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="헌터 닉네임" maxLength={16} required /></div>
      </div>}

      <div className="field">
        <label htmlFor="email">이메일</label>
        <div className="auth-input"><span className="auth-at">@</span><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
      </div>

      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <div className="auth-input"><Icon name="lock" size={20} /><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={6} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={21} /></button></div>
      </div>

      {isLogin && <div className="auth-options">
        <label className="remember-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span><Icon name="check" size={16} /></span> 로그인 상태 유지</label>
        <button type="button" onClick={resetPassword}>비밀번호 찾기 <b>›</b></button>
      </div>}

      {error && <div className="notice notice-error">{error}</div>}
      {info && <div className="notice notice-info">{info}</div>}

      <button className="auth-submit" disabled={busy}>
        <span>{busy ? '처리 중...' : isLogin ? '로그인하고 사냥하기' : '헌터로 가입하기'}</span>
        {!busy && <b>→</b>}
      </button>
    </form>

    <button className="auth-route-link" onClick={() => navigate(isLogin ? '/signup' : '/login')}>
      {isLogin ? <>처음이신가요? <strong>회원가입</strong></> : <>이미 계정이 있나요? <strong>로그인</strong></>} <span>›</span>
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
