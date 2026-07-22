import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { timeAgo } from '../lib/format'
import Icon from '../components/Icon'

export default function Community() {
  const { user } = useAuth(); const navigate = useNavigate()
  const [posts, setPosts] = useState([]); const [loading, setLoading] = useState(true); const [showWrite, setShowWrite] = useState(false)
  const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  useEffect(() => { load() }, [])
  async function load() { setLoading(true); const { data } = await supabase.from('posts').select('id, title, content, created_at, profiles(nickname)').order('created_at', { ascending: false }).limit(50); setPosts(data || []); setLoading(false) }
  async function submit() {
    setError(''); if (title.trim().length < 2 || content.trim().length < 2) { setError('제목과 내용을 2자 이상 입력해 주세요.'); return }
    setBusy(true); const { error: submitError } = await supabase.from('posts').insert({ user_id: user.id, title: title.trim(), content: content.trim() }); setBusy(false)
    if (submitError) { setError(`작성하지 못했습니다: ${submitError.message}`); return }
    sound.button(); setTitle(''); setContent(''); setShowWrite(false); load()
  }
  return <main className="page community-page">
    <header className="topbar"><button className="icon-btn" onClick={() => navigate('/')} aria-label="뒤로"><Icon name="back" /></button><div className="title-stack"><span className="overline">HUNTER LOUNGE</span><h1>커뮤니티</h1></div><span className="topbar-spacer" /></header>
    <div className="community-banner"><span className="banner-icon"><Icon name="chat" /></span><div><strong>헌터들의 라운지</strong><p>기록과 공략을 자유롭게 나눠보세요.</p></div></div>
    {loading ? <div className="empty-state"><span className="loader" />게시글을 불러오는 중...</div> : posts.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="chat" /></span><h3>첫 이야기를 기다리고 있어요</h3><p>공략이나 멋진 기록을 공유해 보세요.</p></div> : <section className="post-list">{posts.map((post, index) => <article key={post.id} className="post-item" onClick={() => navigate(`/community/${post.id}`)}><div className="post-head"><div className="avatar small">{(post.profiles?.nickname || '헌')[0]}</div><div><strong>{post.profiles?.nickname || '익명 헌터'}</strong><small>{timeAgo(post.created_at)}</small></div>{index === 0 && <span className="pill pill-best">BEST</span>}</div><h2>{post.title}</h2><p>{post.content.length > 90 ? `${post.content.slice(0, 90)}…` : post.content}</p><div className="post-footer"><span><Icon name="chat" size={15} /> 이야기 보기</span><b>›</b></div></article>)}</section>}
    <button className="fab" onClick={() => { sound.button(); setShowWrite(true) }} aria-label="글쓰기"><Icon name="plus" size={25} /></button>
    {showWrite && <div className="modal-overlay" onClick={() => setShowWrite(false)}><section className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-handle" /><div className="modal-title"><div><span className="overline">NEW STORY</span><h2>새 글 작성</h2></div><button className="text-button" onClick={() => setShowWrite(false)}>닫기</button></div><div className="field"><label htmlFor="post-title">제목</label><input id="post-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="어떤 이야기를 나눌까요?" maxLength={60} /></div><div className="field"><label htmlFor="post-content">내용</label><textarea id="post-content" value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="공략, 기록, 몬스터 이야기 모두 좋아요." /></div>{error && <div className="notice notice-error">{error}</div>}<div className="btn-row"><button className="btn btn-secondary" onClick={() => setShowWrite(false)}>취소</button><button className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? '등록 중...' : '게시하기'}</button></div></section></div>}
  </main>
}
