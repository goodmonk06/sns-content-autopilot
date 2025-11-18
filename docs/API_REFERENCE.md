# API Reference

Complete API documentation for SNS Content Autopilot.

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

**Current Version**: No authentication (demo/MVP)

**Planned**: Bearer token authentication
```http
Authorization: Bearer <token>
```

## Common Response Formats

### Success Response
```json
{
  "id": "clq123...",
  "name": "Resource Name",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": [
    {
      "path": "field.name",
      "message": "Validation error details"
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Validation error or malformed request |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Server-side error |

---

## Brand Accounts

Manage social media brand accounts.

### Create Brand Account

**Endpoint**: `POST /api/brands`

**Request Body**:
```json
{
  "platform": "INSTAGRAM",
  "handle": "my_brand_ig",
  "displayName": "My Brand",
  "accessToken": "oauth-access-token-here",
  "toneProfile": {
    "voice": "professional",
    "keywords": ["productivity", "wellness"],
    "avoidWords": ["spam"],
    "emojiUsage": "moderate",
    "hashtagStrategy": "focused",
    "targetAudience": "Young professionals"
  }
}
```

**Response**: `201 Created`
```json
{
  "id": "clq1a2b3c4d5e6f7g8h9i0",
  "platform": "INSTAGRAM",
  "handle": "my_brand_ig",
  "displayName": "My Brand",
  "accessToken": "a1b2c3d4:encryptedtoken...",
  "toneProfile": { ... },
  "isActive": true,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Validation Rules**:
- `platform`: Must be "INSTAGRAM", "THREADS", or "NOTE"
- `handle`: 1-50 characters
- `displayName`: Optional, max 100 characters
- `accessToken`: Required, will be encrypted before storage
- `toneProfile`: Optional JSON object

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/brands \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "INSTAGRAM",
    "handle": "my_brand_ig",
    "displayName": "My Brand",
    "accessToken": "oauth-token",
    "toneProfile": {
      "voice": "professional",
      "keywords": ["productivity"]
    }
  }'
```

### List Brand Accounts

**Endpoint**: `GET /api/brands`

**Query Parameters**:
- `platform` (optional): Filter by platform (INSTAGRAM, THREADS, NOTE)
- `isActive` (optional): Filter by active status (true, false)

**Response**: `200 OK`
```json
[
  {
    "id": "clq1...",
    "platform": "INSTAGRAM",
    "handle": "my_brand_ig",
    "displayName": "My Brand",
    "isActive": true,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

**cURL Example**:
```bash
curl "http://localhost:3000/api/brands?platform=INSTAGRAM"
```

### Get Single Brand Account

**Endpoint**: `GET /api/brands/{id}`

**Response**: `200 OK` or `404 Not Found`

**cURL Example**:
```bash
curl http://localhost:3000/api/brands/clq1a2b3c4d5e6f7g8h9i0
```

### Update Brand Account

**Endpoint**: `PATCH /api/brands/{id}`

**Request Body** (all fields optional):
```json
{
  "displayName": "Updated Brand Name",
  "toneProfile": {
    "voice": "casual",
    "keywords": ["lifestyle", "wellness"]
  },
  "isActive": false
}
```

**Response**: `200 OK`

**cURL Example**:
```bash
curl -X PATCH http://localhost:3000/api/brands/clq1... \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Updated Name"}'
```

### Delete Brand Account

**Endpoint**: `DELETE /api/brands/{id}`

**Response**: `200 OK`
```json
{
  "success": true
}
```

**cURL Example**:
```bash
curl -X DELETE http://localhost:3000/api/brands/clq1...
```

---

## Content Ideas

Manage content ideas for social media posts.

### Create Content Idea

**Endpoint**: `POST /api/ideas`

**Request Body**:
```json
{
  "brandId": "clq1a2b3c4d5e6f7g8h9i0",
  "date": "2025-01-20T09:00:00Z",
  "theme": "Morning motivation",
  "hook": "Start your day with purpose!",
  "outline": "# Main Points\n- Wake up early\n- Set daily goals\n- Practice gratitude"
}
```

**Response**: `201 Created`
```json
{
  "id": "clq2...",
  "brandId": "clq1...",
  "date": "2025-01-20T09:00:00.000Z",
  "theme": "Morning motivation",
  "hook": "Start your day with purpose!",
  "outline": "# Main Points\n- Wake up early\n- Set daily goals\n- Practice gratitude",
  "status": "DRAFT",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Validation Rules**:
- `brandId`: Required, must be valid CUID
- `date`: Required, ISO 8601 datetime string
- `theme`: Required, 1-200 characters
- `hook`: Required, 1-500 characters
- `outline`: Required, max 5000 characters (markdown supported)

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "clq1...",
    "date": "2025-01-20T09:00:00Z",
    "theme": "Morning motivation",
    "hook": "Start your day with purpose!",
    "outline": "Wake up early and set goals"
  }'
```

### Generate Content Ideas (AI-Powered)

**Endpoint**: `POST /api/ideas/generate`

**Request Body**:
```json
{
  "brandId": "clq1a2b3c4d5e6f7g8h9i0",
  "theme": "Productivity tips for remote workers",
  "date": "2025-01-20T09:00:00Z",
  "count": 3
}
```

**Response**: `201 Created`
```json
[
  {
    "id": "clq3...",
    "brandId": "clq1...",
    "date": "2025-01-20T09:00:00.000Z",
    "theme": "Time-blocking for remote productivity",
    "hook": "Reclaim your focus with this simple scheduling technique!",
    "outline": "## Introduction\n- Why remote workers lose focus\n\n## Time-blocking basics\n- Divide day into blocks\n- Assign tasks to each block\n\n## Benefits\n- Increased productivity\n- Better work-life balance",
    "status": "DRAFT",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  {
    "id": "clq4...",
    "brandId": "clq1...",
    "date": "2025-01-20T09:00:00.000Z",
    "theme": "Creating a dedicated workspace at home",
    "hook": "Your environment shapes your productivity!",
    "outline": "...",
    "status": "DRAFT",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  {
    "id": "clq5...",
    "brandId": "clq1...",
    "date": "2025-01-20T09:00:00.000Z",
    "theme": "Pomodoro technique for deep work",
    "hook": "25 minutes to maximum focus!",
    "outline": "...",
    "status": "DRAFT",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

**Validation Rules**:
- `brandId`: Required, must be valid CUID
- `theme`: Required, 1-500 characters (the broader topic to generate ideas from)
- `date`: Required, target publication date
- `count`: Optional, 1-10 (default: 3)

**AI Behavior**:
- Uses OpenAI GPT-4 to generate diverse ideas based on theme
- Considers brand's `toneProfile` for voice consistency
- Generates unique hook and detailed outline for each idea
- All generated ideas start with `status: DRAFT`

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/ideas/generate \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "clq1...",
    "theme": "Productivity tips for remote workers",
    "date": "2025-01-20T09:00:00Z",
    "count": 3
  }'
```

### List Content Ideas

**Endpoint**: `GET /api/ideas`

**Query Parameters**:
- `brandId` (optional): Filter by brand account
- `status` (optional): Filter by status (DRAFT, APPROVED, USED, ARCHIVED)
- `startDate` (optional): Filter ideas after this date (ISO 8601)
- `endDate` (optional): Filter ideas before this date (ISO 8601)

**Response**: `200 OK`
```json
[
  {
    "id": "clq2...",
    "brandId": "clq1...",
    "date": "2025-01-20T09:00:00.000Z",
    "theme": "Morning motivation",
    "hook": "Start your day with purpose!",
    "outline": "...",
    "status": "APPROVED",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:05:00.000Z"
  }
]
```

**cURL Example**:
```bash
curl "http://localhost:3000/api/ideas?brandId=clq1...&status=APPROVED"
```

### Get Single Content Idea

**Endpoint**: `GET /api/ideas/{id}`

**Response**: `200 OK` or `404 Not Found`

**cURL Example**:
```bash
curl http://localhost:3000/api/ideas/clq2...
```

### Update Content Idea

**Endpoint**: `PATCH /api/ideas/{id}`

**Request Body** (all fields optional):
```json
{
  "theme": "Updated theme",
  "hook": "Updated hook",
  "outline": "Updated outline",
  "status": "APPROVED"
}
```

**Response**: `200 OK`

**Status Transition Rules**:
- DRAFT → APPROVED (approve idea)
- APPROVED → USED (when draft is generated from idea)
- Any status → ARCHIVED (soft delete)

**cURL Example**:
```bash
curl -X PATCH http://localhost:3000/api/ideas/clq2... \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED"}'
```

### Delete Content Idea

**Endpoint**: `DELETE /api/ideas/{id}`

**Response**: `200 OK`
```json
{
  "success": true
}
```

**cURL Example**:
```bash
curl -X DELETE http://localhost:3000/api/ideas/clq2...
```

---

## Post Drafts

Manage post drafts for scheduling and publication.

### Create Post Draft

**Endpoint**: `POST /api/drafts`

**Request Body**:
```json
{
  "brandId": "clq1a2b3c4d5e6f7g8h9i0",
  "ideaId": "clq2...",
  "campaignId": "clq6...",
  "templateId": "clq7...",
  "hashtagSetId": "clq8...",
  "platform": "INSTAGRAM",
  "caption": "Start your day with purpose! 🌅\n\n5 morning rituals that changed my life:\n1. Wake at 6 AM\n2. 10-minute meditation\n3. Gratitude journaling\n4. Healthy breakfast\n5. Review daily goals\n\nWhich one will you try tomorrow?",
  "mediaPlan": {
    "type": "single-image",
    "description": "Sunrise over mountains with coffee mug",
    "suggestedStyle": "warm, inspirational, bright colors",
    "aspectRatio": "4:5"
  },
  "hashtags": ["#MorningRoutine", "#ProductivityTips", "#Wellness"],
  "scheduledAt": "2025-01-20T09:00:00Z"
}
```

**Response**: `201 Created`
```json
{
  "id": "clq9...",
  "brandId": "clq1...",
  "ideaId": "clq2...",
  "campaignId": "clq6...",
  "templateId": "clq7...",
  "hashtagSetId": "clq8...",
  "platform": "INSTAGRAM",
  "caption": "Start your day with purpose! 🌅...",
  "mediaPlan": { ... },
  "hashtags": ["#MorningRoutine", "#ProductivityTips", "#Wellness"],
  "scheduledAt": "2025-01-20T09:00:00.000Z",
  "publishedAt": null,
  "status": "SCHEDULED",
  "failureReason": null,
  "resultStats": null,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Validation Rules**:
- `brandId`: Required, must be valid CUID
- `ideaId`: Optional, must be valid CUID if provided
- `campaignId`: Optional, must be valid CUID if provided
- `templateId`: Optional, must be valid CUID if provided
- `hashtagSetId`: Optional, must be valid CUID if provided
- `platform`: Required (INSTAGRAM, THREADS, NOTE)
- `caption`: Required, max 2200 characters (Instagram limit)
- `mediaPlan`: Optional JSON object
- `hashtags`: Optional array, max 30 items
- `scheduledAt`: Optional, ISO 8601 datetime (sets status to SCHEDULED if provided)

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "clq1...",
    "platform": "INSTAGRAM",
    "caption": "Start your day with purpose! 🌅",
    "hashtags": ["#MorningRoutine"],
    "scheduledAt": "2025-01-20T09:00:00Z"
  }'
```

### Generate Post Draft from Idea (AI-Powered)

**Endpoint**: `POST /api/drafts/generate`

**Request Body**:
```json
{
  "ideaId": "clq2...",
  "scheduledAt": "2025-01-20T09:00:00Z",
  "templateId": "clq7...",
  "hashtagSetId": "clq8..."
}
```

**Response**: `201 Created`
```json
{
  "id": "clq9...",
  "brandId": "clq1...",
  "ideaId": "clq2...",
  "platform": "INSTAGRAM",
  "caption": "Start your day with purpose! 🌅\n\n[AI-generated content based on idea's theme, hook, and outline]",
  "mediaPlan": {
    "type": "single-image",
    "description": "Morning scene based on content theme",
    "suggestedStyle": "bright, inspirational",
    "aspectRatio": "4:5"
  },
  "hashtags": ["#MorningRoutine", "#ProductivityTips", "#Wellness"],
  "scheduledAt": "2025-01-20T09:00:00.000Z",
  "status": "SCHEDULED",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Validation Rules**:
- `ideaId`: Required, must be APPROVED status
- `scheduledAt`: Optional, ISO 8601 datetime
- `templateId`: Optional, applies template structure if provided
- `hashtagSetId`: Optional, uses hashtag set if provided

**AI Behavior**:
- Fetches ContentIdea and BrandAccount
- Uses OpenAI GPT-4 to generate platform-optimized caption
- Considers `toneProfile` for voice consistency
- Applies template structure if `templateId` provided
- Uses hashtags from `hashtagSetId` or generates strategic hashtags
- Creates media plan suggestions
- Updates ContentIdea status to USED

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/drafts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "clq2...",
    "scheduledAt": "2025-01-20T09:00:00Z"
  }'
```

### List Post Drafts

**Endpoint**: `GET /api/drafts`

**Query Parameters**:
- `brandId` (optional): Filter by brand account
- `status` (optional): Filter by status (DRAFT, SCHEDULED, PUBLISHED, FAILED)
- `platform` (optional): Filter by platform (INSTAGRAM, THREADS, NOTE)
- `campaignId` (optional): Filter by campaign
- `startDate` (optional): Filter drafts scheduled after this date
- `endDate` (optional): Filter drafts scheduled before this date

**Response**: `200 OK`
```json
[
  {
    "id": "clq9...",
    "brandId": "clq1...",
    "platform": "INSTAGRAM",
    "caption": "Start your day with purpose! 🌅",
    "scheduledAt": "2025-01-20T09:00:00.000Z",
    "status": "SCHEDULED",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

**cURL Example**:
```bash
curl "http://localhost:3000/api/drafts?brandId=clq1...&status=SCHEDULED"
```

### Get Single Post Draft

**Endpoint**: `GET /api/drafts/{id}`

**Response**: `200 OK` or `404 Not Found`

**cURL Example**:
```bash
curl http://localhost:3000/api/drafts/clq9...
```

### Update Post Draft

**Endpoint**: `PATCH /api/drafts/{id}`

**Request Body** (all fields optional):
```json
{
  "caption": "Updated caption text",
  "hashtags": ["#NewHashtag", "#Updated"],
  "scheduledAt": "2025-01-21T10:00:00Z",
  "status": "SCHEDULED"
}
```

**Response**: `200 OK`

**Status Transition Rules**:
- DRAFT → SCHEDULED (set `scheduledAt`)
- SCHEDULED → DRAFT (clear `scheduledAt`)
- SCHEDULED → PUBLISHED (done by worker)
- SCHEDULED → FAILED (done by worker on error)
- PUBLISHED status cannot be changed

**cURL Example**:
```bash
curl -X PATCH http://localhost:3000/api/drafts/clq9... \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledAt": "2025-01-21T10:00:00Z",
    "status": "SCHEDULED"
  }'
```

### Delete Post Draft

**Endpoint**: `DELETE /api/drafts/{id}`

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Note**: Cannot delete PUBLISHED posts

**cURL Example**:
```bash
curl -X DELETE http://localhost:3000/api/drafts/clq9...
```

---

## Campaigns

Manage coordinated marketing campaigns.

### Create Campaign

**Endpoint**: `POST /api/campaigns`

**Request Body**:
```json
{
  "brandId": "clq1a2b3c4d5e6f7g8h9i0",
  "name": "Q1 Wellness Challenge",
  "description": "30-day wellness challenge to engage our community",
  "goal": "Increase engagement by 25% and gain 1000 followers",
  "startDate": "2025-01-15T00:00:00Z",
  "endDate": "2025-02-15T23:59:59Z",
  "targetMetrics": {
    "totalPosts": 30,
    "targetLikes": 5000,
    "targetEngagementRate": 0.15,
    "targetReach": 50000
  }
}
```

**Response**: `201 Created`
```json
{
  "id": "clq10...",
  "brandId": "clq1...",
  "name": "Q1 Wellness Challenge",
  "description": "30-day wellness challenge to engage our community",
  "goal": "Increase engagement by 25% and gain 1000 followers",
  "startDate": "2025-01-15T00:00:00.000Z",
  "endDate": "2025-02-15T23:59:59.000Z",
  "status": "PLANNING",
  "targetMetrics": {
    "totalPosts": 30,
    "targetLikes": 5000,
    "targetEngagementRate": 0.15,
    "targetReach": 50000
  },
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Validation Rules**:
- `brandId`: Required, must be valid CUID
- `name`: Required, 1-200 characters
- `description`: Optional, max 2000 characters
- `goal`: Optional, max 500 characters
- `startDate`: Required, ISO 8601 datetime
- `endDate`: Required, ISO 8601 datetime, must be after `startDate`
- `targetMetrics`: Optional JSON object with numeric values

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "clq1...",
    "name": "Q1 Wellness Challenge",
    "startDate": "2025-01-15T00:00:00Z",
    "endDate": "2025-02-15T23:59:59Z",
    "targetMetrics": {"totalPosts": 30}
  }'
```

### List Campaigns

**Endpoint**: `GET /api/campaigns`

**Query Parameters**:
- `brandId` (optional): Filter by brand account
- `status` (optional): Filter by status (PLANNING, ACTIVE, COMPLETED, ARCHIVED)
- `startDate` (optional): Filter campaigns starting after this date
- `endDate` (optional): Filter campaigns ending before this date

**Response**: `200 OK`
```json
[
  {
    "id": "clq10...",
    "brandId": "clq1...",
    "name": "Q1 Wellness Challenge",
    "status": "ACTIVE",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-02-15T23:59:59.000Z",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:05:00.000Z"
  }
]
```

**cURL Example**:
```bash
curl "http://localhost:3000/api/campaigns?brandId=clq1...&status=ACTIVE"
```

### Get Single Campaign

**Endpoint**: `GET /api/campaigns/{id}`

**Query Parameters**:
- `includePosts` (optional): Include related posts (true, false, default: false)

**Response**: `200 OK` or `404 Not Found`
```json
{
  "id": "clq10...",
  "brandId": "clq1...",
  "name": "Q1 Wellness Challenge",
  "description": "...",
  "goal": "...",
  "startDate": "2025-01-15T00:00:00.000Z",
  "endDate": "2025-02-15T23:59:59.000Z",
  "status": "ACTIVE",
  "targetMetrics": { ... },
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z",
  "posts": [
    {
      "id": "clq9...",
      "caption": "...",
      "status": "PUBLISHED",
      "resultStats": { ... }
    }
  ]
}
```

**cURL Example**:
```bash
curl "http://localhost:3000/api/campaigns/clq10...?includePosts=true"
```

### Update Campaign

**Endpoint**: `PATCH /api/campaigns/{id}`

**Request Body** (all fields optional):
```json
{
  "name": "Updated Campaign Name",
  "description": "Updated description",
  "status": "ACTIVE",
  "endDate": "2025-03-15T23:59:59Z"
}
```

**Response**: `200 OK`

**Status Transition Rules**:
- PLANNING → ACTIVE (activate campaign)
- ACTIVE → COMPLETED (complete campaign)
- Any status → ARCHIVED (soft delete)
- Cannot change to PLANNING from ACTIVE or COMPLETED

**cURL Example**:
```bash
curl -X PATCH http://localhost:3000/api/campaigns/clq10... \
  -H "Content-Type: application/json" \
  -d '{"status": "ACTIVE"}'
```

### Delete Campaign

**Endpoint**: `DELETE /api/campaigns/{id}`

**Response**: `200 OK`
```json
{
  "success": true
}
```

**Note**: Deleting a campaign doesn't delete its posts, it only removes the `campaignId` reference

**cURL Example**:
```bash
curl -X DELETE http://localhost:3000/api/campaigns/clq10...
```

### Get Campaign Metrics

**Endpoint**: `GET /api/campaigns/{id}/metrics`

**Response**: `200 OK`
```json
{
  "campaignId": "clq10...",
  "totalPosts": 15,
  "publishedPosts": 12,
  "scheduledPosts": 3,
  "draftPosts": 0,
  "totalLikes": 3200,
  "totalComments": 450,
  "totalShares": 120,
  "totalReach": 28000,
  "avgEngagementRate": 0.128,
  "completionRate": 0.8,
  "progressToGoal": {
    "totalPosts": 0.5,
    "targetLikes": 0.64,
    "targetEngagementRate": 0.85,
    "targetReach": 0.56
  }
}
```

**Calculation**:
- `completionRate` = publishedPosts / totalPosts
- `avgEngagementRate` = average of all published posts' engagement rates
- `progressToGoal` = actual / target for each metric

**cURL Example**:
```bash
curl http://localhost:3000/api/campaigns/clq10.../metrics
```

### Add Post to Campaign

**Endpoint**: `POST /api/campaigns/{id}/posts`

**Request Body**:
```json
{
  "postId": "clq9a2b3c4d5e6f7g8h9i0"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "campaignId": "clq10...",
  "postId": "clq9..."
}
```

**Validation**:
- Campaign must not be COMPLETED or ARCHIVED
- Post must belong to the same brand as campaign

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/campaigns/clq10.../posts \
  -H "Content-Type: application/json" \
  -d '{"postId": "clq9..."}'
```

---

## Content Templates

Manage reusable post templates.

### Create Content Template

**Endpoint**: `POST /api/templates`

**Request Body**:
```json
{
  "brandId": "clq1a2b3c4d5e6f7g8h9i0",
  "name": "Product Announcement",
  "description": "Template for announcing new products",
  "category": "PROMOTIONAL",
  "platform": "INSTAGRAM",
  "structure": {
    "sections": [
      {
        "name": "hook",
        "placeholder": "Exciting opening line",
        "required": true
      },
      {
        "name": "product_intro",
        "placeholder": "Introduce the product and its benefits",
        "required": true
      },
      {
        "name": "cta",
        "placeholder": "Call to action (link in bio, DM us, etc.)",
        "required": false
      }
    ],
    "variables": [
      {
        "name": "product_name",
        "description": "Name of the product",
        "defaultValue": ""
      },
      {
        "name": "launch_date",
        "description": "Product launch date",
        "defaultValue": ""
      }
    ]
  },
  "exampleOutput": "🎉 Introducing {product_name}!\n\n[product_intro]\n\nLaunching {launch_date}. Link in bio!",
  "isPublic": false
}
```

**Response**: `201 Created`
```json
{
  "id": "clq11...",
  "brandId": "clq1...",
  "name": "Product Announcement",
  "description": "Template for announcing new products",
  "category": "PROMOTIONAL",
  "platform": "INSTAGRAM",
  "structure": { ... },
  "exampleOutput": "🎉 Introducing {product_name}!...",
  "usageCount": 0,
  "isPublic": false,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Validation Rules**:
- `brandId`: Optional (null for public templates), must be valid CUID if provided
- `name`: Required, 1-200 characters
- `description`: Optional, max 1000 characters
- `category`: Required (PROMOTIONAL, EDUCATIONAL, ENGAGEMENT, ANNOUNCEMENT, SEASONAL, EVERGREEN)
- `platform`: Required (INSTAGRAM, THREADS, NOTE)
- `structure`: Required JSON object with `sections` and `variables` arrays
- `exampleOutput`: Optional, max 2200 characters
- `isPublic`: Optional, default false

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "clq1...",
    "name": "Product Announcement",
    "category": "PROMOTIONAL",
    "platform": "INSTAGRAM",
    "structure": {
      "sections": [{"name": "hook", "placeholder": "Opening", "required": true}],
      "variables": [{"name": "product_name", "description": "Product name"}]
    }
  }'
```

### List Content Templates

**Endpoint**: `GET /api/templates`

**Query Parameters**:
- `brandId` (optional): Filter by brand account (includes public templates)
- `category` (optional): Filter by category
- `platform` (optional): Filter by platform
- `isPublic` (optional): Filter by public status (true, false)

**Response**: `200 OK`
```json
[
  {
    "id": "clq11...",
    "brandId": "clq1...",
    "name": "Product Announcement",
    "category": "PROMOTIONAL",
    "platform": "INSTAGRAM",
    "usageCount": 5,
    "isPublic": false,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

**cURL Example**:
```bash
curl "http://localhost:3000/api/templates?category=PROMOTIONAL&platform=INSTAGRAM"
```

---

## Hashtag Sets

Manage hashtag collections with performance tracking.

### Create Hashtag Set

**Endpoint**: `POST /api/hashtags`

**Request Body**:
```json
{
  "brandId": "clq1a2b3c4d5e6f7g8h9i0",
  "name": "Wellness & Lifestyle",
  "description": "Hashtags for wellness and lifestyle content",
  "platform": "INSTAGRAM",
  "hashtags": [
    "#Wellness",
    "#HealthyLiving",
    "#Mindfulness",
    "#SelfCare",
    "#LifestyleGoals"
  ],
  "category": "wellness"
}
```

**Response**: `201 Created`
```json
{
  "id": "clq12...",
  "brandId": "clq1...",
  "name": "Wellness & Lifestyle",
  "description": "Hashtags for wellness and lifestyle content",
  "platform": "INSTAGRAM",
  "hashtags": ["#Wellness", "#HealthyLiving", "#Mindfulness", "#SelfCare", "#LifestyleGoals"],
  "category": "wellness",
  "usageCount": 0,
  "avgPerformance": null,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Validation Rules**:
- `brandId`: Required, must be valid CUID
- `name`: Required, 1-100 characters
- `description`: Optional, max 500 characters
- `platform`: Required (INSTAGRAM, THREADS, NOTE)
- `hashtags`: Required array, 1-30 items, each 1-50 characters (must start with #)
- `category`: Optional, max 50 characters

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/hashtags \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "clq1...",
    "name": "Wellness & Lifestyle",
    "platform": "INSTAGRAM",
    "hashtags": ["#Wellness", "#HealthyLiving"]
  }'
```

### List Hashtag Sets

**Endpoint**: `GET /api/hashtags`

**Query Parameters**:
- `brandId` (optional): Filter by brand account
- `platform` (optional): Filter by platform
- `category` (optional): Filter by category

**Response**: `200 OK`
```json
[
  {
    "id": "clq12...",
    "brandId": "clq1...",
    "name": "Wellness & Lifestyle",
    "platform": "INSTAGRAM",
    "hashtags": ["#Wellness", "#HealthyLiving", "#Mindfulness", "#SelfCare", "#LifestyleGoals"],
    "category": "wellness",
    "usageCount": 8,
    "avgPerformance": {
      "avgLikes": 245.5,
      "avgComments": 32.1,
      "avgEngagementRate": 0.142,
      "totalUsage": 8,
      "lastUsed": "2025-01-14T12:00:00.000Z"
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

**cURL Example**:
```bash
curl "http://localhost:3000/api/hashtags?brandId=clq1...&platform=INSTAGRAM"
```

### Get Hashtag Performance Analysis

**Endpoint**: `GET /api/hashtags/performance`

**Query Parameters**:
- `brandId`: Required, brand account ID
- `platform` (optional): Filter by platform
- `limit` (optional): Number of top hashtag sets to return (default: 10)

**Response**: `200 OK`
```json
{
  "topHashtagSets": [
    {
      "id": "clq12...",
      "name": "Wellness & Lifestyle",
      "avgEngagementRate": 0.142,
      "avgLikes": 245.5,
      "usageCount": 8
    },
    {
      "id": "clq13...",
      "name": "Motivation & Growth",
      "avgEngagementRate": 0.135,
      "avgLikes": 220.3,
      "usageCount": 12
    }
  ],
  "recommendations": [
    {
      "hashtagSetId": "clq12...",
      "reason": "High engagement rate (14.2%), use for wellness content"
    }
  ]
}
```

**cURL Example**:
```bash
curl "http://localhost:3000/api/hashtags/performance?brandId=clq1...&limit=5"
```

---

## Error Examples

### Validation Error (400)

**Request**:
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "invalid-id",
    "name": "",
    "endDate": "2025-01-01T00:00:00Z",
    "startDate": "2025-02-01T00:00:00Z"
  }'
```

**Response**: `400 Bad Request`
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": "brandId",
      "message": "Invalid cuid"
    },
    {
      "path": "name",
      "message": "String must contain at least 1 character(s)"
    },
    {
      "path": "endDate",
      "message": "endDate must be after startDate"
    }
  ]
}
```

### Not Found (404)

**Request**:
```bash
curl http://localhost:3000/api/campaigns/nonexistent-id
```

**Response**: `404 Not Found`
```json
{
  "error": "Campaign not found"
}
```

### Internal Server Error (500)

**Response**: `500 Internal Server Error`
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

**Current Version**: No rate limiting (demo/MVP)

**Planned**:
- 100 requests per 15 minutes per IP
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Pagination

**Current Version**: No pagination (all results returned)

**Planned**:
```
GET /api/drafts?page=1&limit=20
```

**Response**:
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Webhooks

**Planned Feature**: Subscribe to domain events via webhooks

**Event Types**:
- `post.published`
- `post.failed`
- `campaign.completed`
- `performance.milestone` (e.g., 1000 likes reached)

**Webhook Payload**:
```json
{
  "event": "post.published",
  "timestamp": "2025-01-20T09:00:05.000Z",
  "data": {
    "postId": "clq9...",
    "brandId": "clq1...",
    "platform": "INSTAGRAM",
    "resultStats": { ... }
  }
}
```

---

## See Also

- [Domain Model](./DOMAIN_MODEL.md) - Entity relationships
- [Architecture Overview](./ARCHITECTURE.md) - System design
- [Extension Guide](./EXTENSION_GUIDE.md) - Building plugins
- [Integration Recipes](./INTEGRATION_RECIPES.md) - Common integration patterns
