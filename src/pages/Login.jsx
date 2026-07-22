import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    sound.unlock()
    sound.button()
    setBusy(true)
    try {
      if (mode === 'signup') {
        if (nickname.trim().length < 2) {
          setError('닉네임은 2자 이상 입력하세요.')
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nickname: nickname.trim() } },
        })
        if (error) throw error
        if (data.session) {
          navigate('/', { replace: true })
        } else {
          setInfo(
            '가입 완료! 이메일 인증이 켜져 있으면 메일함을 확인하세요. ' +
              '바로 로그인하려면 로그인 탭을 이용하세요.'
          )
          setMode('login')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        navigate('/', { replace: true })
      }
    } catch (err) {
      setError(translate(err.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="login-logo">
        <div className="title">AI 몬스터<br />사냥 랭킹 게임</div>
        <div className="sub">30초, 짜릿한 한판 승부! 최고의 헌터에 도전하세요.</div>
      </div>

      <div className="tabs">
        <button
          className={mode === 'login' ? 'active' : ''}
          onClick={() => { setMode('login'); setError(''); }}
        >
          로그인
        </button>
        <button
          className={mode === 'signup' ? 'active' : ''}
          onClick={() => { setMode('signup'); setError(''); }}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={submit} className="card">
        {mode === 'signup' && (
          <>
            <label>닉네임</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="랭킹에 표시될 이름"
              maxLength={16}
            />
          </>
        )}
        <label>이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <label>비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6자 이상"
          minLength={6}
          required
        />
        {error && <div className="error-text">{error}</div>}
        {info && <div className="muted" style={{ marginBottom: 12 }}>{info}</div>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? '처리 중…' : mode === 'signup' ? '회원가입' : '로그인'}
        </button>
      </form>

      <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginTop: 18 }}>
        {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
        <button
          className="link-btn"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? '회원가입' : '로그인'}
        </button>
      </p>
    </div>
  )
}

function translate(msg = '') {
  if (msg.includes('Invalid login')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (msg.includes('already registered')) return '이미 가입된 이메일입니다.'
  if (msg.includes('Password should be')) return '비밀번호는 6자 이상이어야 합니다.'
  if (msg.includes('Email not confirmed'))
    return '이메일 인증이 필요합니다. 메일함을 확인하거나 인증을 꺼주세요.'
  return msg || '오류가 발생했습니다.'
}
