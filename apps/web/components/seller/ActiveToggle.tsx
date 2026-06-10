'use client'

import { clsx } from 'clsx'
import { useStore } from '@/store/useStore'

export function ActiveToggle() {
  const isActive = useStore((s) => s.isSellerActive)
  const setSellerActive = useStore((s) => s.setSellerActive)

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
      <div>
        <h3 className="font-semibold text-lg">Estado de visibilidad</h3>
        <p className="text-gray-500 text-sm">
          {isActive
            ? 'Los compradores pueden verte en el mapa'
            : 'Los compradores no pueden verte'}
        </p>
      </div>

      <button
        onClick={() => setSellerActive(!isActive)}
        className={clsx(
          'relative w-14 h-8 rounded-full transition-colors',
          isActive ? 'bg-secondary' : 'bg-gray-300'
        )}
      >
        <div
          className={clsx(
            'absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform',
            isActive ? 'translate-x-7' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}