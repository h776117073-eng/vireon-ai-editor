import React from 'react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { ChatMessage as ChatMsgType, AIMessage, UserMessage, EditJobRequest } from '@/types/chat'
import { submitEditJob } from '@/services/aiEditor'
import { handleFileUpload } from '@/services/mediaHandler'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import { addMessage, updateMessage as updateChatMessage } from '@/store/slices/chatSlice'

export default function Chat() {
  const dispatch = useDispatch<AppDispatch>()
  const messages = useSelector((s: RootState) => s.chat.messages)

  const push = (m: ChatMsgType) => dispatch(addMessage(m))

  const updateMessage = (id: string, data: Partial<AIMessage>) => dispatch(updateChatMessage({ id, patch: data }))

  const send = async (text?: string, video?: string, file?: File, image?: string, audio?: string) => {
    const id = String(Date.now())
    const userMsg: UserMessage = { id, author: 'user', createdAt: Date.now(), text, video, image, audio }
    push(userMsg)

    // if a File object was provided, handle upload and get canonical source URL
    let sourceVideo = video
    if (file) {
      try {
        const item = await handleFileUpload(file)
        sourceVideo = item.src
        // push a user message that contains the uploaded video (we already pushed userMsg with object URL)
      } catch (err) {
        console.error('File upload failed', err)
      }
    }

    // Build edit request
    // Interpret natural language into structured tasks
    let tasks = undefined
    try {
      // lazy import to avoid circular issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const interpreter = require('@/services/commandInterpreter').default
      const cmd = interpreter.interpret(text || '')
      tasks = cmd.tasks
      // push a system/ai message showing parsed JSON
      const parsedId = id + '-parsed'
      const parsedMsg: AIMessage = { id: parsedId, author: 'ai', createdAt: Date.now(), text: 'Parsed commands', status: 'queued', progress: 0, videoPreview: undefined }
      push(parsedMsg)
      // update the parsed message with the JSON text
      updateMessage(parsedId, { text: JSON.stringify(cmd, null, 2) } as any)
    } catch (err) {
      console.warn('Interpreter error', err)
    }

    const req: EditJobRequest = { instruction: text || '', sourceVideo: sourceVideo, tasks }

    // Create AI job message
    const aiId = id + '-ai'
    const aiMsg: AIMessage = { id: aiId, author: 'ai', createdAt: Date.now(), text: 'Queued...', status: 'queued', progress: 0 }
    push(aiMsg)

    // Submit job to AI service
    submitEditJob(req, (p) => {
      updateMessage(aiId, { progress: p, status: 'processing', text: `Processing... ${p}%` })
    }, (status) => {
      updateMessage(aiId, { status: status as any })
    })
      .then((previewUrl) => {
        updateMessage(aiId, { status: 'completed', progress: 100, text: 'Completed.' })
        // push a final ai message with preview
        const resultId = aiId + '-result'
        const resultMsg: AIMessage = { id: resultId, author: 'ai', createdAt: Date.now(), text: 'Here is a preview of the render.', videoPreview: previewUrl, status: 'completed', progress: 100 }
        push(resultMsg)
      })
      .catch((err) => {
        updateMessage(aiId, { status: 'failed', text: 'Failed: ' + String(err.message) })
      })
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="h-64 overflow-y-auto mb-4 p-3 space-y-3">
        {messages.map((m) => (
          <ChatMessage key={m.id} msg={m as any} />
        ))}
      </div>

      <ChatInput onSend={(t, v, f) => send(t, v, f)} />
    </div>
  )
}
