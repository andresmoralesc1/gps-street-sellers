'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const FAQ_CATEGORIES = {
  general: {
    label: 'General',
    questions: [
      { q: '¿Qué es BarrioTech?', a: 'Es una plataforma que conecta vendedores informales (de comida, frutas, artesanías, ropa y más) con consumidores cercanos, usando geolocalización en tiempo real.' },
      { q: '¿Es gratis?', a: 'Sí. La app es 100% gratuita para compradores y vendedores. No cobramos comisiones ni tarifas de registro.' },
      { q: '¿En qué ciudades está disponible?', a: 'Actualmente cubrimos 10 ciudades de Colombia: Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Cúcuta, Pereira, Ibagué y Manizales. Estamos expandiendo a más ciudades pronto.' },
      { q: '¿Necesito descargar una app?', a: 'Puedes usar BarrioTech desde cualquier navegador en tu celular o computador. Próximamente disponible en iOS y Android.' },
    ],
  },
  buyers: {
    label: 'Para compradores',
    questions: [
      { q: '¿Cómo encuentro vendedores cercanos?', a: 'Abre el mapa, permite el acceso a tu ubicación y automáticamente verás vendedores activos cerca de ti. Puedes filtrar por categoría (comida, frutas, bebidas, etc.) y distancia.' },
      { q: '¿Cómo realizo un pedido?', a: 'Una vez que encuentras un vendedor que te interesa, puedes contactarlo directamente a través de la app para hacer tu pedido. Coordinen entre ustedes la forma de pago y entrega.' },
      { q: '¿Cómo dejo una reseña?', a: 'Después de recibir tu pedido, puedes calificar al vendedor con estrellas y dejar un comentario desde la página de perfil del vendedor.' },
      { q: '¿Puedo guardar vendedores favoritos?', a: 'Sí. Puedes marcar hasta 10 vendedores como favoritos para recibir alertas cuando estén activos cerca de ti.' },
    ],
  },
  sellers: {
    label: 'Para vendedores',
    questions: [
      { q: '¿Cómo me registro como vendedor?', a: 'Regístrate en la app, selecciona "Soy vendedor" durante el registro, completa tu perfil (nombre del negocio, categoría, descripción) y comienza a aparecer en el mapa.' },
      { q: '¿Cómo activo mi ubicación en el mapa?', a: 'En tu dashboard de vendedor hay un toggle de "Activo/Inactivo". Cuando estás atendiendo, actívalo y los compradores podrán verte en el mapa en tiempo real.' },
      { q: '¿Cuánto cuesta aparecer en el mapa?', a: 'Nada. Es completamente gratis. No cobramos comisiones, ni tarifas mensuales, ni porcentajes sobre tus ventas.' },
      { q: '¿Cómo funcionan las reseñas?', a: 'Los compradores pueden calificarte con 1-5 estrellas y dejar un comentario. Tu calificación promedio aparece en tu perfil público. Mantén una buena atención para atraer más clientes.' },
      { q: '¿Puedo tener más de un negocio?', a: 'Por ahora cada cuenta permite un negocio. Estamos trabajando en soporte multi-negocio para futuras versiones.' },
    ],
  },
  privacy: {
    label: 'Privacidad y seguridad',
    questions: [
      { q: '¿Qué datos compartes con terceros?', a: 'No vendemos tus datos. Compartimos únicamente tu información de contacto y ubicación cuando realizas un pedido con el vendedor correspondiente.' },
      { q: '¿Cómo protegen mi ubicación?', a: 'Tu ubicación solo se comparte cuando decides contactarte con un vendedor. Puedes desactivar el acceso a tu ubicación desde los ajustes de tu navegador o dispositivo en cualquier momento.' },
      { q: '¿Qué pasa si un vendedor me molesta?', a: 'Puedes bloquear y reportar vendedores desde su perfil. Tomamos muy en serio el acoso y revisaremos la cuenta del vendedor reportado.' },
    ],
  },
}

export function FaqView() {
  const [activeTab, setActiveTab] = useState<keyof typeof FAQ_CATEGORIES>('general')
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)

  const category = FAQ_CATEGORIES[activeTab]

  return (
    <div className="min-h-screen bg-background-cream">

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Preguntas Frecuentes</h1>
          <p className="text-gray-500">Encuentra respuestas a las dudas más comunes</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
          {Object.entries(FAQ_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key as keyof typeof FAQ_CATEGORIES); setOpenQuestion(null) }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {category.questions.map((item, i) => {
            const id = `${activeTab}-${i}`
            return (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-card">
                <button
                  onClick={() => setOpenQuestion(openQuestion === id ? null : id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <span className="pr-4">{item.q}</span>
                  <ChevronRight size={18} className={`text-gray-400 flex-shrink-0 transition-transform ${openQuestion === id ? 'rotate-90' : ''}`} />
                </button>
                {openQuestion === id && (
                  <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed">{item.a}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Still have questions */}
        <div className="mt-12 text-center bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8">
          <h3 className="text-lg font-bold text-gray-800 mb-2">¿No encontraste tu respuesta?</h3>
          <p className="text-gray-500 mb-4 text-sm">Estamos para ayudarte. Contáctanos y te respondemos en menos de 24 horas.</p>
          <Link href="/contacto"><Button>Contactar soporte</Button></Link>
        </div>
      </div>
    </div>
  )
}
