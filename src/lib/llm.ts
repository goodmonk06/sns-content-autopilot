import OpenAI from 'openai'
import { Platform } from '@prisma/client'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ToneProfile {
  voice?: string
  style?: string
  emojis?: boolean
  hashtagCount?: number
  targetAudience?: string
  longForm?: boolean
  maxLength?: number
}

export interface GeneratedIdea {
  theme: string
  hook: string
  outline: string
}

export interface GeneratedDraft {
  caption: string
  hashtags: string[]
  mediaPlan: {
    type: 'image' | 'video' | 'carousel'
    count: number
    description: string
    suggestions: string[]
  }
}

/**
 * Generate multiple content ideas based on a theme
 */
export async function generateContentIdeas(
  theme: string,
  platform: Platform,
  toneProfile: ToneProfile,
  count: number = 3
): Promise<GeneratedIdea[]> {
  const platformGuidelines = getPlatformGuidelines(platform)

  const prompt = `You are an expert social media content strategist for ${platform}.

Brand Tone Profile:
- Voice: ${toneProfile.voice || 'professional'}
- Style: ${toneProfile.style || 'informative'}
- Target Audience: ${toneProfile.targetAudience || 'general audience'}
- Use Emojis: ${toneProfile.emojis ? 'Yes' : 'No'}

Platform Guidelines:
${platformGuidelines}

Theme: "${theme}"

Generate ${count} unique content ideas for this theme. Each idea should include:
1. A refined theme/topic
2. An attention-grabbing hook (first sentence)
3. A detailed outline (bullet points)

Return ONLY a valid JSON array with this structure:
[
  {
    "theme": "specific topic",
    "hook": "compelling opening line",
    "outline": "- Point 1\\n- Point 2\\n- Point 3"
  }
]`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: 'You are a creative social media strategist. Always return valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' }
  })

  const content = response.choices[0].message.content || '{}'
  const parsed = JSON.parse(content)

  // Handle both array and object with 'ideas' key
  const ideas = Array.isArray(parsed) ? parsed : (parsed.ideas || [])

  return ideas.slice(0, count)
}

/**
 * Generate a post draft from a content idea
 */
export async function generatePostDraft(
  idea: GeneratedIdea,
  platform: Platform,
  toneProfile: ToneProfile
): Promise<GeneratedDraft> {
  const platformGuidelines = getPlatformGuidelines(platform)
  const maxLength = getMaxLength(platform, toneProfile)

  const prompt = `You are an expert ${platform} content creator.

Brand Tone Profile:
- Voice: ${toneProfile.voice || 'professional'}
- Style: ${toneProfile.style || 'informative'}
- Target Audience: ${toneProfile.targetAudience || 'general audience'}
- Use Emojis: ${toneProfile.emojis ? 'Yes' : 'No'}
${toneProfile.hashtagCount ? `- Target Hashtags: ${toneProfile.hashtagCount}` : ''}

Platform Guidelines:
${platformGuidelines}
Maximum Length: ${maxLength} characters

Content Idea:
Theme: ${idea.theme}
Hook: ${idea.hook}
Outline: ${idea.outline}

Create a complete ${platform} post with:
1. Engaging caption (under ${maxLength} characters)
2. Strategic hashtags (${toneProfile.hashtagCount || 10} hashtags)
3. Media plan (type, count, description, visual suggestions)

Return ONLY valid JSON:
{
  "caption": "full post text",
  "hashtags": ["tag1", "tag2"],
  "mediaPlan": {
    "type": "image|video|carousel",
    "count": 1,
    "description": "overall visual concept",
    "suggestions": ["specific visual idea 1", "specific visual idea 2"]
  }
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: 'You are an expert social media content creator. Always return valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const content = response.choices[0].message.content || '{}'
  return JSON.parse(content)
}

/**
 * Get platform-specific guidelines
 */
function getPlatformGuidelines(platform: Platform): string {
  switch (platform) {
    case 'INSTAGRAM':
      return `- Visual-first platform
- Carousel posts perform well
- Story-driven captions
- Strong hashtag strategy
- Authentic, aesthetic content`

    case 'THREADS':
      return `- Text-focused, conversational
- Keep it authentic and timely
- Shorter, punchy content
- Encourage discussion
- Less formal than Twitter/X`

    case 'NOTE':
      return `- Long-form storytelling
- Deep, thoughtful content
- Professional but personal
- Focus on value and insights
- Minimal hashtags`

    default:
      return '- Engaging, authentic content'
  }
}

/**
 * Get maximum character length for platform
 */
function getMaxLength(platform: Platform, toneProfile: ToneProfile): number {
  if (toneProfile.maxLength) return toneProfile.maxLength

  switch (platform) {
    case 'INSTAGRAM':
      return 2200
    case 'THREADS':
      return 500
    case 'NOTE':
      return 5000
    default:
      return 1000
  }
}
