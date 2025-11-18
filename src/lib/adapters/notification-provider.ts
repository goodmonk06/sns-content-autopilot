/**
 * Notification Provider Adapter Interface
 *
 * Abstract interface for sending notifications via different channels
 * (Email, Slack, Discord, webhooks, etc.)
 */

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationOptions {
  title: string
  message: string
  priority?: NotificationPriority
  data?: Record<string, any>
  recipients?: string[]
  channel?: string
}

export interface INotificationProvider {
  /**
   * Send a notification
   */
  send(options: NotificationOptions): Promise<void>

  /**
   * Send a batch of notifications
   */
  sendBatch(notifications: NotificationOptions[]): Promise<void>

  /**
   * Get provider name
   */
  getProviderName(): string
}

/**
 * Console Logger Provider (for development)
 */
export class ConsoleNotificationProvider implements INotificationProvider {
  async send(options: NotificationOptions): Promise<void> {
    const icon = this.getIcon(options.priority || NotificationPriority.NORMAL)
    console.log(`\n${icon} [Notification] ${options.title}`)
    console.log(`   ${options.message}`)
    if (options.data) {
      console.log('   Data:', options.data)
    }
    console.log('')
  }

  async sendBatch(notifications: NotificationOptions[]): Promise<void> {
    for (const notification of notifications) {
      await this.send(notification)
    }
  }

  getProviderName(): string {
    return 'console'
  }

  private getIcon(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
        return '🚨'
      case NotificationPriority.HIGH:
        return '⚠️'
      case NotificationPriority.NORMAL:
        return '📢'
      case NotificationPriority.LOW:
        return 'ℹ️'
    }
  }
}

/**
 * Email Provider (stub for SendGrid, AWS SES, etc.)
 */
export class EmailNotificationProvider implements INotificationProvider {
  constructor(
    private config: {
      from: string
      apiKey: string
      defaultRecipients: string[]
    }
  ) {}

  async send(options: NotificationOptions): Promise<void> {
    const recipients = options.recipients || this.config.defaultRecipients

    console.log(`[EmailNotificationProvider] Sending to: ${recipients.join(', ')}`)
    console.log(`Subject: ${options.title}`)
    console.log(`Body: ${options.message}`)

    // TODO: Implement actual email sending
    // Example with SendGrid:
    // await sendgrid.send({
    //   to: recipients,
    //   from: this.config.from,
    //   subject: options.title,
    //   text: options.message,
    //   html: this.formatAsHtml(options),
    // })
  }

  async sendBatch(notifications: NotificationOptions[]): Promise<void> {
    // TODO: Use batch API if available
    for (const notification of notifications) {
      await this.send(notification)
    }
  }

  getProviderName(): string {
    return 'email'
  }
}

/**
 * Slack Provider
 */
export class SlackNotificationProvider implements INotificationProvider {
  constructor(
    private config: {
      webhookUrl: string
      defaultChannel?: string
    }
  ) {}

  async send(options: NotificationOptions): Promise<void> {
    const channel = options.channel || this.config.defaultChannel

    console.log(`[SlackNotificationProvider] Sending to channel: ${channel}`)

    const payload = {
      channel,
      text: options.title,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: options.title,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: options.message,
          },
        },
      ],
    }

    // TODO: Implement actual Slack webhook call
    // await fetch(this.config.webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // })
  }

  async sendBatch(notifications: NotificationOptions[]): Promise<void> {
    for (const notification of notifications) {
      await this.send(notification)
    }
  }

  getProviderName(): string {
    return 'slack'
  }
}

/**
 * Webhook Provider (for custom integrations)
 */
export class WebhookNotificationProvider implements INotificationProvider {
  constructor(
    private config: {
      url: string
      headers?: Record<string, string>
      secret?: string
    }
  ) {}

  async send(options: NotificationOptions): Promise<void> {
    console.log(`[WebhookNotificationProvider] Posting to: ${this.config.url}`)

    const payload = {
      title: options.title,
      message: options.message,
      priority: options.priority,
      timestamp: new Date().toISOString(),
      data: options.data,
    }

    // TODO: Implement actual webhook call
    // await fetch(this.config.url, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     ...this.config.headers,
    //   },
    //   body: JSON.stringify(payload),
    // })
  }

  async sendBatch(notifications: NotificationOptions[]): Promise<void> {
    const payload = {
      notifications,
      timestamp: new Date().toISOString(),
    }

    // TODO: Send batch in single request
    console.log(
      `[WebhookNotificationProvider] Sending ${notifications.length} notifications`
    )
  }

  getProviderName(): string {
    return 'webhook'
  }
}

/**
 * Multi-channel provider (sends to multiple providers)
 */
export class MultiChannelNotificationProvider implements INotificationProvider {
  constructor(private providers: INotificationProvider[]) {}

  async send(options: NotificationOptions): Promise<void> {
    await Promise.all(
      this.providers.map((provider) => provider.send(options))
    )
  }

  async sendBatch(notifications: NotificationOptions[]): Promise<void> {
    await Promise.all(
      this.providers.map((provider) => provider.sendBatch(notifications))
    )
  }

  getProviderName(): string {
    return `multi-channel (${this.providers.map((p) => p.getProviderName()).join(', ')})`
  }
}
