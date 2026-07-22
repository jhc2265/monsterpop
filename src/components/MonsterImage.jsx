import { useState } from 'react'

// 몬스터 PNG 를 표시하되, 파일이 없으면 컬러 원형 + 이모지 플레이스홀더로 대체.
// 덕분에 이미지가 아직 없어도 앱이 정상 작동합니다.
export default function MonsterImage({ monster, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed || !monster.image) {
    return (
      <div className={`ph ${className}`} style={{ background: monster.color }}>
        {monster.emoji}
      </div>
    )
  }
  return (
    <img
      src={monster.image}
      alt={monster.name}
      className={className}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
