import React from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement>

export default function Input(props: Props) {
  return (
    <input
      {...props}
      className={`px-3 py-2 rounded bg-[color:var(--panel)] border border-transparent text-[color:var(--text)] ${props.className ?? ''}`}
    />
  )
}
