import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PostStatus } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const draft = await prisma.postDraft.findUnique({
      where: { id: params.id },
      include: {
        brand: true,
        idea: true
      }
    })

    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(draft)
  } catch (error) {
    console.error('Error fetching draft:', error)
    return NextResponse.json(
      { error: 'Failed to fetch draft' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      scheduledAt,
      caption,
      mediaPlan,
      hashtags,
      status,
      resultStats
    } = body

    const updateData: any = {}
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null
    if (caption) updateData.caption = caption
    if (mediaPlan) updateData.mediaPlan = mediaPlan
    if (hashtags) updateData.hashtags = hashtags
    if (status) updateData.status = status as PostStatus
    if (resultStats) updateData.resultStats = resultStats

    const draft = await prisma.postDraft.update({
      where: { id: params.id },
      data: updateData,
      include: {
        brand: true,
        idea: true
      }
    })

    return NextResponse.json(draft)
  } catch (error) {
    console.error('Error updating draft:', error)
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.postDraft.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting draft:', error)
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}
