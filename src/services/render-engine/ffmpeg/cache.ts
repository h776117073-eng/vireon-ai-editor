import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { EventEmitter } from 'events'
import type { CacheEntry, CacheStats } from '../types'

export interface CacheOptions {
  baseDir?: string
  maxSizeMB?: number
  ttlHours?: number
  cleanupIntervalMs?: number
}

export class TempCache extends EventEmitter {
  private baseDir: string
  private maxSizeBytes: number
  private ttlMs: number
  private cacheIndex: Map<string, CacheEntry> = new Map()
  private cleanupTimer: NodeJS.Timeout | null = null
  private isInitialized: boolean = false

  constructor(options: CacheOptions = {}) {
    super()
    this.baseDir = options.baseDir ?? path.join(os.tmpdir(), 'vireon-render-cache')
    this.maxSizeBytes = (options.maxSizeMB ?? 5000) * 1024 * 1024
    this.ttlMs = (options.ttlHours ?? 24) * 60 * 60 * 1000
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    await this.ensureDirectory()
    await this.rebuildIndex()
    this.startCleanupTimer()
    this.isInitialized = true
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true })
    } catch (error) {
      console.error(`Failed to create cache directory: ${error}`)
    }
  }

  private async rebuildIndex(): Promise<void> {
    try {
      const files = await fs.readdir(this.baseDir)

      for (const file of files) {
        const filePath = path.join(this.baseDir, file)

        try {
          const stats = await fs.stat(filePath)
          const entry: CacheEntry = {
            key: file,
            filePath,
            size: stats.size,
            createdAt: stats.birthtimeMs || stats.mtimeMs,
            accessedAt: stats.mtimeMs,
            expiresAt: stats.mtimeMs + this.ttlMs,
            hits: 0,
          }
          this.cacheIndex.set(file, entry)
        } catch (error) {
          console.error(`Failed to stat cache file ${file}: ${error}`)
        }
      }
    } catch (error) {
      console.error(`Failed to rebuild cache index: ${error}`)
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch((error) => console.error(`Cleanup failed: ${error}`))
    }, 60000) // Run cleanup every minute

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      const now = Date.now()
      const expired: string[] = []
      let totalSize = 0

      // Mark expired entries
      for (const [key, entry] of this.cacheIndex) {
        if (entry.expiresAt < now) {
          expired.push(key)
        } else {
          totalSize += entry.size
        }
      }

      // Remove expired files
      for (const key of expired) {
        const entry = this.cacheIndex.get(key)
        if (entry) {
          await this.removeEntry(key)
        }
      }

      // LRU eviction if over quota
      if (totalSize > this.maxSizeBytes) {
        await this.evictLRU(totalSize - this.maxSizeBytes)
      }

      if (expired.length > 0) {
        this.emit('cleanup', { entriesRemoved: expired.length, freedBytes: 0 })
      }
    } catch (error) {
      console.error(`Cache cleanup error: ${error}`)
    }
  }

  private async evictLRU(bytesToFree: number): Promise<void> {
    // Sort by access time (least recently used first)
    const sorted = Array.from(this.cacheIndex.entries())
      .sort((a, b) => a[1].accessedAt - b[1].accessedAt)

    let freedBytes = 0

    for (const [key, entry] of sorted) {
      if (freedBytes >= bytesToFree) break

      await this.removeEntry(key)
      freedBytes += entry.size
    }
  }

  private async removeEntry(key: string): Promise<void> {
    const entry = this.cacheIndex.get(key)
    if (!entry) return

    try {
      await fs.unlink(entry.filePath)
      this.cacheIndex.delete(key)
    } catch (error) {
      console.error(`Failed to remove cache entry ${key}: ${error}`)
    }
  }

  async createTempPath(filename: string, extension: string = '.mp4'): Promise<string> {
    if (!this.isInitialized) await this.initialize()

    await this.ensureDirectory()

    const safeFile = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9-_]/g, '_')}${extension}`
    const filePath = path.join(this.baseDir, safeFile)

    const entry: CacheEntry = {
      key: safeFile,
      filePath,
      size: 0,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      expiresAt: Date.now() + this.ttlMs,
      hits: 0,
    }

    this.cacheIndex.set(safeFile, entry)

    return filePath
  }

  async getFile(key: string): Promise<Buffer | null> {
    const entry = this.cacheIndex.get(key)
    if (!entry) return null

    try {
      const now = Date.now()

      // Check if expired
      if (entry.expiresAt < now) {
        await this.removeEntry(key)
        return null
      }

      const data = await fs.readFile(entry.filePath)

      // Update access info
      entry.accessedAt = now
      entry.hits++

      return data
    } catch (error) {
      console.error(`Failed to read cache file ${key}: ${error}`)
      return null
    }
  }

  async putFile(key: string, data: Buffer): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, key)
      await fs.writeFile(filePath, data)

      const entry: CacheEntry = {
        key,
        filePath,
        size: data.length,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        expiresAt: Date.now() + this.ttlMs,
        hits: 0,
      }

      this.cacheIndex.set(key, entry)
    } catch (error) {
      console.error(`Failed to write cache file ${key}: ${error}`)
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const entry = this.cacheIndex.get(key)
    if (!entry) return false

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      await this.removeEntry(key)
      return false
    }

    try {
      await fs.access(entry.filePath)
      return true
    } catch {
      await this.removeEntry(key)
      return false
    }
  }

  getStats(): CacheStats {
    let totalSize = 0
    let hits = 0
    let misses = 0
    let oldestTime = Date.now()

    for (const entry of this.cacheIndex.values()) {
      totalSize += entry.size
      hits += entry.hits
      oldestTime = Math.min(oldestTime, entry.createdAt)
    }

    return {
      totalSize,
      entryCount: this.cacheIndex.size,
      hits,
      misses,
      hitRate: hits + misses > 0 ? hits / (hits + misses) : 0,
      oldestEntryAge: Date.now() - oldestTime,
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Remove all files
      const entries = Array.from(this.cacheIndex.keys())
      for (const key of entries) {
        await this.removeEntry(key)
      }

      // Stop cleanup timer
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer)
        this.cleanupTimer = null
      }
    } catch (error) {
      console.error(`Cleanup failed: ${error}`)
    }
  }

  async destroy(): Promise<void> {
    await this.cleanup()

    try {
      await fs.rm(this.baseDir, { recursive: true, force: true })
    } catch {
      // ignore
    }

    this.removeAllListeners()
  }

  getIndexSize(): number {
    return this.cacheIndex.size
  }

  getCacheDir(): string {
    return this.baseDir
  }

  setTTL(hours: number): void {
    this.ttlMs = hours * 60 * 60 * 1000
  }

  setMaxSize(mb: number): void {
    this.maxSizeBytes = mb * 1024 * 1024
  }
}
