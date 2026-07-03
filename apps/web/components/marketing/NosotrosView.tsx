'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, Globe, MapPin, Users, BarChart3, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const TEAM = [
  {
    name: 'Andrés Morales',
    role: 'Fundador y CEO',
    photo: '/andres.png',
    bio: 'Estratega en automatización y desarrollo de productos. Dedicado a construir la infraestructura tecnológica que empodera al comercio informal en toda Colombia.',
    web: 'https://andresmorales.com.co/',
    linkedin: 'https://www.linkedin.com/in/andresmoralesc1',
    isPlaceholder: false,
  },
  // Roles that we're actively recruiting for. These render as muted
  // "we're hiring" cards so the page doesn't feel like a one-person project
  // but also doesn't make up names. Drop entries as people join.
  {
    name: '¿Te sumas al equipo?',
    role: 'CTO / Co-founder',
    photo: null,
    bio: 'Buscamos un(a) co-founder técnico con experiencia en mobile-first products, geolocalización y escalabilidad. Equity + rol de liderazgo desde el día 1.',
    web: 'mailto:hola@barriotech.com',
    linkedin: 'https://www.linkedin.com/in/andresmoralesc1',
    isPlaceholder: true,
  },
]

const VALUES = [
  { icon: Heart, title: 'Comunidad primero', desc: 'Cada decisión que tomamos busca beneficiar a los vendedores y compradores de nuestros barrios.' },
  { icon: Globe, title: 'Conexión real', desc: 'Creemos en la tecnología como herramienta para crear vínculos humanos genuinos, no para reemplazarlos.' },
  { icon: MapPin, title: 'Local y cercano', desc: 'Apoyamos la economía local y creemos que los mejores productos están en tu propio barrio.' },
  { icon: Users, title: 'Sin exclusiones', desc: 'Accesible para todos. No importa si tienes un carrito o un puesto fijo — tu negocio merece ser encontrado.' },
]

const PILLARS = [
  { icon: Globe, title: 'Visión Nacional', desc: 'Infraestructura escalable que integra vendedores desde las grandes metrópolis hasta áreas de alta dispersión —donde la informalidad alcanza el 83% y la necesidad de visibilidad es aún mayor.' },
  { icon: Sparkles, title: 'Red de Publicidad Híbrida', desc: 'El vendedor monetiza su espacio físico y su presencia digital, ganando por visibilidad y por ventas.' },
  { icon: Users, title: 'Inclusión Tecnológica', desc: 'Herramientas intuitivas con iconos visuales y interfaces gamificadas, diseñadas para cerrar la brecha digital en cualquier sector urbano o rural de Colombia.' },
  { icon: BarChart3, title: 'Ecosistema de Datos', desc: 'Insights de comportamiento y ubicación que conectan el consumo informal con el desarrollo urbano sostenible a nivel país.' },
]

export function NosotrosView() {
  return (
    <div className="min-h-screen bg-background-cream">
      {/* Hero */}
      <section className="relative py-12 px-4 bg-gradient-to-br from-primary via-primary-600 to-secondary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-48 h-48 bg-secondary rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Conectando barrios, creando comunidad
          </h1>
          <p className="text-white/90 text-base max-w-2xl mx-auto leading-relaxed">
            BarrioTech nació de una creencia simple: los vendedores informales de Colombia merecen ser encontrados. Somos la plataforma que los conecta con las personas que están a solo unos pasos de distancia.
          </p>
        </div>
      </section>

      {/* Nuestra misión — side by side */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Text */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Nuestra misión</h2>
              <div className="bg-orange-50 border-l-4 border-primary rounded-r-2xl p-6 mb-6">
                <p className="text-gray-700 text-lg leading-relaxed italic">
                  Democratizar el acceso a la tecnología y a canales publicitarios de alto impacto para los vendedores informales en toda Colombia. Convertimos carritos y puestos de calle en nodos de publicidad física y puntos de venta digitales, otorgando a los vendedores de cualquier región una fuente de ingresos adicional y a las marcas nacionales un canal de comunicación único con su audiencia en el corazón del barrio.
                </p>
              </div>
              <p className="text-gray-600">
                En Colombia hay más de <strong>13,2 millones</strong> de vendedores informales — el <strong>55,1%</strong> de la fuerza laboral nacional. BarrioTech existe para que ninguno se quede sin ser encontrado.
              </p>
            </div>
            {/* Image — vertical */}
            <div className="relative w-full max-w-[320px] mx-auto md:mx-0 aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
              <img src="/nosotros.jpg" alt="Vendedor en la calle" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Pilares compactos */}
      <section className="py-16 px-4 bg-background-cream">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-8 text-center">Nuestros pilares estratégicos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="bg-white rounded-xl p-4 shadow-card text-center">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <p.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-bold text-gray-800 text-sm mb-1">{p.title}</h3>
                <p className="text-gray-500 text-xs leading-tight">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valores compactos */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-8 text-center">Nuestros valores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-background-cream rounded-xl p-4 shadow-card text-center">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <v.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-bold text-gray-800 text-sm mb-1">{v.title}</h3>
                <p className="text-gray-500 text-xs leading-tight">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipo */}
      <section className="py-16 px-4 bg-background-cream">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 text-center">El equipo</h2>
          <p className="text-gray-500 text-sm text-center mb-10 max-w-md mx-auto">
            Hoy somos un equipo pequeño. Estamos buscando personas apasionadas para construir BarrioTech juntos.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className={`bg-white rounded-2xl p-6 shadow-card text-center ${member.isPlaceholder ? 'border-2 border-dashed border-primary/30' : ''}`}
              >
                <div className="relative w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 ring-4 ring-primary/20 shadow-lg bg-orange-100">
                  {member.photo ? (
                    <Image src={member.photo} alt={member.name} fill className="object-cover" sizes="128px" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <Users size={40} className="text-primary" />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">{member.name}</h3>
                <p className={`font-medium text-sm mb-3 ${member.isPlaceholder ? 'text-primary' : 'text-primary'}`}>{member.role}</p>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{member.bio}</p>
                <div className="flex justify-center gap-4 text-sm">
                  <a
                    href={member.web}
                    target={member.web.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-gray-600 hover:text-primary transition-colors"
                  >
                    <Globe size={14} />
                    {member.isPlaceholder ? 'Escríbenos' : 'Web'}
                  </a>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-gray-600 hover:text-primary transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">¿Quieres hacer parte de la revolución?</h2>
          <p className="text-gray-400 mb-8">Únete como vendedor o contribuye al proyecto. Estamos siempre buscando personas apasionadas.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button className="bg-gradient-to-b from-primary to-primary-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                Registrarme como vendedor
              </Button>
            </Link>
            <Link href="/contacto">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Contactarnos
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
