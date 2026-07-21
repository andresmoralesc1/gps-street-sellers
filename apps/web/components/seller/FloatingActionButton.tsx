'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, MapPin, ExternalLink } from 'lucide-react'
import Link from 'next/link'

/**
 * N2 — Floating Action Button (FAB) with quick actions.
 * Bottom-right button; expands to 3 quick actions:
 *  - Compartir ubicación (calls onShareLocation from parent)
 *  - Ver mi perfil público
 *
 * Microinteractions (2026-07-21):
 *  - Delayed entrance (500ms after mount) with overshoot via cubic-bezier
 *  - Soft idle pulse-ring behind the button every 2.4s when CLOSED
 *  - Action chips stagger in (70ms each) when the menu opens
 *  - Plus icon rotates to X with ease-out (300ms) instead of default
 *  - Active state already had scale-95, kept
 *
 * Honors `prefers-reduced-motion` via the corresponding Tailwind classes
 * (the @media block in app/globals.css disables them all together).
 */
interface FloatingActionButtonProps {
  vendorId: string
  onShareLocation: () => void
  sharingLocation: boolean
}

export function FloatingActionButton({ vendorId, onShareLocation, sharingLocation }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // First-paint gate — the pop-in animation has a built-in 500ms delay,
  // but we also avoid running it during SSR hydration mismatch by
  // toggling `mounted` only after the component is interactive.
  useEffect(() => {
    setMounted(true)
  }, [])

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
    <div
      ref={ref}
      className={`fixed bottom-20 right-4 z-20 flex flex-col items-end gap-2 ${
        mounted ? 'animate-fab-pop-in' : 'opacity-0'
      }`}
    >
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1">
          {actions.map((a, i) => {
            const Icon = a.icon
            const inner = (
              <span className="flex items-center gap-2 bg-white shadow-lg rounded-full pl-3 pr-4 py-2 text-sm font-medium text-gray-800">
                <Icon size={16} className="text-primary" />
                {a.label}
              </span>
            )
            // Per-item stagger delay — first chip at 0ms, second at 70ms.
            // The animation itself is `fab-stagger-in` from tailwind.config.
            const staggerStyle = {
              animationDelay: `${i * 70}ms`,
            }
            if ('href' in a && a.href) {
              return (
                <Link
                  key={a.label}
                  href={a.href!}
                  onClick={() => setOpen(false)}
                  className="hover:opacity-90 animate-fab-stagger-in"
                  style={staggerStyle}
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
                className="hover:opacity-90 disabled:opacity-50 animate-fab-stagger-in"
                style={staggerStyle}
              >
                {inner}
              </button>
            )
          })}
        </div>
      )}
      <div className="relative">
        {/* Idle pulse ring — only when the FAB is closed so it doesn't
            fight the menu animation. Sits behind the button (z-0) and is
            purely decorative (aria-hidden, pointer-events-none). */}
        {!open && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-primary/30 animate-fab-pulse-ring pointer-events-none"
          />
        )}
        <button
          type="button"
          aria-label={open ? 'Cerrar acciones rápidas' : 'Abrir acciones rápidas'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95"
        >
          <Plus
            size={24}
            className={`transition-transform duration-300 ease-out ${open ? 'rotate-45' : 'rotate-0'}`}
          />
        </button>
      </div>
    </div>
  )
}
