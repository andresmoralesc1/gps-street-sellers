import type { Metadata } from 'next'
import { InversionistasView } from '@/components/marketing/InversionistasView'

export const metadata: Metadata = {
  title: 'Inversionistas — Oportunidad de mercado en economía informal',
  description:
    'BarrioTech conecta a 13,2 millones de vendedores informales en Colombia. Conoce nuestra propuesta de valor, mercado y plan de negocio para inversores y aliados estratégicos.',
  alternates: {
    canonical: 'https://gps.andresmorales.com.co/inversionistas',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Inversionistas — BarrioTech',
    description:
      'La primera red de micro-logística y publicidad para los 13,2 millones de vendedores informales de Colombia.',
    images: ['/hero.jpg'],
    type: 'website',
    locale: 'es_CO',
  },
}

export default function InversionistasPage() {
  return <InversionistasView />
}
