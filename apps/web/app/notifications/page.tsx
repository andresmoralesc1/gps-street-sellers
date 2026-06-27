'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { useStore } from '@/store/useStore'

interface Notification {
  id: string
  title: string
  body: string | null
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const user = useStore((s) => s.user)
  const _hasHydrated = useStore((s) => s._hasHydrated)

  useEffect(() => {
    if (!_hasHydrated) return
    if (!user) {
      router.push('/login')
      return
    }

    fetch('/api/notifications', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [_hasHydrated, user, router])

  const markAllRead = async () => {
    await Promise.all(
      notifications
        .filter((n) => !n.read)
        .map((n) =>
          fetch(`/api/notifications/${n.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ read: true }),
          })
        )
    )
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ read: true }),
    })
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (!_hasHydrated || loading) {
    return (
      <div className="min-h-screen bg-background-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-cream">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center gap-4">
        <Link href="/map">
          <Button variant="ghost" size="sm">
            <ChevronLeft size={20} />
          </Button>
        </Link>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Bell size={20} className="text-primary" />
          Notificaciones
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="ml-auto text-sm text-primary font-medium">
            Marcar todas leídas
          </button>
        )}
      </header>

      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No tienes notificaciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  notif.read ? 'border-gray-200' : 'border-primary'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{notif.title}</p>
                    {notif.body && <p className="text-gray-500 text-sm mt-1">{notif.body}</p>}
                    <p className="text-gray-400 text-xs mt-2">
                      {new Date(notif.created_at).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      className="text-primary hover:bg-primary/5 p-1 rounded"
                      title="Marcar como leída"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
