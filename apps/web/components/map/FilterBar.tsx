'use client'

import { clsx } from 'clsx'
import {
  Apple,
  UtensilsCrossed,
  CupSoda,
  Palette,
  Shirt,
  Package,
  MapPin,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/lib/core/constants'
import type { VendorCategory } from '@/lib/core/types'

// Mapeo de categorías a iconos Lucide
const CategoryIconMap: Record<VendorCategory, typeof Apple> = {
  frutas: Apple,
  comida: UtensilsCrossed,
  bebidas: CupSoda,
  artesanias: Palette,
  ropa: Shirt,
  otros: Package,
}

const DISTANCES = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
]

export function FilterBar() {
  const filters = useStore((s) => s.filters)
  const setFilters = useStore((s) => s.setFilters)

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      {/* Categorías */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => setFilters({ category: null })}
          className={clsx(
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5',
            filters.category === null
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Todos
        </button>
        {CATEGORIES.map((cat) => {
          const IconComponent = CategoryIconMap[cat.id]
          return (
            <button
              key={cat.id}
              onClick={() => setFilters({ category: cat.id as VendorCategory })}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5',
                filters.category === cat.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              style={filters.category === cat.id ? { background: cat.color } : {}}
            >
              <IconComponent size={16} />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Distancia */}
      <div className="flex gap-2">
        {DISTANCES.map((dist) => (
          <button
            key={dist.value}
            onClick={() => setFilters({ maxDistanceMeters: dist.value })}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
              filters.maxDistanceMeters === dist.value
                ? 'bg-secondary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            <MapPin size={14} />
            {dist.label}
          </button>
        ))}
      </div>
    </div>
  )
}