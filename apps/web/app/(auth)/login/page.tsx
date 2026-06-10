'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Mock login - siempre succeeds
    setUser({
      id: 'user-1',
      email,
      role: null,
      fullName: 'Usuario Demo',
      avatarUrl: '',
    })

    router.push('/role-select')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card variant="elevated" className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Bienvenido</h1>
        <p className="text-gray-600 text-center mb-8">
          Ingresa a tu cuenta para continuar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            Iniciar Sesión
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-primary font-semibold">
            Regístrate
          </Link>
        </p>
      </Card>
    </div>
  )
}