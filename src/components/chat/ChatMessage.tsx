import React from 'react'
import ProgressBar from './ProgressBar'
import { AIMessage, UserMessage } from '@/types/chat'

type Props = {
  msg: AIMessage | UserMessage
}

export default function ChatMessage({ msg }: Props) {
  const isUser = msg.author === 'user'
  const ai = msg.author === 'ai' ? (msg as AIMessage) : null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] p-3 rounded-lg glass ${isUser ? 'bg-[rgba(123,60,255,0.12)] text-white' : 'bg-[color:var(--panel)] text-[color:var(--text)]'}`}>
        {/* video preview for both user and ai messages */}
        {('video' in msg) && (msg as any).video && (
          <video src={(msg as any).video} controls className="max-w-full rounded mb-2" style={{ display: 'block' }} />
        )}

        {ai?.videoPreview && (
          <div className="mb-2">
            <div className="text-sm text-[color:var(--muted)] mb-1">Render preview</div>
            <video src={ai.videoPreview} controls className="w-full rounded mb-2" />
          </div>
        )}

        {msg.text && <div className="whitespace-pre-wrap">{msg.text}</div>}

        {ai?.status && ai.status !== 'completed' && (
          <div className="mt-3">
            <div className="text-xs text-[color:var(--muted)] mb-1">Status: {ai.status}</div>
            {typeof ai.progress === 'number' && <ProgressBar value={ai.progress} />}
          </div>
        )}
      </div>
    </div>
  )
}
