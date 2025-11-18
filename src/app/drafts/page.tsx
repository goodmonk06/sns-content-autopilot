'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { PlatformBadge } from '@/components/PlatformBadge'
import { PostStatusBadge } from '@/components/StatusBadge'

interface PostDraft {
  id: string
  brandId: string
  platform: 'INSTAGRAM' | 'THREADS' | 'NOTE'
  scheduledAt: string | null
  caption: string
  mediaPlan: any
  hashtags: string[]
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'
  resultStats: any
  brand: {
    handle: string
    platform: string
  }
  idea?: {
    theme: string
  }
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<PostDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')
  const [selectedDraft, setSelectedDraft] = useState<PostDraft | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedCaption, setEditedCaption] = useState('')
  const [editedScheduledAt, setEditedScheduledAt] = useState('')

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/drafts')
      if (response.ok) {
        const data = await response.json()
        setDrafts(data)
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateDraft = async (id: string, updates: Partial<PostDraft>) => {
    try {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const updated = await response.json()
        setDrafts(drafts.map(draft => draft.id === id ? updated : draft))
        if (selectedDraft?.id === id) {
          setSelectedDraft(updated)
        }
        return updated
      }
    } catch (error) {
      console.error('Failed to update draft:', error)
    }
  }

  const schedulePost = async (id: string) => {
    const draft = drafts.find(d => d.id === id)
    if (!draft?.scheduledAt) {
      alert('Please set a scheduled time first')
      return
    }

    await updateDraft(id, { status: 'SCHEDULED' })
    alert('Post scheduled successfully!')
  }

  const saveEdit = async () => {
    if (!selectedDraft) return

    const updated = await updateDraft(selectedDraft.id, {
      caption: editedCaption,
      scheduledAt: editedScheduledAt || null
    })

    if (updated) {
      setEditMode(false)
      alert('Draft updated successfully!')
    }
  }

  const filteredDrafts = filter === 'ALL'
    ? drafts
    : drafts.filter(d => d.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Post Drafts
        </h1>
        <div className="flex gap-2">
          {['ALL', 'DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drafts List */}
          <div className="space-y-4">
            {filteredDrafts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No drafts found. Generate some from your ideas!
                </p>
              </div>
            ) : (
              filteredDrafts.map(draft => (
                <div
                  key={draft.id}
                  onClick={() => setSelectedDraft(draft)}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer transition-all ${
                    selectedDraft?.id === draft.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-2">
                      <PlatformBadge platform={draft.platform} />
                      <PostStatusBadge status={draft.status} />
                    </div>
                    {draft.scheduledAt && (
                      <span className="text-xs text-gray-500">
                        {format(new Date(draft.scheduledAt), 'MMM d, HH:mm')}
                      </span>
                    )}
                  </div>

                  {draft.idea && (
                    <div className="text-xs text-gray-500 mb-2">
                      💡 {draft.idea.theme}
                    </div>
                  )}

                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-2">
                    {draft.caption}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {draft.hashtags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-xs text-blue-600">
                        #{tag}
                      </span>
                    ))}
                    {draft.hashtags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{draft.hashtags.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    @{draft.brand.handle}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Draft Detail */}
          {selectedDraft && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-4 h-fit">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-2">
                  <PlatformBadge platform={selectedDraft.platform} />
                  <PostStatusBadge status={selectedDraft.status} />
                </div>
                {!editMode && (
                  <button
                    onClick={() => {
                      setEditMode(true)
                      setEditedCaption(selectedDraft.caption)
                      setEditedScheduledAt(
                        selectedDraft.scheduledAt
                          ? format(new Date(selectedDraft.scheduledAt), "yyyy-MM-dd'T'HH:mm")
                          : ''
                      )
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Caption</label>
                    <textarea
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Scheduled At</label>
                    <input
                      type="datetime-local"
                      value={editedScheduledAt}
                      onChange={(e) => setEditedScheduledAt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {selectedDraft.idea && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                      <div className="text-xs text-gray-500 mb-1">Content Idea</div>
                      <div className="font-medium">{selectedDraft.idea.theme}</div>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Caption</h3>
                    <p className="whitespace-pre-line text-gray-800 dark:text-gray-200">
                      {selectedDraft.caption}
                    </p>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Hashtags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedDraft.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded text-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Media Plan</h3>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                      <div>Type: {selectedDraft.mediaPlan.type}</div>
                      <div>Count: {selectedDraft.mediaPlan.count}</div>
                      <div className="mt-2">{selectedDraft.mediaPlan.description}</div>
                      {selectedDraft.mediaPlan.suggestions && (
                        <ul className="mt-2 space-y-1">
                          {selectedDraft.mediaPlan.suggestions.map((s: string, i: number) => (
                            <li key={i} className="text-xs">• {s}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {selectedDraft.scheduledAt && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Scheduled</h3>
                      <div className="text-lg font-semibold">
                        {format(new Date(selectedDraft.scheduledAt), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>
                  )}

                  {selectedDraft.resultStats && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Results</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Likes: {selectedDraft.resultStats.likes}</div>
                        <div>Comments: {selectedDraft.resultStats.comments}</div>
                        <div>Shares: {selectedDraft.resultStats.shares}</div>
                        <div>Reach: {selectedDraft.resultStats.reach}</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {selectedDraft.status === 'DRAFT' && selectedDraft.scheduledAt && (
                      <button
                        onClick={() => schedulePost(selectedDraft.id)}
                        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                      >
                        Schedule Post
                      </button>
                    )}
                    {selectedDraft.status === 'DRAFT' && !selectedDraft.scheduledAt && (
                      <div className="text-sm text-gray-500 text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                        Set a scheduled time to enable scheduling
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
