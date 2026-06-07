import React, { useRef, useEffect } from 'react'
import { useTimelineSync } from '@/hooks/useTimelineSync'

type Props = {
  src: string
  onTimeUpdate?: (current: number, duration: number) => void
  onLoadedMetadata?: (duration: number) => void
}

export default function VideoPlayer({ src, onTimeUpdate, onLoadedMetadata }: Props) {
  const ref = useRef<HTMLVideoElement | null>(null)

  // Sync video with timeline state
  useTimelineSync(ref, (time) => {
    if (ref.current) {
      onTimeUpdate?.(time, ref.current.duration || 0)
    }
  })

  useEffect(() => {
    const vid = ref.current
    if (!vid) return

    const handleLoaded = () => onLoadedMetadata && onLoadedMetadata(vid.duration || 0)
    vid.addEventListener('loadedmetadata', handleLoaded)

    return () => {
      vid.removeEventListener('loadedmetadata', handleLoaded)
    }
  }, [onLoadedMetadata])

  return (
    <div className="w-full flex items-center justify-center">
      <div className="max-w-full" style={{ width: '100%', maxHeight: '60vh' }}>
        <video
          ref={ref}
          src={src}
          className="w-full h-auto rounded-[12px] bg-black shadow-lg"
          style={{ objectFit: 'contain' }}
        />
      </div>
    </div>
  )
}
