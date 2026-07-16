// Sentry server-side init. Loaded by Next.js automatically when
// SENTRY_DSN is present in env.
//
// To enable in production:
//   1. Create a Sentry project at https://sentry.io (free tier, 5k events/mo)
//   2. Copy the DSN from Project Settings → Client Keys (DSN)
//   3. Add to apps/web/.env:
//        SENTRY_DSN=https://...@sentry.io/...
//        SENTRY_AUTH_TOKEN=sntrys_...        # only for source-map upload
//        SENTRY_ORG=andresmorales
//        SENTRY_PROJECT=gps-street-sellers
//   4. (optional) source-map upload runs automatically during `next build`
//      via the @sentry/nextjs webpack plugin when env vars are set.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% of requests; bump if quota allows
    // Don't capture PII by default — emails/phones would leak through error
    // messages if a route forgets to redact. Override per-call if needed.
    sendDefaultPii: false,
    beforeSend(event) {
      // Drop health-check noise.
      if (event.request?.url?.includes('/api/health')) return null
      return event
    },
  })
}