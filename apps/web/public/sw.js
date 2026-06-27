// BarrioTech Service Worker
// Handles push notifications and background sync

const CACHE_NAME = 'barriotech-v1'
const OFFLINE_URL = '/'

// Install event — cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/map',
        '/manifest.json',
      ])
    })
  )
  self.skipWaiting()
})

// Activate event — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Push notification event
self.addEventListener('push', (event) => {
  let data = {
    title: 'BarrioTech',
    body: 'Tienes una nueva notificación',
    icon: '/logo-avatar.png',
    badge: '/favicon.svg',
    url: '/',
  }

  try {
    if (event.data) {
      const payload = event.data.json()
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        url: payload.url || data.url,
      }
    }
  } catch (e) {
    // Use defaults
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url },
    vibrate: [200, 100, 200],
    tag: 'gps-notification',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'close', title: 'Cerrar' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click — open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  if (event.action === 'close') return

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          client.focus()
          return
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url)
    })
  )
})

// Fetch event — network first, cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline: try cache
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline', { status: 503 })
        })
      })
  )
})
