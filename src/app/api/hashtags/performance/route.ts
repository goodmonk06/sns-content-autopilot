import { NextRequest, NextResponse } from 'next/server'
import { handleError } from '@/lib/errors'
import { hashtagService } from '@/lib/services/hashtag-service'
import { z } from 'zod'

const analyzeSchema = z.object({
  brandId: z.string().cuid(),
  platform: z.enum(['INSTAGRAM', 'THREADS', 'NOTE']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = analyzeSchema.parse(searchParams)

    const performance = await hashtagService.analyzePerformance(
      query.brandId,
      query.platform
    )

    return NextResponse.json(performance)
  } catch (error) {
    return handleError(error)
  }
}
