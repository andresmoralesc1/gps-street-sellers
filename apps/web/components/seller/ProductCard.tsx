'use client'

import { Package, Edit3, Trash2, Eye, EyeOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MultiPhotoUploader } from '@/components/seller/MultiPhotoUploader'
import type { Product } from '@/hooks/useProductsPage'

interface Props {
  product: Product
  onEdit: (p: Product) => void
  onDelete: (id: string) => void
  // Sprint 6 D.1: per-product publish/unpublish toggle. Parent owns the
  // network round-trip + optimistic update via useProductsPage so the
  // state stays coherent across multiple cards if the user rapid-taps.
  onToggleActive: (id: string, nextActive: boolean) => Promise<void>
  // While this specific card is mid-toggle (so we can disable the
  // button and show a spinner instead of firing two PATCHes).
  isToggling: boolean
}

/**
 * Single row in the seller product list — thumbnail, name, description
 * (clamped to 1 line), price, edit/delete/publish actions, and a
 * collapsible "more photos" details panel for the MultiPhotoUploader
 * (N12 — extra product photos carousel).
 *
 * Sprint 6 D.1: visual state distinguishes published vs hidden products:
 *   - published (is_active=true): card is full opacity, has a green
 *     "Visible" pill next to the price
 *   - hidden (is_active=false): card dims to 60% opacity, has a gray
 *     "Oculto" pill, the toggle button label switches to "Publicar"
 *
 * The opacity dim is intentional: the seller can still edit/delete
 * hidden products (sometimes you hide to take a break, not to delete),
 * but the visual cue prevents accidental edits because the card looks
 * "archived".
 */
export function ProductCard({ product, onEdit, onDelete, onToggleActive, isToggling }: Props) {
  const isPublished = product.is_active

  return (
    <Card
      variant="outlined"
      // data-publish-state is set so tests / Playwright can assert the
      // visual state without scraping className. The opacity change is
      // handled with a CSS transition so the optimistic toggle feels
      // smooth (no jarring snap from full to 60% opacity).
      data-publish-state={isPublished ? 'published' : 'hidden'}
      className={`p-4 transition-opacity duration-200 ${
        isPublished ? 'opacity-100' : 'opacity-60'
      }`}
    >
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
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{product.name}</h3>
          <p className="text-gray-500 text-sm line-clamp-1">
            {product.description || 'Sin descripción'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-primary-700 font-bold">
              ${product.price.toLocaleString('es-CO')}
            </p>
            {/* Publish state pill — Sprint 6 D.1. aria-label so screen
                readers hear "Visible" / "Oculto" instead of guessing from
                color alone. */}
            <span
              aria-label={isPublished ? 'Producto visible' : 'Producto oculto'}
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isPublished
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {isPublished ? 'Visible' : 'Oculto'}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {/* Toggle visibility — Sprint 6 D.1. Touch target ≥44px (h-11
              min-h-[44px]) per Apple HIG. aria-pressed reflects the
              current publish state for assistive tech. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(product.id, !isPublished)}
            disabled={isToggling}
            aria-pressed={isPublished}
            aria-label={isPublished ? 'Ocultar producto' : 'Publicar producto'}
            className="min-h-[44px] min-w-[44px]"
          >
            {isToggling ? (
              <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            ) : isPublished ? (
              <Eye size={16} className="text-green-700" aria-hidden="true" />
            ) : (
              <EyeOff size={16} className="text-gray-500" aria-hidden="true" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(product)} aria-label="Editar" className="min-h-[44px] min-w-[44px]">
            <Edit3 size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(product.id)}
            aria-label="Eliminar"
            className="min-h-[44px] min-w-[44px]"
          >
            <Trash2 size={16} className="text-red-500" aria-hidden="true" />
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