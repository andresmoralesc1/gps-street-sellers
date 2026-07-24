/**
 * Request correlation helpers (Sprint 9 C.2).
 *
 * Each request that hits the API gets a stable `x-request-id` so logs
 * from the same request can be grouped in a log aggregator (Datadog,
 * CloudWatch, etc.) and a single user can be traced across the whole
 * stack — proxy.ts sets it, route handlers read it via getRequestId().
 *
 * Flow:
 *   1. Client may send `x-request-id` to correlate with their own traces.
 *      If not, the proxy generates one with crypto.randomUUID().
 *   2. proxy.ts forwards the id via response header `x-request-id` so the
 *      client can see it (and log it from the browser console).
 *   3. Route handlers call `getRequestId(req)` to read it, then `withRequest`
 *      creates a child logger that includes `requestId` in every line.
 *
 * Edge runtime note:
 *   - proxy.ts runs on Edge. We can't pull the Node logger there.
 *   - getRequestId() works on both runtimes because it just reads the
 *     header — no Node-only APIs involved.
 */

import { logger, type Logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Read the request id from the incoming request headers, or generate a
 * fresh UUID if the client didn't send one.
 *
 * Works on both Edge (proxy.ts) and Node runtime (route handlers) — no
 * Node-only APIs involved. Safe to call from any handler.
 */
export function getRequestId(req: Request | { headers: { get(name: string): string | null } }): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER)
  if (incoming && /^[a-zA-Z0-9_-]{1,64}$/.test(incoming)) {
    return incoming
  }
  // crypto.randomUUID is available in both Edge and Node 19+.
  return crypto.randomUUID()
}

/**
 * Build a child logger that includes the request id in every line.
 * Use as the first line of any mutating route handler:
 *
 *   export async function POST(req: NextRequest) {
 *     const log = withRequest(req, 'POST /api/orders')
 *     try {
 *       log.info('creating order')
 *       ...
 *     } catch (err) {
 *       log.error({ err: serializeErr(err) }, 'create failed')
 *     }
 *   }
 *
 * The returned logger is a Pino child (no extra overhead — the same
 * underlying logger instance, just with requestId merged into every line).
 */
export function withRequest(
  req: Request | { headers: { get(name: string): string | null } },
  routeLabel?: string,
): Logger {
  const requestId = getRequestId(req)
  return logger.child({
    requestId,
    ...(routeLabel ? { route: routeLabel } : {}),
  })
}

/**
 * Attach the request id to a Response so the client (and server logs)
 * can correlate. Returns the same response object for chaining.
 */
export function withRequestIdHeader(res: Response, requestId: string): Response {
  res.headers.set(REQUEST_ID_HEADER, requestId)
  return res
}

/**
 * Build a JSON response with the request id header attached. Convenience
 * wrapper that the route handlers use to ensure every response — including
 * error responses from the 9 different failure paths in /api/auth/login —
 * carries the request id. Without this, error paths were dropping the
 * header and breaking log correlation.
 */
export function jsonWithRequestId(
  req: Request | { headers: { get(name: string): string | null } },
  body: unknown,
  init?: ResponseInit,
): NextResponse {
  const res = NextResponse.json(body, init)
  res.headers.set(REQUEST_ID_HEADER, getRequestId(req))
  return res
}