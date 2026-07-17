'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

/**
 * Umami analytics loader — conditional on the user's cookie consent.
 *
 * Ley 1581/2012 compliance:
 *   We do NOT load Umami until the user explicitly grants `analytics: true`
 *   via the CookieBanner. Without that flag, no analytics request is sent,
 *   no IP address leaves the user's browser, no fingerprint is collected.
 *
 *   The script reads consent state from localStorage on mount. We also
 *   listen for storage events so a user accepting cookies on another tab
 *   triggers Umami load here too. Re-reading on focus covers the case
 *   where the user accepts cookies, then reloads — Umami then loads on
 *   the next mount cycle.
 *
 * Why self-hosted Umami:
 *   - No cookies (GDPR-friendly by design)
 *   - IPs stored only on our server (not shipped to Google/Meta)
 *   - Respects `navigator.doNotTrack` automatically (data-do-not-track)
 */

const CONSENT_KEY = 'barriotech_cookie_consent'
const WEBSITE_ID = 'e917bea5-c1cb-4105-9ce8-71517d5a94e8'
const UMAMI_SRC = 'https://umami.andresmorales.com.co/script.js'

type ConsentState = {
  version: string
  granted: boolean
  categories?: { analytics?: boolean }
  timestamp: string
} | null

function analyticsGranted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as ConsentState
    return Boolean(parsed?.categories?.analytics)
  } catch {
    return false
  }
}

export function UmamiAnalytics() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(analyticsGranted())

    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY) setEnabled(analyticsGranted())
    }
    const onFocus = () => setEnabled(analyticsGranted())

    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  if (!enabled) return null

  return (
    <Script
      src={UMAMI_SRC}
      data-website-id={WEBSITE_ID}
      data-do-not-track="true"
      strategy="afterInteractive"
    />
  )
}