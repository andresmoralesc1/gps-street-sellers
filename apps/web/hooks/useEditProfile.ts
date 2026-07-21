'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import type { VendorCategory, VehicleType } from '@/lib/core/types'

/**
 * Owns the edit-profile page lifecycle. Hydrates vendorId from
 * /api/vendors/me (accepts both the new list shape and the legacy single
 * vendor shape from c84a990 split). Persists via PATCH /api/vendors/me
 * with camelCase keys — the clientToDb mapper silently drops snake_case,
 * so the call site must use the exact keys below.
 *
 * Geo mode handling: when switching to 'battery', we capture the current
 * geolocation as the zone center. If geolocation is denied/unavailable,
 * we still save the mode and let the server keep the previous center.
 */
export function useEditProfile() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [vendorId, setVendorId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<VendorCategory>('comida')
  const [phone, setPhone] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('')
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')

  const [geoMode, setGeoMode] = useState<'precise' | 'battery'>('precise')
  const [geoZoneRadiusM, setGeoZoneRadiusM] = useState<number>(500)

  useEffect(() => {
    if (user?.role !== 'seller') {
      router.push('/map')
      return
    }

    let cancelled = false

    async function loadProfile() {
      try {
        const meRes = await fetch('/api/vendors/me', { credentials: 'include' })
        const meData = await meRes.json()
        const list = meData.vendors ?? (meData.vendor ? [meData.vendor] : [])
        const firstVendor = list[0]
        if (!firstVendor) {
          if (!cancelled) setLoading(false)
          return
        }
        if (cancelled) return
        setVendorId(firstVendor.id)
        if (firstVendor.geoMode === 'battery' || firstVendor.geoMode === 'precise') {
          setGeoMode(firstVendor.geoMode)
        }
        if (typeof firstVendor.geoZoneRadiusM === 'number') {
          setGeoZoneRadiusM(firstVendor.geoZoneRadiusM)
        }

        const vendorRes = await fetch(`/api/vendors/${firstVendor.id}`, {
          credentials: 'include',
        })
        const vendorData = await vendorRes.json()
        if (cancelled) return
        if (vendorData?.vendor) {
          setName(vendorData.vendor.name || '')
          setDescription(vendorData.vendor.description || '')
          setCategory(vendorData.vendor.category || 'comida')
          setPhone(vendorData.vendor.phone || '')
          setPhotoUrl(vendorData.vendor.photoUrl || '')
          setVehicleType(vendorData.vendor.vehicleType ?? '')
          setVehiclePhotoUrl(vendorData.vendor.vehiclePhotoUrl || '')
        }
      } catch {
        /* network error — fall through to loading=false */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
  }, [router, user?.role])

  const handleSave = useCallback(async () => {
    if (!vendorId) return
    setSaving(true)
    setError('')

    try {
      let geoZoneLat: number | undefined
      let geoZoneLng: number | undefined

      if (geoMode === 'battery') {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            resolve(null)
            return
          }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p),
            () => resolve(null),
            { timeout: 5000, maximumAge: 60_000 }
          )
        })
        if (pos) {
          geoZoneLat = pos.coords.latitude
          geoZoneLng = pos.coords.longitude
        }
      }

      const res = await fetch('/api/vendors/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description,
          category,
          phone,
          photoUrl,
          vehicleType: vehicleType || null,
          vehiclePhotoUrl: vehiclePhotoUrl || null,
          geoMode,
          geoZoneRadiusM,
          ...(geoZoneLat !== undefined && { geoZoneLat }),
          ...(geoZoneLng !== undefined && { geoZoneLng }),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }, [
    vendorId, name, description, category, phone, photoUrl,
    vehicleType, vehiclePhotoUrl, geoMode, geoZoneRadiusM, router,
  ])

  return {
    loading,
    saving,
    error,
    vendorId,
    name,
    description,
    category,
    phone,
    photoUrl,
    vehicleType,
    vehiclePhotoUrl,
    geoMode,
    geoZoneRadiusM,
    setName,
    setDescription,
    setCategory,
    setPhone,
    setPhotoUrl,
    setVehicleType,
    setVehiclePhotoUrl,
    setGeoMode,
    setGeoZoneRadiusM,
    handleSave,
  }
}