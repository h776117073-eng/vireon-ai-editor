import type { ErrorCode, ErrorSeverity, RecoveryStrategy, RenderError } from './types'

const errorMetadata: Record<
  ErrorCode,
  {
    severity: ErrorSeverity
    recovery: RecoveryStrategy
    retriable: boolean
    description: string
  }
> = {
  // FFmpeg errors
  FFMPEG_NOT_FOUND: {
    severity: 'critical',
    recovery: 'manual_intervention',
    retriable: false,
    description: 'FFmpeg executable not found in system PATH',
  },
  FFMPEG_EXECUTION_FAILED: {
    severity: 'error',
    recovery: 'retry',
    retriable: true,
    description: 'FFmpeg process execution failed',
  },
  FFMPEG_TIMEOUT: {
    severity: 'error',
    recovery: 'retry',
    retriable: true,
    description: 'FFmpeg process exceeded timeout duration',
  },
  INVALID_CODEC: {
    severity: 'error',
    recovery: 'fallback',
    retriable: false,
    description: 'Requested codec is not available',
  },

  // Queue errors
  QUEUE_FULL: {
    severity: 'warning',
    recovery: 'retry',
    retriable: true,
    description: 'Job queue is full',
  },
  JOB_NOT_FOUND: {
    severity: 'error',
    recovery: 'manual_intervention',
    retriable: false,
    description: 'Job ID does not exist in queue',
  },
  JOB_ALREADY_RUNNING: {
    severity: 'warning',
    recovery: 'cancel',
    retriable: false,
    description: 'Job is already processing',
  },

  // Resource errors
  INSUFFICIENT_MEMORY: {
    severity: 'error',
    recovery: 'retry',
    retriable: true,
    description: 'Insufficient system memory available',
  },
  INSUFFICIENT_DISK_SPACE: {
    severity: 'error',
    recovery: 'partial_retry',
    retriable: true,
    description: 'Insufficient disk space for operation',
  },
  MAX_PROCESSES_EXCEEDED: {
    severity: 'warning',
    recovery: 'retry',
    retriable: true,
    description: 'Maximum concurrent FFmpeg processes reached',
  },

  // Cache errors
  CACHE_WRITE_FAILED: {
    severity: 'error',
    recovery: 'retry',
    retriable: true,
    description: 'Failed to write file to cache',
  },
  CACHE_READ_FAILED: {
    severity: 'error',
    recovery: 'partial_retry',
    retriable: true,
    description: 'Failed to read file from cache',
  },

  // Input validation
  INVALID_INPUT_FILE: {
    severity: 'error',
    recovery: 'manual_intervention',
    retriable: false,
    description: 'Input file is missing or inaccessible',
  },
  INVALID_OUTPUT_PATH: {
    severity: 'error',
    recovery: 'manual_intervention',
    retriable: false,
    description: 'Output path is invalid or not writable',
  },
  INVALID_PARAMETERS: {
    severity: 'error',
    recovery: 'manual_intervention',
    retriable: false,
    description: 'Job parameters are invalid',
  },

  // System errors
  SYSTEM_ERROR: {
    severity: 'critical',
    recovery: 'manual_intervention',
    retriable: false,
    description: 'System-level error occurred',
  },
  UNKNOWN_ERROR: {
    severity: 'error',
    recovery: 'manual_intervention',
    retriable: false,
    description: 'Unknown error occurred',
  },
}

export class RenderEngineError extends Error {
  code: ErrorCode
  severity: ErrorSeverity
  recovery: RecoveryStrategy
  context?: Record<string, any>
  retriable: boolean
  timestamp: number

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, any>
  ) {
    const metadata = errorMetadata[code] || errorMetadata.UNKNOWN_ERROR
    super(message)
    this.name = 'RenderEngineError'
    this.code = code
    this.severity = metadata.severity
    this.recovery = metadata.recovery
    this.retriable = metadata.retriable
    this.context = context
    this.timestamp = Date.now()
  }

  toJSON(): RenderError {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      recovery: this.recovery,
      context: this.context,
      timestamp: this.timestamp,
    }
  }

  static isRetriable(code: ErrorCode): boolean {
    const metadata = errorMetadata[code]
    return metadata?.retriable ?? false
  }

  static fromError(error: unknown): RenderEngineError {
    if (error instanceof RenderEngineError) {
      return error
    }

    if (error instanceof Error) {
      return new RenderEngineError(
        'SYSTEM_ERROR',
        error.message,
        { originalError: error.name }
      )
    }

    return new RenderEngineError(
      'UNKNOWN_ERROR',
      String(error)
    )
  }
}

export class FFmpegError extends RenderEngineError {
  constructor(message: string, context?: Record<string, any>) {
    super('FFMPEG_EXECUTION_FAILED', message, context)
    this.name = 'FFmpegError'
  }
}

export class QueueError extends RenderEngineError {
  constructor(code: ErrorCode, message: string, context?: Record<string, any>) {
    super(code, message, context)
    this.name = 'QueueError'
  }
}

export class ResourceError extends RenderEngineError {
  constructor(code: ErrorCode, message: string, context?: Record<string, any>) {
    super(code, message, context)
    this.name = 'ResourceError'
  }
}

export class CacheError extends RenderEngineError {
  constructor(code: ErrorCode, message: string, context?: Record<string, any>) {
    super(code, message, context)
    this.name = 'CacheError'
  }
}

export function createRenderError(
  code: ErrorCode,
  message: string,
  context?: Record<string, any>
): RenderError {
  const metadata = errorMetadata[code] || errorMetadata.UNKNOWN_ERROR
  return {
    code,
    message,
    severity: metadata.severity,
    recovery: metadata.recovery,
    context,
    timestamp: Date.now(),
  }
}

export function getErrorDescription(code: ErrorCode): string {
  return errorMetadata[code]?.description || 'Unknown error'
}

export function shouldRetry(code: ErrorCode, attempt: number, maxRetries: number): boolean {
  if (attempt >= maxRetries) return false
  return RenderEngineError.isRetriable(code)
}
