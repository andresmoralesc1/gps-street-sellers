'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { TrendingUp, MapPin, BarChart3, Building2, Sparkles, Mail, FileText, Users, Target, Eye, Send, Loader2 } from 'lucide-react'

const PILLARS = [
  {
    icon: MapPin,
    title: 'Red de Micro-logística',
    desc: 'Plataforma de geolocalización que convierte carritos informales en puntos de venta visibles y georreferenciados en tiempo real.',
  },
  {
    icon: TrendingUp,
    title: 'Monetización Híbrida',
    desc: 'El vendedor gana por venta directa y por alquiler de espacio publicitario en su puesto. Doble fuente de ingresos desde un solo lugar.',
  },
  {
    icon: BarChart3,
    title: 'Inteligencia de Datos',
    desc: 'Transformamos la informalidad en un activo de información valioso para el desarrollo urbano y el marketing hiper-local.',
  },
]

const METRICS = [
  { value: '13,2M', label: 'Trabajadores informales en Colombia', source: 'DANE 2026' },
  { value: '55,1%', label: 'De la fuerza laboral nacional', source: 'DANE 2026' },
  { value: '83%', label: 'Informalidad en zonas rurales', source: 'DANE 2026' },
]

const TRACTION = [
  { icon: Sparkles, title: 'Fase actual', desc: 'Desarrollo de WebApp MVP enfocada en validación de geolocalización y experiencia de vendedor.' },
  { icon: Building2, title: 'Modelo de negocio', desc: 'Suscripciones B2B para vendedores y compradores con funciones extra de visibilidad, y red de publicidad hiper-local para marcas nacionales.' },
  { icon: Target, title: 'Visión estratégica', desc: 'Infraestructura escalable diseñada para expandirse de Bogotá a nivel nacional.' },
]

export function InversionistasView() {
  const [form, setForm] = useState({ name: '', email: '', reason: 'Inversor' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: `[Inversionistas] ${form.reason}`,
          message: `Motivo de contacto: ${form.reason}\n\nEnviado desde la página de inversionistas.`,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'No se pudo enviar el mensaje')
      }
      setStatus('sent')
      setForm({ name: '', email: '', reason: 'Inversor' })
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Hero */}
      <section className="relative py-16 md:py-20 px-4 bg-gradient-to-br from-primary via-primary-600 to-secondary overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-48 h-48 bg-secondary rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/15 backdrop-blur text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
            Inversores
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight">
            Transformando la economía informal de Colombia en un ecosistema de datos.
          </h1>
          <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            La primera red de micro-logística y publicidad que conecta a 13,2 millones de vendedores con el mercado digital.
          </p>
          <a
            href="/pitch-deck.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <FileText size={18} />
            Descargar Pitch Deck (PDF)
          </a>
        </div>
      </section>

      {/* El problema */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">El problema</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">
              Una economía entera, invisible para el mercado digital.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-orange-50 border-l-4 border-primary rounded-r-2xl p-6">
              <Eye className="text-primary mb-3" size={28} />
              <h3 className="font-bold text-gray-800 mb-2">Invisibilidad económica</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                El 55,1% de la fuerza laboral en Colombia opera en la informalidad — sin presencia digital, sin métricas, sin acceso a crédito.
              </p>
            </div>
            <div className="bg-orange-50 border-l-4 border-primary rounded-r-2xl p-6">
              <Users className="text-primary mb-3" size={28} />
              <h3 className="font-bold text-gray-800 mb-2">Brecha de mercado</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Millones de micro-vendedores carecen de presencia digital, lo que limita su alcance, su clientela y su rentabilidad diaria.
              </p>
            </div>
            <div className="bg-orange-50 border-l-4 border-primary rounded-r-2xl p-6">
              <Building2 className="text-primary mb-3" size={28} />
              <h3 className="font-bold text-gray-800 mb-2">Desperdicio publicitario</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Las grandes marcas pierden acceso a un canal masivo de comunicación que ocurre diariamente, calle por calle, en toda Colombia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* La solución */}
      <section className="py-16 px-4 bg-background-cream">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">La solución · CalleViva</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">
              Infraestructura tecnológica para el último kilómetro informal.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map((p) => (
              <div key={p.title} className="bg-white rounded-2xl p-6 shadow-card">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <p.icon className="text-primary" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market opportunity — números grandes */}
      <section className="py-16 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">Market opportunity</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
              Un mercado subestimado que está migrando a lo digital.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {METRICS.map((m) => (
              <div key={m.label} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary mb-2">{m.value}</p>
                <p className="text-sm text-white/90 leading-tight mb-1">{m.label}</p>
                <p className="text-xs text-white/50">{m.source}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 max-w-3xl mx-auto text-center">
            <p className="text-white/70 text-sm leading-relaxed">
              <strong className="text-white">TAM:</strong> 13,2 millones de trabajadores informales en Colombia.
              Capacidad de escalabilidad en zonas rurales donde la informalidad llega al 83% — un mercado masivo que apenas comienza su transición digital.
            </p>
          </div>
        </div>
      </section>

      {/* Traction */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">Traction · Status</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">
              Dónde estamos hoy.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TRACTION.map((t) => (
              <div key={t.title} className="bg-background-cream rounded-2xl p-6">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <t.icon className="text-primary" size={20} />
                </div>
                <h3 className="font-bold text-gray-800 mb-2">{t.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 px-4 bg-background-cream">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">Equipo</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">Quién está detrás</h2>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-card text-center">
            <div className="relative w-32 h-32 rounded-full overflow-hidden mx-auto mb-5 ring-4 ring-primary/20 shadow-lg bg-orange-100">
              <Image src="/andres.png" alt="Andrés Morales" fill className="object-cover" sizes="128px" unoptimized />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">Andrés Morales</h3>
            <p className="text-primary font-medium text-sm mb-4">Fundador y CEO</p>
            <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
              Arquitecto de soluciones tecnológicas enfocado en automatización y escalabilidad. Conecto tecnología real con necesidades reales para transformar la base de la pirámide.
            </p>
          </div>
        </div>
      </section>

      {/* Contacto / Inversión */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-primary text-xs font-bold uppercase tracking-wider">Conversemos</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">
              ¿Interesado en invertir o aliarte?
            </h2>
            <p className="text-gray-600 text-sm mt-3">
              Escríbenos y agendamos una llamada de 30 minutos para profundizar.
            </p>
          </div>

          {status === 'sent' ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="text-white" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Mensaje enviado</h3>
              <p className="text-sm text-gray-600 mb-6">
                Te respondemos en menos de 24 horas.
              </p>
              <Button
                onClick={() => setStatus('idle')}
                variant="outline"
                className="border-green-500 text-green-700 hover:bg-green-50"
              >
                Enviar otro mensaje
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-background-cream rounded-2xl p-6 md:p-8 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tu nombre completo"
                  disabled={status === 'sending'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Correo</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@email.com"
                  disabled={status === 'sending'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Motivo</label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  disabled={status === 'sending'}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 bg-white"
                >
                  <option>Inversor</option>
                  <option>Alianza estratégica</option>
                  <option>Vendedor</option>
                  <option>Prensa / medios</option>
                  <option>Otro</option>
                </select>
              </div>

              {status === 'error' && error && (
                <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Enviar mensaje
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center pt-2">
                También puedes escribirnos directamente a{' '}
                <a href="mailto:hola@gpsstreetsellers.com" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                  <Mail size={12} />
                  hola@gpsstreetsellers.com
                </a>
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Fuentes */}
      <section className="py-6 px-4 bg-background-cream border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs text-gray-500">
            <strong>Fuentes:</strong> DANE — Departamento Administrativo Nacional de Estadística (Colombia, 2026). Cifras de informalidad laboral y segmentación rural/urbana.
          </p>
        </div>
      </section>
    </div>
  )
}
