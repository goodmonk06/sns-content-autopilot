/**
 * Media Provider Adapter Interface
 *
 * Abstract interface for media storage providers (S3, Cloudinary, local storage, etc.)
 * This allows swapping storage backends without changing application logic.
 */

export interface MediaUploadOptions {
  filename: string
  buffer: Buffer
  mimeType: string
  folder?: string
  tags?: string[]
  metadata?: Record<string, any>
}

export interface MediaUploadResult {
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  size: number
  publicId?: string
}

export interface MediaDeleteOptions {
  url: string
  publicId?: string
}

export interface IMediaProvider {
  /**
   * Upload a media file
   */
  upload(options: MediaUploadOptions): Promise<MediaUploadResult>

  /**
   * Delete a media file
   */
  delete(options: MediaDeleteOptions): Promise<void>

  /**
   * Generate a signed URL for temporary access
   */
  getSignedUrl(url: string, expiresIn?: number): Promise<string>

  /**
   * Get provider name
   */
  getProviderName(): string
}

/**
 * Local File System Provider (for development)
 */
export class LocalMediaProvider implements IMediaProvider {
  constructor(private basePath: string = '/uploads') {}

  async upload(options: MediaUploadOptions): Promise<MediaUploadResult> {
    // In a real implementation, save to local file system
    const url = `${this.basePath}/${options.folder || 'default'}/${options.filename}`

    console.log(`[LocalMediaProvider] Uploading ${options.filename} to ${url}`)

    return {
      url,
      size: options.buffer.length,
      thumbnailUrl: `${url}-thumb`,
    }
  }

  async delete(options: MediaDeleteOptions): Promise<void> {
    console.log(`[LocalMediaProvider] Deleting ${options.url}`)
  }

  async getSignedUrl(url: string, expiresIn: number = 3600): Promise<string> {
    // Local files don't need signed URLs
    return url
  }

  getProviderName(): string {
    return 'local'
  }
}

/**
 * S3-Compatible Provider (stub for AWS S3, MinIO, etc.)
 */
export class S3MediaProvider implements IMediaProvider {
  constructor(
    private config: {
      bucket: string
      region: string
      accessKeyId: string
      secretAccessKey: string
      endpoint?: string
    }
  ) {}

  async upload(options: MediaUploadOptions): Promise<MediaUploadResult> {
    // TODO: Implement actual S3 upload using AWS SDK
    console.log(`[S3MediaProvider] Would upload to bucket: ${this.config.bucket}`)

    const key = `${options.folder || 'media'}/${Date.now()}-${options.filename}`
    const url = this.config.endpoint
      ? `${this.config.endpoint}/${this.config.bucket}/${key}`
      : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`

    return {
      url,
      size: options.buffer.length,
      publicId: key,
    }
  }

  async delete(options: MediaDeleteOptions): Promise<void> {
    // TODO: Implement actual S3 delete
    console.log(`[S3MediaProvider] Would delete: ${options.publicId || options.url}`)
  }

  async getSignedUrl(url: string, expiresIn: number = 3600): Promise<string> {
    // TODO: Generate actual S3 signed URL
    return `${url}?expires=${Date.now() + expiresIn * 1000}`
  }

  getProviderName(): string {
    return 's3'
  }
}

/**
 * Cloudinary Provider (stub)
 */
export class CloudinaryMediaProvider implements IMediaProvider {
  constructor(
    private config: {
      cloudName: string
      apiKey: string
      apiSecret: string
    }
  ) {}

  async upload(options: MediaUploadOptions): Promise<MediaUploadResult> {
    // TODO: Implement actual Cloudinary upload
    console.log(`[CloudinaryMediaProvider] Would upload to cloud: ${this.config.cloudName}`)

    const publicId = `${Date.now()}-${options.filename.replace(/\.[^/.]+$/, '')}`
    const url = `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${publicId}`

    return {
      url,
      thumbnailUrl: `${url.replace('/upload/', '/upload/c_thumb,w_200,h_200/')}`,
      size: options.buffer.length,
      publicId,
    }
  }

  async delete(options: MediaDeleteOptions): Promise<void> {
    // TODO: Implement actual Cloudinary delete
    console.log(`[CloudinaryMediaProvider] Would delete: ${options.publicId}`)
  }

  async getSignedUrl(url: string, expiresIn: number = 3600): Promise<string> {
    // Cloudinary URLs are already public, but can add transformation params
    return url
  }

  getProviderName(): string {
    return 'cloudinary'
  }
}
