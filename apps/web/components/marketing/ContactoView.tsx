'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, Clock, Send, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

const SUBJECT_OPTIONS = [
  { value: '', label: 'Selecciona un tema' },
  { value: 'Soporte técnico', label: 'Soporte técnico — algo no funciona' },
  { value: 'Cuenta y facturación', label: 'Mi cuenta / facturación' },
  { value: 'Ser vendedor', label: 'Quiero ser vendedor en BarrioTech' },
  { value: 'Prensa y alianzas', label: 'Prensa / alianzas / inversionistas' },
  { value: 'Otro', label: 'Otro tema' },
]

const MAX_MESSAGE_LENGTH = 2000
const MIN_MESSAGE_LENGTH = 10
const EMAIL_INFO = 'info@andresmorales.com.co'
const PHONE_DISPLAY = '+57 324 542 5387'
const PHONE_RAW = '+573245425387'

export function ContactoView() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Honeypot: bots fill every input; real users won't see this field (visually hidden, off-screen).
  const [honeypot, setHoneypot] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: SUBJECT_OPTIONS[0].value,
    message: '',
  })

  const messageTooShort = form.message.length > 0 && form.message.length < MIN_MESSAGE_LENGTH
  const messageTooLong = form.message.length > MAX_MESSAGE_LENGTH
  const canSubmit =
    !loading &&
    form.name.trim() !== '' &&
    form.email.trim() !== '' &&
    form.subject !== '' &&
    form.message.trim().length >= MIN_MESSAGE_LENGTH &&
    form.message.length <= MAX_MESSAGE_LENGTH

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (honeypot) return // bot caught — silently succeed so they don't retry
    if (!canSubmit) return

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subject: form.subject || 'Sin asunto' }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else if (res.status === 429) {
        setError('Has enviado muchos mensajes. Intenta de nuevo en una hora.')
      } else if (res.status === 400) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Revisa los campos e intenta de nuevo.')
      } else {
        setError('No pudimos enviar tu mensaje. Intenta de nuevo en un momento.')
      }
    } catch {
      setError('Error de conexión. Revisa tu internet e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center p-4">
        <Card variant="elevated" className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Mensaje enviado!</h1>
          <p className="text-gray-600 mb-6">
            Te respondemos en menos de 24 horas hábiles. También puedes revisar nuestras{' '}
            <Link href="/preguntas-frecuentes" className="text-primary-700 underline">
              preguntas frecuentes
            </Link>
            .
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/preguntas-frecuentes">
              <Button variant="outline">Ver FAQ</Button>
            </Link>
            <Button onClick={() => window.location.reload()}>Enviar otro</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-cream">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Contáctanos</h1>
          <p className="text-gray-500">
            ¿Tienes preguntas o sugerencias? Estamos aquí para ayudarte.{' '}
            <Link href="/preguntas-frecuentes" className="text-primary-700 underline">
              Revisa primero las FAQ
            </Link>
            .
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Info */}
          <aside className="space-y-6">
            <h2 className="sr-only">Información de contacto</h2>
            <Card variant="outlined" className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail size={20} className="text-primary-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 mb-1">Email</h3>
                  <a
                    href={`mailto:${EMAIL_INFO}`}
                    className="block text-gray-500 text-sm hover:text-primary-700 truncate"
                  >
                    {EMAIL_INFO}
                  </a>
                </div>
              </div>
            </Card>
            <Card variant="outlined" className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone size={20} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Teléfono / WhatsApp</h3>
                  <a
                    href={`https://wa.me/${PHONE_RAW}`}
                    className="block text-gray-500 text-sm hover:text-primary-700"
                  >
                    {PHONE_DISPLAY}
                  </a>
                </div>
              </div>
            </Card>
            <Card variant="outlined" className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Horario de respuesta</h3>
                  <p className="text-gray-500 text-sm">Lunes a Viernes: 8am - 6pm</p>
                  <p className="text-gray-500 text-sm">Sábados: 9am - 1pm</p>
                </div>
              </div>
            </Card>
          </aside>

          {/* Form */}
          <section className="md:col-span-2">
            <Card variant="outlined" className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Envíanos un mensaje</h2>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Honeypot — visually hidden, off-screen, no aria, no tab. Bots fill it; humans don't. */}
                <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                  <label htmlFor="website">Website (déjalo vacío)</label>
                  <input
                    id="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre completo"
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="text-sm font-medium text-gray-700 mb-1.5 block"
                  >
                    Asunto
                  </label>
                  <select
                    id="contact-subject"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white transition-all duration-200 hover:border-stone-300 focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary"
                  >
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="text-sm font-medium text-gray-700 mb-1.5 block"
                  >
                    Mensaje
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    aria-describedby="contact-message-help"
                    aria-invalid={messageTooShort || messageTooLong || undefined}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white transition-all duration-200 hover:border-stone-300 focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary resize-none placeholder:text-stone-400 placeholder:font-normal disabled:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Cuéntanos en qué podemos ayudarte..."
                  />
                  <div
                    id="contact-message-help"
                    className="flex justify-between text-xs mt-1.5"
                  >
                    <span className={messageTooShort ? 'text-accent font-medium' : 'text-gray-500'}>
                      {messageTooShort
                        ? `Mínimo ${MIN_MESSAGE_LENGTH} caracteres`
                        : 'Mínimo 10 caracteres'}
                    </span>
                    <span
                      className={
                        messageTooLong
                          ? 'text-accent font-medium'
                          : form.message.length > MAX_MESSAGE_LENGTH * 0.9
                          ? 'text-amber-600'
                          : 'text-gray-500'
                      }
                    >
                      {form.message.length} / {MAX_MESSAGE_LENGTH}
                    </span>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="text-red-500 text-sm">
                    {error}
                  </p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
                  {loading ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send size={18} className="mr-2" />
                      Enviar mensaje
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}