'use client'

/**
 * Confirm dialog shown before deleting a product photo. The seller can
 * accidentally tap the X on a photo card; this modal forces a second
 * confirmation so a misclick doesn't drop their gallery.
 *
 * Renders nothing when `photoId` is null — the parent controls visibility
 * by toggling that prop, so the modal doesn't need to manage its own
 * open/close state.
 */
interface ConfirmPhotoDeleteModalProps {
  photoId: string | null
  deleting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmPhotoDeleteModal({
  photoId,
  deleting,
  error,
  onCancel,
  onConfirm,
}: ConfirmPhotoDeleteModalProps) {
  if (!photoId) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-delete-title"
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !deleting && onCancel()}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="photo-delete-title" className="text-lg font-bold mb-2">
          ¿Eliminar esta foto?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Esta acción no se puede deshacer. Si era la foto principal,
          la siguiente foto de la galería pasará a ser la principal.
        </p>
        {error && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3"
          >
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}