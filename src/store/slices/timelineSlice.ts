import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { EditorTask } from '@/types/editorCommands'
import {
  removeClipAndCompact,
  moveClipMagnetic,
  insertClipAtPosition,
  calculateMagneticPositions
} from '@/utils/magneticTrackUtils'

export type Clip = { id: string; start: number; duration: number; label?: string; color?: string }
export type Track = { id: string; name?: string; kind: 'video' | 'audio'; clips: Clip[] }

type TimelineState = {
  tracks: Track[]
  duration: number
  playhead: number
  zoom: number
  selectedClipId?: string | null
  scrollOffset: number
  viewportWidth: number
  magneticMode: boolean
}

const initialState: TimelineState = { tracks: [], duration: 0, playhead: 0, zoom: 1, selectedClipId: null, scrollOffset: 0, viewportWidth: 0, magneticMode: true }

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    initFromMedia(state, action: PayloadAction<{ mediaId: string; duration: number }>) {
      const { mediaId, duration } = action.payload
      state.duration = duration
      state.tracks = [
        { id: 'track-video-1', name: 'Video 1', kind: 'video', clips: [{ id: 'clip-1', start: 0, duration, label: 'Primary' }] },
        { id: 'track-audio-1', name: 'Audio 1', kind: 'audio', clips: [] }
      ]
      state.playhead = 0
      state.zoom = 1
    },
    setPlayhead(state, action: PayloadAction<number>) {
      state.playhead = action.payload
    },
    setZoom(state, action: PayloadAction<number>) {
      state.zoom = action.payload
    },
    selectClip(state, action: PayloadAction<string | null>) {
      state.selectedClipId = action.payload
    },
    updateClip(state, action: PayloadAction<{ trackId: string; clip: Clip }>) {
      const { trackId, clip } = action.payload
      const tr = state.tracks.find((t) => t.id === trackId)
      if (!tr) return
      const idx = tr.clips.findIndex((c) => c.id === clip.id)
      if (idx >= 0) tr.clips[idx] = clip
    },
    moveClip(state, action: PayloadAction<{ trackId: string; clipId: string; newStart: number }>) {
      const { trackId, clipId, newStart } = action.payload
      const tr = state.tracks.find((t) => t.id === trackId)
      if (!tr) return
      const clip = tr.clips.find((c) => c.id === clipId)
      if (clip) clip.start = Math.max(0, Math.min(state.duration - clip.duration, newStart))
    },
    setScrollOffset(state, action: PayloadAction<number>) {
      state.scrollOffset = action.payload
    },
    setViewportWidth(state, action: PayloadAction<number>) {
      state.viewportWidth = action.payload
    },
    toggleMagneticMode(state, action: PayloadAction<boolean>) {
      state.magneticMode = action.payload
    },
    removeClipMagnetic(state, action: PayloadAction<{ trackId: string; clipId: string }>) {
      const { trackId, clipId } = action.payload
      const track = state.tracks.find(t => t.id === trackId)
      if (!track) return
      track.clips = removeClipAndCompact(track.clips, clipId)
    },
    moveClipMagnetic(state, action: PayloadAction<{ trackId: string; clipId: string; newStart: number }>) {
      const { trackId, clipId, newStart } = action.payload
      const track = state.tracks.find(t => t.id === trackId)
      if (!track) return
      track.clips = moveClipMagnetic(track.clips, clipId, newStart)
    },
    insertClipMagnetic(state, action: PayloadAction<{ trackId: string; clip: Clip; index: number }>) {
      const { trackId, clip, index } = action.payload
      const track = state.tracks.find(t => t.id === trackId)
      if (!track) return
      track.clips = insertClipAtPosition(track.clips, clip, index)
    }
  }
})

export const { initFromMedia, setPlayhead, setZoom, selectClip, updateClip, moveClip, setScrollOffset, setViewportWidth, toggleMagneticMode, removeClipMagnetic, moveClipMagnetic, insertClipMagnetic } = timelineSlice.actions
export default timelineSlice.reducer
