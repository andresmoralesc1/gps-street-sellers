'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Mail, Phone, Clock, Send, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError('Error al enviar. Intenta de nuevo.')
      }
    } catch {
      setError('Error de conexión')
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
          <p className="text-gray-600 mb-6">Gracias por contactarnos. Te responderemos en menos de 24 horas.</p>
          <Link href="/"><Button>Volver al inicio</Button></Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-cream">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Contáctanos</h1>
          <p className="text-gray-500">¿Tienes preguntas o sugerencias? Estamos aquí para ayudarte.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Info */}
          <div className="space-y-6">
            <Card variant="outlined" className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Email</h3>
                  <p className="text-gray-500 text-sm">hola@barriotech.com</p>
                  <p className="text-gray-500 text-sm">soporte@barriotech.com</p>
                </div>
              </div>
            </Card>
            <Card variant="outlined" className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Teléfono</h3>
                  <p className="text-gray-500 text-sm">+57 300 123 4567</p>
                  <p className="text-gray-400 text-xs mt-1">Lun - Vie, 8am - 6pm</p>
                </div>
              </div>
            </Card>
            <Card variant="outlined" className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Horario</h3>
                  <p className="text-gray-500 text-sm">Lunes a Viernes: 8am - 6pm</p>
                  <p className="text-gray-500 text-sm">Sábados: 9am - 1pm</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <Card variant="outlined" className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre completo</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Asunto</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="¿Sobre qué nos escribes?"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Mensaje</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Cuéntanos en qué podemos ayudarte..."
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : (
                    <>
                      <Send size={18} className="mr-2" />
                      Enviar mensaje
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
