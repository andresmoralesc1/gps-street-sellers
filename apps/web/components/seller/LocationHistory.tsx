'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/**
 * N14 — Location history heatmap.
 * Shows where the vendor has been active in the last 7 days.
 * Renders a Leaflet map with a heat layer (or circle markers as fallback).
 */

// Lazy-load MapContainer only on client.
const HeatMap = dynamic(() => import('./LocationHeatMapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-48 rounded-lg bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-sm text-gray-500">Cargando mapa...</span>
    </div>
  ),
})

interface LocationHistoryProps {
  vendorId: string
}

interface Cell {
  lat: number
  lng: number
  count: number
  lastSeen: string
}

export function LocationHistory({ vendorId }: LocationHistoryProps) {
  const [cells, setCells] = useState<Cell[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}/location-history?days=7`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && Array.isArray(data.cells)) {
          setCells(data.cells)
        } else {
          setError('No hay datos de ubicación')
        }
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [vendorId])

  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
          <MapPin size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 text-sm">Dónde has estado</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {loading
              ? 'Cargando...'
              : error
              ? error
              : cells.length === 0
              ? 'Sin actividad reciente'
              : `${cells.length} zonas visitadas en 7 días`}
          </p>
        </div>
      </div>
      {cells.length > 0 && <HeatMap cells={cells} />}
    </Card>
  )
}