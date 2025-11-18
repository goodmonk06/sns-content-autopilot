/**
 * Domain Events System
 *
 * Type-safe event system for domain-level events that can trigger
 * side effects across the application.
 */

import { Platform, PostStatus, CampaignStatus } from '@prisma/client'

export enum DomainEventType {
  // Content Events
  IDEA_CREATED = 'idea.created',
  IDEA_APPROVED = 'idea.approved',
  IDEA_ARCHIVED = 'idea.archived',

  // Post Events
  DRAFT_CREATED = 'draft.created',
  DRAFT_SCHEDULED = 'draft.scheduled',
  POST_PUBLISHED = 'post.published',
  POST_FAILED = 'post.failed',

  // Campaign Events
  CAMPAIGN_CREATED = 'campaign.created',
  CAMPAIGN_STARTED = 'campaign.started',
  CAMPAIGN_COMPLETED = 'campaign.completed',

  // Performance Events
  METRICS_UPDATED = 'metrics.updated',
  HIGH_ENGAGEMENT = 'high_engagement.detected',

  // Template Events
  TEMPLATE_CREATED = 'template.created',
  TEMPLATE_USED = 'template.used',
}

export interface BaseDomainEvent {
  type: DomainEventType
  timestamp: Date
  metadata?: Record<string, any>
}

export interface IdeaCreatedEvent extends BaseDomainEvent {
  type: DomainEventType.IDEA_CREATED
  data: {
    ideaId: string
    brandId: string
    theme: string
    platform: Platform
  }
}

export interface IdeaApprovedEvent extends BaseDomainEvent {
  type: DomainEventType.IDEA_APPROVED
  data: {
    ideaId: string
    brandId: string
    approvedBy?: string
  }
}

export interface DraftCreatedEvent extends BaseDomainEvent {
  type: DomainEventType.DRAFT_CREATED
  data: {
    draftId: string
    brandId: string
    platform: Platform
    campaignId?: string
    templateId?: string
  }
}

export interface DraftScheduledEvent extends BaseDomainEvent {
  type: DomainEventType.DRAFT_SCHEDULED
  data: {
    draftId: string
    brandId: string
    scheduledAt: Date
    platform: Platform
  }
}

export interface PostPublishedEvent extends BaseDomainEvent {
  type: DomainEventType.POST_PUBLISHED
  data: {
    postId: string
    brandId: string
    platform: Platform
    campaignId?: string
    publishedAt: Date
    initialMetrics?: any
  }
}

export interface PostFailedEvent extends BaseDomainEvent {
  type: DomainEventType.POST_FAILED
  data: {
    postId: string
    brandId: string
    error: string
    attemptedAt: Date
  }
}

export interface CampaignCreatedEvent extends BaseDomainEvent {
  type: DomainEventType.CAMPAIGN_CREATED
  data: {
    campaignId: string
    brandId: string
    name: string
    startDate: Date
    endDate: Date
  }
}

export interface CampaignCompletedEvent extends BaseDomainEvent {
  type: DomainEventType.CAMPAIGN_COMPLETED
  data: {
    campaignId: string
    brandId: string
    finalMetrics: any
    completedAt: Date
  }
}

export interface MetricsUpdatedEvent extends BaseDomainEvent {
  type: DomainEventType.METRICS_UPDATED
  data: {
    postId: string
    brandId: string
    previousMetrics: any
    newMetrics: any
    growth: any
  }
}

export interface HighEngagementEvent extends BaseDomainEvent {
  type: DomainEventType.HIGH_ENGAGEMENT
  data: {
    postId: string
    brandId: string
    engagementRate: number
    threshold: number
    metrics: any
  }
}

export type DomainEvent =
  | IdeaCreatedEvent
  | IdeaApprovedEvent
  | DraftCreatedEvent
  | DraftScheduledEvent
  | PostPublishedEvent
  | PostFailedEvent
  | CampaignCreatedEvent
  | CampaignCompletedEvent
  | MetricsUpdatedEvent
  | HighEngagementEvent

export type DomainEventHandler<T extends DomainEvent = DomainEvent> = (
  event: T
) => Promise<void> | void

/**
 * Simple in-memory event bus
 * In production, this could be replaced with Redis pub/sub, RabbitMQ, etc.
 */
class EventBus {
  private handlers: Map<DomainEventType, DomainEventHandler[]> = new Map()

  /**
   * Register an event handler
   */
  on<T extends DomainEvent>(
    eventType: DomainEventType,
    handler: DomainEventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType) || []
    handlers.push(handler as DomainEventHandler)
    this.handlers.set(eventType, handlers)
  }

  /**
   * Unregister an event handler
   */
  off(eventType: DomainEventType, handler: DomainEventHandler): void {
    const handlers = this.handlers.get(eventType) || []
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  async emit(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || []

    console.log(`[EventBus] Emitting ${event.type} to ${handlers.length} handlers`)

    // Execute all handlers (could be made parallel with Promise.all)
    for (const handler of handlers) {
      try {
        await handler(event)
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${event.type}:`, error)
        // Continue executing other handlers even if one fails
      }
    }
  }

  /**
   * Get all registered event types
   */
  getRegisteredEvents(): DomainEventType[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearAll(): void {
    this.handlers.clear()
  }
}

// Global singleton event bus
export const eventBus = new EventBus()

/**
 * Helper function to create events with automatic timestamp
 */
export function createEvent<T extends DomainEvent>(
  type: T['type'],
  data: T['data'],
  metadata?: Record<string, any>
): T {
  return {
    type,
    data,
    timestamp: new Date(),
    metadata,
  } as T
}
