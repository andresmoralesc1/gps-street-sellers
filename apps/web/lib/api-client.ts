// API client with silent token refresh.
//
// The auth flow issues two cookies:
//   - `token`        → access JWT, 15-minute lifetime
//   - `refresh-token` → longer-lived JWT, 7-day lifetime, used to mint new ones
//
// Without an active refresh loop, every protected request after 15 minutes
// returns 401 and the user gets logged out mid-session. This module wraps
// `window.fetch` so that any 401 transparently triggers a single refresh
// attempt, retries the original request with the new cookies the server just
// set, and only surfaces the 401 to callers if the refresh itself fails.
//
// We also schedule a periodic refresh so the user never hits a 401 in the
// first place — the cookie `token` is httpOnly so we cannot decode the JWT
// from JS, but we know its max-age from the API, so we refresh well before
// that window elapses.

const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes — well under the 15-min access token TTL
const REFRESH_PATH = '/api/auth/refresh'
const REFRESH_FLAG = '__barriotech_refresh_init__'
const REFRESH_INFLIGHT_FLAG = '__barriotech_refresh_inflight__'

type SessionExpiredHandler = () => void

let onSessionExpired: SessionExpiredHandler | null = null

/**
 * Register a callback invoked when the refresh token itself is rejected
 * (the user is logged out for real). The store uses this to clear `user`
 * and redirect to /login.
 */
export function setSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler
}

async function attemptRefresh(): Promise<boolean> {
  // Coalesce concurrent refresh attempts so a burst of 401s only triggers
  // one /api/auth/refresh call.
  const w = window as unknown as Record<string, boolean | Promise<boolean>>
  if (w[REFRESH_INFLIGHT_FLAG]) {
    return w[REFRESH_INFLIGHT_FLAG] as Promise<boolean>
  }

  const refreshPromise = (async () => {
    try {
      const res = await fetch(REFRESH_PATH, {
        method: 'POST',
        credentials: 'same-origin',
      })
      return res.ok
    } catch {
      return false
    } finally {
      // Release the inflight flag on the next tick so the resolved promise
      // is still returned to all waiters that captured it above.
      setTimeout(() => {
        w[REFRESH_INFLIGHT_FLAG] = false
      }, 0)
    }
  })()
  w[REFRESH_INFLIGHT_FLAG] = refreshPromise
  return refreshPromise
}

/**
 * Patch window.fetch so any 401 on a same-origin API call transparently
 * refreshes the session once and retries the request. Idempotent — safe
 * to call multiple times.
 */
export function initApiClient(): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as Record<string, unknown>
  if (w[REFRESH_FLAG]) return
  w[REFRESH_FLAG] = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Don't intercept the refresh call itself — it must report a real status.
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url
    const isRefreshCall = url.includes(REFRESH_PATH)
    const isAuthCall = url.includes('/api/auth/')
    const isAuthLoginOrRegister = isAuthCall && !isRefreshCall
    // Only intercept API requests; pass through static assets and SSE streams untouched.
    const isApiCall = url.includes('/api/')

    // First attempt.
    let response = await originalFetch(input, init)

    // Only same-origin API calls benefit from the refresh-retry dance.
    const shouldRetry =
      !isRefreshCall &&
      isApiCall &&
      !isAuthLoginOrRegister &&
      response.status === 401

    if (!shouldRetry) {
      return response
    }

    // Try a silent refresh.
    const refreshed = await attemptRefresh()
    if (!refreshed) {
      // Real session expiry — notify the store and let the caller see the 401.
      try {
        onSessionExpired?.()
      } catch {
        /* listener errors must not break the response chain */
      }
      return response
    }

    // Retry the original request. The browser will send the freshly-set
    // cookies automatically because we pass through the same credentials.
    return originalFetch(input, init)
  }

  // Proactive refresh loop: keeps the session warm so the user never
  // hits a 401 mid-action. Fires once immediately, then every 10 min.
  const tick = () => {
    void attemptRefresh().then((ok) => {
      if (!ok) {
        try {
          onSessionExpired?.()
        } catch {
          /* see above */
        }
      }
    })
  }
  // Kick off after a short delay so we don't race with the initial page load.
  const initialDelay = 30 * 1000
  setTimeout(tick, initialDelay)
  setInterval(tick, REFRESH_INTERVAL_MS)
}