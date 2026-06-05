import React, { ReactNode } from 'react'

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 p-4 bg-[color:var(--panel)]"> 
        <h2 className="text-xl font-semibold">Vireon</h2>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
