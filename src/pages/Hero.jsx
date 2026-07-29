import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sound } from '../lib/sound'

// 로고를 이 횟수만큼 연속으로 눌러야 마스터 계정으로 들어간다.
// 간격 제한을 함께 둬서 아이가 화면을 두드리다 우연히 도달하는 일은 없게 한다.
const MASTER_TAPS = 7
const MASTER_TAP_GAP_MS = 700

export default function Hero() {
  const navigate = useNavigate()
  const tapsRef = useRef(0)
  const lastTapRef = useRef(0)
  const [master, setMaster] = useState({ status: 'idle', message: '' })

  function enter(path) {
    sound.unlock()
    sound.logoTheme()
    sound.button()
    navigate(path)
  }

  async function tapLogo() {
    // 프로덕션 빌드에서는 import.meta.env.DEV 가 false 로 치환돼 아래가 통째로 죽은 코드가 되고,
    // 도달할 수 없는 동적 import 라 masterAccount 모듈도 번들에서 빠진다.
    if (!import.meta.env.DEV) return
    if (master.status === 'working') return
    const now = Date.now()
    tapsRef.current = now - lastTapRef.current > MASTER_TAP_GAP_MS ? 1 : tapsRef.current + 1
    lastTapRef.current = now

    const left = MASTER_TAPS - tapsRef.current
    // 절반쯤 왔을 때부터만 남은 횟수를 알려준다. 그 전에는 아무 흔적도 남기지 않는다.
    if (left > 0) {
      setMaster({ status: 'idle', message: tapsRef.current >= 4 ? `${left}번 더...` : '' })
      return
    }

    tapsRef.current = 0
    setMaster({ status: 'working', message: '마스터 계정 준비 중...' })
    try {
      const { enterMasterAccount, MASTER_EMAIL } = await import('../lib/masterAccount')
      const result = await enterMasterAccount()
      sound.unlock()
      if (!result.profileSynced) setMaster({ status: 'done', message: '서버 저장은 실패했지만 로컬 진행도로 입장합니다' })
      else setMaster({ status: 'done', message: `${MASTER_EMAIL} 로 입장합니다` })
      navigate('/home', { replace: true })
    } catch (error) {
      setMaster({ status: 'error', message: error.message })
    }
  }

  return <main className="hero-landing">
    <img className="hero-world-art" src="/images/bg/hero-world.webp" alt="" />
    <div className="hero-world-shade" aria-hidden="true" />
    <div className="hero-stars" aria-hidden="true"><i /><i /><i /><i /></div>

    <section className="hero-landing-content">
      <div className="hero-landing-kicker"><span>⚡</span> 30초 몬스터 헌팅</div>
      <div className="hero-copy-block">
        {/* 로고 자체가 숨은 진입점이다. 겉보기에는 그냥 제목이라 아무 표시도 하지 않는다. */}
        <h1 onClick={tapLogo}>MONSTER <span>POP</span></h1>
        <p>몬스터를 잡고, 콤보를 쌓아<br /><strong>랭킹을 정복하세요.</strong></p>
      </div>

      {master.message && <p className={`hero-master-note ${master.status}`} role="status">{master.message}</p>}

      <div className="hero-actions">
        <button className="hero-start-button" onClick={() => enter('/login')}>
          <span>지금 사냥 시작하기</span>
          <b aria-hidden="true">→</b>
        </button>
        <button className="hero-login-link" onClick={() => enter('/login')}>
          이미 계정이 있나요? <strong>로그인</strong> <span>›</span>
        </button>
      </div>
    </section>
  </main>
}
