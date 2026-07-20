'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Apple, UtensilsCrossed, CupSoda, Palette, Shirt, Package, ChevronLeft, Zap, BatteryLow } from 'lucide-react'
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

  // Geo mode: 'precise' = GPS cada 10s, 'battery' = zona circular.
  // Cuando es battery, el vendedor define un radio (100–5000m) y un centro
  // (su posición actual al guardar). El servidor solo recibe updates cuando
  // cruza la frontera del círculo.
  const [geoMode, setGeoMode] = useState<'precise' | 'battery'>('precise')
  const [geoZoneRadiusM, setGeoZoneRadiusM] = useState<number>(500)

  useEffect(() => {
    if (user?.role !== 'seller') {
      // Seller-only page. Since role is immutable post-register, redirect
      // non-sellers to the public map. If they need a seller account, they
      // must register a new one.
      router.push('/map')
      return
    }

    // First get vendorId from /api/vendors/me.
    // c84a990 split the endpoint: GET now returns { vendors: [...] }.
    // Defensive: accept the legacy { vendor } shape so un-migrated callers
    // still work.
    fetch('/api/vendors/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const list = data.vendors ?? (data.vendor ? [data.vendor] : [])
        const firstVendor = list[0]
        if (!firstVendor) {
          setLoading(false)
          return
        }
        setVendorId(firstVendor.id)
        // Hydrate geo mode from the first vendor in the list — this endpoint
        // exposes geoMode / geoZoneRadiusM directly (added in geo-mode sprint).
        if (firstVendor.geoMode === 'battery' || firstVendor.geoMode === 'precise') {
          setGeoMode(firstVendor.geoMode)
        }
        if (typeof firstVendor.geoZoneRadiusM === 'number') {
          setGeoZoneRadiusM(firstVendor.geoZoneRadiusM)
        }

        // Then fetch full vendor data
        return fetch(`/api/vendors/${firstVendor.id}`, {
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
      // If switching to 'battery' mode (or already in it but changing the
      // radius), we need a "center" for the zone — the vendor's current
      // position. We grab it via the browser geolocation API before saving.
      // If geolocation is denied/unavailable, we still save the mode (the
      // server keeps the previous zone center in DB).
      let geoZoneLat: number | undefined
      let geoZoneLng: number | undefined

      if (geoMode === 'battery') {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            resolve(null)
            return
          }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p),
            () => resolve(null),
            { timeout: 5000, maximumAge: 60_000 }
          )
        })
        if (pos) {
          geoZoneLat = pos.coords.latitude
          geoZoneLng = pos.coords.longitude
        }
      }

      const res = await fetch('/api/vendors/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // camelCase keys — backend's clientToDb map only recognizes these.
        // snake_case keys are silently dropped, returning 400 "No se
        // proporcionaron campos para actualizar" with the image never
        // persisted (the file itself was uploaded to /storage but the
        // DB row never gets the URL).
        body: JSON.stringify({
          name,
          description,
          category,
          phone,
          photoUrl,
          vehicleType: vehicleType || null,
          vehiclePhotoUrl: vehiclePhotoUrl || null,
          // Geo mode persistence. Only send the zone center if we have one
          // (mode=battery + geolocation succeeded). The radius is always
          // sent so the server can validate the range.
          geoMode,
          geoZoneRadiusM: geoZoneRadiusM,
          ...(geoZoneLat !== undefined && { geoZoneLat }),
          ...(geoZoneLng !== undefined && { geoZoneLng }),
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
          <h1 className="text-lg font-bold">Editar perfil</h1>
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
        <h1 className="text-lg font-bold">Editar perfil</h1>
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
            placeholder="Ej.: Empanadas Don Juan"
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

        {/* Modo de ubicación (ahorro de batería) */}
        <Card variant="outlined" className="p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <BatteryLow size={16} aria-hidden="true" />
              Modo de ubicación
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Si tienes datos limitados o batería baja, elige &ldquo;Ahorro de batería&rdquo;.
              Tu pin solo se actualizará cuando salgas del círculo que definas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={geoMode === 'precise' ? 'primary' : 'outline'}
              className="cursor-pointer flex items-center gap-1"
              onClick={() => setGeoMode('precise')}
              aria-pressed={geoMode === 'precise'}
            >
              <Zap size={14} aria-hidden="true" />
              Preciso (cada 10 s)
            </Badge>
            <Badge
              variant={geoMode === 'battery' ? 'primary' : 'outline'}
              className="cursor-pointer flex items-center gap-1"
              onClick={() => setGeoMode('battery')}
              aria-pressed={geoMode === 'battery'}
            >
              <BatteryLow size={14} aria-hidden="true" />
              Ahorro de batería
            </Badge>
          </div>

          {geoMode === 'battery' && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label htmlFor="geo-radius" className="text-sm font-medium text-gray-700 block">
                Radio de actualización: <span className="text-primary font-bold">{geoZoneRadiusM} m</span>
              </label>
              <input
                id="geo-radius"
                type="range"
                min={100}
                max={5000}
                step={100}
                value={geoZoneRadiusM}
                onChange={(e) => setGeoZoneRadiusM(Number(e.target.value))}
                className="w-full accent-primary"
                aria-label="Radio de la zona en metros"
              />
              <div className="flex justify-between text-xs text-gray-400" aria-hidden="true">
                <span>100 m</span>
                <span>1 km</span>
                <span>2 km</span>
                <span>5 km</span>
              </div>
              <p className="text-xs text-gray-500 pt-1">
                Al guardar, anclamos el círculo a tu ubicación actual. Cuando salgas del
                círculo, mandaremos tu nueva posición y volveremos a anclar.
              </p>
            </div>
          )}
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
