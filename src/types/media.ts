export type MediaType = 'video' | 'image' | 'audio'

export type MediaItem = {
  id: string
  type: MediaType
  src: string
  name?: string
  duration?: number
  width?: number
  height?: number
  createdAt: number
}
