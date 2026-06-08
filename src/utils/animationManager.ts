/**
 * Animation manager - handles keyframe creation, modification, and deletion
 * Works with Redux actions to manage animation state
 */

import {
  Keyframe,
  AnimationTrack,
  ClipAnimation,
  AnimationValue,
  InterpolationMode,
  ANIMATION_PROPERTIES,
  AnimationPropertyType
} from '@/types/animation'

/**
 * Generate unique keyframe ID
 */
function generateKeyframeId(clipId: string, propertyName: string, time: number, index: number): string {
  return `${clipId}_${propertyName.replace('.', '_')}_${Math.floor(time * 1000)}_${index}`
}

/**
 * Create a new keyframe
 */
export function createKeyframe(
  clipId: string,
  propertyName: string,
  time: number,
  value: AnimationValue,
  easing: InterpolationMode = 'linear'
): Keyframe {
  // Find next available index for this property/time
  let index = 0
  let id = generateKeyframeId(clipId, propertyName, time, index)
  while (id === id) {
    index++
    id = generateKeyframeId(clipId, propertyName, time, index)
  }

  return {
    id,
    time,
    value,
    easing
  }
}

/**
 * Create animation track for a property
 */
export function createAnimationTrack(
  clipId: string,
  propertyName: AnimationPropertyType
): AnimationTrack {
  const propDef = ANIMATION_PROPERTIES[propertyName]

  if (!propDef) {
    throw new Error(`Unknown animation property: ${propertyName}`)
  }

  return {
    id: `${clipId}_${propertyName}`,
    propertyName,
    keyframes: [],
    enabled: true,
    defaultValue: propDef.defaultValue
  }
}

/**
 * Create clip animation container
 */
export function createClipAnimation(clipId: string): ClipAnimation {
  return {
    clipId,
    tracks: [],
    enabled: true
  }
}

/**
 * Add keyframe to animation track
 */
export function addKeyframeToTrack(
  track: AnimationTrack,
  time: number,
  value: AnimationValue,
  easing?: InterpolationMode
): AnimationTrack {
  // Create new keyframe
  const keyframe = createKeyframe(track.id.split('_')[0], track.propertyName, time, value, easing)

  // Add to keyframes array
  const newKeyframes = [...track.keyframes, keyframe]

  // Sort by time
  newKeyframes.sort((a, b) => a.time - b.time)

  return {
    ...track,
    keyframes: newKeyframes
  }
}

/**
 * Remove keyframe from track
 */
export function removeKeyframeFromTrack(
  track: AnimationTrack,
  keyframeId: string
): AnimationTrack {
  return {
    ...track,
    keyframes: track.keyframes.filter(kf => kf.id !== keyframeId)
  }
}

/**
 * Update keyframe value
 */
export function updateKeyframeValue(
  track: AnimationTrack,
  keyframeId: string,
  newValue: AnimationValue,
  newEasing?: InterpolationMode
): AnimationTrack {
  return {
    ...track,
    keyframes: track.keyframes.map(kf =>
      kf.id === keyframeId
        ? {
            ...kf,
            value: newValue,
            easing: newEasing ?? kf.easing
          }
        : kf
    )
  }
}

/**
 * Update keyframe time (with re-sorting)
 */
export function updateKeyframeTime(
  track: AnimationTrack,
  keyframeId: string,
  newTime: number
): AnimationTrack {
  const newKeyframes = track.keyframes.map(kf =>
    kf.id === keyframeId ? { ...kf, time: newTime } : kf
  )

  // Re-sort by time
  newKeyframes.sort((a, b) => a.time - b.time)

  return {
    ...track,
    keyframes: newKeyframes
  }
}

/**
 * Add or get animation track for a property
 */
export function ensureAnimationTrack(
  animation: ClipAnimation,
  propertyName: AnimationPropertyType
): AnimationTrack {
  const existing = animation.tracks.find(t => t.propertyName === propertyName)

  if (existing) {
    return existing
  }

  return createAnimationTrack(animation.clipId, propertyName)
}

/**
 * Add animation track to clip animation
 */
export function addAnimationTrackToClip(
  animation: ClipAnimation,
  track: AnimationTrack
): ClipAnimation {
  // Check if track already exists
  const existingIndex = animation.tracks.findIndex(t => t.propertyName === track.propertyName)

  if (existingIndex >= 0) {
    // Replace existing
    const newTracks = [...animation.tracks]
    newTracks[existingIndex] = track
    return { ...animation, tracks: newTracks }
  } else {
    // Add new
    return {
      ...animation,
      tracks: [...animation.tracks, track]
    }
  }
}

/**
 * Remove animation track from clip animation
 */
export function removeAnimationTrackFromClip(
  animation: ClipAnimation,
  propertyName: AnimationPropertyType
): ClipAnimation {
  return {
    ...animation,
    tracks: animation.tracks.filter(t => t.propertyName !== propertyName)
  }
}

/**
 * Get animation track by property name
 */
export function getAnimationTrack(
  animation: ClipAnimation,
  propertyName: AnimationPropertyType
): AnimationTrack | undefined {
  return animation.tracks.find(t => t.propertyName === propertyName)
}

/**
 * Check if clip has animations
 */
export function hasAnimations(animation: ClipAnimation | undefined): boolean {
  if (!animation) return false
  return animation.tracks.some(track => track.keyframes.length > 0)
}

/**
 * Get all animated properties
 */
export function getAnimatedProperties(animation: ClipAnimation): AnimationPropertyType[] {
  return animation.tracks
    .filter(track => track.keyframes.length > 0)
    .map(track => track.propertyName)
}

/**
 * Clear all keyframes from a track
 */
export function clearTrackKeyframes(track: AnimationTrack): AnimationTrack {
  return {
    ...track,
    keyframes: []
  }
}

/**
 * Shift all keyframes in a track by a time offset
 * Useful when clips are moved or trimmed
 */
export function shiftKeyframesByTime(
  track: AnimationTrack,
  offset: number,
  minTime: number = 0,
  maxTime: number = Infinity
): AnimationTrack {
  return {
    ...track,
    keyframes: track.keyframes
      .map(kf => ({
        ...kf,
        time: kf.time + offset
      }))
      .filter(kf => kf.time >= minTime && kf.time <= maxTime)
  }
}

/**
 * Scale keyframe times (useful for clip duration changes)
 */
export function scaleKeyframeTimes(
  track: AnimationTrack,
  scaleFactor: number
): AnimationTrack {
  return {
    ...track,
    keyframes: track.keyframes.map(kf => ({
      ...kf,
      time: kf.time * scaleFactor
    }))
  }
}

/**
 * Copy animation from one clip to another
 */
export function copyAnimation(
  sourceAnimation: ClipAnimation,
  targetClipId: string,
  timeOffset: number = 0
): ClipAnimation {
  const targetAnimation = createClipAnimation(targetClipId)

  for (const sourceTrack of sourceAnimation.tracks) {
    const newTrack = createAnimationTrack(targetClipId, sourceTrack.propertyName)

    // Copy keyframes with time offset
    const newKeyframes = sourceTrack.keyframes.map(kf => ({
      ...kf,
      id: generateKeyframeId(targetClipId, sourceTrack.propertyName, kf.time + timeOffset, 0),
      time: kf.time + timeOffset
    }))

    targetAnimation.tracks.push({
      ...newTrack,
      keyframes: newKeyframes
    })
  }

  return targetAnimation
}

/**
 * Merge two animations (second overrides first where there are conflicts)
 */
export function mergeAnimations(
  animation1: ClipAnimation,
  animation2: ClipAnimation
): ClipAnimation {
  const merged = createClipAnimation(animation1.clipId)

  // Add all tracks from animation1
  merged.tracks = [...animation1.tracks]

  // Merge/override with animation2
  for (const track2 of animation2.tracks) {
    const existingIndex = merged.tracks.findIndex(t => t.propertyName === track2.propertyName)

    if (existingIndex >= 0) {
      merged.tracks[existingIndex] = track2
    } else {
      merged.tracks.push(track2)
    }
  }

  return merged
}
