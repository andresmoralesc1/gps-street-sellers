'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, MapPin, Store, Star, Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/store/useStore'
import { CityInput } from '@/components/ui/CityInput'

function AuthPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useStore((s) => s.setUser)

  const [step, setStep] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Register
  const [fullName, setFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cityId, setCityId] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>(
    searchParams.get('role') === 'seller' ? 'seller' : 'buyer'
  )
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  // Live stats for the side panel — pulled from /api/stats on mount.
  // Falls back to 0/0 if the API is unreachable; the panel hides the row
  // in that case so we never show a stale or fake number.
  const [stats, setStats] = useState<{ activeVendors: number; activeCities: number } | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setStats(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const redirectAfterLogin = (user: any) => {
    if (user.role === 'seller') {
      router.push('/dashboard')
    } else {
      router.push('/map')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email || !password) {
      setError('Completa todos los campos')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        setError('Error interpretando respuesta del servidor')
        setIsLoading(false)
        return
      }

      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas')
        setIsLoading(false)
        return
      }

      setUser(data.user)
      if (data.user.role === 'seller') {
        router.push('/dashboard')
      } else {
        router.push('/map')
      }
    } catch {
      setError('Error de conexión')
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!fullName || !regEmail || !regPassword || !phone) {
      setError('Completa todos los campos')
      setIsLoading(false)
      return
    }

    if (!regEmail.includes('@')) {
      setError('Email inválido')
      setIsLoading(false)
      return
    }

    if (regPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setIsLoading(false)
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 7) {
      setError('Número de teléfono inválido')
      setIsLoading(false)
      return
    }

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
          email: regEmail,
          password: regPassword,
          name: fullName,
          phone: cleanPhone,
          cityId,
          role: selectedRole,
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

      setUser(data.user)
      redirectAfterLogin(data.user)
    } catch {
      setError('Error de conexión')
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 overflow-hidden grid grid-cols-1 lg:grid-cols-2 w-full max-w-5xl">
      {/* ── Form column ── */}
      <div className="p-8 sm:p-10">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl mb-4 overflow-hidden">
            <Image
              src="/logo.png"
              alt="BarrioTech"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {step === 'login'
              ? 'Ingresa para buscar vendedores cerca de ti'
              : 'Gratis · Sin comisiones · Sin compromisos'}
          </p>
        </div>

        {/* ── LOGIN ── */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setError('Escríbenos a info@andresmorales.com.co para restablecer tu contraseña. (Función de recuperación estará disponible pronto.)')}
                  className="text-xs text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={isLoading}>
              {isLoading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        )}

        {/* ── REGISTER ── */}
        {step === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('buyer')}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selectedRole === 'buyer'
                    ? 'border-primary bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🛒</div>
                <div className="text-sm font-semibold text-gray-800">Comprador</div>
                <div className="text-xs text-gray-500">Buscar y pedir</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('seller')}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selectedRole === 'seller'
                    ? 'border-primary bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">📍</div>
                <div className="text-sm font-semibold text-gray-800">Vendedor</div>
                <div className="text-xs text-gray-500">Aparecer en el mapa</div>
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="300 123 4567"
                disabled={isLoading}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Ciudad</label>
              <CityInput
                value={cityId}
                onChange={setCityId}
                disabled={isLoading}
                placeholder="Busca tu ciudad..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="space-y-2 pt-2">
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                  required
                />
                <span>
                  Acepto los{' '}
                  <Link href="/terminos" className="text-primary hover:underline" target="_blank">
                    Términos de Servicio
                  </Link>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                  required
                />
                <span>
                  Acepto la{' '}
                  <Link href="/privacidad" className="text-primary hover:underline" target="_blank">
                    Política de Tratamiento de Datos Personales
                  </Link>{' '}
                  (Ley 1581/2012)
                </span>
              </label>
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={isLoading || !acceptedTerms || !acceptedPrivacy}>
              {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>
        )}

        {/* Toggle */}
        <div className="mt-6 text-center">
          {step === 'login' ? (
            <p className="text-gray-600 text-sm">
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => { setStep('register'); setError('') }}
                className="text-primary font-semibold hover:underline"
              >
                Regístrate gratis
              </button>
            </p>
          ) : (
            <p className="text-gray-600 text-sm">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => { setStep('login'); setError('') }}
                className="text-primary font-semibold hover:underline"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </div>
      </div>

      {/* ── Side panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary to-orange-600 p-10 text-white relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-10 w-72 h-72 bg-yellow-300/20 rounded-full blur-3xl" />

        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight mb-3">
            El sabor de tu barrio,<br />ahora en tu celular.
          </h2>
          <p className="text-white/85 text-base leading-relaxed">
            Descubre vendedores informales cerca de ti — comida, frutas, artesanías y más, en tiempo real.
          </p>
        </div>

        <ul className="relative space-y-4 my-8">
          <li className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <div>
              <p className="font-semibold">Mapa en vivo</p>
              <p className="text-sm text-white/80">Vendedores activos en tu barrio al instante</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Store size={20} />
            </div>
            <div>
              <p className="font-semibold">Vendedores verificados</p>
              <p className="text-sm text-white/80">Reseñas reales de compradores como tú</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <p className="font-semibold">Avisos inteligentes</p>
              <p className="text-sm text-white/80">Te avisamos cuando tus favoritos estén cerca</p>
            </div>
          </li>
        </ul>

        {stats && stats.activeVendors > 0 && (
          <div className="relative flex items-center gap-2 text-sm text-white/90">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-yellow-300 text-yellow-300" />
              ))}
            </div>
            <span>
              {stats.activeVendors} vendedor{stats.activeVendors === 1 ? '' : 'es'} activo{stats.activeVendors === 1 ? '' : 's'}
              {stats.activeCities > 0 && ` · ${stats.activeCities} ciud${stats.activeCities === 1 ? 'ad' : 'ades'}`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <Suspense fallback={
        <div className="w-full max-w-md p-8 flex items-center justify-center">
          <p className="text-gray-400">Cargando...</p>
        </div>
      }>
        <AuthPageContent />
      </Suspense>
    </div>
  )
}
