import React from 'react'
import { Track } from '@/types/timeline'
import { TRACK_KIND_ICONS, TRACK_KIND_NAMES, isAudioTrack } from '@/types/timeline'

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
  const isLocked = metadata.locked === true
  const isHidden = metadata.visible === false
  const isMuted = metadata.muted === true

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[var(--accent)] bg-opacity-20 border-l-2 border-[var(--accent)]'
          : 'hover:bg-[rgba(255,255,255,0.05)]'
      } ${isLocked ? 'bg-red-500/10' : ''} ${isHidden ? 'opacity-50' : ''}`}
      onClick={onSelect}
      title={isLocked ? 'Track is locked' : ''}
    >
      {/* Track Icon & Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium truncate ${isLocked ? 'text-red-400' : ''}`}>
              {track.name}
              {isLocked && ' (Locked)'}
            </div>
            <div className="text-xs text-[color:var(--muted)] truncate">{kindName}</div>
          </div>
        </div>
      </div>

      {/* Track Controls */}
      <div className="flex items-center gap-1">
        {/* Visibility Toggle */}
        <button
          className={`p-1 rounded transition-colors ${
            isHidden
              ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
              : 'hover:bg-[rgba(255,255,255,0.1)]'
          }`}
          title={isHidden ? 'Show track' : 'Hide track'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility()
          }}
        >
          {isHidden ? '🙈' : '👁️'}
        </button>

        {/* Lock Toggle */}
        <button
          className={`p-1 rounded transition-colors ${
            isLocked
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
              : 'hover:bg-[rgba(255,255,255,0.1)]'
          }`}
          title={isLocked ? 'Unlock track' : 'Lock track'}
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
        >
          {isLocked ? '🔒' : '🔓'}
        </button>

        {/* Mute Toggle (Audio Only) */}
        {isAudioTrack(track) && onToggleMute && (
          <button
            className={`p-1 rounded transition-colors ${
              isMuted
                ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                : 'hover:bg-[rgba(255,255,255,0.1)]'
            }`}
            title={isMuted ? 'Unmute track' : 'Mute track'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleMute()
            }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        )}

        {/* Remove Button */}
        <button
          className="p-1 rounded hover:bg-red-500 hover:bg-opacity-30 transition-colors text-red-400"
          title="Delete track"
          onClick={(e) => {
            e.stopPropagation()
            if (isLocked) {
              alert('Cannot delete a locked track. Unlock it first.')
              return
            }
            onRemove()
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

