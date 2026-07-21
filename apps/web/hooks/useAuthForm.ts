'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Owns the cross-cutting auth UX state that login + register share:
 *   - `error` — last error message to surface inline
 *   - `isLoading` — disables forms while a request is in flight
 *   - `expired` — true when the URL has ?expired=1 (api-client
 *     triggered a redirect because the session timed out)
 *
 * The expired-message side-effect (auto-populating `error`) is
 * triggered here so neither form has to know about it.
 */
export function useAuthForm() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setError('Tu sesión expiró. Vuelve a iniciar sesión.')
    }
  }, [searchParams])

  return {
    error,
    setError,
    isLoading,
    setIsLoading,
    expired: searchParams.get('expired') === '1',
  }
}
