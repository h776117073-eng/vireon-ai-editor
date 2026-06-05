import React from 'react'

export default function Icon({ name, className = '' }: { name: string; className?: string }) {
  // Minimal icon mapping for demo; extendable
  const icons: Record<string, JSX.Element> = {
    play: <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 3v18l15-9L5 3z"/></svg>
  }
  return icons[name] ?? <span />
}
