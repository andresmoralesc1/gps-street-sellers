'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { useAuthForm } from '@/hooks/useAuthForm'

function RegisterContent() {
  const { error, setError, isLoading, setIsLoading } = useAuthForm()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card variant="elevated" className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Crear Cuenta</h1>
        <p className="text-gray-600 text-center mb-8">
          Regístrate gratis para empezar
        </p>

        <RegisterForm
          isLoading={isLoading}
          error={error}
          setError={setError}
          setIsLoading={setIsLoading}
          initialRole="buyer"
          redirectTo="onboarding"
        />

        <p className="text-center mt-6 text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="text-primary-700 font-semibold px-2 py-1.5 -mx-2 rounded min-h-[36px] inline-flex items-center hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  // RegisterForm doesn't read search params directly, but useAuthForm
  // does (?expired=1), so we still need a Suspense boundary to satisfy
  // Next.js's static-export constraint on useSearchParams consumers.
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
