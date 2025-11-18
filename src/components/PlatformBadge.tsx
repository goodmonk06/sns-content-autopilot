import { Platform } from '@prisma/client'

const platformStyles = {
  INSTAGRAM: 'bg-instagram/10 text-instagram border-instagram/20',
  THREADS: 'bg-threads/10 text-threads border-threads/20',
  NOTE: 'bg-note/10 text-note border-note/20',
}

const platformIcons = {
  INSTAGRAM: '📷',
  THREADS: '🧵',
  NOTE: '📝',
}

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${platformStyles[platform]}`}
    >
      <span>{platformIcons[platform]}</span>
      {platform.toLowerCase()}
    </span>
  )
}
