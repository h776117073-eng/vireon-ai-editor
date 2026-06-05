import { EventEmitter } from 'events'
import type {
  RenderJob,
  RetryPolicy,
  DeadLetterEntry,
  RenderError,
  ErrorCode,
} from './types'
import { RenderEngineError } from './errors'

export interface RecoveryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  retryableErrorCodes?: ErrorCode[]
}

export class RecoveryManager extends EventEmitter {
  private retryPolicy: RetryPolicy
  private deadLetterQueue: Map<string, DeadLetterEntry> = new Map()
  private retryTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(options: RecoveryOptions = {}) {
    super()
    this.retryPolicy = {
      maxRetries: options.maxRetries ?? 3,
      initialDelayMs: options.initialDelayMs ?? 1000,
      maxDelayMs: options.maxDelayMs ?? 60000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      retryableErrors: options.retryableErrorCodes ?? [
        'FFMPEG_EXECUTION_FAILED',
        'FFMPEG_TIMEOUT',
        'INSUFFICIENT_MEMORY',
        'INSUFFICIENT_DISK_SPACE',
        'MAX_PROCESSES_EXCEEDED',
        'CACHE_WRITE_FAILED',
        'CACHE_READ_FAILED',
      ],
    }
  }

  canRetry(job: RenderJob, error: RenderError): boolean {
    if (!job.error) return false
    if (job.retryCount >= this.retryPolicy.maxRetries) return false
    return this.retryPolicy.retryableErrors.includes(error.code)
  }

  getRetryDelay(attempt: number): number {
    const delay =
      this.retryPolicy.initialDelayMs *
      Math.pow(this.retryPolicy.backoffMultiplier, Math.max(0, attempt - 1))
    return Math.min(delay, this.retryPolicy.maxDelayMs)
  }

  scheduleRetry(
    job: RenderJob,
    error: RenderError,
    callback: (job: RenderJob) => void
  ): boolean {
    if (!this.canRetry(job, error)) {
      this.addToDeadLetter(job, error, 'Max retries exceeded')
      return false
    }

    const attempt = job.retryCount + 1
    const delay = this.getRetryDelay(attempt)

    this.emit('retry:scheduled', { jobId: job.id, attempt, delay })

    const timer = setTimeout(() => {
      this.retryTimers.delete(job.id)
      job.retryCount = attempt
      job.status = 'queued'
      job.updatedAt = Date.now()
      callback(job)
      this.emit('retry:executing', { jobId: job.id, attempt })
    }, delay)

    this.retryTimers.set(job.id, timer)
    return true
  }

  cancelRetry(jobId: string): void {
    const timer = this.retryTimers.get(jobId)
    if (timer) {
      clearTimeout(timer)
      this.retryTimers.delete(jobId)
      this.emit('retry:cancelled', { jobId })
    }
  }

  addToDeadLetter(job: RenderJob, error: RenderError, reason: string): void {
    const entry: DeadLetterEntry = {
      jobId: job.id,
      job: JSON.parse(JSON.stringify(job)),
      error,
      attemptedAt: Date.now(),
      reason,
    }

    this.deadLetterQueue.set(job.id, entry)
    this.emit('dead-letter:added', entry)
  }

  getDeadLetterQueue(): DeadLetterEntry[] {
    return Array.from(this.deadLetterQueue.values())
  }

  removeFromDeadLetter(jobId: string): DeadLetterEntry | undefined {
    return this.deadLetterQueue.get(jobId)
  }

  clearDeadLetter(): void {
    this.deadLetterQueue.clear()
    this.emit('dead-letter:cleared')
  }

  getDeadLetterStats(): {
    count: number
    oldestAge: number
    byErrorCode: Record<ErrorCode, number>
  } {
    const entries = Array.from(this.deadLetterQueue.values())
    const now = Date.now()
    const byErrorCode: Record<ErrorCode, number> = {} as any

    for (const entry of entries) {
      byErrorCode[entry.error.code] = (byErrorCode[entry.error.code] || 0) + 1
    }

    return {
      count: entries.length,
      oldestAge: entries.length > 0 ? now - Math.min(...entries.map((e) => e.attemptedAt)) : 0,
      byErrorCode,
    }
  }

  getRetryPolicy(): RetryPolicy {
    return { ...this.retryPolicy }
  }

  setRetryPolicy(policy: Partial<RetryPolicy>): void {
    this.retryPolicy = {
      ...this.retryPolicy,
      ...policy,
    }
  }

  cleanup(): void {
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer)
    }
    this.retryTimers.clear()
  }

  destroy(): void {
    this.cleanup()
    this.deadLetterQueue.clear()
    this.removeAllListeners()
  }
}

export function createRecoveryManager(options?: RecoveryOptions): RecoveryManager {
  return new RecoveryManager(options)
}

export function calculateExponentialBackoff(
  attempt: number,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 60000,
  multiplier: number = 2
): number {
  const delay = initialDelayMs * Math.pow(multiplier, Math.max(0, attempt - 1))
  return Math.min(delay, maxDelayMs)
}
