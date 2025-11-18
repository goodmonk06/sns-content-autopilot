# SNS Content Autopilot

AI-powered social media content planning and scheduling tool for Instagram, Threads, and Note.

## Overview

SNS Content Autopilot is a full-stack SaaS application that streamlines social media content management across Instagram, Threads, and Note. It uses OpenAI GPT-4 to generate high-quality content ideas and post drafts, provides calendar-based scheduling, and tracks performance analytics.

**Key Features:**
- AI-powered content idea generation from simple themes
- Platform-specific content optimization (Instagram/Threads/Note)
- Campaign management for coordinated content marketing
- Content template library for consistent brand messaging
- Hashtag strategy management and performance tracking
- Visual calendar for monthly post scheduling
- Brand tone customization per platform
- Automated post scheduling with worker system
- Comprehensive performance analytics and insights
- Pluggable architecture for media storage, AI providers, and analytics

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with Zod validation
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4 API
- **Visualization**: Recharts
- **Testing**: Vitest
- **Containerization**: Docker & Docker Compose

## Domain Model

### Core Entities

```
BrandAccount
├── platform: INSTAGRAM | THREADS | NOTE
├── handle: string
├── accessToken: string (encrypted)
└── toneProfile: JSON

ContentIdea
├── brandId → BrandAccount
├── theme, hook, outline
└── status: DRAFT | APPROVED | USED | ARCHIVED

PostDraft
├── brandId → BrandAccount
├── ideaId → ContentIdea (optional)
├── campaignId → Campaign (optional)
├── templateId → ContentTemplate (optional)
├── hashtagSetId → HashtagSet (optional)
├── platform, caption, mediaPlan, hashtags
├── status: DRAFT | SCHEDULED | PUBLISHED | FAILED
└── resultStats: JSON

Campaign
├── brandId → BrandAccount
├── name, description, goal
├── startDate, endDate
├── status: PLANNING | ACTIVE | COMPLETED | ARCHIVED
├── targetMetrics: JSON
└── posts: PostDraft[]

ContentTemplate
├── brandId → BrandAccount
├── name, category, platform
├── structure: JSON (sections, variables)
├── exampleOutput: string
└── usageCount: number

HashtagSet
├── brandId → BrandAccount
├── name, platform, category
├── hashtags: string[]
├── usageCount: number
└── avgPerformance: JSON

MediaAsset
├── brandId → BrandAccount
├── url, type, metadata
└── posts: PostDraft[] (many-to-many)

SchedulingRule
├── brandId → BrandAccount
├── platform, strategy
└── timeSlots: JSON

PerformanceSnapshot
├── postId → PostDraft
├── snapshotAt: DateTime
├── metrics: JSON
└── growth: JSON
```

For detailed domain documentation, see [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md)

## Getting Started

### Requirements

- Node.js 20+
- Docker & Docker Compose (recommended)
- OpenAI API key

### Quick Start with Docker

1. **Clone the repository:**

```bash
git clone <repository-url>
cd sns-content-autopilot
```

2. **Set up environment variables:**

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sns_autopilot?schema=public"
OPENAI_API_KEY="sk-your-openai-api-key-here"
ENCRYPTION_KEY="dev-key-32-chars-long-needed!"
NODE_ENV="development"
```

3. **Start the application with Docker:**

```bash
# Start PostgreSQL and the app
docker compose up -d

# Run database migrations
docker compose exec app npx prisma db push

# Seed demo data
docker compose exec app npm run db:seed
```

4. **Access the application:**

Open [http://localhost:3000](http://localhost:3000)

### Local Development (without Docker)

1. **Install dependencies:**

```bash
npm install
```

2. **Start PostgreSQL:**

```bash
# Using Docker for database only
docker compose -f docker-compose.dev.yml up -d

# Or use your local PostgreSQL instance
# Update DATABASE_URL in .env accordingly
```

3. **Set up database:**

```bash
npm run db:push
npm run db:seed
```

4. **Start development server:**

```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)**

## Example Flow: Content Idea to Published Post

This demonstrates the complete vertical slice implemented in the application.

### 1. Generate Content Ideas (AI-Powered)

**Endpoint:** `POST /api/ideas/generate`

```bash
curl -X POST http://localhost:3000/api/ideas/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "clq...",
    "theme": "Morning productivity tips",
    "date": "2025-01-20T09:00:00Z",
    "count": 3
  }'
```

**UI:** Visit `/ideas` → Click "Generate Ideas" → Enter theme and date

AI will generate 3 unique content ideas with:
- Refined theme
- Attention-grabbing hook
- Detailed outline

### 2. Review and Approve Ideas

**Endpoint:** `PATCH /api/ideas/{id}`

```bash
curl -X PATCH http://localhost:3000/api/ideas/clq123 \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED"}'
```

**UI:** `/ideas` → Click "Approve" on any idea

### 3. Generate Post Draft from Idea

**Endpoint:** `POST /api/drafts/generate`

```bash
curl -X POST http://localhost:3000/api/drafts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "clq123",
    "scheduledAt": "2025-01-20T09:00:00Z"
  }'
```

**UI:** `/ideas` → Click "Generate Draft" on an approved idea

AI creates a complete post with:
- Platform-optimized caption
- Strategic hashtags (based on brand tone)
- Media plan with visual suggestions

### 4. Edit and Schedule Post

**Endpoint:** `PATCH /api/drafts/{id}`

```bash
curl -X PATCH http://localhost:3000/api/drafts/clq456 \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "Updated caption...",
    "scheduledAt": "2025-01-20T09:00:00Z",
    "status": "SCHEDULED"
  }'
```

**UI:** `/drafts` → Select draft → Click "Edit" → Set schedule → "Schedule Post"

### 5. Automated Publishing

**Worker:** Runs via cron or manually

```bash
npm run worker
```

The worker:
- Finds all `SCHEDULED` posts due for publication
- Publishes via SNS client (currently dummy implementation)
- Updates status to `PUBLISHED`
- Saves performance stats

### 6. View Analytics

**Endpoint:** `GET /api/drafts?status=PUBLISHED`

**UI:** Visit `/analytics` to see:
- Total engagement metrics
- Performance trends over time
- Platform comparison
- Top-performing posts

## API Reference

### Content Ideas

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ideas` | List all ideas (with filters) |
| POST | `/api/ideas` | Create idea manually |
| GET | `/api/ideas/{id}` | Get single idea |
| PATCH | `/api/ideas/{id}` | Update idea |
| DELETE | `/api/ideas/{id}` | Delete idea |
| POST | `/api/ideas/generate` | Generate ideas with AI |

### Post Drafts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drafts` | List all drafts (with filters) |
| POST | `/api/drafts` | Create draft manually |
| GET | `/api/drafts/{id}` | Get single draft |
| PATCH | `/api/drafts/{id}` | Update draft |
| DELETE | `/api/drafts/{id}` | Delete draft |
| POST | `/api/drafts/generate` | Generate draft from idea |

### Brand Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brands` | List all brands |
| POST | `/api/brands` | Create brand account |
| GET | `/api/brands/{id}` | Get single brand |
| PATCH | `/api/brands/{id}` | Update brand |
| DELETE | `/api/brands/{id}` | Delete brand |

## Available Scripts

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint code

# Testing
npm test                 # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Open Vitest UI

# Database
npm run db:push          # Push schema to database
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed demo data

# Worker
npm run worker           # Run post scheduler once

# Docker
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run docker:logs      # View logs
```

## Demo Data

After running `npm run db:seed`, you'll have:

**Brand Accounts:**
- Instagram: `@my_brand_ig` (lifestyle/inspirational tone)
- Threads: `@my_brand_threads` (conversational/tech-savvy)
- Note: `my_brand_note` (professional/storytelling)

**Content Ideas:**
- Morning Motivation (Approved)
- Productivity Hacks (Draft)
- Tech Trends (Approved)

**Post Drafts:**
- Instagram post (Scheduled for tomorrow 9 AM)
- Threads post (Scheduled for tomorrow 12 PM)
- Instagram post (Published 2 days ago with stats)

**Demo Flow:**
1. Visit `/ideas` - See AI-generated ideas
2. Visit `/drafts` - See scheduled posts
3. Visit `/calendar` - View posts on calendar
4. Visit `/analytics` - See performance metrics

## Testing

Run the test suite:

```bash
npm test
```

Current test coverage:
- Validation schemas (Zod)
- Encryption/decryption utilities
- (Add more as needed)

## Deployment

### Production with Docker

```bash
# Build and run
docker compose up -d

# Apply migrations
docker compose exec app npx prisma migrate deploy

# Seed data (optional)
docker compose exec app npm run db:seed
```

### Vercel Deployment

1. Push to GitHub
2. Import to Vercel
3. Set environment variables:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `ENCRYPTION_KEY`
4. Deploy

**Note:** For the worker/scheduler, use:
- Vercel Cron Jobs (Pro plan)
- External cron service (cron-job.org)
- Separate worker on Railway/Fly.io

## Architecture Decisions

### Why Dummy SNS Clients?

The SNS clients (`InstagramClient`, `ThreadsClient`, `NoteClient`) are currently dummy implementations that log actions and return simulated data. This design allows:

1. **Development without API credentials** - Build and test the full flow
2. **Easy integration** - Real API clients can be swapped in without changing the interface
3. **Predictable testing** - Consistent responses for development

### Integrating Real APIs

To integrate actual SNS APIs:

1. Implement the `BaseSNSClient` interface in each client
2. Add OAuth flow for access tokens
3. Update `createSNSClient` factory

Example:

```typescript
// src/lib/sns-clients/instagram.ts
export class InstagramClient extends BaseSNSClient {
  async publish(caption: string, mediaUrls: string[]): Promise<PostResult> {
    // Real Instagram Graph API implementation
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.userId}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          caption,
          media_type: 'IMAGE',
          image_url: mediaUrls[0],
        }),
      }
    )
    // ...
  }
}
```

## Future Extensions

- [ ] Real Instagram Graph API integration
- [ ] Threads API integration (when public)
- [ ] Note API integration
- [ ] AI image generation (DALL-E)
- [ ] A/B testing for captions
- [ ] Hashtag performance tracking
- [ ] Optimal posting time recommendations
- [ ] Multi-user collaboration
- [ ] Instagram Stories support
- [ ] Video content support
- [ ] Content calendar templates
- [ ] Bulk scheduling

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT

## Support

For issues or questions:
- Open an [Issue](https://github.com/yourusername/sns-content-autopilot/issues)
- Check existing documentation

---

**Built with ❤️ for content creators and social media managers**
