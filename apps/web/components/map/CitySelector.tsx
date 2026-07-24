'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, MapPin, Search, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { COLOMBIA_CITIES } from '@/lib/core/constants'
import { clsx } from 'clsx'

export function CitySelector() {
  const selectedCity = useStore((s) => s.selectedCity)
  const setSelectedCity = useStore((s) => s.setSelectedCity)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COLOMBIA_CITIES
    return COLOMBIA_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
    )
  }, [query])

  function pick(id: string) {
    const city = COLOMBIA_CITIES.find((c) => c.id === id)
    if (city) {
      setSelectedCity(city)
    }
    setOpen(false)
    setQuery('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const city = filtered[highlight]
      if (city) pick(city.id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o)
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 50)
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Ciudad seleccionada: ${selectedCity.name}. Click para cambiar.`}
        // Sprint 5 B-002: min-h-[44px] tap target + thicker border + primary
        // tinted background on mobile. The old version blended in with the
        // page background and got lost under the search bar.
        className="flex items-center gap-2 min-h-[44px] px-3 py-2 bg-primary-50 border-2 border-primary-200 hover:bg-primary-100 rounded-lg shadow-sm transition-colors text-sm font-semibold text-primary-800"
      >
        <MapPin size={16} className="text-primary-700" aria-hidden="true" />
        <span>{selectedCity.name}</span>
        <ChevronDown size={14} className={clsx('text-primary-600 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-[1000] min-w-[260px] overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Busca tu ciudad..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
                aria-label="Buscar ciudad"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No se encontraron ciudades
              </div>
            ) : (
              filtered.map((city, i) => (
                <button
                  key={city.id}
                  onClick={() => pick(city.id)}
                  onMouseEnter={() => setHighlight(i)}
                  role="option"
                  aria-selected={selectedCity.id === city.id}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between',
                    highlight === i && 'bg-gray-50',
                    selectedCity.id === city.id && 'bg-primary/5 text-primary-700 font-medium'
                  )}
                >
                  <span>{city.name}</span>
                  <span className="text-xs text-gray-400">{city.department}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
