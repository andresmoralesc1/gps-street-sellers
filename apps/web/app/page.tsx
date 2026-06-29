'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Users, TrendingUp, Star, ArrowRight, Clock, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getActiveVendors } from '@/lib/mockData'
import { useEffect, useState } from 'react'

// Photos from Pexels (Colombian street food / market scenes)
const HERO_PHOTO = '/hero.jpg'
const STEPS_PHOTOS = [
  'https://images.pexels.com/photos/8824105/pexels-photo-8824105.jpeg?auto=compress&w=600', // encuentra: persona con mapa
  'https://images.pexels.com/photos/37348090/pexels-photo-37348090.jpeg?auto=compress&w=600', // ordena: vendedor ambulante con piñas
  'https://images.pexels.com/photos/5677994/pexels-photo-5677994.jpeg?auto=compress&w=600', // recibe: frutas en mesa de madera
]

const Heart = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
)

const FEATURES_BUYERS = [
  { icon: MapPin, title: 'GPS en tiempo real', desc: 'Ve vendedores activos en el mapa y encuentra los más cercanos', color: 'bg-orange-100 text-orange-600' },
  { icon: Heart, title: 'Favoritos', desc: 'Guarda tus vendedores preferidos y recibe alertas cuando estén activos', color: 'bg-red-100 text-red-500' },
  { icon: Star, title: 'Reseñas verificadas', desc: 'Lee opiniones reales de otros compradores antes de pedir', color: 'bg-yellow-100 text-yellow-600' },
]
const FEATURES_VENDORS = [
  { icon: TrendingUp, title: 'Más visibilidad', desc: 'Aparece en el mapa para miles de compradores cerca de ti', color: 'bg-blue-100 text-blue-600' },
  { icon: Clock, title: 'Gestiona tu tiempo', desc: 'Activa o desactiva tu ubicación cuando quieras trabajar', color: 'bg-green-100 text-green-600' },
  { icon: Shield, title: 'Sin comisiones', desc: 'Sin cobros por aparecer en el mapa. Tú controlas tu negocio', color: 'bg-purple-100 text-purple-600' },
]

const FAQ_ITEMS = [] // removed from home

// ponytail: inline icons to avoid extra deps
const ShoppingBag = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)
const Truck = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </svg>
)

export default function HomePage() {
  const activeVendors = getActiveVendors()
  const [stats, setStats] = useState({ vendors: 0, cities: 0 })

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => setStats({ vendors: d.activeVendors, cities: d.activeCities }))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Hero */}
      <section className="relative min-h-[580px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_PHOTO} alt="Vendedores callejeros Colombia" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/85 via-gray-900/60 to-transparent" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-20 w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/90 text-sm font-medium">
                {stats.vendors > 0 ? `${stats.vendors} vendedores activos` : 'Vendedores activos'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              El sabor de tu barrio,
              <br />
              <span className="text-secondary-light">ahora en tu celular.</span>
            </h1>
            <p className="text-lg text-white/80 mb-8">
              Descubre vendedores informales cerca de ti. Comida, frutas, artesanías y más — en tiempo real.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/map">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl w-full sm:w-auto">
                  <MapPin size={20} className="mr-2" />
                  Ver mapa en vivo
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                  <Zap size={20} className="mr-2" />
                  Soy vendedor
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Wave */}
        <div className="absolute -bottom-1 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 80L60 68.3C120 57 240 34 360 25.7C480 17.3 600 23.7 720 31.7C840 39.7 960 49.3 1080 49.3C1200 49.3 1320 39.7 1380 34.7L1440 30V80H0Z" fill="#FFFBEB" />
          </svg>
        </div>
      </section>


      {/* Cómo funciona */}
      <section className="py-16 px-4 bg-[#FFFBEB]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-3">
            ¿Cómo funciona?
          </h2>
          <p className="text-center text-gray-500 mb-12">Tres pasos para encontrar lo que necesitas</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: 1, icon: MapPin, title: 'Encuentra', desc: 'Busca por categoría o explora el mapa para descubrir vendedores cerca de ti.', photo: STEPS_PHOTOS[0] },
              { step: 2, icon: ShoppingBag, title: 'Ordena', desc: 'Contacta al vendedor directamente y realiza tu pedido.', photo: STEPS_PHOTOS[1] },
              { step: 3, icon: Truck, title: 'Recibe', desc: 'Sigue al vendedor y recibe tu pedido fresco y a tiempo.', photo: STEPS_PHOTOS[2] },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow">
                <div className="h-40 relative">
                  <img src={item.photo} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">{item.step}</div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para compradores */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Para compradores</h2>
              <p className="text-gray-500 text-sm">La mejor experiencia de compra en tu barrio</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES_BUYERS.map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-5 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${f.color}`}>
                  <f.icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para vendedores */}
      <section className="py-16 px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Para vendedores</h2>
              <p className="text-gray-500 text-sm">Haz crecer tu negocio sin pagar comisiones</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES_VENDORS.map((f) => (
              <div key={f.title} className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${f.color}`}>
                  <f.icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sé el primero */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-8 md:p-12 text-center">
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-600">Lanzamiento 2026 · Colombia</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
              Tu barrio todavía no está en el mapa.
            </h2>
            <p className="text-gray-500 mb-8 max-w-lg mx-auto text-base">
              {stats.cities > 0 || stats.vendors > 0
                ? `Ya somos ${stats.cities} ciudad${stats.cities !== 1 ? 'es' : ''} · ${stats.vendors} vendedor${stats.vendors !== 1 ? 'es' : ''} activo${stats.vendors !== 1 ? 's' : ''}. ¡Sé el primero en tu barrio!`
                : 'Tu barrio todavía no está en el mapa. Si te registras hoy, eres el primer vendedor de tu ciudad en la app.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register?role=seller">
                <Button size="lg" className="bg-primary hover:bg-primary-700">
                  <MapPin size={18} className="mr-2" />
                  Quiero ser vendedor
                </Button>
              </Link>
              <Link href="/register?role=buyer">
                <Button variant="outline" size="lg" className="border-orange-200 text-primary hover:bg-orange-50">
                  Explorar como comprador
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-gray-400">
              100% gratis · Sin comisiones · Sin número mínimo de pedidos
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}