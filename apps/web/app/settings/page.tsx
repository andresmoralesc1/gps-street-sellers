'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { useStore } from '@/store/useStore'

export default function SettingsPage() {
  const router = useRouter()
  const user = useStore((s) => s.user)
  const setUser = useStore((s) => s.setUser)
  const pushNotifications = useStore((s) => s.pushNotificationsEnabled)
  const setPushNotifications = useStore((s) => s.setPushNotifications)
  const proximityNotifications = useStore((s) => s.proximityNotificationsEnabled)
  const setProximityNotifications = useStore((s) => s.setProximityNotifications)

  const handleLogout = () => {
    setUser(null)
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold">Configuración</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Perfil */}
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h3 className="font-semibold text-lg">{user?.fullName || 'Usuario'}</h3>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mt-1">
                {user?.role === 'buyer' ? 'Comprador' : 'Vendedor'}
              </span>
            </div>
          </div>
        </Card>

        {/* Notificaciones */}
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-3">🔔 Notificaciones</h3>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">Notificaciones push</span>
            <Toggle
              enabled={pushNotifications}
              onChange={setPushNotifications}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">Notificaciones de proximidad</span>
            <Toggle
              enabled={proximityNotifications}
              onChange={setProximityNotifications}
            />
          </div>
        </Card>

        {/* Privacidad */}
        <Card variant="outlined" className="p-4">
          <h3 className="font-semibold mb-3">🔒 Privacidad</h3>
          <p className="text-gray-600 text-sm mb-3">
            Cómo usamos tu información
          </p>
          <Button variant="ghost" className="w-full">
            Ver política de privacidad
          </Button>
        </Card>

        {/* Misc */}
        <Card variant="outlined" className="p-4">
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between py-2 text-gray-700">
              <span>🌐 Idioma</span>
              <span>Español →</span>
            </button>
            <button className="w-full flex items-center justify-between py-2 text-gray-700">
              <span>📱 Versión</span>
              <span className="text-gray-500">1.0.0</span>
            </button>
          </div>
        </Card>

        {/* Cerrar sesión */}
        <Button
          variant="outline"
          className="w-full text-accent border-accent hover:bg-accent hover:text-white"
          onClick={handleLogout}
        >
          Cerrar Sesión
        </Button>
      </div>

      {/* Bottom Nav */}
      <nav className="bg-white border-t flex justify-around py-3">
        <Link href="/map" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <span className="text-2xl">🗺️</span>
          <span className="text-xs">Mapa</span>
        </Link>
        <Link href="/favorites" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <span className="text-2xl">❤️</span>
          <span className="text-xs">Favoritos</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center text-primary">
          <span className="text-2xl">⚙️</span>
          <span className="text-xs">Ajustes</span>
        </Link>
      </nav>
    </div>
  )
}
