import React from 'react'
import { Track as TrackType, TrackGroup } from '@/types/timeline'
import Track from './Track'
import TrackHeader from './TrackHeader'
import { filterVisibleTracks } from '@/utils/trackControlUtils'

type ClipData = {
  id: string
  start: number
  duration: number
  label?: string
  color?: string
}

type Props = {
  trackGroups: TrackGroup
  allTracks: TrackType[]
  pixelsPerSec: number
  duration: number
  selectedTrackId?: string
  onSelectTrack: (trackId: string) => void
  onRemoveTrack: (trackId: string) => void
  onToggleTrackVisibility: (trackId: string) => void
  onToggleTrackLock: (trackId: string) => void
  onToggleTrackMute: (trackId: string) => void
  onUpdateClip: (trackId: string, clip: ClipData) => void
  onLockedAttempt?: () => void
}

function TrackSection({
  title,
  tracks,
  pixelsPerSec,
  duration,
  selectedTrackId,
  onSelectTrack,
  onRemoveTrack,
  onToggleTrackVisibility,
  onToggleTrackLock,
  onToggleTrackMute,
  onUpdateClip,
  onLockedAttempt
}: {
  title: string
  tracks: TrackType[]
  pixelsPerSec: number
  duration: number
  selectedTrackId?: string
  onSelectTrack: (trackId: string) => void
  onRemoveTrack: (trackId: string) => void
  onToggleTrackVisibility: (trackId: string) => void
  onToggleTrackLock: (trackId: string) => void
  onToggleTrackMute: (trackId: string) => void
  onUpdateClip: (trackId: string, clip: ClipData) => void
  onLockedAttempt?: () => void
}) {
  if (tracks.length === 0) return null

  const visibleTracks = filterVisibleTracks(tracks)

  return (
    <div className="mb-4">
      <div className="px-3 py-2 text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">
        {title}
        {tracks.length > visibleTracks.length && (
          <span className="ml-2 text-xs font-normal text-yellow-400">
            ({visibleTracks.length}/{tracks.length} visible)
          </span>
        )}
      </div>
      <div className="space-y-1">
        {tracks.map((track) => (
          <div key={track.id}>
            <TrackHeader
              track={track}
              isSelected={selectedTrackId === track.id}
              onSelect={() => onSelectTrack(track.id)}
              onRemove={() => onRemoveTrack(track.id)}
              onToggleVisibility={() => onToggleTrackVisibility(track.id)}
              onToggleLock={() => onToggleTrackLock(track.id)}
              onToggleMute={() => onToggleTrackMute(track.id)}
            />
            {track.metadata.visible !== false && (
              <Track
                track={track}
                pixelsPerSec={pixelsPerSec}
                duration={duration}
                onUpdateClip={(clip) => onUpdateClip(track.id, clip)}
                onLockedAttempt={onLockedAttempt}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TrackContainer({
  trackGroups,
  allTracks,
  pixelsPerSec,
  duration,
  selectedTrackId,
  onSelectTrack,
  onRemoveTrack,
  onToggleTrackVisibility,
  onToggleTrackLock,
  onToggleTrackMute,
  onUpdateClip,
  onLockedAttempt
}: Props) {
  return (
    <div className="timeline-tracks-container space-y-2">
      <TrackSection
        title="Video"
        tracks={trackGroups.videoTracks}
        pixelsPerSec={pixelsPerSec}
        duration={duration}
        selectedTrackId={selectedTrackId}
        onSelectTrack={onSelectTrack}
        onRemoveTrack={onRemoveTrack}
        onToggleTrackVisibility={onToggleTrackVisibility}
        onToggleTrackLock={onToggleTrackLock}
        onToggleTrackMute={onToggleTrackMute}
        onUpdateClip={onUpdateClip}
        onLockedAttempt={onLockedAttempt}
      />

      <TrackSection
        title="Text"
        tracks={trackGroups.textTracks}
        pixelsPerSec={pixelsPerSec}
        duration={duration}
        selectedTrackId={selectedTrackId}
        onSelectTrack={onSelectTrack}
        onRemoveTrack={onRemoveTrack}
        onToggleTrackVisibility={onToggleTrackVisibility}
        onToggleTrackLock={onToggleTrackLock}
        onToggleTrackMute={onToggleTrackMute}
        onUpdateClip={onUpdateClip}
        onLockedAttempt={onLockedAttempt}
      />

      <TrackSection
        title="Audio"
        tracks={trackGroups.audioTracks}
        pixelsPerSec={pixelsPerSec}
        duration={duration}
        selectedTrackId={selectedTrackId}
        onSelectTrack={onSelectTrack}
        onRemoveTrack={onRemoveTrack}
        onToggleTrackVisibility={onToggleTrackVisibility}
        onToggleTrackLock={onToggleTrackLock}
        onToggleTrackMute={onToggleTrackMute}
        onUpdateClip={onUpdateClip}
        onLockedAttempt={onLockedAttempt}
      />
    </div>
  )
}
