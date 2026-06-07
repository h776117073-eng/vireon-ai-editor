import { timeToPixels, pixelsToTime } from '@/utils/seekingUtils'

export class TimelineStateManager {
  // Calculate scroll position to center the playhead at the given time
  static calculateScrollOffset(
    currentTime: number,
    viewportWidth: number,
    pixelsPerSec: number
  ): number {
    const timelinePixelPosition = timeToPixels(currentTime, pixelsPerSec)
    const centerOffset = viewportWidth / 2
    return Math.max(0, timelinePixelPosition - centerOffset)
  }

  // Calculate the center position in pixels relative to the viewport
  static calculateCenterOffset(viewportWidth: number): number {
    return viewportWidth / 2
  }

  // Convert pixel offset (accounting for scroll) to time
  static pixelsToTime(pixelOffset: number, scrollOffset: number, pixelsPerSec: number): number {
    const absolutePixel = scrollOffset + pixelOffset
    return pixelsToTime(absolutePixel, pixelsPerSec)
  }

  // Convert time to pixel position (accounting for scroll)
  static timeToPixels(
    time: number,
    scrollOffset: number,
    pixelsPerSec: number
  ): number {
    const absolutePixel = timeToPixels(time, pixelsPerSec)
    return absolutePixel - scrollOffset
  }

  // Calculate drag delta (in pixels) to time delta
  static dragDeltaToTime(dragPixels: number, pixelsPerSec: number): number {
    return pixelsToTime(dragPixels, pixelsPerSec)
  }

  // Get the viewport's visible time range [start, end]
  static getVisibleTimeRange(
    scrollOffset: number,
    viewportWidth: number,
    pixelsPerSec: number
  ): [number, number] {
    const startTime = pixelsToTime(scrollOffset, pixelsPerSec)
    const endTime = pixelsToTime(scrollOffset + viewportWidth, pixelsPerSec)
    return [startTime, endTime]
  }
}
