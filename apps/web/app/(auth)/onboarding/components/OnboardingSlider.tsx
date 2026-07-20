'use client'

import { useState } from 'react'
import { MapPin, ShoppingCart, Heart } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const SLIDES = [
  {
    title: 'Encuentra vendedores cercanos',
    description: 'Descubre vendedores informales cerca de ti en tiempo real',
    Icon: MapPin,
  },
  {
    title: 'Activa tu negocio',
    description: 'Como vendedor, comparte tu ubicación y llega a más clientes',
    Icon: ShoppingCart,
  },
  {
    title: 'Guarda y califica',
    description: 'Guarda tus vendedores favoritos y recibe avisos cuando estén cerca',
    Icon: Heart,
  },
]

interface OnboardingSliderProps {
  onComplete: () => void
}

export function OnboardingSlider({ onComplete }: OnboardingSliderProps) {
  const [current, setCurrent] = useState(0)

  const next = () => {
    if (current < SLIDES.length - 1) {
      setCurrent(current + 1)
    } else {
      onComplete()
    }
  }

  const slide = SLIDES[current]
  const IconComponent = slide.Icon

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors"
      >
        Omitir
      </button>

      <div className="mb-8">
        <IconComponent size={80} className="text-primary-700" strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl font-bold text-center mb-4 text-gray-800">
        {slide.title}
      </h1>
      <p className="text-lg text-gray-600 text-center mb-12">
        {slide.description}
      </p>

      {/* Dots */}
      <div className="flex gap-2 mb-12">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i === current ? 'bg-primary' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <Button onClick={next} size="lg">
        {current === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'}
      </Button>
    </div>
  )
}
