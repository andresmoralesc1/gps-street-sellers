'use client'

import Link from 'next/link'
import { ChevronLeft, Package } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  onBack: () => void
  productCount: number
}

/**
 * Top bar for the seller /products page — back to dashboard, page title,
 * live product count.
 *
 * Uses Button + chevron (matching other seller pages). The back button
 * is wired to the parent's `tryGoBack` so unsaved-form-changes funnel
 * through the discard modal.
 */
export function ProductsPageHeader({ onBack, productCount }: Props) {
  return (
    <header className="bg-white shadow-sm p-4 flex items-center gap-4">
      <Button variant="ghost" onClick={onBack} aria-label="Volver al dashboard">
        <ChevronLeft size={20} />
      </Button>
      <div>
        <h1 className="text-xl font-bold">Mis Productos</h1>
        <p className="text-sm text-gray-500">
          {productCount} {productCount === 1 ? 'producto' : 'productos'}
        </p>
      </div>
    </header>
  )
}
