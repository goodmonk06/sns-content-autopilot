import { NextRequest, NextResponse } from 'next/server'
import { handleError, validateRequest } from '@/lib/errors'
import { hashtagService } from '@/lib/services/hashtag-service'
import { z } from 'zod'

const createHashtagSetSchema = z.object({
  brandId: z.string().cuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  platform: z.enum(['INSTAGRAM', 'THREADS', 'NOTE']),
  hashtags: z.array(z.string().min(1).max(50)).min(1).max(30),
  category: z.string().max(50).optional(),
})

const listHashtagSetsSchema = z.object({
  brandId: z.string().cuid().optional(),
  platform: z.enum(['INSTAGRAM', 'THREADS', 'NOTE']).optional(),
  category: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = validateRequest<any>(listHashtagSetsSchema, searchParams)

    const hashtagSets = await hashtagService.list({
      brandId: query.brandId,
      platform: query.platform,
      category: query.category,
    })

    return NextResponse.json(hashtagSets)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateRequest<any>(createHashtagSetSchema, body)

    const hashtagSet = await hashtagService.create(data)

    return NextResponse.json(hashtagSet, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
