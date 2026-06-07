// Magnetic timeline utilities for CapCut-style clip management
// Prevents gaps between clips on main track and enables magnetic snapping

import { Track as BaseTrack } from '@/types/timeline'

export interface Clip {
  id: string
  start: number
  duration: number
  label?: string
  color?: string
}

export interface Track extends BaseTrack {
  clips: Clip[]
}

const SNAP_THRESHOLD = 0.2 // seconds - distance to snap adjacent clips

export function isMainTrack(track: BaseTrack): boolean {
  return track.kind === 'main-video'
}

export function calculateMagneticPositions(clips: Clip[]): Clip[] {
  if (clips.length === 0) return []

  const sorted = [...clips].sort((a, b) => a.start - b.start)
  let currentStart = 0

  return sorted.map((clip) => ({
    ...clip,
    start: currentStart,
    duration: clip.duration
  })).reduce((acc, clip, index) => {
    const lastClip = acc[index - 1]
    const newStart = lastClip ? lastClip.start + lastClip.duration : 0
    return [...acc, { ...clip, start: newStart }]
  }, [] as Clip[])
}

export function getClipGaps(clips: Clip[]): Array<{ start: number; end: number; size: number }> {
  if (clips.length < 2) return []

  const sorted = [...clips].sort((a, b) => a.start - b.start)
  const gaps: Array<{ start: number; end: number; size: number }> = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const currentClip = sorted[i]
    const nextClip = sorted[i + 1]
    const gapStart = currentClip.start + currentClip.duration
    const gapEnd = nextClip.start
    const gapSize = gapEnd - gapStart

    if (gapSize > 0.001) {
      gaps.push({ start: gapStart, end: gapEnd, size: gapSize })
    }
  }

  return gaps
}

export function compactClips(clips: Clip[], skipClipId?: string): Clip[] {
  const clipsToProcess = skipClipId
    ? clips.filter(c => c.id !== skipClipId)
    : clips

  return calculateMagneticPositions(clipsToProcess)
}

export function removeClipAndCompact(clips: Clip[], clipId: string): Clip[] {
  const filtered = clips.filter(c => c.id !== clipId)
  return calculateMagneticPositions(filtered)
}

export function insertClipAtPosition(clips: Clip[], clip: Clip, targetIndex: number): Clip[] {
  const newClips = [...clips]
  newClips.splice(targetIndex, 0, clip)
  return calculateMagneticPositions(newClips)
}

export function moveClipMagnetic(clips: Clip[], clipId: string, proposedStart: number): Clip[] {
  // Find the clip being moved
  const clipIndex = clips.findIndex(c => c.id === clipId)
  if (clipIndex === -1) return clips

  const clip = clips[clipIndex]

  // Calculate snap position if close to adjacent clips
  const snapPosition = getSnapTarget(clip, clips, clipId, proposedStart, SNAP_THRESHOLD)
  const finalStart = snapPosition !== null ? snapPosition : proposedStart

  // Update clip with new position
  const updatedClips = clips.map(c =>
    c.id === clipId ? { ...c, start: Math.max(0, finalStart) } : c
  )

  // Re-compact to eliminate gaps
  return calculateMagneticPositions(updatedClips)
}

export function getSnapTarget(
  clip: Clip,
  allClips: Clip[],
  clipId: string,
  proposedStart: number,
  snapThreshold: number = SNAP_THRESHOLD
): number | null {
  const otherClips = allClips.filter(c => c.id !== clipId)

  if (otherClips.length === 0) return null

  // Check snap to left edge of next clip (clip end position)
  for (const other of otherClips) {
    const snapPositions = [
      other.start, // Snap to start of clip
      other.start + other.duration // Snap to end of clip
    ]

    for (const snapPos of snapPositions) {
      const distance = Math.abs(proposedStart - snapPos)
      if (distance < snapThreshold) {
        return snapPos
      }
    }
  }

  return null
}

export function shouldSnap(distance: number, snapThreshold: number = SNAP_THRESHOLD): boolean {
  return distance < snapThreshold
}

export function getVisibleSnapGuides(
  clips: Clip[],
  draggedClipId: string,
  proposedStart: number,
  snapThreshold: number = SNAP_THRESHOLD
): number[] {
  const draggedClip = clips.find(c => c.id === draggedClipId)
  if (!draggedClip) return []

  const guides: number[] = []
  const otherClips = clips.filter(c => c.id !== draggedClipId)

  for (const other of otherClips) {
    const positions = [other.start, other.start + other.duration]

    for (const pos of positions) {
      if (shouldSnap(Math.abs(proposedStart - pos), snapThreshold)) {
        guides.push(pos)
      }
    }
  }

  return [...new Set(guides)] // Remove duplicates
}

export function findClipAtPosition(clips: Clip[], time: number): Clip | null {
  return clips.find(c => time >= c.start && time < c.start + c.duration) || null
}

export function getAdjacentClips(clips: Clip[], clipId: string): { prev?: Clip; next?: Clip } {
  const sortedClips = [...clips].sort((a, b) => a.start - b.start)
  const index = sortedClips.findIndex(c => c.id === clipId)

  if (index === -1) return {}

  return {
    prev: index > 0 ? sortedClips[index - 1] : undefined,
    next: index < sortedClips.length - 1 ? sortedClips[index + 1] : undefined
  }
}

export function getTotalDuration(clips: Clip[]): number {
  if (clips.length === 0) return 0
  const sorted = [...clips].sort((a, b) => a.start - b.start)
  const lastClip = sorted[sorted.length - 1]
  return lastClip.start + lastClip.duration
}
