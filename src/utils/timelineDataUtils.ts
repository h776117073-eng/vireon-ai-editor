// Timeline data structure utilities for multi-track organization

import { Track, TrackKind, TrackGroup, Clip, isVideoTrack, isAudioTrack, isTextTrack } from '@/types/timeline'

export function getTracksByKind(tracks: Track[], kind: TrackKind): Track[] {
  return tracks.filter(t => t.kind === kind).sort((a, b) => a.index - b.index)
}

export function getTrackByKind(tracks: Track[], kind: TrackKind): Track | undefined {
  return tracks.find(t => t.kind === kind)
}

export function getTrackById(tracks: Track[], trackId: string): Track | undefined {
  return tracks.find(t => t.id === trackId)
}

export function organizeTracksByKind(tracks: Track[]): TrackGroup {
  return {
    videoTracks: getTracksByKind(tracks, 'main-video')
      .concat(getTracksByKind(tracks, 'overlay-video')),
    textTracks: getTracksByKind(tracks, 'text'),
    audioTracks: getTracksByKind(tracks, 'audio')
  }
}

export function getAllTracksSorted(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => a.index - b.index)
}

export function getNextAvailableIndex(tracks: Track[]): number {
  if (tracks.length === 0) return 0
  return Math.max(...tracks.map(t => t.index)) + 1
}

export function reorderTrack(tracks: Track[], trackId: string, newIndex: number): Track[] {
  const track = getTrackById(tracks, trackId)
  if (!track) return tracks

  // Remove from current position
  const withoutTrack = tracks.filter(t => t.id !== trackId)

  // Adjust indices
  const adjusted = withoutTrack.map(t => {
    if (newIndex < track.index) {
      // Moving up
      if (t.index >= newIndex && t.index < track.index) {
        return { ...t, index: t.index + 1 }
      }
    } else if (newIndex > track.index) {
      // Moving down
      if (t.index <= newIndex && t.index > track.index) {
        return { ...t, index: t.index - 1 }
      }
    }
    return t
  })

  // Insert at new position
  return [...adjusted, { ...track, index: newIndex }]
}

export function validateTrackStructure(tracks: Track[]): boolean {
  if (tracks.length === 0) return true

  // Check main video exists if any video exists
  const hasVideo = tracks.some(t => t.kind === 'main-video' || t.kind === 'overlay-video')
  if (hasVideo) {
    const hasMainVideo = tracks.some(t => t.kind === 'main-video')
    if (!hasMainVideo) return false
  }

  // Check unique IDs
  const ids = new Set(tracks.map(t => t.id))
  if (ids.size !== tracks.length) return false

  // Check unique indices
  const indices = new Set(tracks.map(t => t.index))
  if (indices.size !== tracks.length) return false

  return true
}

export function getClipsByTrack(tracks: Track[], trackId: string): Clip[] {
  const track = getTrackById(tracks, trackId)
  return track ? track.clips : []
}

export function countTracksByKind(tracks: Track[], kind: TrackKind): number {
  return tracks.filter(t => t.kind === kind).length
}

export function getMainVideoTrack(tracks: Track[]): Track | undefined {
  return tracks.find(t => t.kind === 'main-video')
}

export function getOverlayVideoTracks(tracks: Track[]): Track[] {
  return tracks.filter(t => t.kind === 'overlay-video').sort((a, b) => a.index - b.index)
}

export function getAudioTracks(tracks: Track[]): Track[] {
  return tracks.filter(t => t.kind === 'audio').sort((a, b) => a.index - b.index)
}

export function getTextTracks(tracks: Track[]): Track[] {
  return tracks.filter(t => t.kind === 'text').sort((a, b) => a.index - b.index)
}

export function getTimelineStats(tracks: Track[]): {
  videoCount: number
  audioCount: number
  textCount: number
  totalClips: number
  duration: number
} {
  const videoTracks = tracks.filter(t => t.kind === 'main-video' || t.kind === 'overlay-video')
  const audioTracks = tracks.filter(t => t.kind === 'audio')
  const textTracks = tracks.filter(t => t.kind === 'text')
  const allClips = tracks.flatMap(t => t.clips)

  let maxDuration = 0
  for (const clip of allClips) {
    maxDuration = Math.max(maxDuration, clip.start + clip.duration)
  }

  return {
    videoCount: videoTracks.length,
    audioCount: audioTracks.length,
    textCount: textTracks.length,
    totalClips: allClips.length,
    duration: maxDuration
  }
}
