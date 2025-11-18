/**
 * Plugin Registry System
 *
 * Central registry for managing pluggable providers and adapters
 */

import { IMediaProvider, LocalMediaProvider } from './adapters/media-provider'
import { IContentGenerator, OpenAIContentGenerator } from './adapters/content-generator'
import { IAnalyticsProvider, SimulatedAnalyticsProvider } from './adapters/analytics-provider'
import { INotificationProvider, ConsoleNotificationProvider } from './adapters/notification-provider'

export class PluginRegistry {
  private mediaProvider: IMediaProvider
  private contentGenerator: IContentGenerator
  private analyticsProvider: IAnalyticsProvider
  private notificationProvider: INotificationProvider

  constructor() {
    // Initialize with default providers
    this.mediaProvider = new LocalMediaProvider()
    this.contentGenerator = new OpenAIContentGenerator(
      process.env.OPENAI_API_KEY || ''
    )
    this.analyticsProvider = new SimulatedAnalyticsProvider()
    this.notificationProvider = new ConsoleNotificationProvider()

    console.log('[PluginRegistry] Initialized with default providers')
  }

  /**
   * Get the current media provider
   */
  getMediaProvider(): IMediaProvider {
    return this.mediaProvider
  }

  /**
   * Set a custom media provider
   */
  setMediaProvider(provider: IMediaProvider): void {
    console.log(
      `[PluginRegistry] Switching media provider to: ${provider.getProviderName()}`
    )
    this.mediaProvider = provider
  }

  /**
   * Get the current content generator
   */
  getContentGenerator(): IContentGenerator {
    return this.contentGenerator
  }

  /**
   * Set a custom content generator
   */
  setContentGenerator(generator: IContentGenerator): void {
    console.log(
      `[PluginRegistry] Switching content generator to: ${generator.getProviderName()}`
    )
    this.contentGenerator = generator
  }

  /**
   * Get the current analytics provider
   */
  getAnalyticsProvider(): IAnalyticsProvider {
    return this.analyticsProvider
  }

  /**
   * Set a custom analytics provider
   */
  setAnalyticsProvider(provider: IAnalyticsProvider): void {
    console.log(
      `[PluginRegistry] Switching analytics provider to: ${provider.getProviderName()}`
    )
    this.analyticsProvider = provider
  }

  /**
   * Get the current notification provider
   */
  getNotificationProvider(): INotificationProvider {
    return this.notificationProvider
  }

  /**
   * Set a custom notification provider
   */
  setNotificationProvider(provider: INotificationProvider): void {
    console.log(
      `[PluginRegistry] Switching notification provider to: ${provider.getProviderName()}`
    )
    this.notificationProvider = provider
  }

  /**
   * Get status of all providers
   */
  getStatus() {
    return {
      mediaProvider: this.mediaProvider.getProviderName(),
      contentGenerator: this.contentGenerator.getProviderName(),
      analyticsProvider: this.analyticsProvider.getProviderName(),
      notificationProvider: this.notificationProvider.getProviderName(),
    }
  }
}

// Global singleton registry
export const pluginRegistry = new PluginRegistry()
