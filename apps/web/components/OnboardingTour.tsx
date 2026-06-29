'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X, MapPin, Heart, Bell, ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'barriotech_onboarding_done'
const STEPS = [
  {
    icon: MapPin,
    title: 'Encuentra vendedores cerca tuyo',
    body: 'El mapa te muestra vendedores activos en tu barrio en tiempo real.',
    target: '/map',
  },
  {
    icon: Heart,
    title: 'Guarda tus favoritos',
    body: 'Marca los vendedores que más te gusten para encontrarlos rápido.',
    target: '/favorites',
  },
  {
    icon: Bell,
    title: 'Recibe notificaciones',
    body: 'Te avisamos cuando tus favoritos estén cerca o tengan algo nuevo.',
    target: '/settings',
  },
]

/**
 * 3-step onboarding tour for new buyers.
 * Shown once on first visit to a buyer page. Dismissed permanently after
 * the user completes all steps or hits Skip.
 */
export function OnboardingTour() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Only show on buyer pages (map, favorites, settings) and only once
    if (
      typeof window === 'undefined' ||
      localStorage.getItem(STORAGE_KEY) === '1'
    ) return

    // Wait until user has been on the map at least once (so they have context)
    const buyerPaths = ['/map', '/favorites', '/settings']
    if (!buyerPaths.some((p) => pathname?.startsWith(p))) return

    const timer = setTimeout(() => setOpen(true), 1500)
    return () => clearTimeout(timer)
  }, [pathname])

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      finish()
    }
  }

  const skip = () => finish()

  const goToStep = () => {
    finish()
    router.push(STEPS[step].target)
  }

  if (!open) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={skip}
          aria-label="Cerrar tour"
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1"
        >
          <X size={20} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
            <Icon size={40} className="text-amber-600" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
          {current.title}
        </h2>
        <p className="text-center text-gray-600 mb-6">
          {current.body}
        </p>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-8 bg-amber-500' : 'w-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={goToStep}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-amber-500 text-amber-600 font-semibold hover:bg-amber-50 transition-colors"
          >
            Ir a {current.target.split('/')[1] || 'mapa'}
          </button>
          <button
            onClick={next}
            className="flex-1 px-4 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-1"
          >
            {isLast ? 'Listo' : 'Siguiente'}
            {!isLast && <ArrowRight size={18} />}
          </button>
        </div>

        <button
          onClick={skip}
          className="block mx-auto mt-3 text-sm text-gray-400 hover:text-gray-600"
        >
          Omitir tour
        </button>
      </div>
    </div>
  )
}