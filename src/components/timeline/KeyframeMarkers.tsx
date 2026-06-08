import React from 'react'
import { Keyframe } from '@/types/animation'

type Props = {
  keyframes: Keyframe[]
  clipStart: number
  clipDuration: number
  pixelsPerSec: number
  isSelected?: boolean
  onSelectKeyframe?: (keyframeId: string) => void
}

export default function KeyframeMarkers({
  keyframes,
  clipStart,
  clipDuration,
  pixelsPerSec,
  isSelected = false,
  onSelectKeyframe
}: Props) {
  if (keyframes.length === 0) {
    return null
  }

  const clipEnd = clipStart + clipDuration

  return (
    <>
      {keyframes.map(kf => {
        // Convert keyframe time (relative to clip) to absolute position
        const absoluteTime = clipStart + kf.time

        // Check if keyframe is visible (within clip bounds)
        if (absoluteTime < clipStart || absoluteTime > clipEnd) {
          return null
        }

        // Calculate pixel position relative to clip start
        const relativePixels = kf.time * pixelsPerSec

        return (
          <div
            key={kf.id}
            className="absolute top-0 bottom-0 w-1 bg-yellow-400 hover:bg-yellow-300 cursor-pointer transform -translate-x-1/2 transition-colors group"
            style={{ left: `${relativePixels}px` }}
            title={`Keyframe at ${kf.time.toFixed(2)}s`}
            onClick={(e) => {
              e.stopPropagation()
              onSelectKeyframe?.(kf.id)
            }}
          >
            {/* Keyframe indicator diamond */}
            <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-yellow-400 rotate-45 rounded-sm shadow-md group-hover:shadow-lg group-hover:bg-yellow-300 transition-all" />

            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-yellow-400 text-xs whitespace-nowrap rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              {kf.time.toFixed(2)}s
            </div>
          </div>
        )
      })}
    </>
  )
}
