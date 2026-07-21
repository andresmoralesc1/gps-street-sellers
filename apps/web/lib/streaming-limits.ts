// Per-IP connection budget for SSE and other long-lived streaming endpoints.
//
// In-memory only — that is fine here: the goal is to stop one IP from
// opening N parallel connections and exhausting the DB pool, not to enforce
// long-window rate limits (those use lib/rate-limit.ts against Postgres).
//
// On PM2 reload the process restarts so the counters reset; that is fine,
// it just means a misbehaving client gets a fresh budget of MAX on each
// reload, which is still bounded.

import { getClientIp } from './trusted-ip'

const MAX_CONCURRENT_PER_IP = 3
const MAX_TOTAL_CONCURRENT = 200

const perIp = new Map<string, number>()
let totalConcurrent = 0

export interface StreamTicket {
  readonly ip: string
  release: () => void
}

/**
 * Try to grant a slot for a new streaming connection.
 * Returns null if the caller is over budget.
 */
export function acquireStreamSlot(req: Request): StreamTicket | null {
  const ip = getClientIp(req as any)

  if (totalConcurrent >= MAX_TOTAL_CONCURRENT) return null

  const current = perIp.get(ip) ?? 0
  if (current >= MAX_CONCURRENT_PER_IP) return null

  perIp.set(ip, current + 1)
  totalConcurrent += 1

  let released = false
  return {
    ip,
    release: () => {
      if (released) return
      released = true
      perIp.set(ip, Math.max(0, (perIp.get(ip) ?? 0) - 1))
      totalConcurrent = Math.max(0, totalConcurrent - 1)
    },
  }
}

/**
 * Standard response headers for SSE responses.
 * Centralized so all streaming endpoints stay consistent.
 */
export function streamHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Disable proxy buffering so events flush immediately.
    'X-Accel-Buffering': 'no',
  }
}

export const STREAM_LIMITS = {
  MAX_CONCURRENT_PER_IP,
  MAX_TOTAL_CONCURRENT,
  MAX_DURATION_MS: 10 * 60 * 1000, // 10 minutes — clients auto-reconnect via EventSource.
}
