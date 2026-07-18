'use client'

import { useState, useEffect } from 'react'
import { Camera, Package, MapPin, MessageCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { VendorFormSlide } from './VendorFormSlide'

const STORAGE_KEY = 'seller_onboarding_done'

const SLIDES = [
  {
    title: '📸 Tu Foto de Perfil',
    description: 'Añade una foto clara de ti o de tu negocio para que los compradores te reconozcan.',
    Icon: Camera,
    tip: 'Usa buena iluminación y asegúrate de que se vea tu rostro o logo.',
  },
  {
    title: '📦 Tus Productos',
    description: 'Agrega los productos que vendes con fotos, precios y descripciones atractivas.',
    Icon: Package,
    tip: 'Mientras más fotos de calidad, más ventas recibirás.',
  },
  {
    title: '📍 Tu Ubicación',
    description: 'Activa la ubicación para que los compradores知道你 cerca puedan encontrarte.',
    Icon: MapPin,
    tip: 'Puedes ajustar tu radio de cobertura desde tu perfil.',
  },
  {
    title: '💬 WhatsApp',
    description: 'Conecta tu WhatsApp para recibir mensajes directos de clientes interesados.',
    Icon: MessageCircle,
    tip: 'Respuesta rápida = más confianza = más ventas.',
  },
]

interface SellerOnboardingSliderProps {
  onComplete: () => void
  onSkip?: () => void
}

export function SellerOnboardingSlider({ onComplete, onSkip }: SellerOnboardingSliderProps) {
  // Index 0 = vendor form (obligatorio). 1..N = slides educativos.
  const TOTAL_STEPS = SLIDES.length + 1
  const [current, setCurrent] = useState(0)
  const [vendorId, setVendorId] = useState<string | null>(null)

  // Check if already completed on mount
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY)
    if (completed === 'true') {
      onComplete()
    }
  }, [onComplete])

  const goNext = () => {
    if (current < TOTAL_STEPS - 1) {
      setCurrent(current + 1)
    } else {
      localStorage.setItem(STORAGE_KEY, 'true')
      onComplete()
    }
  }

  const prev = () => {
    if (current > 0) setCurrent(current - 1)
  }

  const handleFormComplete = (newVendorId: string) => {
    setVendorId(newVendorId)
    goNext()
  }

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    onSkip?.()
  }

  // Render: form primero, luego slides educativos
  if (current === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white px-6">
        <VendorFormSlide onCreated={handleFormComplete} />
      </div>
    )
  }

  const slide = SLIDES[current - 1]
  const IconComponent = slide.Icon

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      {/* Skip button — solo en slides educativos, no en el form */}
      {onSkip && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors"
        >
          Omitir
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto py-12">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
          <IconComponent size={40} className="text-primary-700" strokeWidth={1.5} />
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold text-center mb-3 text-gray-800">
          {slide.title}
        </h1>
        <p className="text-gray-600 text-center mb-6">
          {slide.description}
        </p>

        {/* Tip */}
        <div className="bg-primary/5 rounded-xl px-4 py-3 mb-8">
          <p className="text-sm text-primary-700 font-medium text-center">
            💡 {slide.tip}
          </p>
        </div>

        {/* Illustration placeholder */}
        <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 bg-gray-50">
          <div className="w-full h-full flex items-center justify-center">
            <IconComponent size={64} className="text-gray-300" strokeWidth={1} />
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-8 bg-primary' : 'w-2.5 bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="w-full max-w-sm flex gap-3">
        {current > 0 && (
          <Button
            variant="outline"
            size="lg"
            onClick={prev}
            className="flex-1"
          >
            <ChevronLeft size={20} />
          </Button>
        )}
        <Button
          size="lg"
          onClick={goNext}
          className="flex-1"
        >
          {current === TOTAL_STEPS - 1 ? (
            'Finalizar'
          ) : (
            <span className="flex items-center gap-2">
              Siguiente <ChevronRight size={20} />
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}

// Helper to check if seller onboarding is completed
export function isSellerOnboardingDone(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

// Helper to reset seller onboarding (for testing)
export function resetSellerOnboarding(): void {
  localStorage.removeItem(STORAGE_KEY)
}