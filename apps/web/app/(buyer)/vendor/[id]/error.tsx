'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

export default function VendorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Vendor detail error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 text-accent rounded-full mb-4">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">
          No pudimos cargar este vendedor
        </h1>
        <p className="text-stone-600 mb-6">
          Ocurrió un error inesperado. Intenta de nuevo o vuelve al mapa.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            Reintentar
          </Button>
          <Link href="/map">
            <Button variant="outline">Volver al mapa</Button>
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-stone-400 mt-6">ID: {error.digest}</p>
        )}
      </div>
    </div>
  )
}