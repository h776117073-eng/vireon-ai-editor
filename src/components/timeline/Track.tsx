import React from 'react'
import Clip from './Clip'
import { isMainTrack } from '@/utils/magneticTrackUtils'
import { Track as TrackType } from '@/types/timeline'

type ClipData = {
  id: string
  start: number
  duration: number
  label?: string
  color?: string
}

type Props = {
  track: TrackType
  pixelsPerSec: number
  duration: number
  onUpdateClip?: (clip: ClipData) => void
  onLockedAttempt?: () => void
  selectedClipId?: string | null
  onSelectClip?: (clipId: string) => void
}

export default function Track({
  track,
  pixelsPerSec,
  duration,
  onUpdateClip,
  onLockedAttempt,
  selectedClipId,
  onSelectClip
}: Props) {
  const isMagnetic = isMainTrack(track)
  const isLocked = track.metadata.locked === true

  return (
    <div
      className={`timeline-track rounded-md p-2 mb-3 relative transition-opacity ${
        isLocked ? 'opacity-60 bg-red-500/5' : 'bg-[rgba(255,255,255,0.02)]'
      }`}
      style={{ height: 80 }}
    >
      <div className="absolute left-3 top-3 text-xs text-[color:var(--muted)] flex items-center gap-1">
        <span>{track.name}</span>
        {isMagnetic && <span className="text-yellow-400">🧲</span>}
        {isLocked && <span className="text-red-400" title="This track is locked">🔒</span>}
      </div>
      <div className="absolute inset-0 pl-20 pr-4">
        <div className="relative h-full">
          {track.clips.map((c) => (
            <Clip
              key={c.id}
              clip={c}
              pixelsPerSec={pixelsPerSec}
              onChange={(u) => {
                if (!isLocked) {
                  onUpdateClip && onUpdateClip(u)
                }
              }}
              isMagnetic={isMagnetic}
              allClips={isMagnetic ? track.clips : undefined}
              isTrackLocked={isLocked}
              onLockedAttempt={onLockedAttempt}
              isSelected={selectedClipId === c.id}
              onSelect={onSelectClip}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
