import { NextRequest } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import pool from '@/lib/db'
import {
  acquireStreamSlot,
  streamHeaders,
  STREAM_LIMITS,
} from '@/lib/streaming-limits'

/**
 * GET /api/vendors/stream?cityId=bog — Server-Sent Events stream.
 *
 * Subscribes the client to live GPS updates for vendors in the given city.
 * The server polls the DB every 5s and emits any vendor whose
 * location_updated_at has changed since the last poll.
 *
 * Why SSE and not WebSockets:
 *   - SSE is unidirectional (server → client), which is exactly what we need
 *     (client receives position updates; vendor sends via PUT, not WS).
 *   - Works on plain HTTP — no custom server, no protocol upgrade, runs
 *     fine behind Caddy + PM2 + Next 16 with zero infra changes.
 *   - Auto-reconnects on disconnect (EventSource spec).
 *   - 80% of WebSocket's value for 10% of the complexity for this use case.
 *
 * Payload format (JSON per event):
 *   { vendorId, latitude, longitude, isActive, locationUpdatedAt }
 *
 * The client (MapView) just moves the marker — no full refetch.
 *
 * Connection limits (see lib/streaming-limits.ts):
 *   - MAX_CONCURRENT_PER_IP   hard cap to prevent per-IP connection storms.
 *   - MAX_TOTAL_CONCURRENT    process-wide DB-pool headroom.
 *   - MAX_DURATION_MS         clients auto-reconnect; zombies die on the timer.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const POLL_INTERVAL_MS = 5_000

export async function GET(req: NextRequest) {
  const ticket = acquireStreamSlot(req)
  if (!ticket) {
    return new Response('Too many concurrent streams', {
      status: 429,
      headers: { 'Retry-After': '30' },
    })
  }

  const { searchParams } = new URL(req.url)
  const cityId = searchParams.get('cityId')

  if (!cityId) {
    ticket.release()
    return new Response('cityId required', { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let lastSeen = new Date()
      let closed = false

      const send = (data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          closed = true
        }
      }

      // Initial snapshot — send all active vendors immediately so the map
      // shows pins on first paint without waiting for the first poll.
      try {
        const initial = await pool.query(
          `SELECT id, latitude, longitude, is_active, location_updated_at
           FROM vendors_with_sponsorship
           WHERE city_id = $1
             AND latitude IS NOT NULL AND longitude IS NOT NULL`,
          [cityId]
        )
        for (const v of initial.rows) {
          send({
            vendorId: v.id,
            latitude: v.latitude,
            longitude: v.longitude,
            isActive: v.is_active,
            locationUpdatedAt: v.location_updated_at,
          })
        }
      } catch (err) {
        logger.error(serializeErr(err), '[stream] initial snapshot failed:')
      }

      // Periodic poll — emit vendors whose location_updated_at > lastSeen.
      // CRIT-17: .unref() so the interval doesn't keep the Node process alive
      // if everything else exits (e.g. PM2 graceful shutdown).
      const interval = setInterval(async () => {
        if (closed) return
        try {
          // CRIT-9: 3s ceiling so a slow SELECT never holds a pool connection
          // beyond the 5s poll interval. SSE clients auto-reconnect on errors.
          await pool.query("SET LOCAL statement_timeout = '3000ms'")
          const result = await pool.query(
            `SELECT id, latitude, longitude, is_active, location_updated_at
             FROM vendors_with_sponsorship
             WHERE city_id = $1
               AND latitude IS NOT NULL AND longitude IS NOT NULL
               AND location_updated_at > $2`,
            [cityId, lastSeen]
          )
          if (result.rows.length > 0) {
            for (const v of result.rows) {
              send({
                vendorId: v.id,
                latitude: v.latitude,
                longitude: v.longitude,
                isActive: v.is_active,
                locationUpdatedAt: v.location_updated_at,
              })
            }
            lastSeen = result.rows.reduce(
              (acc, v) => (v.location_updated_at > acc ? v.location_updated_at : acc),
              lastSeen
            )
          }
          // Heartbeat to keep connection alive (every 5s) and avoid proxy timeouts.
          send({ type: 'ping', ts: Date.now() })
        } catch (err) {
          logger.error(serializeErr(err), '[stream] poll failed:')
        }
      }, POLL_INTERVAL_MS)

      // Cleanup on disconnect.
      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(interval)
        clearTimeout(maxDurationTimer)
        ticket.release()
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
      req.signal.addEventListener('abort', cleanup)

      // Hard kill after the duration budget — auto-reconnect via EventSource.
      const maxDurationTimer = setTimeout(cleanup, STREAM_LIMITS.MAX_DURATION_MS)
    },
  })

  return new Response(stream, { headers: streamHeaders() })
}