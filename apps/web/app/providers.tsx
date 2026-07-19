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
  // Track whether this user has ever had an active session. The refresh
  // attempt fails the same way whether you were never logged in (anonymous
  // visitor on the home page) or your session truly expired (logged-in user
  // whose refresh-token cookie aged out). The store knows the difference:
  // if there's no `user` in Zustand, this is anonymous, not expired, and
  // we should NOT bounce to /login — that would block public pages that
  // happen to call any /api/* endpoint (e.g. /api/stats on the home page).
  const tryBounce = () => {
    const state = useStore.getState()
    const hasUser = !!state.user
    const hasTokenCookie = document.cookie.split(';').some(c =>
      c.trim().startsWith('token=') || c.trim().startsWith('refresh-token='))
    if (typeof window === 'undefined') return
    if (window.location.pathname === '/login') return
    if (!hasUser && !hasTokenCookie) return  // anonymous, not expired
    state.logout()
    window.location.href = '/login?expired=1'
  }

  useEffect(() => {
    setSessionExpiredHandler(tryBounce)
    initApiClient()
  }, [])

  return <AuthInitializer>{children}</AuthInitializer>
}