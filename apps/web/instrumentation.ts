/**
 * Next.js instrumentation hook. Runs once when the server starts.
 * Used here to boot cron jobs in production.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'production') return
  // Dynamic import to avoid bundling cron code in middleware.
  const { startCrons } = await import('./lib/cron')
  startCrons()
}