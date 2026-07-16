'use client'

import { MapContainer, TileLayer, Circle, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

interface Cell {
  lat: number
  lng: number
  count: number
}

interface Props {
  cells: Cell[]
}

/**
 * Inner heatmap component — client-only.
 * Renders circles with opacity proportional to visit count.
 * No external heatmap plugin needed; CircleMarker with opacity is good enough.
 */
export default function LocationHeatMapInner({ cells }: Props) {
  if (cells.length === 0) return null

  // Center on weighted centroid
  const totalCount = cells.reduce((s, c) => s + c.count, 0)
  const center: [number, number] = [
    cells.reduce((s, c) => s + c.lat * c.count, 0) / totalCount,
    cells.reduce((s, c) => s + c.lng * c.count, 0) / totalCount,
  ]
  const maxCount = Math.max(...cells.map((c) => c.count))

  return (
    <div className="h-48 rounded-lg overflow-hidden">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cells.map((cell, idx) => {
          const intensity = cell.count / maxCount
          return (
            <Circle
              key={idx}
              center={[cell.lat, cell.lng]}
              radius={150 + intensity * 200}
              pathOptions={{
                color: '#7c3aed',
                fillColor: '#a855f7',
                fillOpacity: 0.2 + intensity * 0.4,
                weight: 1,
              }}
            />
          )
        })}
      </MapContainer>
    </div>
  )
}