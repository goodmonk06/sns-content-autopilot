import { PrismaClient, Platform } from '@prisma/client'
import { encrypt } from '../src/lib/encryption'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create sample brand accounts
  const instagramAccount = await prisma.brandAccount.upsert({
    where: {
      platform_handle: {
        platform: Platform.INSTAGRAM,
        handle: '@my_brand_ig'
      }
    },
    update: {},
    create: {
      platform: Platform.INSTAGRAM,
      handle: '@my_brand_ig',
      accessToken: encrypt('dummy-instagram-token'),
      toneProfile: {
        voice: 'friendly',
        style: 'inspirational',
        emojis: true,
        hashtagCount: 15,
        targetAudience: 'lifestyle enthusiasts',
      }
    }
  })

  const threadsAccount = await prisma.brandAccount.upsert({
    where: {
      platform_handle: {
        platform: Platform.THREADS,
        handle: '@my_brand_threads'
      }
    },
    update: {},
    create: {
      platform: Platform.THREADS,
      handle: '@my_brand_threads',
      accessToken: encrypt('dummy-threads-token'),
      toneProfile: {
        voice: 'conversational',
        style: 'authentic',
        emojis: false,
        maxLength: 500,
        targetAudience: 'tech-savvy millennials',
      }
    }
  })

  const noteAccount = await prisma.brandAccount.upsert({
    where: {
      platform_handle: {
        platform: Platform.NOTE,
        handle: 'my_brand_note'
      }
    },
    update: {},
    create: {
      platform: Platform.NOTE,
      handle: 'my_brand_note',
      accessToken: encrypt('dummy-note-token'),
      toneProfile: {
        voice: 'professional',
        style: 'storytelling',
        emojis: false,
        longForm: true,
        targetAudience: 'creative professionals',
      }
    }
  })

  console.log('Created brand accounts:', {
    instagram: instagramAccount.id,
    threads: threadsAccount.id,
    note: noteAccount.id,
  })

  // Create sample content ideas
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const idea1 = await prisma.contentIdea.create({
    data: {
      brandId: instagramAccount.id,
      date: tomorrow,
      theme: 'Morning Motivation',
      hook: '5 habits that changed my life in 2024',
      outline: `1. Waking up at 5 AM consistently
2. Daily journaling practice
3. 30-minute morning workout
4. Reading for 20 minutes
5. Gratitude meditation

Share personal story about transformation.`,
      status: 'APPROVED',
    }
  })

  console.log('Created content idea:', idea1.id)
  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
