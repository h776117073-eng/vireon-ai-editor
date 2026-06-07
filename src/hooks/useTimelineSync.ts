import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import { setTime, play, pause } from '@/store/slices/playbackSlice'

type VideoRef = React.RefObject<HTMLVideoElement>

export function useTimelineSync(
  videoRef: VideoRef,
  onTimeUpdate?: (current: number) => void
) {
  const dispatch = useDispatch<AppDispatch>()
  const { currentTime, isPlaying } = useSelector((s: RootState) => s.playback)

  // Sync Redux currentTime to video element (for scrubbing from timeline)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Math.abs(video.currentTime - currentTime) > 0.01) {
      video.currentTime = currentTime
    }
  }, [currentTime])

  // Sync Redux isPlaying to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play().catch(() => {
        // Playback may be prevented by browser autoplay policy
      })
    } else {
      video.pause()
    }
  }, [isPlaying])

  // Listen to video events and sync to Redux
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      dispatch(setTime(video.currentTime))
      onTimeUpdate?.(video.currentTime)
    }

    const handlePlay = () => {
      dispatch(play())
    }

    const handlePause = () => {
      dispatch(pause())
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [dispatch, onTimeUpdate])
}
