'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { PlatformBadge } from '@/components/PlatformBadge'
import { IdeaStatusBadge } from '@/components/StatusBadge'

interface BrandAccount {
  id: string
  platform: 'INSTAGRAM' | 'THREADS' | 'NOTE'
  handle: string
  toneProfile: any
}

interface ContentIdea {
  id: string
  brandId: string
  date: string
  theme: string
  hook: string
  outline: string
  status: 'DRAFT' | 'APPROVED' | 'USED' | 'ARCHIVED'
  brand: BrandAccount
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [brands, setBrands] = useState<BrandAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [theme, setTheme] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [ideaCount, setIdeaCount] = useState(3)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ideasRes, brandsRes] = await Promise.all([
        fetch('/api/ideas'),
        fetch('/api/brands')
      ])

      if (ideasRes.ok) {
        const ideasData = await ideasRes.json()
        setIdeas(ideasData)
      }

      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        setBrands(brandsData)
        if (brandsData.length > 0 && !selectedBrandId) {
          setSelectedBrandId(brandsData[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateIdeas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrandId || !theme || !targetDate) return

    setGenerating(true)
    try {
      const response = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrandId,
          theme,
          date: targetDate,
          count: ideaCount
        })
      })

      if (response.ok) {
        const data = await response.json()
        setIdeas([...data.ideas, ...ideas])
        setShowGenerateModal(false)
        setTheme('')
        setTargetDate('')
        setIdeaCount(3)
      } else {
        const error = await response.json()
        alert('Failed to generate ideas: ' + error.error)
      }
    } catch (error) {
      console.error('Failed to generate ideas:', error)
      alert('Failed to generate ideas')
    } finally {
      setGenerating(false)
    }
  }

  const updateIdeaStatus = async (id: string, newStatus: ContentIdea['status']) => {
    try {
      const response = await fetch(`/api/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const updated = await response.json()
        setIdeas(ideas.map(idea => idea.id === id ? updated : idea))
      }
    } catch (error) {
      console.error('Failed to update idea:', error)
    }
  }

  const createDraft = async (ideaId: string) => {
    try {
      const idea = ideas.find(i => i.id === ideaId)
      if (!idea) return

      const response = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId,
          scheduledAt: idea.date
        })
      })

      if (response.ok) {
        alert('Draft generated successfully! Check the Drafts page.')
        fetchData() // Refresh to update idea status
      } else {
        const error = await response.json()
        alert('Failed to generate draft: ' + error.error)
      }
    } catch (error) {
      console.error('Failed to create draft:', error)
      alert('Failed to create draft')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Content Ideas
        </h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Generate Ideas
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No content ideas yet. Start by generating some!
          </p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate Ideas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {ideas.map(idea => (
            <div key={idea.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-2">
                  <PlatformBadge platform={idea.brand.platform} />
                  <IdeaStatusBadge status={idea.status} />
                </div>
                <span className="text-sm text-gray-500">
                  {format(new Date(idea.date), 'MMM d, yyyy')}
                </span>
              </div>

              <h3 className="text-xl font-semibold mb-2">{idea.theme}</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3 italic">"{idea.hook}"</p>
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line mb-4">
                {idea.outline}
              </div>

              <div className="flex gap-2 text-xs text-gray-500 mb-4">
                <span>@{idea.brand.handle}</span>
              </div>

              <div className="flex gap-2">
                {idea.status === 'DRAFT' && (
                  <>
                    <button
                      onClick={() => updateIdeaStatus(idea.id, 'APPROVED')}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => createDraft(idea.id)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Generate Draft
                    </button>
                  </>
                )}
                {idea.status === 'APPROVED' && (
                  <button
                    onClick={() => createDraft(idea.id)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Generate Draft
                  </button>
                )}
                <button
                  onClick={() => updateIdeaStatus(idea.id, 'ARCHIVED')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Generate Content Ideas</h2>
            <form onSubmit={generateIdeas} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand Account</label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  required
                >
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.platform} - @{brand.handle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Theme</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g., Morning routines for productivity"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Number of Ideas</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={ideaCount}
                  onChange={(e) => setIdeaCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={generating}
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
