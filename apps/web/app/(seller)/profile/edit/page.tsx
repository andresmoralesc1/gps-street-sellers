'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MOCK_VENDORS } from '@/lib/mockData'
import { CATEGORIES } from '@/lib/core/constants'
import type { VendorCategory } from '@/lib/core/types'

export default function EditProfilePage() {
  const router = useRouter()
  const vendor = MOCK_VENDORS.find((v) => v.id === 'v2') // Mock vendor

  const [name, setName] = useState(vendor?.name || '')
  const [description, setDescription] = useState(vendor?.description || '')
  const [category, setCategory] = useState<VendorCategory>(vendor?.category as VendorCategory || 'comida')

  const handleSave = () => {
    // Mock save - en producción esto iría a Supabase
    alert('Perfil guardado (mock)')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ←
        </Button>
        <h1 className="text-lg font-bold">Editar Perfil</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Foto */}
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-primary/20 flex items-center justify-center text-4xl">
              📸
            </div>
            <div>
              <Button variant="outline" size="sm">
                Cambiar foto
              </Button>
              <p className="text-xs text-gray-500 mt-1">PNG o JPG, máx 2MB</p>
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

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={category === cat.id ? 'primary' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setCategory(cat.id as VendorCategory)}
                >
                  {cat.icon} {cat.label}
                </Badge>
              ))}
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

        {/* Guardar */}
        <Button onClick={handleSave} size="lg" className="w-full">
          Guardar Cambios
        </Button>
      </div>
    </div>
  )
}
