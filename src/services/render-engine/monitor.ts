import { EventEmitter } from 'events'
import type { QueueMetrics, SystemResources } from './types'
import type { ResourceManager } from './resources'
import type { JobQueue } from './ffmpeg/jobs'
import type { TempCache } from './ffmpeg/cache'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: number
  checks: {
    queue: boolean
    resources: boolean
    cache: boolean
    ffmpeg: boolean
  }
  warnings: string[]
  errors: string[]
}

export class RenderMonitor extends EventEmitter {
  private healthCheckInterval: NodeJS.Timeout | null = null
  private lastHealthStatus: HealthStatus | null = null
  private healthCheckIntervalMs: number = 10000

  constructor(
    private queue: JobQueue,
    private resources: ResourceManager,
    private cache: TempCache,
    private ffmpegReady: boolean = false
  ) {
    super()
  }

  startHealthMonitoring(intervalMs: number = 10000): void {
    this.healthCheckIntervalMs = intervalMs

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch((error) => console.error(`Health check failed: ${error}`))
    }, this.healthCheckIntervalMs)

    if (this.healthCheckInterval.unref) {
      this.healthCheckInterval.unref()
    }
  }

  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const checks = {
      queue: true,
      resources: true,
      cache: true,
      ffmpeg: this.ffmpegReady,
    }

    const warnings: string[] = []
    const errors: string[] = []

    try {
      // Check queue health
      const queueSize = this.queue.getQueueSize()
      if (queueSize > 100) {
        warnings.push(`Large queue size: ${queueSize} jobs pending`)
      }
    } catch (error) {
      checks.queue = false
      errors.push(`Queue check failed: ${error}`)
    }

    try {
      // Check resource health
      const resourceHealth = this.resources.checkHealth()
      if (!resourceHealth.healthy) {
        checks.resources = false
        warnings.push(...resourceHealth.warnings)
      }

      const usage = this.resources.getResourceUsagePercent()
      if (usage.memory > 85) {
        warnings.push(`High memory usage: ${usage.memory.toFixed(1)}%`)
      }
      if (usage.cpu > 85) {
        warnings.push(`High CPU usage: ${usage.cpu}%`)
      }
    } catch (error) {
      checks.resources = false
      errors.push(`Resource check failed: ${error}`)
    }

    try {
      // Check cache health
      const cacheStats = this.cache.getStats()
      if (cacheStats.entryCount > 1000) {
        warnings.push(`Large cache: ${cacheStats.entryCount} entries`)
      }
    } catch (error) {
      checks.cache = false
      errors.push(`Cache check failed: ${error}`)
    }

    const allHealthy = Object.values(checks).every((v) => v)

    const status: HealthStatus = {
      status: errors.length > 0 ? 'unhealthy' : warnings.length > 0 ? 'degraded' : 'healthy',
      timestamp: Date.now(),
      checks,
      warnings,
      errors,
    }

    this.lastHealthStatus = status

    if (status.status !== 'healthy') {
      this.emit('health-check', status)
    }

    return status
  }

  getLastHealthStatus(): HealthStatus | null {
    return this.lastHealthStatus
  }

  getQueueMetrics(): QueueMetrics | null {
    try {
      return this.queue.getQueueMetrics()
    } catch {
      return null
    }
  }

  getSystemResources(): SystemResources | null {
    try {
      return this.resources.getSystemResources()
    } catch {
      return null
    }
  }

  getResourceUsage(): { memory: number; cpu: number; disk: number } {
    try {
      return this.resources.getResourceUsagePercent()
    } catch {
      return { memory: 0, cpu: 0, disk: 0 }
    }
  }

  getCacheStats(): any {
    try {
      return this.cache.getStats()
    } catch {
      return null
    }
  }

  generateReport(): {
    timestamp: number
    health: HealthStatus | null
    queue: QueueMetrics | null
    resources: SystemResources | null
    cache: any
  } {
    return {
      timestamp: Date.now(),
      health: this.lastHealthStatus,
      queue: this.getQueueMetrics(),
      resources: this.getSystemResources(),
      cache: this.getCacheStats(),
    }
  }

  destroy(): void {
    this.stopHealthMonitoring()
    this.removeAllListeners()
  }
}

export function createMonitor(
  queue: JobQueue,
  resources: ResourceManager,
  cache: TempCache,
  ffmpegReady?: boolean
): RenderMonitor {
  return new RenderMonitor(queue, resources, cache, ffmpegReady)
}
