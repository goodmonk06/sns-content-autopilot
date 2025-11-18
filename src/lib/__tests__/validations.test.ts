import { describe, it, expect } from 'vitest'
import {
  createContentIdeaSchema,
  updateContentIdeaSchema,
  generateIdeasSchema,
  createBrandAccountSchema,
  toneProfileSchema,
} from '../validations'

describe('Validation Schemas', () => {
  describe('createContentIdeaSchema', () => {
    it('should validate a valid content idea', () => {
      const validData = {
        brandId: 'clq1234567890abcdef',
        date: new Date().toISOString(),
        theme: 'Morning Routine Tips',
        hook: '5 habits that will change your morning',
        outline: '1. Wake up early\n2. Exercise\n3. Meditate',
      }

      const result = createContentIdeaSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject idea with missing required fields', () => {
      const invalidData = {
        brandId: 'clq1234567890abcdef',
        theme: 'Morning Routine Tips',
        // missing date, hook, outline
      }

      const result = createContentIdeaSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject idea with empty theme', () => {
      const invalidData = {
        brandId: 'clq1234567890abcdef',
        date: new Date().toISOString(),
        theme: '',
        hook: 'Some hook',
        outline: 'Some outline',
      }

      const result = createContentIdeaSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject idea with theme exceeding max length', () => {
      const invalidData = {
        brandId: 'clq1234567890abcdef',
        date: new Date().toISOString(),
        theme: 'a'.repeat(501),
        hook: 'Some hook',
        outline: 'Some outline',
      }

      const result = createContentIdeaSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('updateContentIdeaSchema', () => {
    it('should validate partial updates', () => {
      const validData = {
        theme: 'Updated theme',
      }

      const result = updateContentIdeaSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow empty object (no updates)', () => {
      const result = updateContentIdeaSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should validate status enum', () => {
      const validStatuses = ['DRAFT', 'APPROVED', 'USED', 'ARCHIVED']

      validStatuses.forEach(status => {
        const result = updateContentIdeaSchema.safeParse({ status })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      const result = updateContentIdeaSchema.safeParse({ status: 'INVALID' })
      expect(result.success).toBe(false)
    })
  })

  describe('generateIdeasSchema', () => {
    it('should validate valid generation request', () => {
      const validData = {
        brandId: 'clq1234567890abcdef',
        theme: 'Productivity Tips',
        date: new Date().toISOString(),
        count: 3,
      }

      const result = generateIdeasSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should use default count if not provided', () => {
      const data = {
        brandId: 'clq1234567890abcdef',
        theme: 'Productivity Tips',
        date: new Date().toISOString(),
      }

      const result = generateIdeasSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.count).toBe(3)
      }
    })

    it('should reject count less than 1', () => {
      const data = {
        brandId: 'clq1234567890abcdef',
        theme: 'Productivity Tips',
        date: new Date().toISOString(),
        count: 0,
      }

      const result = generateIdeasSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject count greater than 10', () => {
      const data = {
        brandId: 'clq1234567890abcdef',
        theme: 'Productivity Tips',
        date: new Date().toISOString(),
        count: 11,
      }

      const result = generateIdeasSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('createBrandAccountSchema', () => {
    it('should validate a valid brand account', () => {
      const validData = {
        platform: 'INSTAGRAM',
        handle: '@my_brand',
        accessToken: 'secret_token_123',
        toneProfile: {
          voice: 'friendly',
          style: 'casual',
          emojis: true,
        },
      }

      const result = createBrandAccountSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should validate platform enum', () => {
      const validPlatforms = ['INSTAGRAM', 'THREADS', 'NOTE']

      validPlatforms.forEach(platform => {
        const data = {
          platform,
          handle: '@test',
          accessToken: 'token',
        }
        const result = createBrandAccountSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid platform', () => {
      const data = {
        platform: 'TWITTER',
        handle: '@test',
        accessToken: 'token',
      }

      const result = createBrandAccountSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('toneProfileSchema', () => {
    it('should validate hashtag count range', () => {
      const validCounts = [0, 10, 30]

      validCounts.forEach(hashtagCount => {
        const result = toneProfileSchema.safeParse({ hashtagCount })
        expect(result.success).toBe(true)
      })
    })

    it('should reject hashtag count above 30', () => {
      const result = toneProfileSchema.safeParse({ hashtagCount: 31 })
      expect(result.success).toBe(false)
    })

    it('should reject negative hashtag count', () => {
      const result = toneProfileSchema.safeParse({ hashtagCount: -1 })
      expect(result.success).toBe(false)
    })
  })
})
