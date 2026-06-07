import React, { useMemo, useState, useCallback } from 'react'
import TimeRuler from './TimeRuler'
import TrackContainer from './TrackContainer'
import FixedPlayhead from './FixedPlayhead'
import TimelineViewport from './TimelineViewport'
import ZoomControls from './ZoomControls'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import { play, pause } from '@/store/slices/playbackSlice'
import { setScrollOffset, selectTrack, removeTrack, updateTrackMetadata } from '@/store/slices/timelineSlice'
import { Track, TrackGroup } from '@/types/timeline'

type Clip = { id: string; start: number; duration: number; label?: string; color?: string }

type Props = {
  duration: number
  currentTime: number
  tracks?: Track[]
  trackGroups?: TrackGroup
  onSeek?: (time: number) => void
  onUpdateTrack?: (trackId: string, clip: Clip) => void
}

export default function TimelineContainer({
  duration,
  currentTime,
  tracks = [],
  trackGroups,
  onSeek,
  onUpdateTrack
}: Props) {
  const dispatch = useDispatch<AppDispatch>()
  const isPlaying = useSelector((s: RootState) => s.playback.isPlaying)
  const scrollOffset = useSelector((s: RootState) => s.timeline.scrollOffset)
  const selectedTrackId = useSelector((s: RootState) => s.timeline.selectedTrackId)
  const [zoom, setZoom] = useState(1)
  const [lockNotification, setLockNotification] = useState<string | null>(null)
  const pixelsPerSec = useMemo(() => 120 * zoom, [zoom])

  const handleSeek = useCallback((t: number) => onSeek && onSeek(t), [onSeek])

  const handleUpdateClip = (trackId: string, clip: Clip) => {
    onUpdateTrack && onUpdateTrack(trackId, clip)
  }

  const togglePlay = () => {
    if (isPlaying) dispatch(pause())
    else dispatch(play())
  }

  const handleScrollOffsetChange = (offset: number) => {
    dispatch(setScrollOffset(offset))
  }

  const handleLockedAttempt = () => {
    setLockNotification('🔒 This track is locked. Unlock to edit.')
    setTimeout(() => setLockNotification(null), 3000)
  }

  const organizedTracks = trackGroups || {
    videoTracks: tracks.filter(t => t.kind === 'main-video' || t.kind === 'overlay-video'),
    audioTracks: tracks.filter(t => t.kind === 'audio'),
    textTracks: tracks.filter(t => t.kind === 'text')
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button onClick={togglePlay} className="px-3 py-1 rounded-md glass">
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <div className="text-sm text-[color:var(--muted)]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          {lockNotification && (
            <div className="px-3 py-1 rounded-md bg-red-500/20 text-red-400 text-sm animate-pulse">
              {lockNotification}
            </div>
          )}
        </div>
        <ZoomControls zoom={zoom} setZoom={setZoom} />
      </div>

      <div className="timeline-panel rounded-20 glass p-3 relative" style={{ minHeight: 260 }}>
        <div className="mb-2">
          <TimeRuler duration={duration} pixelsPerSec={pixelsPerSec} scrollOffset={scrollOffset} />
        </div>

        <TimelineViewport
          duration={duration}
          currentTime={currentTime}
          zoom={zoom}
          tracks={tracks}
          onScrollOffsetChange={handleScrollOffsetChange}
        >
          <TrackContainer
            trackGroups={organizedTracks}
            allTracks={tracks}
            pixelsPerSec={pixelsPerSec}
            duration={duration}
            selectedTrackId={selectedTrackId}
            onSelectTrack={(trackId) => dispatch(selectTrack(trackId))}
            onRemoveTrack={(trackId) => dispatch(removeTrack(trackId))}
            onToggleTrackVisibility={(trackId) => {
              const track = tracks.find(t => t.id === trackId)
              if (track) {
                dispatch(updateTrackMetadata({ trackId, metadata: { visible: !track.metadata.visible } }))
              }
            }}
            onToggleTrackLock={(trackId) => {
              const track = tracks.find(t => t.id === trackId)
              if (track) {
                dispatch(updateTrackMetadata({ trackId, metadata: { locked: !track.metadata.locked } }))
              }
            }}
            onToggleTrackMute={(trackId) => {
              const track = tracks.find(t => t.id === trackId)
              if (track) {
                dispatch(updateTrackMetadata({ trackId, metadata: { muted: !track.metadata.muted } }))
              }
            }}
            onUpdateClip={handleUpdateClip}
            onLockedAttempt={handleLockedAttempt}
          />
        </TimelineViewport>

        <FixedPlayhead
          currentTime={currentTime}
          pixelsPerSec={pixelsPerSec}
          onSeek={handleSeek}
          duration={duration}
        />
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
