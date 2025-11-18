import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePostDraft, ToneProfile } from '@/lib/llm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ideaId, scheduledAt } = body

    if (!ideaId) {
      return NextResponse.json(
        { error: 'Missing required field: ideaId' },
        { status: 400 }
      )
    }

    // Fetch idea with brand
    const idea = await prisma.contentIdea.findUnique({
      where: { id: ideaId },
      include: { brand: true }
    })

    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      )
    }

    // Generate draft using LLM
    const generatedDraft = await generatePostDraft(
      {
        theme: idea.theme,
        hook: idea.hook,
        outline: idea.outline
      },
      idea.brand.platform,
      idea.brand.toneProfile as ToneProfile
    )

    // Save draft to database
    const draft = await prisma.postDraft.create({
      data: {
        brandId: idea.brandId,
        ideaId: idea.id,
        platform: idea.brand.platform,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        caption: generatedDraft.caption,
        mediaPlan: generatedDraft.mediaPlan,
        hashtags: generatedDraft.hashtags,
        status: 'DRAFT'
      },
      include: {
        brand: true,
        idea: true
      }
    })

    // Update idea status to USED
    await prisma.contentIdea.update({
      where: { id: ideaId },
      data: { status: 'USED' }
    })

    return NextResponse.json(draft, { status: 201 })
  } catch (error) {
    console.error('Error generating draft:', error)
    return NextResponse.json(
      { error: 'Failed to generate draft', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
