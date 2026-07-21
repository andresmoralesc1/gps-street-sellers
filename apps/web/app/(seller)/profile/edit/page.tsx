'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useEditProfile } from '@/hooks/useEditProfile'
import { ProfilePictureSection } from '@/components/seller/ProfilePictureSection'
import { BusinessDataSection } from '@/components/seller/BusinessDataSection'
import { VehicleSection } from '@/components/seller/VehicleSection'
import { GeoModeSection } from '@/components/seller/GeoModeSection'

export default function EditProfilePage() {
  const router = useRouter()
  const {
    loading,
    saving,
    error,
    vendorId,
    name,
    description,
    category,
    phone,
    photoUrl,
    vehicleType,
    vehiclePhotoUrl,
    geoMode,
    geoZoneRadiusM,
    setName,
    setDescription,
    setCategory,
    setPhone,
    setPhotoUrl,
    setVehicleType,
    setVehiclePhotoUrl,
    setGeoMode,
    setGeoZoneRadiusM,
    handleSave,
  } = useEditProfile()

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
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost"><ChevronLeft size={20} /></Button>
        </Link>
        <h1 className="text-lg font-bold">Editar perfil</h1>
      </header>

      <div className="p-4 space-y-4">
        <ProfilePictureSection photoUrl={photoUrl} onPhotoChange={setPhotoUrl} />

        <BusinessDataSection
          name={name}
          description={description}
          category={category}
          phone={phone}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          onCategoryChange={setCategory}
          onPhoneChange={setPhone}
        />

        <VehicleSection
          vehicleType={vehicleType}
          vehiclePhotoUrl={vehiclePhotoUrl}
          onVehicleTypeChange={setVehicleType}
          onVehiclePhotoChange={setVehiclePhotoUrl}
        />

        <GeoModeSection
          geoMode={geoMode}
          geoZoneRadiusM={geoZoneRadiusM}
          onGeoModeChange={setGeoMode}
          onRadiusChange={setGeoZoneRadiusM}
        />

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <Button onClick={handleSave} size="lg" className="w-full" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
  )
}