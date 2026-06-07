import React from 'react'
import { Track } from '@/types/timeline'
import { TRACK_KIND_ICONS, TRACK_KIND_NAMES, isMainVideoTrack, isAudioTrack, isTextTrack } from '@/types/timeline'

type Props = {
  track: Track
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
  onToggleVisibility: () => void
  onToggleLock: () => void
  onToggleMute?: () => void
}

export default function TrackHeader({
  track,
  isSelected,
  onSelect,
  onRemove,
  onToggleVisibility,
  onToggleLock,
  onToggleMute
}: Props) {
  const { metadata } = track
  const icon = TRACK_KIND_ICONS[track.kind]
  const kindName = TRACK_KIND_NAMES[track.kind]

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[var(--accent)] bg-opacity-20 border-l-2 border-[var(--accent)]'
          : 'hover:bg-[rgba(255,255,255,0.05)]'
      }`}
      onClick={onSelect}
    >
      {/* Track Icon & Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{track.name}</div>
            <div className="text-xs text-[color:var(--muted)] truncate">{kindName}</div>
          </div>
        </div>
      </div>

      {/* Track Controls */}
      <div className="flex items-center gap-1">
        {/* Visibility Toggle */}
        <button
          className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          title={metadata.visible ? 'Hide track' : 'Show track'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility()
          }}
        >
          {metadata.visible ? '👁️' : '🙈'}
        </button>

        {/* Lock Toggle */}
        <button
          className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          title={metadata.locked ? 'Unlock track' : 'Lock track'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
        >
          {metadata.locked ? '🔒' : '🔓'}
        </button>

        {/* Mute Toggle (Audio Only) */}
        {isAudioTrack(track) && onToggleMute && (
          <button
            className="p-1 rounded hover:bg-[rgba(255,255,255,0.1)] transition-colors"
            title={metadata.muted ? 'Unmute track' : 'Mute track'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleMute()
            }}
          >
            {metadata.muted ? '🔇' : '🔊'}
          </button>
        )}

        {/* Remove Button */}
        <button
          className="p-1 rounded hover:bg-red-500 hover:bg-opacity-20 transition-colors text-red-400"
          title="Delete track"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
