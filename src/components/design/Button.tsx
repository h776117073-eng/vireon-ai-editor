import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>

export default function Button(props: Props) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded bg-accent text-white hover:opacity-90 ${props.className ?? ''}`}
    />
  )
}
