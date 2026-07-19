'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, MapPin, X } from 'lucide-react'
import { COLOMBIA_CITIES } from '@/lib/core/constants'
import { clsx } from 'clsx'

interface CityInputProps {
  value: string
  onChange: (cityId: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Optional: render a "Selecciona tu ciudad" empty option */
  showEmptyOption?: boolean
  emptyLabel?: string
  /** Rounded style — login/register use rounded-xl, dashboard uses rounded-lg */
  rounded?: 'lg' | 'xl'
}

/**
 * Replaces native <select> with a typeahead input. Users type to filter the
 * 18 Colombian cities, click or Enter to select. Empty state shows the
 * current selection as a tag below the input.
 */
export function CityInput({
  value,
  onChange,
  placeholder = 'Busca tu ciudad...',
  disabled = false,
  className = '',
  showEmptyOption = true,
  emptyLabel = 'Selecciona tu ciudad',
  rounded = 'xl',
}: CityInputProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedCity = useMemo(
    () => COLOMBIA_CITIES.find((c) => c.id === value),
    [value]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COLOMBIA_CITIES
    return COLOMBIA_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
    )
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset highlight when results change
  useEffect(() => {
    setHighlight(0)
  }, [query, open])

  function pick(id: string) {
    onChange(id)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function clear() {
    onChange('')
    setQuery('')
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
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

  const radius = rounded === 'xl' ? 'rounded-xl' : 'rounded-lg'

  return (
    <div ref={ref} className={clsx('relative', className)}>
      {/* Input */}
      <div
        className={clsx(
          'flex items-center gap-2 w-full px-3 py-3 border bg-white text-sm min-h-[44px]',
          'focus-within:ring-2 focus-within:ring-primary/50',
          'disabled:opacity-50',
          radius,
          open ? 'border-primary' : 'border-gray-300'
        )}
      >
        <Search size={18} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={selectedCity ? selectedCity.name : placeholder}
          className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
          aria-label="Buscar ciudad"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {selectedCity && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="text-gray-400 hover:text-gray-600 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded"
            aria-label="Limpiar selección"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Current selection badge — shown below input when not searching */}
      {selectedCity && !query && !open && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600">
          <MapPin size={12} className="text-primary-700" />
          <span className="font-medium">{selectedCity.name}</span>
          <span className="text-gray-400">— {selectedCity.department}</span>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className={clsx(
            'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto',
            radius
          )}
        >
          {showEmptyOption && (
            <button
              type="button"
              onClick={() => pick('')}
              className={clsx(
                'w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors',
                !value && 'bg-primary/5 text-primary-700 font-medium'
              )}
            >
              {emptyLabel}
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No se encontraron ciudades
            </div>
          ) : (
            filtered.map((city, i) => (
              <button
                key={city.id}
                type="button"
                onClick={() => pick(city.id)}
                onMouseEnter={() => setHighlight(i)}
                className={clsx(
                  'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between',
                  highlight === i && 'bg-primary/5',
                  value === city.id && 'text-primary-700 font-medium'
                )}
              >
                <span>{city.name}</span>
                <span className="text-xs text-gray-400">{city.department}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
