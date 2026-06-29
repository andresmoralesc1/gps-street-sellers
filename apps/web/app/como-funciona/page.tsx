'use client'

import Link from 'next/link'
import { MapPin, Store, Bell, ShieldCheck, Smartphone, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const BUYER_STEPS = [
  {
    icon: MapPin,
    title: '1. Abre el mapa',
    body: 'Al entrar, ves los vendedores activos cerca tuyo. El mapa se actualiza en tiempo real — si alguien se mueve, lo ves.',
  },
  {
    icon: Store,
    title: '2. Toca un pin',
    body: 'Cada vendedor tiene su foto, su carrito, lo que vende hoy, calificación de otros compradores y distancia exacta.',
  },
  {
    icon: Bell,
    title: '3. Recibe avisos',
    body: 'Marca favoritos y te avisamos cuando estén cerca o cuando tengan productos nuevos.',
  },
]

const SELLER_STEPS = [
  {
    icon: Smartphone,
    title: '1. Crea tu perfil',
    body: 'Foto tuya, foto de tu carrito, qué vendes. Toma 2 minutos.',
  },
  {
    icon: MapPin,
    title: '2. Activa tu ubicación',
    body: 'La app comparte tu GPS mientras estés vendiendo. Apagas cuando terminas.',
  },
  {
    icon: TrendingUp,
    title: '3. Aparece destacado',
    body: 'Paga una sponsorship semanal o mensual y aparece primero en el mapa de tu zona. Más vistos = más ventas.',
  },
]

export default function ComoFuncionaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Cómo funciona BarrioTech</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          La forma más fácil de encontrar vendedores informales cerca tuyo — y la
          forma más fácil para ellos de conseguir más clientes.
        </p>
      </header>

      {/* Para compradores */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Si quieres comprar</h2>
          <p className="text-gray-600">Tres pasos y listo.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {BUYER_STEPS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/map">
            <Button size="lg">Abrir el mapa</Button>
          </Link>
        </div>
      </section>

      {/* Para vendedores */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Si quieres vender</h2>
          <p className="text-gray-600">Más visibilidad = más ventas.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {SELLER_STEPS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-8 bg-primary-50 border border-primary-200 rounded-2xl p-6">
          <h3 className="font-bold text-primary-900 mb-2">Destaca tu negocio</h3>
          <p className="text-primary-800 mb-4">
            Por <strong>COP $20.000/semana</strong> o <strong>$60.000/mes</strong> apareces primero
            en los mapas y búsquedas de tu zona. Pin dorado con ⭐ para que los clientes
            te identifiquen al instante.
          </p>
          <Link href="/register">
            <Button variant="secondary">Crear cuenta de vendedor</Button>
          </Link>
        </div>
      </section>

      {/* Privacidad */}
      <section className="bg-gray-50 rounded-2xl p-8 text-center">
        <ShieldCheck size={40} className="mx-auto text-gray-400 mb-3" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Tu privacidad importa</h2>
        <p className="text-gray-600 max-w-xl mx-auto mb-4">
          Solo compartes tu ubicación cuando estás activamente vendiendo.
          Cumplimos con la Ley 1581/2012 de Protección de Datos Personales de Colombia.
        </p>
        <Link href="/privacidad" className="text-orange-600 hover:underline font-medium">
          Leer política de tratamiento de datos →
        </Link>
      </section>
    </div>
  )
}