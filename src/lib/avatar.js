import { MONSTERS } from './monsters'
import { getBossArchiveEntries } from './bosses'

export const DEFAULT_AVATAR_URL = '/images/monsters/slime.webp'

export function getProfileAvatarOptions() {
  return [
    ...MONSTERS.filter((monster) => monster.id !== 'boss'),
    ...getBossArchiveEntries(),
  ]
}

// 획득 몬스터 목록에 없는 예전 URL이나 삭제된 에셋은 기본 아바타로 되돌린다.
export function resolveAvatarUrl(avatarUrl) {
  return getProfileAvatarOptions().some((monster) => monster.image === avatarUrl)
    ? avatarUrl
    : DEFAULT_AVATAR_URL
}
