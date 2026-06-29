'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'barriotech_cookie_consent'
const POLICY_VERSION = 'v1.0'

/**
 * Cookie consent banner — Ley 1581/2012 + Decreto 1377/2013 compliance.
 *
 * BarrioTech does NOT use third-party tracking cookies (no analytics, no
 * ads, no remarketing). The only cookies are:
 *   - HttpOnly auth cookies (strictly necessary — not optional)
 *   - localStorage favorites/last-viewed-map (strictly necessary)
 *   - Service Worker push subscription (requires browser permission,
 *     not this banner)
 *
 * This banner is therefore largely informational. We still surface it to
 * (a) comply with the "inform about cookies" requirement, (b) give users
 * the option to clear localStorage non-essentials if any are added later,
 * (c) create an audit trail of consent.
 *
 * UX note: the banner only appears AFTER the user has interacted with the page
 * (scroll, click, or keypress) to avoid covering the registration form CTA
 * on the very first render — that form is the highest-conversion surface.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Wait for first user signal before showing — non-intrusive.
    const show = () => {
      if (visible) return
      setVisible(true)
    }
    const events = ['scroll', 'click', 'keydown', 'touchstart']
    // Defer to next tick so we never block first paint.
    const t = setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          setVisible(false)
          return
        }
        events.forEach((ev) => window.addEventListener(ev, show, { once: true, passive: true }))
      } catch {}
    }, 500)
    return () => {
      clearTimeout(t)
      events.forEach((ev) => window.removeEventListener(ev, show))
    }
  }, [])

  const recordConsent = async (
    granted: boolean,
    categories: { necessary: true; preferences: boolean; analytics: boolean }
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: POLICY_VERSION,
          granted,
          categories,
          timestamp: new Date().toISOString(),
        })
      )
      // Audit log — works without auth (uses email if logged out, none here).
      await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType: 'cookies',
          granted,
          policyVersion: POLICY_VERSION,
        }),
      }).catch(() => {})
    } catch {
      // Best-effort — banner UX must never crash the app.
    }
    setVisible(false)
  }

  const acceptAll = () => {
    recordConsent(true, { necessary: true, preferences: true, analytics: true })
  }
  const rejectAll = () => {
    // Reject everything except strictly necessary (auth).
    recordConsent(false, { necessary: true, preferences: false, analytics: false })
    // Clear any optional localStorage entries.
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('barriotech_') && k !== STORAGE_KEY) {
          localStorage.removeItem(k)
        }
      })
    } catch {}
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed bottom-4 right-4 max-w-sm w-[calc(100vw-2rem)] md:w-96 z-50 p-4 bg-white border border-gray-200 rounded-xl shadow-2xl"
    >
      <div>
        <p className="text-sm text-gray-700 mb-3">
          🍪 <strong>Usamos cookies.</strong> BarrioTech solo utiliza cookies
          estrictamente necesarias para mantener tu sesión iniciada y recordar
          tus preferencias. No usamos cookies de seguimiento, publicidad ni
          analítica de terceros. Más información en nuestra{' '}
          <Link href="/privacidad" className="text-primary underline">
            Política de Tratamiento de Datos Personales
          </Link>
          .
        </p>

        {showDetails && (
          <ul className="text-xs text-gray-600 mb-3 space-y-1 list-disc pl-5">
            <li>
              <strong>Necesarias (siempre activas):</strong> cookies de sesión
              (HttpOnly) para autenticación.
            </li>
            <li>
              <strong>Preferencias:</strong> localStorage para favoritos y
              última vista del mapa.
            </li>
            <li>
              <strong>Analítica:</strong> actualmente ninguna. Marcada como
              futura para soportar opt-in.
            </li>
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={acceptAll}
            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Aceptar
          </button>
          <button
            onClick={rejectAll}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Solo necesarias
          </button>
          <button
            onClick={() => setShowDetails((s) => !s)}
            className="px-3 py-2 text-xs text-gray-500 underline hover:text-gray-700"
          >
            {showDetails ? 'Ocultar' : 'Más información'}
          </button>
        </div>
      </div>
    </div>
  )
}