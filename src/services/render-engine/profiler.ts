import type { JobMetrics } from './types'

export interface ExecutionProfile {
  jobId: string
  type: string
  queueWaitMs: number
  executionMs: number
  totalMs: number
  memoryPeakMB: number
  memoryAvgMB: number
  diskUsedMB: number
  succeeded: boolean
  timestamp: number
}

export class RenderProfiler {
  private profiles: Map<string, ExecutionProfile> = new Map()
  private activeJobs: Map<string, { startTime: number; startMem: number }> = new Map()
  private maxProfiles: number = 5000

  constructor(maxProfiles: number = 5000) {
    this.maxProfiles = maxProfiles
  }

  startJobProfile(jobId: string): void {
    this.activeJobs.set(jobId, {
      startTime: Date.now(),
      startMem: this.getCurrentMemoryMB(),
    })
  }

  endJobProfile(
    jobId: string,
    jobType: string,
    queueWaitMs: number,
    succeeded: boolean,
    diskUsedMB: number = 0
  ): ExecutionProfile | null {
    const active = this.activeJobs.get(jobId)
    if (!active) return null

    const endTime = Date.now()
    const endMem = this.getCurrentMemoryMB()
    const executionMs = endTime - active.startTime
    const totalMs = executionMs + queueWaitMs

    const profile: ExecutionProfile = {
      jobId,
      type: jobType,
      queueWaitMs,
      executionMs,
      totalMs,
      memoryPeakMB: Math.max(active.startMem, endMem),
      memoryAvgMB: (active.startMem + endMem) / 2,
      diskUsedMB,
      succeeded,
      timestamp: Date.now(),
    }

    this.profiles.set(jobId, profile)
    this.activeJobs.delete(jobId)

    // Keep profiles bounded
    if (this.profiles.size > this.maxProfiles) {
      const toDelete = Array.from(this.profiles.keys()).slice(
        0,
        this.profiles.size - this.maxProfiles
      )
      for (const key of toDelete) {
        this.profiles.delete(key)
      }
    }

    return profile
  }

  getProfile(jobId: string): ExecutionProfile | null {
    return this.profiles.get(jobId) || null
  }

  getAllProfiles(): ExecutionProfile[] {
    return Array.from(this.profiles.values())
  }

  getProfilesSince(timestamp: number): ExecutionProfile[] {
    return Array.from(this.profiles.values()).filter((p) => p.timestamp >= timestamp)
  }

  getAggregateStats(since: number = 0): {
    totalJobs: number
    successfulJobs: number
    failedJobs: number
    avgExecutionMs: number
    avgQueueWaitMs: number
    avgTotalMs: number
    peakMemoryMB: number
    avgMemoryMB: number
    totalDiskUsedMB: number
    byType: Record<
      string,
      {
        count: number
        successful: number
        failed: number
        avgExecutionMs: number
      }
    >
  } {
    const profiles = Array.from(this.profiles.values()).filter((p) => p.timestamp >= since)

    if (profiles.length === 0) {
      return {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        avgExecutionMs: 0,
        avgQueueWaitMs: 0,
        avgTotalMs: 0,
        peakMemoryMB: 0,
        avgMemoryMB: 0,
        totalDiskUsedMB: 0,
        byType: {},
      }
    }

    const successful = profiles.filter((p) => p.succeeded)
    const failed = profiles.filter((p) => !p.succeeded)

    const byType: Record<
      string,
      {
        count: number
        successful: number
        failed: number
        avgExecutionMs: number
      }
    > = {}

    for (const profile of profiles) {
      if (!byType[profile.type]) {
        byType[profile.type] = {
          count: 0,
          successful: 0,
          failed: 0,
          avgExecutionMs: 0,
        }
      }

      byType[profile.type].count++
      if (profile.succeeded) {
        byType[profile.type].successful++
      } else {
        byType[profile.type].failed++
      }
    }

    // Calculate averages
    for (const type in byType) {
      const typeProfiles = profiles.filter((p) => p.type === type)
      byType[type].avgExecutionMs =
        typeProfiles.reduce((sum, p) => sum + p.executionMs, 0) / typeProfiles.length
    }

    return {
      totalJobs: profiles.length,
      successfulJobs: successful.length,
      failedJobs: failed.length,
      avgExecutionMs:
        successful.length > 0
          ? successful.reduce((sum, p) => sum + p.executionMs, 0) / successful.length
          : 0,
      avgQueueWaitMs:
        profiles.length > 0
          ? profiles.reduce((sum, p) => sum + p.queueWaitMs, 0) / profiles.length
          : 0,
      avgTotalMs:
        profiles.length > 0
          ? profiles.reduce((sum, p) => sum + p.totalMs, 0) / profiles.length
          : 0,
      peakMemoryMB: Math.max(...profiles.map((p) => p.memoryPeakMB), 0),
      avgMemoryMB:
        profiles.length > 0
          ? profiles.reduce((sum, p) => sum + p.memoryAvgMB, 0) / profiles.length
          : 0,
      totalDiskUsedMB: profiles.reduce((sum, p) => sum + p.diskUsedMB, 0),
      byType,
    }
  }

  private getCurrentMemoryMB(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
    return 0
  }

  clear(): void {
    this.profiles.clear()
    this.activeJobs.clear()
  }

  getStats(): { totalProfiles: number; activeJobs: number } {
    return {
      totalProfiles: this.profiles.size,
      activeJobs: this.activeJobs.size,
    }
  }
}

export function createProfiler(maxProfiles?: number): RenderProfiler {
  return new RenderProfiler(maxProfiles)
}
