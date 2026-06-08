/**
 * Animation interpolation engine
 * Handles keyframe interpolation, easing functions, and value computation
 */

import {
  Keyframe,
  AnimationValue,
  InterpolationMode,
  InterpolatedValue,
  AnimationTrack,
  ComputedAnimationState,
  AnimationContext
} from '@/types/animation'

/**
 * Easing functions for smooth animations
 */
export const EASING_FUNCTIONS: Record<InterpolationMode, (t: number) => number> = {
  linear: (t: number) => t,

  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => {
    const t1 = t - 1
    return 1 + t1 * t1 * t1
  },
  easeInOutCubic: (t: number) => {
    if (t < 0.5) {
      return 4 * t * t * t
    } else {
      const t1 = 2 * t - 2
      return 1 + t1 * t1 * t1 / 2
    }
  }
}

/**
 * Interpolate between two numeric values
 */
export function interpolateNumber(
  from: number,
  to: number,
  progress: number,
  easing: InterpolationMode = 'linear'
): number {
  const easingFn = EASING_FUNCTIONS[easing] || EASING_FUNCTIONS.linear
  const easedProgress = easingFn(Math.max(0, Math.min(1, progress)))
  return from + (to - from) * easedProgress
}

/**
 * Interpolate between two vector2 values (objects with x, y)
 */
export function interpolateVector2(
  from: { x: number; y: number },
  to: { x: number; y: number },
  progress: number,
  easing: InterpolationMode = 'linear'
): { x: number; y: number } {
  return {
    x: interpolateNumber(from.x, to.x, progress, easing),
    y: interpolateNumber(from.y, to.y, progress, easing)
  }
}

/**
 * Interpolate between two animation values
 */
export function interpolateValue(
  from: AnimationValue,
  to: AnimationValue,
  progress: number,
  easing: InterpolationMode = 'linear'
): AnimationValue {
  // Both are numbers
  if (typeof from === 'number' && typeof to === 'number') {
    return interpolateNumber(from, to, progress, easing)
  }

  // Both are vector2
  if (typeof from === 'object' && typeof to === 'object') {
    return interpolateVector2(from, to, progress, easing)
  }

  // Type mismatch - return 'to' value
  return to
}

/**
 * Find keyframe pair at or around a specific time
 */
export function findKeyframesAtTime(
  keyframes: Keyframe[],
  time: number
): { before: Keyframe | null; after: Keyframe | null; isAtKeyframe: boolean } {
  if (keyframes.length === 0) {
    return { before: null, after: null, isAtKeyframe: false }
  }

  // Find keyframes bracketing the time
  let before: Keyframe | null = null
  let after: Keyframe | null = null

  for (const kf of keyframes) {
    if (kf.time <= time) {
      before = kf
    } else if (after === null) {
      after = kf
      break
    }
  }

  // Check if we're exactly at a keyframe
  const isAtKeyframe = before !== null && Math.abs(before.time - time) < 0.001

  return { before, after, isAtKeyframe }
}

/**
 * Interpolate value at a specific time for an animation track
 */
export function interpolateAnimationTrack(
  track: AnimationTrack,
  time: number
): InterpolatedValue {
  const { before, after, isAtKeyframe } = findKeyframesAtTime(track.keyframes, time)

  // No keyframes
  if (before === null && after === null) {
    return {
      value: track.defaultValue,
      keyframesBefore: null,
      keyframesAfter: null,
      progress: 0
    }
  }

  // Before keyframe (use its value)
  if (after === null) {
    return {
      value: before!.value,
      keyframesBefore: before,
      keyframesAfter: null,
      progress: 1
    }
  }

  // Exactly at a keyframe
  if (isAtKeyframe) {
    return {
      value: before!.value,
      keyframesBefore: before,
      keyframesAfter: after,
      progress: 0
    }
  }

  // Before first keyframe (use its value but show as approaching)
  if (before === null) {
    return {
      value: after!.value,
      keyframesBefore: null,
      keyframesAfter: after,
      progress: 0
    }
  }

  // Interpolate between keyframes
  const duration = after.time - before.time
  const elapsed = time - before.time
  const progress = elapsed / duration
  const easing = before.easing || 'linear'

  const interpolatedValue = interpolateValue(
    before.value,
    after.value,
    progress,
    easing
  )

  return {
    value: interpolatedValue,
    keyframesBefore: before,
    keyframesAfter: after,
    progress
  }
}

/**
 * Compute complete animation state at a specific time
 */
export function computeAnimationState(context: AnimationContext): ComputedAnimationState {
  const state: ComputedAnimationState = {}

  if (!context.animations || !context.animations.enabled) {
    return state
  }

  for (const track of context.animations.tracks) {
    if (!track.enabled) continue

    const interpolated = interpolateAnimationTrack(track, context.currentTime)

    // Parse property name and set state
    if (track.propertyName === 'position.x' || track.propertyName === 'position.y') {
      if (!state.position) state.position = { x: 0, y: 0 }
      const key = track.propertyName.split('.')[1] as 'x' | 'y'
      state.position[key] = interpolated.value as number
    } else if (track.propertyName === 'scale.x' || track.propertyName === 'scale.y') {
      if (!state.scale) state.scale = { x: 1, y: 1 }
      const key = track.propertyName.split('.')[1] as 'x' | 'y'
      state.scale[key] = interpolated.value as number
    } else if (track.propertyName === 'rotation') {
      state.rotation = interpolated.value as number
    } else if (track.propertyName === 'opacity') {
      state.opacity = interpolated.value as number
    } else {
      // Custom property
      state[track.propertyName] = interpolated.value
    }
  }

  return state
}

/**
 * Apply animation state to CSS transform string
 */
export function animationStateToTransform(state: ComputedAnimationState): string {
  const transforms: string[] = []

  if (state.position) {
    transforms.push(`translate(${state.position.x}px, ${state.position.y}px)`)
  }

  if (state.scale) {
    transforms.push(`scale(${state.scale.x}, ${state.scale.y})`)
  }

  if (state.rotation !== undefined) {
    transforms.push(`rotate(${state.rotation}deg)`)
  }

  return transforms.join(' ')
}

/**
 * Apply animation state to CSS style object
 */
export function applyAnimationState(state: ComputedAnimationState): Partial<React.CSSProperties> {
  const style: Partial<React.CSSProperties> = {}

  if (state.position || state.scale || state.rotation !== undefined) {
    style.transform = animationStateToTransform(state)
  }

  if (state.opacity !== undefined) {
    style.opacity = state.opacity
  }

  return style
}

/**
 * Check if any keyframes exist in a track
 */
export function hasKeyframes(track: AnimationTrack): boolean {
  return track.keyframes.length > 0
}

/**
 * Check if keyframe exists at a specific time
 */
export function keyframeExistsAt(track: AnimationTrack, time: number, tolerance: number = 0.001): Keyframe | undefined {
  return track.keyframes.find(kf => Math.abs(kf.time - time) < tolerance)
}

/**
 * Get all keyframe times in a track
 */
export function getKeyframeTimes(track: AnimationTrack): number[] {
  return track.keyframes.map(kf => kf.time)
}

/**
 * Get nearest keyframe to a specific time
 */
export function getNearestKeyframe(track: AnimationTrack, time: number): Keyframe | undefined {
  if (track.keyframes.length === 0) return undefined

  return track.keyframes.reduce((nearest, kf) => {
    const currentDist = Math.abs(kf.time - time)
    const nearestDist = Math.abs(nearest.time - time)
    return currentDist < nearestDist ? kf : nearest
  })
}

/**
 * Duration from keyframe to next keyframe
 */
export function getKeyframeSegmentDuration(track: AnimationTrack, keyframeIndex: number): number {
  if (keyframeIndex >= track.keyframes.length - 1) {
    return 0
  }

  const current = track.keyframes[keyframeIndex]
  const next = track.keyframes[keyframeIndex + 1]
  return next.time - current.time
}
