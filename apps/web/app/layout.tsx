import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'GPS Street Sellers',
  description: 'Conecta con vendedores informales cercanos a ti',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-background-cream min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}