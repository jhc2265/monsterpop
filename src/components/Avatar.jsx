import { resolveAvatarUrl } from '../lib/avatar'

// 아바타는 랭킹·커뮤니티·댓글에서 같은 규칙으로 그려야 한다.
// 예전에는 커뮤니티와 댓글이 닉네임 첫 글자만 그려서, 프로필에서 고른 이미지가 반영되지 않았다.
// resolveAvatarUrl 을 거치는 것이 중요하다 — 도감에서 사라진 예전 URL 은 기본 아바타로 되돌려야 한다.
export default function Avatar({ avatarUrl, size }) {
  return <div className={size ? `avatar ${size}` : 'avatar'}>
    <img src={resolveAvatarUrl(avatarUrl)} alt="" />
  </div>
}
