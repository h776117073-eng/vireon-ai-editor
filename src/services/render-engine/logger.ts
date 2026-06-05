import { EventEmitter } from 'events'
import type { JobMetrics, QueueMetrics, RenderError, RenderJob } from './types'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export interface LogEntry {
  level: LogLevel
  timestamp: number
  message: string
  context?: Record<string, any>
  jobId?: string
  error?: RenderError
}

export class RenderLogger extends EventEmitter {
  private logs: LogEntry[] = []
  private maxLogs: number = 10000
  private minLevel: LogLevel = 'info'
  private jobMetricsMap: Map<string, Partial<JobMetrics>> = new Map()

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    critical: 4,
  }

  constructor(minLevel: LogLevel = 'info') {
    super()
    this.minLevel = minLevel
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel]
  }

  private addLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return

    this.logs.push(entry)

    // Keep logs bounded
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    this.emit('log', entry)
  }

  debug(message: string, context?: Record<string, any>, jobId?: string): void {
    this.addLog({ level: 'debug', timestamp: Date.now(), message, context, jobId })
  }

  info(message: string, context?: Record<string, any>, jobId?: string): void {
    this.addLog({ level: 'info', timestamp: Date.now(), message, context, jobId })
    console.log(`[INFO] ${message}`, context || '')
  }

  warn(message: string, context?: Record<string, any>, jobId?: string): void {
    this.addLog({ level: 'warn', timestamp: Date.now(), message, context, jobId })
    console.warn(`[WARN] ${message}`, context || '')
  }

  error(
    message: string,
    error?: RenderError | Error,
    context?: Record<string, any>,
    jobId?: string
  ): void {
    const renderError = error && 'code' in error ? error : undefined
    this.addLog({
      level: 'error',
      timestamp: Date.now(),
      message,
      error: renderError,
      context,
      jobId,
    })
    console.error(`[ERROR] ${message}`, error || context || '')
  }

  critical(
    message: string,
    error?: RenderError | Error,
    context?: Record<string, any>
  ): void {
    const renderError = error && 'code' in error ? error : undefined
    this.addLog({
      level: 'critical',
      timestamp: Date.now(),
      message,
      error: renderError,
      context,
    })
    console.error(`[CRITICAL] ${message}`, error || context || '')
  }

  jobStarted(jobId: string, jobType: string): void {
    this.info(`Job started: ${jobType}`, { jobId }, jobId)
    this.jobMetricsMap.set(jobId, {
      jobId,
      type: jobType as any,
      status: 'processing',
      queueWaitTimeMs: 0,
      processingTimeMs: 0,
      totalTimeMs: 0,
    })
  }

  jobProgress(jobId: string, progress: number, metadata?: Record<string, any>): void {
    this.debug(
      `Job progress: ${(progress * 100).toFixed(1)}%`,
      { progress, ...metadata },
      jobId
    )
  }

  jobCompleted(jobId: string, resourcesUsed?: Record<string, any>): void {
    this.info(
      `Job completed`,
      { jobId, ...resourcesUsed },
      jobId
    )
    const metrics = this.jobMetricsMap.get(jobId)
    if (metrics) {
      metrics.status = 'completed'
      metrics.success = true
    }
  }

  jobFailed(jobId: string, error: RenderError): void {
    this.error(
      `Job failed: ${error.message}`,
      error,
      { code: error.code, recovery: error.recovery },
      jobId
    )
    const metrics = this.jobMetricsMap.get(jobId)
    if (metrics) {
      metrics.status = 'failed'
      metrics.success = false
      metrics.error = error
    }
  }

  jobCancelled(jobId: string): void {
    this.info(`Job cancelled`, { jobId }, jobId)
    const metrics = this.jobMetricsMap.get(jobId)
    if (metrics) {
      metrics.status = 'cancelled'
      metrics.success = false
    }
  }

  jobRetrying(jobId: string, attempt: number, error: RenderError): void {
    this.warn(
      `Job retrying (attempt ${attempt}): ${error.message}`,
      { code: error.code },
      jobId
    )
  }

  resourceWarning(resource: string, usage: number, limit: number): void {
    this.warn(`Resource warning: ${resource} usage ${usage}/${limit}`, {
      resource,
      usage,
      limit,
    })
  }

  queueStalled(reason: string, context?: Record<string, any>): void {
    this.warn(`Queue stalled: ${reason}`, context)
  }

  cacheOperation(operation: string, details?: Record<string, any>): void {
    this.debug(`Cache operation: ${operation}`, details)
  }

  getJobMetrics(jobId: string): Partial<JobMetrics> | undefined {
    return this.jobMetricsMap.get(jobId)
  }

  getQueueMetrics(stats: {
    totalJobs: number
    queuedJobs: number
    processingJobs: number
    completedJobs: number
    failedJobs: number
    cancelledJobs: number
  }): QueueMetrics {
    const completedMetrics = Array.from(this.jobMetricsMap.values()).filter(
      (m) => m.status === 'completed' || m.status === 'failed'
    )

    const avgQueueWaitTimeMs =
      completedMetrics.length > 0
        ? completedMetrics.reduce((sum, m) => sum + (m.queueWaitTimeMs || 0), 0) /
          completedMetrics.length
        : 0

    const avgProcessingTimeMs =
      completedMetrics.length > 0
        ? completedMetrics.reduce((sum, m) => sum + (m.processingTimeMs || 0), 0) /
          completedMetrics.length
        : 0

    return {
      ...stats,
      avgQueueWaitTimeMs,
      avgProcessingTimeMs,
    }
  }

  getLogs(filter?: { level?: LogLevel; jobId?: string; since?: number }): LogEntry[] {
    return this.logs.filter((log) => {
      if (filter?.level && log.level !== filter.level) return false
      if (filter?.jobId && log.jobId !== filter.jobId) return false
      if (filter?.since && log.timestamp < filter.since) return false
      return true
    })
  }

  clearLogs(): void {
    this.logs = []
    this.jobMetricsMap.clear()
  }

  getStats(): {
    totalLogs: number
    logsByLevel: Record<LogLevel, number>
    metricsTracked: number
  } {
    const logsByLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    }

    for (const log of this.logs) {
      logsByLevel[log.level]++
    }

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      metricsTracked: this.jobMetricsMap.size,
    }
  }
}

export const createLogger = (level: LogLevel = 'info'): RenderLogger => {
  return new RenderLogger(level)
}
