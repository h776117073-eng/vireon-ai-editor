import React from 'react'
import Clip from './Clip'
import { isMainTrack } from '@/utils/magneticTrackUtils'

type ClipData = {
  id: string
  start: number
  duration: number
  label?: string
  color?: string
}

type TrackData = {
  id: string
  name?: string
  kind: 'video' | 'audio'
  clips: ClipData[]
}

type Props = {
  track: TrackData
  pixelsPerSec: number
  duration: number
  onUpdateClip?: (clip: ClipData) => void
}

export default function Track({ track, pixelsPerSec, duration, onUpdateClip }: Props) {
  const isMagnetic = isMainTrack(track)

  return (
    <div className="timeline-track rounded-md p-2 mb-3 bg-[rgba(255,255,255,0.02)] relative" style={{ height: 80 }}>
      <div className="absolute left-3 top-3 text-xs text-[color:var(--muted)]">
        {track.name}
        {isMagnetic && <span className="ml-2 text-yellow-400">🧲</span>}
      </div>
      <div className="absolute inset-0 pl-20 pr-4">
        <div className="relative h-full">
          {track.clips.map((c) => (
            <Clip
              key={c.id}
              clip={c}
              pixelsPerSec={pixelsPerSec}
              onChange={(u) => onUpdateClip && onUpdateClip(u)}
              isMagnetic={isMagnetic}
              allClips={isMagnetic ? track.clips : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
