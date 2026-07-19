/**
 * Pino structured logger — CRIT-11.
 *
 * Centraliza el logging en un solo módulo para que:
 *   - Producción (NODE_ENV=production) emita JSON line-delimited, parseable
 *     por log aggregators (Datadog, CloudWatch, ELK). PM2 + Caddy lo capturan
 *     en stdout y pueden pipearlo a cualquier destino.
 *   - Desarrollo (NODE_ENV=development) emita con pino-pretty para legibilidad.
 *   - Cada mensaje lleve automáticamente `level`, `time`, `pid`, `hostname`,
 *     `service: 'gps-web'` — sin que el call site tenga que añadirlos.
 *
 * DO NOT import this module from:
 *   - Edge runtime (proxy.ts, lib/auth-edge.ts) — pino requiere Node APIs.
 *     For edge, use a plain console.* with structured prefix.
 *   - Client components ('use client') — adds ~50KB to the bundle. The
 *     browser console is the right destination there.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ userId, action: 'login.success' }, 'user logged in')
 *   logger.error({ err, requestId }, 'auth/login failed')
 *
 * Child loggers (for per-request context):
 *   const log = logger.child({ requestId: crypto.randomUUID() })
 *   log.info('started')     // includes requestId in JSON
 */

import pino from 'pino'

const isProd = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  // Stamp every log with the service name so log aggregators can filter.
  base: {
    service: 'gps-web',
    env: process.env.NODE_ENV || 'development',
    // Use APP_VERSION (set by /api/health and CI) for cross-reference with
    // git SHA when grepping logs for a specific deploy.
    version: process.env.APP_VERSION || 'unknown',
  },
  // In production, ISO timestamps; pino-pretty in dev wants epoch ms.
  timestamp: pino.stdTimeFunctions.isoTime,
  // Hide the noisy "request completed" log from pino-http style middleware
  // if it's ever added. We rely on Next.js's own request logs for that.
  formatters: {
    level(label) {
      return { level: label }
    },
  },
  // Pretty-print only in dev/test. In prod, raw JSON is what we want.
  ...((!isProd && !isTest)
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname,service,env,version',
          },
        },
      }
    : {}),
})

/**
 * Convenience: log an error with the standard error fields extracted.
 *
 * Usage:
 *   logger.error(serializeErr(err), 'auth/login failed')
 */
export function serializeErr(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      err: {
        message: err.message,
        name: err.name,
        stack: err.stack,
        ...((err as any).code !== undefined ? { code: (err as any).code } : {}),
        ...((err as any).detail !== undefined ? { detail: (err as any).detail } : {}),
      },
    }
  }
  return { err: { message: String(err) } }
}

export type Logger = typeof logger
