'use client'

import { Button } from '@/components/ui/Button'

interface Props {
  error: string
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirm modal for product deletion. Background click cancels (matches
 * the discard modal below). The red button uses bg-red-600 (not the
 * accent token) because the action is destructive — color is the cue.
 */
export function DeleteProductModal({ error, onCancel, onConfirm }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-modal-title" className="text-lg font-bold mb-2">
          ¿Eliminar producto?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Esta acción no se puede deshacer. El producto y todas sus fotos
          adicionales se eliminarán.
        </p>
        {error && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 mb-3"
          >
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  )
}
