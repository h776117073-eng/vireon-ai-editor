import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Track, TrackMetadata, Clip, TimelineState, TrackKind } from '@/types/timeline'
import {
  removeClipAndCompact,
  moveClipMagnetic,
  insertClipAtPosition
} from '@/utils/magneticTrackUtils'
import { organizeTracksByKind, getNextAvailableIndex, reorderTrack, getTrackById } from '@/utils/timelineDataUtils'
import { createDefaultTimeline } from '@/utils/trackFactory'
import { splitClip } from '@/utils/clipSplitUtils'
import { EditorTask } from '@/types/editorCommands'

const initialState: TimelineState = {
  tracks: [],
  trackGroups: { videoTracks: [], audioTracks: [], textTracks: [] },
  duration: 0,
  playhead: 0,
  zoom: 1,
  selectedClipId: null,
  selectedTrackId: undefined,
  scrollOffset: 0,
  viewportWidth: 0,
  magneticMode: true
}

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    initFromMedia(state, action: PayloadAction<{ mediaId: string; duration: number }>) {
      const { duration } = action.payload
      state.duration = duration
      state.tracks = createDefaultTimeline(duration)
      state.trackGroups = organizeTracksByKind(state.tracks)
      state.playhead = 0
      state.zoom = 1
    },

    // Track management
    addTrack(state, action: PayloadAction<{ kind: TrackKind; name?: string; metadata?: Partial<TrackMetadata> }>) {
      const { kind, name, metadata } = action.payload
      const index = getNextAvailableIndex(state.tracks)

      const newTrack: Track = {
        id: `track_${kind.replace('-', '_')}_${index}`,
        name: name || kind.charAt(0).toUpperCase() + kind.slice(1),
        kind,
        index,
        clips: [],
        metadata: { ...metadata }
      }

      state.tracks.push(newTrack)
      state.trackGroups = organizeTracksByKind(state.tracks)
    },

    removeTrack(state, action: PayloadAction<string>) {
      const trackId = action.payload
      state.tracks = state.tracks.filter(t => t.id !== trackId)
      state.trackGroups = organizeTracksByKind(state.tracks)
      if (state.selectedTrackId === trackId) {
        state.selectedTrackId = undefined
      }
    },

    reorderTracks(state, action: PayloadAction<{ trackId: string; newIndex: number }>) {
      const { trackId, newIndex } = action.payload
      state.tracks = reorderTrack(state.tracks, trackId, newIndex)
      state.trackGroups = organizeTracksByKind(state.tracks)
    },

    updateTrackMetadata(state, action: PayloadAction<{ trackId: string; metadata: Partial<TrackMetadata> }>) {
      const { trackId, metadata } = action.payload
      const track = getTrackById(state.tracks, trackId)
      if (track) {
        track.metadata = { ...track.metadata, ...metadata }
      }
    },

    selectTrack(state, action: PayloadAction<string | undefined>) {
      state.selectedTrackId = action.payload
    },

    // Playhead and zoom
    setPlayhead(state, action: PayloadAction<number>) {
      state.playhead = action.payload
    },

    setZoom(state, action: PayloadAction<number>) {
      state.zoom = action.payload
    },

    // Clip selection
    selectClip(state, action: PayloadAction<string | null>) {
      state.selectedClipId = action.payload
    },

    // Clip operations - backward compatible
    updateClip(state, action: PayloadAction<{ trackId: string; clip: Clip }>) {
      const { trackId, clip } = action.payload
      const track = getTrackById(state.tracks, trackId)
      if (!track) return
      const idx = track.clips.findIndex(c => c.id === clip.id)
      if (idx >= 0) track.clips[idx] = clip
    },

    moveClip(state, action: PayloadAction<{ trackId: string; clipId: string; newStart: number }>) {
      const { trackId, clipId, newStart } = action.payload
      const track = getTrackById(state.tracks, trackId)
      if (!track) return
      const clip = track.clips.find(c => c.id === clipId)
      if (clip) clip.start = Math.max(0, Math.min(state.duration - clip.duration, newStart))
    },

    // Magnetic operations (main track only)
    removeClipMagnetic(state, action: PayloadAction<{ trackId: string; clipId: string }>) {
      const { trackId, clipId } = action.payload
      const track = getTrackById(state.tracks, trackId)
      if (!track) return
      track.clips = removeClipAndCompact(track.clips, clipId)
    },

    moveClipMagnetic(state, action: PayloadAction<{ trackId: string; clipId: string; newStart: number }>) {
      const { trackId, clipId, newStart } = action.payload
      const track = getTrackById(state.tracks, trackId)
      if (!track) return
      track.clips = moveClipMagnetic(track.clips, clipId, newStart)
    },

    insertClipMagnetic(state, action: PayloadAction<{ trackId: string; clip: Clip; index: number }>) {
      const { trackId, clip, index } = action.payload
      const track = getTrackById(state.tracks, trackId)
      if (!track) return
      track.clips = insertClipAtPosition(track.clips, clip, index)
    },

    // Clip splitting
    splitClipAtTime(state, action: PayloadAction<{ trackId: string; clipId: string; splitTime: number }>) {
      const { trackId, clipId, splitTime } = action.payload
      const track = getTrackById(state.tracks, trackId)
      if (!track) return

      const clipIndex = track.clips.findIndex(c => c.id === clipId)
      if (clipIndex < 0) return

      const originalClip = track.clips[clipIndex]
      try {
        const { clipBefore, clipAfter } = splitClip(originalClip, splitTime)
        track.clips.splice(clipIndex, 1, clipBefore, clipAfter)
        state.selectedClipId = clipAfter.id
      } catch (error) {
        console.error('Failed to split clip:', error)
      }
    },

    // Viewport
    setScrollOffset(state, action: PayloadAction<number>) {
      state.scrollOffset = action.payload
    },

    setViewportWidth(state, action: PayloadAction<number>) {
      state.viewportWidth = action.payload
    },

    // Magnetic mode
    toggleMagneticMode(state, action: PayloadAction<boolean>) {
      state.magneticMode = action.payload
    }
  }
})

export const {
  initFromMedia,
  addTrack,
  removeTrack,
  reorderTracks,
  updateTrackMetadata,
  selectTrack,
  setPlayhead,
  setZoom,
  selectClip,
  updateClip,
  moveClip,
  removeClipMagnetic,
  moveClipMagnetic,
  insertClipMagnetic,
  splitClipAtTime,
  setScrollOffset,
  setViewportWidth,
  toggleMagneticMode
} = timelineSlice.actions

export default timelineSlice.reducer
