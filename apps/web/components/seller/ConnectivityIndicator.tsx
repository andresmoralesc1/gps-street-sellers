'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

/**
 * N1 — Online/offline indicator.
 * Listens to navigator.onLine + window 'online'/'offline' events.
 * Shows a small chip in the header so the seller always knows if they're connected.
 */
export function ConnectivityIndicator() {
  const [online, setOnline] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setOnline(navigator.onLine)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!mounted) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={online ? 'Conectado a internet' : 'Sin conexión a internet'}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
      title={online ? 'Conectado' : 'Sin conexión'}
    >
      {online ? <Wifi size={12} /> : <WifiOff size={12} />}
      <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
    </div>
  )
}