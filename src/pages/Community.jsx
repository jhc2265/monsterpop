import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { timeAgo } from '../lib/format'
import Icon from '../components/Icon'
import BottomNav from '../components/BottomNav'

export default function Community() {
  const { user } = useAuth(); const navigate = useNavigate()
  const [posts, setPosts] = useState([]); const [loading, setLoading] = useState(true); const [showWrite, setShowWrite] = useState(false)
  const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [category, setCategory] = useState('자유'); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('전체'); const [search, setSearch] = useState('')
  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const enhanced = await supabase.from('posts').select('id, title, content, category, created_at, profiles(nickname), post_likes(user_id)').order('created_at', { ascending: false }).limit(50)
    if (!enhanced.error) setPosts(enhanced.data || [])
    else {
      const { data } = await supabase.from('posts').select('id, title, content, created_at, profiles(nickname)').order('created_at', { ascending: false }).limit(50)
      setPosts((data || []).map((post) => ({ ...post, category: '자유', post_likes: [] })))
    }
    setLoading(false)
  }
  async function submit() {
    setError(''); if (title.trim().length < 2 || content.trim().length < 2) { setError('제목과 내용을 2자 이상 입력해 주세요.'); return }
    setBusy(true)
    let { error: submitError } = await supabase.from('posts').insert({ user_id: user.id, title: title.trim(), content: content.trim(), category })
    if (submitError?.message?.includes('category')) ({ error: submitError } = await supabase.from('posts').insert({ user_id: user.id, title: title.trim(), content: content.trim() }))
    setBusy(false)
    if (submitError) { setError(`작성하지 못했습니다: ${submitError.message}`); return }
    sound.button(); setTitle(''); setContent(''); setShowWrite(false); load()
  }
  async function toggleLike(event, post) {
    event.stopPropagation()
    const mine = post.post_likes?.some((like) => like.user_id === user.id)
    const previous = posts
    setPosts((items) => items.map((item) => item.id === post.id ? { ...item, post_likes: mine ? item.post_likes.filter((like) => like.user_id !== user.id) : [...(item.post_likes || []), { user_id: user.id }] } : item))
    const result = mine
      ? await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      : await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
    if (result.error) setPosts(previous)
    else sound.button()
  }
  const normalizedSearch = search.trim().toLowerCase()
  const visiblePosts = posts.filter((post) => {
    const categoryMatch = activeCategory === '전체' || activeCategory === '인기' || (post.category || '자유') === activeCategory
    const searchMatch = !normalizedSearch || `${post.title} ${post.content} ${post.profiles?.nickname || ''}`.toLowerCase().includes(normalizedSearch)
    return categoryMatch && searchMatch
  }).sort((a, b) => activeCategory === '인기' ? (b.post_likes?.length || 0) - (a.post_likes?.length || 0) : 0)
  return <main className="page community-page">
    <header className="topbar"><button className="icon-btn" onClick={() => navigate('/home')} aria-label="뒤로"><Icon name="back" /></button><div className="title-stack"><span className="overline">HUNTER LOUNGE</span><h1>커뮤니티</h1></div><span className="topbar-spacer" /></header>
    <p className="community-intro">기록과 공략을 다른 헌터들과 공유해보세요.</p>
    <div className="community-search"><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="제목이나 헌터 이름 검색" /></div>
    <div className="filter-chips community-categories">{['전체', '인기', '공략', '기록 인증', '자유'].map((item) => <button key={item} className={activeCategory === item ? 'active' : ''} onClick={() => setActiveCategory(item)}>{item}</button>)}</div>
    {loading ? <div className="empty-state"><span className="loader" />게시글을 불러오는 중...</div> : visiblePosts.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="chat" /></span><h3>{posts.length ? '조건에 맞는 이야기가 없어요' : '첫 이야기를 기다리고 있어요'}</h3><p>{posts.length ? '검색어나 카테고리를 바꿔보세요.' : <>공략이나 멋진 기록을 공유해보세요.<br />아래 + 버튼으로 첫 글을 작성할 수 있어요.</>}</p></div> : <section className="post-list">{visiblePosts.map((post, index) => <article key={post.id} className="post-item" onClick={() => navigate(`/community/${post.id}`)}><div className="post-head"><div className="avatar small">{(post.profiles?.nickname || '헌')[0]}</div><div><strong>{post.profiles?.nickname || '익명 헌터'}</strong><small>{timeAgo(post.created_at)}</small></div><span className="pill post-category">{post.category || '자유'}</span>{index === 0 && activeCategory === '인기' && <span className="pill pill-best">BEST</span>}</div><h2>{post.title}</h2><p>{post.content.length > 90 ? `${post.content.slice(0, 90)}…` : post.content}</p><div className="post-footer"><button className={post.post_likes?.some((like) => like.user_id === user.id) ? 'liked' : ''} onClick={(event) => toggleLike(event, post)}>♥ {post.post_likes?.length || 0}</button><span><Icon name="chat" size={15} /> 이야기 보기</span><b>›</b></div></article>)}</section>}
    <button className="fab" onClick={() => { sound.button(); setShowWrite(true) }} aria-label="글쓰기"><Icon name="plus" size={25} /></button>
    {showWrite && <div className="modal-overlay" onClick={() => setShowWrite(false)}><section className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-handle" /><div className="modal-title"><div><span className="overline">NEW STORY</span><h2>새 글 작성</h2></div><button className="text-button" onClick={() => setShowWrite(false)}>닫기</button></div><div className="field"><label htmlFor="post-category">분류</label><select id="post-category" value={category} onChange={(e) => setCategory(e.target.value)}><option>공략</option><option>기록 인증</option><option>자유</option></select></div><div className="field"><label htmlFor="post-title">제목</label><input id="post-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="어떤 이야기를 나눌까요?" maxLength={60} /></div><div className="field"><label htmlFor="post-content">내용</label><textarea id="post-content" value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="공략, 기록, 몬스터 이야기 모두 좋아요." /></div>{error && <div className="notice notice-error">{error}</div>}<div className="btn-row"><button className="btn btn-secondary" onClick={() => setShowWrite(false)}>취소</button><button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? '등록 중...' : '게시하기'}</button></div></section></div>}
    <BottomNav />
  </main>
}
