'use client'

import { useEffect, type ReactNode } from 'react'
import { AuthInitializer } from '@/components/AuthInitializer'

export function Providers({ children }: { children: ReactNode }) {
  // Force light mode — dark mode is disabled while we focus on the
  // light theme. Removes any `dark` class some users may have from
  // a previous session and clears the persisted theme choice.
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    try {
      localStorage.removeItem('barriotech_theme')
    } catch {
      /* private mode or storage disabled — safe to ignore */
    }
  }, [])

  return <AuthInitializer>{children}</AuthInitializer>
}