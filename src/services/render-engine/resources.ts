import { EventEmitter } from 'events'
import os from 'os'
import type { SystemResources } from '../types'

export interface ResourceLimits {
  maxMemoryPercent?: number
  maxCpuPercent?: number
  minDiskSpaceMB?: number
  maxConcurrentProcesses?: number
}

export class ResourceManager extends EventEmitter {
  private resourceLimits: Required<ResourceLimits>
  private lastSystemCheck: number = 0
  private cachedResources: SystemResources | null = null
  private healthCheckIntervalMs: number = 5000

  constructor(limits: ResourceLimits = {}) {
    super()
    this.resourceLimits = {
      maxMemoryPercent: limits.maxMemoryPercent ?? 80,
      maxCpuPercent: limits.maxCpuPercent ?? 90,
      minDiskSpaceMB: limits.minDiskSpaceMB ?? 500,
      maxConcurrentProcesses: limits.maxConcurrentProcesses ?? 4,
    }
  }

  private getSystemInfo(): SystemResources {
    const now = Date.now()

    // Use cache if recent
    if (this.cachedResources && now - this.lastSystemCheck < 1000) {
      return this.cachedResources
    }

    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const availableMemoryMB = Math.floor(freeMemory / 1024 / 1024)
    const totalMemoryMB = Math.floor(totalMemory / 1024 / 1024)
    const usedMemoryMB = totalMemoryMB - availableMemoryMB

    const cpus = os.cpus()
    const cpuCount = cpus.length
    const avgCpuLoad = os.loadavg()[0] / cpuCount
    const cpuUsagePercent = Math.min(100, Math.floor(avgCpuLoad * 100))

    // Estimate available disk space (simplified - would need fs.statfs in real implementation)
    const diskSpaceAvailableMB = 50000 // Placeholder

    const resources: SystemResources = {
      totalMemoryMB,
      availableMemoryMB,
      cpuCount,
      cpuUsagePercent,
      diskSpaceAvailableMB,
      timestamp: now,
    }

    this.cachedResources = resources
    this.lastSystemCheck = now

    return resources
  }

  canAllocateJob(estimatedMemoryMB: number = 500): boolean {
    const resources = this.getSystemInfo()

    // Check memory
    const memoryUsagePercent = ((resources.totalMemoryMB - resources.availableMemoryMB) /
      resources.totalMemoryMB) *
      100
    const projectedMemoryPercent = memoryUsagePercent +
      (estimatedMemoryMB / resources.totalMemoryMB) * 100

    if (projectedMemoryPercent > this.resourceLimits.maxMemoryPercent) {
      this.emit('resource:warning', {
        resource: 'memory',
        current: projectedMemoryPercent,
        limit: this.resourceLimits.maxMemoryPercent,
      })
      return false
    }

    // Check CPU
    if (resources.cpuUsagePercent > this.resourceLimits.maxCpuPercent) {
      this.emit('resource:warning', {
        resource: 'cpu',
        current: resources.cpuUsagePercent,
        limit: this.resourceLimits.maxCpuPercent,
      })
      return false
    }

    // Check disk space
    if (resources.diskSpaceAvailableMB < this.resourceLimits.minDiskSpaceMB) {
      this.emit('resource:warning', {
        resource: 'disk',
        current: resources.diskSpaceAvailableMB,
        limit: this.resourceLimits.minDiskSpaceMB,
      })
      return false
    }

    return true
  }

  getSystemResources(): SystemResources {
    return this.getSystemInfo()
  }

  getResourceUsagePercent(): {
    memory: number
    cpu: number
    disk: number
  } {
    const resources = this.getSystemInfo()

    return {
      memory: ((resources.totalMemoryMB - resources.availableMemoryMB) /
        resources.totalMemoryMB) *
        100,
      cpu: resources.cpuUsagePercent,
      disk: ((resources.diskSpaceAvailableMB > 0 ? 1 : 0) * 100) as any, // Simplified
    }
  }

  checkHealth(): { healthy: boolean; warnings: string[] } {
    const resources = this.getSystemInfo()
    const warnings: string[] = []

    const memoryPercent = ((resources.totalMemoryMB - resources.availableMemoryMB) /
      resources.totalMemoryMB) *
      100

    if (memoryPercent > this.resourceLimits.maxMemoryPercent) {
      warnings.push(`Memory usage (${memoryPercent.toFixed(1)}%) exceeds limit`)
    }

    if (resources.cpuUsagePercent > this.resourceLimits.maxCpuPercent) {
      warnings.push(`CPU usage (${resources.cpuUsagePercent}%) exceeds limit`)
    }

    if (resources.diskSpaceAvailableMB < this.resourceLimits.minDiskSpaceMB) {
      warnings.push(
        `Disk space (${resources.diskSpaceAvailableMB}MB) below minimum (${this.resourceLimits.minDiskSpaceMB}MB)`
      )
    }

    return {
      healthy: warnings.length === 0,
      warnings,
    }
  }

  estimateJobDuration(inputSizeBytes: number, outputResolution: string = '1080p'): number {
    // Heuristic: rough estimate of processing time
    // Real implementation would use job history
    const baseDurationMs = 30000 // 30 seconds base
    const sizeFactor = inputSizeBytes / (1024 * 1024 * 100) // per 100MB
    const resolutionFactor = outputResolution === '4k' ? 3 : outputResolution === '720p' ? 0.5 : 1

    return Math.round(baseDurationMs * (1 + sizeFactor) * resolutionFactor)
  }

  setLimits(limits: Partial<ResourceLimits>): void {
    this.resourceLimits = {
      ...this.resourceLimits,
      ...limits,
    }
  }

  getLimits(): ResourceLimits {
    return { ...this.resourceLimits }
  }

  clearCache(): void {
    this.cachedResources = null
    this.lastSystemCheck = 0
  }
}

export function createResourceManager(limits?: ResourceLimits): ResourceManager {
  return new ResourceManager(limits)
}
