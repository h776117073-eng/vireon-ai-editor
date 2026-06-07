// Professional multi-track timeline type definitions
// Supports: main video, overlay video, text, and audio tracks with extensible metadata

export interface Clip {
  id: string
  start: number
  duration: number
  label?: string
  color?: string
}

// All possible track kinds
export type TrackKind = 'main-video' | 'overlay-video' | 'text' | 'audio'

// Extensible metadata for future features (lock, visibility, etc.)
export interface TrackMetadata {
  locked?: boolean // Prevent clip edits when true
  visible?: boolean // Show/hide track in timeline
  muted?: boolean // Audio-specific: mute audio
  opacity?: number // Video-specific: 0-1 opacity
  volume?: number // Audio-specific: 0-1 volume
  fontFamily?: string // Text-specific: font
  fontSize?: number // Text-specific: size
}

// Core track structure with metadata support
export interface Track {
  id: string
  name: string
  kind: TrackKind
  index: number // For reordering (0 = topmost video)
  clips: Clip[]
  metadata: TrackMetadata
}

// Tracks organized by kind for efficient access
export interface TrackGroup {
  videoTracks: Track[] // Main video first, then overlays
  audioTracks: Track[] // Sorted by index
  textTracks: Track[] // Sorted by index
}

// Complete timeline state structure
export interface TimelineState {
  tracks: Track[] // Master list
  trackGroups: TrackGroup // Organized by kind
  duration: number
  selectedTrackId?: string
  selectedClipId?: string | null
  magneticMode: boolean
  playhead: number
  zoom: number
  scrollOffset: number
  viewportWidth: number
}

// Type guards
export function isMainVideoTrack(track: Track): boolean {
  return track.kind === 'main-video'
}

export function isOverlayVideoTrack(track: Track): boolean {
  return track.kind === 'overlay-video'
}

export function isVideoTrack(track: Track): boolean {
  return track.kind === 'main-video' || track.kind === 'overlay-video'
}

export function isAudioTrack(track: Track): boolean {
  return track.kind === 'audio'
}

export function isTextTrack(track: Track): boolean {
  return track.kind === 'text'
}

// Track properties by kind
export const TRACK_KIND_DEFAULTS: Record<TrackKind, TrackMetadata> = {
  'main-video': {
    locked: false,
    visible: true,
    opacity: 1
  },
  'overlay-video': {
    locked: false,
    visible: true,
    opacity: 1
  },
  'text': {
    locked: false,
    visible: true,
    fontFamily: 'Arial',
    fontSize: 24
  },
  'audio': {
    locked: false,
    visible: true,
    muted: false,
    volume: 1
  }
}

export const TRACK_KIND_NAMES: Record<TrackKind, string> = {
  'main-video': 'Main Video',
  'overlay-video': 'Overlay Video',
  'text': 'Text',
  'audio': 'Audio'
}

export const TRACK_KIND_ICONS: Record<TrackKind, string> = {
  'main-video': '🎬',
  'overlay-video': '📹',
  'text': '📝',
  'audio': '🎵'
}
