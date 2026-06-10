'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'
import type { UserRole } from '@/types'

export default function RoleSelectPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const user = useStore((s) => s.user)

  const selectRole = (role: UserRole) => {
    if (!user) return

    setUser({ ...user, role })

    if (role === 'buyer') {
      router.push('/map')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold text-center mb-2">¿Cómo quieres usar la app?</h1>
        <p className="text-gray-600 text-center mb-12">
          Elige tu rol principal
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* Opción Comprador */}
          <Card
            variant="elevated"
            className="cursor-pointer hover:scale-105 transition-transform p-8 text-center"
            onClick={() => selectRole('buyer')}
          >
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-bold mb-2">Comprador</h2>
            <p className="text-gray-600 text-sm">
              Encuentra vendedores cercanos a ti
            </p>
          </Card>

          {/* Opción Vendedor */}
          <Card
            variant="elevated"
            className="cursor-pointer hover:scale-105 transition-transform p-8 text-center"
            onClick={() => selectRole('seller')}
          >
            <div className="text-6xl mb-4">📍</div>
            <h2 className="text-xl font-bold mb-2">Vendedor</h2>
            <p className="text-gray-600 text-sm">
              Muestra tu ubicación y reach más clientes
</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
