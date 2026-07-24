'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { authedFetch } from '@/lib/authed-fetch'

/**
 * Blocks rendering of children until the store has rehydrated AND
 * the user has been restored from the auth cookie.
 *
 * This eliminates the "flash of logged-out state" race condition where:
 * 1. Zustand hydrates with user: null from localStorage
 * 2. React components mount and see user: null
 * 3. onRehydrateStorage fires and calls /api/auth/me
 * 4. User gets set — but components already showed "logged out" UI
 *
 * Fix: components that need auth state wait for _hasHydrated before
 * rendering anything auth-dependent.
 *
 * Sprint 7 B-AUTH-2: switched the initial /api/auth/me call to
 * `authedFetch` so a stale access token (15-min expiry) is
 * silently refreshed from the 7-day refresh-token cookie. Before
 * this, anyone who sat on the page for >15 min without action got
 * logged out on the next API call.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const setUser = useStore((s) => s.setUser)
  const setHasHydrated = useStore((s) => s.setHasHydrated)

  useEffect(() => {
    // If store already hydrated in a prior render, we're good
    if (useStore.getState()._hasHydrated) {
      setReady(true)
      return
    }

    // Otherwise fetch from cookie and mark hydrated
    setHasHydrated(false)
    authedFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (user) setUser(user)
      })
      .catch(() => { /* not logged in */ })
      .finally(() => {
        setHasHydrated(true)
        setReady(true)
      })
  }, [setUser, setHasHydrated])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
