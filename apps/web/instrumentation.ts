/**
 * Next.js instrumentation hook. Runs once when the server starts.
 * Used here to:
 *   1. Boot cron jobs in production.
 *   2. Register SIGTERM/SIGINT handlers that gracefully close the pg pool
 *      and stop cron intervals — PM2 sends SIGINT first (kill_timeout 8s),
 *      then SIGKILL if the process is still alive.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'production') return

  const { startCrons } = await import('./lib/cron')
  const { registerShutdownHandlers, registerShutdownHook } = await import('./lib/shutdown')
  const { stopCrons } = await import('./lib/cron')

  startCrons()
  // When PM2 sends SIGTERM/SIGINT, stop the cron intervals first so no
  // new DB queries are fired while we're trying to close the pool.
  registerShutdownHook({ name: 'cron-stop', fn: () => stopCrons() })

  // Then close the pg pool last (after all cron queries have settled).
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