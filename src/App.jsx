import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Hero from './pages/Hero'
import Home from './pages/Home'
import Game from './pages/Game'
import Result from './pages/Result'
import Ranking from './pages/Ranking'
import Community from './pages/Community'
import PostDetail from './pages/PostDetail'
import Collection from './pages/Collection'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="center-screen"><span className="loader" />몬스터를 불러오는 중...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return <div className="app-container"><Routes>
    <Route path="/" element={<Hero />} />
    <Route path="/login" element={<Login initialMode="login" />} />
    <Route path="/signup" element={<Login initialMode="signup" />} />
    <Route path="/home" element={<Protected><Home /></Protected>} />
    <Route path="/game" element={<Protected><Game /></Protected>} />
    <Route path="/result" element={<Protected><Result /></Protected>} />
    <Route path="/ranking" element={<Protected><Ranking /></Protected>} />
    <Route path="/collection" element={<Protected><Collection /></Protected>} />
    <Route path="/community" element={<Protected><Community /></Protected>} />
    <Route path="/community/:id" element={<Protected><PostDetail /></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></div>
}
