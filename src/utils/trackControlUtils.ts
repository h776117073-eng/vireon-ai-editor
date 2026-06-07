// Track control enforcement utilities
// Handles hiding, locking, and muting tracks with proper state management

import { Track } from '@/types/timeline'

export interface TrackControlState {
  isHidden: boolean
  isLocked: boolean
  isMuted: boolean
}

export function getTrackControlState(track: Track): TrackControlState {
  return {
    isHidden: track.metadata.visible === false,
    isLocked: track.metadata.locked === true,
    isMuted: track.metadata.muted === true
  }
}

export function canEditTrack(track: Track): boolean {
  return !track.metadata.locked
}

export function canEditClip(track: Track, _clipId: string): boolean {
  // Locked track = no editing
  if (track.metadata.locked) {
    return false
  }
  // Could add per-clip locking in future
  return true
}

export function shouldRenderTrack(track: Track): boolean {
  // Don't render hidden tracks
  return track.metadata.visible !== false
}

export function filterVisibleTracks(tracks: Track[]): Track[] {
  return tracks.filter(shouldRenderTrack)
}

export function getTrackLockReason(track: Track): string | null {
  if (track.metadata.locked) {
    return `Track "${track.name}" is locked. Unlock to edit clips.`
  }
  return null
}

export function getAudioOutputState(track: Track): {
  enabled: boolean
  volume: number
} {
  const isMuted = track.metadata.muted === true
  const volume = track.metadata.volume ?? 1

  return {
    enabled: !isMuted && track.metadata.visible !== false,
    volume: isMuted ? 0 : volume
  }
}

export function validateTrackOperations(
  tracks: Track[],
  trackId: string,
  operation: 'edit' | 'delete' | 'move'
): { allowed: boolean; reason?: string } {
  const track = tracks.find(t => t.id === trackId)
  if (!track) {
    return { allowed: false, reason: 'Track not found' }
  }

  switch (operation) {
    case 'edit':
    case 'delete':
    case 'move':
      if (track.metadata.locked) {
        return {
          allowed: false,
          reason: `Cannot ${operation} a locked track. Unlock it first.`
        }
      }
      return { allowed: true }

    default:
      return { allowed: true }
  }
}
