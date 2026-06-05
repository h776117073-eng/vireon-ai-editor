import store from '@/store'
+import { addMedia, setCurrent, updateMedia } from '@/store/slices/mediaSlice'
+import { initFromMedia } from '@/store/slices/timelineSlice'
+import { setTime } from '@/store/slices/playbackSlice'
+import { MediaItem } from '@/types/media'
+
+function uid(prefix = '') {
+  return prefix + Math.random().toString(36).slice(2, 9)
+}
+
+export async function handleFileUpload(file: File) {
+  const url = URL.createObjectURL(file)
+  const id = uid('m_')
+  const item: MediaItem = {
+    id,
+    type: (file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image') as any,
+    src: url,
+    name: file.name,
+    createdAt: Date.now()
+  }
+
+  store.dispatch(addMedia(item))
+  store.dispatch(setCurrent(id))
+
+  // extract metadata depending on type
+  if (item.type === 'video') {
+    await new Promise<void>((resolve) => {
+      const v = document.createElement('video')
+      v.preload = 'metadata'
+      v.src = url
+      v.addEventListener('loadedmetadata', () => {
+        const duration = v.duration || 0
+        const width = (v as any).videoWidth || 0
+        const height = (v as any).videoHeight || 0
+        store.dispatch(updateMedia({ id, duration, width, height }))
+        // initialize timeline with one clip
+        store.dispatch(initFromMedia({ mediaId: id, duration }))
+        // reset playhead time
+        store.dispatch(setTime(0))
+        resolve()
+      })
+    })
+  } else if (item.type === 'image') {
+    await new Promise<void>((resolve) => {
+      const img = new Image()
+      img.src = url
+      img.onload = () => {
+        store.dispatch(updateMedia({ id, width: img.width, height: img.height }))
+        resolve()
+      }
+    })
+  } else if (item.type === 'audio') {
+    await new Promise<void>((resolve) => {
+      const a = document.createElement('audio')
+      a.preload = 'metadata'
+      a.src = url
+      a.addEventListener('loadedmetadata', () => {
+        const duration = a.duration || 0
+        store.dispatch(updateMedia({ id, duration }))
+        resolve()
+      })
+    })
+  }
+
+  return item
+}
+
+export default { handleFileUpload }
+
