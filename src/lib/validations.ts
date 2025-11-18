import { z } from 'zod'
import { Platform, IdeaStatus, PostStatus } from '@prisma/client'

// Shared schemas
export const platformSchema = z.enum(['INSTAGRAM', 'THREADS', 'NOTE'])
export const ideaStatusSchema = z.enum(['DRAFT', 'APPROVED', 'USED', 'ARCHIVED'])
export const postStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED'])

export const toneProfileSchema = z.object({
  voice: z.string().optional(),
  style: z.string().optional(),
  emojis: z.boolean().optional(),
  hashtagCount: z.number().int().min(0).max(30).optional(),
  targetAudience: z.string().optional(),
  longForm: z.boolean().optional(),
  maxLength: z.number().int().positive().optional(),
})

// BrandAccount schemas
export const createBrandAccountSchema = z.object({
  platform: platformSchema,
  handle: z.string().min(1).max(100),
  accessToken: z.string().min(1),
  toneProfile: toneProfileSchema.optional(),
})

export const updateBrandAccountSchema = z.object({
  handle: z.string().min(1).max(100).optional(),
  accessToken: z.string().min(1).optional(),
  toneProfile: toneProfileSchema.optional(),
})

// ContentIdea schemas
export const createContentIdeaSchema = z.object({
  brandId: z.string().cuid(),
  date: z.string().datetime().or(z.date()),
  theme: z.string().min(1).max(500),
  hook: z.string().min(1).max(1000),
  outline: z.string().min(1),
  status: ideaStatusSchema.optional(),
})

export const updateContentIdeaSchema = z.object({
  date: z.string().datetime().or(z.date()).optional(),
  theme: z.string().min(1).max(500).optional(),
  hook: z.string().min(1).max(1000).optional(),
  outline: z.string().min(1).optional(),
  status: ideaStatusSchema.optional(),
})

export const generateIdeasSchema = z.object({
  brandId: z.string().cuid(),
  theme: z.string().min(1).max(500),
  date: z.string().datetime().or(z.date()),
  count: z.number().int().min(1).max(10).default(3),
})

// PostDraft schemas
export const mediaPlanSchema = z.object({
  type: z.enum(['image', 'video', 'carousel']),
  count: z.number().int().min(1).max(10),
  description: z.string(),
  suggestions: z.array(z.string()).optional(),
  urls: z.array(z.string().url()).optional(),
})

export const createPostDraftSchema = z.object({
  brandId: z.string().cuid(),
  ideaId: z.string().cuid().optional(),
  platform: platformSchema,
  scheduledAt: z.string().datetime().or(z.date()).optional().nullable(),
  caption: z.string().min(1),
  mediaPlan: mediaPlanSchema.optional(),
  hashtags: z.array(z.string()).default([]),
  status: postStatusSchema.optional(),
})

export const updatePostDraftSchema = z.object({
  scheduledAt: z.string().datetime().or(z.date()).optional().nullable(),
  caption: z.string().min(1).optional(),
  mediaPlan: mediaPlanSchema.optional(),
  hashtags: z.array(z.string()).optional(),
  status: postStatusSchema.optional(),
  resultStats: z.record(z.any()).optional(),
})

export const generateDraftSchema = z.object({
  ideaId: z.string().cuid(),
  scheduledAt: z.string().datetime().or(z.date()).optional(),
})

// Query schemas
export const ideasQuerySchema = z.object({
  brandId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: ideaStatusSchema.optional(),
})

export const draftsQuerySchema = z.object({
  brandId: z.string().cuid().optional(),
  status: postStatusSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// Type exports for use in API routes
export type CreateBrandAccountInput = z.infer<typeof createBrandAccountSchema>
export type UpdateBrandAccountInput = z.infer<typeof updateBrandAccountSchema>
export type CreateContentIdeaInput = z.infer<typeof createContentIdeaSchema>
export type UpdateContentIdeaInput = z.infer<typeof updateContentIdeaSchema>
export type GenerateIdeasInput = z.infer<typeof generateIdeasSchema>
export type CreatePostDraftInput = z.infer<typeof createPostDraftSchema>
export type UpdatePostDraftInput = z.infer<typeof updatePostDraftSchema>
export type GenerateDraftInput = z.infer<typeof generateDraftSchema>
export type IdeasQueryInput = z.infer<typeof ideasQuerySchema>
export type DraftsQueryInput = z.infer<typeof draftsQuerySchema>
