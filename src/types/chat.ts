export type MessageBase = {
  id: string
  author: 'user' | 'ai'
  createdAt: number
}

export type UserMessage = MessageBase & {
  author: 'user'
  text?: string
  image?: string
  video?: string
  audio?: string
}

export type AIMessage = MessageBase & {
  author: 'ai'
  text?: string
  videoPreview?: string
  status?: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number // 0..100
}

export type ChatMessage = UserMessage | AIMessage

export type EditJobRequest = {
  instruction: string
  sourceVideo?: string
  assets?: string[]
  tasks?: any // structured tasks produced by AI Command Interpreter
}
