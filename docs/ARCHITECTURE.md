# Architecture Overview

This document describes the system architecture, design patterns, and technical decisions behind SNS Content Autopilot.

## Table of Contents

- [System Overview](#system-overview)
- [Architectural Layers](#architectural-layers)
- [Design Patterns](#design-patterns)
- [Key Components](#key-components)
- [Data Flow](#data-flow)
- [Extension Architecture](#extension-architecture)
- [Security](#security)
- [Performance & Scalability](#performance--scalability)
- [Deployment Architecture](#deployment-architecture)

## System Overview

SNS Content Autopilot is a **full-stack SaaS application** built on Next.js 14 with App Router, following a **service-oriented architecture** with clear separation of concerns.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  (React Server Components + Client Components)              │
│  /app/calendar, /app/ideas, /app/drafts, /app/analytics    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/JSON
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                    │
│  /app/api/ideas, /app/api/drafts, /app/api/campaigns       │
│  - Request validation (Zod)                                 │
│  - Error handling                                           │
│  - Route handlers                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                           │
│  /lib/services/                                             │
│  - CampaignService, TemplateService, HashtagService         │
│  - Business logic                                           │
│  - Domain events emission                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer                          │
│  Prisma Client + PostgreSQL                                 │
│  - ORM queries                                              │
│  - Transactions                                             │
│  - Migrations                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   External Integrations                     │
│  - OpenAI API (content generation)                          │
│  - SNS Clients (Instagram, Threads, Note)                   │
│  - Media Providers (S3, Cloudinary, Local)                  │
│  - Analytics Providers (Instagram Graph API, etc.)          │
│  - Notification Providers (Email, Slack, Webhook)           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Background Workers                       │
│  - Post Scheduler (publishes SCHEDULED posts)               │
│  - Performance Snapshot Collector                           │
│  - Campaign Auto-Completion                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Observability Layer                        │
│  - Structured Logging (logger.ts)                           │
│  - Metrics Collection (metrics.ts)                          │
│  - Domain Events (event-bus.ts)                             │
└─────────────────────────────────────────────────────────────┘
```

## Architectural Layers

### 1. Presentation Layer (`/app`)

**Responsibility**: User interface and routing

**Technology**: React Server Components (RSC), Client Components

**Structure**:
```
/app
├── layout.tsx                 # Root layout with global styles
├── page.tsx                   # Homepage
├── calendar/page.tsx          # Calendar view (client component)
├── ideas/page.tsx             # Ideas management (client component)
├── drafts/page.tsx            # Drafts management (client component)
├── analytics/page.tsx         # Analytics dashboard (client component)
└── api/                       # API routes (see API Layer)
```

**Key Decisions**:
- **Client Components for Interactivity**: Calendar, idea generation, and draft editing require client-side state
- **Server Components for Data Fetching**: Initial data loading happens on server for better performance
- **File-Based Routing**: Next.js App Router convention for predictable URLs

**Component Patterns**:
```typescript
// Server Component (default in App Router)
async function IdeasPage() {
  const ideas = await prisma.contentIdea.findMany()
  return <IdeasList ideas={ideas} />
}

// Client Component
'use client'
function IdeasList({ ideas }: { ideas: ContentIdea[] }) {
  const [filter, setFilter] = useState('ALL')
  // ... interactive logic
}
```

### 2. API Layer (`/app/api`)

**Responsibility**: HTTP request handling, validation, response formatting

**Technology**: Next.js API Routes (App Router)

**Structure**:
```
/app/api
├── ideas/
│   ├── route.ts               # GET, POST /api/ideas
│   ├── [id]/route.ts          # GET, PATCH, DELETE /api/ideas/:id
│   └── generate/route.ts      # POST /api/ideas/generate
├── drafts/
│   ├── route.ts               # GET, POST /api/drafts
│   ├── [id]/route.ts          # GET, PATCH, DELETE /api/drafts/:id
│   └── generate/route.ts      # POST /api/drafts/generate
├── campaigns/
│   ├── route.ts               # GET, POST /api/campaigns
│   ├── [id]/route.ts          # GET, PATCH, DELETE /api/campaigns/:id
│   ├── [id]/metrics/route.ts  # GET /api/campaigns/:id/metrics
│   └── [id]/posts/route.ts    # POST /api/campaigns/:id/posts
├── templates/route.ts         # GET, POST /api/templates
├── hashtags/
│   ├── route.ts               # GET, POST /api/hashtags
│   └── performance/route.ts   # GET /api/hashtags/performance
└── brands/route.ts            # GET, POST /api/brands
```

**Standard Route Handler Pattern**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { handleError, validateRequest } from '@/lib/errors'
import { z } from 'zod'

const requestSchema = z.object({
  // ... validation rules
})

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json()
    const data = validateRequest(requestSchema, body)

    // 2. Call service layer
    const result = await someService.create(data)

    // 3. Return success response
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // 4. Centralized error handling
    return handleError(error)
  }
}
```

**Key Responsibilities**:
- Input validation with Zod schemas
- Request/response serialization
- HTTP status code management
- Error transformation to user-friendly messages

### 3. Service Layer (`/lib/services`)

**Responsibility**: Business logic, orchestration, domain events

**Technology**: TypeScript classes with dependency injection

**Structure**:
```
/lib/services
├── campaign-service.ts        # Campaign CRUD + metrics
├── template-service.ts        # Template management + usage
├── hashtag-service.ts         # Hashtag performance analysis
└── (future: idea-service.ts, draft-service.ts, analytics-service.ts)
```

**Service Pattern**:
```typescript
export class CampaignService {
  constructor(
    private db = prisma,
    private events = eventBus,
    private logger = logger.child({ service: 'CampaignService' })
  ) {}

  async create(input: CreateCampaignInput): Promise<Campaign> {
    // 1. Validate business rules
    if (input.endDate <= input.startDate) {
      throw new AppError(400, 'endDate must be after startDate')
    }

    // 2. Database operation
    const campaign = await this.db.campaign.create({
      data: { ...input, status: 'PLANNING' }
    })

    // 3. Emit domain event
    await this.events.emit({
      type: DomainEventType.CAMPAIGN_CREATED,
      timestamp: new Date(),
      payload: { campaignId: campaign.id, brandId: campaign.brandId }
    })

    // 4. Log and track metrics
    this.logger.info('Campaign created', { campaignId: campaign.id })
    businessMetrics.campaignCreated(campaign.brandId, campaign.status)

    return campaign
  }

  // ... other methods
}

export const campaignService = new CampaignService()
```

**Key Responsibilities**:
- Enforce business invariants (e.g., date validation, status transitions)
- Coordinate multiple database operations (transactions)
- Emit domain events for audit trails and side effects
- Log operations for debugging
- Track business metrics

**Design Principle**: Services are **stateless** and **injectable** for testability.

### 4. Data Access Layer (Prisma + PostgreSQL)

**Responsibility**: Database queries, schema management, migrations

**Technology**: Prisma ORM, PostgreSQL 14+

**Key Files**:
- `/prisma/schema.prisma`: Database schema definition
- `/lib/db.ts`: Prisma client singleton
- `/prisma/migrations/`: Version-controlled schema migrations

**Database Client Pattern**:
```typescript
// /lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Query Patterns**:
```typescript
// Simple query
const ideas = await prisma.contentIdea.findMany({
  where: { brandId, status: 'APPROVED' },
  orderBy: { createdAt: 'desc' }
})

// Query with relations
const campaign = await prisma.campaign.findUnique({
  where: { id },
  include: {
    brand: true,
    posts: {
      where: { status: 'PUBLISHED' },
      include: { media: true }
    }
  }
})

// Transaction for atomicity
await prisma.$transaction([
  prisma.postDraft.update({ where: { id }, data: { campaignId } }),
  prisma.campaign.update({ where: { id: campaignId }, data: { updatedAt: new Date() } })
])
```

**Advantages**:
- Type-safe queries with auto-completion
- Automatic migration generation
- Connection pooling
- Query batching and optimization

### 5. Integration Layer (`/lib/adapters`, `/lib/sns-clients`)

**Responsibility**: External API integrations with pluggable architecture

**Technology**: Adapter pattern with interface-based design

**Structure**:
```
/lib
├── adapters/
│   ├── media-provider.ts      # IMediaProvider + implementations
│   ├── content-generator.ts   # IContentGenerator + implementations
│   ├── analytics-provider.ts  # IAnalyticsProvider + implementations
│   └── notification-provider.ts # INotificationProvider + implementations
├── sns-clients/
│   ├── base.ts                # BaseSNSClient interface
│   ├── instagram.ts           # InstagramClient
│   ├── threads.ts             # ThreadsClient
│   ├── note.ts                # NoteClient
│   └── index.ts               # Factory: createSNSClient()
├── llm.ts                     # OpenAI integration
└── plugin-registry.ts         # Centralized provider management
```

**Adapter Pattern Example**:
```typescript
// Interface definition
export interface IMediaProvider {
  upload(options: MediaUploadOptions): Promise<MediaUploadResult>
  delete(options: MediaDeleteOptions): Promise<void>
  getSignedUrl(url: string, expiresIn?: number): Promise<string>
  getProviderName(): string
}

// Implementation 1: Local storage
export class LocalMediaProvider implements IMediaProvider {
  async upload({ file, brandId }: MediaUploadOptions) {
    const path = `/uploads/${brandId}/${Date.now()}-${file.name}`
    await fs.writeFile(`./public${path}`, file.buffer)
    return { url: path, mimeType: file.type, size: file.size }
  }
  // ...
}

// Implementation 2: S3
export class S3MediaProvider implements IMediaProvider {
  constructor(private s3Client: S3, private bucket: string) {}

  async upload({ file, brandId }: MediaUploadOptions) {
    const key = `${brandId}/${Date.now()}-${file.name}`
    await this.s3Client.upload({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.type
    })
    return { url: `https://${this.bucket}.s3.amazonaws.com/${key}`, ... }
  }
  // ...
}

// Usage via plugin registry
const provider = pluginRegistry.getMediaProvider()
const result = await provider.upload({ file, brandId })
```

**Benefits**:
- **Swappable Implementations**: Change provider without code changes
- **Testability**: Mock interfaces in tests
- **Extensibility**: Add new providers by implementing interface
- **Configuration-Driven**: Choose provider via environment variables

### 6. Worker Layer (`/workers`)

**Responsibility**: Background jobs and scheduled tasks

**Technology**: Node.js scripts invoked by cron or job queue

**Current Workers**:
```
/workers
└── post-scheduler.ts          # Publishes scheduled posts
```

**Post Scheduler Flow**:
```typescript
async function publishScheduledPosts() {
  // 1. Find due posts
  const duePosts = await prisma.postDraft.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date() }
    },
    include: { brand: true, media: { include: { media: true } } }
  })

  // 2. Publish each post
  for (const post of duePosts) {
    try {
      const client = createSNSClient(post.brand)
      const result = await client.publish(post.caption, post.media.map(m => m.media.url))

      // 3. Update to PUBLISHED
      await prisma.postDraft.update({
        where: { id: post.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          resultStats: result.stats
        }
      })

      // 4. Emit event
      await eventBus.emit({
        type: DomainEventType.POST_PUBLISHED,
        payload: { postId: post.id, platform: post.platform }
      })
    } catch (error) {
      // Handle failure
      await prisma.postDraft.update({
        where: { id: post.id },
        data: { status: 'FAILED', failureReason: error.message }
      })
    }
  }
}
```

**Invocation Methods**:
```bash
# Manual run
npm run worker

# Cron job (production)
*/5 * * * * cd /app && npm run worker >> /var/log/worker.log 2>&1

# Vercel Cron (vercel.json)
{
  "crons": [{
    "path": "/api/cron/publish",
    "schedule": "*/5 * * * *"
  }]
}
```

**Future Workers**:
- `performance-snapshot-collector.ts`: Collects analytics at intervals
- `campaign-auto-complete.ts`: Marks campaigns as COMPLETED after endDate
- `optimal-time-analyzer.ts`: ML-based posting time recommendations

### 7. Observability Layer (`/lib/events`, `/lib/logger.ts`, `/lib/metrics.ts`)

**Responsibility**: Logging, metrics, and event tracking

**Components**:

#### Structured Logging
```typescript
// /lib/logger.ts
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  log(level: LogLevel, message: string, context: Record<string, any>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    }

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry))  // Structured for log aggregation
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`, context)
    }
  }

  child(context: Record<string, any>): Logger {
    // Creates child logger with inherited context
  }
}

// Usage
logger.info('Campaign created', { campaignId: '123', brandId: 'abc' })
```

#### Metrics Collection
```typescript
// /lib/metrics.ts
class MetricsCollector {
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()

  recordCounter(name: string, labels: MetricLabels, value: number) {
    const key = `${name}{${this.formatLabels(labels)}}`
    this.counters.set(key, (this.counters.get(key) || 0) + value)
  }

  getPrometheusFormat(): string {
    // Exports in Prometheus format for monitoring systems
  }
}

// Business metrics
export const businessMetrics = {
  ideaCreated: (brandId: string) =>
    metrics.recordCounter('idea_created_total', { brand_id: brandId }, 1),

  postPublished: (brandId: string, platform: string) =>
    metrics.recordCounter('post_published_total', { brand_id: brandId, platform }, 1),
}

// Performance metrics
export const performanceMetrics = {
  apiRequest: (endpoint: string, method: string, status: number, duration: number) => {
    metrics.recordHistogram('api_request_duration_ms', { endpoint, method, status }, duration)
    metrics.recordCounter('api_request_total', { endpoint, method, status }, 1)
  }
}
```

#### Domain Events
```typescript
// /lib/events/domain-events.ts
export enum DomainEventType {
  IDEA_CREATED = 'idea.created',
  POST_PUBLISHED = 'post.published',
  CAMPAIGN_COMPLETED = 'campaign.completed',
  // ... 10+ event types
}

class EventBus {
  private handlers: Map<DomainEventType, DomainEventHandler[]> = new Map()

  on<T extends DomainEvent>(eventType: DomainEventType, handler: DomainEventHandler<T>) {
    const handlers = this.handlers.get(eventType) || []
    handlers.push(handler as DomainEventHandler)
    this.handlers.set(eventType, handlers)
  }

  async emit(event: DomainEvent) {
    const handlers = this.handlers.get(event.type) || []
    await Promise.all(handlers.map(h => h(event)))
  }
}

// Register handlers
eventBus.on(DomainEventType.POST_PUBLISHED, async (event) => {
  logger.info('Post published', event.payload)
  await notificationProvider.notify({
    channel: 'slack',
    message: `Post published: ${event.payload.postId}`
  })
})
```

## Design Patterns

### 1. Repository Pattern (Service Layer)

**Intent**: Abstract data access logic from business logic

**Implementation**: Service classes encapsulate Prisma queries

**Example**:
```typescript
// Instead of controller calling Prisma directly:
// ❌ BAD
export async function POST(request: NextRequest) {
  const data = await request.json()
  const campaign = await prisma.campaign.create({ data })  // Direct DB access
  return NextResponse.json(campaign)
}

// ✅ GOOD
export async function POST(request: NextRequest) {
  const data = validateRequest(schema, await request.json())
  const campaign = await campaignService.create(data)  // Service layer
  return NextResponse.json(campaign)
}
```

**Benefits**:
- Testable (mock service in tests)
- Reusable (same logic in API and workers)
- Maintainable (business logic in one place)

### 2. Adapter Pattern (External Integrations)

**Intent**: Define interface for external services, allow swapping implementations

**Implementation**: Provider interfaces with multiple implementations

**Example**: See Integration Layer above

**Benefits**:
- Dependency inversion (depend on interface, not concrete class)
- Testability (mock providers)
- Flexibility (swap S3 for Cloudinary without code changes)

### 3. Factory Pattern (SNS Clients)

**Intent**: Encapsulate object creation logic

**Implementation**:
```typescript
// /lib/sns-clients/index.ts
export function createSNSClient(brand: BrandAccount): BaseSNSClient {
  const accessToken = decrypt(brand.accessToken)

  switch (brand.platform) {
    case 'INSTAGRAM':
      return new InstagramClient(accessToken, brand.handle)
    case 'THREADS':
      return new ThreadsClient(accessToken, brand.handle)
    case 'NOTE':
      return new NoteClient(accessToken, brand.handle)
    default:
      throw new Error(`Unsupported platform: ${brand.platform}`)
  }
}

// Usage
const client = createSNSClient(brand)
await client.publish(caption, mediaUrls)
```

**Benefits**:
- Centralized client creation
- Type safety (returns BaseSNSClient interface)
- Easy to add new platforms

### 4. Observer Pattern (Event Bus)

**Intent**: Decouple event producers from consumers

**Implementation**: Domain events with pub/sub EventBus

**Example**:
```typescript
// Producer (campaign service)
await eventBus.emit({
  type: DomainEventType.CAMPAIGN_COMPLETED,
  payload: { campaignId, metrics }
})

// Consumer 1 (notification handler)
eventBus.on(DomainEventType.CAMPAIGN_COMPLETED, async (event) => {
  await sendEmail({
    to: brandOwner.email,
    subject: 'Campaign Completed',
    body: `Your campaign achieved ${event.payload.metrics.totalLikes} likes!`
  })
})

// Consumer 2 (analytics handler)
eventBus.on(DomainEventType.CAMPAIGN_COMPLETED, async (event) => {
  await analyticsProvider.track('campaign_completed', event.payload.metrics)
})
```

**Benefits**:
- Extensible (add handlers without modifying producers)
- Decoupled (campaign service doesn't know about email)
- Auditable (all events logged)

### 5. Strategy Pattern (Scheduling Strategies)

**Intent**: Define family of algorithms, make them interchangeable

**Implementation**: SchedulingRule with different strategies

**Example**:
```typescript
interface SchedulingStrategy {
  getNextPostTime(brand: BrandAccount): Date
}

class OptimalEngagementStrategy implements SchedulingStrategy {
  getNextPostTime(brand: BrandAccount): Date {
    const historicalData = getPerformanceSnapshots(brand.id)
    const optimalHour = findPeakEngagementHour(historicalData)
    return getNextOccurrence(optimalHour)
  }
}

class ConsistentDailyStrategy implements SchedulingStrategy {
  constructor(private hour: number) {}

  getNextPostTime(brand: BrandAccount): Date {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(this.hour, 0, 0, 0)
    return tomorrow
  }
}

// Usage
const strategy = strategyFactory.create(rule.strategy)
const nextTime = strategy.getNextPostTime(brand)
```

### 6. Dependency Injection (Plugin Registry)

**Intent**: Invert dependencies, inject implementations at runtime

**Implementation**:
```typescript
// /lib/plugin-registry.ts
export class PluginRegistry {
  private mediaProvider: IMediaProvider = new LocalMediaProvider()
  private contentGenerator: IContentGenerator = new OpenAIContentGenerator()

  setMediaProvider(provider: IMediaProvider) {
    this.mediaProvider = provider
  }

  getMediaProvider(): IMediaProvider {
    return this.mediaProvider
  }
}

// Configuration (e.g., in app startup)
if (process.env.MEDIA_PROVIDER === 's3') {
  pluginRegistry.setMediaProvider(new S3MediaProvider(
    s3Client,
    process.env.S3_BUCKET!
  ))
}

// Usage (services don't know which implementation)
const provider = pluginRegistry.getMediaProvider()
await provider.upload({ file, brandId })
```

## Key Components

### Validation System (`/lib/validations.ts`, `/lib/errors.ts`)

**Centralized Request Validation**:
```typescript
// Define schema once
export const createCampaignSchema = z.object({
  brandId: z.string().cuid(),
  name: z.string().min(1).max(200),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  targetMetrics: z.record(z.number()).optional(),
})

// Use in API routes
export async function POST(request: NextRequest) {
  const body = await request.json()
  const data = validateRequest(createCampaignSchema, body)  // Throws on invalid
  // ... data is now type-safe
}
```

**Error Handling**:
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message)
  }
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: 'Validation failed',
      details: error.errors
    }, { status: 400 })
  }

  if (error instanceof AppError) {
    return NextResponse.json({
      error: error.message,
      details: error.details
    }, { status: error.statusCode })
  }

  // Unknown errors
  logger.error('Unexpected error', { error })
  return NextResponse.json({
    error: 'Internal server error'
  }, { status: 500 })
}
```

### Encryption System (`/lib/encryption.ts`)

**AES-256-CBC Encryption for Sensitive Data**:
```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!  // 32 bytes
const IV_LENGTH = 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted  // Store IV with ciphertext
}

export function decrypt(text: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encryptedText = parts.join(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

**Usage**:
```typescript
// Saving access token
const brand = await prisma.brandAccount.create({
  data: {
    platform: 'INSTAGRAM',
    handle: 'my_brand',
    accessToken: encrypt(oauthToken),  // Encrypted before storage
    ...
  }
})

// Using access token
const brand = await prisma.brandAccount.findUnique({ where: { id } })
const token = decrypt(brand.accessToken)  // Decrypt for use
const client = new InstagramClient(token, brand.handle)
```

## Data Flow

### End-to-End Request Flow

```
1. User Request
   ↓
   Browser → POST /api/campaigns
   Body: { brandId, name, startDate, endDate, targetMetrics }

2. API Layer
   ↓
   /app/api/campaigns/route.ts
   - Parse JSON body
   - Validate with createCampaignSchema (Zod)
   - Extract validated data

3. Service Layer
   ↓
   campaignService.create(data)
   - Validate business rules (endDate > startDate)
   - Execute Prisma query
   - Emit CAMPAIGN_CREATED event
   - Log operation
   - Track metric

4. Event Handlers
   ↓
   eventBus emits → handlers react
   - Log handler: Structured log entry
   - Notification handler: Send Slack notification
   - Analytics handler: Track in analytics platform

5. Response
   ↓
   NextResponse.json(campaign, { status: 201 })
   ↓
   Browser receives 201 Created with campaign object
```

### Background Job Flow

```
1. Cron Trigger
   ↓
   */5 * * * * (every 5 minutes)

2. Worker Invocation
   ↓
   npm run worker → tsx workers/post-scheduler.ts

3. Query Database
   ↓
   prisma.postDraft.findMany({
     where: { status: 'SCHEDULED', scheduledAt: { lte: now } }
   })

4. Publish Posts
   ↓
   for each post:
     - createSNSClient(brand) → InstagramClient | ThreadsClient | NoteClient
     - client.publish(caption, mediaUrls)
     - SNS API call (or dummy simulation)

5. Update Database
   ↓
   if success:
     - status = PUBLISHED
     - publishedAt = now
     - resultStats = { likes, comments, ... }
   if failure:
     - status = FAILED
     - failureReason = error.message

6. Emit Events
   ↓
   POST_PUBLISHED or POST_FAILED event
   - Triggers notification to brand owner
   - Logs for debugging
   - Updates analytics
```

## Extension Architecture

See [Extension Guide](./EXTENSION_GUIDE.md) for detailed instructions.

### Extension Points

1. **New SNS Platform**: Implement `BaseSNSClient` interface
2. **New Media Provider**: Implement `IMediaProvider` interface
3. **New Content Generator**: Implement `IContentGenerator` interface
4. **New Analytics Provider**: Implement `IAnalyticsProvider` interface
5. **New Notification Channel**: Implement `INotificationProvider` interface
6. **New Scheduling Strategy**: Add to `SchedulingStrategy` enum, implement logic
7. **New Domain Event**: Add to `DomainEventType` enum, register handlers

### Plugin Development

```typescript
// Example: Adding a new media provider (Imgur)
export class ImgurMediaProvider implements IMediaProvider {
  constructor(private clientId: string) {}

  async upload({ file, brandId }: MediaUploadOptions): Promise<MediaUploadResult> {
    const formData = new FormData()
    formData.append('image', file.buffer.toString('base64'))

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: { Authorization: `Client-ID ${this.clientId}` },
      body: formData
    })

    const data = await response.json()
    return {
      url: data.data.link,
      mimeType: file.type,
      size: file.size
    }
  }

  getProviderName() { return 'imgur' }
}

// Register in plugin registry
if (process.env.MEDIA_PROVIDER === 'imgur') {
  pluginRegistry.setMediaProvider(new ImgurMediaProvider(process.env.IMGUR_CLIENT_ID!))
}
```

## Security

### Authentication & Authorization

**Current State**: No authentication (demo/MVP)

**Production Requirements**:
- Implement NextAuth.js for user authentication
- Add `userId` foreign key to `BrandAccount`
- Implement row-level security (RLS) or middleware checks
- Add API key authentication for worker jobs

**Planned Architecture**:
```typescript
// Middleware for protected routes
export async function middleware(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.redirect('/login')
  }
  return NextResponse.next()
}

// API route protection
export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ensure user owns the brand
  const brand = await prisma.brandAccount.findFirst({
    where: { id: brandId, userId: session.user.id }
  })
  if (!brand) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ... proceed with request
}
```

### Data Protection

1. **Encryption at Rest**: Access tokens encrypted with AES-256-CBC
2. **Encryption in Transit**: HTTPS enforced in production
3. **Environment Variables**: Sensitive config in `.env` (not committed)
4. **SQL Injection**: Prisma parameterized queries (ORM protection)
5. **XSS Protection**: React auto-escapes output, CSP headers recommended

### API Security

1. **Rate Limiting**: (Planned) Use `next-rate-limit` or Vercel Edge Config
2. **CORS**: Configure in `next.config.js` for specific origins
3. **Input Validation**: Zod schemas prevent injection attacks
4. **Error Messages**: No stack traces in production (see error handler)

## Performance & Scalability

### Database Optimization

**Indexes**:
```prisma
model PostDraft {
  id String @id

  @@index([brandId, status])        // List brand's drafts by status
  @@index([status, scheduledAt])    // Worker query optimization
  @@index([campaignId])             // Campaign metrics aggregation
}

model PerformanceSnapshot {
  id String @id
  postId String

  @@index([postId, snapshotAt])     // Time-series queries
}
```

**Connection Pooling**:
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

**Query Optimization**:
- Use `select` to fetch only needed fields
- Use `include` judiciously (avoid N+1 queries)
- Batch queries with `Promise.all()`
- Use `skip` and `take` for pagination

### Caching Strategy

**Planned**:
- Redis for session storage and API response caching
- CDN for media assets (Cloudflare/Vercel Edge)
- Browser caching with `Cache-Control` headers

**Example**:
```typescript
// Cache campaign metrics for 5 minutes
const cacheKey = `campaign:${id}:metrics`
let metrics = await redis.get(cacheKey)

if (!metrics) {
  metrics = await campaignService.getMetrics(id)
  await redis.set(cacheKey, JSON.stringify(metrics), 'EX', 300)
}
```

### Horizontal Scaling

**Stateless Design**: All state in database, no in-memory sessions

**Deployment Options**:
- Vercel: Auto-scaling serverless functions
- Docker Swarm: Multi-container orchestration
- Kubernetes: Full container orchestration with load balancing

**Worker Scaling**:
- Multiple worker instances with distributed locking (Redis)
- Job queue (BullMQ) for reliable processing

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────┐
│   Developer Machine                 │
│                                     │
│   npm run dev → localhost:3000      │
│                                     │
│   Docker Compose:                   │
│   - PostgreSQL (port 5432)          │
│   - (optional: Redis, Mailhog)      │
└─────────────────────────────────────┘
```

### Production Environment (Docker)

```
┌──────────────────────────────────────────────────────┐
│  Docker Host (VPS, EC2, DigitalOcean)               │
│                                                      │
│  ┌────────────────┐      ┌──────────────────┐      │
│  │  nginx:latest  │──────│  app:latest      │      │
│  │  (port 80/443) │      │  (port 3000)     │      │
│  └────────────────┘      └──────────────────┘      │
│                                                      │
│  ┌────────────────┐      ┌──────────────────┐      │
│  │ postgres:14    │      │  worker (cron)   │      │
│  │ (port 5432)    │      │  */5 * * * *     │      │
│  └────────────────┘      └──────────────────┘      │
│                                                      │
│  Volumes: postgres-data, uploads                    │
└──────────────────────────────────────────────────────┘
```

**docker-compose.yml**:
```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/sns_autopilot
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      db: { condition: service_healthy }

  db:
    image: postgres:14
    volumes: [postgres-data:/var/lib/postgresql/data]
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sns_autopilot
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s

volumes:
  postgres-data:
```

### Production Environment (Vercel)

```
┌───────────────────────────────────────────────────────┐
│  Vercel Edge Network                                  │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Next.js App (Serverless Functions)         │    │
│  │  - /api/* → Separate lambda per route       │    │
│  │  - Pages → SSR + Edge caching               │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                                │
│                     ↓                                │
│  ┌──────────────────────────────────────────────┐   │
│  │  External PostgreSQL (Supabase/Neon/Railway) │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  Vercel Cron (for workers)                   │   │
│  │  → /api/cron/publish (every 5 min)           │   │
│  └──────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

**Advantages**:
- Auto-scaling
- Global CDN
- Zero-config deployment
- Built-in analytics

**Limitations**:
- 10s function timeout (Hobby), 60s (Pro)
- Cold starts for infrequent routes
- No persistent file storage (use S3 for media)

## See Also

- [Domain Model](./DOMAIN_MODEL.md) - Entity relationships and business rules
- [API Reference](./API_REFERENCE.md) - Complete API documentation
- [Extension Guide](./EXTENSION_GUIDE.md) - Building plugins and adapters
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment strategies
