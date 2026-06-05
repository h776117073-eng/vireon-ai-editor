import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { MediaItem } from '@/types/media'

type MediaState = {
  byId: Record<string, MediaItem>
  allIds: string[]
  currentId?: string | null
}

const initialState: MediaState = { byId: {}, allIds: [], currentId: null }

const mediaSlice = createSlice({
  name: 'media',
  initialState,
  reducers: {
    addMedia(state, action: PayloadAction<MediaItem>) {
      const m = action.payload
      state.byId[m.id] = m
      if (!state.allIds.includes(m.id)) state.allIds.push(m.id)
    },
    setCurrent(state, action: PayloadAction<string | null>) {
      state.currentId = action.payload
    },
    updateMedia(state, action: PayloadAction<Partial<MediaItem> & { id: string }>) {
      const { id, ...rest } = action.payload
      const prev = state.byId[id]
      if (prev) state.byId[id] = { ...prev, ...rest }
    }
  }
})

export const { addMedia, setCurrent, updateMedia } = mediaSlice.actions
export default mediaSlice.reducer
