'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ActiveToggle } from '@/components/seller/ActiveToggle'
import { SellerDashboard } from '@/components/seller/SellerDashboard'
import { useStore } from '@/store/useStore'
import { MOCK_VENDORS } from '@/lib/mockData'

export default function SellerDashboardPage() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const setVendors = useStore((s) => s.setVendors)

  useEffect(() => {
    if (user?.role !== 'seller') {
      router.push('/role-select')
    }
    setVendors(MOCK_VENDORS)
  }, [user, router, setVendors])

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Mi Dashboard</h1>
          <p className="text-sm text-gray-500">
            {user?.fullName || 'Vendedor'}
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/profile/edit')}>
          ✏️
        </Button>
      </header>

      <div className="p-4 space-y-4">
        {/* Toggle activo/inactivo */}
        <ActiveToggle />

        {/* Dashboard stats */}
        <SellerDashboard vendorId="v2" />

        {/* Editar perfil */}
        <Link href="/profile/edit">
          <Card variant="outlined" className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✏️</span>
              <span className="font-semibold">Editar perfil y productos</span>
            </div>
            <span>→</span>
          </Card>
        </Link>
      </div>

      {/* Bottom Nav */}
      <nav className="bg-white border-t flex justify-around py-3">
        <button className="flex flex-col items-center text-primary">
          <span className="text-2xl">📊</span>
          <span className="text-xs">Dashboard</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">📦</span>
          <span className="text-xs">Productos</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <span className="text-2xl">⚙️</span>
          <span className="text-xs">Ajustes</span>
        </button>
      </nav>
    </div>
  )
}