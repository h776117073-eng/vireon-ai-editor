// Frame-accurate seeking and coordinate transformation utilities

export function clampTime(time: number, duration: number): number {
  return Math.max(0, Math.min(duration, time))
}

export function timeToPixels(time: number, pixelsPerSec: number): number {
  return time * pixelsPerSec
}

export function pixelsToTime(pixels: number, pixelsPerSec: number): number {
  return pixels / pixelsPerSec
}

export function frameAccurateSeek(
  videoElement: HTMLVideoElement,
  targetTime: number,
  duration: number
): void {
  const clampedTime = clampTime(targetTime, duration)
  videoElement.currentTime = clampedTime
}

export function frameToTime(frame: number, fps: number): number {
  return frame / fps
}

export function timeToFrame(time: number, fps: number): number {
  return Math.round(time * fps)
}

export function seekToFrame(
  videoElement: HTMLVideoElement,
  frame: number,
  fps: number,
  duration: number
): void {
  const time = frameToTime(frame, fps)
  frameAccurateSeek(videoElement, time, duration)
}
