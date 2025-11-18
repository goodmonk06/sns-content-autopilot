import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleError, validateRequest } from '@/lib/errors'
import {
  createContentIdeaSchema,
  ideasQuerySchema,
  type CreateContentIdeaInput,
} from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = validateRequest<any>(ideasQuerySchema, searchParams)

    const where: any = {}
    if (query.brandId) where.brandId = query.brandId
    if (query.status) where.status = query.status
    if (query.startDate && query.endDate) {
      where.date = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate)
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
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateRequest<CreateContentIdeaInput>(
      createContentIdeaSchema,
      body
    )

    const idea = await prisma.contentIdea.create({
      data: {
        brandId: data.brandId,
        date: new Date(data.date),
        theme: data.theme,
        hook: data.hook,
        outline: data.outline,
        status: data.status || 'DRAFT'
      },
      include: {
        brand: true
      }
    })

    return NextResponse.json(idea, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
