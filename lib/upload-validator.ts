/**
 * File Upload Validator
 * Validates file uploads for size, type, and security
 */

import { createLogger } from './logger'

const logger = createLogger('Upload Validator')

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_PDF_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_DOCUMENT_SIZE: 25 * 1024 * 1024, // 25 MB
} as const

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], category: 'image' },
  'image/png': { extensions: ['.png'], category: 'image' },
  'image/webp': { extensions: ['.webp'], category: 'image' },

  // Documents
  'application/pdf': { extensions: ['.pdf'], category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    category: 'document',
  },
  'application/msword': { extensions: ['.doc'], category: 'document' },

  // Text
  'text/plain': { extensions: ['.txt'], category: 'text' },
} as const

export type AllowedMimeType = keyof typeof ALLOWED_MIME_TYPES

export interface ValidationResult {
  valid: boolean
  error?: string
  file?: {
    name: string
    size: number
    type: string
    category: string
  }
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File): ValidationResult {
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'No file provided',
    }
  }

  // Check file name
  if (!file.name || file.name.length === 0) {
    return {
      valid: false,
      error: 'File name is empty',
    }
  }

  // Check for suspicious file names
  if (hasSuspiciousFileName(file.name)) {
    logger.warn('Suspicious file name detected', { fileName: file.name })
    return {
      valid: false,
      error: 'Invalid file name',
    }
  }

  // Check MIME type
  const mimeTypeInfo = ALLOWED_MIME_TYPES[file.type as AllowedMimeType]
  if (!mimeTypeInfo) {
    logger.warn('Unsupported file type', { type: file.type, name: file.name })
    return {
      valid: false,
      error: `File type not allowed: ${file.type}. Allowed types: PDF, DOCX, DOC, JPG, PNG, WEBP`,
    }
  }

  // Check file extension matches MIME type
  const fileExtension = getFileExtension(file.name)
  // Cast to readonly array for TypeScript compatibility
  const allowedExtensions = mimeTypeInfo.extensions as readonly string[]
  if (!allowedExtensions.includes(fileExtension)) {
    logger.warn('File extension does not match MIME type', {
      name: file.name,
      extension: fileExtension,
      mimeType: file.type,
      expectedExtensions: allowedExtensions,
    })
    return {
      valid: false,
      error: `File extension ${fileExtension} does not match file type ${file.type}`,
    }
  }

  // Check file size
  const sizeLimit = getSizeLimit(mimeTypeInfo.category)
  if (file.size > sizeLimit) {
    logger.warn('File size exceeds limit', {
      name: file.name,
      size: file.size,
      limit: sizeLimit,
    })
    return {
      valid: false,
      error: `File size exceeds limit. Maximum: ${formatBytes(sizeLimit)}, Actual: ${formatBytes(file.size)}`,
    }
  }

  // Check minimum file size (to detect empty or corrupted files)
  if (file.size < 100) {
    return {
      valid: false,
      error: 'File is too small or empty',
    }
  }

  return {
    valid: true,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      category: mimeTypeInfo.category,
    },
  }
}

/**
 * Check for suspicious file names
 */
function hasSuspiciousFileName(fileName: string): boolean {
  const suspiciousPatterns = [
    /\.\./g, // Path traversal
    /[<>:"|?*]/g, // Invalid characters
    /^\./, // Hidden files
    /\.(exe|bat|cmd|sh|ps1|vbs|js|jar|app)$/i, // Executable files
    /\x00/, // Null bytes
  ]

  return suspiciousPatterns.some((pattern) => pattern.test(fileName))
}

/**
 * Get file extension from file name
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1) return ''
  return fileName.substring(lastDot).toLowerCase()
}

/**
 * Get size limit based on file category
 */
function getSizeLimit(category: string): number {
  switch (category) {
    case 'image':
      return FILE_SIZE_LIMITS.MAX_IMAGE_SIZE
    case 'document':
      return FILE_SIZE_LIMITS.MAX_DOCUMENT_SIZE
    case 'text':
      return FILE_SIZE_LIMITS.MAX_DOCUMENT_SIZE
    default:
      return FILE_SIZE_LIMITS.MAX_FILE_SIZE
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Validate multiple files
 */
export function validateMultipleFiles(
  files: File[],
  maxFiles: number = 10
): ValidationResult {
  if (files.length === 0) {
    return {
      valid: false,
      error: 'No files provided',
    }
  }

  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Too many files. Maximum: ${maxFiles}, Actual: ${files.length}`,
    }
  }

  for (const file of files) {
    const result = validateFileUpload(file)
    if (!result.valid) {
      return result
    }
  }

  return { valid: true }
}
