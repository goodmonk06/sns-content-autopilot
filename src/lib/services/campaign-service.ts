/**
 * Campaign Service
 *
 * Business logic for managing marketing campaigns
 */

import { prisma } from '../db'
import { Campaign, CampaignStatus, Prisma } from '@prisma/client'
import { logger } from '../logger'
import { businessMetrics } from '../metrics'
import { eventBus, createEvent, DomainEventType, CampaignCreatedEvent, CampaignCompletedEvent } from '../events/domain-events'

export interface CreateCampaignInput {
  brandId: string
  name: string
  description?: string
  goal?: string
  startDate: Date
  endDate: Date
  targetMetrics?: Record<string, number>
}

export interface UpdateCampaignInput {
  name?: string
  description?: string
  goal?: string
  startDate?: Date
  endDate?: Date
  status?: CampaignStatus
  targetMetrics?: Record<string, number>
}

export interface CampaignMetrics {
  totalPosts: number
  publishedPosts: number
  scheduledPosts: number
  draftPosts: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalReach: number
  avgEngagementRate: number
  completionRate: number
}

export class CampaignService {
  /**
   * Create a new campaign
   */
  async create(input: CreateCampaignInput): Promise<Campaign> {
    const log = logger.child({ service: 'CampaignService', method: 'create' })

    log.info('Creating campaign', { brandId: input.brandId, name: input.name })

    // Validate dates
    if (input.endDate <= input.startDate) {
      throw new Error('End date must be after start date')
    }

    const campaign = await prisma.campaign.create({
      data: {
        brandId: input.brandId,
        name: input.name,
        description: input.description,
        goal: input.goal,
        startDate: input.startDate,
        endDate: input.endDate,
        targetMetrics: input.targetMetrics || {},
        status: CampaignStatus.PLANNING,
      },
      include: {
        brand: true,
      },
    })

    // Emit event
    await eventBus.emit(
      createEvent<CampaignCreatedEvent>(DomainEventType.CAMPAIGN_CREATED, {
        campaignId: campaign.id,
        brandId: campaign.brandId,
        name: campaign.name,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      })
    )

    // Track metric
    businessMetrics.campaignCreated(campaign.brandId)

    log.info('Campaign created', { campaignId: campaign.id })

    return campaign
  }

  /**
   * Get campaign by ID
   */
  async getById(id: string, includePosts: boolean = false) {
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        brand: true,
        posts: includePosts
          ? {
              include: {
                idea: true,
              },
              orderBy: {
                scheduledAt: 'asc',
              },
            }
          : false,
      },
    })
  }

  /**
   * List campaigns
   */
  async list(filters: {
    brandId?: string
    status?: CampaignStatus
    startDate?: Date
    endDate?: Date
  }) {
    const where: Prisma.CampaignWhereInput = {}

    if (filters.brandId) where.brandId = filters.brandId
    if (filters.status) where.status = filters.status
    if (filters.startDate || filters.endDate) {
      where.OR = []
      if (filters.startDate) {
        where.OR.push({ startDate: { gte: filters.startDate } })
      }
      if (filters.endDate) {
        where.OR.push({ endDate: { lte: filters.endDate } })
      }
    }

    return prisma.campaign.findMany({
      where,
      include: {
        brand: true,
        _count: {
          select: { posts: true },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })
  }

  /**
   * Update campaign
   */
  async update(id: string, input: UpdateCampaignInput): Promise<Campaign> {
    const log = logger.child({ service: 'CampaignService', method: 'update' })

    log.info('Updating campaign', { campaignId: id })

    // Validate dates if provided
    if (input.startDate && input.endDate && input.endDate <= input.startDate) {
      throw new Error('End date must be after start date')
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.goal !== undefined && { goal: input.goal }),
        ...(input.startDate && { startDate: input.startDate }),
        ...(input.endDate && { endDate: input.endDate }),
        ...(input.status && { status: input.status }),
        ...(input.targetMetrics && { targetMetrics: input.targetMetrics }),
      },
      include: {
        brand: true,
      },
    })

    log.info('Campaign updated', { campaignId: id })

    return campaign
  }

  /**
   * Delete campaign
   */
  async delete(id: string): Promise<void> {
    const log = logger.child({ service: 'CampaignService', method: 'delete' })

    log.info('Deleting campaign', { campaignId: id })

    await prisma.campaign.delete({
      where: { id },
    })

    log.info('Campaign deleted', { campaignId: id })
  }

  /**
   * Add post to campaign
   */
  async addPost(campaignId: string, postId: string): Promise<void> {
    await prisma.postDraft.update({
      where: { id: postId },
      data: { campaignId },
    })
  }

  /**
   * Remove post from campaign
   */
  async removePost(postId: string): Promise<void> {
    await prisma.postDraft.update({
      where: { id: postId },
      data: { campaignId: null },
    })
  }

  /**
   * Get campaign metrics
   */
  async getMetrics(id: string): Promise<CampaignMetrics> {
    const posts = await prisma.postDraft.findMany({
      where: { campaignId: id },
      select: {
        status: true,
        resultStats: true,
      },
    })

    const totalPosts = posts.length
    const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED').length
    const scheduledPosts = posts.filter((p) => p.status === 'SCHEDULED').length
    const draftPosts = posts.filter((p) => p.status === 'DRAFT').length

    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0
    let totalReach = 0
    let totalEngagement = 0

    posts.forEach((post) => {
      if (post.resultStats && typeof post.resultStats === 'object') {
        const stats = post.resultStats as any
        totalLikes += stats.likes || 0
        totalComments += stats.comments || 0
        totalShares += stats.shares || 0
        totalReach += stats.reach || 0
        totalEngagement += (stats.likes || 0) + (stats.comments || 0)
      }
    })

    const avgEngagementRate =
      publishedPosts > 0 ? (totalEngagement / totalReach) * 100 : 0
    const completionRate = totalPosts > 0 ? (publishedPosts / totalPosts) * 100 : 0

    return {
      totalPosts,
      publishedPosts,
      scheduledPosts,
      draftPosts,
      totalLikes,
      totalComments,
      totalShares,
      totalReach,
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
    }
  }

  /**
   * Complete campaign (auto-calculated when end date passes)
   */
  async complete(id: string): Promise<Campaign> {
    const log = logger.child({ service: 'CampaignService', method: 'complete' })

    log.info('Completing campaign', { campaignId: id })

    const campaign = await this.update(id, { status: CampaignStatus.COMPLETED })
    const metrics = await this.getMetrics(id)

    // Emit completion event
    await eventBus.emit(
      createEvent<CampaignCompletedEvent>(DomainEventType.CAMPAIGN_COMPLETED, {
        campaignId: id,
        brandId: campaign.brandId,
        finalMetrics: metrics,
        completedAt: new Date(),
      })
    )

    // Track metric
    businessMetrics.campaignCompleted(campaign.brandId, metrics.totalPosts)

    log.info('Campaign completed', { campaignId: id, metrics })

    return campaign
  }

  /**
   * Activate campaign
   */
  async activate(id: string): Promise<Campaign> {
    return this.update(id, { status: CampaignStatus.ACTIVE })
  }

  /**
   * Archive campaign
   */
  async archive(id: string): Promise<Campaign> {
    return this.update(id, { status: CampaignStatus.ARCHIVED })
  }
}

export const campaignService = new CampaignService()
