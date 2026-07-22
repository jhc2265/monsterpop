import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Home from './pages/Home'
import Game from './pages/Game'
import Result from './pages/Result'
import Ranking from './pages/Ranking'
import Community from './pages/Community'
import PostDetail from './pages/PostDetail'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="center-screen">불러오는 중…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Home /></Protected>} />
        <Route path="/game" element={<Protected><Game /></Protected>} />
        <Route path="/result" element={<Protected><Result /></Protected>} />
        <Route path="/ranking" element={<Protected><Ranking /></Protected>} />
        <Route path="/community" element={<Protected><Community /></Protected>} />
        <Route path="/community/:id" element={<Protected><PostDetail /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
