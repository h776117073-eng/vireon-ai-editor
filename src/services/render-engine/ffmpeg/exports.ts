import path from 'path'
import fs from 'fs/promises'
import type { ExportJob, AIEditJob, RenderTask } from '../types'
import type { FFmpegDriver } from './ffmpegDriver'
import { PresetManager, type QualityLevel } from './presets'

function buildTaskFilters(tasks: RenderTask[]): string {
  const filters: string[] = []

  for (const task of tasks) {
    switch (task.type) {
      case 'color_grade':
        const { style = 'warm' } = task.params ?? {}
        // Simple color grading filter
        if (style === 'warm') {
          filters.push('colortemperature=3000')
        } else if (style === 'cool') {
          filters.push('colortemperature=7000')
        }
        break
      case 'color_adjust':
        const { brightness = 0, contrast = 1 } = task.params ?? {}
        filters.push(`eq=brightness=${brightness}:contrast=${contrast}`)
        break
      case 'scale':
        const { width = 1280, height = 720 } = task.params ?? {}
        filters.push(`scale=${width}:${height}`)
        break
      case 'background_replace':
        // Placeholder - would require proper chroma key/green screen processing
        filters.push('format=yuv420p')
        break
      case 'motion_track':
        // Placeholder - motion tracking requires external processing
        break
      case 'object_removal':
        // Placeholder - would use AI inpainting or content-aware fill
        break
      case 'audio_enhancement':
        // Audio enhancement - usually applied to audio stream
        break
      case 'subtitles':
        // Subtitles - handled separately with -vf and -af
        break
      case 'effects':
        const { name = 'blur' } = task.params ?? {}
        if (name === 'blur') {
          filters.push('boxblur=2:1')
        } else if (name === 'sharpen') {
          filters.push('unsharp=3:3:1:1')
        }
        break
      case 'speed_ramping':
        // Speed ramping requires multiple segments - would need setpts filter
        break
      case 'transition':
        // Transitions require cross-fade filter
        filters.push('fade=t=in:st=0:d=0.5')
        break
      default:
        break
    }
  }

  return filters.filter(Boolean).join(',')
}

export interface BatchExportOptions {
  formats: Array<{ format: string; quality?: QualityLevel }>
  includeMetadata?: boolean
  includeThumbnail?: boolean
}

export class ExportManager {
  constructor(private driver: FFmpegDriver, private cacheDir: string) {}

  async export(
    job: ExportJob | AIEditJob,
    abortSignal?: AbortSignal,
    onProgress?: (jobProgress: number, metadata: Record<string, any>) => void
  ): Promise<string> {
    await fs.mkdir(path.dirname(job.outputPath), { recursive: true })

    const format = job.type === 'export' ? (job as ExportJob).exportOptions?.format ?? 'mp4' : 'mp4'
    const outputPath = job.outputPath.endsWith(`.${format}`)
      ? job.outputPath
      : `${job.outputPath}.${format}`

    // Determine quality level
    const quality: QualityLevel = (job.metadata?.quality as QualityLevel) || 'standard'

    // Get preset for the format
    let args: string[] = ['-y', '-i', job.inputPath]

    // Apply filters if tasks exist
    const filters = job.tasks ? buildTaskFilters(job.tasks) : ''
    if (filters) {
      args.push('-vf', filters)
    }

    // Apply codec preset
    if (format === 'mp4') {
      const preset = PresetManager.getVideoPreset(quality, 'h264')
      const audio = PresetManager.getAudioPreset('aac')

      args.push('-c:v', preset.codec)
      if (preset.crf) args.push('-crf', String(preset.crf))
      if (preset.preset) args.push('-preset', preset.preset)
      if (preset.bitrate) args.push('-b:v', preset.bitrate)

      args.push('-c:a', audio.codec)
      if (audio.bitrate) args.push('-b:a', audio.bitrate)

      // Optimize for streaming
      args.push('-movflags', '+faststart')
    } else if (format === 'mov') {
      const preset = PresetManager.getVideoPreset(quality, 'prores')
      args.push('-c:v', preset.codec)
      args.push('-c:a', 'aac')
    } else if (format === 'webm') {
      const preset = PresetManager.getVideoPreset(quality, 'vp9')
      args.push('-c:v', preset.codec)
      args.push('-c:a', 'opus')
    }

    args.push(outputPath)

    let lastProgress = 0

    await this.driver.run(
      args,
      (progress) => {
        if (progress.frame) {
          // Estimate progress based on output file size
          const newProgress = Math.min(0.95, 0.5 + (progress.frame / 10000) * 0.45)
          if (newProgress > lastProgress) {
            lastProgress = newProgress
            job.progress = newProgress
            job.metadata = { ...job.metadata, lastProgress: progress }
            onProgress?.(newProgress, job.metadata ?? {})
          }
        }
      },
      abortSignal
    )

    job.progress = 1
    job.outputPath = outputPath
    onProgress?.(1, { format, quality, outputPath })

    return outputPath
  }

  async exportBatch(
    inputPath: string,
    outputDir: string,
    baseName: string,
    options: BatchExportOptions,
    abortSignal?: AbortSignal,
    onProgress?: (jobId: string, progress: number) => void
  ): Promise<string[]> {
    const outputs: string[] = []

    for (let i = 0; i < options.formats.length; i++) {
      const { format, quality = 'standard' } = options.formats[i]

      const outputPath = path.join(outputDir, `${baseName}.${format}`)
      const jobId = `batch-${i}`

      const args = ['-y', '-i', inputPath]

      // Apply preset
      const preset = PresetManager.getVideoPreset(quality, format as any)
      args.push('-c:v', preset.codec)
      if (preset.crf) args.push('-crf', String(preset.crf))
      if (preset.preset) args.push('-preset', preset.preset)
      args.push('-c:a', 'aac')
      args.push('-movflags', '+faststart')

      args.push(outputPath)

      await this.driver.run(
        args,
        (progress) => {
          const jobProgress = (i / options.formats.length) + ((progress.frame || 0) / 1000) / options.formats.length
          onProgress?.(jobId, Math.min(jobProgress, 1.0))
        },
        abortSignal
      )

      outputs.push(outputPath)
    }

    return outputs
  }

  async exportSocialMedia(
    inputPath: string,
    outputDir: string,
    platform: string,
    abortSignal?: AbortSignal,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    await fs.mkdir(outputDir, { recursive: true })

    const preset = PresetManager.getSocialMediaPreset(platform)
    const outputPath = path.join(outputDir, `${platform}-export.${preset.container}`)

    const args = PresetManager.buildSocialMediaFFmpegArgs(inputPath, outputPath, platform)

    await this.driver.run(args, (progress) => {
      if (progress.frame) {
        const frameEstimate = 5000 // Rough estimate
        onProgress?.(Math.min((progress.frame / frameEstimate) * 0.95, 0.95))
      }
    }, abortSignal)

    onProgress?.(1)
    return outputPath
  }
}
