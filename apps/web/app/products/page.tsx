'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Package, BarChart3, Settings, Edit3, ChevronLeft, Trash2, Plus, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { MultiPhotoUploader } from '@/components/seller/MultiPhotoUploader'
import { useStore } from '@/store/useStore'
import {
  validateProduct,
  hasErrors,
} from '@/lib/products/validation'

interface ProductValidationErrors {
  name?: string
  description?: string
  price?: string
  photoUrl?: string
}

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
  // Per-field validation errors. Re-validated on every keystroke after the
  // first onBlur so the user gets a hint as soon as they leave a field, but
  // doesn't see a red field while they haven't finished typing.
  const [fieldErrors, setFieldErrors] = useState<ProductValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // G: snapshot of the form values when the user opened it (only meaningful
  // in edit mode — in add mode the form starts blank and any non-empty field
  // is by definition "dirty"). Used to compare current values against the
  // snapshot so we can warn before discarding unsaved changes.
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<{
    name: string
    description: string
    price: string
    photoUrl: string
  } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (user?.role !== 'seller') {
      // Seller-only page. Since role is immutable post-register, redirect
      // non-sellers to the public map. If they need a seller account, they
      // must register a new one.
      router.push('/map')
      return
    }

    // Get vendorId from /api/vendors/me.
    // As of commit c84a990 the GET handler returns { vendors: [...] }; pre-split
    // shape was { vendor: {...} }. Defensive: accept both so an unfinished
    // deploy of the API doesn't break the seller UI.
    fetch('/api/vendors/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const list = data.vendors ?? (data.vendor ? [data.vendor] : [])
        const firstVendor = list[0]
        if (!firstVendor) {
          setLoading(false)
          return
        }
        setVendorId(firstVendor.id)

        // Fetch products
        return fetch(`/api/products?vendorId=${firstVendor.id}`, {
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
    setFieldErrors({})
    setTouched({})
  }

  // G: returns true if the user has typed something that hasn't been saved.
  // In add mode: any non-empty field. In edit mode: anything that diverges
  // from the snapshot we captured when startEdit ran.
  const isFormDirty = useMemo(() => {
    if (!showForm) return false
    if (initialFormSnapshot) {
      return (
        formName !== initialFormSnapshot.name ||
        formDescription !== initialFormSnapshot.description ||
        formPrice !== initialFormSnapshot.price ||
        formPhotoUrl !== initialFormSnapshot.photoUrl
      )
    }
    // Add mode — any non-blank field means the user has started typing.
    return Boolean(
      formName.trim() || formDescription.trim() || formPrice.trim() || formPhotoUrl.trim()
    )
  }, [
    showForm,
    initialFormSnapshot,
    formName,
    formDescription,
    formPrice,
    formPhotoUrl,
  ])

  // G: confirmation modal when the user tries to discard unsaved changes
  // (closes the form, navigates back, etc.).
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  // G: warn before tab close / refresh if there are unsaved changes.
  useEffect(() => {
    if (!isFormDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isFormDirty])

  // Re-validate the form against the live state and store the result in
  // `fieldErrors`. Called on blur and on submit. Returns the error map so the
  // caller can act on it (e.g. block submit).
  const revalidate = () => {
    const errs = validateProduct({
      name: formName,
      description: formDescription,
      price: formPrice,
      photoUrl: formPhotoUrl,
    })
    setFieldErrors(errs)
    return errs
  }

  const handleAdd = async () => {
    if (!vendorId) return

    // Inline validation: block submit and surface field-level errors when
    // something's off. Re-runs the same checks as the backend so the user
    // sees the same messages in both places.
    const errs = revalidate()
    setTouched({ name: true, description: true, price: true, photoUrl: true })
    if (hasErrors(errs)) {
      setFormError('Revisa los campos marcados')
      return
    }

    const priceNum = parseFloat(formPrice)
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
          price: priceNum,
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
    // Same inline validation flow as handleAdd — see comment there.
    const errs = revalidate()
    setTouched({ name: true, description: true, price: true, photoUrl: true })
    if (hasErrors(errs)) {
      setFormError('Revisa los campos marcados')
      return
    }

    const priceNum = parseFloat(formPrice)
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
          price: priceNum,
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
    const snap = {
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      photoUrl: product.photo_url || '',
    }
    setFormName(snap.name)
    setFormDescription(snap.description)
    setFormPrice(snap.price)
    setFormPhotoUrl(snap.photoUrl)
    setEditingId(product.id)
    setInitialFormSnapshot(snap)
    setShowForm(true)
  }

  // G: when the user clicks the X on the form or tries to navigate away with
  // unsaved changes, open the confirm-discard modal instead of dropping the
  // data silently. `resetForm` and the back-button guard both funnel through
  // here.
  const tryCloseForm = () => {
    if (isFormDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    resetForm()
  }
  const discardChanges = () => {
    setConfirmDiscardOpen(false)
    resetForm()
  }
  const tryGoBack = () => {
    if (isFormDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    router.push('/dashboard')
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
        <Button variant="ghost" onClick={tryGoBack} aria-label="Volver al dashboard">
          <ChevronLeft size={20} />
        </Button>
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
              <Button variant="ghost" size="sm" onClick={tryCloseForm}>
                <X size={18} />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <Input
                  label="Nombre"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                    if (touched.name) revalidate()
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, name: true }))
                    revalidate()
                  }}
                  placeholder="Ej: Empanada de pollo"
                  aria-invalid={Boolean(touched.name && fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                />
                {touched.name && fieldErrors.name && (
                  <p id="name-error" role="alert" className="text-xs text-red-700 mt-1">
                    {fieldErrors.name}
                  </p>
                )}
              </div>
              <div>
                <Input
                  label="Descripción"
                  value={formDescription}
                  onChange={(e) => {
                    setFormDescription(e.target.value)
                    if (touched.description) revalidate()
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, description: true }))
                    revalidate()
                  }}
                  placeholder="Ej: Rellena con pollo y papa"
                  aria-invalid={Boolean(touched.description && fieldErrors.description)}
                />
                {touched.description && fieldErrors.description && (
                  <p role="alert" className="text-xs text-red-700 mt-1">
                    {fieldErrors.description}
                  </p>
                )}
              </div>
              <div>
                <Input
                  label="Precio (COP)"
                  type="number"
                  value={formPrice}
                  onChange={(e) => {
                    setFormPrice(e.target.value)
                    if (touched.price) revalidate()
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, price: true }))
                    revalidate()
                  }}
                  placeholder="2500"
                  aria-invalid={Boolean(touched.price && fieldErrors.price)}
                />
                {touched.price && fieldErrors.price && (
                  <p role="alert" className="text-xs text-red-700 mt-1">
                    {fieldErrors.price}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Foto (opcional)</label>
                <ImageUpload
                  value={formPhotoUrl}
                  onChange={(v) => {
                    setFormPhotoUrl(v)
                    if (touched.photoUrl) revalidate()
                  }}
                  folder="products"
                />
                {touched.photoUrl && fieldErrors.photoUrl && (
                  <p role="alert" className="text-xs text-red-700 mt-1">
                    {fieldErrors.photoUrl}
                  </p>
                )}
              </div>
              {formError && (
                <div
                  role="alert"
                  className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3"
                >
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div
                  role="status"
                  className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3"
                >
                  {formSuccess}
                </div>
              )}
              <Button
                onClick={() => editingId ? handleEdit(editingId) : handleAdd()}
                disabled={formSaving || hasErrors(fieldErrors)}
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
                    <p className="text-primary-700 font-bold mt-1">
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

      {/* Delete confirmation modal — CRIT audit fix: previously the trash
          button only set deleteId state but no UI rendered a confirmation
          nor invoked handleDelete(), so the action was a silent no-op. */}
      {deleteId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDeleteId(null)}
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
            {deleteError && (
              <div
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 mb-3"
              >
                {deleteError}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteId(null)
                  setDeleteError('')
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleDelete()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav — aria-label avoids landmark-unique violation when
          SiteHeader ("Navegación principal del sitio") is also a <nav>. */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3" aria-label="Navegación de la cuenta">
        <Link href="/dashboard" className="flex flex-col items-center text-gray-400 hover:text-primary-700 transition-colors">
          <BarChart3 size={24} />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>
        <Link href="/products" className="flex flex-col items-center text-primary-700">
          <Package size={24} />
          <span className="text-xs mt-1">Productos</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-gray-400 hover:text-primary-700 transition-colors">
          <Settings size={24} />
          <span className="text-xs mt-1">Ajustes</span>
        </Link>
      </nav>

      {/* G: discard-changes confirmation modal. Shown when the user tries to
          close the form or go back while there are unsaved edits. */}
      {confirmDiscardOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-title"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmDiscardOpen(false)}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDiscardOpen(false)}
              >
                Seguir editando
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={discardChanges}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                Descartar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
