import { MONSTERS } from './monsters'
import { getBossArchiveEntries } from './bosses'

export const DEFAULT_AVATAR_URL = '/images/ranking/default-hunter.webp'

const PROFILE_REWARD_AVATARS = [
  {
    id: 'avatar-shadow-hunter',
    name: '그림자 헌터',
    image: '/images/ranking/default-hunter.webp',
    color: '#a45cff',
    profileExtra: true,
    unlockLevel: 1,
  },
  {
    id: 'avatar-daily-mission',
    name: '데일리 미션 배지',
    image: '/images/rewards/level-2-daily-mission.webp',
    color: '#d76cff',
    profileExtra: true,
    unlockLevel: 2,
  },
  {
    id: 'avatar-boss-hunter',
    name: '보스 헌터 문장',
    image: '/images/rewards/level-10-boss-challenge.webp',
    color: '#ff4c9d',
    profileExtra: true,
    unlockLevel: 10,
  },
]

export function getProfileAvatarOptions() {
  return [
    ...PROFILE_REWARD_AVATARS,
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
