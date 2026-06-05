import type { EditorTask } from '../../../types/editorCommands'

// ===== Job Status & Lifecycle =====
export type JobStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type JobPriority = 'critical' | 'high' | 'normal' | 'low'
export type LifecycleState = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'

// ===== Error Handling =====
export enum ErrorCode {
  // FFmpeg errors
  FFMPEG_NOT_FOUND = 'FFMPEG_NOT_FOUND',
  FFMPEG_EXECUTION_FAILED = 'FFMPEG_EXECUTION_FAILED',
  FFMPEG_TIMEOUT = 'FFMPEG_TIMEOUT',
  INVALID_CODEC = 'INVALID_CODEC',

  // Queue errors
  QUEUE_FULL = 'QUEUE_FULL',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_ALREADY_RUNNING = 'JOB_ALREADY_RUNNING',

  // Resource errors
  INSUFFICIENT_MEMORY = 'INSUFFICIENT_MEMORY',
  INSUFFICIENT_DISK_SPACE = 'INSUFFICIENT_DISK_SPACE',
  MAX_PROCESSES_EXCEEDED = 'MAX_PROCESSES_EXCEEDED',

  // Cache errors
  CACHE_WRITE_FAILED = 'CACHE_WRITE_FAILED',
  CACHE_READ_FAILED = 'CACHE_READ_FAILED',

  // Input validation
  INVALID_INPUT_FILE = 'INVALID_INPUT_FILE',
  INVALID_OUTPUT_PATH = 'INVALID_OUTPUT_PATH',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',

  // System errors
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  PARTIAL_RETRY = 'partial_retry',
  FALLBACK = 'fallback',
  MANUAL_INTERVENTION = 'manual_intervention',
  CANCEL = 'cancel',
}

export type RenderError = {
  code: ErrorCode
  message: string
  severity: ErrorSeverity
  recovery: RecoveryStrategy
  context?: Record<string, any>
  timestamp: number
}

export type RenderTask = {
  type: string
  params?: Record<string, any>
  critical?: boolean
}

export type RenderJobBase = {
  id: string
  type: 'preview' | 'export' | 'ai_edit'
  inputPath: string
  outputPath: string
  status: JobStatus
  priority: JobPriority
  progress: number
  createdAt: number
  updatedAt: number
  startedAt?: number
  completedAt?: number
  metadata?: Record<string, any>
  tasks?: RenderTask[]
  error?: RenderError
  retryCount: number
  maxRetries: number
  resourceRequirements?: ResourceRequirements
}

export type PreviewJob = RenderJobBase & {
  type: 'preview'
  previewOptions?: {
    durationSeconds?: number
    width?: number
    height?: number
    fps?: number
  }
}

export type ExportJob = RenderJobBase & {
  type: 'export'
  exportOptions?: {
    format: 'mp4' | 'mov' | 'webm'
    width?: number
    height?: number
    bitrate?: string
    audioBitrate?: string
  }
}

export type AIEditJob = RenderJobBase & {
  type: 'ai_edit'
  tasks: EditorTask[]
  previewMode?: boolean
}

export type RenderJob = PreviewJob | ExportJob | AIEditJob

// ===== Resource Management =====
export type ResourceRequirements = {
  minMemoryMB?: number
  maxMemoryMB?: number
  estimatedDurationSeconds?: number
  diskSpaceRequiredMB?: number
  gpuRequired?: boolean
}

export type SystemResources = {
  totalMemoryMB: number
  availableMemoryMB: number
  cpuCount: number
  cpuUsagePercent: number
  diskSpaceAvailableMB: number
  timestamp: number
}

export type JobResources = {
  peakMemoryMB: number
  avgMemoryMB: number
  diskSpaceUsedMB: number
  processingTimeMs: number
}

// ===== Retry & Recovery =====
export type RetryPolicy = {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryableErrors: ErrorCode[]
}

export type DeadLetterEntry = {
  jobId: string
  job: RenderJob
  error: RenderError
  attemptedAt: number
  reason: string
}

// ===== Metrics & Telemetry =====
export type JobMetrics = {
  jobId: string
  type: 'preview' | 'export' | 'ai_edit'
  status: JobStatus
  queueWaitTimeMs: number
  processingTimeMs: number
  totalTimeMs: number
  resourcesUsed: JobResources
  success: boolean
  error?: RenderError
}

export type QueueMetrics = {
  totalJobs: number
  queuedJobs: number
  processingJobs: number
  completedJobs: number
  failedJobs: number
  cancelledJobs: number
  avgQueueWaitTimeMs: number
  avgProcessingTimeMs: number
}

// ===== Lifecycle Hooks =====
export type JobLifecycleHooks = {
  onPending?: (job: RenderJob) => void | Promise<void>
  onQueued?: (job: RenderJob) => void | Promise<void>
  onStart?: (job: RenderJob) => void | Promise<void>
  onProgress?: (job: RenderJob, progress: number) => void | Promise<void>
  onCompleted?: (job: RenderJob) => void | Promise<void>
  onError?: (job: RenderJob, error: RenderError) => void | Promise<void>
  onCancelled?: (job: RenderJob) => void | Promise<void>
  onRetry?: (job: RenderJob, attempt: number) => void | Promise<void>
}

// ===== Configuration =====
export type RenderEngineOptions = {
  concurrency?: number
  cacheDirectory?: string
  persistenceDirectory?: string
  maxQueueSize?: number
  maxRetries?: number
  retryBackoffMs?: number
  jobTimeoutMs?: number
  healthCheckIntervalMs?: number
  metricsEnabled?: boolean
  cacheTimeoutHours?: number
  maxMemoryMB?: number
  maxCacheSizeMB?: number
}

export type RenderEngineConfig = Required<RenderEngineOptions> & {
  retryPolicy: RetryPolicy
}

// ===== Cache =====
export type CacheEntry = {
  key: string
  filePath: string
  size: number
  createdAt: number
  accessedAt: number
  expiresAt: number
  hits: number
}

export type CacheStats = {
  totalSize: number
  entryCount: number
  hits: number
  misses: number
  hitRate: number
  oldestEntryAge: number
}

// ===== Events =====
export type JobEvent = {
  jobId: string
  status: JobStatus
  progress: number
  payload?: any
  timestamp?: number
}

export type RenderEngineEvent =
  | { type: 'job:queued'; jobId: string; job: RenderJob }
  | { type: 'job:started'; jobId: string }
  | { type: 'job:progress'; jobId: string; progress: number; metadata?: Record<string, any> }
  | { type: 'job:completed'; jobId: string; result: RenderJob }
  | { type: 'job:failed'; jobId: string; error: RenderError }
  | { type: 'job:cancelled'; jobId: string }
  | { type: 'job:retrying'; jobId: string; attempt: number }
  | { type: 'queue:stalled'; reason: string }
  | { type: 'resources:warning'; resource: string; usage: number }
  | { type: 'cache:cleanup'; entriesRemoved: number }
