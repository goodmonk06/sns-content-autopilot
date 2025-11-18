'use client'

import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { PlatformBadge } from '@/components/PlatformBadge'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface PostDraft {
  id: string
  platform: 'INSTAGRAM' | 'THREADS' | 'NOTE'
  publishedAt: string | null
  caption: string
  resultStats: {
    likes: number
    comments: number
    shares: number
    reach: number
    impressions: number
  } | null
  brand: {
    handle: string
  }
}

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<PostDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30) // days

  useEffect(() => {
    fetchPosts()
  }, [timeRange])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const startDate = subDays(new Date(), timeRange)
      const response = await fetch(
        `/api/drafts?status=PUBLISHED&startDate=${startDate.toISOString()}`
      )

      if (response.ok) {
        const data = await response.json()
        setPosts(data.filter((p: PostDraft) => p.resultStats))
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary stats
  const totalPosts = posts.length
  const totalLikes = posts.reduce((sum, p) => sum + (p.resultStats?.likes || 0), 0)
  const totalComments = posts.reduce((sum, p) => sum + (p.resultStats?.comments || 0), 0)
  const totalReach = posts.reduce((sum, p) => sum + (p.resultStats?.reach || 0), 0)
  const avgEngagement = totalPosts > 0
    ? ((totalLikes + totalComments) / totalPosts).toFixed(1)
    : 0

  // Group by platform
  const platformStats = posts.reduce((acc, post) => {
    if (!acc[post.platform]) {
      acc[post.platform] = {
        platform: post.platform,
        posts: 0,
        likes: 0,
        comments: 0,
        reach: 0
      }
    }

    acc[post.platform].posts++
    acc[post.platform].likes += post.resultStats?.likes || 0
    acc[post.platform].comments += post.resultStats?.comments || 0
    acc[post.platform].reach += post.resultStats?.reach || 0

    return acc
  }, {} as Record<string, any>)

  const platformData = Object.values(platformStats)

  // Time series data (group by day)
  const timeSeriesData = posts.reduce((acc, post) => {
    if (!post.publishedAt) return acc

    const date = format(new Date(post.publishedAt), 'MMM dd')
    if (!acc[date]) {
      acc[date] = {
        date,
        likes: 0,
        comments: 0,
        reach: 0
      }
    }

    acc[date].likes += post.resultStats?.likes || 0
    acc[date].comments += post.resultStats?.comments || 0
    acc[date].reach += post.resultStats?.reach || 0

    return acc
  }, {} as Record<string, any>)

  const chartData = Object.values(timeSeriesData).slice(-14) // Last 14 days

  // Top performing posts
  const topPosts = [...posts]
    .sort((a, b) => {
      const aEngagement = (a.resultStats?.likes || 0) + (a.resultStats?.comments || 0)
      const bEngagement = (b.resultStats?.likes || 0) + (b.resultStats?.comments || 0)
      return bEngagement - aEngagement
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Analytics
        </h1>
        <div className="flex gap-2">
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-3 py-1 rounded-lg text-sm ${
                timeRange === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Total Posts</div>
              <div className="text-3xl font-bold">{totalPosts}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Total Likes</div>
              <div className="text-3xl font-bold">{totalLikes.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Total Reach</div>
              <div className="text-3xl font-bold">{totalReach.toLocaleString()}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Avg Engagement</div>
              <div className="text-3xl font-bold">{avgEngagement}</div>
            </div>
          </div>

          {/* Engagement Over Time */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Engagement Over Time</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="likes" stroke="#E4405F" strokeWidth={2} />
                  <Line type="monotone" dataKey="comments" stroke="#41C9B4" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available for this time range</p>
            )}
          </div>

          {/* Platform Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Performance by Platform</h2>
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="likes" fill="#E4405F" />
                  <Bar dataKey="comments" fill="#41C9B4" />
                  <Bar dataKey="reach" fill="#000000" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>

          {/* Top Performing Posts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Top Performing Posts</h2>
            {topPosts.length > 0 ? (
              <div className="space-y-4">
                {topPosts.map(post => {
                  const engagement = (post.resultStats?.likes || 0) + (post.resultStats?.comments || 0)
                  return (
                    <div key={post.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <PlatformBadge platform={post.platform} />
                        <div className="text-right">
                          <div className="text-lg font-bold">{engagement}</div>
                          <div className="text-xs text-gray-500">total engagement</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                        {post.caption}
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                        <div>❤️ {post.resultStats?.likes}</div>
                        <div>💬 {post.resultStats?.comments}</div>
                        <div>🔄 {post.resultStats?.shares}</div>
                        <div>👁️ {post.resultStats?.reach}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No published posts yet</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
