'use client'

import { useEffect, useState, useRef } from 'react'
import { Plus, X, Image as ImageIcon } from 'lucide-react'
import { useToast } from './Toast'

/**
 * N12 — Multi-photo uploader (URL-based, max 6 photos).
 * Lets the seller paste image URLs (or upload via storage in future).
 * For MVP: URL paste; storage upload will be a follow-up.
 */
interface MultiPhotoUploaderProps {
  productId: string
  initialPhotos?: { id: string; url: string; position: number }[]
  onChange?: (photos: { id: string; url: string; position: number }[]) => void
}

export function MultiPhotoUploader({ productId, initialPhotos = [], onChange }: MultiPhotoUploaderProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const { showToast } = useToast()
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current || initialPhotos.length > 0) return
    fetchedRef.current = true
    fetch(`/api/products/${productId}/photos`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : { photos: [] })
      .then((data) => {
        setPhotos(data.photos || [])
        onChange?.(data.photos || [])
      })
      .catch(() => {})
  }, [productId, initialPhotos.length, onChange])

  const addPhoto = async () => {
    if (!newUrl.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/products/${productId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: newUrl.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        const next = [...photos, data.photo]
        setPhotos(next)
        onChange?.(next)
        setNewUrl('')
        showToast('Foto agregada ✓', 'success')
      } else {
        showToast(data.error || 'Error al agregar foto', 'error')
      }
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setAdding(false)
    }
  }

  const removePhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/products/${productId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ photo_id: photoId }),
      })
      if (res.ok) {
        const next = photos.filter((p) => p.id !== photoId)
        setPhotos(next)
        onChange?.(next)
        showToast('Foto eliminada', 'info')
      } else {
        const data = await res.json().catch(() => ({}))
        showToast(data.error || 'Error al eliminar', 'error')
      }
    } catch {
      showToast('Error de conexión', 'error')
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(photo.id)}
              aria-label="Eliminar foto"
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X size={12} />
            </button>
            {photo.position === 0 && (
              <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">
                Principal
              </span>
            )}
          </div>
        ))}
        {photos.length < 6 && (
          <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
            <ImageIcon size={24} />
          </div>
        )}
      </div>

      {photos.length < 6 && (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            aria-label="URL de nueva foto"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={addPhoto}
            disabled={adding || !newUrl.trim()}
            className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
          >
            <Plus size={14} />
            {adding ? '...' : 'Añadir'}
          </button>
        </div>
      )}
      <p className="text-xs text-gray-500">
        {photos.length}/6 fotos. La primera es la principal.
      </p>
    </div>
  )
}