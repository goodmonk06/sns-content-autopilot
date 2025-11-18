import { Platform } from '@prisma/client'

export interface PostResult {
  success: boolean
  postId?: string
  url?: string
  error?: string
  stats?: {
    likes: number
    comments: number
    shares: number
    reach: number
    impressions: number
  }
}

export interface SNSClient {
  publish(caption: string, mediaUrls: string[]): Promise<PostResult>
  getStats(postId: string): Promise<PostResult['stats']>
}

export abstract class BaseSNSClient implements SNSClient {
  constructor(
    protected accessToken: string,
    protected handle: string
  ) {}

  abstract publish(caption: string, mediaUrls: string[]): Promise<PostResult>
  abstract getStats(postId: string): Promise<PostResult['stats']>
}
