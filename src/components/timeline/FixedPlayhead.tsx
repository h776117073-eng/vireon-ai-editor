import React from 'react'
import { TimelineStateManager } from '@/services/timelineStateManager'

type Props = {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  pixelsPerSec: number
}

export default function FixedPlayhead({
  currentTime,
  duration,
  onSeek,
  pixelsPerSec
}: Props) {
  const handlePointerDown = (e: React.PointerEvent) => {
    const startX = e.clientX
    const initialTime = currentTime

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const timeDelta = TimelineStateManager.dragDeltaToTime(dx, pixelsPerSec)
      const newTime = Math.max(0, Math.min(duration, initialTime + timeDelta))
      onSeek(newTime)
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className="absolute top-0 bottom-0 flex items-start z-10"
      style={{ left: 'calc(50% - 2px)' }}
      onPointerDown={handlePointerDown}
    >
      <div className="w-1 bg-[var(--accent)] rounded-sm h-full shadow-playhead cursor-col-resize" />
      <div className="-mt-6 ml-2 px-2 py-1 text-xs rounded bg-[color:var(--panel)] text-[color:var(--text)] whitespace-nowrap pointer-events-none">
        {formatTime(currentTime)}
      </div>
    </div>
  )
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '00:00'
  const mm = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
