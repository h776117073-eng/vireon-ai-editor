export type ColorGradeTask = {
  type: 'color_grade'
  style: string
  params?: Record<string, any>
}

export type BackgroundReplaceTask = {
  type: 'background_replace'
  background: string
  params?: Record<string, any>
}

export type MotionTrackTask = {
  type: 'motion_track'
  target?: string
  params?: Record<string, any>
}

export type ObjectRemovalTask = {
  type: 'object_removal'
  target?: string
  params?: Record<string, any>
}

export type AudioEnhanceTask = {
  type: 'audio_enhancement'
  style?: string
  params?: Record<string, any>
}

export type SubtitleTask = {
  type: 'subtitles'
  language?: string
  params?: Record<string, any>
}

export type EffectsTask = {
  type: 'effects'
  name: string
  params?: Record<string, any>
}

export type SpeedRampingTask = {
  type: 'speed_ramping'
  ranges?: Array<{ start: number; end: number; factor: number }>
}

export type TransitionTask = {
  type: 'transition'
  name: string
  params?: Record<string, any>
}

export type EditorTask =
  | ColorGradeTask
  | BackgroundReplaceTask
  | MotionTrackTask
  | ObjectRemovalTask
  | AudioEnhanceTask
  | SubtitleTask
  | EffectsTask
  | SpeedRampingTask
  | TransitionTask

export type EditorCommand = {
  tasks: EditorTask[]
}
