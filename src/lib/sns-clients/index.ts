import { Platform } from '@prisma/client'
import { SNSClient } from './base'
import { InstagramClient } from './instagram'
import { ThreadsClient } from './threads'
import { NoteClient } from './note'
import { decrypt } from '../encryption'

export * from './base'

/**
 * Factory function to create the appropriate SNS client
 */
export function createSNSClient(
  platform: Platform,
  encryptedAccessToken: string,
  handle: string
): SNSClient {
  const accessToken = decrypt(encryptedAccessToken)

  switch (platform) {
    case 'INSTAGRAM':
      return new InstagramClient(accessToken, handle)
    case 'THREADS':
      return new ThreadsClient(accessToken, handle)
    case 'NOTE':
      return new NoteClient(accessToken, handle)
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}
