import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { timeAgo } from '../lib/format'

export default function PostDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function load() {
    setLoading(true)
    const { data: p } = await supabase
      .from('posts')
      .select('id, title, content, created_at, user_id, profiles(nickname)')
      .eq('id', id)
      .single()
    setPost(p)
    await loadComments()
    setLoading(false)
  }

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('id, content, created_at, user_id, profiles(nickname)')
      .eq('post_id', id)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  async function addComment() {
    if (text.trim().length < 1) return
    setBusy(true)
    const { error } = await supabase.from('comments').insert({
      post_id: Number(id),
      user_id: user.id,
      content: text.trim(),
    })
    setBusy(false)
    if (!error) {
      sound.button()
      setText('')
      loadComments()
    }
  }

  async function deletePost() {
    if (!confirm('이 글을 삭제할까요?')) return
    await supabase.from('posts').delete().eq('id', id)
    navigate('/community', { replace: true })
  }

  if (loading) return <div className="page"><p className="empty">불러오는 중…</p></div>
  if (!post) return <div className="page"><p className="empty">글을 찾을 수 없어요.</p></div>

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn" onClick={() => { sound.button(); navigate('/community') }}>←</button>
        <h2>게시글</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className="card">
        <h2 style={{ margin: '0 0 8px' }}>{post.title}</h2>
        <div className="post-meta mb">
          <span>{post.profiles?.nickname || '익명'}</span>
          <span>·</span>
          <span>{timeAgo(post.created_at)}</span>
        </div>
        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{post.content}</p>
        {post.user_id === user.id && (
          <button className="link-btn mt" onClick={deletePost} style={{ color: 'var(--danger)' }}>
            삭제
          </button>
        )}
      </div>

      <h3 className="mt">댓글 {comments.length}</h3>
      {comments.length === 0 ? (
        <p className="muted" style={{ fontSize: 14 }}>첫 댓글을 남겨보세요.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="comment">
            <div className="meta">
              {c.profiles?.nickname || '익명'} · {timeAgo(c.created_at)}
            </div>
            <div>{c.content}</div>
          </div>
        ))
      )}

      <div className="spacer" style={{ minHeight: 12 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="댓글을 입력하세요…"
          style={{ marginBottom: 0 }}
          onKeyDown={(e) => e.key === 'Enter' && addComment()}
        />
        <button className="btn btn-primary" style={{ width: 80 }} onClick={addComment} disabled={busy}>
          등록
        </button>
      </div>
    </div>
  )
}
