import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { IdeaStatus } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idea = await prisma.contentIdea.findUnique({
      where: { id: params.id },
      include: {
        brand: true,
        postDrafts: true
      }
    })

    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(idea)
  } catch (error) {
    console.error('Error fetching idea:', error)
    return NextResponse.json(
      { error: 'Failed to fetch idea' },
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
    const { date, theme, hook, outline, status } = body

    const updateData: any = {}
    if (date) updateData.date = new Date(date)
    if (theme) updateData.theme = theme
    if (hook) updateData.hook = hook
    if (outline) updateData.outline = outline
    if (status) updateData.status = status as IdeaStatus

    const idea = await prisma.contentIdea.update({
      where: { id: params.id },
      data: updateData,
      include: {
        brand: true
      }
    })

    return NextResponse.json(idea)
  } catch (error) {
    console.error('Error updating idea:', error)
    return NextResponse.json(
      { error: 'Failed to update idea' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.contentIdea.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting idea:', error)
    return NextResponse.json(
      { error: 'Failed to delete idea' },
      { status: 500 }
    )
  }
}
