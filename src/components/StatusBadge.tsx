import { IdeaStatus, PostStatus } from '@prisma/client'

const ideaStatusStyles = {
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  USED: 'bg-blue-100 text-blue-800 border-blue-300',
  ARCHIVED: 'bg-gray-100 text-gray-500 border-gray-300',
}

const postStatusStyles = {
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
  SCHEDULED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PUBLISHED: 'bg-green-100 text-green-800 border-green-300',
  FAILED: 'bg-red-100 text-red-800 border-red-300',
}

export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  return (
    <span
      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${ideaStatusStyles[status]}`}
    >
      {status.toLowerCase()}
    </span>
  )
}

export function PostStatusBadge({ status }: { status: PostStatus }) {
  return (
    <span
      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${postStatusStyles[status]}`}
    >
      {status.toLowerCase()}
    </span>
  )
}
