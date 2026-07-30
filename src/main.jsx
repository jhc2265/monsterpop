import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// iOS 사파리는 viewport 의 user-scalable=no 를 무시한다. 핀치 확대는 gesture 이벤트로,
// 더블탭 확대는 CSS touch-action 으로 막아야 둘 다 실제로 걸린다.
// passive: false 여야 preventDefault 가 먹는다.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (event) => event.preventDefault(), { passive: false })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
