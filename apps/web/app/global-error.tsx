'use client'

// Root-level error boundary. Next.js requires it in /app/global-error.tsx
// because the regular error.tsx catches errors in layouts/pages but NOT
// errors that happen in the root layout itself. This is the catch-all.
//
// When Sentry is configured (SENTRY_DSN set), report the error.
// Otherwise log to console so dev still sees the stack.

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error)
    } else {
      console.error('[global-error]', error)
    }
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>
            Algo salió mal
          </h1>
          <p style={{ color: '#666', marginBottom: '24px', maxWidth: '500px' }}>
            La aplicación encontró un error inesperado. Nuestro equipo fue notificado.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#f96e03',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}