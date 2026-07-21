'use client'

import { useEffect, useRef, useState } from 'react'
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
  /** Auto-dismiss after this many ms. Default 3500. */
  duration?: number
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
  success: 'border-primary bg-primary/5 text-primary-700',
  error: 'border-accent bg-accent/5 text-accent',
  info: 'border-stone-300 bg-white text-stone-700',
  warning: 'border-amber-400 bg-amber-50 text-amber-800',
}

// Progress-bar colors are paired with the toast kind so it reads as a
// single visual object. Kept independent of the main border so they
// don't visually compete on busy screens.
const PROGRESS_COLORS: Record<ToastKind, string> = {
  success: 'bg-primary',
  error: 'bg-accent',
  info: 'bg-stone-400',
  warning: 'bg-amber-400',
}

// Desktop: slide in from the top-right (kept from the original
// implementation). Mobile (<640px): slide up from the bottom — the
// existing top-right placement fights with the iOS status bar on small
// viewports and obscures content more than it helps.
const POSITION_CLASSES =
  'fixed z-[100] flex flex-col gap-2 pointer-events-none ' +
  'top-20 right-4 ' +
  'max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:right-0 max-sm:px-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]'

export function ToastContainer() {
  const [items, setItems] = useState<Array<ToastItem & { entering: boolean }>>([])
  // Track dismiss timers so we can clear them when the user manually closes
  // the toast before auto-dismiss (prevents React setState-after-unmount warnings
  // and memory leaks on rapid toast churn).
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const dismiss = (id: number) => {
      setItems((prev) => prev.filter((it) => it.id !== id))
      const timer = timersRef.current.get(id)
      if (timer) {
        clearTimeout(timer)
        timersRef.current.delete(id)
      }
    }

    const handler = (t: Omit<ToastItem, 'id'>) => {
      const id = nextId++
      const duration = t.duration ?? 3500
      setItems((prev) => [...prev, { ...t, id, duration, entering: true }])
      // Auto-dismiss after the configured duration.
      const timer = setTimeout(() => dismiss(id), duration)
      timersRef.current.set(id, timer)
    }
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
      // Clear all pending timers on unmount to avoid leaks.
      timersRef.current.forEach((t) => clearTimeout(t))
      timersRef.current.clear()
    }
  }, [])

  const handleManualDismiss = (id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={POSITION_CLASSES}
    >
      {items.map((it) => {
        const Icon = ICONS[it.kind]
        return (
          <div
            key={it.id}
            role="status"
            // CSS var drives the progress-bar animation duration so a 5s
            // toast has a 5s bar, a 2s toast has a 2s bar — same animation,
            // parameterized runtime.
            style={{ ['--toast-duration' as string]: `${it.duration ?? 3500}ms` }}
            className={clsx(
              'pointer-events-auto flex items-start gap-3 px-4 py-3 pr-10 rounded-2xl border-2 shadow-card-hover min-w-[260px] max-w-sm relative overflow-hidden',
              // Enter on desktop: slide-down from top-right. On mobile:
              // slide-up from bottom. The two animations are similar but
              // distinct enough that the toast feels native to each
              // viewport.
              'animate-slide-up',
              // Error toasts shake to grab attention — same keyframes
              // used by forms on submission errors.
              it.kind === 'error' && 'animate-shake-x',
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
              onClick={() => handleManualDismiss(it.id)}
              aria-label="Cerrar notificación"
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 active:scale-90 transition-transform"
            >
              <X size={14} aria-hidden="true" />
            </button>
            {/* Progress bar — runs over the configured duration, shrinks
                left-to-right. transform: scaleX is composited by the GPU
                so the animation stays smooth even on low-end devices. The
                `origin-left` keeps the right edge fixed as it shrinks so
                it reads as "time running out", not "loading in". */}
            <span
              aria-hidden="true"
              className={clsx(
                'absolute bottom-0 left-0 h-0.5 w-full origin-left animate-progress-shrink',
                PROGRESS_COLORS[it.kind]
              )}
            />
          </div>
        )
      })}
    </div>
  )
}
