'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Package, BarChart3, Settings, Edit3, ChevronLeft, Trash2, Plus, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { MultiPhotoUploader } from '@/components/seller/MultiPhotoUploader'
import { useStore } from '@/store/useStore'

interface Product {
  id: string
  vendor_id: string
  name: string
  description: string
  price: number
  photo_url: string | null
}

export default function ProductsPage() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formPhotoUrl, setFormPhotoUrl] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (user?.role !== 'seller') {
      router.push('/role-select')
      return
    }

    // Get vendorId from /api/vendors/me
    fetch('/api/vendors/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!data.vendor) {
          setLoading(false)
          return
        }
        setVendorId(data.vendor.id)

        // Fetch products
        return fetch(`/api/products?vendorId=${data.vendor.id}`, {
          credentials: 'include',
        })
      })
      .then((r) => r?.json())
      .then((data) => {
        if (data?.products) {
          setProducts(data.products)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormPhotoUrl('')
    setShowForm(false)
    setEditingId(null)
  }

  const handleAdd = async () => {
    if (!formName || !formPrice || !vendorId) return

    setFormSaving(true)
    setFormError('')
    setFormSuccess('')

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          price: parseFloat(formPrice),
          photo_url: formPhotoUrl || null,
          vendor_id: vendorId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setProducts((prev) => [data.product, ...prev])
        resetForm()
        setFormSuccess('Producto agregado ✅')
        setTimeout(() => setFormSuccess(''), 3000)
      } else {
        const data = await res.json()
        setFormError(data.error || 'Error al guardar')
      }
    } catch {
      setFormError('Error de conexión')
    }
    setFormSaving(false)
  }

  const handleEdit = async (productId: string) => {
    if (!formName || !formPrice) return

    setFormSaving(true)
    setFormError('')
    setFormSuccess('')

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          price: parseFloat(formPrice),
          photo_url: formPhotoUrl || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? data.product : p))
        )
        resetForm()
        setFormSuccess('Cambios guardados ✅')
        setTimeout(() => setFormSuccess(''), 3000)
      } else {
        const data = await res.json()
        setFormError(data.error || 'Error al guardar')
      }
    } catch {
      setFormError('Error de conexión')
    }
    setFormSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/products/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== deleteId))
        setDeleteId(null)
      } else {
        setDeleteError('No se pudo eliminar')
      }
    } catch {
      setDeleteError('Error de conexión')
    }
  }

  const startEdit = (product: Product) => {
    setFormName(product.name)
    setFormDescription(product.description || '')
    setFormPrice(product.price.toString())
    setFormPhotoUrl(product.photo_url || '')
    setEditingId(product.id)
    setShowForm(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  if (!vendorId) {
    return (
      <div className="min-h-screen bg-background-cream pb-20">
        <header className="bg-white shadow-sm p-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost"><ChevronLeft size={20} /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Mis Productos</h1>
          </div>
        </header>
        <div className="p-4">
          <Card variant="outlined" className="p-8 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold mb-2">Sin perfil de vendedor</h2>
            <p className="text-gray-500 mb-4">
              Crea tu perfil en el dashboard para agregar productos
            </p>
            <Link href="/dashboard">
              <Button>Ir al dashboard</Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-cream pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost"><ChevronLeft size={20} /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Mis Productos</h1>
          <p className="text-sm text-gray-500">{products.length} productos</p>
        </div>
      </header>

      <div className="p-4">
        {/* Add/Edit Form */}
        {showForm ? (
          <Card variant="outlined" className="p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                {editingId ? 'Editar producto' : 'Agregar producto'}
              </h3>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-3">
              <Input
                label="Nombre"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Empanada de pollo"
              />
              <Input
                label="Descripción"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ej: Rellena con pollo y papa"
              />
              <Input
                label="Precio (COP)"
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="2500"
              />
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Foto (opcional)</label>
                <ImageUpload
                  value={formPhotoUrl}
                  onChange={setFormPhotoUrl}
                  folder="products"
                />
              </div>
              <Button
                onClick={() => editingId ? handleEdit(editingId) : handleAdd()}
                disabled={formSaving || !formName || !formPrice}
                className="w-full"
              >
                {formSaving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full mb-4"
            onClick={() => setShowForm(true)}
          >
            <Plus size={18} className="mr-2" />
            Agregar producto
          </Button>
        )}

        {/* Products List */}
        {products.length === 0 ? (
          <Card variant="outlined" className="p-8 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-bold mb-2">Sin productos</h2>
            <p className="text-gray-500 mb-4">
              Agrega productos para que los compradores vean qué ofreces
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <Card key={product.id} variant="outlined" className="p-4">
                <div className="flex gap-4">
                  {product.photo_url ? (
                    <img
                      src={product.photo_url}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package size={24} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-gray-500 text-sm line-clamp-1">
                      {product.description || 'Sin descripción'}
                    </p>
                    <p className="text-primary font-bold mt-1">
                      ${product.price.toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(product)}
                    >
                      <Edit3 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(product.id)}
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </div>
                {/* N12: extra photos (collapsed by default for visual cleanliness) */}
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                    📷 Más fotos (hasta 6)
                  </summary>
                  <div className="mt-3">
                    <MultiPhotoUploader productId={product.id} />
                  </div>
                </details>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3">
        <Link href="/dashboard" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <BarChart3 size={24} />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>
        <Link href="/products" className="flex flex-col items-center text-primary">
          <Package size={24} />
          <span className="text-xs mt-1">Productos</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <Settings size={24} />
          <span className="text-xs mt-1">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}
