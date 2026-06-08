import { Clip } from '@/types/timeline'

let clipCounter = 0

function generateClipId(): string {
  return `clip_${Date.now()}_${clipCounter++}`
}

export function createClip(
  start: number,
  duration: number,
  overrides?: { label?: string; color?: string }
): Clip {
  return {
    id: generateClipId(),
    start,
    duration,
    label: overrides?.label,
    color: overrides?.color
  }
}

export function createClipFromTemplate(template: Clip, start: number, duration: number): Clip {
  return {
    ...template,
    id: generateClipId(),
    start,
    duration
  }
}
