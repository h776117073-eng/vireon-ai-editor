import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type RenderJob = { id: string; status: string; progress: number; resultUrl?: string }

type RenderState = { jobs: RenderJob[] }

const initialState: RenderState = { jobs: [] }

const renderSlice = createSlice({
  name: 'render',
  initialState,
  reducers: {
    addJob(state, action: PayloadAction<RenderJob>) {
      state.jobs.push(action.payload)
    },
    updateJob(state, action: PayloadAction<{ id: string; patch: Partial<RenderJob> }>) {
      const idx = state.jobs.findIndex((j) => j.id === action.payload.id)
      if (idx >= 0) state.jobs[idx] = { ...state.jobs[idx], ...action.payload.patch }
    }
  }
})

export const { addJob, updateJob } = renderSlice.actions
export default renderSlice.reducer
