'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, MapPin, ExternalLink } from 'lucide-react'
import Link from 'next/link'

/**
 * N2 — Floating Action Button (FAB) with quick actions.
 * Bottom-right button; expands to 3 quick actions:
 *  - Compartir ubicación (calls onShareLocation from parent)
 *  - Ver mi perfil público
 *  - Ir a mis stats / vista de mapa
 */
interface FloatingActionButtonProps {
  vendorId: string
  onShareLocation: () => void
  sharingLocation: boolean
}

export function FloatingActionButton({ vendorId, onShareLocation, sharingLocation }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const actions = [
    {
      label: sharingLocation ? 'Obteniendo...' : 'Compartir ubicación',
      icon: MapPin,
      onClick: () => {
        onShareLocation()
        setOpen(false)
      },
      disabled: sharingLocation,
    },
    {
      label: 'Ver perfil público',
      icon: ExternalLink,
      href: `/vendedor/${vendorId}`,
    },
    // "Ver mapa de pedidos" was removed — the /orders-map route was never
    // implemented (always 404). Sellers get order info from /dashboard stats.
  ]

  return (
    <div ref={ref} className="fixed bottom-20 right-4 z-20 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2">
          {actions.map((a) => {
            const Icon = a.icon
            const inner = (
              <span className="flex items-center gap-2 bg-white shadow-lg rounded-full pl-3 pr-4 py-2 text-sm font-medium text-gray-800">
                <Icon size={16} className="text-primary" />
                {a.label}
              </span>
            )
            if ('href' in a && a.href) {
              return (
                <Link
                  key={a.label}
                  href={a.href!}
                  onClick={() => setOpen(false)}
                  className="hover:opacity-90"
                >
                  {inner}
                </Link>
              )
            }
            return (
              <button
                key={a.label}
                type="button"
                disabled={a.disabled}
                onClick={a.onClick}
                className="hover:opacity-90 disabled:opacity-50"
              >
                {inner}
              </button>
            )
          })}
        </div>
      )}
      <button
        type="button"
        aria-label={open ? 'Cerrar acciones rápidas' : 'Abrir acciones rápidas'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95"
      >
        <Plus
          size={24}
          className={`transition-transform ${open ? 'rotate-45' : ''}`}
        />
      </button>
    </div>
  )
}