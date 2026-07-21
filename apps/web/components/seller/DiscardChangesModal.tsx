'use client'

import { Button } from '@/components/ui/Button'

interface Props {
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Discard-changes confirmation modal. Shown when the user tries to
 * close the form or go back while the form has unsaved edits. The
 * "Seguir editando" action is the primary safe path (default focus
 * target via the order of buttons).
 */
export function DiscardChangesModal({ onCancel, onConfirm }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discard-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="discard-title" className="text-lg font-semibold mb-2">
          ¿Descartar cambios?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Tienes cambios sin guardar en este producto. Si cierras ahora se van a perder.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Seguir editando
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
          >
            Descartar
          </Button>
        </div>
      </div>
    </div>
  )
}
