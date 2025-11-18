# Integration Recipes

Common integration patterns and real-world examples for SNS Content Autopilot.

## Table of Contents

- [Complete Workflows](#complete-workflows)
- [External Services](#external-services)
- [Automation Triggers](#automation-triggers)
- [Advanced Use Cases](#advanced-use-cases)
- [Third-Party Integrations](#third-party-integrations)

---

## Complete Workflows

### Recipe 1: End-to-End Content Creation Workflow

**Goal**: Automatically generate, review, and schedule posts from a content theme.

**Steps**:

1. **Generate Ideas** (AI-powered)
2. **Human Review and Approval**
3. **Generate Drafts** from approved ideas
4. **Schedule Posts** at optimal times
5. **Auto-Publish** via worker
6. **Track Performance** with snapshots

**Implementation**:

```typescript
// /lib/workflows/content-creation.ts
import { prisma } from '@/lib/db'
import { generateContentIdeas, generatePostDraft } from '@/lib/llm'
import { eventBus, DomainEventType } from '@/lib/events/domain-events'
import { businessMetrics } from '@/lib/metrics'
import { logger } from '@/lib/logger'

export async function contentCreationWorkflow({
  brandId,
  theme,
  date,
  autoSchedule = false,
}: {
  brandId: string
  theme: string
  date: Date
  autoSchedule?: boolean
}) {
  const workflowLogger = logger.child({ workflow: 'content-creation', brandId })

  try {
    // 1. Fetch brand and validate
    const brand = await prisma.brandAccount.findUnique({ where: { id: brandId } })
    if (!brand) {
      throw new Error(`Brand ${brandId} not found`)
    }

    workflowLogger.info('Starting content creation workflow', { theme })

    // 2. Generate 3 content ideas
    const ideas = await generateContentIdeas({
      brandId,
      theme,
      date,
      count: 3,
      toneProfile: brand.toneProfile,
    })

    workflowLogger.info('Generated ideas', { count: ideas.length })
    businessMetrics.ideaCreated(brandId)

    // 3. Save ideas to database
    const savedIdeas = await Promise.all(
      ideas.map((idea) =>
        prisma.contentIdea.create({
          data: {
            brandId,
            date,
            theme: idea.theme,
            hook: idea.hook,
            outline: idea.outline,
            status: 'DRAFT',
          },
        })
      )
    )

    // 4. Emit events
    for (const idea of savedIdeas) {
      await eventBus.emit({
        type: DomainEventType.IDEA_CREATED,
        timestamp: new Date(),
        payload: { ideaId: idea.id, brandId, theme: idea.theme },
      })
    }

    // 5. Auto-approve first idea if autoSchedule enabled
    if (autoSchedule && savedIdeas.length > 0) {
      const idea = savedIdeas[0]

      await prisma.contentIdea.update({
        where: { id: idea.id },
        data: { status: 'APPROVED' },
      })

      workflowLogger.info('Auto-approved first idea', { ideaId: idea.id })

      // 6. Generate draft from approved idea
      const draft = await generatePostDraft({
        ideaId: idea.id,
        brandId,
        platform: brand.platform,
        toneProfile: brand.toneProfile,
      })

      const savedDraft = await prisma.postDraft.create({
        data: {
          brandId,
          ideaId: idea.id,
          platform: brand.platform,
          caption: draft.caption,
          mediaPlan: draft.mediaPlan,
          hashtags: draft.hashtags,
          scheduledAt: date,
          status: 'SCHEDULED',
        },
      })

      workflowLogger.info('Created and scheduled draft', { draftId: savedDraft.id })
      businessMetrics.draftCreated(brandId, brand.platform)

      // 7. Update idea status to USED
      await prisma.contentIdea.update({
        where: { id: idea.id },
        data: { status: 'USED' },
      })

      return {
        ideas: savedIdeas,
        scheduledDraft: savedDraft,
      }
    }

    return {
      ideas: savedIdeas,
      scheduledDraft: null,
    }
  } catch (error) {
    workflowLogger.error('Workflow failed', { error })
    throw error
  }
}
```

**Usage**:

```typescript
// API endpoint
// POST /api/workflows/content-creation
export async function POST(request: NextRequest) {
  const { brandId, theme, date, autoSchedule } = await request.json()

  const result = await contentCreationWorkflow({
    brandId,
    theme,
    date: new Date(date),
    autoSchedule,
  })

  return NextResponse.json(result)
}
```

**cURL Example**:

```bash
curl -X POST http://localhost:3000/api/workflows/content-creation \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "clq1...",
    "theme": "Productivity tips for remote workers",
    "date": "2025-01-25T10:00:00Z",
    "autoSchedule": true
  }'
```

---

### Recipe 2: Campaign-Based Content Planning

**Goal**: Create a 30-day campaign with posts scheduled across the month.

**Implementation**:

```typescript
// /lib/workflows/campaign-planning.ts
export async function campaignPlanningWorkflow({
  brandId,
  campaignName,
  campaignGoal,
  startDate,
  endDate,
  postsPerWeek,
  themes,
}: {
  brandId: string
  campaignName: string
  campaignGoal: string
  startDate: Date
  endDate: Date
  postsPerWeek: number
  themes: string[]
}) {
  // 1. Create campaign
  const campaign = await prisma.campaign.create({
    data: {
      brandId,
      name: campaignName,
      goal: campaignGoal,
      startDate,
      endDate,
      status: 'PLANNING',
      targetMetrics: {
        totalPosts: postsPerWeek * 4,
        targetEngagementRate: 0.15,
      },
    },
  })

  // 2. Generate post schedule (spread across campaign duration)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const totalPosts = Math.floor((totalDays / 7) * postsPerWeek)

  const postDates: Date[] = []
  for (let i = 0; i < totalPosts; i++) {
    const dayOffset = Math.floor((totalDays / totalPosts) * i)
    const postDate = new Date(startDate)
    postDate.setDate(postDate.getDate() + dayOffset)
    postDate.setHours(10, 0, 0, 0)  // 10 AM each day
    postDates.push(postDate)
  }

  // 3. Generate ideas for each theme
  const brand = await prisma.brandAccount.findUnique({ where: { id: brandId } })
  const allIdeas = []

  for (const theme of themes) {
    const ideas = await generateContentIdeas({
      brandId,
      theme,
      date: startDate,
      count: Math.ceil(totalPosts / themes.length),
      toneProfile: brand!.toneProfile,
    })
    allIdeas.push(...ideas)
  }

  // 4. Create drafts and link to campaign
  const drafts = []
  for (let i = 0; i < Math.min(postDates.length, allIdeas.length); i++) {
    const idea = await prisma.contentIdea.create({
      data: {
        brandId,
        date: postDates[i],
        theme: allIdeas[i].theme,
        hook: allIdeas[i].hook,
        outline: allIdeas[i].outline,
        status: 'APPROVED',
      },
    })

    const draftContent = await generatePostDraft({
      ideaId: idea.id,
      brandId,
      platform: brand!.platform,
      toneProfile: brand!.toneProfile,
    })

    const draft = await prisma.postDraft.create({
      data: {
        brandId,
        ideaId: idea.id,
        campaignId: campaign.id,
        platform: brand!.platform,
        caption: draftContent.caption,
        mediaPlan: draftContent.mediaPlan,
        hashtags: draftContent.hashtags,
        scheduledAt: postDates[i],
        status: 'SCHEDULED',
      },
    })

    drafts.push(draft)
  }

  // 5. Activate campaign
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'ACTIVE' },
  })

  return {
    campaign,
    scheduledPosts: drafts.length,
    postDates,
  }
}
```

**Usage**:

```bash
curl -X POST http://localhost:3000/api/workflows/campaign-planning \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "clq1...",
    "campaignName": "Q1 Product Launch",
    "campaignGoal": "Drive 10k website visits",
    "startDate": "2025-01-15T00:00:00Z",
    "endDate": "2025-02-15T23:59:59Z",
    "postsPerWeek": 5,
    "themes": [
      "Product features",
      "Customer testimonials",
      "Behind the scenes",
      "Tips and tricks"
    ]
  }'
```

---

## External Services

### Recipe 3: Integrate with Zapier for Content Triggers

**Goal**: Trigger content creation when a new entry is added to Google Sheets.

**Implementation**:

**Step 1: Create Webhook Endpoint**

```typescript
// /app/api/webhooks/zapier/content-trigger/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { contentCreationWorkflow } from '@/lib/workflows/content-creation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zapier sends: { brandId, theme, date }
    const { brandId, theme, date } = body

    // Validate webhook signature (optional, recommended)
    const signature = request.headers.get('x-zapier-signature')
    if (signature !== process.env.ZAPIER_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Trigger workflow
    const result = await contentCreationWorkflow({
      brandId,
      theme,
      date: new Date(date),
      autoSchedule: true,
    })

    return NextResponse.json({
      success: true,
      ideasGenerated: result.ideas.length,
      draftScheduled: !!result.scheduledDraft,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**Step 2: Configure Zapier**

1. **Trigger**: Google Sheets - New Row
2. **Action**: Webhooks - POST
   - URL: `https://your-domain.com/api/webhooks/zapier/content-trigger`
   - Headers: `x-zapier-signature: your-secret`
   - Body:
     ```json
     {
       "brandId": "{{Brand ID}}",
       "theme": "{{Theme}}",
       "date": "{{Scheduled Date}}"
     }
     ```

**Step 3: Test**

Add a row to Google Sheets:

| Brand ID | Theme | Scheduled Date |
|----------|-------|----------------|
| clq1... | Morning productivity | 2025-01-25 09:00 |

Result: 3 ideas generated, 1 draft auto-scheduled!

---

### Recipe 4: Slack Notifications for Post Publishing

**Goal**: Send Slack notifications when posts are published or fail.

**Implementation**:

**Step 1: Register Event Handler**

```typescript
// /lib/events/handlers/slack-notifier.ts
import { eventBus, DomainEventType, PostPublishedEvent, PostFailedEvent } from '@/lib/events/domain-events'
import fetch from 'node-fetch'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL!

export function registerSlackNotifier() {
  // Post published
  eventBus.on<PostPublishedEvent>(DomainEventType.POST_PUBLISHED, async (event) => {
    const { postId, platform, stats } = event.payload

    const post = await prisma.postDraft.findUnique({
      where: { id: postId },
      include: { brand: true },
    })

    if (!post) return

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `✅ Post published on ${platform}!`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Post Published*\n\n*Platform:* ${platform}\n*Account:* @${post.brand.handle}\n*Likes:* ${stats.likes}\n*Comments:* ${stats.comments}\n*Engagement Rate:* ${(stats.engagementRate * 100).toFixed(2)}%`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Caption:*\n${post.caption.substring(0, 200)}${post.caption.length > 200 ? '...' : ''}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Post' },
                url: `https://your-app.com/drafts/${postId}`,
              },
            ],
          },
        ],
      }),
    })
  })

  // Post failed
  eventBus.on<PostFailedEvent>(DomainEventType.POST_FAILED, async (event) => {
    const { postId, error } = event.payload

    const post = await prisma.postDraft.findUnique({
      where: { id: postId },
      include: { brand: true },
    })

    if (!post) return

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `❌ Post failed to publish`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Post Failed*\n\n*Platform:* ${post.platform}\n*Account:* @${post.brand.handle}\n*Error:* ${error}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Fix Now' },
                url: `https://your-app.com/drafts/${postId}`,
                style: 'danger',
              },
            ],
          },
        ],
      }),
    })
  })
}
```

**Step 2: Enable During Startup**

```typescript
// /lib/events/event-handlers.ts
import { registerSlackNotifier } from './handlers/slack-notifier'

export function registerAllEventHandlers() {
  registerDefaultHandlers()
  registerSlackNotifier()
}
```

**Environment Variable**:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

---

### Recipe 5: Google Analytics Integration

**Goal**: Track post performance in Google Analytics.

**Implementation**:

```typescript
// /lib/integrations/google-analytics.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data'

export class GoogleAnalyticsIntegration {
  private client: BetaAnalyticsDataClient

  constructor(credentials: any) {
    this.client = new BetaAnalyticsDataClient({ credentials })
  }

  async trackPostPublished(post: PostDraft, brand: BrandAccount) {
    // Send event to GA4
    await fetch('https://www.google-analytics.com/mp/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: brand.id,
        events: [
          {
            name: 'post_published',
            params: {
              platform: post.platform,
              brand_handle: brand.handle,
              post_id: post.id,
              campaign_id: post.campaignId,
              has_media: post.mediaPlan ? 'yes' : 'no',
              hashtag_count: post.hashtags.length,
            },
          },
        ],
      }),
    })
  }

  async getPostTrafficSource(postId: string, startDate: Date, endDate: Date) {
    // Query GA4 for traffic driven by this post
    const [response] = await this.client.runReport({
      property: `properties/${process.env.GA4_PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      ],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'conversions' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'customEvent:post_id',
          stringFilter: { value: postId },
        },
      },
    })

    return response.rows?.map((row) => ({
      source: row.dimensionValues?.[0].value,
      sessions: parseInt(row.metricValues?.[0].value || '0'),
      pageViews: parseInt(row.metricValues?.[1].value || '0'),
      conversions: parseInt(row.metricValues?.[2].value || '0'),
    }))
  }
}
```

**Event Handler**:

```typescript
// /lib/events/handlers/analytics-tracker.ts
import { eventBus, DomainEventType, PostPublishedEvent } from '@/lib/events/domain-events'
import { GoogleAnalyticsIntegration } from '@/lib/integrations/google-analytics'

const gaIntegration = new GoogleAnalyticsIntegration({
  credentials: JSON.parse(process.env.GA4_CREDENTIALS!)
})

export function registerAnalyticsTracker() {
  eventBus.on<PostPublishedEvent>(DomainEventType.POST_PUBLISHED, async (event) => {
    const post = await prisma.postDraft.findUnique({
      where: { id: event.payload.postId },
      include: { brand: true },
    })

    if (post) {
      await gaIntegration.trackPostPublished(post, post.brand)
    }
  })
}
```

---

## Automation Triggers

### Recipe 6: Auto-Approve Ideas Based on Sentiment Analysis

**Goal**: Automatically approve ideas with positive sentiment scores.

**Implementation**:

```typescript
// /lib/workflows/auto-approve-ideas.ts
import { Sentiment } from '@google-cloud/language'

const sentimentClient = new Sentiment.LanguageServiceClient()

export async function autoApproveIdeasWorkflow(brandId: string) {
  // 1. Fetch DRAFT ideas
  const ideas = await prisma.contentIdea.findMany({
    where: { brandId, status: 'DRAFT' },
  })

  for (const idea of ideas) {
    // 2. Analyze sentiment of hook + outline
    const document = {
      content: `${idea.hook}\n\n${idea.outline}`,
      type: 'PLAIN_TEXT' as const,
    }

    const [result] = await sentimentClient.analyzeSentiment({ document })
    const sentiment = result.documentSentiment

    // 3. Auto-approve if positive sentiment (score > 0.3)
    if (sentiment && sentiment.score && sentiment.score > 0.3) {
      await prisma.contentIdea.update({
        where: { id: idea.id },
        data: { status: 'APPROVED' },
      })

      logger.info('Auto-approved idea with positive sentiment', {
        ideaId: idea.id,
        sentimentScore: sentiment.score,
      })

      await eventBus.emit({
        type: DomainEventType.IDEA_APPROVED,
        timestamp: new Date(),
        payload: { ideaId: idea.id, auto: true, sentimentScore: sentiment.score },
      })
    }
  }
}
```

**Cron Job**:

```bash
# Every hour, auto-approve positive ideas
0 * * * * cd /app && npm run workflow:auto-approve-ideas
```

---

### Recipe 7: Dynamic Hashtag Selection Based on Trending Topics

**Goal**: Automatically select hashtags from trending topics on Twitter.

**Implementation**:

```typescript
// /lib/workflows/trending-hashtags.ts
import { TwitterApi } from 'twitter-api-v2'

const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!)

export async function getTrendingHashtags(location: string = 'US'): Promise<string[]> {
  // Get trending topics
  const trends = await twitterClient.v1.get('trends/place.json', {
    id: 23424977,  // WOEID for United States
  })

  // Extract hashtags
  const hashtags = trends[0].trends
    .filter((trend: any) => trend.name.startsWith('#'))
    .slice(0, 10)
    .map((trend: any) => trend.name)

  return hashtags
}

export async function enrichDraftWithTrendingHashtags(draftId: string) {
  const draft = await prisma.postDraft.findUnique({ where: { id: draftId } })
  if (!draft) throw new Error('Draft not found')

  const trendingHashtags = await getTrendingHashtags()

  // Merge with existing hashtags (max 30 for Instagram)
  const combinedHashtags = Array.from(
    new Set([...draft.hashtags, ...trendingHashtags])
  ).slice(0, 30)

  await prisma.postDraft.update({
    where: { id: draftId },
    data: { hashtags: combinedHashtags },
  })

  logger.info('Enriched draft with trending hashtags', {
    draftId,
    added: trendingHashtags.length,
  })

  return combinedHashtags
}
```

---

## Advanced Use Cases

### Recipe 8: A/B Testing Post Captions

**Goal**: Create multiple variations of a post and track which performs best.

**Implementation**:

**Step 1: Generate Variations**

```typescript
// /lib/workflows/ab-testing.ts
export async function createABTestVariations({
  ideaId,
  brandId,
  scheduledAt,
  variationCount = 3,
}: {
  ideaId: string
  brandId: string
  scheduledAt: Date
  variationCount?: number
}) {
  const idea = await prisma.contentIdea.findUnique({ where: { id: ideaId } })
  const brand = await prisma.brandAccount.findUnique({ where: { id: brandId } })

  if (!idea || !brand) throw new Error('Idea or brand not found')

  const variations = []

  for (let i = 0; i < variationCount; i++) {
    const draft = await generatePostDraft({
      ideaId,
      brandId,
      platform: brand.platform,
      toneProfile: brand.toneProfile,
    })

    // Create draft with variation marker
    const savedDraft = await prisma.postDraft.create({
      data: {
        brandId,
        ideaId,
        platform: brand.platform,
        caption: draft.caption,
        mediaPlan: draft.mediaPlan,
        hashtags: draft.hashtags,
        scheduledAt: new Date(scheduledAt.getTime() + i * 60000),  // 1 min apart
        status: 'DRAFT',
        metadata: {  // Store in JSON field
          abTest: true,
          variationIndex: i,
        },
      },
    })

    variations.push(savedDraft)
  }

  return variations
}
```

**Step 2: Analyze Results**

```typescript
export async function analyzeABTestResults(ideaId: string) {
  const variations = await prisma.postDraft.findMany({
    where: {
      ideaId,
      status: 'PUBLISHED',
      metadata: { path: ['abTest'], equals: true },
    },
  })

  const results = variations.map((v) => ({
    draftId: v.id,
    variationIndex: v.metadata.variationIndex,
    caption: v.caption.substring(0, 100),
    engagementRate: v.resultStats?.engagementRate || 0,
    likes: v.resultStats?.likes || 0,
    comments: v.resultStats?.comments || 0,
  }))

  // Find winner
  const winner = results.reduce((best, current) =>
    current.engagementRate > best.engagementRate ? current : best
  )

  return {
    variations: results,
    winner,
    improvement: ((winner.engagementRate / results[0].engagementRate - 1) * 100).toFixed(2) + '%',
  }
}
```

---

### Recipe 9: Content Repurposing Across Platforms

**Goal**: Automatically adapt a single idea for multiple platforms.

**Implementation**:

```typescript
// /lib/workflows/cross-platform-publishing.ts
export async function repurposeContentAcrossPlatforms({
  ideaId,
  platforms,
  scheduledAt,
}: {
  ideaId: string
  platforms: Platform[]
  scheduledAt: Date
}) {
  const idea = await prisma.contentIdea.findUnique({ where: { id: ideaId } })
  if (!idea) throw new Error('Idea not found')

  const drafts = []

  for (const platform of platforms) {
    // Find brand account for this platform
    const brand = await prisma.brandAccount.findFirst({
      where: { id: idea.brandId, platform },
    })

    if (!brand) {
      logger.warn('No brand account for platform', { platform })
      continue
    }

    // Generate platform-optimized draft
    const draft = await generatePostDraft({
      ideaId,
      brandId: brand.id,
      platform,
      toneProfile: brand.toneProfile,
    })

    // Create draft
    const savedDraft = await prisma.postDraft.create({
      data: {
        brandId: brand.id,
        ideaId,
        platform,
        caption: draft.caption,
        mediaPlan: draft.mediaPlan,
        hashtags: draft.hashtags,
        scheduledAt,
        status: 'SCHEDULED',
      },
    })

    drafts.push(savedDraft)
  }

  return drafts
}
```

**Usage**:

```bash
curl -X POST http://localhost:3000/api/workflows/repurpose \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "clq2...",
    "platforms": ["INSTAGRAM", "THREADS", "NOTE"],
    "scheduledAt": "2025-01-25T10:00:00Z"
  }'
```

Result: Same idea published across 3 platforms with platform-specific optimizations!

---

### Recipe 10: Performance-Based Campaign Optimization

**Goal**: Pause low-performing campaigns and boost high-performing ones.

**Implementation**:

```typescript
// /lib/workflows/campaign-optimization.ts
export async function optimizeCampaignsWorkflow() {
  const activeCampaigns = await prisma.campaign.findMany({
    where: { status: 'ACTIVE' },
    include: {
      posts: {
        where: { status: 'PUBLISHED' },
      },
    },
  })

  for (const campaign of activeCampaigns) {
    const metrics = await campaignService.getMetrics(campaign.id)

    // Check if campaign is underperforming
    if (metrics.avgEngagementRate < 0.05 && metrics.publishedPosts >= 5) {
      // Pause campaign
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'ARCHIVED' },
      })

      // Cancel scheduled posts
      await prisma.postDraft.updateMany({
        where: {
          campaignId: campaign.id,
          status: 'SCHEDULED',
        },
        data: { status: 'DRAFT', campaignId: null },
      })

      logger.warn('Paused underperforming campaign', {
        campaignId: campaign.id,
        avgEngagementRate: metrics.avgEngagementRate,
      })

      // Send notification
      await pluginRegistry.getNotificationProvider().notify({
        channel: 'slack',
        message: `⚠️ Campaign "${campaign.name}" paused due to low engagement (${(metrics.avgEngagementRate * 100).toFixed(2)}%)`,
        priority: 'high',
      })
    }

    // Check if campaign is overperforming
    if (metrics.avgEngagementRate > 0.20 && metrics.completionRate < 0.8) {
      // Increase posting frequency
      const scheduledPosts = await prisma.postDraft.findMany({
        where: {
          campaignId: campaign.id,
          status: 'DRAFT',
        },
        take: 3,
      })

      for (const post of scheduledPosts) {
        const nextSlot = new Date()
        nextSlot.setDate(nextSlot.getDate() + 1)
        nextSlot.setHours(10, 0, 0, 0)

        await prisma.postDraft.update({
          where: { id: post.id },
          data: {
            scheduledAt: nextSlot,
            status: 'SCHEDULED',
          },
        })
      }

      logger.info('Boosted high-performing campaign', {
        campaignId: campaign.id,
        avgEngagementRate: metrics.avgEngagementRate,
        additionalPosts: scheduledPosts.length,
      })
    }
  }
}
```

**Cron Job**:

```bash
# Daily campaign optimization
0 2 * * * cd /app && npm run workflow:optimize-campaigns
```

---

## Third-Party Integrations

### Recipe 11: Canva Integration for Media Creation

**Goal**: Generate social media graphics using Canva API.

**Implementation**:

```typescript
// /lib/integrations/canva.ts
export class CanvaIntegration {
  constructor(private apiKey: string) {}

  async createDesignFromTemplate({
    templateId,
    textReplacements,
  }: {
    templateId: string
    textReplacements: Record<string, string>
  }) {
    const response = await fetch('https://api.canva.com/v1/designs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_type: 'SocialMediaPost',
        template_id: templateId,
        text_replacements: Object.entries(textReplacements).map(([key, value]) => ({
          element_id: key,
          text: value,
        })),
      }),
    })

    const data = await response.json()
    return data.design_id
  }

  async exportDesign(designId: string, format: 'png' | 'jpg' = 'png') {
    const response = await fetch(`https://api.canva.com/v1/designs/${designId}/export`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ format }),
    })

    const data = await response.json()
    return data.export_url
  }
}
```

**Usage in Draft Generation**:

```typescript
// /lib/llm.ts (enhanced)
import { CanvaIntegration } from './integrations/canva'

const canva = new CanvaIntegration(process.env.CANVA_API_KEY!)

export async function generatePostDraftWithMedia({ ideaId, brandId, canvaTemplateId }: any) {
  // 1. Generate caption
  const draft = await generatePostDraft({ ideaId, brandId, ... })

  // 2. Create Canva design
  const designId = await canva.createDesignFromTemplate({
    templateId: canvaTemplateId,
    textReplacements: {
      title: draft.caption.split('\n')[0],  // First line as title
      subtitle: 'Follow @' + brand.handle,
    },
  })

  // 3. Export and upload to media provider
  const imageUrl = await canva.exportDesign(designId, 'png')
  const mediaProvider = pluginRegistry.getMediaProvider()
  const uploadResult = await mediaProvider.upload({
    file: {
      name: `${ideaId}-canva.png`,
      buffer: await fetch(imageUrl).then(r => r.buffer()),
      type: 'image/png',
      size: 0,
    },
    brandId,
  })

  // 4. Link media to draft
  const mediaAsset = await prisma.mediaAsset.create({
    data: {
      brandId,
      url: uploadResult.url,
      type: 'IMAGE',
      mimeType: 'image/png',
      size: uploadResult.size,
      metadata: { source: 'canva', designId },
    },
  })

  return { draft, mediaAsset }
}
```

---

### Recipe 12: Airtable as Content Calendar

**Goal**: Sync post schedule with Airtable for team collaboration.

**Implementation**:

```typescript
// /lib/integrations/airtable.ts
import Airtable from 'airtable'

export class AirtableIntegration {
  private base: any

  constructor(apiKey: string, baseId: string) {
    Airtable.configure({ apiKey })
    this.base = Airtable.base(baseId)
  }

  async syncScheduledPosts(brandId: string) {
    const posts = await prisma.postDraft.findMany({
      where: { brandId, status: 'SCHEDULED' },
      include: { brand: true, idea: true },
    })

    for (const post of posts) {
      await this.base('Content Calendar').create({
        'Post ID': post.id,
        'Platform': post.platform,
        'Account': post.brand.handle,
        'Theme': post.idea?.theme || 'N/A',
        'Caption': post.caption,
        'Scheduled Date': post.scheduledAt?.toISOString(),
        'Status': post.status,
        'Hashtags': post.hashtags.join(', '),
      })
    }
  }

  async watchForUpdates(callback: (record: any) => void) {
    this.base('Content Calendar')
      .select({ view: 'Grid view' })
      .eachPage((records: any[], fetchNextPage: () => void) => {
        records.forEach(callback)
        fetchNextPage()
      })
  }
}
```

**Webhook for Bidirectional Sync**:

```typescript
// /app/api/webhooks/airtable/route.ts
export async function POST(request: NextRequest) {
  const { recordId, fields } = await request.json()

  if (fields['Status'] === 'Cancelled') {
    // Cancel post in our system
    await prisma.postDraft.update({
      where: { id: fields['Post ID'] },
      data: { status: 'DRAFT', scheduledAt: null },
    })
  }

  return NextResponse.json({ success: true })
}
```

---

## See Also

- [Extension Guide](./EXTENSION_GUIDE.md) - Building custom providers
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Architecture Overview](./ARCHITECTURE.md) - System design
