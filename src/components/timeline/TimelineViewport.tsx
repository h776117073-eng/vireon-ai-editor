import React, { useRef, useEffect, useState } from 'react'
import { TimelineStateManager } from '@/services/timelineStateManager'
import { Track } from '@/types/timeline'

type Props = {
  duration: number
  currentTime: number
  zoom: number
  tracks: Track[]
  children?: React.ReactNode
  onScrollOffsetChange?: (offset: number) => void
}

export default function TimelineViewport({
  duration,
  currentTime,
  zoom,
  tracks,
  children,
  onScrollOffsetChange
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)

  const pixelsPerSec = 120 * zoom

  // Update viewport width on mount and window resize
  useEffect(() => {
    const updateWidth = () => {
      if (scrollRef.current) {
        setViewportWidth(scrollRef.current.clientWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Auto-scroll to keep playhead (center) aligned with currentTime
  useEffect(() => {
    if (scrollRef.current && viewportWidth > 0) {
      const targetScroll = TimelineStateManager.calculateScrollOffset(
        currentTime,
        viewportWidth,
        pixelsPerSec
      )

      // Smooth scroll to target
      scrollRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      })
    }
  }, [currentTime, viewportWidth, pixelsPerSec])

  // Handle manual scroll updates
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newOffset = (e.currentTarget as HTMLDivElement).scrollLeft
    setScrollOffset(newOffset)
    onScrollOffsetChange?.(newOffset)
  }

  const contentWidth = Math.max(800, duration * pixelsPerSec)

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto scroll-smooth relative w-full"
      style={{ height: 260 }}
      onScroll={handleScroll}
    >
      <div
        className="relative"
        style={{
          width: contentWidth,
          height: '100%'
        }}
      >
        {children}
      </div>
    </div>
  )
}
