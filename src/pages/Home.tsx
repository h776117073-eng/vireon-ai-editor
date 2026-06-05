import React from 'react'
import UploadScreen from '../components/ui/UploadScreen'
import VideoPlayer from '../components/ui/VideoPlayer'
import Timeline from '../components/ui/Timeline'
import Chat from '../components/chat/Chat'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import { setTime } from '@/store/slices/playbackSlice'
import { setPlayhead, updateClip } from '@/store/slices/timelineSlice'

export default function Home() {
  const dispatch = useDispatch<AppDispatch>()
  const currentId = useSelector((s: RootState) => s.media.currentId)
  const media = useSelector((s: RootState) => (currentId ? s.media.byId[currentId] : undefined))
  const duration = useSelector((s: RootState) => s.timeline.duration)
  const currentTime = useSelector((s: RootState) => s.playback.currentTime)
  const tracks = useSelector((s: RootState) => s.timeline.tracks)

  const handleUpload = (_file: File) => {
    // mediaHandler will handle dispatching to store; no local state needed
  }

  const handleSeek = (t: number) => {
    dispatch(setTime(t))
    dispatch(setPlayhead(t))
  }

  const handleUpdateTrack = (trackId: string, clip: any) => {
    dispatch(updateClip({ trackId, clip }))
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between p-6">
        <h1 className="text-2xl font-semibold">Vireon — AI Video Editor</h1>
      </header>

      <div className="flex-1 p-6">
        {!media ? (
          <UploadScreen onUpload={handleUpload} />
        ) : (
          <div className="flex flex-col gap-4">
            <VideoPlayer src={media.src} />
            <Timeline duration={duration} currentTime={currentTime} tracks={tracks} onSeek={handleSeek} onUpdateTrack={handleUpdateTrack
          <div className="flex flex-col gap-4">
            <VideoPlayer src={media.src} />
            <Timeline duration={duration} currentTime={currentTime} tracks={tracks} onSeek={() => {}} onUpdateTrack={() => {}} />
          </div>
        )}
      </div>

      <footer className="p-6 border-t border-[rgba(255,255,255,0.03)] bg-[color:var(--panel)]">
        <Chat />
      </footer>
    </div>
  )
}
