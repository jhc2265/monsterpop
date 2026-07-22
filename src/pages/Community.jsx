import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { sound } from '../lib/sound'
import { timeAgo } from '../lib/format'

export default function Community() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWrite, setShowWrite] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('id, title, content, created_at, profiles(nickname)')
      .order('created_at', { ascending: false })
      .limit(50)
    setPosts(data || [])
    setLoading(false)
  }

  async function submit() {
    setError('')
    if (title.trim().length < 2 || content.trim().length < 2) {
      setError('제목과 내용을 입력하세요.')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
    })
    setBusy(false)
    if (error) {
      setError('작성 실패: ' + error.message)
      return
    }
    sound.button()
    setTitle('')
    setContent('')
    setShowWrite(false)
    load()
  }

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn" onClick={() => { sound.button(); navigate('/') }}>←</button>
        <h2>💬 커뮤니티</h2>
        <div style={{ width: 40 }} />
      </div>

      {loading ? (
        <p className="empty">불러오는 중…</p>
      ) : posts.length === 0 ? (
        <p className="empty">첫 글을 남겨보세요! 고득점 공략을 공유해요.</p>
      ) : (
        posts.map((p) => (
          <div key={p.id} className="post-item" onClick={() => { sound.button(); navigate(`/community/${p.id}`) }}>
            <h3>{p.title}</h3>
            <p className="muted" style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.4 }}>
              {p.content.length > 60 ? p.content.slice(0, 60) + '…' : p.content}
            </p>
            <div className="post-meta">
              <span>{p.profiles?.nickname || '익명'}</span>
              <span>·</span>
              <span>{timeAgo(p.created_at)}</span>
            </div>
          </div>
        ))
      )}

      <button className="fab" onClick={() => { sound.button(); setShowWrite(true) }}>＋</button>

      {showWrite && (
        <div className="modal-overlay" onClick={() => setShowWrite(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>글쓰기</h3>
            <label>제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" maxLength={60} />
            <label>내용</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="고득점 공략, 몬스터 추천 등 자유롭게!" />
            {error && <div className="error-text">{error}</div>}
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setShowWrite(false)}>취소</button>
              <button className="btn btn-primary" onClick={submit} disabled={busy}>
                {busy ? '등록 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
