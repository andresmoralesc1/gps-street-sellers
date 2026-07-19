'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CityInput } from '@/components/ui/CityInput'
import { CATEGORIES } from '@/lib/core/constants'
import type { VendorCategory } from '@/lib/core/types'

interface VendorFormSlideProps {
  onCreated: (vendorId: string) => void
  initialName?: string
}

export function VendorFormSlide({ onCreated, initialName = '' }: VendorFormSlideProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<VendorCategory>('comida')
  const [phone, setPhone] = useState('')
  const [cityId, setCityId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('El nombre del negocio es requerido')
      return
    }
    if (!category) {
      setError('Selecciona una categoría')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // POST /api/vendors creates a vendor owned by the authenticated seller.
      // (Previously this hit /api/vendors/me which has no POST handler — that
      //  405 silently broke the entire seller onboarding funnel.)
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          phone: phone.replace(/\D/g, ''),
          city_id: cityId || 'bogota',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al crear el perfil')
        setSubmitting(false)
        return
      }

      onCreated(data.vendor.id)
    } catch {
      setError('Error de conexión')
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center py-8">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        Crea tu perfil de vendedor
      </h2>
      <p className="text-gray-500 text-center mb-6 text-sm">
        Esto es lo único que necesitamos para empezar
      </p>

      <div className="space-y-4">
        <Input
          label="Nombre del negocio"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Don Juan Empanadas"
        />

        <Input
          label="Teléfono"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="300 123 4567"
        />

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Ciudad</label>
          <CityInput
            value={cityId}
            onChange={setCityId}
            placeholder="Busca tu ciudad..."
            rounded="lg"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as VendorCategory)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  category === cat.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cuéntales a tus clientes qué vendes..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <Button
          onClick={handleSubmit}
          className="w-full"
          size="lg"
          disabled={submitting}
        >
          {submitting ? 'Creando...' : 'Continuar'}
        </Button>
      </div>
    </div>
  )
}