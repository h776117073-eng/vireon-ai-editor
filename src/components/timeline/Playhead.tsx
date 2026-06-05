import React from 'react'

type Props = {
  time: number
  pixelsPerSec: number
  onScrub?: (time: number) => void
  duration: number
}

export default function Playhead({ time, pixelsPerSec, onScrub, duration }: Props) {
  const left = Math.max(0, Math.min(duration * pixelsPerSec, time * pixelsPerSec))

  const handlePointerDown = (e: React.PointerEvent) => {
    const startX = e.clientX
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const newTime = (left + dx) / pixelsPerSec
      onScrub && onScrub(Math.max(0, Math.min(duration, newTime)))
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
      className="absolute top-0 bottom-0 flex items-start"
      style={{ left }}
      onPointerDown={handlePointerDown}
    >
      <div className="w-1 bg-[var(--accent)] rounded-sm h-full shadow-playhead" />
      <div className="-mt-6 ml-2 px-2 py-1 text-xs rounded bg-[color:var(--panel)] text-[color:var(--text)]">{formatTime(time)}</div>
    </div>
  )
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '00:00'
  const mm = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
