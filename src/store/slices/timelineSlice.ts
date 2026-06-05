import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { EditorTask } from '@/types/editorCommands'

export type Clip = { id: string; start: number; duration: number; label?: string; color?: string }
export type Track = { id: string; name?: string; kind: 'video' | 'audio'; clips: Clip[] }

type TimelineState = {
  tracks: Track[]
  duration: number
  playhead: number
  zoom: number
  selectedClipId?: string | null
}

const initialState: TimelineState = { tracks: [], duration: 0, playhead: 0, zoom: 1, selectedClipId: null }

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
    }
  }
})

export const { initFromMedia, setPlayhead, setZoom, selectClip, updateClip, moveClip } = timelineSlice.actions
export default timelineSlice.reducer
