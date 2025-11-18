import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const brand = await prisma.brandAccount.findUnique({
      where: { id: params.id }
    })

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Error fetching brand:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brand' },
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
    const { handle, accessToken, toneProfile } = body

    const updateData: any = {}
    if (handle) updateData.handle = handle
    if (accessToken) updateData.accessToken = encrypt(accessToken)
    if (toneProfile) updateData.toneProfile = toneProfile

    const brand = await prisma.brandAccount.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Error updating brand:', error)
    return NextResponse.json(
      { error: 'Failed to update brand' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.brandAccount.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json(
      { error: 'Failed to delete brand' },
      { status: 500 }
    )
  }
}
