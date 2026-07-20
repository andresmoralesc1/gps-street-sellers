'use client'

import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { clsx } from 'clsx'

/**
 * N9 — Live viewers badge.
 * Subscribes to /api/vendors/[id]/live-viewers SSE stream.
 * Shows a pulsing dot + count of buyers currently viewing this vendor.
 */
interface LiveViewersProps {
  vendorId: string
}

export function LiveViewers({ vendorId }: LiveViewersProps) {
  const [count, setCount] = useState<number | null>(null)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  useEffect(() => {
    const es = new EventSource(`/api/vendors/${vendorId}/live-viewers`, {
      withCredentials: true,
    })

    es.addEventListener('viewer_count', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setCount(data.count)
        setConnected(true)
        setReconnecting(false)
      } catch {
        // Bad payload — ignore
      }
    })

    es.onerror = () => {
      // The browser auto-reconnects EventSource after a brief delay. Show
      // a "reconnecting" pill so the seller doesn't see a stale count
      // that suggests zero viewers when the connection is actually
      // bouncing.
      setConnected(false)
      setReconnecting(true)
    }

    es.onopen = () => {
      setConnected(true)
      setReconnecting(false)
    }

    return () => {
      es.close()
    }
  }, [vendorId])

  if (count === null && !reconnecting) return null

  return (
    <div
      className={clsx(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        reconnecting
          ? 'bg-yellow-50 text-yellow-700'
          : (count ?? 0) > 0
          ? 'bg-red-50 text-red-700'
          : 'bg-gray-100 text-gray-600'
      )}
      title={connected ? 'Conectado en vivo' : 'Reconectando…'}
    >
      <span className="relative flex h-2 w-2">
        {(count ?? 0) > 0 && !reconnecting && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        )}
        <span
          className={clsx(
            'relative inline-flex rounded-full h-2 w-2',
            reconnecting
              ? 'bg-yellow-500'
              : (count ?? 0) > 0
              ? 'bg-red-500'
              : 'bg-gray-400'
          )}
        />
      </span>
      <Eye size={12} />
      <span>
        {reconnecting
          ? 'Reconectando…'
          : (count ?? 0) === 0
          ? 'Nadie mirando'
          : `${count} ${count === 1 ? 'persona mirando' : 'personas mirando'}`}
      </span>
    </div>
  )
}