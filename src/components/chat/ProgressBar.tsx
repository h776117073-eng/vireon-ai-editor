import React from 'react'

export default function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-[rgba(255,255,255,0.03)] rounded h-2 overflow-hidden">
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} className="h-full bg-accent transition-all" />
    </div>
  )
}
