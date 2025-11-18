import { NextRequest, NextResponse } from 'next/server'
import { handleError } from '@/lib/errors'
import { campaignService } from '@/lib/services/campaign-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const metrics = await campaignService.getMetrics(params.id)
    return NextResponse.json(metrics)
  } catch (error) {
    return handleError(error)
  }
}
