import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ChatMessage } from '@/types/chat'

type ChatState = {
  messages: ChatMessage[]
}

const initialState: ChatState = { messages: [] }

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload)
    },
    updateMessage(state, action: PayloadAction<{ id: string; patch: Partial<ChatMessage> }>) {
      const { id, patch } = action.payload
      const idx = state.messages.findIndex((m) => m.id === id)
      if (idx >= 0) state.messages[idx] = { ...state.messages[idx], ...patch }
    }
  }
})

export const { addMessage, updateMessage } = chatSlice.actions
export default chatSlice.reducer
