'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, Package, Settings, Edit3, ChevronRight, Camera } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ActiveToggle } from '@/components/seller/ActiveToggle'
import { SellerDashboard } from '@/components/seller/SellerDashboard'
import { useStore } from '@/store/useStore'

interface Product {
  id: string
  name: string
  description: string
  price: number
  photo_url: string | null
}

export default function SellerDashboardPage() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [vendorData, setVendorData] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Location sharing state
  const [sharingLocation, setSharingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [locationSuccess, setLocationSuccess] = useState(false)

  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    if (user?.role !== 'seller') {
      router.push('/role-select')
      return
    }

    fetch('/api/vendors/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.vendor) {
          const vid = data.vendor.id
          setVendorId(vid)
          setVendorData(data.vendor)
          return fetch(`/api/products?vendorId=${vid}`, { credentials: 'include' })
        } else {
          // Seller huérfano (legacy account) → al onboarding para crear vendor
          router.push('/onboarding')
          return null
        }
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data?.products) setProducts(data.products)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, router, hasHydrated])

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización')
      return
    }

    setSharingLocation(true)
    setLocationError('')
    setLocationSuccess(false)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const res = await fetch('/api/vendors/me/location', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ latitude, longitude }),
          })

          if (!res.ok) {
            const data = await res.json()
            setLocationError(data.error || 'Error al guardar ubicación')
            setSharingLocation(false)
            return
          }

          setLocationSuccess(true)
          setLocationError('')
        } catch {
          setLocationError('Error de conexión')
        } finally {
          setSharingLocation(false)
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Permiso de ubicación denegado. Actívalo en tu navegador.')
        } else {
          setLocationError('No pude obtener tu ubicación')
        }
        setSharingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleLogout = () => {
    useStore.getState().logout()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            Mi Dashboard
            <Badge variant="primary">Vendedor</Badge>
          </h1>
          <p className="text-sm text-gray-500">
            {user?.fullName || 'Vendedor'}
          </p>
        </div>
        <Button variant="ghost" onClick={handleLogout}>
          Cerrar
        </Button>
      </header>

      <div className="p-4 space-y-4">
        {vendorId && vendorData && (
          <>
            {/* Completar perfil banner */}
            {(!vendorData.name || !vendorData.category || !vendorData.photo_url) && (
              <Link href="/profile/edit">
                <Card variant="elevated" className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">Completar perfil</p>
                      <p className="text-sm text-white/80">Añade información para que los clientes te encuentren</p>
                    </div>
                    <ChevronRight size={20} className="text-white/70" />
                  </div>
                </Card>
              </Link>
            )}

            {/* Toggle activo/inactivo */}
            <ActiveToggle vendorId={vendorId} />

            {/* Compartir ubicación GPS */}
            <Card variant="outlined" className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${vendorData?.latitude ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm">Tu ubicación en el mapa</h3>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {vendorData?.latitude
                      ? `Activa — lat ${vendorData.latitude.toFixed(4)}, lng ${vendorData.longitude.toFixed(4)}`
                      : 'No has compartido tu ubicación todavía'}
                  </p>
                  {locationError && (
                    <p className="text-red-500 text-xs mt-1">{locationError}</p>
                  )}
                  {locationSuccess && (
                    <p className="text-green-600 text-xs mt-1">✓ Ubicación actualizada en tiempo real</p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleShareLocation}
                  disabled={sharingLocation}
                  className={vendorData?.latitude ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {sharingLocation ? 'Obteniendo...' : vendorData?.latitude ? 'Actualizar' : 'Compartir'}
                </Button>
              </div>
            </Card>

            {/* Dashboard stats */}
            <SellerDashboard vendorId={vendorId} products={products.slice(0, 3)} productCount={products.length} />

            {/* Editar perfil */}
            <Link href="/profile/edit">
              <Card variant="outlined" className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Edit3 size={24} className="text-gray-600" />
                  <span className="font-semibold">Editar perfil</span>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </Card>
            </Link>

            {/* Editar productos */}
            <Link href="/products">
              <Card variant="outlined" className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <Package size={24} className="text-gray-600" />
                  <div>
                    <span className="font-semibold">Editar productos</span>
                    <p className="text-sm text-gray-500">{products.length} productos</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </Card>
            </Link>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="bg-white border-t flex justify-around py-3">
        <Link href="/dashboard" className="flex flex-col items-center text-primary">
          <BarChart3 size={24} />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>
        <Link href="/products" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <Package size={24} />
          <span className="text-xs mt-1">Productos</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <Settings size={24} />
          <span className="text-xs mt-1">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}