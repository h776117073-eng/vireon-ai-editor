import path from 'path'
import type { RenderJob, JobMetrics } from './types'

export interface PersistenceOptions {
  directory?: string
  enableLogging?: boolean
}

export interface JobRecord {
  jobId: string
  jobData: string // JSON
  status: string
  createdAt: number
  completedAt?: number
  error?: string
}

// Simple file-based persistence using JSON (avoiding SQLite dependency complexity)
export class JobPersistence {
  private directory: string
  private jobsMap: Map<string, JobRecord> = new Map()
  private metricsMap: Map<string, JobMetrics> = new Map()
  private enableLogging: boolean

  constructor(options: PersistenceOptions = {}) {
    this.directory = options.directory || path.join(process.env.HOME || '.', '.vireon-jobs')
    this.enableLogging = options.enableLogging ?? false
  }

  async initialize(): Promise<void> {
    // Create directory if needed
    const fs = await import('fs/promises')

    try {
      await fs.mkdir(this.directory, { recursive: true })
      await this.loadJobIndex()
    } catch (error) {
      console.error(`Failed to initialize persistence: ${error}`)
    }
  }

  private async loadJobIndex(): Promise<void> {
    const fs = await import('fs/promises')

    try {
      const indexPath = path.join(this.directory, 'jobs.json')

      try {
        const data = await fs.readFile(indexPath, 'utf-8')
        const records: JobRecord[] = JSON.parse(data)

        for (const record of records) {
          this.jobsMap.set(record.jobId, record)
        }

        if (this.enableLogging) {
          console.log(`Loaded ${records.length} job records from persistence`)
        }
      } catch {
        // File doesn't exist yet, that's fine
      }
    } catch (error) {
      console.error(`Failed to load job index: ${error}`)
    }
  }

  private async saveJobIndex(): Promise<void> {
    const fs = await import('fs/promises')

    try {
      const indexPath = path.join(this.directory, 'jobs.json')
      const records = Array.from(this.jobsMap.values())
      await fs.writeFile(indexPath, JSON.stringify(records, null, 2), 'utf-8')
    } catch (error) {
      console.error(`Failed to save job index: ${error}`)
    }
  }

  async saveJob(job: RenderJob): Promise<void> {
    const record: JobRecord = {
      jobId: job.id,
      jobData: JSON.stringify(job),
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error ? JSON.stringify(job.error) : undefined,
    }

    this.jobsMap.set(job.id, record)
    await this.saveJobIndex()
  }

  async getJob(jobId: string): Promise<RenderJob | null> {
    const record = this.jobsMap.get(jobId)
    if (!record) return null

    try {
      return JSON.parse(record.jobData) as RenderJob
    } catch {
      return null
    }
  }

  async getAllJobs(): Promise<RenderJob[]> {
    const jobs: RenderJob[] = []

    for (const record of this.jobsMap.values()) {
      try {
        jobs.push(JSON.parse(record.jobData) as RenderJob)
      } catch {
        // Skip malformed records
      }
    }

    return jobs
  }

  async getJobsByStatus(status: string): Promise<RenderJob[]> {
    const jobs: RenderJob[] = []

    for (const record of this.jobsMap.values()) {
      if (record.status === status) {
        try {
          jobs.push(JSON.parse(record.jobData) as RenderJob)
        } catch {
          // Skip malformed records
        }
      }
    }

    return jobs
  }

  async getJobsSince(timestamp: number): Promise<RenderJob[]> {
    const jobs: RenderJob[] = []

    for (const record of this.jobsMap.values()) {
      if (record.createdAt >= timestamp) {
        try {
          jobs.push(JSON.parse(record.jobData) as RenderJob)
        } catch {
          // Skip malformed records
        }
      }
    }

    return jobs
  }

  async saveMetrics(jobId: string, metrics: JobMetrics): Promise<void> {
    this.metricsMap.set(jobId, metrics)
  }

  async getMetrics(jobId: string): Promise<JobMetrics | null> {
    return this.metricsMap.get(jobId) || null
  }

  async getAllMetrics(): Promise<JobMetrics[]> {
    return Array.from(this.metricsMap.values())
  }

  async getAggregateMetrics(since: number): Promise<{
    totalJobs: number
    successfulJobs: number
    failedJobs: number
    avgDurationMs: number
    avgQueueWaitMs: number
  }> {
    const metrics = Array.from(this.metricsMap.values()).filter((m) => {
      const job = this.jobsMap.get(m.jobId)
      return job && job.createdAt >= since
    })

    if (metrics.length === 0) {
      return {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        avgDurationMs: 0,
        avgQueueWaitMs: 0,
      }
    }

    const successful = metrics.filter((m) => m.success)
    const failed = metrics.filter((m) => !m.success)

    const avgDuration =
      successful.length > 0
        ? successful.reduce((sum, m) => sum + m.totalTimeMs, 0) / successful.length
        : 0

    const avgQueueWait =
      metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.queueWaitTimeMs, 0) / metrics.length
        : 0

    return {
      totalJobs: metrics.length,
      successfulJobs: successful.length,
      failedJobs: failed.length,
      avgDurationMs: avgDuration,
      avgQueueWaitMs: avgQueueWait,
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    this.jobsMap.delete(jobId)
    this.metricsMap.delete(jobId)
    await this.saveJobIndex()
  }

  async clearOldData(ageHours: number): Promise<number> {
    const now = Date.now()
    const ageMs = ageHours * 60 * 60 * 1000
    let removed = 0

    const toDelete: string[] = []

    for (const [jobId, record] of this.jobsMap) {
      if (now - record.createdAt > ageMs) {
        toDelete.push(jobId)
      }
    }

    for (const jobId of toDelete) {
      await this.deleteJob(jobId)
      removed++
    }

    return removed
  }

  async close(): Promise<void> {
    // Save final state
    await this.saveJobIndex()
    this.jobsMap.clear()
    this.metricsMap.clear()
  }

  getStats(): {
    totalRecords: number
    metricsRecords: number
  } {
    return {
      totalRecords: this.jobsMap.size,
      metricsRecords: this.metricsMap.size,
    }
  }
}

export function createJobPersistence(options?: PersistenceOptions): JobPersistence {
  return new JobPersistence(options)
}
