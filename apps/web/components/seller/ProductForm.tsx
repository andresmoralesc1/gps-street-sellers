'use client'

import { X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { hasErrors } from '@/lib/products/validation'
import type { ProductValidationErrors } from '@/hooks/useProductsPage'

interface Props {
  editingId: string | null
  formName: string
  formDescription: string
  formPrice: string
  formPhotoUrl: string
  formSaving: boolean
  formError: string
  formSuccess: string
  fieldErrors: ProductValidationErrors
  touched: Record<string, boolean>
  onChangeName: (v: string) => void
  onChangeDescription: (v: string) => void
  onChangePrice: (v: string) => void
  onChangePhotoUrl: (v: string) => void
  onBlur: (field: keyof ProductValidationErrors) => void
  onClose: () => void
  onSubmit: () => void
}

/**
 * Add/edit form for a single product. Re-validates on every keystroke
 * AFTER the first blur (so the user isn't yelled at while still typing).
 * aria-invalid + role="alert" on the error message keep the form usable
 * with a screen reader.
 */
export function ProductForm({
  editingId,
  formName,
  formDescription,
  formPrice,
  formPhotoUrl,
  formSaving,
  formError,
  formSuccess,
  fieldErrors,
  touched,
  onChangeName,
  onChangeDescription,
  onChangePrice,
  onChangePhotoUrl,
  onBlur,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Card variant="outlined" className="p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          {editingId ? 'Editar producto' : 'Agregar producto'}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar formulario">
          <X size={18} />
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <Input
            label="Nombre"
            value={formName}
            onChange={(e) => onChangeName(e.target.value)}
            onBlur={() => onBlur('name')}
            placeholder="Ej: Empanada de pollo"
            aria-invalid={Boolean(touched.name && fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          />
          {touched.name && fieldErrors.name && (
            <p id="name-error" role="alert" className="text-xs text-red-700 mt-1">
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div>
          <Input
            label="Descripción"
            value={formDescription}
            onChange={(e) => onChangeDescription(e.target.value)}
            onBlur={() => onBlur('description')}
            placeholder="Ej: Rellena con pollo y papa"
            aria-invalid={Boolean(touched.description && fieldErrors.description)}
          />
          {touched.description && fieldErrors.description && (
            <p role="alert" className="text-xs text-red-700 mt-1">
              {fieldErrors.description}
            </p>
          )}
        </div>
        <div>
          <Input
            label="Precio (COP)"
            type="number"
            value={formPrice}
            onChange={(e) => onChangePrice(e.target.value)}
            onBlur={() => onBlur('price')}
            placeholder="2500"
            aria-invalid={Boolean(touched.price && fieldErrors.price)}
          />
          {touched.price && fieldErrors.price && (
            <p role="alert" className="text-xs text-red-700 mt-1">
              {fieldErrors.price}
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Foto (opcional)</label>
          <ImageUpload
            value={formPhotoUrl}
            onChange={onChangePhotoUrl}
            folder="products"
          />
          {touched.photoUrl && fieldErrors.photoUrl && (
            <p role="alert" className="text-xs text-red-700 mt-1">
              {fieldErrors.photoUrl}
            </p>
          )}
        </div>
        {formError && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3"
          >
            {formError}
          </div>
        )}
        {formSuccess && (
          <div
            role="status"
            className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3"
          >
            {formSuccess}
          </div>
        )}
        <Button
          onClick={onSubmit}
          disabled={formSaving || hasErrors(fieldErrors)}
          className="w-full"
        >
          {formSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}
        </Button>
      </div>
    </Card>
  )
}
