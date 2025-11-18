import { NextRequest, NextResponse } from 'next/server'
import { handleError, validateRequest } from '@/lib/errors'
import { templateService } from '@/lib/services/template-service'
import { z } from 'zod'

const createTemplateSchema = z.object({
  brandId: z.string().cuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['PROMOTIONAL', 'EDUCATIONAL', 'ENGAGEMENT', 'ANNOUNCEMENT', 'SEASONAL', 'EVERGREEN']),
  platform: z.enum(['INSTAGRAM', 'THREADS', 'NOTE']),
  structure: z.object({
    sections: z.array(z.object({
      name: z.string(),
      placeholder: z.string(),
      required: z.boolean(),
    })),
    variables: z.array(z.object({
      name: z.string(),
      description: z.string(),
      defaultValue: z.string().optional(),
    })),
  }),
  exampleOutput: z.string().optional(),
  isPublic: z.boolean().optional(),
})

const listTemplatesSchema = z.object({
  brandId: z.string().cuid().optional(),
  category: z.enum(['PROMOTIONAL', 'EDUCATIONAL', 'ENGAGEMENT', 'ANNOUNCEMENT', 'SEASONAL', 'EVERGREEN']).optional(),
  platform: z.enum(['INSTAGRAM', 'THREADS', 'NOTE']).optional(),
  isPublic: z.enum(['true', 'false']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = validateRequest<any>(listTemplatesSchema, searchParams)

    const templates = await templateService.list({
      brandId: query.brandId,
      category: query.category,
      platform: query.platform,
      isPublic: query.isPublic === 'true' ? true : query.isPublic === 'false' ? false : undefined,
    })

    return NextResponse.json(templates)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateRequest<any>(createTemplateSchema, body)

    const template = await templateService.create(data)

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
