import { configureStore } from '@reduxjs/toolkit'
import mediaReducer from './slices/mediaSlice'
import playbackReducer from './slices/playbackSlice'
import timelineReducer from './slices/timelineSlice'
import chatReducer from './slices/chatSlice'
import renderReducer from './slices/renderSlice'

const store = configureStore({
  reducer: {
    media: mediaReducer,
    playback: playbackReducer,
    timeline: timelineReducer,
    chat: chatReducer,
    render: renderReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export default store
