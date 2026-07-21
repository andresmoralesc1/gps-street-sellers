'use client'

import { Package, Edit3, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MultiPhotoUploader } from '@/components/seller/MultiPhotoUploader'
import type { Product } from '@/hooks/useProductsPage'

interface Props {
  product: Product
  onEdit: (p: Product) => void
  onDelete: (id: string) => void
}

/**
 * Single row in the seller product list — thumbnail, name, description
 * (clamped to 1 line), price, edit/delete actions, and a collapsible
 * "more photos" details panel for the MultiPhotoUploader (N12 — extra
 * product photos carousel).
 */
export function ProductCard({ product, onEdit, onDelete }: Props) {
  return (
    <Card variant="outlined" className="p-4">
      <div className="flex gap-4">
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
            <Package size={24} className="text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold">{product.name}</h3>
          <p className="text-gray-500 text-sm line-clamp-1">
            {product.description || 'Sin descripción'}
          </p>
          <p className="text-primary-700 font-bold mt-1">
            ${product.price.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(product)} aria-label="Editar">
            <Edit3 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(product.id)}
            aria-label="Eliminar"
          >
            <Trash2 size={16} className="text-red-500" />
          </Button>
        </div>
      </div>
      <details className="mt-3">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
          📷 Más fotos (hasta 6)
        </summary>
        <div className="mt-3">
          <MultiPhotoUploader productId={product.id} />
        </div>
      </details>
    </Card>
  )
}
