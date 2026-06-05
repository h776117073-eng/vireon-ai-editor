import path from 'path'
import fs from 'fs/promises'
import type { PreviewJob } from '../types'
import type { FFmpegDriver } from './ffmpegDriver'
import { PresetManager } from './presets'

const DEFAULT_PREVIEW_SETTINGS = {
  durationSeconds: 8,
  width: 640,
  height: 360,
  fps: 24,
}

const THUMBNAIL_SETTINGS = {
  width: 320,
  height: 180,
  count: 6,
}

export class PreviewGenerator {
  constructor(private driver: FFmpegDriver, private cacheDir: string) {}

  async generate(
    job: PreviewJob,
    abortSignal?: AbortSignal,
    onProgress?: (jobProgress: number, metadata: Record<string, any>) => void
  ): Promise<string> {
    const options = {
      ...DEFAULT_PREVIEW_SETTINGS,
      ...job.previewOptions,
    }

    const outputPath = path.join(this.cacheDir, `${job.id}-preview.mp4`)
    await fs.mkdir(path.dirname(outputPath), { recursive: true })

    // Use preset for consistent quality
    const preset = PresetManager.getVideoPreset('standard', 'h264')

    const args = [
      '-y',
      '-i', job.inputPath,
      '-t', String(options.durationSeconds),
      '-vf', `scale=${options.width}:${options.height}`,
      '-r', String(options.fps),
      '-c:v', preset.codec,
      '-preset', preset.preset || 'fast',
      '-crf', String(preset.crf || 23),
      '-pix_fmt', 'yuv420p',
      '-an', // No audio for preview
      outputPath,
    ]

    let framesProcessed = 0
    const estimatedFrames = options.durationSeconds * options.fps

    await this.driver.run(
      args,
      (progress) => {
        if (progress.frame) {
          framesProcessed = progress.frame
          const newProgress = Math.min(0.95, framesProcessed / estimatedFrames)
          job.progress = newProgress
          job.metadata = { ...job.metadata, framesProcessed, fps: progress.fps }
          onProgress?.(newProgress, job.metadata ?? {})
        }
      },
      abortSignal
    )

    job.progress = 1
    job.outputPath = outputPath
    onProgress?.(1, { framesProcessed: estimatedFrames })

    return outputPath
  }

  async generateThumbnails(
    jobId: string,
    inputPath: string,
    abortSignal?: AbortSignal,
    onProgress?: (progress: number) => void
  ): Promise<string[]> {
    const thumbnailDir = path.join(this.cacheDir, `${jobId}-thumbnails`)
    await fs.mkdir(thumbnailDir, { recursive: true })

    const spriteImagePath = path.join(thumbnailDir, 'thumbnail_%03d.jpg')

    // Extract thumbnails at intervals
    const args = [
      '-i', inputPath,
      '-vf', `fps=1/${Math.ceil(10 / THUMBNAIL_SETTINGS.count)},scale=${THUMBNAIL_SETTINGS.width}:${THUMBNAIL_SETTINGS.height}`,
      spriteImagePath,
    ]

    await this.driver.run(args, () => onProgress?.(0.5), abortSignal)

    // Read generated thumbnails
    const files = await fs.readdir(thumbnailDir)
    const thumbnails = files.filter((f) => f.startsWith('thumbnail_')).sort()

    onProgress?.(1)
    return thumbnails.map((f) => path.join(thumbnailDir, f))
  }

  async generateWaveform(
    jobId: string,
    inputPath: string,
    abortSignal?: AbortSignal,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const waveformPath = path.join(this.cacheDir, `${jobId}-waveform.png`)

    // Use FFmpeg filter to generate waveform
    const args = [
      '-i', inputPath,
      '-filter_complex', 'aformat=channel_layouts=mono[a];[a]showwavespic=s=1920x128:colors=blue[wf]',
      '-map', '[wf]',
      '-frames:v', '1',
      waveformPath,
    ]

    await this.driver.run(args, () => onProgress?.(0.5), abortSignal)

    onProgress?.(1)
    return waveformPath
  }
}
