import { supabase } from './supabase'

// PostgREST 임베드(`profiles(nickname)`, `post_likes(user_id)`)를 쓰지 않는 이유가 둘 있다.
//
// 1) posts 와 profiles 사이에 외래키가 둘 이상 걸려 있으면
//    "Could not embed because more than one relationship was found" 로 쿼리 전체가 실패한다.
//    관계를 힌트로 골라줄 수도 있지만 제약 이름에 의존하게 되고, 스키마가 또 바뀌면 같은 자리에서 깨진다.
// 2) 임베드가 실패하면 컬럼이 적은 폴백 쿼리로 넘어가는데 거기엔 좋아요가 없다.
//    그러면 모든 글이 "좋아요 0개"로 보이고, 그 상태에서 하트를 누르면 이미 누른 좋아요를
//    다시 INSERT 하게 된다. post_likes 의 기본키(post_id, user_id)에 걸려 조용히 롤백되니
//    목록에서만 좋아요가 안 눌리는 것처럼 보였다.
//
// 필요한 것만 따로 읽어 붙이면 스키마 상태와 상관없이 항상 같은 모양이 나온다.

export async function attachAuthors(rows) {
  const list = rows || []
  const ids = [...new Set(list.map((row) => row.user_id).filter(Boolean))]
  if (!ids.length) return list.map((row) => ({ ...row, profiles: row.profiles ?? null }))
  const { data } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', ids)
  const byId = new Map((data || []).map((profile) => [profile.id, profile]))
  return list.map((row) => ({ ...row, profiles: byId.get(row.user_id) || null }))
}

export async function attachAuthor(row) {
  if (!row) return row
  return (await attachAuthors([row]))[0]
}

export async function attachLikes(rows) {
  const list = rows || []
  const ids = list.map((row) => row.id).filter((id) => id !== undefined && id !== null)
  if (!ids.length) return list.map((row) => ({ ...row, post_likes: row.post_likes ?? [] }))
  const { data, error } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', ids)
  // 못 읽었으면 빈 배열로 덮지 않는다. 0개로 보이면 "아직 안 눌렀다"로 오판해 중복 INSERT 를 시도한다.
  if (error) return list.map((row) => ({ ...row, post_likes: row.post_likes ?? [] }))
  const byPost = new Map()
  for (const like of data || []) {
    if (!byPost.has(like.post_id)) byPost.set(like.post_id, [])
    byPost.get(like.post_id).push({ user_id: like.user_id })
  }
  return list.map((row) => ({ ...row, post_likes: byPost.get(row.id) || [] }))
}

// 댓글은 개수만 필요하다. 글마다 count 쿼리를 돌리면 50번 왕복하므로 id 목록으로 한 번에 읽고 센다.
export async function attachCommentCounts(rows) {
  const list = rows || []
  const ids = list.map((row) => row.id).filter((id) => id !== undefined && id !== null)
  if (!ids.length) return list.map((row) => ({ ...row, comment_count: row.comment_count ?? 0 }))
  const { data, error } = await supabase.from('comments').select('post_id').in('post_id', ids)
  if (error) return list.map((row) => ({ ...row, comment_count: row.comment_count ?? 0 }))
  const byPost = new Map()
  for (const comment of data || []) byPost.set(comment.post_id, (byPost.get(comment.post_id) || 0) + 1)
  return list.map((row) => ({ ...row, comment_count: byPost.get(row.id) || 0 }))
}

export async function attachPostMeta(rows) {
  return attachCommentCounts(await attachLikes(await attachAuthors(rows)))
}
