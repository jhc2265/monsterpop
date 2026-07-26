import { useLocation, useNavigate } from 'react-router-dom'
import { sound } from '../lib/sound'

const items = [
  { path: '/home', label: '홈', image: '/images/ui/home.webp' },
  { path: '/ranking', label: '랭킹', image: '/images/ui/trophy.webp' },
  { path: '/game', label: '사냥', image: '/images/ui/hunt-swords.webp', primary: true },
  { path: '/collection', label: '몬스터', image: '/images/ui/book.webp' },
  { path: '/community', label: '커뮤니티', image: '/images/ui/community.webp' },
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
      <span><img src={item.image} alt="" /></span>
      <small>{item.label}</small>
    </button>)}
  </nav>
}
