import React, { useCallback } from 'react'

type Props = {
  zoom: number
  setZoom: (z: number) => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onReset?: () => void
  minZoom?: number
  maxZoom?: number
}

export default function ZoomControls({
  zoom,
  setZoom,
  onZoomIn,
  onZoomOut,
  onReset,
  minZoom = 0.1,
  maxZoom = 8
}: Props) {
  const zoomPercent = Math.round(zoom * 100)

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setZoom(value)
  }, [setZoom])

  const handleZoomIn = useCallback(() => {
    if (onZoomIn) {
      onZoomIn()
    } else {
      setZoom(Math.min(maxZoom, zoom + 0.1))
    }
  }, [zoom, maxZoom, setZoom, onZoomIn])

  const handleZoomOut = useCallback(() => {
    if (onZoomOut) {
      onZoomOut()
    } else {
      setZoom(Math.max(minZoom, zoom - 0.1))
    }
  }, [zoom, minZoom, setZoom, onZoomOut])

  const handleReset = useCallback(() => {
    if (onReset) {
      onReset()
    } else {
      setZoom(1)
    }
  }, [setZoom, onReset])

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md glass">
      {/* Zoom Out Button */}
      <button
        onClick={handleZoomOut}
        disabled={zoom <= minZoom}
        className="p-1.5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Zoom out (Ctrl+-)"
        aria-label="Zoom out"
      >
        🔍-
      </button>

      {/* Zoom Slider */}
      <input
        type="range"
        min={minZoom}
        max={maxZoom}
        step="0.05"
        value={zoom}
        onChange={handleSliderChange}
        className="w-24 h-2 rounded-lg appearance-none bg-white/20 cursor-pointer zoom-slider"
        title={`Zoom: ${zoomPercent}% (drag to adjust)`}
        aria-label="Zoom slider"
      />

      {/* Zoom Percentage Display */}
      <div
        className="text-sm font-medium text-[color:var(--accent)] min-w-12 text-right cursor-pointer hover:text-white/80 transition-colors"
        onClick={handleReset}
        title="Click to reset zoom (Ctrl+0)"
      >
        {zoomPercent}%
      </div>

      {/* Zoom In Button */}
      <button
        onClick={handleZoomIn}
        disabled={zoom >= maxZoom}
        className="p-1.5 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Zoom in (Ctrl++)"
        aria-label="Zoom in"
      >
        🔍+
      </button>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="p-1.5 rounded hover:bg-white/10 transition-colors text-xs"
        title="Reset to 100% (Ctrl+0)"
        aria-label="Reset zoom"
      >
        Reset
      </button>

      <style>{`
        .zoom-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        }

        .zoom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        }

        .zoom-slider::-webkit-slider-runnable-track {
          background: linear-gradient(to right, var(--accent), var(--accent));
          height: 4px;
          border-radius: 2px;
        }

        .zoom-slider::-moz-range-track {
          background: transparent;
          border: none;
        }

        .zoom-slider::-moz-range-progress {
          background: var(--accent);
          height: 4px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  )
}

