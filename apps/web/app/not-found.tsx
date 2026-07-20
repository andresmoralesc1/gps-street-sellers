import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { MapPin, ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Página no encontrada — BarrioTech',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16 bg-background-cream">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <MapPin className="w-8 h-8 text-primary-700" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-3">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Página no encontrada
        </h2>
        <p className="text-gray-600 mb-8">
          La ruta que buscas no existe o se movió. Vuelve al inicio o explora el mapa
          para descubrir vendedores cerca de ti.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
          <Link href="/map">
            <Button size="lg" variant="outline">
              <MapPin className="w-4 h-4 mr-2" />
              Abrir el mapa
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}