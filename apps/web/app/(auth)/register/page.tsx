'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'

export default function RegisterPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Mock register - siempre succeeds
    setUser({
      id: 'user-new',
      email,
      role: null,
      fullName,
      avatarUrl: '',
    })

    router.push('/role-select')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card variant="elevated" className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Crear Cuenta</h1>
        <p className="text-gray-600 text-center mb-8">
          Regístrate para comenzar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre completo"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Juan Pérez"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <p className="text-accent text-sm">{error}</p>}

          <Button type="submit" className="w-full" size="lg">
            Crear Cuenta
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