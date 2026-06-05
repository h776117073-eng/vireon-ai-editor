import { spawn, execSync } from 'child_process'
import { EventEmitter } from 'events'
import type { RenderError } from '../types'
import { RenderEngineError, FFmpegError } from '../errors'

export type FFmpegProgress = {
  frame?: number
  fps?: number
  size?: string
  time?: string
  speed?: string
  progress?: number
  bitrate?: string
}

export type HardwareAccelerator = 'none' | 'nvidia' | 'intel' | 'apple'

export interface FFmpegOptions {
  ffmpegPath?: string
  timeout?: number
  enableHardwareAccel?: boolean
  validateCodecs?: boolean
}

export class FFmpegDriver extends EventEmitter {
  private ffmpegPath: string
  private timeout: number
  private enableHardwareAccel: boolean
  private validateCodecs: boolean
  private hardwareAccelerator: HardwareAccelerator = 'none'
  private availableCodecs: Set<string> = new Set()
  private isReady: boolean = false

  constructor(options: FFmpegOptions = {}) {
    super()
    this.ffmpegPath = options.ffmpegPath || 'ffmpeg'
    this.timeout = options.timeout || 600000 // 10 minutes default
    this.enableHardwareAccel = options.enableHardwareAccel ?? true
    this.validateCodecs = options.validateCodecs ?? true
  }

  async initialize(): Promise<void> {
    if (this.isReady) return

    try {
      await this.checkFFmpegAvailable()
      if (this.enableHardwareAccel) {
        await this.detectHardwareAccelerator()
      }
      if (this.validateCodecs) {
        await this.loadAvailableCodecs()
      }
      this.isReady = true
      this.emit('ready')
    } catch (error) {
      throw new RenderEngineError('FFMPEG_NOT_FOUND', `FFmpeg initialization failed: ${error}`)
    }
  }

  private async checkFFmpegAvailable(): Promise<void> {
    try {
      const result = execSync(`${this.ffmpegPath} -version`, { encoding: 'utf-8' })
      if (!result.includes('ffmpeg version')) {
        throw new Error('Invalid FFmpeg output')
      }
    } catch {
      throw new RenderEngineError('FFMPEG_NOT_FOUND', `FFmpeg not found at: ${this.ffmpegPath}`)
    }
  }

  private async detectHardwareAccelerator(): Promise<void> {
    try {
      // Try NVIDIA CUDA
      try {
        const nvidia = execSync(`${this.ffmpegPath} -codecs 2>/dev/null | grep cuda`, {
          encoding: 'utf-8',
        })
        if (nvidia) {
          this.hardwareAccelerator = 'nvidia'
          this.emit('hardware:detected', { accelerator: 'nvidia' })
          return
        }
      } catch {
        // NVIDIA not available
      }

      // Try Intel QSV (Quick Sync Video)
      try {
        const intel = execSync(`${this.ffmpegPath} -codecs 2>/dev/null | grep qsv`, {
          encoding: 'utf-8',
        })
        if (intel) {
          this.hardwareAccelerator = 'intel'
          this.emit('hardware:detected', { accelerator: 'intel' })
          return
        }
      } catch {
        // Intel not available
      }

      // Try Apple VideoToolbox
      try {
        const apple = execSync(`${this.ffmpegPath} -codecs 2>/dev/null | grep videotoolbox`, {
          encoding: 'utf-8',
        })
        if (apple) {
          this.hardwareAccelerator = 'apple'
          this.emit('hardware:detected', { accelerator: 'apple' })
          return
        }
      } catch {
        // Apple not available
      }
    } catch (error) {
      console.warn(`Hardware acceleration detection failed: ${error}`)
      this.hardwareAccelerator = 'none'
    }
  }

  private async loadAvailableCodecs(): Promise<void> {
    try {
      const output = execSync(`${this.ffmpegPath} -codecs -hide_banner 2>&1`, {
        encoding: 'utf-8',
      })

      const lines = output.split('\n')
      for (const line of lines) {
        const match = line.match(/\s([a-z0-9_]+)\s/)
        if (match) {
          this.availableCodecs.add(match[1])
        }
      }
    } catch (error) {
      console.warn(`Failed to load available codecs: ${error}`)
    }
  }

  isCodecAvailable(codec: string): boolean {
    return this.availableCodecs.has(codec)
  }

  getHardwareAccelerator(): HardwareAccelerator {
    return this.hardwareAccelerator
  }

  async run(
    args: string[],
    onProgress?: (progress: FFmpegProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    if (!this.isReady) {
      await this.initialize()
    }

    return new Promise<void>((resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout | null = null
      let isAborted = false

      try {
        const proc = spawn(this.ffmpegPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        const stderrChunks: string[] = []
        let lastProgressTime = Date.now()

        const parseProgress = (line: string): void => {
          if (!line.trim()) return

          const progress: FFmpegProgress = {}

          if (/frame=\s*([0-9]+)/.test(line)) progress.frame = Number(RegExp.$1)
          if (/fps=\s*([0-9.]+)/.test(line)) progress.fps = Number(RegExp.$1)
          if (/size=\s*([0-9.]+[kMG]B)/.test(line)) progress.size = RegExp.$1
          if (/time=\s*([0-9:.]+)/.test(line)) progress.time = RegExp.$1
          if (/speed=\s*([0-9.]+x)/.test(line)) progress.speed = RegExp.$1
          if (/bitrate=\s*([0-9.]+[kMG]bps)/.test(line)) progress.bitrate = RegExp.$1

          if (Object.keys(progress).length > 0 && onProgress) {
            lastProgressTime = Date.now()
            onProgress(progress)
            this.emit('progress', progress)
          }
        }

        const stderrHandler = (data: Buffer): void => {
          const text = data.toString()
          stderrChunks.push(text)
          text.split(/\r?\n/).forEach((line) => parseProgress(line))
        }

        const cleanupHandlers = (): void => {
          if (timeoutHandle) clearTimeout(timeoutHandle)
          proc.stderr.removeListener('data', stderrHandler)
        }

        // Set timeout
        timeoutHandle = setTimeout(() => {
          isAborted = true
          proc.kill('SIGTERM')
          reject(new FFmpegError('FFmpeg process timeout', { timeout: this.timeout }))
        }, this.timeout)

        proc.stderr.on('data', stderrHandler)

        proc.on('error', (error) => {
          cleanupHandlers()
          reject(
            new FFmpegError(`FFmpeg process error: ${error.message}`, { originalError: error })
          )
        })

        proc.on('close', (code) => {
          cleanupHandlers()

          if (isAborted) return // Already rejected due to timeout

          if (code === 0) {
            this.emit('complete')
            resolve()
          } else if (code === 143 || code === 137) {
            // SIGTERM or SIGKILL
            reject(new FFmpegError('FFmpeg process was terminated'))
          } else {
            const errorOutput = stderrChunks.join('')
            reject(
              new FFmpegError(`FFmpeg exited with code ${code}`, {
                code,
                stderr: errorOutput.slice(-500), // Last 500 chars
              })
            )
          }
        })

        // Handle abort signal
        if (abortSignal) {
          if (abortSignal.aborted) {
            cleanupHandlers()
            proc.kill('SIGTERM')
            reject(new Error('Operation aborted'))
          } else {
            const abortListener = (): void => {
              isAborted = true
              cleanupHandlers()
              proc.kill('SIGTERM')
            }
            abortSignal.addEventListener('abort', abortListener)
            proc.once('close', () => {
              abortSignal.removeEventListener('abort', abortListener)
            })
          }
        }
      } catch (error) {
        reject(new FFmpegError(`Failed to spawn FFmpeg: ${error}`, { error: String(error) }))
      }
    })
  }

  getAvailableCodecs(): string[] {
    return Array.from(this.availableCodecs)
  }

  isReady(): boolean {
    return this.isReady
  }
}
