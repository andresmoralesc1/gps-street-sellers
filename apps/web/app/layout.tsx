import type { Metadata } from 'next'
import { Providers } from './providers'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { CookieBanner } from '@/components/CookieBanner'
import './globals.css'

export const metadata: Metadata = {
  title: 'BarrioTech',
  description: 'Conecta con vendedores informales cercanos a ti en Colombia',
  keywords: ['vendedores', 'comida callejera', 'Colombia', 'barrio', 'tienda', 'comprar'],
  authors: [{ name: 'BarrioTech' }],
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BarrioTech',
  },
  openGraph: {
    title: 'BarrioTech',
    description: 'Encuentra vendedores informales cerca de ti en Colombia',
    type: 'website',
    locale: 'es_CO',
    siteName: 'BarrioTech',
  },
  other: {
    'theme-color': '#F97316',
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-background-cream min-h-screen flex flex-col">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}
