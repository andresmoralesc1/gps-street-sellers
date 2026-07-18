'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Single source of truth. Each entry has an optional `categoryKey` we group
// by, and an optional `tags` array used by the live search filter.
type FaqItem = { q: string; a: string; tags?: string[] }

const FAQ_CATEGORIES: Record<string, { label: string; emoji: string; questions: FaqItem[] }> = {
  general: {
    label: 'General',
    emoji: '💡',
    questions: [
      {
        q: '¿Qué es BarrioTech?',
        a: 'Es una plataforma que conecta vendedores informales (de comida, frutas, artesanías, ropa y más) con consumidores cercanos, usando geolocalización en tiempo real.',
      },
      {
        q: '¿Es gratis?',
        a: 'Sí. La app es 100% gratuita para compradores y vendedores. No cobramos comisiones ni tarifas de registro. Tampoco hay planes premium ni cobros ocultos.',
        tags: ['cobro', 'costo', 'precio', 'pago', 'commission'],
      },
      {
        q: '¿En qué ciudades está disponible?',
        a: 'Hoy cubrimos 2 ciudades en Colombia. Estamos en plena expansión — puedes ver las ciudades activas en tiempo real dentro del mapa. Si quieres sugerir una nueva ciudad, escríbenos a hola@barriotech.com.',
        tags: ['cobertura', 'ubicación', 'ciudad', 'donde'],
      },
      {
        q: '¿Necesito descargar una app?',
        a: 'No. Puedes usar BarrioTech desde cualquier navegador en tu celular o computador — funciona como una web app optimizada. Próximamente lanzaremos las versiones nativas en iOS y Android.',
        tags: ['app', 'descarga', 'movil', 'ios', 'android'],
      },
    ],
  },
  buyers: {
    label: 'Para compradores',
    emoji: '🛒',
    questions: [
      {
        q: '¿Cómo encuentro vendedores cercanos?',
        a: 'Abre el mapa desde el menú "Explorar", permite el acceso a tu ubicación y automáticamente verás vendedores activos cerca de ti. Puedes filtrar por categoría (comida, frutas, bebidas, etc.) y distancia.',
        tags: ['buscar', 'mapa', 'cerca', 'ubicación', 'gps'],
      },
      {
        q: '¿Cómo realizo un pedido?',
        a: 'Cuando encuentras un vendedor que te interesa, puedes contactarlo directamente por WhatsApp o por el chat interno de la plataforma desde su perfil. Acuerden la forma de pago y entrega directamente — BarrioTech no procesa pagos.',
        tags: ['pedido', 'pedir', 'orden', 'comprar', 'pago'],
      },
      {
        q: '¿Cómo dejo una reseña?',
        a: 'Después de recibir tu pedido, puedes calificar al vendedor con estrellas (1-5) y dejar un comentario desde su página de perfil. Esto ayuda a otros compradores a elegir mejor.',
        tags: ['reseña', 'estrellas', 'calificar', 'review'],
      },
      {
        q: '¿Puedo guardar vendedores favoritos?',
        a: 'Sí. Desde el perfil de cada vendedor puedes marcarlo con el ícono de corazón. Tus favoritos aparecen en una sección dedicada y recibirás alertas cuando estén activos cerca de ti.',
        tags: ['favoritos', 'guardar', 'alerta'],
      },
    ],
  },
  sellers: {
    label: 'Para vendedores',
    emoji: '🥪',
    questions: [
      {
        q: '¿Cómo me registro como vendedor?',
        a: 'Regístrate en la app, selecciona "Soy vendedor" durante el registro, completa tu perfil (nombre del negocio, categoría, descripción, foto) y activa tu ubicación. En menos de 24 horas verificamos tu cuenta y empiezas a aparecer en el mapa.',
        tags: ['registro', 'registrarse', 'vendedor', 'alta'],
      },
      {
        q: '¿Cómo activo mi ubicación en el mapa?',
        a: 'En tu dashboard de vendedor hay un toggle de "Activo/Inactivo". Cuando estés atendiendo, actívalo y los compradores podrán verte en el mapa en tiempo real. Cuando termines tu jornada, desactívalo.',
        tags: ['activar', 'mapa', 'ubicación', 'gps', 'toggle'],
      },
      {
        q: '¿Cuánto cuesta aparecer en el mapa?',
        a: 'Nada. Es completamente gratis. No cobramos comisiones, ni tarifas mensuales, ni porcentajes sobre tus ventas. Tampoco pedimos datos de tarjeta para registrarte.',
        tags: ['costo', 'gratis', 'tarifa', 'comision'],
      },
      {
        q: '¿Cómo funcionan las reseñas?',
        a: 'Los compradores pueden calificarte con 1-5 estrellas y dejar un comentario. Tu calificación promedio aparece en tu perfil público. Las reseñas pueden moderarse si reportan algo que viola las normas.',
        tags: ['reseña', 'estrellas', 'calificacion'],
      },
      {
        q: '¿Necesito algún documento para registrarme?',
        a: 'Solo necesitas tu número de teléfono para verificar tu cuenta. No pedimos RUT, NIT ni documentos formales — sabemos que la mayoría del comercio informal colombiano opera sin ellos. Si más adelante necesitas factura para una marca, te ayudamos.',
        tags: ['documentos', 'kyc', 'identidad', 'verificacion', 'rut', 'nit'],
      },
      {
        q: '¿Puedo tener más de un negocio?',
        a: 'Por ahora cada cuenta permite un solo negocio principal. Estamos trabajando en soporte multi-negocio para la siguiente versión.',
        tags: ['multi', 'negocio', 'cuenta'],
      },
    ],
  },
  privacy: {
    label: 'Privacidad y seguridad',
    emoji: '🔒',
    questions: [
      {
        q: '¿Qué datos comparten con terceros?',
        a: 'No vendemos tus datos. Compartimos tu información de contacto únicamente cuando tú decides iniciar una conversación con un vendedor o comprador. La ubicación se comparte solo durante la sesión activa del mapa.',
        tags: ['datos', 'privacidad', 'terceros', 'compartir'],
      },
      {
        q: '¿Cómo protegen mi ubicación?',
        a: 'Tu ubicación precisa solo se comparte cuando estás activamente viendo el mapa. Puedes desactivar el acceso desde los ajustes de tu navegador o dispositivo en cualquier momento. Nunca almacenamos histórico de ubicaciones.',
        tags: ['ubicación', 'gps', 'privacidad'],
      },
      {
        q: '¿Qué pasa si un vendedor me molesta?',
        a: 'Puedes bloquear y reportar vendedores desde su perfil — el botón aparece claramente. Tomamos muy en serio el acoso y revisaremos la cuenta del vendedor reportado. Para casos urgentes, escríbenos directamente a hola@barriotech.com.',
        tags: ['bloquear', 'reportar', 'acoso', 'seguridad'],
      },
      {
        q: '¿Mis datos están protegidos por la ley colombiana?',
        a: 'Sí. Cumplimos con la Ley 1581 de 2012 (Habeas Data) y el Decreto 1377 de 2013 sobre protección de datos personales en Colombia. Tienes derecho a conocer, actualizar y eliminar tus datos en cualquier momento.',
        tags: ['ley', 'proteccion', 'datos', 'habeas', 'legal'],
      },
    ],
  },
  payments: {
    label: 'Pagos y pedidos',
    emoji: '💳',
    questions: [
      {
        q: '¿BarrioTech procesa pagos?',
        a: 'No. Las transacciones se acuerdan directamente entre comprador y vendedor. Esta decisión la tomamos intencionalmente: el comercio informal colombiano opera mayoritariamente en efectivo o por transferencia inmediata, y agregar una capa de pagos formal generaría fricción y comisiones para el vendedor.',
        tags: ['pago', 'efectivo', 'transferencia', 'mercadopago', 'nequi', 'daviplata'],
      },
      {
        q: '¿Qué hago si tengo un problema con un pedido?',
        a: 'Si tuviste un problema con un vendedor (producto equivocado, mala atención, etc.), primero intenta contactarlo directamente. Si no se resuelve, escríbenos a hola@barriotech.com y mediamo entre las dos partes.',
        tags: ['problema', 'disputa', 'reembolso', 'queja', 'conflicto'],
      },
      {
        q: '¿Puedo pedir un reembolso?',
        a: 'Como BarrioTech no procesa pagos, no podemos emitir reembolsos. Si pagaste por adelantado y tienes un problema, escríbenos y te ayudamos a coordinar una solución con el vendedor.',
        tags: ['reembolso', 'devolucion', 'problema'],
      },
      {
        q: '¿Por qué no hay pagos integrados?',
        a: 'Es una decisión intencional para esta etapa. Procesar pagos requiere certificaciones, manejo de fraude y soporte dedicado — agrega complejidad que no aporta valor cuando el 80% de las transacciones del comercio informal son en efectivo. Cuando escale el volumen, evaluaremos opciones como Nequi y Bre-B.',
        tags: ['nequi', 'bre-b', 'futuro', 'por que'],
      },
    ],
  },
}

type CategoryKey = keyof typeof FAQ_CATEGORIES

export function FaqView() {
  const [activeTab, setActiveTab] = useState<CategoryKey>('general')
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // The result of the live search. When the query is empty, fall back to the
  // selected tab's questions (`null` sentinel). When the query is non-empty,
  // we ALWAYS search across every category — never just the active tab —
  // so the user can find a "reembolso" answer from the Pagos tab while
  // sitting on the General tab.
  const globalMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const hits: { catKey: string; catLabel: string; catEmoji: string; item: FaqItem; index: number }[] = []
    for (const [key, cat] of Object.entries(FAQ_CATEGORIES)) {
      cat.questions.forEach((item, index) => {
        const hit =
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q) ||
          (item.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
        if (hit) hits.push({ catKey: key, catLabel: cat.label, catEmoji: cat.emoji, item, index })
      })
    }
    return hits
  }, [query])

  const category = FAQ_CATEGORIES[activeTab]
  const searchActive = query.trim().length > 0

  return (
    <div className="min-h-screen bg-background-cream">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Preguntas Frecuentes</h1>
          <p className="text-gray-500">Encuentra respuestas a las dudas más comunes</p>
        </div>

        {/* Live search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpenQuestion(null)
            }}
            placeholder="Buscar por palabra clave (ej. reembolso, gratis, ubicación)"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            aria-label="Buscar en preguntas frecuentes"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
          {Object.entries(FAQ_CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key as CategoryKey)
                setOpenQuestion(null)
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === key
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span aria-hidden>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {/* Global search mode: search hits from every category. */}
          {searchActive && globalMatches && globalMatches.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500 text-sm shadow-card">
              No encontramos resultados para <strong>"{query}"</strong>. Prueba con otra palabra o escríbenos a{' '}
              <a href="mailto:hola@barriotech.com" className="text-primary-700 hover:underline">
                hola@barriotech.com
              </a>
              .
            </div>
          )}

          {searchActive && globalMatches && globalMatches.length > 0 && (
            <>
              <p className="text-xs text-gray-500 px-1">
                {globalMatches.length} resultado{globalMatches.length !== 1 ? 's' : ''} en {new Set(globalMatches.map((m) => m.catLabel)).size} categoría{new Set(globalMatches.map((m) => m.catLabel)).size !== 1 ? 's' : ''}
              </p>
              {globalMatches.map((entry) => {
                const id = `search-${entry.catKey}-${entry.index}`
                const isOpen = openQuestion === id
                return (
                  <div key={id} className="bg-white rounded-xl overflow-hidden shadow-card">
                    <div className="bg-primary/5 px-4 py-1.5 text-[11px] font-semibold text-primary-700 uppercase tracking-wider">
                      <span aria-hidden>{entry.catEmoji}</span> {entry.catLabel}
                    </div>
                    <button
                      onClick={() => setOpenQuestion(isOpen ? null : id)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span className="pr-4">{entry.item.q}</span>
                      <ChevronRight size={18} className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
                        {entry.item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Tab mode: render the current tab's questions. */}
          {!searchActive &&
            category.questions.map((item, i) => {
              const id = `${activeTab}-${i}`
              const isOpen = openQuestion === id
              return (
                <div key={id} className="bg-white rounded-xl overflow-hidden shadow-card">
                  <button
                    onClick={() => setOpenQuestion(isOpen ? null : id)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="pr-4">{item.q}</span>
                    <ChevronRight size={18} className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        {/* Still have questions */}
        <div className="mt-12 text-center bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8">
          <h3 className="text-lg font-bold text-gray-800 mb-2">¿No encontraste tu respuesta?</h3>
          <p className="text-gray-500 mb-4 text-sm">Estamos para ayudarte. Te respondemos en menos de 24 horas.</p>
          <Link href="/contacto"><Button>Contactar soporte</Button></Link>
        </div>
      </div>
    </div>
  )
}
