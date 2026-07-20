'use client'

// Root-level error boundary. Next.js requires it in /app/global-error.tsx
// because the regular error.tsx catches errors in layouts/pages but NOT
// errors that happen in the root layout itself. This is the catch-all.
//
// When Sentry is configured (SENTRY_DSN set), report the error.
// Otherwise log to console so dev still sees the stack.
//
// Special case: "Failed to find Server Action" is a deployment artifact.
// After every pm2 reload the in-memory registry of action IDs is reset,
// but tabs that were open before the reload still send the old ID. The
// only fix is to force a hard reload, which re-fetches every chunk and
// resolves the mismatch. We detect that specific message and reload
// automatically instead of asking the user to click "Reintentar".

import * as Sentry from '@sentry/nextjs'
import { useEffect, useState } from 'react'

function isStaleServerAction(error: Error): boolean {
  const m = error?.message ?? ''
  return /failed to find server action/i.test(m)
    || /client reference manifest for route/i.test(m)
    || /server action .* does not exist/i.test(m)
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [autoReloadDone, setAutoReloadDone] = useState(false)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error)
    } else {
      console.error('[global-error]', error)
    }

    // If the error is a deployment artifact, hard-reload exactly once.
    // Setting location.reload() forces the browser to drop every chunk
    // it cached from the old build and re-request everything from the
    // current server, which knows the new action ID registry.
    if (isStaleServerAction(error) && !autoReloadDone) {
      setAutoReloadDone(true)
      // Microtask so React has a chance to log the error to Sentry first.
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
      }, 50)
    }
  }, [error, autoReloadDone])

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
            {isStaleServerAction(error) ? 'Actualizando…' : 'Algo salió mal'}
          </h1>
          <p style={{ color: '#666', marginBottom: '24px', maxWidth: '500px' }}>
            {isStaleServerAction(error)
              ? 'Detectamos una versión nueva. Estamos recargando la página para que todo vuelva a funcionar.'
              : 'La aplicación encontró un error inesperado. Nuestro equipo fue notificado.'}
          </p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload()
              } else {
                reset()
              }
            }}
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