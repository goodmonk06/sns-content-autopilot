import { NextRequest, NextResponse } from 'next/server'
import { handleError, validateRequest } from '@/lib/errors'
import { campaignService } from '@/lib/services/campaign-service'
import { z } from 'zod'

const createCampaignSchema = z.object({
  brandId: z.string().cuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  targetMetrics: z.record(z.number()).optional(),
})

const listCampaignsSchema = z.object({
  brandId: z.string().cuid().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = validateRequest<any>(listCampaignsSchema, searchParams)

    const campaigns = await campaignService.list({
      brandId: query.brandId,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    })

    return NextResponse.json(campaigns)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateRequest<any>(createCampaignSchema, body)

    const campaign = await campaignService.create({
      brandId: data.brandId,
      name: data.name,
      description: data.description,
      goal: data.goal,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      targetMetrics: data.targetMetrics,
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
