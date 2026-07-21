'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { validateProduct, hasErrors } from '@/lib/products/validation'

export interface Product {
  id: string
  vendor_id: string
  name: string
  description: string
  price: number
  photo_url: string | null
}

export interface ProductFormSnapshot {
  name: string
  description: string
  price: string
  photoUrl: string
}

export interface ProductValidationErrors {
  name?: string
  description?: string
  price?: string
  photoUrl?: string
}

interface UseProductsPage {
  // data
  vendorId: string | null
  products: Product[]
  loading: boolean
  // form state
  showForm: boolean
  editingId: string | null
  formName: string
  formDescription: string
  formPrice: string
  formPhotoUrl: string
  formSaving: boolean
  formError: string
  formSuccess: string
  fieldErrors: ProductValidationErrors
  touched: Record<string, boolean>
  initialFormSnapshot: ProductFormSnapshot | null
  // delete
  deleteId: string | null
  deleteError: string
  // discard confirm
  confirmDiscardOpen: boolean
  // derived
  isFormDirty: boolean
  // form setters
  setFormName: (v: string) => void
  setFormDescription: (v: string) => void
  setFormPrice: (v: string) => void
  setFormPhotoUrl: (v: string) => void
  setShowForm: (b: boolean) => void
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  // actions
  revalidate: () => ProductValidationErrors
  handleAdd: () => Promise<void>
  handleEdit: (productId: string) => Promise<void>
  handleDelete: () => Promise<void>
  startEdit: (product: Product) => void
  resetForm: () => void
  tryCloseForm: () => void
  tryGoBack: () => void
  discardChanges: () => void
  setDeleteId: (id: string | null) => void
  setConfirmDiscardOpen: (b: boolean) => void
}

/**
 * All state + side effects for the seller /products page:
 *  - fetches vendor id and product list (with defensive shape accept for
 *    an in-flight API deploy — see /api/vendors/me response shapes)
 *  - owns the add/edit form state (name/description/price/photoUrl +
 *    per-field validation + touched tracking)
 *  - exposes actions: handleAdd/handleEdit/handleDelete with optimistic
 *    updates, plus the discard-changes flow that gates the back button
 *    and form-close when there are unsaved edits
 *  - registers a beforeunload guard while the form is dirty so refresh /
 *    tab-close doesn't silently lose data
 */
export function useProductsPage(): UseProductsPage {
  const router = useRouter()
  const user = useStore((s) => s.user)

  // data
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formPhotoUrl, setFormPhotoUrl] = useState('')
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ProductValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<ProductFormSnapshot | null>(null)

  // delete + discard
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  // Load vendorId + products on mount.
  useEffect(() => {
    if (user?.role !== 'seller') {
      // Seller-only page. Role is immutable post-register, so redirect
      // non-sellers to the public map. If they need a seller account,
      // they must register a new one.
      router.push('/map')
      return
    }

    let cancelled = false
    fetch('/api/vendors/me', { credentials: 'include' })
      // B-032 fix: 401 = session expired. Other errors surface a generic
      // message. Previously r.json() could parse an HTML error page and
      // leave loading=true forever.
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 401) router.push('/login')
          if (!cancelled) setLoading(false)
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (cancelled || !data) return
        const list = data.vendors ?? (data.vendor ? [data.vendor] : [])
        const firstVendor = list[0]
        if (!firstVendor) {
          setLoading(false)
          return
        }
        setVendorId(firstVendor.id)
        return fetch(`/api/products?vendorId=${firstVendor.id}`, { credentials: 'include' })
      })
      .then((r) => r?.json())
      .then((data) => {
        if (cancelled) return
        if (data?.products) setProducts(data.products)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.role, router])

  const resetForm = useCallback(() => {
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormPhotoUrl('')
    setShowForm(false)
    setEditingId(null)
    setFieldErrors({})
    setTouched({})
  }, [])

  // True if the user has typed something that hasn't been saved.
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
    return Boolean(
      formName.trim() || formDescription.trim() || formPrice.trim() || formPhotoUrl.trim()
    )
  }, [showForm, initialFormSnapshot, formName, formDescription, formPrice, formPhotoUrl])

  // Warn before tab close / refresh if there are unsaved changes.
  useEffect(() => {
    if (!isFormDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isFormDirty])

  // Re-validate against the live state. Called on blur and on submit.
  // Returns the error map so the caller can block submit.
  const revalidate = useCallback(() => {
    const errs = validateProduct({
      name: formName,
      description: formDescription,
      price: formPrice,
      photoUrl: formPhotoUrl,
    })
    setFieldErrors(errs)
    return errs
  }, [formName, formDescription, formPrice, formPhotoUrl])

  const handleAdd = useCallback(async () => {
    if (!vendorId) return
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
  }, [vendorId, formName, formDescription, formPrice, formPhotoUrl, revalidate, resetForm])

  const handleEdit = useCallback(
    async (productId: string) => {
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
          setProducts((prev) => prev.map((p) => (p.id === productId ? data.product : p)))
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
    },
    [formName, formDescription, formPrice, formPhotoUrl, revalidate, resetForm]
  )

  const handleDelete = useCallback(async () => {
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
  }, [deleteId])

  const startEdit = useCallback((product: Product) => {
    const snap: ProductFormSnapshot = {
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
  }, [])

  // Funnel for "user tries to close the form / navigate back with unsaved edits".
  const tryCloseForm = useCallback(() => {
    if (isFormDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    resetForm()
  }, [isFormDirty, resetForm])

  const tryGoBack = useCallback(() => {
    if (isFormDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    router.push('/dashboard')
  }, [isFormDirty, router])

  const discardChanges = useCallback(() => {
    setConfirmDiscardOpen(false)
    resetForm()
  }, [resetForm])

  return {
    // data
    vendorId,
    products,
    loading,
    // form state
    showForm,
    editingId,
    formName,
    formDescription,
    formPrice,
    formPhotoUrl,
    formSaving,
    formError,
    formSuccess,
    fieldErrors,
    touched,
    initialFormSnapshot,
    // delete + discard
    deleteId,
    deleteError,
    confirmDiscardOpen,
    // derived
    isFormDirty,
    // setters
    setFormName,
    setFormDescription,
    setFormPrice,
    setFormPhotoUrl,
    setShowForm,
    setTouched,
    // actions
    revalidate,
    handleAdd,
    handleEdit,
    handleDelete,
    startEdit,
    resetForm,
    tryCloseForm,
    tryGoBack,
    discardChanges,
    setDeleteId,
    setConfirmDiscardOpen,
  }
}
