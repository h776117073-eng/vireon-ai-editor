import type { AIEditJob, EditorTask, RenderError } from '../types'
import { RenderEngineError } from '../errors'
import type { FFmpegDriver } from './ffmpegDriver'

export interface AIEditResult {
  jobId: string
  success: boolean
  outputPath: string
  processedTasks: EditorTask[]
  failedTasks: Array<{ task: EditorTask; error: RenderError | Error }>
  metadata: Record<string, any>
}

export interface TaskExecutor {
  execute(task: EditorTask, input: string, output: string, signal?: AbortSignal): Promise<string>
}

export class AIEditOrchestrator {
  private taskExecutors: Map<string, TaskExecutor> = new Map()

  constructor(private driver: FFmpegDriver, private cacheDir: string) {}

  registerTaskExecutor(taskType: string, executor: TaskExecutor): void {
    this.taskExecutors.set(taskType, executor)
  }

  async executeJob(
    job: AIEditJob,
    onProgress?: (progress: number, metadata?: Record<string, any>) => void,
    abortSignal?: AbortSignal
  ): Promise<AIEditResult> {
    const processedTasks: EditorTask[] = []
    const failedTasks: Array<{ task: EditorTask; error: RenderError | Error }> = []

    if (!job.tasks || job.tasks.length === 0) {
      return {
        jobId: job.id,
        success: true,
        outputPath: job.inputPath,
        processedTasks: [],
        failedTasks: [],
        metadata: { message: 'No tasks to process' },
      }
    }

    let currentInput = job.inputPath
    let currentOutput = job.inputPath

    for (let i = 0; i < job.tasks.length; i++) {
      if (abortSignal?.aborted) {
        break
      }

      const task = job.tasks[i]
      const progress = (i / job.tasks.length) * 0.95 + 0.05

      try {
        onProgress?.(progress, { currentTask: task.type, taskIndex: i + 1, totalTasks: job.tasks.length })

        // Get executor for this task type
        const executor = this.taskExecutors.get(task.type)

        if (!executor) {
          // Try default execution if no specific executor
          currentOutput = await this.executeDefaultTask(task, currentInput, currentOutput, abortSignal)
        } else {
          // Use registered executor
          currentOutput = await executor.execute(task, currentInput, currentOutput, abortSignal)
        }

        processedTasks.push(task)
        currentInput = currentOutput // Output becomes input for next task
      } catch (error) {
        const renderError = error instanceof RenderEngineError ? error.toJSON() : (error as Error)
        failedTasks.push({ task, error: renderError })

        if (task.critical) {
          // Stop processing if critical task fails
          break
        }
        // Otherwise continue with next task
      }
    }

    onProgress?.(1.0, { processedTasks: processedTasks.length, failedTasks: failedTasks.length })

    return {
      jobId: job.id,
      success: failedTasks.length === 0,
      outputPath: currentOutput,
      processedTasks,
      failedTasks,
      metadata: {
        tasksExecuted: processedTasks.length,
        tasksFailed: failedTasks.length,
        timestamp: Date.now(),
      },
    }
  }

  private async executeDefaultTask(
    task: EditorTask,
    inputPath: string,
    outputPath: string,
    abortSignal?: AbortSignal
  ): Promise<string> {
    // Default implementation for common tasks
    const args: string[] = ['-y', '-i', inputPath]

    let videoFilters: string[] = []

    switch (task.type) {
      case 'color_grade':
        const { style = 'warm' } = (task as any).params ?? {}
        if (style === 'warm') {
          videoFilters.push('colortemperature=3000')
        } else if (style === 'cool') {
          videoFilters.push('colortemperature=7000')
        }
        break

      case 'background_replace':
        // Placeholder - actual implementation would use AI-based matting
        console.warn('background_replace requires AI processing - skipping')
        return inputPath

      case 'motion_track':
        // Placeholder - would integrate with motion tracking service
        console.warn('motion_track requires AI processing - skipping')
        return inputPath

      case 'object_removal':
        // Placeholder - would use inpainting or content-aware fill
        console.warn('object_removal requires AI processing - skipping')
        return inputPath

      case 'audio_enhancement':
        const { style: audioStyle = 'normalize' } = (task as any).params ?? {}
        if (audioStyle === 'normalize') {
          args.push('-af', 'loudnorm')
        }
        break

      case 'subtitles':
        console.warn('subtitles processing requires separate subtitle file handling')
        return inputPath

      case 'effects':
        const { name = 'blur' } = (task as any).params ?? {}
        if (name === 'blur') {
          videoFilters.push('boxblur=2:1')
        } else if (name === 'sharpen') {
          videoFilters.push('unsharp=3:3:1:1')
        }
        break

      case 'speed_ramping':
        console.warn('speed_ramping requires complex filter chains - skipping')
        return inputPath

      case 'transition':
        console.warn('transition requires clip composition - skipping')
        return inputPath

      default:
        throw new RenderEngineError(
          'INVALID_PARAMETERS',
          `Unknown task type: ${task.type}`
        )
    }

    // Apply video filters if any
    if (videoFilters.length > 0) {
      args.push('-vf', videoFilters.join(','))
    }

    // Copy codecs
    args.push('-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac')

    args.push(outputPath)

    await this.driver.run(args, undefined, abortSignal)

    return outputPath
  }

  registerDefaultExecutors(): void {
    // Register default executors for standard tasks
    this.registerTaskExecutor('color_grade', {
      execute: async (task, input, output) => {
        // Color grading implementation
        return output
      },
    })

    this.registerTaskExecutor('audio_enhancement', {
      execute: async (task, input, output) => {
        // Audio enhancement implementation
        return output
      },
    })
  }
}

export function createAIEditOrchestrator(driver: FFmpegDriver, cacheDir: string): AIEditOrchestrator {
  return new AIEditOrchestrator(driver, cacheDir)
}
