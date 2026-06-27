'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { COLOMBIA_CITIES } from '@/lib/core/constants'
import { clsx } from 'clsx'

export function CitySelector() {
  const selectedCity = useStore((s) => s.selectedCity)
  const setSelectedCity = useStore((s) => s.setSelectedCity)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
      >
        <MapPin size={16} className="text-primary" />
        <span>{selectedCity.name}</span>
        <ChevronDown size={14} className={clsx('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-[1000] min-w-[200px] overflow-hidden">
          {COLOMBIA_CITIES.map((city) => (
            <button
              key={city.id}
              onClick={() => {
                setSelectedCity(city)
                setOpen(false)
              }}
              className={clsx(
                'w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between',
                selectedCity.id === city.id && 'bg-primary/5 text-primary font-medium'
              )}
            >
              <span>{city.name}</span>
              <span className="text-xs text-gray-400">{city.department}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
