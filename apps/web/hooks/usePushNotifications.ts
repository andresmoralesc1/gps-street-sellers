'use client'

import { useEffect, useRef, useState } from 'react'
import { clientLog } from '@/lib/client-logger'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray as Uint8Array
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setPermission(Notification.permission)
  }, [])

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator)) {
      clientLog.warn('Service workers not supported')
      return
    }

    if (!VAPID_PUBLIC_KEY) {
      clientLog.warn('VAPID_PUBLIC_KEY not configured')
      return
    }

    setLoading(true)

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
      swRegistration.current = registration

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      })

      // Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(subscription.toJSON()),
      })

      if (res.ok) {
        setSubscribed(true)
        setPermission('granted')
      }
    } catch (err) {
      console.error('Push subscription error:', err)
    }

    setLoading(false)
  }

  const unsubscribe = async () => {
    if (!swRegistration.current) return

    try {
      const sub = await swRegistration.current.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
    } catch (err) {
      console.error('Unsubscribe error:', err)
    }

    setSubscribed(false)
  }

  return {
    permission,
    subscribed,
    loading,
    subscribeToPush,
    unsubscribe,
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator && Boolean(VAPID_PUBLIC_KEY),
  }
}
