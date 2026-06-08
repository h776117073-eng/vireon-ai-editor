/**
 * Professional timeline zoom controller
 * Handles zoom levels, frame-level precision, and performance optimization
 */

export interface ZoomConfig {
  minZoom: number           // Minimum zoom level (default: 0.1)
  maxZoom: number           // Maximum zoom level (default: 8)
  basePixelsPerSec: number  // Pixels per second at zoom 1x (default: 120)
  defaultFps: number        // Default frames per second for precision (default: 30)
  zoomStep: number          // Zoom increment per scroll/click (default: 0.1)
}

export interface ZoomState {
  level: number             // Current zoom multiplier (0.1 - 8.0)
  pixelsPerSec: number      // Calculated pixels per second
  frameWidth: number        // Pixels per frame at current zoom
}

export interface FramePrecision {
  frameNumber: number       // Current frame number
  frameOffset: number       // Offset within frame (0-1)
  fps: number              // Frames per second
}

export interface ScrollCenteringResult {
  scrollOffset: number      // Pixel offset to center on playhead
  viewportCenter: number    // Center of visible area in pixels
}

/**
 * Default zoom configuration
 */
export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  minZoom: 0.1,
  maxZoom: 8.0,
  basePixelsPerSec: 120,
  defaultFps: 30,
  zoomStep: 0.1
}

/**
 * Professional timeline zoom controller
 */
export class TimelineZoomController {
  private config: ZoomConfig
  private currentZoom: number = 1

  constructor(config: Partial<ZoomConfig> = {}) {
    this.config = { ...DEFAULT_ZOOM_CONFIG, ...config }
    this.currentZoom = 1
  }

  /**
   * Get current zoom state
   */
  getZoomState(): ZoomState {
    const pixelsPerSec = this.config.basePixelsPerSec * this.currentZoom
    const secondsPerFrame = 1 / this.config.defaultFps
    const frameWidth = pixelsPerSec * secondsPerFrame

    return {
      level: this.currentZoom,
      pixelsPerSec,
      frameWidth
    }
  }

  /**
   * Set zoom level with constraints
   */
  setZoom(level: number): ZoomState {
    this.currentZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, level))
    return this.getZoomState()
  }

  /**
   * Zoom in by a step
   */
  zoomIn(): ZoomState {
    return this.setZoom(this.currentZoom + this.config.zoomStep)
  }

  /**
   * Zoom out by a step
   */
  zoomOut(): ZoomState {
    return this.setZoom(this.currentZoom - this.config.zoomStep)
  }

  /**
   * Zoom to a specific percentage (0-400)
   */
  setZoomPercent(percent: number): ZoomState {
    const level = percent / 100
    return this.setZoom(level)
  }

  /**
   * Get current zoom as percentage
   */
  getZoomPercent(): number {
    return Math.round(this.currentZoom * 100)
  }

  /**
   * Convert time to pixels at current zoom
   */
  timeToPixels(time: number): number {
    const { pixelsPerSec } = this.getZoomState()
    return time * pixelsPerSec
  }

  /**
   * Convert pixels to time at current zoom
   */
  pixelsToTime(pixels: number): number {
    const { pixelsPerSec } = this.getZoomState()
    return pixels / pixelsPerSec
  }

  /**
   * Convert time to frame number with sub-frame precision
   */
  timeToFrame(time: number, fps?: number): FramePrecision {
    const framerate = fps ?? this.config.defaultFps
    const frameNumber = Math.floor(time * framerate)
    const frameOffset = (time * framerate) - frameNumber

    return {
      frameNumber,
      frameOffset,
      fps: framerate
    }
  }

  /**
   * Convert frame number to time
   */
  frameToTime(frameNumber: number, fps?: number): number {
    const framerate = fps ?? this.config.defaultFps
    return frameNumber / framerate
  }

  /**
   * Snap time to nearest frame
   */
  snapToFrame(time: number, fps?: number, direction: 'nearest' | 'floor' | 'ceil' = 'nearest'): number {
    const framerate = fps ?? this.config.defaultFps
    const frameCount = time * framerate

    let snappedFrame: number
    if (direction === 'floor') {
      snappedFrame = Math.floor(frameCount)
    } else if (direction === 'ceil') {
      snappedFrame = Math.ceil(frameCount)
    } else {
      snappedFrame = Math.round(frameCount)
    }

    return this.frameToTime(snappedFrame, framerate)
  }

  /**
   * Format time as HH:MM:SS:FF (with frame number)
   */
  formatTimeWithFrames(time: number, fps?: number): string {
    const framerate = fps ?? this.config.defaultFps
    const frame = this.timeToFrame(time, framerate)

    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    const frames = frame.frameNumber % framerate

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
  }

  /**
   * Calculate scroll offset to center playhead in viewport
   */
  calculateScrollForCenter(
    playheadTime: number,
    viewportWidth: number,
    contentWidth: number
  ): ScrollCenteringResult {
    const { pixelsPerSec } = this.getZoomState()
    const playheadPixels = playheadTime * pixelsPerSec
    const viewportCenter = viewportWidth / 2

    let scrollOffset = playheadPixels - viewportCenter

    // Constrain to valid scroll range
    const maxScroll = Math.max(0, contentWidth - viewportWidth)
    scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll))

    return {
      scrollOffset,
      viewportCenter
    }
  }

  /**
   * Get content width for timeline
   */
  getContentWidth(duration: number, minWidth: number = 800): number {
    const { pixelsPerSec } = this.getZoomState()
    return Math.max(minWidth, duration * pixelsPerSec)
  }

  /**
   * Calculate visible time range based on scroll position
   */
  getVisibleTimeRange(
    scrollOffset: number,
    viewportWidth: number,
    duration: number
  ): { startTime: number; endTime: number } {
    const startTime = this.pixelsToTime(scrollOffset)
    const endTime = this.pixelsToTime(scrollOffset + viewportWidth)

    return {
      startTime: Math.max(0, startTime),
      endTime: Math.min(duration, endTime)
    }
  }

  /**
   * Check if clip is visible in current viewport
   */
  isClipVisible(
    clipStart: number,
    clipEnd: number,
    scrollOffset: number,
    viewportWidth: number
  ): boolean {
    const visibleRange = this.getVisibleTimeRange(scrollOffset, viewportWidth, clipEnd)
    return clipEnd > visibleRange.startTime && clipStart < visibleRange.endTime
  }

  /**
   * Calculate optimal zoom to fit duration in viewport
   */
  calculateZoomToFit(duration: number, viewportWidth: number): ZoomState {
    // Calculate required pixelsPerSec to fit duration in viewport
    const requiredPixelsPerSec = viewportWidth / duration
    // Convert to zoom level
    const requiredZoom = requiredPixelsPerSec / this.config.basePixelsPerSec
    // Clamp to valid range
    return this.setZoom(requiredZoom)
  }

  /**
   * Calculate optimal zoom for given detail level
   */
  calculateZoomForFrameDetail(
    pixelsPerFrameTarget: number,
    fps?: number
  ): ZoomState {
    const framerate = fps ?? this.config.defaultFps
    const secondsPerFrame = 1 / framerate
    const requiredPixelsPerSec = pixelsPerFrameTarget / secondsPerFrame
    const requiredZoom = requiredPixelsPerSec / this.config.basePixelsPerSec
    return this.setZoom(requiredZoom)
  }

  /**
   * Interpolate zoom from current to target level (for smooth animation)
   */
  interpolateZoom(targetZoom: number, progress: number): ZoomState {
    const interpolated = this.currentZoom + (targetZoom - this.currentZoom) * progress
    const constrained = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, interpolated))
    this.currentZoom = constrained
    return this.getZoomState()
  }

  /**
   * Reset zoom to 1x
   */
  reset(): ZoomState {
    this.currentZoom = 1
    return this.getZoomState()
  }
}
