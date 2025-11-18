import { NextRequest, NextResponse } from 'next/server'
import { handleError, validateRequest, AppError } from '@/lib/errors'
import { campaignService } from '@/lib/services/campaign-service'
import { z } from 'zod'

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  targetMetrics: z.record(z.number()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includePosts = searchParams.get('includePosts') === 'true'

    const campaign = await campaignService.getById(params.id, includePosts)

    if (!campaign) {
      throw new AppError(404, 'Campaign not found')
    }

    return NextResponse.json(campaign)
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = validateRequest<any>(updateCampaignSchema, body)

    const updateData: any = { ...data }
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)

    const campaign = await campaignService.update(params.id, updateData)

    return NextResponse.json(campaign)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await campaignService.delete(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
