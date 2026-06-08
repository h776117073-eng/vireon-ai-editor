import { useCallback, useRef, useMemo, useEffect } from 'react'
import { TimelineZoomController, ZoomConfig, ZoomState, DEFAULT_ZOOM_CONFIG } from '@/utils/timelineZoomController'

export interface UseTimelineZoomOptions extends Partial<ZoomConfig> {
  onZoomChange?: (zoomState: ZoomState) => void
  enableKeyboardShortcuts?: boolean
}

export interface UseTimelineZoomReturn {
  zoomController: TimelineZoomController
  zoomState: ZoomState
  zoomPercent: number
  zoomIn: () => void
  zoomOut: () => void
  setZoom: (level: number) => void
  setZoomPercent: (percent: number) => void
  reset: () => void
  timeToPixels: (time: number) => number
  pixelsToTime: (pixels: number) => number
  snapToFrame: (time: number, direction?: 'nearest' | 'floor' | 'ceil') => number
  formatTimeWithFrames: (time: number) => string
  calculateScrollForCenter: (
    playheadTime: number,
    viewportWidth: number,
    contentWidth: number
  ) => { scrollOffset: number; viewportCenter: number }
  getContentWidth: (duration: number, minWidth?: number) => number
  getVisibleTimeRange: (scrollOffset: number, viewportWidth: number, duration: number) => { startTime: number; endTime: number }
  isClipVisible: (clipStart: number, clipEnd: number, scrollOffset: number, viewportWidth: number) => boolean
  calculateZoomToFit: (duration: number, viewportWidth: number) => void
}

/**
 * React hook for timeline zoom management
 * Provides zoom control, frame precision, and playhead centering
 */
export function useTimelineZoom(options: UseTimelineZoomOptions = {}): UseTimelineZoomReturn {
  const {
    onZoomChange,
    enableKeyboardShortcuts = true,
    ...zoomConfig
  } = options

  const controllerRef = useRef<TimelineZoomController>(
    new TimelineZoomController(zoomConfig)
  )

  const controller = controllerRef.current

  // Memoize zoom state to prevent unnecessary re-renders
  const zoomState = useMemo(() => {
    return controller.getZoomState()
  }, [controller.currentZoom]) // Note: accessing private field for dependency

  const zoomPercent = useMemo(() => controller.getZoomPercent(), [zoomState])

  const handleZoomChange = useCallback((newState: ZoomState) => {
    onZoomChange?.(newState)
  }, [onZoomChange])

  const zoomIn = useCallback(() => {
    const newState = controller.zoomIn()
    handleZoomChange(newState)
  }, [controller, handleZoomChange])

  const zoomOut = useCallback(() => {
    const newState = controller.zoomOut()
    handleZoomChange(newState)
  }, [controller, handleZoomChange])

  const setZoom = useCallback((level: number) => {
    const newState = controller.setZoom(level)
    handleZoomChange(newState)
  }, [controller, handleZoomChange])

  const setZoomPercent = useCallback((percent: number) => {
    const newState = controller.setZoomPercent(percent)
    handleZoomChange(newState)
  }, [controller, handleZoomChange])

  const reset = useCallback(() => {
    const newState = controller.reset()
    handleZoomChange(newState)
  }, [controller, handleZoomChange])

  const timeToPixels = useCallback((time: number) => {
    return controller.timeToPixels(time)
  }, [controller])

  const pixelsToTime = useCallback((pixels: number) => {
    return controller.pixelsToTime(pixels)
  }, [controller])

  const snapToFrame = useCallback((
    time: number,
    direction: 'nearest' | 'floor' | 'ceil' = 'nearest'
  ) => {
    return controller.snapToFrame(time, undefined, direction)
  }, [controller])

  const formatTimeWithFrames = useCallback((time: number) => {
    return controller.formatTimeWithFrames(time)
  }, [controller])

  const calculateScrollForCenter = useCallback((
    playheadTime: number,
    viewportWidth: number,
    contentWidth: number
  ) => {
    return controller.calculateScrollForCenter(playheadTime, viewportWidth, contentWidth)
  }, [controller])

  const getContentWidth = useCallback((duration: number, minWidth?: number) => {
    return controller.getContentWidth(duration, minWidth)
  }, [controller])

  const getVisibleTimeRange = useCallback((
    scrollOffset: number,
    viewportWidth: number,
    duration: number
  ) => {
    return controller.getVisibleTimeRange(scrollOffset, viewportWidth, duration)
  }, [controller])

  const isClipVisible = useCallback((
    clipStart: number,
    clipEnd: number,
    scrollOffset: number,
    viewportWidth: number
  ) => {
    return controller.isClipVisible(clipStart, clipEnd, scrollOffset, viewportWidth)
  }, [controller])

  const calculateZoomToFit = useCallback((duration: number, viewportWidth: number) => {
    const newState = controller.calculateZoomToFit(duration, viewportWidth)
    handleZoomChange(newState)
  }, [controller, handleZoomChange])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Plus/Equals: Zoom in
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault()
        zoomIn()
      }
      // Ctrl/Cmd + Minus: Zoom out
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        zoomOut()
      }
      // Ctrl/Cmd + 0: Reset zoom
      else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        reset()
      }
      // Ctrl/Cmd + 1: Fit to window
      else if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault()
        // Note: Would need viewportWidth from context - emit event instead
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardShortcuts, zoomIn, zoomOut, reset])

  return {
    zoomController: controller,
    zoomState,
    zoomPercent,
    zoomIn,
    zoomOut,
    setZoom,
    setZoomPercent,
    reset,
    timeToPixels,
    pixelsToTime,
    snapToFrame,
    formatTimeWithFrames,
    calculateScrollForCenter,
    getContentWidth,
    getVisibleTimeRange,
    isClipVisible,
    calculateZoomToFit
  }
}
