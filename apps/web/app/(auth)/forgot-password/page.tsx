'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email) {
      setError('Ingresa tu email')
      setIsLoading(false)
      return
    }
    if (!email.includes('@')) {
      setError('Email inválido')
      setIsLoading(false)
      return
    }

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      // Always show success — never reveal whether email exists
      setSubmitted(true)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
        <Card variant="elevated" className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Revisa tu correo</h1>
          <p className="text-gray-600 mb-6">
            Si el email está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            El enlace expira en 1 hora. Si no ves el email, revisa tu carpeta de spam.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft size={16} className="mr-2" />
              Volver a iniciar sesión
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <Card variant="elevated" className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl mb-4">
            <Mail size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¿Olvidaste tu contraseña?</h1>
          <p className="text-gray-500 text-sm">
            Ingresa tu email y te enviaremos un enlace para restablecerla.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            disabled={isLoading}
            autoComplete="email"
          />

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </Button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-primary"
          >
            <ArrowLeft size={14} />
            Volver a iniciar sesión
          </Link>
        </form>
      </Card>
    </div>
  )
}