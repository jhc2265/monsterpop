import { useLocation, useNavigate } from 'react-router-dom'
import { sound } from '../lib/sound'
import Icon from './Icon'

const items = [
  { path: '/home', label: '홈', icon: 'home' },
  { path: '/ranking', label: '랭킹', icon: 'trophy' },
  { path: '/game', label: '사냥', icon: 'sword', primary: true },
  { path: '/collection', label: '몬스터', icon: 'book' },
  { path: '/community', label: '커뮤니티', icon: 'chat' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  function move(path) {
    sound.unlock()
    sound.button()
    navigate(path)
  }

  return <nav className="bottom-nav" aria-label="주요 메뉴">
    {items.map((item) => <button key={item.path} className={`${location.pathname === item.path ? 'active' : ''} ${item.primary ? 'primary' : ''}`} onClick={() => move(item.path)} aria-current={location.pathname === item.path ? 'page' : undefined}>
      <span><Icon name={item.icon} size={item.primary ? 23 : 20} /></span>
      <small>{item.label}</small>
    </button>)}
  </nav>
}
