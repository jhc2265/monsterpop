import { Component } from 'react'
import Icon from './Icon'

// 렌더링 중 에러가 나도 앱 전체가 빈 화면이 되지 않도록,
// 친절한 폴백 화면을 보여주고 홈으로 복귀할 수 있게 합니다.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page">
          <div className="empty-state">
            <span className="empty-icon"><Icon name="info" size={26} /></span>
            <h3>문제가 발생했어요</h3>
            <p>화면을 불러오는 중 오류가 생겼어요.<br />홈으로 돌아가 다시 시도해 주세요.</p>
            <button
              className="btn btn-primary"
              style={{ maxWidth: 220, marginTop: 6 }}
              onClick={() => window.location.assign('/')}
            >
              홈으로 돌아가기
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
