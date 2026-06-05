import React, { useRef } from 'react'
+import { handleFileUpload } from '@/services/mediaHandler'
+
+type Props = {
+  onUpload: (file: File) => void
+}
+
+export default function UploadScreen({ onUpload }: Props) {
+  const inputRef = useRef<HTMLInputElement | null>(null)
+
+  const handleClick = () => inputRef.current?.click()
+
+  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
+    const f = e.target.files && e.target.files[0]
+    if (f) {
+      try {
+        await handleFileUpload(f)
+      } catch (err) {
+        console.error('Upload error', err)
+      }
+      onUpload && onUpload(f)
+    }
+  }

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-56 h-56 rounded-full bg-gradient-to-br from-[rgba(123,60,255,0.18)] to-[rgba(0,0,0,0.12)] flex items-center justify-center cursor-pointer glass drop-shadow-md"
          onClick={handleClick}
        >
          <div className="w-28 h-28 rounded-full bg-[color:var(--panel)] flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
              <path d="M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <div className="text-xl font-semibold">Upload Video</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">Drag & drop or click the circle to upload</div>
        </div>
      </div>

      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleChange} />
    </div>
  )
}
