import { EventEmitter } from 'events'
import type { RenderJob, JobEvent, JobPriority, QueueMetrics } from '../types'
import type { PreviewGenerator } from './preview'
import type { ExportManager } from './exports'
import { RenderEngineError } from '../errors'
import { JobLifecycle } from './jobLifecycle'

export interface JobQueueOptions {
  maxQueueSize?: number
  persistenceDirectory?: string
  enablePersistence?: boolean
}

export class JobQueue extends EventEmitter {
  private queue: RenderJob[] = []
  private jobMap: Map<string, RenderJob> = new Map()
  private activeCount = 0
  private abortControllers = new Map<string, AbortController>()
  private isShuttingDown = false
  private inFlightJobs: Set<string> = new Set()
  private jobLifecycles: Map<string, JobLifecycle> = new Map()
  private completedJobs: Map<string, RenderJob> = new Map()
  private failedJobs: Map<string, RenderJob> = new Map()

  constructor(
    private concurrency: number,
    private previewGenerator: PreviewGenerator,
    private exportManager: ExportManager,
    private options: JobQueueOptions = {}
  ) {
    super()
    this.setMaxListeners(100)
  }

  enqueue(job: RenderJob): void {
    if (this.isShuttingDown) {
      throw new RenderEngineError('QUEUE_FULL', 'Queue is shutting down')
    }

    if (this.queue.length >= (this.options.maxQueueSize || 1000)) {
      throw new RenderEngineError('QUEUE_FULL', 'Job queue is full')
    }

    // Initialize job with defaults
    job.status = 'pending'
    job.priority = job.priority || 'normal'
    job.progress = 0
    job.createdAt = job.createdAt || Date.now()
    job.updatedAt = Date.now()
    job.retryCount = job.retryCount || 0
    job.maxRetries = job.maxRetries || 3

    // Register job
    this.jobMap.set(job.id, job)
    this.inFlightJobs.add(job.id)

    // Add to queue
    this.queue.push(job)
    this.sortQueueByPriority()

    this.emit('job:enqueued', { jobId: job.id, job })
    this.processNext()
  }

  cancel(jobId: string): void {
    const controller = this.abortControllers.get(jobId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(jobId)
    }

    const queuedIndex = this.queue.findIndex((job) => job.id === jobId)
    if (queuedIndex !== -1) {
      const [job] = this.queue.splice(queuedIndex, 1)
      job.status = 'cancelled'
      job.updatedAt = Date.now()
      job.progress = 0
      this.emit('job:cancelled', { jobId, job })
    } else if (this.inFlightJobs.has(jobId)) {
      // Already processing, will be handled in processJob
      this.inFlightJobs.delete(jobId)
    }
  }

  getJob(jobId: string): RenderJob | undefined {
    return this.jobMap.get(jobId)
  }

  private sortQueueByPriority(): void {
    const priorityOrder: Record<JobPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    }

    this.queue.sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'normal']
      const bPriority = priorityOrder[b.priority || 'normal']
      return aPriority - bPriority
    })
  }

  private async processNext(): Promise<void> {
    if (this.isShuttingDown && this.activeCount === 0) {
      this.emit('queue:shutdown-complete')
      return
    }

    if (this.activeCount >= this.concurrency) return
    if (this.queue.length === 0) return

    const job = this.queue.shift()
    if (!job) return

    this.activeCount += 1

    try {
      await this.processJob(job)
    } catch (error) {
      job.status = 'failed'
      job.metadata = { ...job.metadata, error: String(error) }
      job.updatedAt = Date.now()
      this.failedJobs.set(job.id, job)
      this.emit('job:failed', { jobId: job.id, job, error })
    } finally {
      this.activeCount -= 1
      this.inFlightJobs.delete(job.id)
      if (this.activeCount < this.concurrency) {
        this.processNext()
      }
    }
  }

  private async processJob(job: RenderJob): Promise<void> {
    const lifecycle = new JobLifecycle(job)
    this.jobLifecycles.set(job.id, lifecycle)

    try {
      job.status = 'processing'
      job.startedAt = Date.now()
      job.updatedAt = Date.now()
      this.emit('job:started', { jobId: job.id, job })

      const controller = new AbortController()
      this.abortControllers.set(job.id, controller)

      const progressCallback = (newProgress: number, metadata?: Record<string, any>) => {
        if (controller.signal.aborted) return

        job.progress = Math.min(newProgress, 1.0)
        if (metadata) {
          job.metadata = { ...job.metadata, ...metadata }
        }
        job.updatedAt = Date.now()
        this.emit('job:progress', { jobId: job.id, progress: job.progress, metadata })
      }

      if (controller.signal.aborted) {
        job.status = 'cancelled'
        job.progress = 0
        return
      }

      // Execute job based on type
      switch (job.type) {
        case 'preview':
          await this.previewGenerator.generate(job as any, controller.signal, progressCallback)
          break
        case 'export':
          await this.exportManager.export(job as any, controller.signal, progressCallback)
          break
        case 'ai_edit':
          await this.exportManager.export(job as any, controller.signal, progressCallback)
          break
      }

      // Check for cancellation
      if (controller.signal.aborted) {
        job.status = 'cancelled'
        job.progress = 0
        this.emit('job:cancelled', { jobId: job.id, job })
      } else {
        job.status = 'completed'
        job.completedAt = Date.now()
        job.progress = 1.0
        this.completedJobs.set(job.id, job)
        this.emit('job:completed', { jobId: job.id, job })
      }
    } finally {
      this.abortControllers.delete(job.id)
      job.updatedAt = Date.now()
      this.jobLifecycles.delete(job.id)
    }
  }

  async gracefulShutdown(timeoutMs: number = 30000): Promise<void> {
    this.isShuttingDown = true
    const startTime = Date.now()

    // Wait for all in-flight jobs to complete
    while (this.activeCount > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (this.activeCount > 0) {
      console.warn(`Shutdown timeout: ${this.activeCount} jobs still in progress`)
      // Force cancel remaining jobs
      for (const [, controller] of this.abortControllers) {
        controller.abort()
      }
    }

    this.queue = []
    this.emit('queue:shutdown-complete')
  }

  getPendingJobs(): RenderJob[] {
    return [...this.queue]
  }

  getQueueMetrics(): QueueMetrics {
    return {
      totalJobs: this.jobMap.size,
      queuedJobs: this.queue.length,
      processingJobs: this.activeCount,
      completedJobs: this.completedJobs.size,
      failedJobs: this.failedJobs.size,
      cancelledJobs: Array.from(this.jobMap.values()).filter((j) => j.status === 'cancelled')
        .length,
      avgQueueWaitTimeMs: this.calculateAvgQueueWaitTime(),
      avgProcessingTimeMs: this.calculateAvgProcessingTime(),
    }
  }

  private calculateAvgQueueWaitTime(): number {
    const jobs = Array.from(this.completedJobs.values()).concat(
      Array.from(this.failedJobs.values())
    )
    if (jobs.length === 0) return 0

    const totalWaitTime = jobs.reduce((sum, job) => {
      const startTime = job.startedAt || job.updatedAt
      return sum + (startTime - job.createdAt)
    }, 0)

    return totalWaitTime / jobs.length
  }

  private calculateAvgProcessingTime(): number {
    const jobs = Array.from(this.completedJobs.values()).concat(
      Array.from(this.failedJobs.values())
    )
    if (jobs.length === 0) return 0

    const totalProcessingTime = jobs.reduce((sum, job) => {
      if (!job.startedAt || !job.completedAt) return sum
      return sum + (job.completedAt - job.startedAt)
    }, 0)

    return totalProcessingTime / jobs.length
  }

  getQueueSize(): number {
    return this.queue.length
  }

  getActiveJobCount(): number {
    return this.activeCount
  }

  getAllJobs(): RenderJob[] {
    return Array.from(this.jobMap.values())
  }
}
