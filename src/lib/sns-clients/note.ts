import { BaseSNSClient, PostResult } from './base'

export class NoteClient extends BaseSNSClient {
  async publish(caption: string, mediaUrls: string[]): Promise<PostResult> {
    // TODO: Implement actual Note API integration
    console.log('[Note] Publishing article:', {
      handle: this.handle,
      contentLength: caption.length,
      mediaCount: mediaUrls.length,
      timestamp: new Date().toISOString()
    })

    await new Promise(resolve => setTimeout(resolve, 1000))

    const dummyPostId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      success: true,
      postId: dummyPostId,
      url: `https://note.com/${this.handle}/n/${dummyPostId}`,
      stats: {
        likes: Math.floor(Math.random() * 200) + 30,
        comments: Math.floor(Math.random() * 25) + 5,
        shares: 0, // Note doesn't have shares
        reach: Math.floor(Math.random() * 1000) + 200,
        impressions: Math.floor(Math.random() * 1500) + 400,
      }
    }
  }

  async getStats(postId: string): Promise<PostResult['stats']> {
    console.log('[Note] Fetching stats for:', postId)

    await new Promise(resolve => setTimeout(resolve, 500))

    return {
      likes: Math.floor(Math.random() * 200) + 30,
      comments: Math.floor(Math.random() * 25) + 5,
      shares: 0,
      reach: Math.floor(Math.random() * 1000) + 200,
      impressions: Math.floor(Math.random() * 1500) + 400,
    }
  }
}
