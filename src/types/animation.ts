/**
 * Keyframe animation system types and interfaces
 * Supports position, scale, rotation, opacity and extensible for future properties
 */

/**
 * Supported animation property types
 */
export type AnimationPropertyType = 'position' | 'scale' | 'rotation' | 'opacity' | string

/**
 * Animation property value - can be number or object with x/y components
 */
export type AnimationValue = number | { x: number; y: number }

/**
 * Interpolation mode between keyframes
 */
export type InterpolationMode = 'linear' | 'easeInQuad' | 'easeOutQuad' | 'easeInOutQuad' | 'easeInCubic' | 'easeOutCubic' | string

/**
 * Single keyframe at a specific time with a value
 */
export interface Keyframe {
  id: string                      // Unique identifier (clip_prop_time_index)
  time: number                    // Time relative to clip start (0-duration)
  value: AnimationValue          // Value at this keyframe
  easing?: InterpolationMode     // Easing to next keyframe
}

/**
 * Animation property track - stores all keyframes for one property on a clip
 */
export interface AnimationTrack {
  id: string                      // Property-specific ID (clipId_propertyName)
  propertyName: AnimationPropertyType
  keyframes: Keyframe[]          // Sorted by time
  enabled: boolean               // Whether to apply this animation
  defaultValue: AnimationValue   // Value when no keyframes are active
}

/**
 * Complete animation state for a clip
 */
export interface ClipAnimation {
  clipId: string                 // Reference to parent clip
  tracks: AnimationTrack[]       // All animation property tracks
  enabled: boolean               // Master enable/disable
}

/**
 * Animation property definition - describes a property that can be animated
 */
export interface AnimationPropertyDef {
  name: AnimationPropertyType
  label: string                  // Display name (e.g., "Position X")
  type: 'number' | 'vector2'     // Value type
  min?: number                   // Min value (for numbers)
  max?: number                   // Max value (for numbers)
  unit?: string                  // Display unit (e.g., "px", "°")
  defaultValue: AnimationValue
  category: 'transform' | 'appearance' | 'audio' | 'custom'  // For grouping
  trackKinds: string[]           // Which track kinds support this (e.g., ['main-video', 'overlay-video'])
}

/**
 * Interpolated value at a specific time with metadata
 */
export interface InterpolatedValue {
  value: AnimationValue
  keyframesBefore: Keyframe | null     // Previous keyframe
  keyframesAfter: Keyframe | null      // Next keyframe
  progress: number                     // 0-1 between keyframes
}

/**
 * Registry of available animation properties
 */
export interface AnimationPropertyRegistry {
  [propertyName: string]: AnimationPropertyDef
}

/**
 * Predefined animation properties
 */
export const ANIMATION_PROPERTIES: AnimationPropertyRegistry = {
  'position.x': {
    name: 'position.x',
    label: 'Position X',
    type: 'number',
    unit: 'px',
    defaultValue: 0,
    category: 'transform',
    trackKinds: ['main-video', 'overlay-video', 'text']
  },
  'position.y': {
    name: 'position.y',
    label: 'Position Y',
    type: 'number',
    unit: 'px',
    defaultValue: 0,
    category: 'transform',
    trackKinds: ['main-video', 'overlay-video', 'text']
  },
  'scale.x': {
    name: 'scale.x',
    label: 'Scale X',
    type: 'number',
    min: 0.1,
    max: 10,
    defaultValue: 1,
    category: 'transform',
    trackKinds: ['main-video', 'overlay-video', 'text']
  },
  'scale.y': {
    name: 'scale.y',
    label: 'Scale Y',
    type: 'number',
    min: 0.1,
    max: 10,
    defaultValue: 1,
    category: 'transform',
    trackKinds: ['main-video', 'overlay-video', 'text']
  },
  'rotation': {
    name: 'rotation',
    label: 'Rotation',
    type: 'number',
    unit: '°',
    defaultValue: 0,
    category: 'transform',
    trackKinds: ['main-video', 'overlay-video', 'text']
  },
  'opacity': {
    name: 'opacity',
    label: 'Opacity',
    type: 'number',
    min: 0,
    max: 1,
    defaultValue: 1,
    category: 'appearance',
    trackKinds: ['main-video', 'overlay-video', 'text', 'audio']
  }
}

/**
 * Animation context for applying animations during render/export
 */
export interface AnimationContext {
  clipId: string
  currentTime: number            // Time within clip (0-duration)
  animations: ClipAnimation | undefined
  properties: AnimationPropertyRegistry
}

/**
 * Computed animation state at a specific time
 */
export interface ComputedAnimationState {
  position?: { x: number; y: number }
  scale?: { x: number; y: number }
  rotation?: number
  opacity?: number
  [key: string]: any             // Allow custom properties
}
