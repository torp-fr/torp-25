/**
 * Document Upload Service
 * Handles file uploads to AWS S3
 */

import { S3 } from 'aws-sdk'
import { config } from '@/config'
import type { FileType } from '@/types'

const s3 = new S3({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
})

interface UploadOptions {
  userId: string
  file: File
  folder?: string
}

interface UploadResult {
  fileUrl: string
  fileName: string
  fileSize: number
  fileType: FileType
}

export class DocumentUploadService {
  private readonly bucketName = config.aws.s3.bucketName
  private readonly maxFileSize = config.limits.maxFileSize

  /**
   * Upload a document to S3
   */
  async upload({ userId, file, folder = 'documents' }: UploadOptions): Promise<UploadResult> {
    // Validate file
    this.validateFile(file)

    // Generate unique file name
    const fileName = this.generateFileName(file.name)
    const key = `${folder}/${userId}/${fileName}`

    // Convert File to Buffer for Node.js
    const buffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(buffer)

    // Upload to S3
    const uploadParams: S3.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: file.type,
      Metadata: {
        userId,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    }

    await s3.upload(uploadParams).promise()

    // Generate public URL
    const fileUrl = `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`

    return {
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: this.getFileType(file.name),
    }
  }

  /**
   * Delete a document from S3
   */
  async delete(fileUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(fileUrl)

    await s3
      .deleteObject({
        Bucket: this.bucketName,
        Key: key,
      })
      .promise()
  }

  /**
   * Get signed URL for temporary access
   */
  async getSignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    const key = this.extractKeyFromUrl(fileUrl)

    return s3.getSignedUrlPromise('getObject', {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn,
    })
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
      )
    }

    // Check file type
    const fileType = this.getFileType(file.name)
    const allowedTypes: FileType[] = ['pdf', 'jpg', 'png', 'docx']

    if (!allowedTypes.includes(fileType)) {
      throw new Error(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      )
    }
  }

  /**
   * Generate unique file name
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const extension = originalName.split('.').pop()
    return `${timestamp}-${random}.${extension}`
  }

  /**
   * Get file type from file name
   */
  private getFileType(fileName: string): FileType {
    const extension = fileName.split('.').pop()?.toLowerCase()

    switch (extension) {
      case 'pdf':
        return 'pdf'
      case 'jpg':
      case 'jpeg':
        return 'jpg'
      case 'png':
        return 'png'
      case 'docx':
        return 'docx'
      default:
        throw new Error(`Unsupported file extension: ${extension}`)
    }
  }

  /**
   * Extract S3 key from full URL
   */
  private extractKeyFromUrl(url: string): string {
    const urlParts = url.split('.amazonaws.com/')
    return urlParts[1] || ''
  }
}

export const documentUploadService = new DocumentUploadService()
