'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useStore } from '@/store/useStore'
import { SellerOnboardingSlider } from './components/SellerOnboardingSlider'

const BUYER_SLIDES = [
  {
    title: 'Encuentra vendedores cerca de ti',
    description: 'Explora un mapa interactivo con todos los vendedores activos en tu zona.',
    image: 'https://images.pexels.com/photos/8824105/pexels-photo-8824105.jpeg?auto=compress&w=800',
  },
  {
    title: 'Mira productos y precios',
    description: 'Navega el catálogo de cada vendedor, mira fotos y decide qué quieres pedir.',
    image: 'https://images.pexels.com/photos/37348090/pexels-photo-37348090.jpeg?auto=compress&w=800',
  },
  {
    title: 'Contáctalos directo',
    description: 'Escríbeles por WhatsApp o teléfono — sin intermediarios, sin pagos en la app.',
    image: 'https://images.pexels.com/photos/5677994/pexels-photo-5677994.jpeg?auto=compress&w=800',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const user = useStore((s) => s.user)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNext = () => {
    if (step < BUYER_SLIDES.length - 1) {
      setStep(step + 1)
    } else {
      router.push('/login')
    }
  }

  const handleSellerComplete = () => {
    if (user?.role === 'seller') {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  const handleSellerSkip = () => {
    router.push('/login')
  }

  // Show seller onboarding if user is a seller
  if (mounted && user?.role === 'seller') {
    return (
      <SellerOnboardingSlider
        onComplete={handleSellerComplete}
        onSkip={handleSellerSkip}
      />
    )
  }

  // Buyer onboarding (original)
  const slide = BUYER_SLIDES[step]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="text-center max-w-sm mx-auto flex-1 flex flex-col items-center justify-center py-12">
        <div className="w-full h-64 rounded-2xl overflow-hidden mb-8 shadow-lg">
          <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
        </div>
        <h1 className="text-3xl font-bold mb-4">{slide.title}</h1>
        <p className="text-gray-500 text-lg">{slide.description}</p>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mb-8">
        {BUYER_SLIDES.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === step ? 'bg-primary' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-sm">
        <Button className="w-full" size="lg" onClick={handleNext}>
          {step < BUYER_SLIDES.length - 1 ? (
            <span className="flex items-center gap-2">
              Siguiente <ChevronRight size={20} />
            </span>
          ) : (
            'Comenzar'
          )}
        </Button>
        {step < BUYER_SLIDES.length - 1 && (
          <button
            className="w-full text-center text-sm text-gray-400 mt-3 hover:text-gray-600"
            onClick={() => router.push('/login')}
          >
            Omitir
          </button>
        )}
      </div>
    </div>
  )
}
