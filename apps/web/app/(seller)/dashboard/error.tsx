'use client'

// Local error boundary for /dashboard. Catches render-time errors thrown
// by any of the 23 client components imported by page.tsx (Leaflet map,
// live viewers, business hours, location history, vendor switcher, etc.)
// and surfaces the real error message + digest so we can debug production
// issues without depending on Sentry or browser DevTools.
//
// Why this exists: Next.js falls back to /app/global-error.tsx when a
// route has no local error boundary, and global-error renders a generic
// "Algo salió mal" message that hides the actual cause. This file makes
// the cause visible to the user (with a retry button) and to us (the
// error digest + message in the UI itself + POSTed to /api/log/error).

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // POST the error to a server endpoint so we can grep it in
    // /home/telchar/.pm2/logs/gps-out.log. Client console.log gets lost
    // when the user just closes the tab.
    fetch('/api/log/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        where: 'dashboard',
        message: error.message,
        digest: error.digest,
        stack: error.stack?.split('\n').slice(0, 8).join('\n'),
      }),
    }).catch(() => { /* best effort */ })
  }, [error])

  return (
    <div className="min-h-screen bg-background-cream flex items-center justify-center p-6">
      <Card variant="outlined" className="p-6 max-w-lg w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 mb-1">
              No pudimos cargar tu panel
            </h1>
            <p className="text-sm text-gray-600">
              Ocurrió un error inesperado al iniciar la página. Intenta de nuevo — si el problema persiste, contáctanos.
            </p>
          </div>
        </div>

        {/* Always show the actual error in production too — the user can
            read it and report it; we already POST it to the server log. */}
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-mono text-red-800 break-all whitespace-pre-wrap">
            {error.message || 'Error sin mensaje'}
          </p>
          {error.stack && (
            <details className="mt-2">
              <summary className="text-xs text-red-700 cursor-pointer">Stack trace</summary>
              <pre className="text-xs font-mono text-red-600 mt-2 whitespace-pre-wrap break-all">
                {error.stack.split('\n').slice(0, 6).join('\n')}
              </pre>
            </details>
          )}
          {error.digest && (
            <p className="text-xs font-mono text-red-600 mt-2">
              digest: {error.digest}
            </p>
          )}
        </div>

        <Button onClick={reset} className="w-full">
          <RefreshCw size={16} className="mr-2" />
          Reintentar
        </Button>
      </Card>
    </div>
  )
}