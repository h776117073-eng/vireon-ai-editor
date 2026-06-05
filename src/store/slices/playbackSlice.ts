import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type PlaybackState = {
  isPlaying: boolean
  currentTime: number
}

const initialState: PlaybackState = { isPlaying: false, currentTime: 0 }

const playbackSlice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    play(state) {
      state.isPlaying = true
    },
    pause(state) {
      state.isPlaying = false
    },
    setTime(state, action: PayloadAction<number>) {
      state.currentTime = action.payload
    }
  }
})

export const { play, pause, setTime } = playbackSlice.actions
export default playbackSlice.reducer
