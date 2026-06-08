import { Clip } from '@/types/timeline'
import { createClipFromTemplate } from './clipFactory'

export interface ClipSplitResult {
  clipBefore: Clip
  clipAfter: Clip
}

export interface ClipSplitValidation {
  valid: boolean
  reason?: string
}

export function validateClipSplit(clip: Clip, splitTime: number): ClipSplitValidation {
  const clipEnd = clip.start + clip.duration

  if (splitTime <= clip.start) {
    return {
      valid: false,
      reason: `Split point (${splitTime.toFixed(2)}s) is before clip start (${clip.start.toFixed(2)}s)`
    }
  }

  if (splitTime >= clipEnd) {
    return {
      valid: false,
      reason: `Split point (${splitTime.toFixed(2)}s) is at or after clip end (${clipEnd.toFixed(2)}s)`
    }
  }

  return { valid: true }
}

export function splitClip(clip: Clip, splitTime: number): ClipSplitResult {
  const validation = validateClipSplit(clip, splitTime)
  if (!validation.valid) {
    throw new Error(`Cannot split clip: ${validation.reason}`)
  }

  const clipBefore = createClipFromTemplate(
    clip,
    clip.start,
    splitTime - clip.start
  )

  const clipAfter = createClipFromTemplate(
    clip,
    splitTime,
    clip.start + clip.duration - splitTime
  )

  return { clipBefore, clipAfter }
}

export function findClipUnderPlayhead(clips: Clip[], playheadTime: number): Clip | undefined {
  return clips.find(clip => {
    const clipEnd = clip.start + clip.duration
    return playheadTime > clip.start && playheadTime < clipEnd
  })
}
