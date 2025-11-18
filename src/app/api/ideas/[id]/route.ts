import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handleError, validateRequest, AppError } from '@/lib/errors'
import {
  updateContentIdeaSchema,
  type UpdateContentIdeaInput,
} from '@/lib/validations'

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
      throw new AppError(404, 'Idea not found')
    }

    return NextResponse.json(idea)
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
    const data = validateRequest<UpdateContentIdeaInput>(
      updateContentIdeaSchema,
      body
    )

    const updateData: any = {}
    if (data.date) updateData.date = new Date(data.date)
    if (data.theme) updateData.theme = data.theme
    if (data.hook) updateData.hook = data.hook
    if (data.outline) updateData.outline = data.outline
    if (data.status) updateData.status = data.status

    const idea = await prisma.contentIdea.update({
      where: { id: params.id },
      data: updateData,
      include: {
        brand: true,
        postDrafts: true
      }
    })

    return NextResponse.json(idea)
  } catch (error) {
    return handleError(error)
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
    return handleError(error)
  }
}
