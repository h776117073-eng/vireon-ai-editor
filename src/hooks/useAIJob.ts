import { useState, useCallback } from 'react'
import { submitEditJob } from '@/services/aiEditor'
import { EditJobRequest } from '@/types/chat'

export default function useAIJob() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle')

  const submit = useCallback(async (req: EditJobRequest) => {
    setStatus('queued')
    setProgress(0)
    try {
      const preview = await submitEditJob(req, (p) => setProgress(p), (s) => setStatus(s as any))
      setStatus('completed')
      setProgress(100)
      return preview
    } catch (err) {
      setStatus('failed')
      throw err
    }
  }, [])

  return { submit, progress, status }
}
