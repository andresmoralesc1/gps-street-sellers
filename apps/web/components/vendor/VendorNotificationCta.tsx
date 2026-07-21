'use client'

import { useRouter } from 'next/navigation'
import { Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  isLoggedIn: boolean
}

/**
 * "Notificarme cuando esté cerca" CTA card. Two states: signed in
 * shows the notification button (no handler yet — feature is staged
 * behind user login but the actual subscription flow is not wired in
 * this page), signed out routes to register.
 *
 * Kept as a separate component because it's the only place we touch
 * auth gating outside the header — easier to extend (real subscription,
 * permission prompt) without bloating the parent composer.
 */
export function VendorNotificationCta({ isLoggedIn }: Props) {
  const router = useRouter()

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-gray-600 text-sm mb-3">
        Recibe una notificación cuando este vendedor esté cerca de ti
      </p>
      {isLoggedIn ? (
        <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
          <Bell size={18} />
          Notificarme cuando esté cerca
        </Button>
      ) : (
        <Button
          variant="secondary"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => router.push('/register')}
        >
          <User size={18} />
          Regístrate para notificarte
        </Button>
      )}
    </div>
  )
}
