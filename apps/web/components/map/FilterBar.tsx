'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/lib/core/constants'
import type { VendorCategory } from '@/lib/core/types'

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
            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            filters.category === null
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Todos
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilters({ category: cat.id as VendorCategory })}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              filters.category === cat.id
                ? 'text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
            style={filters.category === cat.id ? { background: cat.color } : {}}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Distancia */}
      <div className="flex gap-2">
        {DISTANCES.map((dist) => (
          <button
            key={dist.value}
            onClick={() => setFilters({ maxDistanceMeters: dist.value })}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filters.maxDistanceMeters === dist.value
                ? 'bg-secondary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            📍 {dist.label}
          </button>
        ))}
      </div>
    </div>
  )
}