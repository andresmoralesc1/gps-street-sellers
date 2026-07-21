/**
 * Browser logger — minimal client-side counterpart to lib/logger.ts (pino).
 *
 * The full pino logger must NEVER be imported from client components — it
 * adds ~50KB to the bundle (see lib/logger.ts JSDoc, "DO NOT import from
 * use client modules"). Client logs should stay in the browser console
 * where the user / developer can read them, but they should be SILENT in
 * production (no per-render warnings spamming real users' DevTools).
 *
 * Behavior:
 *   - dev:  passthrough to console.warn / console.error (visible, useful)
 *   - prod: no-op (set to console.warn stub only when NEXT_PUBLIC_LOG_LEVEL=debug)
 *
 * The 200-byte cost stays out of the critical path because Vite/Next tree-shake
 * the dev branches away in production builds (NODE_ENV is statically replaced).
 *
 * Usage:
 *   import { clientLog } from '@/lib/client-logger'
 *   clientLog.warn('SSE connection error, will auto-reconnect')
 *   clientLog.error('Push subscription error:', err)
 */

const isDev = process.env.NODE_ENV !== 'production'

export const clientLog = {
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args)
  },
}