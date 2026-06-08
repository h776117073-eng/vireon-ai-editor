// Factory functions for creating tracks of different kinds

import { Track, TrackKind, TrackMetadata, Clip, TRACK_KIND_DEFAULTS } from '@/types/timeline'
import { createClip } from './clipFactory'

function generateId(kind: TrackKind, index: number): string {
  const prefix = kind.replace('-', '_')
  return `track_${prefix}_${index + 1}`
}

function getDefaultName(kind: TrackKind, index: number): string {
  const names: Record<TrackKind, string> = {
    'main-video': 'Video',
    'overlay-video': `Overlay ${index}`,
    'text': `Text ${index}`,
    'audio': `Audio ${index}`
  }
  return names[kind]
}

export function createTrack(
  kind: TrackKind,
  index: number,
  overrides?: { name?: string; metadata?: Partial<TrackMetadata>; clips?: Clip[] }
): Track {
  const metadata: TrackMetadata = {
    ...TRACK_KIND_DEFAULTS[kind],
    ...overrides?.metadata
  }

  return {
    id: generateId(kind, index),
    name: overrides?.name || getDefaultName(kind, index),
    kind,
    index,
    clips: overrides?.clips || [],
    metadata
  }
}

export function createMainVideoTrack(
  index: number = 0,
  overrides?: { name?: string; metadata?: Partial<TrackMetadata>; clips?: Clip[] }
): Track {
  return createTrack('main-video', index, { name: 'Video', ...overrides })
}

export function createOverlayVideoTrack(
  index: number,
  overrides?: { name?: string; metadata?: Partial<TrackMetadata>; clips?: Clip[] }
): Track {
  return createTrack('overlay-video', index, { ...overrides })
}

export function createTextTrack(
  index: number,
  overrides?: { name?: string; metadata?: Partial<TrackMetadata>; clips?: Clip[] }
): Track {
  return createTrack('text', index, { ...overrides })
}

export function createAudioTrack(
  index: number,
  overrides?: { name?: string; metadata?: Partial<TrackMetadata>; clips?: Clip[] }
): Track {
  return createTrack('audio', index, { ...overrides })
}

export function createDefaultTimeline(duration: number): Track[] {
  return [
    createMainVideoTrack(0, {
      clips: [
        createClip(0, duration, { label: 'Main', color: '#7B3CFF' })
      ]
    }),
    createAudioTrack(1, { name: 'Audio' })
  ]
}
