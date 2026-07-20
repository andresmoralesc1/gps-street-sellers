'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useToast } from './Toast'

/**
 * N11 — Business hours.
 * Lets the seller pick a daily time window and days; we auto-toggle them as
 * "active" during those times so they don't have to remember.
 */
interface BusinessHoursProps {
  vendorId: string
}

const DAYS = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mié' },
  { key: 'thu', label: 'Jue' },
  { key: 'fri', label: 'Vie' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
] as const

type DayKey = typeof DAYS[number]['key']

export function BusinessHours({ vendorId }: BusinessHoursProps) {
  const [enabled, setEnabled] = useState(false)
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('18:00')
  const [days, setDays] = useState<DayKey[]>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}/business-hours`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.hours) {
          setEnabled(data.hours.business_hours_enabled ?? false)
          if (data.hours.business_hours_start) setStart(data.hours.business_hours_start.slice(0, 5))
          if (data.hours.business_hours_end) setEnd(data.hours.business_hours_end.slice(0, 5))
          if (Array.isArray(data.hours.business_days) && data.hours.business_days.length > 0) {
            setDays(data.hours.business_days.filter((d: string) => DAYS.some((x) => x.key === d)))
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [vendorId])

  const toggleDay = (day: DayKey) => {
    setDays((cur) => cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/vendors/${vendorId}/business-hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled, start, end, days }),
      })
      if (res.ok) {
        showToast('Horario guardado ✓', 'success')
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Error al guardar', 'error')
      }
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card variant="outlined" className="p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card variant="outlined" className="p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
          <Clock size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Horario automático</h3>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                aria-label="Activar horario automático"
              />
              <div className="relative w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Te activamos y desactivamos automáticamente
          </p>

          {enabled && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  aria-label="Hora de inicio"
                />
                <span className="text-gray-500 text-sm">a</span>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  aria-label="Hora de fin"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {DAYS.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleDay(day.key)}
                    aria-pressed={days.includes(day.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      days.includes(day.key)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar horario'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}