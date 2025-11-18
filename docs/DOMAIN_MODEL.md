# Domain Model

This document provides a comprehensive view of the SNS Content Autopilot domain model, including entity relationships, business rules, and data flows.

## Overview

The domain model is organized around **Brand Accounts** that manage content across multiple social media platforms (Instagram, Threads, Note). Content flows through a lifecycle from ideation to publishing:

1. **Content Ideas** are generated (manually or via AI)
2. **Post Drafts** are created from ideas (or standalone)
3. Drafts are **Scheduled** for publication
4. A **Worker** publishes scheduled posts
5. **Performance Snapshots** track engagement over time

Additional entities support advanced workflows:
- **Campaigns** coordinate multiple posts toward a common goal
- **Content Templates** provide reusable post structures
- **Hashtag Sets** manage hashtag strategies with performance tracking
- **Media Assets** organize visual content
- **Scheduling Rules** optimize posting times

## Core Entities

### BrandAccount

Represents a social media account that the system manages.

**Properties:**
- `id`: Unique identifier (CUID)
- `platform`: INSTAGRAM | THREADS | NOTE
- `handle`: Account username/handle
- `displayName`: Human-readable name
- `accessToken`: OAuth access token (encrypted with AES-256-CBC)
- `toneProfile`: JSON object defining brand voice and content style
- `isActive`: Whether the account is currently active
- `createdAt`, `updatedAt`: Timestamps

**Relationships:**
- Has many: ContentIdeas, PostDrafts, Campaigns, ContentTemplates, HashtagSets, MediaAssets, SchedulingRules

**Business Rules:**
- Access tokens are encrypted at rest using AES-256-CBC with IV
- Each brand account can have only one active account per platform
- `toneProfile` schema:
  ```json
  {
    "voice": "professional" | "casual" | "inspirational" | "technical",
    "keywords": ["productivity", "wellness"],
    "avoidWords": ["spam", "clickbait"],
    "emojiUsage": "minimal" | "moderate" | "heavy",
    "hashtagStrategy": "focused" | "broad",
    "targetAudience": "string"
  }
  ```

**Encryption Flow:**
```
User Provides Token
      ↓
encrypt(token) → iv:ciphertext
      ↓
Store in DB
      ↓
Retrieve from DB
      ↓
decrypt(iv:ciphertext) → original token
      ↓
Use for API calls
```

### ContentIdea

Represents a content concept that can be turned into one or more posts.

**Properties:**
- `id`: Unique identifier
- `brandId`: Foreign key to BrandAccount
- `date`: Target publication date
- `theme`: Main topic/theme (e.g., "Morning motivation")
- `hook`: Attention-grabbing opening line
- `outline`: Detailed content outline (markdown)
- `status`: DRAFT | APPROVED | USED | ARCHIVED
- `createdAt`, `updatedAt`: Timestamps

**Relationships:**
- Belongs to: BrandAccount
- Has many: PostDrafts (one idea can spawn multiple platform-specific drafts)

**Business Rules:**
- Ideas must be APPROVED before generating drafts (UI enforced)
- Status transitions: DRAFT → APPROVED → USED
- Once marked USED, cannot be edited (read-only)
- Can be ARCHIVED at any stage

**Status State Machine:**
```
    ┌─────────┐
    │  DRAFT  │ ←──────────────┐
    └────┬────┘                │
         │ approve             │
         ↓                     │
    ┌──────────┐          ┌─────────┐
    │ APPROVED │──────────→│ ARCHIVED│
    └────┬─────┘  archive  └─────────┘
         │ generate draft
         ↓
    ┌──────┐
    │ USED │──────────────────────┘
    └──────┘    archive
```

### PostDraft

Represents a complete post ready for scheduling and publication.

**Properties:**
- `id`: Unique identifier
- `brandId`: Foreign key to BrandAccount
- `ideaId`: Optional foreign key to ContentIdea
- `campaignId`: Optional foreign key to Campaign
- `templateId`: Optional foreign key to ContentTemplate
- `hashtagSetId`: Optional foreign key to HashtagSet
- `platform`: INSTAGRAM | THREADS | NOTE
- `caption`: Post text content
- `mediaPlan`: JSON describing visual assets needed
- `hashtags`: Array of hashtag strings (e.g., ["#productivity", "#wellness"])
- `scheduledAt`: When to publish (nullable)
- `publishedAt`: Actual publication timestamp (nullable)
- `status`: DRAFT | SCHEDULED | PUBLISHED | FAILED
- `failureReason`: Error message if publication failed
- `resultStats`: JSON with engagement metrics (nullable)
- `createdAt`, `updatedAt`: Timestamps

**Relationships:**
- Belongs to: BrandAccount, ContentIdea (optional), Campaign (optional), ContentTemplate (optional), HashtagSet (optional)
- Has many: MediaAssets (many-to-many via PostMediaAsset), PerformanceSnapshots

**Business Rules:**
- Platform must match the BrandAccount's platform
- Status SCHEDULED requires `scheduledAt` to be set
- Status PUBLISHED requires `publishedAt` and `resultStats`
- Status FAILED requires `failureReason`
- Cannot edit caption/media after PUBLISHED (only metadata like hashtags)

**Status Flow:**
```
    ┌───────┐
    │ DRAFT │
    └───┬───┘
        │ schedule
        ↓
    ┌───────────┐
    │ SCHEDULED │
    └─────┬─────┘
          │ worker publishes
          ├──→ ┌───────────┐
          │    │ PUBLISHED │──→ [Performance Tracking]
          │    └───────────┘
          │
          └──→ ┌────────┐
               │ FAILED │──→ [Retry or Manual Fix]
               └────────┘
```

**mediaPlan Schema:**
```json
{
  "type": "single-image" | "carousel" | "video" | "text-only",
  "description": "Morning coffee on a desk with laptop",
  "suggestedStyle": "bright, minimal, lifestyle photography",
  "aspectRatio": "1:1" | "4:5" | "9:16",
  "assetIds": ["asset_id_1", "asset_id_2"]  // References to MediaAsset
}
```

**resultStats Schema:**
```json
{
  "likes": 150,
  "comments": 23,
  "shares": 5,
  "saves": 42,
  "reach": 1200,
  "impressions": 1850,
  "engagementRate": 0.125,
  "clickThroughRate": 0.032
}
```

### Campaign

Groups multiple posts under a coordinated marketing campaign.

**Properties:**
- `id`: Unique identifier
- `brandId`: Foreign key to BrandAccount
- `name`: Campaign name (e.g., "Q1 Wellness Challenge")
- `description`: Campaign overview
- `goal`: Specific objective (e.g., "Increase engagement by 25%")
- `startDate`, `endDate`: Campaign duration
- `status`: PLANNING | ACTIVE | COMPLETED | ARCHIVED
- `targetMetrics`: JSON with goal metrics
- `createdAt`, `updatedAt`: Timestamps

**Relationships:**
- Belongs to: BrandAccount
- Has many: PostDrafts

**Business Rules:**
- `endDate` must be after `startDate`
- Status transitions: PLANNING → ACTIVE → COMPLETED
- Cannot add posts to COMPLETED or ARCHIVED campaigns
- Campaign automatically moves to COMPLETED when `endDate` passes (worker job)

**targetMetrics Schema:**
```json
{
  "totalPosts": 12,
  "targetLikes": 5000,
  "targetEngagementRate": 0.15,
  "targetReach": 50000,
  "budgetUSD": 1000.00
}
```

**Campaign Metrics Calculation:**
```typescript
{
  totalPosts: count(posts),
  publishedPosts: count(posts where status = PUBLISHED),
  totalLikes: sum(posts.resultStats.likes),
  totalComments: sum(posts.resultStats.comments),
  totalReach: sum(posts.resultStats.reach),
  avgEngagementRate: avg(posts.resultStats.engagementRate),
  completionRate: publishedPosts / totalPosts,
  progressToGoal: totalLikes / targetMetrics.targetLikes
}
```

### ContentTemplate

Reusable post structure for consistent brand messaging.

**Properties:**
- `id`: Unique identifier
- `brandId`: Foreign key to BrandAccount (nullable for public templates)
- `name`: Template name
- `description`: What this template is for
- `category`: PROMOTIONAL | EDUCATIONAL | ENGAGEMENT | ANNOUNCEMENT | SEASONAL | EVERGREEN
- `platform`: INSTAGRAM | THREADS | NOTE
- `structure`: JSON defining sections and variables
- `exampleOutput`: Sample post using this template
- `usageCount`: Number of times used
- `isPublic`: Whether available to all brands
- `createdAt`, `updatedAt`: Timestamps

**Relationships:**
- Belongs to: BrandAccount (optional)
- Has many: PostDrafts (posts created from this template)

**Business Rules:**
- Public templates (`isPublic: true`) can have `brandId: null`
- Private templates must have `brandId` set
- `usageCount` auto-increments when a draft is created from template

**structure Schema:**
```json
{
  "sections": [
    {
      "name": "hook",
      "placeholder": "Attention-grabbing opening line",
      "required": true
    },
    {
      "name": "body",
      "placeholder": "Main content (2-3 paragraphs)",
      "required": true
    },
    {
      "name": "cta",
      "placeholder": "Call to action",
      "required": false
    }
  ],
  "variables": [
    {
      "name": "product_name",
      "description": "Name of the product being promoted",
      "defaultValue": ""
    },
    {
      "name": "discount_percentage",
      "description": "Discount amount (e.g., 20)",
      "defaultValue": "10"
    }
  ]
}
```

**Template Usage Flow:**
```
User selects template
      ↓
System loads structure and exampleOutput
      ↓
User fills in sections + variables
      ↓
AI generates caption using template + input
      ↓
Draft created with templateId reference
      ↓
usageCount++
```

### HashtagSet

Manages hashtag strategies with performance tracking.

**Properties:**
- `id`: Unique identifier
- `brandId`: Foreign key to BrandAccount
- `name`: Set name (e.g., "Wellness & Lifestyle")
- `description`: What this set is for
- `platform`: INSTAGRAM | THREADS | NOTE
- `hashtags`: Array of hashtag strings (max 30)
- `category`: Optional category (e.g., "wellness", "tech", "product")
- `usageCount`: Number of times used in posts
- `avgPerformance`: JSON with aggregated performance metrics
- `createdAt`, `updatedAt`: Timestamps

**Relationships:**
- Belongs to: BrandAccount
- Has many: PostDrafts (posts using this hashtag set)

**Business Rules:**
- Instagram: max 30 hashtags
- Threads: max 10 hashtags (platform best practice)
- Note: max 10 hashtags
- Hashtags must start with `#`
- No duplicate hashtags within a set

**avgPerformance Schema:**
```json
{
  "avgLikes": 150.5,
  "avgComments": 23.2,
  "avgEngagementRate": 0.125,
  "totalUsage": 15,
  "lastUsed": "2025-01-15T10:00:00Z",
  "topPerformingPost": "post_id_123"
}
```

**Performance Calculation:**
Updates when a post using this hashtag set is published:
```typescript
avgPerformance = {
  avgLikes: avg(posts.resultStats.likes where hashtagSetId = this.id),
  avgComments: avg(posts.resultStats.comments),
  avgEngagementRate: avg(posts.resultStats.engagementRate),
  totalUsage: count(posts),
  lastUsed: max(posts.publishedAt),
  topPerformingPost: posts.orderBy(likes, desc).first().id
}
```

### MediaAsset

Manages visual and video content for posts.

**Properties:**
- `id`: Unique identifier
- `brandId`: Foreign key to BrandAccount
- `url`: Public URL to the asset
- `type`: IMAGE | VIDEO | CAROUSEL | STORY
- `mimeType`: MIME type (e.g., "image/jpeg", "video/mp4")
- `size`: File size in bytes
- `width`, `height`: Dimensions (nullable)
- `duration`: Video duration in seconds (nullable)
- `metadata`: JSON with additional info
- `createdAt`, `updatedAt`: Timestamps

**Relationships:**
- Belongs to: BrandAccount
- Has many: PostDrafts (many-to-many via PostMediaAsset junction table)

**Business Rules:**
- `type: VIDEO` requires `duration`
- `type: IMAGE` or `VIDEO` should have `width` and `height`
- URL can be local storage, S3, Cloudinary, etc. (provider-agnostic)

**metadata Schema:**
```json
{
  "altText": "A morning coffee on a desk with laptop",
  "tags": ["coffee", "workspace", "morning"],
  "source": "unsplash" | "custom" | "ai-generated",
  "license": "CC0" | "proprietary",
  "provider": "local" | "s3" | "cloudinary",
  "providerAssetId": "abc123"
}
```

### PostMediaAsset (Junction Table)

Many-to-many relationship between PostDraft and MediaAsset.

**Properties:**
- `postId`: Foreign key to PostDraft
- `mediaId`: Foreign key to MediaAsset
- `order`: Display order in carousel (0-indexed)

**Business Rules:**
- Composite primary key: (postId, mediaId)
- Order must be unique per post
- Instagram carousel: max 10 images

### SchedulingRule

Defines optimal posting times for a brand account.

**Properties:**
- `id`: Unique identifier
- `brandId`: Foreign key to BrandAccount
- `platform`: INSTAGRAM | THREADS | NOTE
- `strategy`: OPTIMAL_ENGAGEMENT | CONSISTENT_DAILY | BURST | CUSTOM
- `timeSlots`: JSON array of preferred posting times
- `isActive`: Whether this rule is currently used
- `createdAt`, `updatedAt`: Timestamps

**Relationships:**
- Belongs to: BrandAccount

**Business Rules:**
- Only one active rule per (brandId, platform) combination
- `strategy: CUSTOM` requires `timeSlots` to be populated
- Other strategies use predefined time slots

**timeSlots Schema:**
```json
[
  {
    "dayOfWeek": 1,  // 0 = Sunday, 6 = Saturday
    "hour": 9,       // 0-23
    "minute": 0,
    "timezone": "America/New_York"
  },
  {
    "dayOfWeek": 3,
    "hour": 12,
    "minute": 30,
    "timezone": "America/New_York"
  }
]
```

**Scheduling Strategies:**
- `OPTIMAL_ENGAGEMENT`: Based on historical performance data (ML-driven)
- `CONSISTENT_DAILY`: Same time every day (e.g., 9 AM daily)
- `BURST`: Multiple posts in short period (e.g., product launch)
- `CUSTOM`: User-defined time slots

### PerformanceSnapshot

Time-series data for tracking post performance over time.

**Properties:**
- `id`: Unique identifier
- `postId`: Foreign key to PostDraft
- `snapshotAt`: When this snapshot was taken
- `metrics`: JSON with engagement metrics at this point in time
- `growth`: JSON with delta from previous snapshot
- `createdAt`: Timestamp

**Relationships:**
- Belongs to: PostDraft

**Business Rules:**
- Snapshots taken at: 1 hour, 24 hours, 7 days, 30 days after publication
- Cannot modify snapshots once created (immutable)
- Used for trending analysis and optimal time recommendations

**metrics Schema:**
```json
{
  "likes": 150,
  "comments": 23,
  "shares": 5,
  "saves": 42,
  "reach": 1200,
  "impressions": 1850
}
```

**growth Schema:**
```json
{
  "likesDelta": 15,      // +15 likes since last snapshot
  "likesGrowthRate": 0.11,  // 11% growth
  "commentsDelta": 3,
  "reachDelta": 200,
  "timeSinceLastSnapshot": 3600  // seconds
}
```

## Entity Relationship Diagram

```
┌──────────────┐
│ BrandAccount │
└──────┬───────┘
       │
       ├──────────────────────────────────┐
       │                                  │
       ↓                                  ↓
┌────────────┐                    ┌──────────────┐
│ContentIdea │                    │  PostDraft   │
└─────┬──────┘                    └──────┬───────┘
      │                                  │
      │ generates                        │
      └──────────────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ↓                    ↓                    ↓
            ┌────────────┐       ┌────────────┐      ┌──────────────┐
            │  Campaign  │       │  Template  │      │  HashtagSet  │
            └────────────┘       └────────────┘      └──────────────┘


┌──────────────┐         ┌─────────────────┐         ┌────────────┐
│  PostDraft   │◄───────►│ PostMediaAsset  │◄───────►│MediaAsset  │
└──────┬───────┘         └─────────────────┘         └────────────┘
       │
       │ has many
       ↓
┌────────────────────┐
│PerformanceSnapshot │
└────────────────────┘


┌──────────────┐
│ BrandAccount │
└──────┬───────┘
       │ has many
       ↓
┌────────────────┐
│SchedulingRule  │
└────────────────┘
```

## Data Flow Diagrams

### Content Creation Flow

```
1. Generate Ideas (Manual or AI)
   ┌─────────────────┐
   │   User Input    │ (theme: "Morning motivation")
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  OpenAI GPT-4   │ generates 3 ideas
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  ContentIdea[]  │ (status: DRAFT)
   └─────────────────┘

2. Approve Idea
   User clicks "Approve" → status: APPROVED

3. Generate Draft from Idea
   ┌─────────────────┐
   │ Approved Idea   │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │ BrandAccount    │ provides toneProfile
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  OpenAI GPT-4   │ generates platform-optimized caption
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │   PostDraft     │ (status: DRAFT)
   │  - caption      │
   │  - mediaPlan    │
   │  - hashtags     │
   └─────────────────┘

4. Schedule Post
   User sets scheduledAt → status: SCHEDULED

5. Worker Publishes
   ┌─────────────────┐
   │  Cron Job       │ triggers worker every 5 min
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  Find SCHEDULED │ where scheduledAt <= now
   │  posts          │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  SNS Client     │ publishes to platform
   │ (Instagram/etc) │
   └────────┬────────┘
            │
            ├──→ SUCCESS → status: PUBLISHED, save resultStats
            │
            └──→ FAILURE → status: FAILED, save failureReason

6. Track Performance
   ┌─────────────────┐
   │ Published Post  │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  Snapshot Job   │ runs at +1h, +24h, +7d, +30d
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │Analytics Client │ fetches current metrics
   └────────┬────────┘
            │
            ↓
   ┌─────────────────────┐
   │PerformanceSnapshot  │ saved with timestamp
   └─────────────────────┘
```

### Campaign Management Flow

```
1. Create Campaign
   ┌─────────────────┐
   │ User Input      │ (name, dates, targetMetrics)
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │   Campaign      │ (status: PLANNING)
   └─────────────────┘

2. Add Posts to Campaign
   ┌─────────────────┐
   │  PostDraft[]    │
   └────────┬────────┘
            │ link to campaign
            ↓
   ┌─────────────────┐
   │   Campaign      │ campaignId set on drafts
   └─────────────────┘

3. Activate Campaign
   status: PLANNING → ACTIVE

4. Track Campaign Metrics
   ┌─────────────────┐
   │ Campaign.posts  │
   └────────┬────────┘
            │ aggregate
            ↓
   ┌─────────────────────┐
   │ CampaignMetrics     │
   │ - totalPosts        │
   │ - publishedPosts    │
   │ - totalLikes        │
   │ - avgEngagementRate │
   │ - completionRate    │
   └─────────────────────┘

5. Complete Campaign
   endDate passes → status: COMPLETED (automatic)
   or user manually completes → status: COMPLETED
```

### Template Usage Flow

```
1. Create Template
   ┌─────────────────┐
   │ User defines    │
   │ - structure     │
   │ - variables     │
   │ - exampleOutput │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │ ContentTemplate │ (usageCount: 0)
   └─────────────────┘

2. Use Template for Draft
   ┌─────────────────┐
   │ User selects    │
   │ template        │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │ Fill variables  │ (product_name, discount_percentage)
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │ AI generates    │ using template structure + variables
   │ caption         │
   └────────┬────────┘
            │
            ↓
   ┌─────────────────┐
   │  PostDraft      │ (templateId set)
   └─────────────────┘
            │
            ↓
   Template.usageCount++

3. Track Template Performance
   ┌─────────────────┐
   │ Template.posts  │ where templateId = X
   └────────┬────────┘
            │ aggregate
            ↓
   ┌─────────────────────┐
   │ TemplateStats       │
   │ - usageCount        │
   │ - avgLikes          │
   │ - avgEngagementRate │
   └─────────────────────┘
```

## Validation Rules Summary

### Cross-Entity Constraints

1. **Platform Consistency**: PostDraft.platform must match BrandAccount.platform
2. **Date Validation**: Campaign.endDate > Campaign.startDate
3. **Status Transitions**: Cannot skip states (e.g., DRAFT → PUBLISHED without SCHEDULED)
4. **Referential Integrity**: Cannot delete BrandAccount if it has active campaigns or scheduled posts
5. **Unique Constraints**:
   - BrandAccount: (platform, handle) unique
   - SchedulingRule: One active rule per (brandId, platform)
   - HashtagSet: Hashtag uniqueness within set

### Business Invariants

1. **Encrypted Data**: All BrandAccount.accessToken values must be in format "iv:ciphertext"
2. **Performance Metrics**: resultStats required when PostDraft.status = PUBLISHED
3. **Media Limits**:
   - Instagram carousel: max 10 assets
   - Instagram hashtags: max 30
   - Threads hashtags: max 10 (recommendation)
4. **Campaign Integrity**: Cannot add posts to COMPLETED or ARCHIVED campaigns
5. **Template Variables**: All referenced variables in structure must be provided when using template

## Migration Strategy

When evolving the domain model:

1. **Backward Compatible Changes**:
   - Adding optional fields: Safe, add to schema with `optional()`
   - Adding new enums: Append only, don't reorder
   - Adding indexes: Safe performance optimization

2. **Breaking Changes**:
   - Renaming fields: Create migration script, update all references
   - Changing field types: Migrate data with transformation script
   - Removing fields: Mark deprecated first, remove after grace period

3. **Data Migration Script Template**:
```typescript
// prisma/migrations/custom/migrate-xyz.ts
import { prisma } from '@/lib/db'

async function migrate() {
  // 1. Backup current data
  const backup = await prisma.postDraft.findMany()

  // 2. Transform data
  for (const draft of backup) {
    await prisma.postDraft.update({
      where: { id: draft.id },
      data: {
        // Apply transformation
      }
    })
  }

  // 3. Verify integrity
  const count = await prisma.postDraft.count()
  if (count !== backup.length) {
    throw new Error('Data loss detected!')
  }
}

migrate().catch(console.error)
```

## Query Patterns

### Common Queries

**Get all scheduled posts due for publication:**
```typescript
const duePosters = await prisma.postDraft.findMany({
  where: {
    status: 'SCHEDULED',
    scheduledAt: { lte: new Date() }
  },
  include: {
    brand: true,
    media: { include: { media: true } }
  }
})
```

**Get campaign performance:**
```typescript
const campaign = await prisma.campaign.findUnique({
  where: { id: campaignId },
  include: {
    posts: {
      where: { status: 'PUBLISHED' },
      select: { resultStats: true }
    }
  }
})

const metrics = {
  totalLikes: campaign.posts.reduce((sum, p) => sum + (p.resultStats?.likes || 0), 0),
  avgEngagementRate: campaign.posts.reduce((sum, p) => sum + (p.resultStats?.engagementRate || 0), 0) / campaign.posts.length
}
```

**Find top-performing hashtag sets:**
```typescript
const topHashtagSets = await prisma.hashtagSet.findMany({
  where: { brandId },
  orderBy: {
    avgPerformance: { avgEngagementRate: 'desc' }  // Note: This requires JSON field indexing
  },
  take: 10
})
```

**Get performance trend for a post:**
```typescript
const snapshots = await prisma.performanceSnapshot.findMany({
  where: { postId },
  orderBy: { snapshotAt: 'asc' }
})

const trend = snapshots.map((s, i) => ({
  timestamp: s.snapshotAt,
  metrics: s.metrics,
  growth: i > 0 ? calculateGrowth(snapshots[i-1], s) : null
}))
```

## Extension Points

The domain model is designed for extension:

1. **New Platforms**: Add to `Platform` enum, implement SNS client
2. **New Content Types**: Extend `MediaType` enum, update MediaAsset validation
3. **New Campaign Types**: Add to `CampaignStatus` or create `CampaignType` enum
4. **Custom Metrics**: Extend `resultStats` JSON field with new properties
5. **New Scheduling Strategies**: Add to `SchedulingStrategy` enum, implement logic in scheduler

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Extension Guide](./EXTENSION_GUIDE.md)
