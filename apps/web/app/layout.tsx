import type { Metadata } from 'next'
import { Providers } from './providers'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { CookieBanner } from '@/components/CookieBanner'
import { OnboardingTour } from '@/components/OnboardingTour'
import { ToastContainer } from '@/components/ui/Toast'
import { UmamiAnalytics } from '@/components/UmamiAnalytics'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://gps.andresmorales.com.co'),
  title: {
    default: 'BarrioTech — Vendedores informales en tu barrio, en tiempo real',
    template: '%s',
  },
  alternates: {
    canonical: '/',
  },
  description: 'Encuentra vendedores informales cerca de ti en Colombia. Comida, frutas, artesanías y más — en tiempo real. Mapa en vivo, GPS, favoritos y reseñas.',
  keywords: ['vendedores informales colombia', 'comida callejera', 'frutas', 'artesanías', 'gps', 'mapa', 'barrio', 'comprar local', 'street food colombia', 'vendedores ambulantes'],
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
    title: 'BarrioTech — Vendedores informales en tu barrio',
    description: 'Encuentra vendedores informales cerca de ti en Colombia. Comida, frutas, artesanías y más — en tiempo real.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'BarrioTech',
    images: [
      {
        url: '/hero.jpg',
        width: 1200,
        height: 630,
        alt: 'BarrioTech — vendedores informales Colombia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BarrioTech — Vendedores en tu barrio',
    description: 'Encuentra vendedores informales cerca de ti en Colombia.',
    images: ['/hero.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'theme-color': '#F97316',
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // JSON-LD structured data for SEO — Organization + WebSite.
  // This makes Google rich results show our logo, name, and search sitelinks.
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BarrioTech',
    url: 'https://gps.andresmorales.com.co',
    logo: 'https://gps.andresmorales.com.co/logo.png',
    description:
      'Plataforma para conectar compradores con vendedores informales en Colombia.',
    sameAs: [
      // Add social profiles here when available
    ],
  }
  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BarrioTech',
    url: 'https://gps.andresmorales.com.co',
    inLanguage: 'es-CO',
  }

  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body className="bg-background-cream min-h-screen flex flex-col">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <CookieBanner />
          <OnboardingTour />
          <ToastContainer />
          <UmamiAnalytics />
        </Providers>
      </body>
    </html>
  )
}
