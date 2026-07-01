'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { clsx } from 'clsx'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  href: string
}

interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  description?: string
  action?: ToastAction
}

// Module-level event bus — no provider needed because toasts are global.
let nextId = 1
const listeners = new Set<(toast: Omit<ToastItem, 'id'>) => void>()

export function toast(toast: Omit<ToastItem, 'id'>) {
  listeners.forEach((fn) => fn(toast))
}

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const COLORS: Record<ToastKind, string> = {
  success: 'border-primary bg-primary/5 text-primary',
  error: 'border-accent bg-accent/5 text-accent',
  info: 'border-stone-300 bg-white text-stone-700',
  warning: 'border-amber-400 bg-amber-50 text-amber-800',
}

export function ToastContainer() {
  const [items, setItems] = useState<Array<ToastItem & { entering: boolean }>>([])

  useEffect(() => {
    const handler = (t: Omit<ToastItem, 'id'>) => {
      const id = nextId++
      setItems((prev) => [...prev, { ...t, id, entering: true }])
      // Auto-dismiss after 3.5s
      window.setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.id !== id))
      }, 3500)
    }
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {items.map((it) => {
        const Icon = ICONS[it.kind]
        return (
          <div
            key={it.id}
            role="status"
            className={clsx(
              'pointer-events-auto flex items-start gap-3 px-4 py-3 pr-10 rounded-2xl border-2 shadow-card-hover min-w-[260px] max-w-sm relative',
              'animate-slide-up',
              COLORS[it.kind]
            )}
          >
            <Icon size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">{it.title}</p>
              {it.description && (
                <p className="text-xs mt-0.5 opacity-80">{it.description}</p>
              )}
              {it.action && (
                <Link
                  href={it.action.href}
                  className="inline-block mt-1.5 text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  {it.action.label} →
                </Link>
              )}
            </div>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
              aria-label="Cerrar notificación"
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 active:scale-90 transition-transform"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
