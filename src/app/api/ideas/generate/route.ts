import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateContentIdeas, ToneProfile } from '@/lib/llm'
import { Platform } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { brandId, theme, date, count = 3 } = body

    if (!brandId || !theme || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: brandId, theme, date' },
        { status: 400 }
      )
    }

    // Fetch brand to get tone profile
    const brand = await prisma.brandAccount.findUnique({
      where: { id: brandId }
    })

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    // Generate ideas using LLM
    const generatedIdeas = await generateContentIdeas(
      theme,
      brand.platform,
      brand.toneProfile as ToneProfile,
      count
    )

    // Save ideas to database
    const savedIdeas = await Promise.all(
      generatedIdeas.map(idea =>
        prisma.contentIdea.create({
          data: {
            brandId,
            date: new Date(date),
            theme: idea.theme,
            hook: idea.hook,
            outline: idea.outline,
            status: 'DRAFT'
          },
          include: {
            brand: true
          }
        })
      )
    )

    return NextResponse.json({
      count: savedIdeas.length,
      ideas: savedIdeas
    }, { status: 201 })
  } catch (error) {
    console.error('Error generating ideas:', error)
    return NextResponse.json(
      { error: 'Failed to generate ideas', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
