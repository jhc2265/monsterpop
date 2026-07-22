import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // 배포 후 화면이 하얗게 뜨면 대부분 환경변수 누락입니다.
  console.error(
    '[Supabase] 환경변수가 없습니다. .env 파일 또는 Vercel 환경변수에 ' +
      'VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 를 설정하세요.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
