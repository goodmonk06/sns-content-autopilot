#!/usr/bin/env tsx

/**
 * Post Scheduler Worker
 *
 * This worker runs periodically (e.g., via cron) to:
 * 1. Find posts scheduled for publication
 * 2. Publish them via the appropriate SNS client
 * 3. Update post status and stats
 *
 * Usage:
 *   npm run worker
 *   OR
 *   */5 * * * * cd /path/to/app && npm run worker
 */

import { PrismaClient } from '@prisma/client'
import { createSNSClient } from '../lib/sns-clients'

const prisma = new PrismaClient()

async function processScheduledPosts() {
  const now = new Date()

  console.log(`[Worker] Starting post scheduler at ${now.toISOString()}`)

  // Find posts that are scheduled and due for publication
  const duePosts = await prisma.postDraft.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: {
        lte: now
      }
    },
    include: {
      brand: true
    }
  })

  console.log(`[Worker] Found ${duePosts.length} posts due for publication`)

  for (const post of duePosts) {
    try {
      console.log(`[Worker] Publishing post ${post.id} for ${post.brand.handle}`)

      // Create SNS client
      const client = createSNSClient(
        post.platform,
        post.brand.accessToken,
        post.brand.handle
      )

      // Extract media URLs from mediaPlan
      const mediaUrls = post.mediaPlan?.urls || []

      // Combine caption and hashtags
      const fullCaption = post.caption + '\n\n' + post.hashtags.map(tag => `#${tag}`).join(' ')

      // Publish the post
      const result = await client.publish(fullCaption, mediaUrls)

      if (result.success) {
        // Update post as published with stats
        await prisma.postDraft.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: now,
            resultStats: result.stats || {}
          }
        })

        console.log(`[Worker] ✓ Post ${post.id} published successfully`)
        console.log(`[Worker]   URL: ${result.url}`)
      } else {
        // Mark as failed
        await prisma.postDraft.update({
          where: { id: post.id },
          data: {
            status: 'FAILED',
            errorLog: result.error || 'Unknown error'
          }
        })

        console.error(`[Worker] ✗ Post ${post.id} failed: ${result.error}`)
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await prisma.postDraft.update({
        where: { id: post.id },
        data: {
          status: 'FAILED',
          errorLog: errorMessage
        }
      })

      console.error(`[Worker] ✗ Post ${post.id} encountered error:`, error)
    }

    // Small delay between posts to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log(`[Worker] Completed processing ${duePosts.length} posts`)
}

async function updatePublishedPostsStats() {
  console.log('[Worker] Updating stats for recently published posts')

  const recentPosts = await prisma.postDraft.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    include: {
      brand: true
    },
    take: 20
  })

  console.log(`[Worker] Updating stats for ${recentPosts.length} recent posts`)

  for (const post of recentPosts) {
    try {
      const client = createSNSClient(
        post.platform,
        post.brand.accessToken,
        post.brand.handle
      )

      // Get updated stats (this is dummy data for now)
      const stats = await client.getStats(post.id)

      await prisma.postDraft.update({
        where: { id: post.id },
        data: {
          resultStats: stats
        }
      })

      console.log(`[Worker] Updated stats for post ${post.id}`)
    } catch (error) {
      console.error(`[Worker] Failed to update stats for post ${post.id}:`, error)
    }
  }
}

async function main() {
  try {
    await processScheduledPosts()
    await updatePublishedPostsStats()
  } catch (error) {
    console.error('[Worker] Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the worker
main()
