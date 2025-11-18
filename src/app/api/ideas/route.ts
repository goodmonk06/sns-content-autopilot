import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { IdeaStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const brandId = searchParams.get('brandId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (brandId) where.brandId = brandId
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const ideas = await prisma.contentIdea.findMany({
      where,
      include: {
        brand: true,
        postDrafts: true
      },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json(ideas)
  } catch (error) {
    console.error('Error fetching ideas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ideas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brandId, date, theme, hook, outline, status } = body

    if (!brandId || !date || !theme || !hook || !outline) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const idea = await prisma.contentIdea.create({
      data: {
        brandId,
        date: new Date(date),
        theme,
        hook,
        outline,
        status: (status as IdeaStatus) || 'DRAFT'
      },
      include: {
        brand: true
      }
    })

    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    console.error('Error creating idea:', error)
    return NextResponse.json(
      { error: 'Failed to create idea' },
      { status: 500 }
    )
  }
}
