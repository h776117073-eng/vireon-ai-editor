import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import { removeClipMagnetic, moveClipMagnetic, insertClipMagnetic } from '@/store/slices/timelineSlice'
import { isMainTrack, Clip } from '@/utils/magneticTrackUtils'

export function useMagneticTrack(trackId: string) {
  const dispatch = useDispatch<AppDispatch>()
  const tracks = useSelector((s: RootState) => s.timeline.tracks)
  const track = tracks.find(t => t.id === trackId)
  const isMagnetic = track ? isMainTrack(track) : false

  return {
    isMagnetic,
    onClipRemove: (clipId: string) => {
      if (isMagnetic) {
        dispatch(removeClipMagnetic({ trackId, clipId }))
      }
    },
    onClipMove: (clipId: string, newStart: number) => {
      if (isMagnetic) {
        dispatch(moveClipMagnetic({ trackId, clipId, newStart }))
      }
    },
    onClipInsert: (clip: Clip, index: number) => {
      if (isMagnetic) {
        dispatch(insertClipMagnetic({ trackId, clip, index }))
      }
    }
  }
}
