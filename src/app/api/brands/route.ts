import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { Platform } from '@prisma/client'

export async function GET() {
  try {
    const brands = await prisma.brandAccount.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(brands)
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, handle, accessToken, toneProfile } = body

    if (!platform || !handle || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const encryptedToken = encrypt(accessToken)

    const brand = await prisma.brandAccount.create({
      data: {
        platform: platform as Platform,
        handle,
        accessToken: encryptedToken,
        toneProfile: toneProfile || {}
      }
    })

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    console.error('Error creating brand:', error)
    return NextResponse.json(
      { error: 'Failed to create brand' },
      { status: 500 }
    )
  }
}
