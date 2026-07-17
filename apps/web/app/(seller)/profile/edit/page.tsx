'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Apple, UtensilsCrossed, CupSoda, Palette, Shirt, Package, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { CATEGORIES } from '@/lib/core/constants'
import { VEHICLE_TYPES } from '@/lib/core/constants/vehicles'
import type { VendorCategory, VehicleType } from '@/lib/core/types'
import { useStore } from '@/store/useStore'

const CategoryIconMap: Record<VendorCategory, typeof Apple> = {
  frutas: Apple,
  comida: UtensilsCrossed,
  bebidas: CupSoda,
  artesanias: Palette,
  ropa: Shirt,
  otros: Package,
}

export default function EditProfilePage() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [vendorId, setVendorId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<VendorCategory>('comida')
  const [phone, setPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('')
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')

  useEffect(() => {
    if (user?.role !== 'seller') {
      // Seller-only page. Since role is immutable post-register, redirect
      // non-sellers to the public map. If they need a seller account, they
      // must register a new one.
      router.push('/map')
      return
    }

    // First get vendorId from /api/vendors/me
    fetch('/api/vendors/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.vendor) {
          setLoading(false)
          return
        }
        setVendorId(data.vendor.id)

        // Then fetch full vendor data
        return fetch(`/api/vendors/${data.vendor.id}`, {
          credentials: 'include',
        })
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data?.vendor) {
          setName(data.vendor.name || '')
          setDescription(data.vendor.description || '')
          setCategory(data.vendor.category || 'comida')
          setPhone(data.vendor.phone || '')
          setPhotoUrl(data.vendor.photoUrl || '')
          // Backend returns camelCase vehicleType / vehiclePhotoUrl.
          setVehicleType(data.vendor.vehicleType ?? '')
          setVehiclePhotoUrl(data.vendor.vehiclePhotoUrl || '')
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [router])

  const handleSave = async () => {
    if (!vendorId) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/vendors/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description,
          category,
          phone,
          photo_url: photoUrl,
          vehicle_type: vehicleType || null,
          vehicle_photo_url: vehiclePhotoUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  if (!vendorId) {
    return (
      <div className="min-h-screen bg-background-cream">
        <header className="bg-white shadow-sm p-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost"><ChevronLeft size={20} /></Button>
          </Link>
          <h1 className="text-lg font-bold">Editar Perfil</h1>
        </header>
        <div className="p-4">
          <Card variant="outlined" className="p-8 text-center">
            <p className="text-gray-500 mb-4">No tienes perfil de vendedor</p>
            <p className="text-sm text-gray-400 mb-6">
              Crea tu perfil para empezar a recibir pedidos
            </p>
            <Link href="/dashboard">
              <Button>Volver al dashboard</Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost"><ChevronLeft size={20} /></Button>
        </Link>
        <h1 className="text-lg font-bold">Editar Perfil</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Foto */}
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-4">
            <ImageUpload
              value={photoUrl}
              onChange={setPhotoUrl}
              folder="vendors"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">Foto del negocio</p>
              <p className="text-xs text-gray-400">PNG o JPG, máx 5MB</p>
            </div>
          </div>
        </Card>

        {/* Datos */}
        <Card variant="outlined" className="p-4 space-y-4">
          <Input
            label="Nombre del negocio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Don Juan's Empanadas"
          />

          <Input
            label="Teléfono"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 300 123 4567"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const IconComponent = CategoryIconMap[cat.id]
                return (
                  <Badge
                    key={cat.id}
                    variant={category === cat.id ? 'primary' : 'outline'}
                    className="cursor-pointer flex items-center gap-1"
                    onClick={() => setCategory(cat.id as VendorCategory)}
                  >
                    <IconComponent size={14} />
                    {cat.label}
                  </Badge>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu negocio..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>
        </Card>

        {/* Vehículo / carrito */}
        <Card variant="outlined" className="p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Tu vehículo o puesto</p>
          <p className="text-xs text-gray-500 -mt-2">
            Opcional. Mostramos esto a los clientes para que te reconozcan en la calle.
          </p>

          <div className="flex flex-wrap gap-2">
            {VEHICLE_TYPES.map((v) => (
              <Badge
                key={v.id}
                variant={vehicleType === v.id ? 'primary' : 'outline'}
                className="cursor-pointer flex items-center gap-1"
                onClick={() => setVehicleType(vehicleType === v.id ? '' : v.id)}
              >
                <span aria-hidden="true">{v.emoji}</span>
                {v.label}
              </Badge>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Foto del carrito / vehículo <span className="text-gray-400">(opcional)</span>
            </label>
            <ImageUpload
              value={vehiclePhotoUrl}
              onChange={setVehiclePhotoUrl}
              folder="vendors/vehicles"
            />
          </div>
        </Card>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        {/* Guardar */}
        <Button onClick={handleSave} size="lg" className="w-full" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  )
}
