'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { PlatformBadge } from '@/components/PlatformBadge'
import { PostStatusBadge } from '@/components/StatusBadge'

interface PostDraft {
  id: string
  platform: 'INSTAGRAM' | 'THREADS' | 'NOTE'
  scheduledAt: string | null
  caption: string
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'
  brand: {
    handle: string
  }
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [drafts, setDrafts] = useState<PostDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [currentDate])

  const fetchDrafts = async () => {
    setLoading(true)
    try {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)

      const response = await fetch(
        `/api/drafts?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      )

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

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getDraftsForDay = (day: Date) => {
    return drafts.filter(draft =>
      draft.scheduledAt && isSameDay(new Date(draft.scheduledAt), day)
    )
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const today = () => setCurrentDate(new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Content Calendar
        </h1>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ← Prev
          </button>
          <button
            onClick={today}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">
          {format(currentDate, 'MMMM yyyy')}
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-600 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}

            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Calendar days */}
            {daysInMonth.map(day => {
              const dayDrafts = getDraftsForDay(day)
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate && isSameDay(day, selectedDate)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square border rounded-lg p-2 cursor-pointer transition-all
                    ${isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                    ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                    hover:border-blue-400 hover:shadow
                  `}
                >
                  <div className="text-sm font-semibold mb-1">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayDrafts.slice(0, 3).map(draft => (
                      <div
                        key={draft.id}
                        className="text-xs truncate bg-gray-100 dark:bg-gray-700 px-1 rounded"
                        title={draft.caption}
                      >
                        <PlatformBadge platform={draft.platform} />
                      </div>
                    ))}
                    {dayDrafts.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayDrafts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected day details */}
      {selectedDate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">
            Posts for {format(selectedDate, 'MMMM d, yyyy')}
          </h3>

          {getDraftsForDay(selectedDate).length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No posts scheduled for this day.</p>
          ) : (
            <div className="space-y-4">
              {getDraftsForDay(selectedDate).map(draft => (
                <div key={draft.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-2">
                      <PlatformBadge platform={draft.platform} />
                      <PostStatusBadge status={draft.status} />
                    </div>
                    <span className="text-sm text-gray-500">
                      {draft.scheduledAt && format(new Date(draft.scheduledAt), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                    {draft.caption}
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    @{draft.brand.handle}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
