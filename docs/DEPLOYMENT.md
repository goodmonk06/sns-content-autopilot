# Deployment Guide

Production deployment strategies and configurations for SNS Content Autopilot.

## Table of Contents

- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Vercel Deployment](#vercel-deployment)
- [AWS Deployment](#aws-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Worker Setup](#worker-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Security Checklist](#security-checklist)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

---

## Deployment Options

### Quick Comparison

| Platform | Best For | Pros | Cons | Cost |
|----------|----------|------|------|------|
| **Vercel** | MVP, small teams | Zero-config, auto-scaling, global CDN | 10s function timeout (Hobby), no persistent storage | Free tier available |
| **Docker (VPS)** | Full control, custom setup | Complete control, persistent storage, long-running workers | Manual scaling, server management | $5-50/month |
| **AWS ECS** | Enterprise, high scale | Auto-scaling, managed services, reliability | Complex setup, AWS knowledge required | Pay per use |
| **Railway** | Quick deploys, simplicity | Easy setup, built-in PostgreSQL, automatic HTTPS | Limited free tier, less control | $5+/month |
| **Fly.io** | Global edge deployment | Multi-region, persistent volumes, CLI-driven | Smaller ecosystem | $0-50/month |

---

## Docker Deployment

### Option 1: Docker Compose (Single Server)

**Best for**: Small to medium deployments, staging environments

**Requirements**:
- Ubuntu 22.04+ or similar Linux VPS
- Docker 24.0+, Docker Compose 2.0+
- 2GB+ RAM, 20GB+ storage

**Step 1: Prepare Server**

```bash
# SSH into your server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**Step 2: Clone Repository**

```bash
git clone https://github.com/yourusername/sns-content-autopilot.git
cd sns-content-autopilot
```

**Step 3: Configure Environment**

```bash
cp .env.example .env
nano .env
```

```env
# Production environment
NODE_ENV=production

# Database
DATABASE_URL="postgresql://postgres:STRONG_PASSWORD_HERE@db:5432/sns_autopilot?schema=public"

# OpenAI
OPENAI_API_KEY="sk-your-production-key"

# Encryption (MUST be 32 characters)
ENCRYPTION_KEY="your-32-character-encryption-key"

# Optional: External services
MEDIA_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=your-bucket-name

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Step 4: Deploy with Docker Compose**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./uploads:/app/public/uploads  # For local media storage

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: sns_autopilot
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: Dockerfile
    command: sh -c "while true; do npm run worker; sleep 300; done"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    depends_on:
      - db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

**Step 5: Start Services**

```bash
# Build and start
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# (Optional) Seed demo data
docker compose -f docker-compose.prod.yml exec app npm run db:seed

# Check logs
docker compose -f docker-compose.prod.yml logs -f app
```

**Step 6: Configure Nginx Reverse Proxy**

```nginx
# nginx.conf
events {
  worker_connections 1024;
}

http {
  upstream app {
    server app:3000;
  }

  # Redirect HTTP to HTTPS
  server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
  }

  # HTTPS server
  server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
      proxy_pass http://app;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_cache_bypass $http_upgrade;
    }
  }
}
```

**Step 7: SSL Certificate with Let's Encrypt**

```bash
# Install Certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/

# Set up auto-renewal
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/* /path/to/app/ssl/ && docker compose -f /path/to/app/docker-compose.prod.yml restart nginx
```

**Step 8: Health Check**

```bash
curl https://your-domain.com/api/health

# Expected response:
# {"status":"ok","database":"connected","timestamp":"2025-01-15T10:00:00.000Z"}
```

---

### Option 2: Docker Swarm (Multi-Server)

**Best for**: High availability, horizontal scaling

**Setup**:

```bash
# Initialize swarm on manager node
docker swarm init --advertise-addr YOUR_MANAGER_IP

# On worker nodes, join swarm
docker swarm join --token SWARM_TOKEN MANAGER_IP:2377

# Deploy stack
docker stack deploy -c docker-compose.prod.yml sns-autopilot

# Scale services
docker service scale sns-autopilot_app=3
docker service scale sns-autopilot_worker=2
```

---

## Vercel Deployment

**Best for**: Quick deploys, serverless, global distribution

**Limitations**:
- 10s function timeout on Hobby plan, 60s on Pro
- No persistent file storage (use S3 for media)
- Workers must run as cron jobs or separate service

**Step 1: Prepare Project**

```bash
npm install -g vercel
vercel login
```

**Step 2: Configure Project**

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/publish-posts",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/collect-snapshots",
      "schedule": "0 */6 * * *"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "OPENAI_API_KEY": "@openai-api-key",
    "ENCRYPTION_KEY": "@encryption-key"
  }
}
```

**Step 3: Create Cron Endpoints**

```typescript
// /app/api/cron/publish-posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { publishScheduledPosts } from '@/workers/post-scheduler'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await publishScheduledPosts()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**Step 4: Set Environment Variables**

```bash
# Add secrets via Vercel CLI
vercel env add DATABASE_URL
# Paste: postgresql://user:pass@host:5432/db

vercel env add OPENAI_API_KEY
vercel env add ENCRYPTION_KEY
vercel env add CRON_SECRET
```

**Step 5: Deploy**

```bash
# Deploy to production
vercel --prod

# Check deployment
vercel ls
```

**Step 6: Configure External Database**

Use managed PostgreSQL from:
- **Supabase**: Free tier, good for MVPs
- **Neon**: Serverless PostgreSQL, auto-scaling
- **Railway**: Simple setup, built-in backups
- **AWS RDS**: Enterprise-grade, expensive

Example with Supabase:

```bash
# Create project at supabase.com
# Get connection string
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Run migrations from local
DATABASE_URL="your-supabase-url" npx prisma migrate deploy
```

---

## AWS Deployment

### Option 1: ECS Fargate

**Best for**: Auto-scaling, managed containers, AWS ecosystem integration

**Architecture**:

```
ALB (Load Balancer)
  ↓
ECS Service (App) - Auto Scaling 1-10 tasks
  ↓
RDS PostgreSQL (Multi-AZ)

ECS Service (Worker) - Scheduled tasks via EventBridge
```

**Step 1: Create Infrastructure (Terraform)**

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

resource "aws_ecs_cluster" "main" {
  name = "sns-autopilot-cluster"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "sns-autopilot-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "your-ecr-repo/sns-autopilot:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "DATABASE_URL", value = "postgresql://..." }
      ]
      secrets = [
        {
          name      = "OPENAI_API_KEY"
          valueFrom = aws_secretsmanager_secret.openai_key.arn
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "app" {
  name            = "sns-autopilot-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 3000
  }

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.app.id]
  }
}

resource "aws_db_instance" "postgres" {
  identifier        = "sns-autopilot-db"
  engine            = "postgres"
  engine_version    = "14.7"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_encrypted = true

  db_name  = "sns_autopilot"
  username = "postgres"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  skip_final_snapshot     = false
}
```

**Step 2: Deploy**

```bash
# Build and push Docker image
docker build -t sns-autopilot .
docker tag sns-autopilot:latest YOUR_ECR_REPO/sns-autopilot:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_REPO
docker push YOUR_ECR_REPO/sns-autopilot:latest

# Deploy infrastructure
terraform init
terraform plan
terraform apply

# Run migrations
aws ecs run-task \
  --cluster sns-autopilot-cluster \
  --task-definition sns-autopilot-app \
  --launch-type FARGATE \
  --overrides '{"containerOverrides": [{"name": "app", "command": ["npx", "prisma", "migrate", "deploy"]}]}'
```

**Step 3: Configure Worker with EventBridge**

```hcl
resource "aws_cloudwatch_event_rule" "worker_schedule" {
  name                = "sns-autopilot-worker"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "worker" {
  rule      = aws_cloudwatch_event_rule.worker_schedule.name
  target_id = "worker-task"
  arn       = aws_ecs_cluster.main.arn
  role_arn  = aws_iam_role.ecs_events.arn

  ecs_target {
    task_definition_arn = aws_ecs_task_definition.worker.arn
    launch_type         = "FARGATE"
    network_configuration {
      subnets         = aws_subnet.private[*].id
      security_groups = [aws_security_group.app.id]
    }
  }
}
```

---

### Option 2: EC2 with Auto Scaling

**Best for**: Full control, persistent storage, cost optimization

**Setup**:

```bash
# Launch EC2 instance (t3.small or larger)
# Install dependencies (see Docker Deployment Step 1)

# Set up auto-scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name sns-autopilot-asg \
  --launch-configuration-name sns-autopilot-lc \
  --min-size 1 \
  --max-size 5 \
  --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:...

# Configure scaling policies
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name sns-autopilot-asg \
  --policy-name scale-up \
  --scaling-adjustment 1 \
  --adjustment-type ChangeInCapacity \
  --cooldown 300
```

---

## Environment Configuration

### Required Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# OpenAI (required for content generation)
OPENAI_API_KEY="sk-..."

# Encryption (MUST be exactly 32 characters)
ENCRYPTION_KEY="your-32-character-key-here-now"

# Next.js
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

### Optional Environment Variables

```env
# Media Provider
MEDIA_PROVIDER=s3  # local | s3 | cloudinary
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=us-east-1

# Content Generator
CONTENT_GENERATOR=openai  # openai | anthropic | local
ANTHROPIC_API_KEY=...

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Analytics
GA4_PROPERTY_ID=...
GA4_CREDENTIALS={"type":"service_account",...}

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=...

# Feature Flags
ENABLE_AB_TESTING=true
ENABLE_AUTO_APPROVAL=false
```

---

## Database Setup

### Production Database Checklist

- [ ] Use managed service (RDS, Supabase, Neon, etc.)
- [ ] Enable automated backups (7-30 day retention)
- [ ] Configure Multi-AZ for high availability
- [ ] Set up read replicas for scaling
- [ ] Enable SSL/TLS for connections
- [ ] Configure connection pooling (PgBouncer)
- [ ] Set up monitoring and alerts

### Connection Pooling

```typescript
// /lib/db.ts (production)
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Configure connection pool via DATABASE_URL
// postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
```

### Database Migrations

```bash
# Production migration workflow
# 1. Create migration locally
npx prisma migrate dev --name add_new_field

# 2. Test migration on staging
DATABASE_URL="staging-db-url" npx prisma migrate deploy

# 3. Deploy to production
DATABASE_URL="prod-db-url" npx prisma migrate deploy

# 4. Verify
npx prisma db pull
```

### Backup Strategy

```bash
# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/sns-autopilot-$(date +\%Y\%m\%d).sql.gz

# Restore from backup
gunzip < backup.sql.gz | psql $DATABASE_URL
```

---

## Worker Setup

### Cron-Based Worker (Traditional)

```bash
# /etc/cron.d/sns-autopilot-worker
*/5 * * * * cd /app && npm run worker >> /var/log/worker.log 2>&1
0 */6 * * * cd /app && npm run worker:snapshots >> /var/log/snapshots.log 2>&1
0 3 * * * cd /app && npm run worker:campaigns >> /var/log/campaigns.log 2>&1
```

### Systemd Timer (Modern Linux)

```ini
# /etc/systemd/system/sns-worker.service
[Unit]
Description=SNS Content Autopilot Worker
After=network.target

[Service]
Type=oneshot
User=www-data
WorkingDirectory=/app
Environment="NODE_ENV=production"
EnvironmentFile=/app/.env
ExecStart=/usr/bin/npm run worker

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/sns-worker.timer
[Unit]
Description=SNS Worker Timer
Requires=sns-worker.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min
Unit=sns-worker.service

[Install]
WantedBy=timers.target
```

```bash
# Enable and start timer
sudo systemctl enable sns-worker.timer
sudo systemctl start sns-worker.timer

# Check status
sudo systemctl status sns-worker.timer
sudo journalctl -u sns-worker.service -f
```

### Job Queue (Production-Grade)

**Using BullMQ + Redis**:

```typescript
// /lib/queue.ts
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!)

export const postQueue = new Queue('posts', { connection })

// Producer
export async function schedulePostPublishing(postId: string, scheduledAt: Date) {
  await postQueue.add(
    'publish',
    { postId },
    { delay: scheduledAt.getTime() - Date.now() }
  )
}

// Consumer (worker process)
new Worker(
  'posts',
  async (job) => {
    if (job.name === 'publish') {
      const { postId } = job.data
      await publishPost(postId)
    }
  },
  { connection }
)
```

---

## Monitoring & Logging

### Application Monitoring

**Sentry for Error Tracking**:

```typescript
// /lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
```

**Datadog for Metrics**:

```typescript
// /lib/datadog.ts
import { StatsD } from 'node-dogstatsd'

const dogstatsd = new StatsD()

export function trackMetric(name: string, value: number, tags: string[]) {
  dogstatsd.gauge(name, value, tags)
}
```

### Structured Logging

```typescript
// Already implemented in /lib/logger.ts
// Outputs JSON in production for log aggregation

// Use with log aggregation services:
// - AWS CloudWatch Logs
// - Datadog Logs
// - Logtail
// - Papertrail
```

### Health Checks

```typescript
// /app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`

    // Check OpenAI (optional)
    const openaiOk = !!process.env.OPENAI_API_KEY

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      openai: openaiOk ? 'configured' : 'missing',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
```

### Uptime Monitoring

Use external services:
- UptimeRobot (free tier available)
- Pingdom
- Better Uptime
- AWS CloudWatch Synthetics

```bash
# Example: Monitor /api/health every 5 minutes
# Configure in UptimeRobot dashboard
URL: https://your-domain.com/api/health
Interval: 5 minutes
Alert: Email if down for 2 checks
```

---

## Security Checklist

- [ ] Environment variables in `.env` (not committed)
- [ ] HTTPS enabled (SSL certificate from Let's Encrypt)
- [ ] Database credentials rotated regularly
- [ ] API keys stored in secrets manager (AWS Secrets Manager, Vercel Secrets)
- [ ] Rate limiting enabled on API routes
- [ ] CORS configured for specific origins
- [ ] SQL injection protected (Prisma ORM)
- [ ] XSS protection (React auto-escaping)
- [ ] CSP headers configured
- [ ] Dependency security audits (`npm audit`)
- [ ] Regular security updates (`npm update`)
- [ ] Authentication implemented (NextAuth.js recommended)
- [ ] Authorization checks on all API routes
- [ ] Encryption key is 32 characters and random
- [ ] Database backups encrypted
- [ ] Logs don't contain sensitive data (PII, tokens)

---

## Performance Optimization

### Caching Strategy

```typescript
// /lib/cache.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached)
  }

  const data = await fetcher()
  await redis.set(key, JSON.stringify(data), 'EX', ttl)
  return data
}

// Usage
const metrics = await getCachedOrFetch(
  `campaign:${id}:metrics`,
  () => campaignService.getMetrics(id),
  300  // 5 minutes
)
```

### Database Optimization

```prisma
// Add indexes to frequently queried fields
model PostDraft {
  id String @id

  @@index([brandId, status])
  @@index([status, scheduledAt])
  @@index([campaignId])
  @@index([platform, status])
}
```

### CDN for Static Assets

Use Cloudflare, Vercel Edge, or AWS CloudFront:

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn.cloudfront.net'],
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://your-cdn.cloudfront.net' : '',
}
```

---

## Troubleshooting

### Common Issues

**1. "DATABASE_URL is not defined"**

```bash
# Verify .env file exists and is loaded
cat .env | grep DATABASE_URL

# For Docker: check docker-compose.yml env_file or environment
docker compose config
```

**2. "Worker not publishing posts"**

```bash
# Check worker logs
docker compose logs worker

# Manually run worker
docker compose exec app npm run worker

# Verify cron is running
docker compose exec app crontab -l
```

**3. "OpenAI API rate limit exceeded"**

```typescript
// Implement exponential backoff
import { backOff } from 'exponential-backoff'

const response = await backOff(
  () => openai.chat.completions.create({ ... }),
  { numOfAttempts: 3, startingDelay: 1000 }
)
```

**4. "Out of memory"**

```yaml
# Increase memory limit in docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

**5. "Connection pool exhausted"**

```env
# Increase connection limit
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"
```

---

## See Also

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Extension Guide](./EXTENSION_GUIDE.md)
- [Integration Recipes](./INTEGRATION_RECIPES.md)
