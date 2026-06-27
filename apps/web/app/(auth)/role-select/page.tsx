'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, MapPin } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'
import type { UserRole } from '@/lib/core/types'

export default function RoleSelectPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const user = useStore((s) => s.user)

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      router.push('/login')
      return
    }
    // Redirect if already has role — go directly to destination
    if (user.role === 'buyer') {
      router.push('/map')
      return
    }
    if (user.role === 'seller') {
      router.push('/dashboard')
      return
    }
    // No role — stay here (show role selection)
  }, [user, router])

  const selectRole = async (role: UserRole) => {
    if (!user) return

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      })

      if (!res.ok) throw new Error('Failed to update role')

      const data = await res.json()
      setUser({ ...user, role })

      if (role === 'buyer') {
        router.push('/map')
      } else {
        router.push('/dashboard')
      }
    } catch {
      // Still allow navigation even if API fails
      setUser({ ...user, role })
      if (role === 'buyer') {
        router.push('/map')
      } else {
        router.push('/dashboard')
      }
    }
  }

  // Show nothing while redirecting
  if (!user || user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Redirigiendo...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl mb-4 overflow-hidden">
            <Image
              src="/logo.png"
              alt="BarrioTech"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¿Cómo quieres usar la app?</h1>
          <p className="text-gray-500">Elige tu rol principal — puedes cambiar después</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Comprador */}
          <button
            onClick={() => selectRole('buyer')}
            className="group text-left"
          >
            <Card
              variant="elevated"
              className="p-8 text-center transition-all group-hover:scale-105 group-active:scale-95"
            >
              <div className="mb-4 flex items-center justify-center">
                <ShoppingCart
                  size={64}
                  className="text-primary"
                  strokeWidth={1.5}
                />
              </div>
              <h2 className="text-xl font-bold mb-2">Comprador</h2>
              <p className="text-gray-600 text-sm">
                Encontrar vendedores cercanos y hacer pedidos por WhatsApp
              </p>
              <div className="mt-4 text-xs text-primary font-medium">Explorar el mapa →</div>
            </Card>
          </button>

          {/* Vendedor */}
          <button
            onClick={() => selectRole('seller')}
            className="group text-left"
          >
            <Card
              variant="elevated"
              className="p-8 text-center transition-all group-hover:scale-105 group-active:scale-95"
            >
              <div className="mb-4 flex items-center justify-center">
                <MapPin
                  size={64}
                  className="text-secondary"
                  strokeWidth={1.5}
                />
              </div>
              <h2 className="text-xl font-bold mb-2">Vendedor</h2>
              <p className="text-gray-600 text-sm">
                Mostrar mi ubicación en el mapa y recibir pedidos por WhatsApp
              </p>
              <div className="mt-4 text-xs text-secondary font-medium">Crear mi perfil →</div>
            </Card>
          </button>
        </div>

        <p className="text-center mt-8 text-sm text-gray-400">
          <Link href="/login" className="hover:text-gray-600">
            ← Volver al login
          </Link>
        </p>
      </div>
    </div>
  )
}
