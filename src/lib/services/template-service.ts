/**
 * Template Service
 *
 * Business logic for managing content templates
 */

import { prisma } from '../db'
import { ContentTemplate, TemplateCategory, Platform, Prisma } from '@prisma/client'
import { logger } from '../logger'

export interface CreateTemplateInput {
  brandId: string
  name: string
  description?: string
  category: TemplateCategory
  platform: Platform
  structure: {
    sections: Array<{
      name: string
      placeholder: string
      required: boolean
    }>
    variables: Array<{
      name: string
      description: string
      defaultValue?: string
    }>
  }
  exampleOutput?: string
  isPublic?: boolean
}

export interface UseTemplateInput {
  templateId: string
  variables: Record<string, string>
}

export class TemplateService {
  /**
   * Create a new template
   */
  async create(input: CreateTemplateInput): Promise<ContentTemplate> {
    const log = logger.child({ service: 'TemplateService', method: 'create' })

    log.info('Creating template', { name: input.name })

    const template = await prisma.contentTemplate.create({
      data: {
        brandId: input.brandId,
        name: input.name,
        description: input.description,
        category: input.category,
        platform: input.platform,
        structure: input.structure,
        exampleOutput: input.exampleOutput,
        isPublic: input.isPublic || false,
      },
      include: {
        brand: true,
      },
    })

    log.info('Template created', { templateId: template.id })

    return template
  }

  /**
   * Get template by ID
   */
  async getById(id: string) {
    return prisma.contentTemplate.findUnique({
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
   * List templates
   */
  async list(filters: {
    brandId?: string
    category?: TemplateCategory
    platform?: Platform
    isPublic?: boolean
  }) {
    const where: Prisma.ContentTemplateWhereInput = {}

    if (filters.brandId) where.brandId = filters.brandId
    if (filters.category) where.category = filters.category
    if (filters.platform) where.platform = filters.platform
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic

    return prisma.contentTemplate.findMany({
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
   * Update template
   */
  async update(
    id: string,
    input: Partial<CreateTemplateInput>
  ): Promise<ContentTemplate> {
    return prisma.contentTemplate.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.category && { category: input.category }),
        ...(input.platform && { platform: input.platform }),
        ...(input.structure && { structure: input.structure as any }),
        ...(input.exampleOutput !== undefined && { exampleOutput: input.exampleOutput }),
        ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
      },
      include: {
        brand: true,
      },
    })
  }

  /**
   * Delete template
   */
  async delete(id: string): Promise<void> {
    await prisma.contentTemplate.delete({
      where: { id },
    })
  }

  /**
   * Use template to generate content
   */
  async useTemplate(input: UseTemplateInput): Promise<string> {
    const template = await this.getById(input.templateId)

    if (!template) {
      throw new Error('Template not found')
    }

    // Increment usage count
    await prisma.contentTemplate.update({
      where: { id: input.templateId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    })

    // Simple variable replacement (in production, use a proper template engine)
    let output = template.exampleOutput || ''

    Object.entries(input.variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      output = output.replace(regex, value)
    })

    return output
  }

  /**
   * Get template usage stats
   */
  async getUsageStats(id: string) {
    const posts = await prisma.postDraft.findMany({
      where: { templateId: id },
      select: {
        status: true,
        resultStats: true,
        publishedAt: true,
      },
    })

    const totalUsage = posts.length
    const publishedCount = posts.filter((p) => p.status === 'PUBLISHED').length

    let avgLikes = 0
    let avgComments = 0
    let avgEngagementRate = 0

    if (publishedCount > 0) {
      let totalLikes = 0
      let totalComments = 0
      let totalReach = 0

      posts.forEach((post) => {
        if (post.status === 'PUBLISHED' && post.resultStats) {
          const stats = post.resultStats as any
          totalLikes += stats.likes || 0
          totalComments += stats.comments || 0
          totalReach += stats.reach || 0
        }
      })

      avgLikes = totalLikes / publishedCount
      avgComments = totalComments / publishedCount
      avgEngagementRate = totalReach > 0 ? ((totalLikes + totalComments) / totalReach) * 100 : 0
    }

    return {
      totalUsage,
      publishedCount,
      avgLikes: Math.round(avgLikes),
      avgComments: Math.round(avgComments),
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
    }
  }
}

export const templateService = new TemplateService()
