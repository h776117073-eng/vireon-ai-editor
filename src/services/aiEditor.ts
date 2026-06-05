import { EditJobRequest } from '@/types/chat'
import type { AIEditJob, RenderJob } from './render-engine/types'

type ProgressCb = (progress: number) => void
type StatusCb = (status: string) => void

// Simple UUID v4 generator (no external dependencies)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Global render engine instance (will be initialized on first use)
let renderEngine: any = null

async function getRenderEngine() {
  if (renderEngine) return renderEngine

  try {
    // Lazy load render engine when needed
    const { RenderEngine } = await import('./render-engine/engine')

    renderEngine = new RenderEngine({
      concurrency: 2,
      cacheDirectory: './vireon-render-cache',
      persistenceDirectory: './.vireon-jobs',
      maxQueueSize: 100,
      maxRetries: 2,
      cacheTimeoutHours: 24,
    })

    await renderEngine.initialize()

    return renderEngine
  } catch (error) {
    console.error('Failed to initialize render engine:', error)
    throw error
  }
}

// Fallback simulation if engine fails (for demo purposes)
function simulateJob(req: EditJobRequest, onProgress?: ProgressCb, onStatus?: StatusCb): Promise<string> {
  return new Promise((resolve, reject) => {
    let progress = 0
    onStatus?.('queued')

    const start = setTimeout(() => {
      onStatus?.('processing')
      const iv = setInterval(() => {
        progress += Math.floor(Math.random() * 12) + 5
        if (progress >= 100) progress = 100
        onProgress?.(progress)
        if (progress >= 100) {
          clearInterval(iv)
          setTimeout(() => {
            onStatus?.('completed')
            const summary = req.tasks
              ? encodeURIComponent(JSON.stringify(req.tasks).slice(0, 400))
              : ''
            const previewUrl = req.sourceVideo
              ? `${req.sourceVideo}#preview=${summary}`
              : `preview://rendered?summary=${summary}`
            resolve(previewUrl)
          }, 800)
        }
      }, 600)
    }, 500)

    const kill = setTimeout(() => {
      clearTimeout(start)
      reject(new Error('Job timed out'))
    }, 1000 * 60 * 5)
  })
}

/**
 * Submit an AI editing job to the render engine
 * @param req - Edit job request with tasks and video info
 * @param onProgress - Callback for progress updates (0-100)
 * @param onStatus - Callback for status changes
 * @returns Promise with the output file path
 */
export async function submitEditJob(
  req: EditJobRequest,
  onProgress?: ProgressCb,
  onStatus?: StatusCb
): Promise<string> {
  try {
    const engine = await getRenderEngine()

    const jobId = uuidv4()

    // Create AI edit job
    const job: AIEditJob = {
      id: jobId,
      type: 'ai_edit',
      inputPath: req.sourceVideo,
      outputPath: `./renders/${jobId}.mp4`,
      status: 'pending',
      priority: 'high',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tasks: req.tasks || [],
      retryCount: 0,
      maxRetries: 2,
      previewMode: req.previewMode ?? false,
    }

    // Track job progress through engine events
    const onJobProgress = (event: any) => {
      if (event.jobId === jobId) {
        const progressPercent = Math.round((event.progress || 0) * 100)
        onProgress?.(progressPercent)
      }
    }

    const onJobCompleted = (event: any) => {
      if (event.jobId === jobId) {
        onStatus?.('completed')
        onProgress?.(100)
        engine.removeListener('job:progress', onJobProgress)
        engine.removeListener('job:completed', onJobCompleted)
        engine.removeListener('job:failed', onJobFailed)
      }
    }

    const onJobFailed = (event: any) => {
      if (event.jobId === jobId) {
        onStatus?.('failed')
        engine.removeListener('job:progress', onJobProgress)
        engine.removeListener('job:completed', onJobCompleted)
        engine.removeListener('job:failed', onJobFailed)
      }
    }

    // Set up listeners
    engine.on('job:progress', onJobProgress)
    engine.on('job:completed', onJobCompleted)
    engine.on('job:failed', onJobFailed)

    // Submit job
    onStatus?.('queued')
    engine.enqueueAIEdit(job)

    // Wait for job to complete
    return new Promise((resolve, reject) => {
      const completeHandler = (event: any) => {
        if (event.jobId === jobId) {
          engine.removeListener('job:completed', completeHandler)
          engine.removeListener('job:failed', failHandler)
          resolve(event.job.outputPath)
        }
      }

      const failHandler = (event: any) => {
        if (event.jobId === jobId) {
          engine.removeListener('job:completed', completeHandler)
          engine.removeListener('job:failed', failHandler)
          reject(new Error(`Job failed: ${event.error?.message || 'Unknown error'}`))
        }
      }

      engine.on('job:completed', completeHandler)
      engine.on('job:failed', failHandler)

      // Timeout after 10 minutes
      setTimeout(() => {
        engine.removeListener('job:completed', completeHandler)
        engine.removeListener('job:failed', failHandler)
        reject(new Error('Job timed out'))
      }, 600000)
    })
  } catch (error) {
    console.warn('Real render engine not available, using fallback simulation:', error)
    // Fall back to simulation if engine fails
    return simulateJob(req, onProgress, onStatus)
  }
}

/**
 * Get the global render engine instance
 */
export async function getEngineInstance() {
  return getRenderEngine()
}

/**
 * Shutdown the render engine gracefully
 */
export async function shutdownEngine() {
  if (renderEngine) {
    await renderEngine.gracefulShutdown()
    renderEngine = null
  }
}

