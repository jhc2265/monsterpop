import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { timeAgo } from '../lib/format'
import Icon from '../components/Icon'

export default function PostDetail() {
  const { id } = useParams(); const { user } = useAuth(); const navigate = useNavigate()
  const [post, setPost] = useState(null); const [comments, setComments] = useState([]); const [loading, setLoading] = useState(true); const [text, setText] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { load() }, [id])
  async function load() {
    setLoading(true)
    const withLikes = await supabase.from('posts').select('id, title, content, created_at, user_id, profiles(nickname), post_likes(user_id)').eq('id', id).single()
    if (!withLikes.error) setPost(withLikes.data)
    else { const { data } = await supabase.from('posts').select('id, title, content, created_at, user_id, profiles(nickname)').eq('id', id).single(); setPost(data ? { ...data, post_likes: [] } : null) }
    await loadComments(); setLoading(false)
  }
  async function toggleLike() {
    if (!post) return
    const mine = post.post_likes?.some((like) => like.user_id === user.id)
    const previous = post
    setPost({ ...post, post_likes: mine ? post.post_likes.filter((like) => like.user_id !== user.id) : [...(post.post_likes || []), { user_id: user.id }] })
    const result = mine
      ? await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      : await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
    if (result.error) setPost(previous)
    else sound.button()
  }
  async function loadComments() { const { data } = await supabase.from('comments').select('id, content, created_at, user_id, profiles(nickname)').eq('post_id', id).order('created_at', { ascending: true }); setComments(data || []) }
  async function addComment() { if (!text.trim() || busy) return; setBusy(true); const { error } = await supabase.from('comments').insert({ post_id: Number(id), user_id: user.id, content: text.trim() }); setBusy(false); if (!error) { sound.button(); setText(''); loadComments() } }
  async function deletePost() { if (!window.confirm('이 게시글을 삭제할까요?')) return; await supabase.from('posts').delete().eq('id', id); navigate('/community', { replace: true }) }
  if (loading) return <main className="page"><div className="empty-state"><span className="loader" />게시글을 불러오는 중...</div></main>
  if (!post) return <main className="page"><div className="empty-state"><h3>게시글을 찾을 수 없어요</h3><button className="btn btn-secondary" onClick={() => navigate('/community')}>목록으로</button></div></main>
  const liked = post.post_likes?.some((like) => like.user_id === user.id); const likeCount = post.post_likes?.length || 0
  return <main className="page post-detail-page">
    <header className="topbar"><button className="icon-btn" onClick={() => navigate('/community')} aria-label="뒤로"><Icon name="back" /></button><div className="title-stack"><span className="overline">HUNTER STORY</span><h1>게시글</h1></div><span className="topbar-spacer" /></header>
    <article className="detail-card"><div className="post-head"><div className="avatar small">{(post.profiles?.nickname || '헌')[0]}</div><div><strong>{post.profiles?.nickname || '익명 헌터'}</strong><small>{timeAgo(post.created_at)}</small></div></div><h2>{post.title}</h2><p>{post.content}</p><div className="detail-actions"><button className={`detail-like ${liked ? 'liked' : ''}`} onClick={toggleLike} aria-pressed={liked} aria-label={liked ? '좋아요 취소' : '좋아요'}><span className="detail-like-heart">♥</span> {likeCount}</button>{post.user_id === user.id && <button className="text-button danger" onClick={deletePost}>게시글 삭제</button>}</div></article>
    <section className="comments-section"><div className="section-heading"><h2>댓글 <span>{comments.length}</span></h2></div>{comments.length === 0 ? <p className="muted">첫 댓글을 남겨보세요.</p> : comments.map((comment) => <article key={comment.id} className="comment"><div className="avatar tiny">{(comment.profiles?.nickname || '헌')[0]}</div><div><div className="comment-meta"><strong>{comment.profiles?.nickname || '익명 헌터'}</strong><span>{timeAgo(comment.created_at)}</span></div><p>{comment.content}</p></div></article>)}</section>
    <div className="comment-composer"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="댓글을 입력하세요" onKeyDown={(e) => e.key === 'Enter' && addComment()} /><button onClick={addComment} disabled={busy || !text.trim()} aria-label="댓글 등록"><Icon name="send" size={19} /></button></div>
  </main>
}
