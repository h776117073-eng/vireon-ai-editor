import React, { useState, useRef } from 'react'

type Props = {
  onSend: (text?: string, video?: string, file?: File) => void
}

export default function ChatInput({ onSend }: Props) {
  const [text, setText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const handleSend = () => {
    if (!text && !selectedFile) return
    onSend(text || undefined, selectedFile || undefined, selectedFileObj || undefined)
    setText('')
    setSelectedFile(null)
    setSelectedFileObj(null)
  }

  const handleChoose = (type: 'image' | 'video' | 'audio') => {
    setMenuOpen(false)
    if (fileRef.current) {
      fileRef.current.accept = type + '/*'
      fileRef.current.click()
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setSelectedFile(url)
    setSelectedFileObj(f)
  }

  return (
    <div className="flex items-end gap-3">
      <div className="relative">
        <button onClick={() => setMenuOpen((s) => !s)} className="p-3 rounded-full glass">
          +
        </button>
        {menuOpen && (
          <div className="absolute left-0 mt-2 w-40 p-2 rounded-md bg-[color:var(--panel)] shadow-lg">
            <button className="w-full text-left p-2" onClick={() => handleChoose('image')}>Upload Image</button>
            <button className="w-full text-left p-2" onClick={() => handleChoose('video')}>Upload Video</button>
            <button className="w-full text-left p-2" onClick={() => handleChoose('audio')}>Upload Audio</button>
          </div>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask Vireon about this video..."
        className="flex-1 resize-none p-3 rounded-xl glass min-h-[44px] max-h-48"
      />

      <div className="flex items-center gap-2">
        <button className="p-3 rounded-full glass">🎤</button>
        <button onClick={handleSend} className="p-3 rounded-full bg-accent text-white">Send</button>
      </div>

      <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />
    </div>
  )
}
