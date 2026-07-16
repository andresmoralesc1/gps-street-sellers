'use client'

import { useState } from 'react'
import { ChevronDown, Store, Plus, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

/**
 * N16 — Multi-vendor selector.
 * Shows a dropdown of the user's vendors and lets them switch which
 * one is currently active on the dashboard. Each vendor gets its own
 * products, orders, stats.
 */
interface VendorLite {
  id: string
  name: string
  category: string
  photoUrl?: string | null
  isActive?: boolean
  slug?: string
}

interface VendorSwitcherProps {
  vendors: VendorLite[]
  currentVendorId: string
  onSwitch?: (vendorId: string) => void
}

export function VendorSwitcher({ vendors, currentVendorId, onSwitch }: VendorSwitcherProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const current = vendors.find((v) => v.id === currentVendorId) ?? vendors[0]

  if (!current) return null

  const handleSelect = (id: string) => {
    if (id === currentVendorId) {
      setOpen(false)
      return
    }
    onSwitch?.(id)
    // Persist in localStorage for next dashboard load
    try { localStorage.setItem('active_vendor_id', id) } catch {}
    router.push(`/dashboard?vendor=${id}`)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {current.photoUrl
            ? <img src={current.photoUrl} alt="" className="w-full h-full rounded-lg object-cover" />
            : <Store size={20} />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-gray-800 truncate">{current.name}</p>
          <p className="text-xs text-gray-500">
            {vendors.length > 1
              ? `${vendors.length} tiendas — toca para cambiar`
              : 'Tu tienda'}
          </p>
        </div>
        {vendors.length > 1 && (
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <Card variant="elevated" className="absolute z-30 mt-1 w-full p-2 max-h-64 overflow-y-auto">
          <ul role="listbox" className="space-y-1">
            {vendors.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(v.id)}
                  role="option"
                  aria-selected={v.id === currentVendorId}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-left"
                >
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {v.photoUrl
                      ? <img src={v.photoUrl} alt="" className="w-full h-full rounded object-cover" />
                      : <Store size={14} className="text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{v.name}</p>
                    <p className="text-xs text-gray-500 truncate">{v.category}</p>
                  </div>
                  {v.id === currentVendorId && <Check size={16} className="text-primary" />}
                </button>
              </li>
            ))}
            {vendors.length < 3 && (
              <li className="pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    router.push('/onboarding?new=1')
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 text-primary"
                >
                  <Plus size={16} />
                  <span className="font-medium text-sm">Crear nueva tienda</span>
                </button>
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  )
}