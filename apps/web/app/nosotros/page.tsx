import type { Metadata } from 'next'
import { NosotrosView } from '@/components/marketing/NosotrosView'

export const metadata: Metadata = {
  title: 'Nosotros — Nuestra misión y equipo',
  description:
    'BarrioTech es la plataforma que conecta compradores con los 13,2 millones de vendedores informales de Colombia. Conoce nuestra misión, valores y equipo.',
  alternates: {
    canonical: 'https://gps.neuralflow.space/nosotros',
  },
  openGraph: {
    title: 'Nosotros — BarrioTech',
    description: 'Conectando barrios, creando comunidad. Conoce al equipo detrás de BarrioTech.',
    images: ['/nosotros.jpg'],
    type: 'website',
    locale: 'es_CO',
  },
}

export default function AboutPage() {
  return <NosotrosView />
}
