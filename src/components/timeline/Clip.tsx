import React, { useRef, useState } from 'react'
import { getSnapTarget, shouldSnap, getAdjacentClips } from '@/utils/magneticTrackUtils'

type ClipData = {
  id: string
  start: number
  duration: number
  label?: string
  color?: string
}

type Props = {
  clip: ClipData
  pixelsPerSec: number
  onChange?: (c: ClipData) => void
  isMagnetic?: boolean
  allClips?: ClipData[]
}

const SNAP_THRESHOLD = 0.2 // seconds

export default function Clip({ clip, pixelsPerSec, onChange, isMagnetic = false, allClips = [] }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null)

  const left = clip.start * pixelsPerSec
  const width = clip.duration * pixelsPerSec

  const startDrag = (e: React.PointerEvent) => {
    e.stopPropagation()
    const startX = e.clientX
    const startLeft = left
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      let newStart = Math.max(0, (startLeft + dx) / pixelsPerSec)

      // Apply magnetic snapping if enabled
      if (isMagnetic && allClips.length > 0) {
        const snapPos = getSnapTarget(clip, allClips, clip.id, newStart, SNAP_THRESHOLD)
        if (snapPos !== null && shouldSnap(Math.abs(newStart - snapPos), SNAP_THRESHOLD)) {
          newStart = snapPos
          setSnapGuideX(snapPos * pixelsPerSec)
        } else {
          setSnapGuideX(null)
        }
      }

      onChange && onChange({ ...clip, start: newStart })
    }
    const onUp = () => {
      setSnapGuideX(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startResize = (e: React.PointerEvent, side: 'left' | 'right') => {
    e.stopPropagation()
    const startX = e.clientX
    const startStart = clip.start
    const startDur = clip.duration
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / pixelsPerSec
      if (side === 'left') {
        const newStart = Math.min(startStart + dx, startStart + startDur - 0.01)
        const newDur = startDur - (newStart - startStart)
        onChange && onChange({ ...clip, start: Math.max(0, newStart), duration: Math.max(0.01, newDur) })
      } else {
        const newDur = Math.max(0.01, startDur + dx)
        onChange && onChange({ ...clip, duration: newDur })
      }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <>
      {snapGuideX !== null && (
        <div
          className="absolute top-0 bottom-0 w-px bg-yellow-400/50 pointer-events-none z-20"
          style={{ left: snapGuideX }}
        />
      )}
      <div
        ref={ref}
        className="absolute top-2 h-10 rounded-md clip-shadow cursor-grab select-none transition-transform hover:shadow-lg"
        style={{ left, width, background: clip.color || 'linear-gradient(90deg,#7B3CFF,#4C1D95)' }}
        onPointerDown={startDrag}
      >
        <div className="absolute left-0 top-0 h-full w-3 cursor-ew-resize" onPointerDown={(e) => startResize(e, 'left')} />
        <div className="absolute right-0 top-0 h-full w-3 cursor-ew-resize" onPointerDown={(e) => startResize(e, 'right')} />
        <div className="px-3 py-1 text-sm text-white truncate">{clip.label ?? 'Clip'}</div>
      </div>
    </>
  )
}
