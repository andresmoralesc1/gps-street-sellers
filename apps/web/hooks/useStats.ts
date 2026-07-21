'use client'

import { useEffect, useState } from 'react'

interface Stats {
  activeVendors: number
  activeCities: number
}

/**
 * Fetch live stats from /api/stats on mount. Returns null until the
 * request resolves (so callers can decide whether to render the row
 * at all — never show "0 vendors" if the API is unreachable).
 *
 * Cancels the in-flight fetch on unmount so we don't setState on an
 * unmounted component (the bug that bit us in VendorDetailClient).
 */
export function useStats(): Stats | null {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setStats(data)
      })
      .catch(() => {
        /* swallow — caller renders nothing on null */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return stats
}
