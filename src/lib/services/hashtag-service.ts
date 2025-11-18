/**
 * Hashtag Service
 *
 * Business logic for managing hashtag sets and strategy
 */

import { prisma } from '../db'
import { HashtagSet, Platform, Prisma } from '@prisma/client'
import { logger } from '../logger'

export interface CreateHashtagSetInput {
  brandId: string
  name: string
  description?: string
  platform: Platform
  hashtags: string[]
  category?: string
}

export interface HashtagPerformance {
  hashtag: string
  usageCount: number
  avgLikes: number
  avgComments: number
  avgReach: number
  avgEngagementRate: number
}

export class HashtagService {
  /**
   * Create a new hashtag set
   */
  async create(input: CreateHashtagSetInput): Promise<HashtagSet> {
    const log = logger.child({ service: 'HashtagService', method: 'create' })

    log.info('Creating hashtag set', { name: input.name })

    // Clean hashtags (remove # if present)
    const cleanedHashtags = input.hashtags.map((tag) =>
      tag.startsWith('#') ? tag.slice(1) : tag
    )

    const hashtagSet = await prisma.hashtagSet.create({
      data: {
        brandId: input.brandId,
        name: input.name,
        description: input.description,
        platform: input.platform,
        hashtags: cleanedHashtags,
        category: input.category,
      },
      include: {
        brand: true,
      },
    })

    log.info('Hashtag set created', { hashtagSetId: hashtagSet.id })

    return hashtagSet
  }

  /**
   * Get hashtag set by ID
   */
  async getById(id: string) {
    return prisma.hashtagSet.findUnique({
      where: { id },
      include: {
        brand: true,
        _count: {
          select: { posts: true },
        },
      },
    })
  }

  /**
   * List hashtag sets
   */
  async list(filters: {
    brandId?: string
    platform?: Platform
    category?: string
  }) {
    const where: Prisma.HashtagSetWhereInput = {}

    if (filters.brandId) where.brandId = filters.brandId
    if (filters.platform) where.platform = filters.platform
    if (filters.category) where.category = filters.category

    return prisma.hashtagSet.findMany({
      where,
      include: {
        brand: true,
        _count: {
          select: { posts: true },
        },
      },
      orderBy: {
        usageCount: 'desc',
      },
    })
  }

  /**
   * Update hashtag set
   */
  async update(
    id: string,
    input: Partial<CreateHashtagSetInput>
  ): Promise<HashtagSet> {
    const updateData: any = {}

    if (input.name) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.platform) updateData.platform = input.platform
    if (input.category !== undefined) updateData.category = input.category
    if (input.hashtags) {
      updateData.hashtags = input.hashtags.map((tag) =>
        tag.startsWith('#') ? tag.slice(1) : tag
      )
    }

    return prisma.hashtagSet.update({
      where: { id },
      data: updateData,
      include: {
        brand: true,
      },
    })
  }

  /**
   * Delete hashtag set
   */
  async delete(id: string): Promise<void> {
    await prisma.hashtagSet.delete({
      where: { id },
    })
  }

  /**
   * Track hashtag performance
   */
  async analyzePerformance(brandId: string, platform?: Platform): Promise<HashtagPerformance[]> {
    const where: any = { brandId }
    if (platform) where.platform = platform

    // Get all posts with hashtags
    const posts = await prisma.postDraft.findMany({
      where: {
        ...where,
        status: 'PUBLISHED',
        resultStats: { not: null },
      },
      select: {
        hashtags: true,
        resultStats: true,
      },
    })

    // Aggregate performance by hashtag
    const hashtagStats: Map<string, {
      count: number
      totalLikes: number
      totalComments: number
      totalReach: number
    }> = new Map()

    posts.forEach((post) => {
      if (!post.resultStats) return

      const stats = post.resultStats as any
      const likes = stats.likes || 0
      const comments = stats.comments || 0
      const reach = stats.reach || 0

      post.hashtags.forEach((hashtag) => {
        const current = hashtagStats.get(hashtag) || {
          count: 0,
          totalLikes: 0,
          totalComments: 0,
          totalReach: 0,
        }

        hashtagStats.set(hashtag, {
          count: current.count + 1,
          totalLikes: current.totalLikes + likes,
          totalComments: current.totalComments + comments,
          totalReach: current.totalReach + reach,
        })
      })
    })

    // Calculate averages and sort by engagement rate
    const performance: HashtagPerformance[] = []

    hashtagStats.forEach((stats, hashtag) => {
      const avgLikes = stats.totalLikes / stats.count
      const avgComments = stats.totalComments / stats.count
      const avgReach = stats.totalReach / stats.count
      const avgEngagement = avgLikes + avgComments
      const avgEngagementRate = avgReach > 0 ? (avgEngagement / avgReach) * 100 : 0

      performance.push({
        hashtag,
        usageCount: stats.count,
        avgLikes: Math.round(avgLikes),
        avgComments: Math.round(avgComments),
        avgReach: Math.round(avgReach),
        avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      })
    })

    // Sort by engagement rate descending
    performance.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)

    return performance
  }

  /**
   * Get recommended hashtags based on content
   */
  async getRecommendations(
    brandId: string,
    platform: Platform,
    content: string,
    limit: number = 15
  ): Promise<string[]> {
    // In production, this would use AI to analyze content and suggest relevant hashtags
    // For now, return top-performing hashtags for the platform

    const performance = await this.analyzePerformance(brandId, platform)

    return performance
      .slice(0, limit)
      .map((p) => p.hashtag)
  }
}

export const hashtagService = new HashtagService()
