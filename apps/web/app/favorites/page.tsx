'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Heart, Trash2, Store, ImageIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/useStore'

interface Favorite {
  id: string
  vendorId: string
  vendorName: string
  productId: string
  productName: string
  price: number
  imageUrl: string | null
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState('')
  const user = useStore((s) => s.user)
  const _hasHydrated = useStore((s) => s._hasHydrated)
  const removeFavorite = useStore((s) => s.removeFavorite)
  const favoriteIds = useStore((s) => s.favoriteIds)

  useEffect(() => {
    // Wait for hydration
    if (!_hasHydrated) return
  }, [_hasHydrated])

  useEffect(() => {
    if (!_hasHydrated || !user) {
      setLoading(false)
      return
    }

    fetch('/api/favorites', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.favorites) {
          setFavorites(data.favorites)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [_hasHydrated, user])

  const handleRemove = useCallback(async (favorite: Favorite) => {
    if (!user) return
    setRemovingId(favorite.id)
    setRemoveError('')
    // Optimistic remove
    setFavorites((prev) => prev.filter((f) => f.id !== favorite.id))
    removeFavorite(favorite.vendorId)
    try {
      const res = await fetch(`/api/favorites?vendorId=${favorite.vendorId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Delete failed')
    } catch {
      // Rollback optimistic remove
      setFavorites((prev) => [favorite, ...prev])
      if (!favoriteIds.includes(favorite.vendorId)) {
        // re-remove from store if it wasn't already re-added
        removeFavorite(favorite.vendorId)
      }
      setRemoveError('No se pudo eliminar. Intenta de nuevo.')
    } finally {
      setRemovingId(null)
    }
  }, [user, removeFavorite, favoriteIds])

  // Show loading while hydrating
  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background-cream">
        <header className="bg-white shadow-sm p-4">
          <h1 className="text-xl font-bold">Mis Favoritos</h1>
        </header>
        <div className="p-4 text-center py-12">
          <Heart size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">Inicia sesión para ver tus favoritos</p>
          <Link href="/login">
            <Button variant="primary">Iniciar Sesión</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-cream pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold">Mis Favoritos</h1>
        <p className="text-sm text-gray-500">
          {favorites.length}/10 productos guardados
        </p>
        {removeError && (
          <p className="text-red-500 text-sm mt-1">{removeError}</p>
        )}
      </header>

      <div className="p-4">
        {favorites.length === 0 ? (
          <Card variant="outlined" className="p-8 text-center">
            <Heart size={48} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold mb-2">No tienes favoritos</h2>
            <p className="text-gray-500 mb-4">
              Guarda productos como favoritos para verlos rápidamente
            </p>
            <Link href="/map">
              <Button>Explorar vendedores</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favorites.map((fav) => (
              <Card key={fav.id} variant="outlined" className="p-3 overflow-hidden">
                {/* Image */}
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {fav.imageUrl ? (
                    <img
                      src={fav.imageUrl}
                      alt={fav.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={32} className="text-gray-300" />
                  )}
                </div>

                {/* Vendor */}
                <div className="flex items-center gap-1 mb-1">
                  <Store size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500 truncate">{fav.vendorName}</span>
                </div>

                {/* Product name */}
                <p className="font-semibold text-sm truncate mb-1">{fav.productName}</p>

                {/* Price */}
                <p className="text-primary font-bold mb-3">
                  ${fav.price.toLocaleString('es-CO')}
                </p>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleRemove(fav)}
                  isLoading={removingId === fav.id}
                >
                  <Trash2 size={14} className="mr-1" />
                  Eliminar
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3">
        <Link href="/map" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span className="text-xs mt-1">Mapa</span>
        </Link>
        <Link href="/favorites" className="flex flex-col items-center text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          <span className="text-xs mt-1">Favoritos</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          <span className="text-xs mt-1">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}
