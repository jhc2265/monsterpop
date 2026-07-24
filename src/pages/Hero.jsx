import { useNavigate } from 'react-router-dom'
import { sound } from '../lib/sound'

export default function Hero() {
  const navigate = useNavigate()

  function enter(path) {
    sound.unlock()
    sound.button()
    navigate(path)
  }

  return <main className="hero-landing">
    <img className="hero-world-art" src="/images/hero-world-v2.png" alt="" />
    <div className="hero-world-shade" aria-hidden="true" />
    <div className="hero-stars" aria-hidden="true"><i /><i /><i /><i /></div>

    <section className="hero-landing-content">
      <div className="hero-landing-kicker"><span>⚡</span> 30초 몬스터 헌팅</div>
      <div className="hero-copy-block">
        <h1>MONSTER <span>POP</span></h1>
        <p>몬스터를 잡고, 콤보를 쌓아<br /><strong>랭킹을 정복하세요.</strong></p>
      </div>

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
