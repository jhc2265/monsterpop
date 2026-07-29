import { supabase } from './supabase'

// posts 와 profiles 사이에 외래키가 둘 이상 걸려 있으면 PostgREST 임베드(`profiles(nickname)`)가
// "Could not embed because more than one relationship was found" 로 실패한다.
// 관계를 힌트로 골라줄 수도 있지만 제약 이름에 의존하게 되고, 스키마가 또 바뀌면 같은 자리에서 깨진다.
// 작성자만 따로 읽어 붙이면 관계가 몇 개든 상관없다.
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
