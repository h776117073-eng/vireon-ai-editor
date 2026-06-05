import React from 'react'

type Props = {
  zoom: number
  setZoom: (z: number) => void
}

export default function ZoomControls({ zoom, setZoom }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setZoom(Math.max(0.2, zoom - 0.2))} className="p-2 glass rounded">-</button>
      <div className="text-sm text-[color:var(--muted)]">{Math.round(zoom * 100)}%</div>
      <button onClick={() => setZoom(Math.min(4, zoom + 0.2))} className="p-2 glass rounded">+</button>
    </div>
  )
}
