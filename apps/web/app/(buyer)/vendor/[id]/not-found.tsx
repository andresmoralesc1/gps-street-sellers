import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Store } from 'lucide-react'

export default function VendorNotFound() {
  return (
    <div className="min-h-screen bg-background-cream flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary-700 rounded-full mb-4">
          <Store size={32} />
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">
          Vendedor no encontrado
        </h1>
        <p className="text-stone-600 mb-6">
          Este vendedor ya no está disponible o el enlace es incorrecto.
        </p>
        <Link href="/map">
          <Button variant="primary">Ver vendedores en el mapa</Button>
        </Link>
      </div>
    </div>
  )
}