import { useState, useEffect } from 'react'

export default function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return { theme, setTheme }
}
