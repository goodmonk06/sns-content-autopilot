# Extension Guide

This guide explains how to extend SNS Content Autopilot with custom providers, plugins, and integrations.

## Table of Contents

- [Extension Architecture](#extension-architecture)
- [Provider Interfaces](#provider-interfaces)
- [Building Custom Providers](#building-custom-providers)
- [Adding SNS Platforms](#adding-sns-platforms)
- [Custom Scheduling Strategies](#custom-scheduling-strategies)
- [Event Handlers](#event-handlers)
- [Testing Extensions](#testing-extensions)
- [Publishing Extensions](#publishing-extensions)

## Extension Architecture

SNS Content Autopilot follows a **pluggable architecture** where core functionality is defined by interfaces, and concrete implementations can be swapped at runtime.

### Key Extension Points

1. **Media Providers** (`IMediaProvider`): Upload and manage media assets (images, videos)
2. **Content Generators** (`IContentGenerator`): Generate content ideas and post drafts using AI
3. **Analytics Providers** (`IAnalyticsProvider`): Fetch performance metrics from social platforms
4. **Notification Providers** (`INotificationProvider`): Send notifications via email, Slack, webhook
5. **SNS Clients** (`BaseSNSClient`): Publish posts to social media platforms
6. **Event Handlers**: React to domain events (post published, campaign completed, etc.)
7. **Scheduling Strategies**: Define optimal posting times

### Plugin Registry

All providers are managed through a central **Plugin Registry**:

```typescript
// /lib/plugin-registry.ts
export class PluginRegistry {
  private mediaProvider: IMediaProvider
  private contentGenerator: IContentGenerator
  private analyticsProvider: IAnalyticsProvider
  private notificationProvider: INotificationProvider

  // Getters
  getMediaProvider(): IMediaProvider { return this.mediaProvider }
  getContentGenerator(): IContentGenerator { return this.contentGenerator }
  getAnalyticsProvider(): IAnalyticsProvider { return this.analyticsProvider }
  getNotificationProvider(): INotificationProvider { return this.notificationProvider }

  // Setters (for dependency injection)
  setMediaProvider(provider: IMediaProvider) { this.mediaProvider = provider }
  setContentGenerator(provider: IContentGenerator) { this.contentGenerator = provider }
  setAnalyticsProvider(provider: IAnalyticsProvider) { this.analyticsProvider = provider }
  setNotificationProvider(provider: INotificationProvider) { this.notificationProvider = provider }
}

export const pluginRegistry = new PluginRegistry()
```

**Usage in Application Code**:
```typescript
// Services don't depend on concrete implementations
const mediaProvider = pluginRegistry.getMediaProvider()
const result = await mediaProvider.upload({ file, brandId })

// Provider can be swapped without changing service code
pluginRegistry.setMediaProvider(new S3MediaProvider(s3Client, bucket))
```

---

## Provider Interfaces

### 1. IMediaProvider

Handles media asset storage and retrieval.

**Interface Definition**:
```typescript
// /lib/adapters/media-provider.ts
export interface MediaUploadOptions {
  file: {
    name: string
    buffer: Buffer
    type: string  // MIME type
    size: number
  }
  brandId: string
  metadata?: Record<string, any>
}

export interface MediaUploadResult {
  url: string
  mimeType: string
  size: number
  width?: number
  height?: number
  duration?: number  // For videos
  provider?: string
  providerAssetId?: string
}

export interface MediaDeleteOptions {
  url: string
  brandId: string
}

export interface IMediaProvider {
  /**
   * Upload a media file
   */
  upload(options: MediaUploadOptions): Promise<MediaUploadResult>

  /**
   * Delete a media file
   */
  delete(options: MediaDeleteOptions): Promise<void>

  /**
   * Generate signed URL for private assets
   */
  getSignedUrl(url: string, expiresIn?: number): Promise<string>

  /**
   * Get provider name for logging/debugging
   */
  getProviderName(): string
}
```

### 2. IContentGenerator

Generates content using AI models.

**Interface Definition**:
```typescript
// /lib/adapters/content-generator.ts
export interface GenerateIdeasInput {
  theme: string
  brandTone: BrandToneProfile
  count: number
  date: Date
}

export interface GenerateDraftInput {
  idea: ContentIdea
  brandTone: BrandToneProfile
  platform: Platform
  template?: ContentTemplate
  hashtagSet?: HashtagSet
}

export interface ContentIdea {
  theme: string
  hook: string
  outline: string
}

export interface PostDraft {
  caption: string
  mediaPlan: MediaPlan
  hashtags: string[]
}

export interface IContentGenerator {
  /**
   * Generate content ideas from a theme
   */
  generateIdeas(input: GenerateIdeasInput): Promise<ContentIdea[]>

  /**
   * Generate post draft from an idea
   */
  generateDraft(input: GenerateDraftInput): Promise<PostDraft>

  /**
   * Get model name/version
   */
  getModelInfo(): { provider: string; model: string; version?: string }
}
```

### 3. IAnalyticsProvider

Fetches performance metrics from social platforms.

**Interface Definition**:
```typescript
// /lib/adapters/analytics-provider.ts
export interface FetchMetricsInput {
  platform: Platform
  postId: string
  platformPostId: string  // ID on the social platform
  accessToken: string
}

export interface PostMetrics {
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  impressions: number
  engagementRate: number
  clickThroughRate?: number
}

export interface IAnalyticsProvider {
  /**
   * Fetch current metrics for a published post
   */
  fetchMetrics(input: FetchMetricsInput): Promise<PostMetrics>

  /**
   * Check if provider supports the platform
   */
  supportsPlatform(platform: Platform): boolean

  /**
   * Get provider name
   */
  getProviderName(): string
}
```

### 4. INotificationProvider

Sends notifications to users or teams.

**Interface Definition**:
```typescript
// /lib/adapters/notification-provider.ts
export interface SendNotificationInput {
  channel: 'email' | 'slack' | 'webhook' | 'sms'
  recipient?: string  // Email address, Slack channel, phone number
  subject?: string
  message: string
  data?: Record<string, any>
  priority?: 'low' | 'normal' | 'high'
}

export interface INotificationProvider {
  /**
   * Send a notification
   */
  notify(input: SendNotificationInput): Promise<void>

  /**
   * Check if channel is supported
   */
  supportsChannel(channel: string): boolean

  /**
   * Get provider name
   */
  getProviderName(): string
}
```

---

## Building Custom Providers

### Example 1: Custom Media Provider (Imgur)

Let's build a custom media provider for Imgur.

**Step 1: Implement the Interface**

```typescript
// /lib/adapters/media-providers/imgur.ts
import { IMediaProvider, MediaUploadOptions, MediaUploadResult, MediaDeleteOptions } from '../media-provider'
import fetch from 'node-fetch'

export class ImgurMediaProvider implements IMediaProvider {
  constructor(private clientId: string) {
    if (!clientId) {
      throw new Error('Imgur client ID is required')
    }
  }

  async upload({ file, brandId, metadata }: MediaUploadOptions): Promise<MediaUploadResult> {
    const formData = new FormData()
    formData.append('image', file.buffer.toString('base64'))
    formData.append('type', 'base64')
    formData.append('name', file.name)
    formData.append('title', metadata?.title || file.name)

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: `Client-ID ${this.clientId}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Imgur upload failed: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      url: data.data.link,
      mimeType: file.type,
      size: file.size,
      width: data.data.width,
      height: data.data.height,
      provider: 'imgur',
      providerAssetId: data.data.id,
    }
  }

  async delete({ url }: MediaDeleteOptions): Promise<void> {
    // Extract image hash from URL
    const hash = url.split('/').pop()?.split('.')[0]
    if (!hash) {
      throw new Error('Invalid Imgur URL')
    }

    const response = await fetch(`https://api.imgur.com/3/image/${hash}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Client-ID ${this.clientId}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Imgur delete failed: ${response.statusText}`)
    }
  }

  async getSignedUrl(url: string, expiresIn?: number): Promise<string> {
    // Imgur URLs are public, no signing needed
    return url
  }

  getProviderName(): string {
    return 'imgur'
  }
}
```

**Step 2: Register the Provider**

```typescript
// /lib/config/providers.ts
import { pluginRegistry } from '@/lib/plugin-registry'
import { ImgurMediaProvider } from '@/lib/adapters/media-providers/imgur'

export function initializeProviders() {
  // Media provider selection
  if (process.env.MEDIA_PROVIDER === 'imgur') {
    const clientId = process.env.IMGUR_CLIENT_ID
    if (!clientId) {
      throw new Error('IMGUR_CLIENT_ID environment variable is required')
    }
    pluginRegistry.setMediaProvider(new ImgurMediaProvider(clientId))
    console.log('✓ Initialized Imgur media provider')
  }
  // ... other providers
}
```

**Step 3: Call During Application Startup**

```typescript
// /app/layout.tsx or /lib/init.ts
import { initializeProviders } from '@/lib/config/providers'

initializeProviders()
```

**Step 4: Add Environment Variables**

```env
# .env
MEDIA_PROVIDER=imgur
IMGUR_CLIENT_ID=your-imgur-client-id
```

**Usage**:
```typescript
// Anywhere in the application
const provider = pluginRegistry.getMediaProvider()
const result = await provider.upload({ file, brandId })
// Now using Imgur instead of local storage!
```

### Example 2: Custom Content Generator (Anthropic Claude)

**Step 1: Implement the Interface**

```typescript
// /lib/adapters/content-generators/anthropic.ts
import { IContentGenerator, GenerateIdeasInput, GenerateDraftInput, ContentIdea, PostDraft } from '../content-generator'
import Anthropic from '@anthropic-ai/sdk'

export class AnthropicContentGenerator implements IContentGenerator {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async generateIdeas({ theme, brandTone, count, date }: GenerateIdeasInput): Promise<ContentIdea[]> {
    const prompt = `You are a social media content strategist. Generate ${count} unique content ideas based on this theme: "${theme}".

Brand tone: ${JSON.stringify(brandTone, null, 2)}

For each idea, provide:
1. A refined, specific theme
2. An attention-grabbing hook (opening line)
3. A detailed outline in markdown

Return as JSON array: [{ theme, hook, outline }, ...]`

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const ideas = JSON.parse(responseText)
    return ideas
  }

  async generateDraft({ idea, brandTone, platform, template, hashtagSet }: GenerateDraftInput): Promise<PostDraft> {
    let prompt = `You are a social media content creator. Create a ${platform} post based on this content idea:

Theme: ${idea.theme}
Hook: ${idea.hook}
Outline: ${idea.outline}

Brand tone: ${JSON.stringify(brandTone, null, 2)}`

    if (template) {
      prompt += `\n\nUse this template structure: ${JSON.stringify(template.structure)}`
    }

    if (hashtagSet) {
      prompt += `\n\nUse these hashtags: ${hashtagSet.hashtags.join(', ')}`
    }

    prompt += `\n\nReturn JSON: { caption, mediaPlan: { type, description, suggestedStyle, aspectRatio }, hashtags }`

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const draft = JSON.parse(responseText)
    return draft
  }

  getModelInfo() {
    return {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
      version: '20241022',
    }
  }
}
```

**Step 2: Register the Provider**

```typescript
// /lib/config/providers.ts
if (process.env.CONTENT_GENERATOR === 'anthropic') {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required')
  }
  pluginRegistry.setContentGenerator(new AnthropicContentGenerator(apiKey))
  console.log('✓ Initialized Anthropic content generator')
}
```

**Environment Variables**:
```env
CONTENT_GENERATOR=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### Example 3: Custom Notification Provider (Discord Webhook)

**Step 1: Implement the Interface**

```typescript
// /lib/adapters/notification-providers/discord.ts
import { INotificationProvider, SendNotificationInput } from '../notification-provider'
import fetch from 'node-fetch'

export class DiscordNotificationProvider implements INotificationProvider {
  constructor(private webhookUrl: string) {}

  async notify({ message, data, priority }: SendNotificationInput): Promise<void> {
    const color = priority === 'high' ? 15158332 : priority === 'low' ? 3447003 : 16776960  // Red, Blue, Yellow

    const embed = {
      title: data?.title || 'SNS Content Autopilot Notification',
      description: message,
      color,
      fields: data ? Object.entries(data).map(([name, value]) => ({
        name,
        value: String(value),
        inline: true,
      })) : [],
      timestamp: new Date().toISOString(),
    }

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.statusText}`)
    }
  }

  supportsChannel(channel: string): boolean {
    return channel === 'webhook' || channel === 'discord'
  }

  getProviderName(): string {
    return 'discord'
  }
}
```

**Step 2: Compose with MultiChannelNotificationProvider**

```typescript
// /lib/config/providers.ts
import { MultiChannelNotificationProvider } from '@/lib/adapters/notification-provider'
import { DiscordNotificationProvider } from '@/lib/adapters/notification-providers/discord'

const notificationProvider = new MultiChannelNotificationProvider()

if (process.env.DISCORD_WEBHOOK_URL) {
  notificationProvider.addProvider(new DiscordNotificationProvider(process.env.DISCORD_WEBHOOK_URL))
  console.log('✓ Added Discord notification provider')
}

pluginRegistry.setNotificationProvider(notificationProvider)
```

**Environment Variables**:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123/abc
```

**Usage**:
```typescript
await pluginRegistry.getNotificationProvider().notify({
  channel: 'discord',
  message: 'Post published successfully!',
  data: { postId: 'clq...', platform: 'INSTAGRAM' },
  priority: 'normal',
})
```

---

## Adding SNS Platforms

To add support for a new social media platform (e.g., TikTok, LinkedIn, X/Twitter):

### Step 1: Update Prisma Schema

```prisma
// /prisma/schema.prisma
enum Platform {
  INSTAGRAM
  THREADS
  NOTE
  TIKTOK      // New platform
}
```

Run migration:
```bash
npx prisma db push
```

### Step 2: Implement SNS Client

```typescript
// /lib/sns-clients/tiktok.ts
import { BaseSNSClient, PostResult } from './base'

export class TikTokClient extends BaseSNSClient {
  constructor(accessToken: string, handle: string) {
    super(accessToken, handle)
  }

  async publish(caption: string, mediaUrls: string[]): Promise<PostResult> {
    // Real TikTok API implementation
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption,
          privacy_level: 'SELF_ONLY',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_url: mediaUrls[0],
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`TikTok API error: ${data.error.message}`)
    }

    // Fetch initial stats
    const stats = await this.getStats(data.data.publish_id)

    return {
      platformPostId: data.data.publish_id,
      publishedUrl: `https://www.tiktok.com/@${this.handle}/video/${data.data.publish_id}`,
      stats,
    }
  }

  async getStats(postId: string): Promise<any> {
    // Fetch video stats from TikTok API
    const response = await fetch(`https://open.tiktokapis.com/v2/video/query/?fields=like_count,comment_count,share_count,view_count`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: {
          video_ids: [postId],
        },
      }),
    })

    const data = await response.json()
    const video = data.data.videos[0]

    return {
      likes: video.like_count,
      comments: video.comment_count,
      shares: video.share_count,
      views: video.view_count,
      engagementRate: (video.like_count + video.comment_count + video.share_count) / video.view_count,
    }
  }
}
```

### Step 3: Update Factory

```typescript
// /lib/sns-clients/index.ts
import { TikTokClient } from './tiktok'

export function createSNSClient(brand: BrandAccount): BaseSNSClient {
  const accessToken = decrypt(brand.accessToken)

  switch (brand.platform) {
    case 'INSTAGRAM':
      return new InstagramClient(accessToken, brand.handle)
    case 'THREADS':
      return new ThreadsClient(accessToken, brand.handle)
    case 'NOTE':
      return new NoteClient(accessToken, brand.handle)
    case 'TIKTOK':
      return new TikTokClient(accessToken, brand.handle)
    default:
      throw new Error(`Unsupported platform: ${brand.platform}`)
  }
}
```

### Step 4: Update Validation

```typescript
// /lib/validations.ts
export const platformSchema = z.enum(['INSTAGRAM', 'THREADS', 'NOTE', 'TIKTOK'])
```

### Step 5: Update UI

```typescript
// Platform selector component
const PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'THREADS', label: 'Threads' },
  { value: 'NOTE', label: 'Note' },
  { value: 'TIKTOK', label: 'TikTok' },
]
```

---

## Custom Scheduling Strategies

Add custom logic for determining optimal posting times.

### Step 1: Update Enum

```prisma
// /prisma/schema.prisma
enum SchedulingStrategy {
  OPTIMAL_ENGAGEMENT
  CONSISTENT_DAILY
  BURST
  CUSTOM
  ML_PREDICTED      // New strategy
}
```

### Step 2: Implement Strategy

```typescript
// /lib/scheduling/strategies/ml-predicted.ts
import { SchedulingStrategy } from './base'
import { BrandAccount, PerformanceSnapshot } from '@prisma/client'
import { prisma } from '@/lib/db'

export class MLPredictedStrategy implements SchedulingStrategy {
  async getNextPostTime(brand: BrandAccount): Promise<Date> {
    // 1. Fetch historical performance data
    const snapshots = await prisma.performanceSnapshot.findMany({
      where: {
        post: {
          brandId: brand.id,
          status: 'PUBLISHED',
        },
      },
      include: { post: true },
      orderBy: { snapshotAt: 'desc' },
      take: 100,
    })

    // 2. Extract features (hour of day, day of week, engagement rate)
    const features = snapshots.map(s => ({
      hour: new Date(s.post.publishedAt!).getHours(),
      dayOfWeek: new Date(s.post.publishedAt!).getDay(),
      engagementRate: s.metrics.engagementRate || 0,
    }))

    // 3. Find peak engagement hour
    const hourPerformance = new Map<number, number[]>()
    features.forEach(f => {
      if (!hourPerformance.has(f.hour)) {
        hourPerformance.set(f.hour, [])
      }
      hourPerformance.get(f.hour)!.push(f.engagementRate)
    })

    let bestHour = 9  // Default
    let bestAvgEngagement = 0

    hourPerformance.forEach((rates, hour) => {
      const avgEngagement = rates.reduce((sum, r) => sum + r, 0) / rates.length
      if (avgEngagement > bestAvgEngagement) {
        bestAvgEngagement = avgEngagement
        bestHour = hour
      }
    })

    // 4. Schedule for tomorrow at best hour
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(bestHour, 0, 0, 0)

    return tomorrow
  }

  getName(): string {
    return 'ML_PREDICTED'
  }
}
```

### Step 3: Register Strategy

```typescript
// /lib/scheduling/strategy-factory.ts
import { MLPredictedStrategy } from './strategies/ml-predicted'

export function createSchedulingStrategy(rule: SchedulingRule): SchedulingStrategy {
  switch (rule.strategy) {
    case 'OPTIMAL_ENGAGEMENT':
      return new OptimalEngagementStrategy()
    case 'CONSISTENT_DAILY':
      return new ConsistentDailyStrategy(rule.timeSlots)
    case 'BURST':
      return new BurstStrategy(rule.timeSlots)
    case 'CUSTOM':
      return new CustomStrategy(rule.timeSlots)
    case 'ML_PREDICTED':
      return new MLPredictedStrategy()
    default:
      throw new Error(`Unknown strategy: ${rule.strategy}`)
  }
}
```

### Step 4: Use in API

```typescript
// /app/api/drafts/suggest-time/route.ts
export async function POST(request: NextRequest) {
  const { brandId } = await request.json()

  const brand = await prisma.brandAccount.findUnique({ where: { id: brandId } })
  const rule = await prisma.schedulingRule.findFirst({
    where: { brandId, isActive: true },
  })

  if (!rule) {
    return NextResponse.json({ error: 'No active scheduling rule' }, { status: 404 })
  }

  const strategy = createSchedulingStrategy(rule)
  const suggestedTime = await strategy.getNextPostTime(brand!)

  return NextResponse.json({ suggestedTime })
}
```

---

## Event Handlers

React to domain events with custom logic.

### Built-in Events

```typescript
export enum DomainEventType {
  IDEA_CREATED = 'idea.created',
  IDEA_APPROVED = 'idea.approved',
  DRAFT_CREATED = 'draft.created',
  DRAFT_SCHEDULED = 'draft.scheduled',
  POST_PUBLISHED = 'post.published',
  POST_FAILED = 'post.failed',
  CAMPAIGN_CREATED = 'campaign.created',
  CAMPAIGN_COMPLETED = 'campaign.completed',
  TEMPLATE_USED = 'template.used',
  PERFORMANCE_MILESTONE = 'performance.milestone',
}
```

### Custom Event Handler Example

**Scenario**: Send a Slack notification when a post reaches 1000 likes.

```typescript
// /lib/events/handlers/milestone-notifier.ts
import { eventBus, DomainEventType, PerformanceMilestoneEvent } from '@/lib/events/domain-events'
import { pluginRegistry } from '@/lib/plugin-registry'

export function registerMilestoneNotifier() {
  eventBus.on<PerformanceMilestoneEvent>(
    DomainEventType.PERFORMANCE_MILESTONE,
    async (event) => {
      const { postId, milestone, currentValue } = event.payload

      // Fetch post details
      const post = await prisma.postDraft.findUnique({
        where: { id: postId },
        include: { brand: true },
      })

      if (!post) return

      // Send notification
      await pluginRegistry.getNotificationProvider().notify({
        channel: 'slack',
        message: `🎉 Milestone reached! Post on ${post.brand.handle} hit ${currentValue} ${milestone}!`,
        data: {
          postId,
          platform: post.platform,
          milestone,
          currentValue,
          url: `https://your-app.com/drafts/${postId}`,
        },
        priority: 'high',
      })
    }
  )
}
```

**Register During Startup**:
```typescript
// /lib/events/event-handlers.ts
import { registerMilestoneNotifier } from './handlers/milestone-notifier'

export function registerAllEventHandlers() {
  registerDefaultHandlers()
  registerMilestoneNotifier()
  // ... other custom handlers
}
```

**Emit Event from Worker**:
```typescript
// /workers/performance-snapshot-collector.ts
const previousSnapshot = snapshots[snapshots.length - 1]
const currentSnapshot = await fetchLatestMetrics(post)

if (previousSnapshot.metrics.likes < 1000 && currentSnapshot.metrics.likes >= 1000) {
  await eventBus.emit({
    type: DomainEventType.PERFORMANCE_MILESTONE,
    timestamp: new Date(),
    payload: {
      postId: post.id,
      milestone: 'likes',
      currentValue: currentSnapshot.metrics.likes,
      previousValue: previousSnapshot.metrics.likes,
    },
  })
}
```

---

## Testing Extensions

### Unit Testing Custom Providers

```typescript
// /lib/adapters/__tests__/imgur-provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImgurMediaProvider } from '../media-providers/imgur'
import fetch from 'node-fetch'

vi.mock('node-fetch')

describe('ImgurMediaProvider', () => {
  let provider: ImgurMediaProvider

  beforeEach(() => {
    provider = new ImgurMediaProvider('test-client-id')
  })

  it('should upload image successfully', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        data: {
          id: 'abc123',
          link: 'https://i.imgur.com/abc123.jpg',
          width: 800,
          height: 600,
        },
      }),
    }

    vi.mocked(fetch).mockResolvedValue(mockResponse as any)

    const result = await provider.upload({
      file: {
        name: 'test.jpg',
        buffer: Buffer.from('test'),
        type: 'image/jpeg',
        size: 1024,
      },
      brandId: 'clq123',
    })

    expect(result).toEqual({
      url: 'https://i.imgur.com/abc123.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      width: 800,
      height: 600,
      provider: 'imgur',
      providerAssetId: 'abc123',
    })

    expect(fetch).toHaveBeenCalledWith(
      'https://api.imgur.com/3/image',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Client-ID test-client-id',
        }),
      })
    )
  })

  it('should throw error on upload failure', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    } as any)

    await expect(provider.upload({
      file: {
        name: 'test.jpg',
        buffer: Buffer.from('test'),
        type: 'image/jpeg',
        size: 1024,
      },
      brandId: 'clq123',
    })).rejects.toThrow('Imgur upload failed: Unauthorized')
  })
})
```

### Integration Testing

```typescript
// /tests/integration/media-upload.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { pluginRegistry } from '@/lib/plugin-registry'
import { ImgurMediaProvider } from '@/lib/adapters/media-providers/imgur'
import fs from 'fs'

describe('Media Upload Integration', () => {
  beforeAll(() => {
    // Use real provider with test credentials
    pluginRegistry.setMediaProvider(
      new ImgurMediaProvider(process.env.IMGUR_TEST_CLIENT_ID!)
    )
  })

  it('should upload real image to Imgur', async () => {
    const imageBuffer = fs.readFileSync('./tests/fixtures/test-image.jpg')

    const provider = pluginRegistry.getMediaProvider()
    const result = await provider.upload({
      file: {
        name: 'test-image.jpg',
        buffer: imageBuffer,
        type: 'image/jpeg',
        size: imageBuffer.length,
      },
      brandId: 'test-brand',
    })

    expect(result.url).toMatch(/^https:\/\/i\.imgur\.com\//)
    expect(result.provider).toBe('imgur')

    // Cleanup
    await provider.delete({ url: result.url, brandId: 'test-brand' })
  })
})
```

---

## Publishing Extensions

### Creating an NPM Package

**Step 1: Package Structure**

```
imgur-media-provider/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   └── index.ts
└── tests/
    └── index.test.ts
```

**Step 2: package.json**

```json
{
  "name": "@sns-autopilot/imgur-media-provider",
  "version": "1.0.0",
  "description": "Imgur media provider for SNS Content Autopilot",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "peerDependencies": {
    "sns-content-autopilot": "^1.0.0"
  },
  "dependencies": {
    "node-fetch": "^3.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "keywords": ["sns-autopilot", "imgur", "media-provider", "plugin"],
  "author": "Your Name",
  "license": "MIT"
}
```

**Step 3: Export Provider**

```typescript
// src/index.ts
export { ImgurMediaProvider } from './imgur-provider'
export type { IMediaProvider, MediaUploadOptions, MediaUploadResult } from 'sns-content-autopilot'
```

**Step 4: Publish**

```bash
npm login
npm publish --access public
```

### Using Published Extensions

```bash
npm install @sns-autopilot/imgur-media-provider
```

```typescript
// /lib/config/providers.ts
import { ImgurMediaProvider } from '@sns-autopilot/imgur-media-provider'

if (process.env.MEDIA_PROVIDER === 'imgur') {
  pluginRegistry.setMediaProvider(
    new ImgurMediaProvider(process.env.IMGUR_CLIENT_ID!)
  )
}
```

---

## Best Practices

1. **Interface Compliance**: Always implement all methods defined in the interface
2. **Error Handling**: Throw descriptive errors with context
3. **Logging**: Use structured logger for debugging
4. **Configuration**: Use environment variables for credentials
5. **Testing**: Write unit tests for all public methods
6. **Documentation**: Include JSDoc comments and README
7. **Versioning**: Follow semantic versioning (semver)
8. **Type Safety**: Export TypeScript types for consumers

---

## Extension Checklist

Before publishing an extension:

- [ ] Implements required interface completely
- [ ] Throws errors with clear messages
- [ ] Uses environment variables for secrets
- [ ] Includes unit tests (80%+ coverage)
- [ ] Includes integration tests (if applicable)
- [ ] Has comprehensive README with examples
- [ ] Exports TypeScript types
- [ ] Follows semantic versioning
- [ ] Has proper package.json with peerDependencies
- [ ] Documented in extension registry (community repo)

---

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [Domain Model](./DOMAIN_MODEL.md)
- [API Reference](./API_REFERENCE.md)
- [Integration Recipes](./INTEGRATION_RECIPES.md)
