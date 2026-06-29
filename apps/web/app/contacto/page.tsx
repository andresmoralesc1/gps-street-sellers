import type { Metadata } from 'next'
import { ContactoView } from '@/components/marketing/ContactoView'

export const metadata: Metadata = {
  title: 'Contacto — Habla con el equipo de BarrioTech',
  description:
    '¿Tienes preguntas o sugerencias sobre BarrioTech? Escríbenos y te respondemos en menos de 24 horas. Email, teléfono y formulario en línea.',
  alternates: {
    canonical: 'https://gps.neuralflow.space/contacto',
  },
}

export default function ContactPage() {
  return <ContactoView />
}
