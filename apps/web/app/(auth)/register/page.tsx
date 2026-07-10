'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'
import { CityInput } from '@/components/ui/CityInput'

export default function RegisterPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cityId, setCityId] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Por favor ingresa un email válido')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setIsLoading(false)
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10 || (cleanPhone.startsWith('57') && cleanPhone.length < 12)) {
      setError('Ingresa un número de teléfono colombiano válido (10 dígitos)')
      setIsLoading(false)
      return
    }

    // Ley 1581/2012 art. 9 — consent must be explicit and informed.
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Debes aceptar los Términos y la Política de Tratamiento de Datos Personales para continuar.')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: fullName,
          phone: cleanPhone,
          cityId,
          acceptedTerms,
          acceptedPrivacy,
        }),
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
            <CityInput
              value={cityId}
              onChange={setCityId}
              disabled={isLoading}
              placeholder="Busca tu ciudad..."
              rounded="lg"
            />
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

          {/* Ley 1581/2012 — explicit, informed consent. Boxes are unchecked
              by default (pre-checked would violate the law). */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
                required
              />
              <span>
                Acepto los{' '}
                <Link href="/terminos" className="text-primary underline" target="_blank">
                  Términos y Condiciones
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
                required
              />
              <span>
                Acepto la{' '}
                <Link href="/privacidad" className="text-primary underline" target="_blank">
                  Política de Tratamiento de Datos Personales
                </Link>{' '}
                (Ley 1581/2012) y autorizo el tratamiento de mis datos para las
                finalidades descritas allí.
              </span>
            </label>
          </div>

          {error && <p className="text-accent text-sm">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            variant="primary"
            size="lg"
            isLoading={isLoading}
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