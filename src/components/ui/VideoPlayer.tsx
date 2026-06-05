import React, { useRef, useEffect } from 'react'
+import store from '@/store'
+import { setTime } from '@/store/slices/playbackSlice'
+
+type Props = {
+  src: string
+  onTimeUpdate?: (current: number, duration: number) => void
+  onLoadedMetadata?: (duration: number) => void
+}
+
+export default function VideoPlayer({ src, onTimeUpdate, onLoadedMetadata }: Props) {
+  const ref = useRef<HTMLVideoElement | null>(null)
+
+  useEffect(() => {
+    const vid = ref.current
+    if (!vid) return
+    const handleTime = () => {
+      const t = vid.currentTime
+      store.dispatch(setTime(t))
+      onTimeUpdate && onTimeUpdate(t, vid.duration || 0)
+    }
+    const handleLoaded = () => onLoadedMetadata && onLoadedMetadata(vid.duration || 0)
+    vid.addEventListener('timeupdate', handleTime)
+    vid.addEventListener('loadedmetadata', handleLoaded)
+    return () => {
+      vid.removeEventListener('timeupdate', handleTime)
+      vid.removeEventListener('loadedmetadata', handleLoaded)
+    }
+  }, [onTimeUpdate, onLoadedMetadata])
+
+  return (
+    <div className="w-full flex items-center justify-center">
+      <div className="max-w-full" style={{ width: '100%', maxHeight: '60vh' }}>
+        <video
+          ref={ref}
+          src={src}
+          controls
+          className="w-full h-auto rounded-[12px] bg-black shadow-lg"
+          style={{ objectFit: 'contain' }}
+        />
+      </div>
+    </div>
+  )
+}
