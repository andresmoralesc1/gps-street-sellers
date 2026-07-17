'use client'

import { useEffect, type ReactNode } from 'react'
import { AuthInitializer } from '@/components/AuthInitializer'
import { initApiClient, setSessionExpiredHandler } from '@/lib/api-client'
import { useStore } from '@/store/useStore'

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

  // Install the fetch interceptor that silently refreshes the session
  // when the 15-minute access token expires. When the refresh itself
  // fails, the user is logged out for real — clear the store and bounce
  // them to /login so the UI never sits on a stale authenticated state.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      const state = useStore.getState()
      state.logout()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1'
      }
    })
    initApiClient()
  }, [])

  return <AuthInitializer>{children}</AuthInitializer>
}