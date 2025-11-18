/**
 * Content Generator Adapter Interface
 *
 * Abstract interface for AI content generation providers
 * This allows swapping between OpenAI, Anthropic, local models, etc.
 */

import { Platform } from '@prisma/client'
import { ToneProfile, GeneratedIdea, GeneratedDraft } from '../llm'

export interface IContentGenerator {
  /**
   * Generate content ideas from a theme
   */
  generateIdeas(
    theme: string,
    platform: Platform,
    toneProfile: ToneProfile,
    count: number
  ): Promise<GeneratedIdea[]>

  /**
   * Generate a post draft from an idea
   */
  generateDraft(
    idea: GeneratedIdea,
    platform: Platform,
    toneProfile: ToneProfile
  ): Promise<GeneratedDraft>

  /**
   * Generate hashtags for given content
   */
  generateHashtags(
    content: string,
    platform: Platform,
    count: number
  ): Promise<string[]>

  /**
   * Get provider name
   */
  getProviderName(): string
}

/**
 * OpenAI GPT-4 Provider (wraps existing implementation)
 */
export class OpenAIContentGenerator implements IContentGenerator {
  constructor(private apiKey: string) {}

  async generateIdeas(
    theme: string,
    platform: Platform,
    toneProfile: ToneProfile,
    count: number
  ): Promise<GeneratedIdea[]> {
    // This would use the existing implementation in src/lib/llm.ts
    const { generateContentIdeas } = await import('../llm')
    return generateContentIdeas(theme, platform, toneProfile, count)
  }

  async generateDraft(
    idea: GeneratedIdea,
    platform: Platform,
    toneProfile: ToneProfile
  ): Promise<GeneratedDraft> {
    const { generatePostDraft } = await import('../llm')
    return generatePostDraft(idea, platform, toneProfile)
  }

  async generateHashtags(
    content: string,
    platform: Platform,
    count: number
  ): Promise<string[]> {
    // Simplified hashtag generation (could be expanded)
    return []
  }

  getProviderName(): string {
    return 'openai-gpt4'
  }
}

/**
 * Anthropic Claude Provider (stub)
 */
export class AnthropicContentGenerator implements IContentGenerator {
  constructor(private apiKey: string) {}

  async generateIdeas(
    theme: string,
    platform: Platform,
    toneProfile: ToneProfile,
    count: number
  ): Promise<GeneratedIdea[]> {
    console.log(`[AnthropicContentGenerator] Would generate ${count} ideas for: ${theme}`)

    // TODO: Implement actual Anthropic API call
    // For now, return stub data
    return Array.from({ length: count }, (_, i) => ({
      theme: `${theme} - Variation ${i + 1}`,
      hook: `Hook for ${theme}`,
      outline: `Outline for ${theme}`
    }))
  }

  async generateDraft(
    idea: GeneratedIdea,
    platform: Platform,
    toneProfile: ToneProfile
  ): Promise<GeneratedDraft> {
    console.log(`[AnthropicContentGenerator] Would generate draft for: ${idea.theme}`)

    // TODO: Implement actual Anthropic API call
    return {
      caption: `Draft content for ${idea.theme}`,
      hashtags: ['hashtag1', 'hashtag2'],
      mediaPlan: {
        type: 'image',
        count: 1,
        description: 'Media plan',
        suggestions: []
      }
    }
  }

  async generateHashtags(
    content: string,
    platform: Platform,
    count: number
  ): Promise<string[]> {
    return []
  }

  getProviderName(): string {
    return 'anthropic-claude'
  }
}

/**
 * Local Model Provider (for self-hosted models)
 */
export class LocalModelContentGenerator implements IContentGenerator {
  constructor(
    private config: {
      endpoint: string
      model: string
    }
  ) {}

  async generateIdeas(
    theme: string,
    platform: Platform,
    toneProfile: ToneProfile,
    count: number
  ): Promise<GeneratedIdea[]> {
    console.log(`[LocalModelContentGenerator] Calling ${this.config.endpoint}`)

    // TODO: Implement actual local model API call
    return []
  }

  async generateDraft(
    idea: GeneratedIdea,
    platform: Platform,
    toneProfile: ToneProfile
  ): Promise<GeneratedDraft> {
    console.log(`[LocalModelContentGenerator] Generating draft via local model`)

    // TODO: Implement actual local model API call
    return {
      caption: '',
      hashtags: [],
      mediaPlan: {
        type: 'image',
        count: 1,
        description: '',
        suggestions: []
      }
    }
  }

  async generateHashtags(
    content: string,
    platform: Platform,
    count: number
  ): Promise<string[]> {
    return []
  }

  getProviderName(): string {
    return 'local-model'
  }
}
