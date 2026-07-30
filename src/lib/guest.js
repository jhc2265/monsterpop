// 가입 없이 게임을 체험하는 모드.
//
// Supabase 익명 로그인을 쓰지 않는다. 그러면 방문자마다 실제 auth.users 행이 생겨
// 커뮤니티 글쓰기 권한이 그대로 붙고(스팸), 랭킹이 오염되고, 무료 플랜 MAU 를 잡아먹는다.
// 대신 서버 계정 없이 이 기기에서만 도는 가짜 신원을 쓴다.
//
// 진행도 · 미션 · 보스 기록 · 설정 · 튜토리얼은 전부 userId 로 키를 만드는
// localStorage 기반이라, 이 id 를 끼워 넣기만 하면 게임 자체는 그대로 동작한다.
// 막아야 하는 건 서버로 나가는 읽기·쓰기뿐이다.
export const GUEST_ID = 'guest'

// user_id 컬럼은 uuid 라 'guest' 를 넣으면 형변환 에러가 난다.
// 서버에 닿는 코드는 반드시 이 검사를 먼저 통과해야 한다.
export function isGuest(userId) {
  return userId === GUEST_ID
}

export const GUEST_PROFILE = {
  id: GUEST_ID,
  nickname: '게스트',
  avatar_url: null,
  // xp · discovered_monsters 를 일부러 비워 둔다.
  // progression.resolveProgress 가 값이 없으면 localStorage 로 떨어지므로,
  // 게스트 진행도는 그 폴백 경로를 그대로 타면 된다.
}

const FLAG_KEY = 'monsterpop-guest'

export function readGuestFlag() {
  try { return localStorage.getItem(FLAG_KEY) === '1' } catch { return false }
}

export function writeGuestFlag(on) {
  try {
    if (on) localStorage.setItem(FLAG_KEY, '1')
    else localStorage.removeItem(FLAG_KEY)
  } catch { /* 저장 실패는 무시 */ }
}
