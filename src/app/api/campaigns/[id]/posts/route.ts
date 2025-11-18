import { NextRequest, NextResponse } from 'next/server'
import { handleError, validateRequest } from '@/lib/errors'
import { campaignService } from '@/lib/services/campaign-service'
import { z } from 'zod'

const addPostSchema = z.object({
  postId: z.string().cuid(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = validateRequest<any>(addPostSchema, body)

    await campaignService.addPost(params.id, data.postId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
