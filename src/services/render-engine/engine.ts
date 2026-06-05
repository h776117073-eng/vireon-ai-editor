import path from 'path'
import { EventEmitter } from 'events'
import type { PreviewJob, ExportJob, AIEditJob, RenderJob, RenderEngineOptions, RenderEngineEvent } from './types'
import { FFmpegDriver } from './ffmpeg/ffmpegDriver'
import { TempCache } from './ffmpeg/cache'
import { PreviewGenerator } from './ffmpeg/preview'
import { ExportManager } from './ffmpeg/exports'
import { JobQueue } from './ffmpeg/jobs'
import { RenderLogger } from './logger'
import { ResourceManager } from './resources'
import { RecoveryManager } from './recovery'
import { JobPersistence } from './persistence'
import { RenderMonitor } from './monitor'
import { RenderProfiler } from './profiler'
import { RenderEngineError } from './errors'

export class RenderEngine extends EventEmitter {
  private cache: TempCache
  private driver: FFmpegDriver
  private previewGenerator: PreviewGenerator
  private exportManager: ExportManager
  private queue: JobQueue
  private logger: RenderLogger
  private resourceManager: ResourceManager
  private recoveryManager: RecoveryManager
  private persistence: JobPersistence
  private monitor: RenderMonitor
  private profiler: RenderProfiler

  private readonly cacheDirectoryPath: string
  private readonly persistenceDirectoryPath: string
  private isInitialized: boolean = false
  private isShuttingDown: boolean = false

  constructor(options: RenderEngineOptions = {}) {
    super()
    this.setMaxListeners(50)

    // Directories
    this.cacheDirectoryPath = options.cacheDirectory ?? path.join(process.cwd(), 'vireon-render-cache')
    this.persistenceDirectoryPath =
      options.persistenceDirectory ?? path.join(process.cwd(), '.vireon-jobs')

    // Logger
    this.logger = new RenderLogger('info')

    // Cache
    this.cache = new TempCache({
      baseDir: this.cacheDirectoryPath,
      maxSizeMB: options.maxCacheSizeMB ?? 5000,
      ttlHours: options.cacheTimeoutHours ?? 24,
    })

    // FFmpeg driver
    this.driver = new FFmpegDriver({
      ffmpegPath: 'ffmpeg',
      timeout: options.jobTimeoutMs ?? 600000,
      enableHardwareAccel: true,
      validateCodecs: true,
    })

    // Preview & Export
    this.previewGenerator = new PreviewGenerator(this.driver, this.cacheDirectoryPath)
    this.exportManager = new ExportManager(this.driver, this.cacheDirectoryPath)

    // Queue with advanced options
    this.queue = new JobQueue(options.concurrency ?? 2, this.previewGenerator, this.exportManager, {
      maxQueueSize: options.maxQueueSize ?? 1000,
      persistenceDirectory: this.persistenceDirectoryPath,
      enablePersistence: true,
    })

    // Resource management
    this.resourceManager = new ResourceManager({
      maxMemoryPercent: 80,
      maxCpuPercent: 90,
      minDiskSpaceMB: 500,
      maxConcurrentProcesses: options.concurrency ?? 2,
    })

    // Recovery & retry
    this.recoveryManager = new RecoveryManager({
      maxRetries: options.maxRetries ?? 3,
      initialDelayMs: options.retryBackoffMs ?? 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
    })

    // Persistence
    this.persistence = new JobPersistence({
      directory: this.persistenceDirectoryPath,
      enableLogging: false,
    })

    // Monitor & Profiler
    this.monitor = new RenderMonitor(this.queue, this.resourceManager, this.cache, false)
    this.profiler = new RenderProfiler(5000)

    // Wire up event handlers
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Queue events
    this.queue.on('job:enqueued', ({ jobId, job }) => {
      this.logger.info(`Job enqueued: ${job.type}`, { jobId }, jobId)
      this.profiler.startJobProfile(jobId)
      this.emit('job:enqueued', { jobId, job })
    })

    this.queue.on('job:started', ({ jobId }) => {
      this.logger.info(`Job processing started`, {}, jobId)
      this.emit('job:started', { jobId })
    })

    this.queue.on('job:progress', ({ jobId, progress, metadata }) => {
      this.logger.jobProgress(jobId, progress, metadata)
      this.emit('job:progress', { jobId, progress })
    })

    this.queue.on('job:completed', ({ jobId, job }) => {
      this.logger.jobCompleted(jobId)

      const profile = this.profiler.endJobProfile(jobId, job.type, 0, true, 0)
      if (profile) {
        this.persistence.saveMetrics(jobId, {
          jobId,
          type: job.type as any,
          status: 'completed',
          queueWaitTimeMs: profile.queueWaitMs,
          processingTimeMs: profile.executionMs,
          totalTimeMs: profile.totalMs,
          resourcesUsed: {
            peakMemoryMB: profile.memoryPeakMB,
            avgMemoryMB: profile.memoryAvgMB,
            diskSpaceUsedMB: profile.diskUsedMB,
            processingTimeMs: profile.executionMs,
          },
          success: true,
        })
      }

      this.persistence.saveJob(job).catch((error) => {
        this.logger.error(`Failed to persist job ${jobId}`, error)
      })

      this.emit('job:completed', { jobId, job })
    })

    this.queue.on('job:failed', ({ jobId, job, error }) => {
      this.logger.jobFailed(jobId, error)

      this.profiler.endJobProfile(jobId, job.type, 0, false, 0)

      // Try to recover
      if (job.error && this.recoveryManager.canRetry(job, job.error)) {
        this.logger.jobRetrying(jobId, job.retryCount + 1, job.error)
        this.recoveryManager.scheduleRetry(job, job.error, (retryJob) => {
          this.queue.enqueue(retryJob)
        })
      } else if (job.error) {
        this.recoveryManager.addToDeadLetter(
          job,
          job.error,
          'Max retries exceeded or non-retriable error'
        )
      }

      this.emit('job:failed', { jobId, job, error })
    })

    this.queue.on('job:cancelled', ({ jobId, job }) => {
      this.logger.jobCancelled(jobId)
      this.profiler.endJobProfile(jobId, job.type, 0, false, 0)
      this.emit('job:cancelled', { jobId })
    })

    // Resource warnings
    this.resourceManager.on('resource:warning', ({ resource, current, limit }) => {
      this.logger.resourceWarning(resource, current, limit)
      this.emit('resource:warning' as any, { resource, current, limit })
    })

    // Monitor events
    this.monitor.on('health-check', (status) => {
      if (status.status !== 'healthy') {
        this.logger.warn(`Health check: ${status.status}`, { warnings: status.warnings })
      }
    })
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.logger.info('Initializing render engine...')

      // Initialize cache
      await this.cache.initialize()
      this.logger.info('Cache initialized')

      // Initialize FFmpeg driver
      await this.driver.initialize()
      this.logger.info(`FFmpeg initialized (hardware: ${this.driver.getHardwareAccelerator()})`)

      // Initialize persistence
      await this.persistence.initialize()
      this.logger.info('Persistence initialized')

      // Start monitoring
      this.monitor.startHealthMonitoring(
        (this.cacheDirectoryPath as any).healthCheckIntervalMs ?? 10000
      )
      this.logger.info('Monitoring started')

      this.isInitialized = true
      this.logger.info('Render engine ready')
      this.emit('ready')
    } catch (error) {
      const err = RenderEngineError.fromError(error)
      this.logger.critical('Render engine initialization failed', err)
      throw err
    }
  }

  enqueuePreview(job: PreviewJob): void {
    if (!this.isInitialized) {
      throw new RenderEngineError('SYSTEM_ERROR', 'Engine not initialized')
    }

    job.priority = job.priority || 'normal'
    job.maxRetries = 2 // Previews are lower priority for retries

    this.queue.enqueue(job)
  }

  enqueueExport(job: ExportJob): void {
    if (!this.isInitialized) {
      throw new RenderEngineError('SYSTEM_ERROR', 'Engine not initialized')
    }

    job.priority = job.priority || 'normal'
    job.maxRetries = 3 // Exports get more retries

    this.queue.enqueue(job)
  }

  enqueueAIEdit(job: AIEditJob): void {
    if (!this.isInitialized) {
      throw new RenderEngineError('SYSTEM_ERROR', 'Engine not initialized')
    }

    job.priority = job.priority || 'high' // AI edits are higher priority
    job.maxRetries = 3

    this.queue.enqueue(job)
  }

  cancelJob(jobId: string): void {
    this.queue.cancel(jobId)
  }

  getJob(jobId: string): RenderJob | undefined {
    return this.queue.getJob(jobId)
  }

  getPendingJobs(): RenderJob[] {
    return this.queue.getPendingJobs()
  }

  getMetrics() {
    return {
      queue: this.queue.getQueueMetrics(),
      resources: this.resourceManager.getSystemResources(),
      performance: this.profiler.getAggregateStats(),
      cache: this.cache.getStats(),
    }
  }

  getHealth() {
    return this.monitor.getLastHealthStatus()
  }

  async getJobHistory(limit: number = 100) {
    const jobs = await this.persistence.getAllJobs()
    return jobs.slice(-limit)
  }

  getDeadLetterQueue() {
    return this.recoveryManager.getDeadLetterQueue()
  }

  getResourceUsage() {
    return this.resourceManager.getResourceUsagePercent()
  }

  async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    try {
      this.logger.info('Render engine shutting down gracefully...')

      // Stop accepting new jobs
      this.monitor.stopHealthMonitoring()

      // Wait for in-flight jobs
      await this.queue.gracefulShutdown(30000)

      // Persist state
      await this.persistence.close()

      // Cleanup
      this.recoveryManager.cleanup()
      await this.cache.cleanup()

      this.logger.info('Render engine shutdown complete')
      this.emit('shutdown')
    } catch (error) {
      this.logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  async dispose(): Promise<void> {
    await this.gracefulShutdown()
    await this.cache.destroy()
    this.removeAllListeners()
  }

  get cacheDirectory(): string {
    return this.cacheDirectoryPath
  }

  getLogs(filter?: any) {
    return this.logger.getLogs(filter)
  }

  getLogStats() {
    return this.logger.getStats()
  }
}
