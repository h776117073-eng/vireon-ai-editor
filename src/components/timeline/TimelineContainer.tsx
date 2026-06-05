import React, { useMemo, useState, useCallback } from 'react'
import TimeRuler from './TimeRuler'
import Track from './Track'
import Playhead from './Playhead'
import ZoomControls from './ZoomControls'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import { play, pause } from '@/store/slices/playbackSlice'

type Clip = { id: string; start: number; duration: number; label?: string; color?: string }
type TrackType = { id: string; name?: string; kind: 'video' | 'audio'; clips: Clip[] }

type Props = {
  duration: number
  currentTime: number
  tracks?: TrackType[]
  onSeek?: (time: number) => void
  onUpdateTrack?: (trackId: string, clip: Clip) => void
}

export default function TimelineContainer({ duration, currentTime, tracks = [], onSeek, onUpdateTrack }: Props) {
  const dispatch = useDispatch<AppDispatch>()
  const isPlaying = useSelector((s: RootState) => s.playback.isPlaying)
  const [zoom, setZoom] = useState(1)
  const pixelsPerSec = useMemo(() => 120 * zoom, [zoom])

  const handleSeek = useCallback((t: number) => onSeek && onSeek(t), [onSeek])

  const handleUpdateClip = (trackId: string, clip: Clip) => {
    onUpdateTrack && onUpdateTrack(trackId, clip)
  }

  const togglePlay = () => {
    if (isPlaying) dispatch(pause())
    else dispatch(play())
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="px-3 py-1 rounded-md glass">{isPlaying ? 'Pause' : 'Play'}</button>
          <div className="text-sm text-[color:var(--muted)]">{formatTime(currentTime)} / {formatTime(duration)}</div>
        </div>
        <ZoomControls zoom={zoom} setZoom={setZoom} />
      </div>

      <div className="timeline-panel rounded-20 glass p-3" style={{ minHeight: 260 }}>
        <div className="mb-2">
          <TimeRuler duration={duration} pixelsPerSec={pixelsPerSec} />
        </div>

        <div className="overflow-x-auto">
          <div className="relative" style={{ width: Math.max(800, duration * pixelsPerSec) }}>
            {tracks.map((t) => (
              <div key={t.id} className="mb-2">
                <Track track={t} pixelsPerSec={pixelsPerSec} duration={duration} onUpdateClip={(c) => handleUpdateClip(t.id, c)} />
              </div>
            ))}

            <Playhead time={currentTime} pixelsPerSec={pixelsPerSec} onScrub={handleSeek} duration={duration} />
          </div>
        </div>
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
