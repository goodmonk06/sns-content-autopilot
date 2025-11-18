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

  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

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

  const idea2 = await prisma.contentIdea.create({
    data: {
      brandId: instagramAccount.id,
      date: nextWeek,
      theme: 'Productivity Hacks',
      hook: 'How I doubled my productivity without burning out',
      outline: `- Time blocking technique
- Pomodoro method
- Energy management
- Digital minimalism
- Strategic breaks

Include real data and before/after comparison.`,
      status: 'DRAFT',
    }
  })

  const idea3 = await prisma.contentIdea.create({
    data: {
      brandId: threadsAccount.id,
      date: tomorrow,
      theme: 'Tech Trends',
      hook: 'The AI tools that actually save me time (and the ones that don\'t)',
      outline: `Worth it:
- ChatGPT for drafting
- Notion AI for summaries
- Grammarly for editing

Not worth it:
- Generic content generators
- Over-automated scheduling

Real talk about AI productivity.`,
      status: 'APPROVED',
    }
  })

  console.log('Created content ideas:', {
    idea1: idea1.id,
    idea2: idea2.id,
    idea3: idea3.id,
  })

  // Create sample post drafts
  const scheduledDate = new Date(tomorrow)
  scheduledDate.setHours(9, 0, 0, 0)

  const draft1 = await prisma.postDraft.create({
    data: {
      brandId: instagramAccount.id,
      ideaId: idea1.id,
      platform: Platform.INSTAGRAM,
      scheduledAt: scheduledDate,
      caption: `5 habits that changed my life in 2024 ✨

1️⃣ Waking up at 5 AM consistently
2️⃣ Daily journaling practice
3️⃣ 30-minute morning workout
4️⃣ Reading for 20 minutes
5️⃣ Gratitude meditation

The transformation didn't happen overnight, but these small changes compounded into something beautiful.

What's one habit you want to build this year?`,
      mediaPlan: {
        type: 'carousel',
        count: 5,
        description: 'Before/after comparison, habit tracker visuals, aesthetic morning routine shots',
        suggestions: [
          'Sunrise photo with coffee',
          'Journal and pen on desk',
          'Yoga mat in morning light',
          'Stack of books being read',
          'Meditation space setup'
        ]
      },
      hashtags: [
        'morningroutine',
        'habitbuilding',
        'productivitytips',
        'selfimprovement',
        'mindfulness',
        'wellness',
        'healthyhabits',
        'motivation',
        'personalgrowth',
        'lifestyleblogger',
        'morningmotivation',
        'dailyroutine',
        'selfcare',
        'consistency',
        'growthmindset'
      ],
      status: 'SCHEDULED',
    }
  })

  const draft2 = await prisma.postDraft.create({
    data: {
      brandId: threadsAccount.id,
      ideaId: idea3.id,
      platform: Platform.THREADS,
      scheduledAt: new Date(tomorrow.getTime() + 3 * 60 * 60 * 1000), // 3 hours later
      caption: `Hot take: Most AI tools are productivity theater 🎭

The ones that actually save me time:
✅ ChatGPT for first drafts
✅ Notion AI for meeting notes
✅ Grammarly for editing

The ones that don't:
❌ Generic content generators
❌ Over-automated schedulers
❌ "AI-powered" buzzword tools

The key? Use AI to enhance your work, not replace your thinking.

What AI tools do you actually use daily?`,
      mediaPlan: {
        type: 'image',
        count: 0,
        description: 'Text-only post for authentic conversation',
        suggestions: []
      },
      hashtags: ['AI', 'productivity', 'tech'],
      status: 'SCHEDULED',
    }
  })

  // Create a published post with stats
  const publishedDate = new Date(today)
  publishedDate.setDate(publishedDate.getDate() - 2)
  publishedDate.setHours(10, 0, 0, 0)

  const draft3 = await prisma.postDraft.create({
    data: {
      brandId: instagramAccount.id,
      platform: Platform.INSTAGRAM,
      scheduledAt: publishedDate,
      publishedAt: publishedDate,
      caption: `Weekend reset routine 🌿

After a busy week, I always come back to these:

🧘‍♀️ Morning meditation
📚 Reading without distractions
🚶‍♀️ Long walk in nature
🍳 Cooking a nourishing meal
💤 Early bedtime

It's not about being productive 24/7. It's about recharging so you can show up as your best self.

How do you reset on weekends?`,
      mediaPlan: {
        type: 'carousel',
        count: 3,
        description: 'Peaceful weekend activities',
        suggestions: [
          'Person meditating',
          'Book and tea setup',
          'Nature trail photo'
        ]
      },
      hashtags: [
        'weekendvibes',
        'selfcare',
        'mindfulness',
        'wellness',
        'metime',
        'recharge',
        'balance',
        'slowliving',
        'weekendmood',
        'relaxation'
      ],
      status: 'PUBLISHED',
      resultStats: {
        likes: 347,
        comments: 23,
        shares: 8,
        reach: 1842,
        impressions: 2156,
        saves: 56
      }
    }
  })

  console.log('Created post drafts:', {
    scheduled: [draft1.id, draft2.id],
    published: draft3.id,
  })

  // Create campaigns
  const twoWeeksAgo = new Date(today)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const twoWeeksFromNow = new Date(today)
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

  const campaign1 = await prisma.campaign.create({
    data: {
      brandId: instagramAccount.id,
      name: 'Q1 Wellness Challenge',
      description: 'A 30-day wellness challenge to engage our community',
      goal: 'Increase engagement by 25% and gain 500 new followers',
      startDate: twoWeeksAgo,
      endDate: twoWeeksFromNow,
      status: 'ACTIVE',
      targetMetrics: {
        likes: 5000,
        comments: 500,
        reach: 20000,
      },
    },
  })

  // Link published post to campaign
  await prisma.postDraft.update({
    where: { id: draft3.id },
    data: { campaignId: campaign1.id },
  })

  console.log('Created campaigns:', { campaign1: campaign1.id })

  // Create content templates
  const template1 = await prisma.contentTemplate.create({
    data: {
      brandId: instagramAccount.id,
      name: 'Motivational Quote Template',
      description: 'Quick inspirational quotes with branded formatting',
      category: 'ENGAGEMENT',
      platform: Platform.INSTAGRAM,
      structure: {
        sections: [
          { name: 'quote', placeholder: 'Enter the quote', required: true },
          { name: 'author', placeholder: 'Quote author', required: false },
          { name: 'cta', placeholder: 'Call to action', required: false },
        ],
        variables: [
          { name: 'quote', description: 'The main quote text', defaultValue: '' },
          { name: 'author', description: 'Who said it', defaultValue: 'Unknown' },
          { name: 'cta', description: 'What action to take', defaultValue: 'Save this for later!' },
        ],
      },
      exampleOutput: `"{{quote}}" - {{author}}\n\n{{cta}}\n\n#motivation #inspiration #quotes`,
      isPublic: false,
    },
  })

  const template2 = await prisma.contentTemplate.create({
    data: {
      brandId: instagramAccount.id,
      name: 'Product Announcement',
      description: 'Standard format for new product launches',
      category: 'PROMOTIONAL',
      platform: Platform.INSTAGRAM,
      structure: {
        sections: [
          { name: 'productName', placeholder: 'Product name', required: true },
          { name: 'benefit', placeholder: 'Main benefit', required: true },
          { name: 'availability', placeholder: 'When/where available', required: true },
        ],
        variables: [
          { name: 'productName', description: 'Name of the product' },
          { name: 'benefit', description: 'Key benefit or feature' },
          { name: 'availability', description: 'Launch date and where to buy' },
        ],
      },
      exampleOutput: `✨ Introducing {{productName}} ✨\n\n{{benefit}}\n\n{{availability}}\n\nLink in bio!`,
      isPublic: false,
    },
  })

  console.log('Created templates:', { template1: template1.id, template2: template2.id })

  // Create hashtag sets
  const hashtagSet1 = await prisma.hashtagSet.create({
    data: {
      brandId: instagramAccount.id,
      name: 'Wellness & Lifestyle',
      description: 'General wellness and lifestyle hashtags',
      platform: Platform.INSTAGRAM,
      category: 'lifestyle',
      hashtags: [
        'wellness',
        'selfcare',
        'mindfulness',
        'healthylifestyle',
        'wellnessjourney',
        'selflove',
        'mentalhealth',
        'balance',
        'positivevibes',
        'dailyroutine',
      ],
    },
  })

  const hashtagSet2 = await prisma.hashtagSet.create({
    data: {
      brandId: instagramAccount.id,
      name: 'Motivation & Growth',
      description: 'Hashtags for motivational content',
      platform: Platform.INSTAGRAM,
      category: 'motivation',
      hashtags: [
        'motivation',
        'personalgrowth',
        'mindset',
        'growthmindset',
        'selfimprovement',
        'goals',
        'inspiration',
        'successmindset',
        'productivity',
        'dailymotivation',
      ],
    },
  })

  const hashtagSet3 = await prisma.hashtagSet.create({
    data: {
      brandId: threadsAccount.id,
      name: 'Tech & AI',
      description: 'Tech and AI discussion hashtags',
      platform: Platform.THREADS,
      category: 'tech',
      hashtags: ['AI', 'tech', 'productivity', 'innovation', 'future'],
    },
  })

  console.log('Created hashtag sets:', {
    hashtagSet1: hashtagSet1.id,
    hashtagSet2: hashtagSet2.id,
    hashtagSet3: hashtagSet3.id,
  })

  // Link hashtag set to published post
  await prisma.postDraft.update({
    where: { id: draft3.id },
    data: { hashtagSetId: hashtagSet1.id },
  })

  console.log('Database seeded successfully!')
  console.log('\n📊 Summary:')
  console.log(`- ${3} brand accounts created`)
  console.log(`- ${3} content ideas created`)
  console.log(`- ${3} post drafts created (2 scheduled, 1 published)`)
  console.log(`- ${1} active campaign with linked posts`)
  console.log(`- ${2} content templates ready to use`)
  console.log(`- ${3} hashtag sets for strategy management`)
  console.log('\n🎯 Demo flows ready:')
  console.log('1. Visit /ideas to see AI-generated content ideas')
  console.log('2. Visit /drafts to see scheduled and published posts')
  console.log('3. Visit /calendar to see posts on the calendar')
  console.log('4. Visit /analytics to see performance metrics')
  console.log('5. Visit /campaigns to manage marketing campaigns')
  console.log('6. Use templates for consistent content creation')
  console.log('7. Track hashtag performance and optimize strategy')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
