import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Platform, PostStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (brandId) where.brandId = brandId
    if (status) where.status = status as PostStatus
    if (startDate && endDate) {
      where.scheduledAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const drafts = await prisma.postDraft.findMany({
      where,
      include: {
        brand: true,
        idea: true
      },
      orderBy: { scheduledAt: 'asc' }
    })

    return NextResponse.json(drafts)
  } catch (error) {
    console.error('Error fetching drafts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      brandId,
      ideaId,
      platform,
      scheduledAt,
      caption,
      mediaPlan,
      hashtags,
      status
    } = body

    if (!brandId || !platform || !caption) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const draft = await prisma.postDraft.create({
      data: {
        brandId,
        ideaId: ideaId || null,
        platform: platform as Platform,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        caption,
        mediaPlan: mediaPlan || {},
        hashtags: hashtags || [],
        status: (status as PostStatus) || 'DRAFT'
      },
      include: {
        brand: true,
        idea: true
      }
    })

    return NextResponse.json(draft, { status: 201 })
  } catch (error) {
    console.error('Error creating draft:', error)
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    )
  }
}
