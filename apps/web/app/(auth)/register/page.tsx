'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, Store } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'
import { CityInput } from '@/components/ui/CityInput'
import type { UserRole } from '@/lib/core/types'

type AccountType = UserRole | null

export default function RegisterPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const [fullName, setFullName] = useState('')
  // Single contact field — user types either an email or a phone number,
  // and we detect which one it is before sending to the backend. They can
  // ALSO fill the other field if they want both — at least one is required.
  const [contact, setContact] = useState('')
  const [altContact, setAltContact] = useState('')
  const [cityId, setCityId] = useState('')
  const [password, setPassword] = useState('')
  // Single-step signup: user picks buyer/seller right here in the form.
  const [accountType, setAccountType] = useState<AccountType>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Heuristic to decide which input is the primary identifier — the first
  // non-empty one. The backend re-detects on its end, this just helps us
  // show the right placeholder/hint.
  const isContactEmail = contact.includes('@')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!fullName || !password) {
      setError('Por favor completa tu nombre y contraseña')
      setIsLoading(false)
      return
    }

    if (!contact && !altContact) {
      setError('Necesitas al menos un email o un teléfono para registrarte')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setIsLoading(false)
      return
    }

    if (!accountType) {
      setError('Elige si quieres comprar o vender')
      setIsLoading(false)
      return
    }

    // Ley 1581/2012 art. 9 — consent must be explicit and informed.
    if (!acceptedTerms || !acceptedPrivacy) {
      setError('Debes aceptar los Términos y la Política de Tratamiento de Datos Personales para continuar.')
      setIsLoading(false)
      return
    }

    // Build the payload — backend will normalize + detect email vs phone.
    // We send both fields if the user filled both; backend accepts either.
    const payload: Record<string, unknown> = {
      password,
      name: fullName,
      cityId,
      role: accountType,
      acceptedTerms,
      acceptedPrivacy,
    }
    if (contact.includes('@')) {
      payload.email = contact
      if (altContact) payload.phone = altContact
    } else {
      payload.phone = contact
      if (altContact.includes('@')) payload.email = altContact
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrarse')
        setIsLoading(false)
        return
      }

      setUser(data.user)
      if (data.user.role === 'seller') {
        router.push('/onboarding')
      } else {
        router.push('/map')
      }
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
          {/* Single-step role picker — 2 visible cards, buyer/seller. */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">¿Qué quieres hacer?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType('buyer')}
                aria-pressed={accountType === 'buyer'}
                className={clsx(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  accountType === 'buyer'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <ShoppingCart
                  className={clsx(
                    'w-8 h-8',
                    accountType === 'buyer' ? 'text-primary' : 'text-gray-400'
                  )}
                />
                <span className="text-sm font-semibold">Comprar</span>
                <span className="text-xs text-gray-500 text-center leading-tight">
                  Encontrar vendedores cerca
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('seller')}
                aria-pressed={accountType === 'seller'}
                className={clsx(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  accountType === 'seller'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <Store
                  className={clsx(
                    'w-8 h-8',
                    accountType === 'seller' ? 'text-primary' : 'text-gray-400'
                  )}
                />
                <span className="text-sm font-semibold">Vender</span>
                <span className="text-xs text-gray-500 text-center leading-tight">
                  Publicar mis productos
                </span>
              </button>
            </div>
          </div>

          <Input
            label="Nombre completo"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Pérez"
            disabled={isLoading}
            required
          />

          {/* Single contact field: user types email OR phone, backend detects. */}
          <Input
            label="Email o teléfono"
            type={isContactEmail ? 'email' : 'tel'}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="tu@email.com o 300 123 4567"
            disabled={isLoading}
            required
          />
          <p className="text-xs text-gray-500 -mt-2">
            Necesitas al menos uno. Si quieres, agrega el otro abajo.
          </p>

          {/* Optional alt contact — only show if user filled the first one. */}
          {contact && (
            <Input
              label={isContactEmail ? 'Teléfono (opcional)' : 'Email (opcional)'}
              type={isContactEmail ? 'tel' : 'email'}
              value={altContact}
              onChange={(e) => setAltContact(e.target.value)}
              placeholder={isContactEmail ? '300 123 4567' : 'tu@email.com'}
              disabled={isLoading}
            />
          )}

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

          {/* Ley 1581/2012 — explicit, informed consent. */}
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