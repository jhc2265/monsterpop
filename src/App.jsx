import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Hero from './pages/Hero'
import Home from './pages/Home'
import Game from './pages/Game'
import Boss from './pages/Boss'
import BossSelect from './pages/BossSelect'
import Result from './pages/Result'
import Ranking from './pages/Ranking'
import Community from './pages/Community'
import PostDetail from './pages/PostDetail'
import Collection from './pages/Collection'
import Settings from './pages/Settings'
import Profile from './pages/Profile'
import ErrorBoundary from './components/ErrorBoundary'
import { applyPreferences, getPreferences } from './lib/preferences'
import { sound } from './lib/sound'

function Protected({ children }) {
  const { user, loading, syncing } = useAuth()
  if (loading) return <div className="center-screen"><span className="loader" />몬스터를 불러오는 중...</div>
  if (!user) return <Navigate to="/login" replace />
  // 미션·보스 기록은 렌더 도중 동기로 읽힌다. 서버 값을 캐시에 합치기 전에 그리면
  // 새 기기에서 LV.1 · 미션 0개가 한 번 스쳐 보인다.
  if (syncing) return <div className="center-screen"><span className="loader" />사냥 기록을 불러오는 중...</div>
  return children
}

export default function App() {
  const location = useLocation()
  const { user, syncing } = useAuth()

  // applyPreferences 하나가 배경음·효과음·진동·모션을 모두 반영한다.
  // 로그인 전에는 이 브라우저에 남은 값으로, 로그인 뒤에는 계정 설정으로 반영한다.
  // 동기화 중에 걸면 서버 설정이 도착하기 전 값으로 한 번 적용됐다가 바뀐다.
  useEffect(() => {
    if (syncing) return
    applyPreferences(getPreferences(user?.id))
  }, [user?.id, syncing])

  useEffect(() => {
    let scene = 'silent'
    // 보스 선택 화면은 로비 음악. startsWith 로 묶으면 /boss/:bossId(전투)까지
    // 로비로 잡혀 보스 BGM 을 덮어써서, 여기만 정확히 일치로 본다.
    if (location.pathname === '/boss') scene = 'lobby'
    else if (location.pathname === '/ranking') scene = 'ranking'
    else if (location.pathname === '/collection') scene = 'collection'
    else if (['/home', '/community', '/settings', '/profile'].some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`))) scene = 'lobby'
    sound.setScene(scene)
  }, [location.pathname])

  return <div className="app-container"><ErrorBoundary><Routes>
    <Route path="/" element={<Hero />} />
    <Route path="/login" element={<Login initialMode="login" />} />
    <Route path="/signup" element={<Login initialMode="signup" />} />
    <Route path="/home" element={<Protected><Home /></Protected>} />
    <Route path="/game" element={<Protected><Game /></Protected>} />
    <Route path="/boss" element={<Protected><BossSelect /></Protected>} />
    <Route path="/boss/:bossId" element={<Protected><Boss /></Protected>} />
    <Route path="/result" element={<Protected><Result /></Protected>} />
    <Route path="/ranking" element={<Protected><Ranking /></Protected>} />
    <Route path="/collection" element={<Protected><Collection /></Protected>} />
    <Route path="/community" element={<Protected><Community /></Protected>} />
    <Route path="/community/:id" element={<Protected><PostDetail /></Protected>} />
    <Route path="/settings" element={<Protected><Settings /></Protected>} />
    <Route path="/profile" element={<Protected><Profile /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></ErrorBoundary></div>
}
