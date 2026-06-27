'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'
import { COLOMBIA_CITIES } from '@/lib/core/constants'

export default function RegisterPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cityId, setCityId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!fullName || !email || !password || !phone) {
      setError('Por favor completa todos los campos')
      setIsLoading(false)
      return
    }

    if (!email.includes('@')) {
      setError('Por favor ingresa un email válido')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setIsLoading(false)
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 7) {
      setError('Ingresa un número de teléfono válido')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: fullName, phone: cleanPhone, cityId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrarse')
        setIsLoading(false)
        return
      }

      // El API ya puso la cookie HttpOnly — usamos los datos del registro
      setUser(data.user)
      router.push('/role-select')
    } catch {
      setError('Error de conexión')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card variant="elevated" className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Crear Cuenta</h1>
        <p className="text-gray-600 text-center mb-8">
          Regístrate gratis para empezar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre completo"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Pérez"
            disabled={isLoading}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            disabled={isLoading}
            required
          />
          <Input
            label="Teléfono"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="300 123 4567"
            disabled={isLoading}
            required
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Ciudad</label>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            >
              <option value="">Selecciona tu ciudad</option>
              {COLOMBIA_CITIES.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} — {city.department}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            required
          />

          {error && <p className="text-accent text-sm">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary font-semibold">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}