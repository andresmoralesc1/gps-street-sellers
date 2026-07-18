'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'barriotech_theme'

/**
 * Theme toggle — light/dark. Persists in localStorage and respects
 * system preference on first visit.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial = saved ?? (prefersDark ? 'dark' : 'light')
    setTheme(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  // Avoid hydration mismatch — render placeholder until mounted.
  // aria-hidden + role="presentation" so screen readers don't announce an
  // unlabeled button (caught by axe-core color-contrast & button-name rules).
  if (!mounted) {
    return <div role="presentation" aria-hidden="true" className="w-9 h-9" />
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
      className="w-9 h-9 rounded-full flex items-center justify-center bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
    >
      {theme === 'light' ? <Moon size={18} className="text-stone-700" /> : <Sun size={18} className="text-amber-400" />}
    </button>
  )
}