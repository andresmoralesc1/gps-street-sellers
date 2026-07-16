'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

/**
 * N5 — Visual confirmation toast on state changes.
 * Tiny toast system (no deps) for seller dashboard feedback.
 * Auto-dismiss after 3s; manual close button.
 */

let nextId = 1

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const t: Toast = { id: nextId++, message, kind }
    setToast(t)
    setTimeout(() => {
      setToast((cur) => (cur?.id === t.id ? null : cur))
    }, 3000)
  }, [])

  const dismiss = useCallback(() => setToast(null), [])

  return { toast, showToast, dismiss }
}

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const STYLES: Record<ToastKind, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-800 text-white',
}

export function ConfirmToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[toast.kind]
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={clsx(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-3 rounded-full shadow-lg',
        'max-w-[90vw] animate-in fade-in slide-in-from-bottom-4',
        STYLES[toast.kind]
      )}
    >
      <Icon size={18} />
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="ml-1 hover:opacity-80"
      >
        <X size={14} />
      </button>
    </div>
  )
}