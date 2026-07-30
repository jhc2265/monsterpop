import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { timeAgo } from '../lib/format'
import { attachAuthors, attachPostMeta } from '../lib/postJoins'
import Icon from '../components/Icon'
import Avatar from '../components/Avatar'

export default function PostDetail() {
  const { id } = useParams(); const { user } = useAuth(); const navigate = useNavigate()
  const [post, setPost] = useState(null); const [comments, setComments] = useState([]); const [loading, setLoading] = useState(true); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(false); const [draft, setDraft] = useState({ title: '', content: '' }); const [editError, setEditError] = useState('')
  useEffect(() => { load() }, [id])
  async function load() {
    setLoading(true); setLoadError('')
    // 작성자·좋아요는 임베드하지 않는다 — posts↔profiles 관계가 여러 개라 PostgREST 가 조인을 못 고른다.
    const result = await supabase.from('posts').select('id, title, content, created_at, user_id').eq('id', id).single()
    if (result.error) { setPost(null); setLoadError(`게시글을 불러오지 못했습니다: ${result.error.message}`) }
    else setPost((await attachPostMeta([result.data]))[0])
    await loadComments(); setLoading(false)
  }
  function startEdit() {
    sound.button()
    setDraft({ title: post.title, content: post.content })
    setEditError('')
    setEditing(true)
  }
  async function saveEdit() {
    const title = draft.title.trim(); const content = draft.content.trim()
    if (title.length < 2 || content.length < 2) { setEditError('제목과 내용을 2자 이상 입력해 주세요.'); return }
    setBusy(true)
    // 수정한 행을 되읽어 화면에 반영한다. RLS 가 막으면 여기서 드러난다.
    const { data, error } = await supabase.from('posts').update({ title, content }).eq('id', post.id).select('id, title, content, created_at, user_id').single()
    setBusy(false)
    if (error) { setEditError(`수정하지 못했습니다: ${error.message}`); return }
    sound.button()
    setPost((current) => ({ ...current, ...data }))
    setEditing(false)
  }
  async function toggleLike() {
    if (!post) return
    const mine = post.post_likes?.some((like) => like.user_id === user.id)
    const previous = post
    setPost({ ...post, post_likes: mine ? post.post_likes.filter((like) => like.user_id !== user.id) : [...(post.post_likes || []), { user_id: user.id }] })
    const result = mine
      ? await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      : await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
    // 23505 는 기본키 중복 — 이미 눌러둔 좋아요라 실패가 아니다.
    if (result.error && result.error.code !== '23505') { setPost(previous); setLoadError(`좋아요를 반영하지 못했습니다: ${result.error.message}`); return }
    setLoadError('')
    sound.button()
  }
  async function loadComments() { const { data } = await supabase.from('comments').select('id, content, created_at, user_id').eq('post_id', id).order('created_at', { ascending: true }); setComments(await attachAuthors(data)) }
  async function addComment() { if (!text.trim() || busy) return; setBusy(true); const { error } = await supabase.from('comments').insert({ post_id: Number(id), user_id: user.id, content: text.trim() }); setBusy(false); if (!error) { sound.button(); setText(''); loadComments() } }
  async function deletePost() { if (!window.confirm('이 게시글을 삭제할까요?')) return; await supabase.from('posts').delete().eq('id', id); navigate('/community', { replace: true }) }
  if (loading) return <main className="page"><div className="empty-state"><span className="loader" />게시글을 불러오는 중...</div></main>
  if (!post) return <main className="page">{loadError && <div className="notice notice-error">{loadError}</div>}<div className="empty-state"><h3>게시글을 찾을 수 없어요</h3><button className="btn btn-secondary" onClick={() => navigate('/community')}>목록으로</button></div></main>
  const liked = post.post_likes?.some((like) => like.user_id === user.id); const likeCount = post.post_likes?.length || 0
  return <main className="page post-detail-page">
    <header className="topbar"><button className="icon-btn" onClick={() => navigate('/community')} aria-label="뒤로"><Icon name="back" /></button><div className="title-stack"><span className="overline">HUNTER STORY</span><h1>게시글</h1></div><span className="topbar-spacer" /></header>
    {loadError && <div className="notice notice-error">{loadError}</div>}
    <article className="detail-card">
      <div className="post-head"><Avatar avatarUrl={post.profiles?.avatar_url} size="small" /><div><strong>{post.profiles?.nickname || '익명 헌터'}</strong><small>{timeAgo(post.created_at)}</small></div></div>
      {editing ? <div className="detail-edit">
        <div className="field"><label htmlFor="edit-title">제목</label><input id="edit-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={60} /></div>
        <div className="field"><label htmlFor="edit-content">내용</label><textarea id="edit-content" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} rows={6} /></div>
        {editError && <div className="notice notice-error">{editError}</div>}
        <div className="btn-row"><button className="btn btn-secondary" onClick={() => { sound.button(); setEditing(false) }}>취소</button><button className="btn btn-primary" onClick={saveEdit} disabled={busy}>{busy ? '저장 중...' : '저장'}</button></div>
      </div> : <>
        <h2>{post.title}</h2>
        <p>{post.content}</p>
      </>}
      {/* 좋아요·수정·삭제는 글을 읽는 데 곁들이는 것들이라 본문보다 작고 조용해야 한다. */}
      {!editing && <div className="detail-actions">
        <button className={`detail-like ${liked ? 'liked' : ''}`} onClick={toggleLike} aria-pressed={liked} aria-label={liked ? '좋아요 취소' : '좋아요'}><span className="detail-like-heart">♥</span> {likeCount}</button>
        {post.user_id === user.id && <div className="detail-owner-actions">
          <button className="text-button" onClick={startEdit}>수정</button>
          <button className="text-button danger" onClick={deletePost}>삭제</button>
        </div>}
      </div>}
    </article>
    <section className="comments-section"><div className="section-heading"><h2>댓글 <span>{comments.length}</span></h2></div>{comments.length === 0 ? <p className="muted">첫 댓글을 남겨보세요.</p> : comments.map((comment) => <article key={comment.id} className="comment"><Avatar avatarUrl={comment.profiles?.avatar_url} size="tiny" /><div><div className="comment-meta"><strong>{comment.profiles?.nickname || '익명 헌터'}</strong><span>{timeAgo(comment.created_at)}</span></div><p>{comment.content}</p></div></article>)}</section>
    <div className="comment-composer"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="댓글을 입력하세요" onKeyDown={(e) => e.key === 'Enter' && addComment()} /><button onClick={addComment} disabled={busy || !text.trim()} aria-label="댓글 등록"><Icon name="send" size={19} /></button></div>
  </main>
}
