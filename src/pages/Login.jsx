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

  function switchMode(next) {
    setMode(next)
    setError('')
    setInfo('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setInfo('')
    sound.unlock()
    sound.button()
    setBusy(true)

    try {
      if (mode === 'signup') {
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
        if (data.session) navigate('/', { replace: true })
        else {
          setInfo('가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.')
          setMode('login')
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(translate(err.message))
    } finally {
      setBusy(false)
    }
  }

  const isLogin = mode === 'login'

  return <main className="page login-page">
    <div className="login-ambient" aria-hidden="true">
      <span className="login-grid" />
      <span className="login-glow login-glow-left" />
      <span className="login-glow login-glow-right" />
    </div>

    <section className="login-brand">
      <div className="login-kicker"><i /><span>30초 몬스터 헌팅</span><i /></div>
      <div className="login-visual" aria-hidden="true">
        <span className="monster-halo halo-outer" />
        <span className="monster-halo halo-inner" />
        <span className="spark spark-one">✦</span>
        <span className="spark spark-two">✦</span>
        <span className="spark spark-three">·</span>
        <img className="login-monster" src="/images/boss.png" alt="" />
      </div>
      <div className="login-logo">
        <h1 className="title">MONSTER<span>POP</span></h1>
        <p className="sub">몬스터를 사냥하고 콤보를 쌓아<br />최고의 헌터에 도전하세요.</p>
      </div>
    </section>

    <section className="auth-shell" aria-label={isLogin ? '로그인' : '회원가입'}>
      <div className="tabs auth-tabs" role="tablist" aria-label="계정 메뉴">
        <button type="button" role="tab" aria-selected={isLogin} className={isLogin ? 'active' : ''} onClick={() => switchMode('login')}>로그인</button>
        <button type="button" role="tab" aria-selected={!isLogin} className={!isLogin ? 'active' : ''} onClick={() => switchMode('signup')}>회원가입</button>
      </div>

      <form onSubmit={submit} className="login-form">
        {mode === 'signup' && <div className="field">
          <label htmlFor="nickname">닉네임</label>
          <div className="input-wrap"><span className="input-symbol">✦</span><input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="헌터 닉네임" maxLength={16} /></div>
        </div>}
        <div className="field">
          <label htmlFor="email">이메일</label>
          <div className="input-wrap"><span className="input-symbol">@</span><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
        </div>
        <div className="field">
          <label htmlFor="password">비밀번호</label>
          <div className="input-wrap"><span className="input-symbol">◆</span><input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상 입력" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={6} required /></div>
        </div>
        {error && <div className="notice notice-error">{error}</div>}
        {info && <div className="notice notice-info">{info}</div>}
        <button className="btn btn-primary login-submit" disabled={busy}>
          <span>{busy ? '처리 중...' : isLogin ? '사냥 시작하기' : '헌터로 등록하기'}</span>
          {!busy && <span className="submit-arrow">→</span>}
        </button>
      </form>
    </section>

    <button className="text-button login-switch" onClick={() => switchMode(isLogin ? 'signup' : 'login')}>
      {isLogin ? <>처음이신가요? <strong>회원가입</strong></> : <>이미 계정이 있나요? <strong>로그인</strong></>}
    </button>
    <div className="login-status"><i /> HUNT SERVER ONLINE</div>
  </main>
}

function translate(message = '') {
  if (message.includes('Invalid login')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (message.includes('already registered')) return '이미 가입된 이메일입니다.'
  if (message.includes('Password should be')) return '비밀번호는 6자 이상이어야 합니다.'
  if (message.includes('Email not confirmed')) return '이메일 인증이 필요합니다.'
  return message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
