import React from 'react'

type Props = {
  duration: number
  pixelsPerSec: number
  scrollOffset: number
}

export default function TimeRuler({ duration, pixelsPerSec, scrollOffset }: Props) {
  const totalPx = Math.max(0, duration * pixelsPerSec)
  const approxTicks = Math.max(5, Math.floor(totalPx / 120))
  const secondsPerTick = Math.max(1, duration / approxTicks)

  const ticks = [] as number[]
  for (let t = 0; t <= duration; t += secondsPerTick) ticks.push(t)

  return (
    <div className="w-full overflow-hidden">
      <div className="relative h-8">
        <div className="flex" style={{ width: totalPx, transform: `translateX(-${scrollOffset}px)` }}>
          {ticks.map((t, i) => (
            <div key={i} style={{ left: (t / duration) * 100 + '%' }} className="absolute">
              <div className="h-2 w-px bg-[rgba(255,255,255,0.06)]" />
              <div className="text-xs text-[color:var(--muted)] mt-1">{formatTime(t)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatTime(s: number) {
  const mm = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
