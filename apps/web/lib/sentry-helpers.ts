/**
 * Sentry helpers for route handlers (Sprint 10 C.3).
 *
 * The Next.js instrumentation hook in apps/web/instrumentation.ts
 * initializes Sentry automatically when SENTRY_DSN is set. This file
 * adds the missing piece: a thin wrapper that route handlers can use
 * to:
 *   1. Capture unexpected exceptions and report them with full context
 *      (requestId, route label, userId from the auth cookie)
 *   2. Add per-request breadcrumbs that show up in Sentry's event
 *      detail pane.
 *
 * No-op when SENTRY_DSN is unset (dev / test environments).
 */

import { logger } from '@/lib/logger'
import { getRequestId } from '@/lib/request-context'

export interface CaptureContext {
  /** Route label shown in Sentry event, e.g. "POST /api/orders". */
  route: string
  /** Optional user id (from x-user-id header that proxy.ts sets). */
  userId?: string | null
  /** Optional request body (truncated to 1KB to avoid leaking huge payloads). */
  body?: unknown
  /** Optional pre-computed request id (avoids re-reading headers). */
  requestId?: string
}

interface SentryLike {
  captureException: (err: unknown, context?: Record<string, unknown>) => void
  addBreadcrumb: (crumb: Record<string, unknown>) => void
}

let cachedModule: SentryLike | null = null
let moduleLoadFailed = false

async function getSentry(): Promise<SentryLike | null> {
  if (!process.env.SENTRY_DSN) return null
  if (cachedModule) return cachedModule
  if (moduleLoadFailed) return null
  try {
    // Dynamic import keeps the bundle small when Sentry isn't configured.
    // @sentry/nextjs is a peerDep; if the package isn't installed this
    // falls through to the logger-only fallback.
    const mod = (await import('@sentry/nextjs')) as unknown as {
      captureException: SentryLike['captureException']
      addBreadcrumb: SentryLike['addBreadcrumb']
    }
    cachedModule = {
      captureException: mod.captureException,
      addBreadcrumb: mod.addBreadcrumb,
    }
    return cachedModule
  } catch {
    moduleLoadFailed = true
    return null
  }
}

/**
 * Capture an unexpected error to Sentry (when configured) and to the
 * local logger. Always safe to call — no-ops if Sentry is unconfigured.
 *
 * Use inside the catch block of a route handler:
 *
 *   } catch (err) {
 *     await captureApiError(err, { route: 'POST /api/orders', requestId, userId })
 *     return jsonWithRequestId(req, { error: 'Error interno' }, { status: 500 })
 *   }
 *
 * Why `await`: when Sentry is enabled we want the call to complete
 * before the response is sent so the event is queued. The await is
 * effectively a no-op when Sentry is off (Sentry.init is sync in
 * client/server SDKs, captureException is non-blocking but the event
 * must be sent over HTTP — we don't want to lose it on process exit).
 */
export async function captureApiError(err: unknown, ctx: CaptureContext): Promise<void> {
  const requestId = ctx.requestId ?? (typeof ctx.requestId === 'string' ? ctx.requestId : '')
  // Use child logger so the local log line gets the same context as
  // Sentry would (requestId, route, userId). Even without Sentry, an
  // operator grep'ing pino logs can find the line that matches a
  // Sentry-style trace.
  logger.error(
    {
      requestId: requestId || undefined,
      route: ctx.route,
      userId: ctx.userId ?? null,
      err: {
        message: errMsg(err),
        name: errName(err),
      },
    },
    'api error',
  )

  const sentry = await getSentry()
  if (!sentry) return
  sentry.captureException(err, {
    extra: {
      route: ctx.route,
      userId: ctx.userId ?? null,
      body: truncate(ctx.body, 1024),
    },
    tags: {
      requestId: requestId || 'unknown',
      route: ctx.route,
    },
  })
}

/**
 * Read the request id from a request and return it as a string. Convenience
 * for the common case where the route handler already has `req` in scope.
 */
export function readRequestId(req: { headers: { get(name: string): string | null } }): string {
  return getRequestId(req)
}

/**
 * Add a breadcrumb to the current Sentry event scope. Safe no-op when
 * Sentry is unconfigured.
 */
export async function addBreadcrumb(crumb: Record<string, unknown>): Promise<void> {
  const sentry = await getSentry()
  if (!sentry) return
  sentry.addBreadcrumb(crumb)
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
function errName(err: unknown): string {
  if (err instanceof Error) return err.name
  return 'UnknownError'
}

function truncate(input: unknown, max: number): string {
  try {
    const s = typeof input === 'string' ? input : JSON.stringify(input)
    if (s.length <= max) return s
    return s.slice(0, max) + '…'
  } catch {
    return '[unserializable]'
  }
}