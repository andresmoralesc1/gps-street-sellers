/**
 * Next.js instrumentation hook (Next.js 15+ API).
 *
 * Runs once when the server starts. Two responsibilities:
 *   1. Boot cron jobs in production.
 *   2. Register SIGTERM/SIGINT handlers that gracefully close the pg pool
 *      and stop cron intervals — PM2 sends SIGINT first (kill_timeout 8s),
 *      then SIGKILL if the process is still alive.
 *
 * Sentry init lives here too (not in sentry.server.config.ts) — that's the
 * Next.js 15+ / @sentry/nextjs 10+ way. Separate config files are
 * deprecated. We no-op when SENTRY_DSN isn't set so dev builds work
 * without a Sentry account.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NODE_ENV === 'production') {
      const { startCrons } = await import('./lib/cron')
      const { registerShutdownHandlers, registerShutdownHook } = await import('./lib/shutdown')
      const { stopCrons } = await import('./lib/cron')

      startCrons()
      registerShutdownHook({ name: 'cron-stop', fn: () => stopCrons() })

      try {
        const dbModule: { default?: { end?: () => Promise<void> } } = await import('@/lib/db')
        const pool = dbModule.default
        if (pool && typeof pool.end === 'function') {
          registerShutdownHook({
            name: 'pg-pool-end',
            fn: async () => {
              await pool.end!()
            },
          })
        }
      } catch (err) {
        console.warn('[shutdown] could not register pg-pool-end hook:', err)
      }

      registerShutdownHandlers()
    }

    // Sentry server-side init — must run inside register() for Next.js 15+.
    const dsn = process.env.SENTRY_DSN
    if (dsn) {
      const Sentry = await import('@sentry/nextjs')
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        // CRIT-21: pin release so issues in Sentry can be cross-referenced
        // with the git SHA that shipped. Falls back to APP_VERSION (also
        // reported by /api/health) when the CI didn't inject a sha.
        release: process.env.SENTRY_RELEASE
          || process.env.npm_package_version
          || process.env.APP_VERSION
          || undefined,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
      })
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const dsn = process.env.SENTRY_DSN
    if (dsn) {
      const Sentry = await import('@sentry/nextjs')
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        release: process.env.SENTRY_RELEASE
          || process.env.npm_package_version
          || process.env.APP_VERSION
          || undefined,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
      })
    }
  }
}

/**
 * Next.js 15+ calls this for every server-component error. Wire to Sentry
 * so nested React server component errors get captured. Only wired when
 * SENTRY_DSN is set — no-op otherwise.
 */
export async function onRequestError(
  err: unknown,
  request: {
    path: string
    method: string
    headers: Record<string, string | string[] | undefined>
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
    revalidateReason?: 'on-demand' | 'stale' | undefined
    renderSource?:
      | 'react-server-components'
      | 'react-server-components-payload'
      | 'server-rendering'
    renderType?: 'dynamic' | 'dynamic-resolved'
  }
) {
  if (!process.env.SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(err, request, context)
}