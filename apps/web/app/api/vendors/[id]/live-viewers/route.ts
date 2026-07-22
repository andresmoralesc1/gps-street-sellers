import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'
import {
  acquireStreamSlot,
  streamHeaders,
  STREAM_LIMITS,
} from '@/lib/streaming-limits'

/**
 * GET /api/vendors/[id]/live-viewers — Server-Sent Events stream.
 * Emits a "viewer_count" event every 10s with the number of buyers currently
 * viewing this vendor's public profile page.
 *
 * Tracking method: count vendor_views rows for this vendor in the last 60s.
 * Approximation; matches what DoorDash/Wolt do for "live" indicators.
 *
 * NOTE: We COUNT(DISTINCT user_id) here, not user_ip. The INSERT path at
 * /api/vendors/[id]/route.ts only writes `(vendor_id, user_id)` — user_ip is
 * a nullable column that is rarely populated. Counting user_ip rows yielded
 * "0 viewers" on every dashboard (user_ip was NULL). Counting user_id is the
 * populated column and matches the actual logged-in user who opened the page.
 *
 * Connection limits: see lib/streaming-limits.ts.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  // Acquire a stream slot — protect DB from owner opening many tabs.
  const ticket = acquireStreamSlot(req)
  if (!ticket) {
    return new Response('Too many concurrent streams', {
      status: 429,
      headers: { 'Retry-After': '30' },
    })
  }

  const params = await paramsPromise
  const vendorId = params.id

  // Auth: must be the owner of this vendor.
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) {
    ticket.release()
    return new Response(auth.statusText || 'Unauthorized', { status: auth.status })
  }

  // Verify ownership.
  const ownerCheck = await pool.query(
    'SELECT id FROM vendors WHERE id = $1 AND profile_id IN (SELECT id FROM profiles WHERE user_id = $2)',
    [vendorId, auth.userId]
  )
  if (ownerCheck.rows.length === 0) {
    ticket.release()
    return new Response('Forbidden', { status: 403 })
  }

  // Release on abort AND after the max duration; otherwise the in-memory
  // counter would be permanently incremented on every owner tab.
  let released = false
  const releaseOnce = () => {
    if (released) return
    released = true
    ticket.release()
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Initial emit.
      try {
        const result = await pool.query(
          `SELECT COUNT(DISTINCT user_id) as viewers
           FROM vendor_views
           WHERE vendor_id = $1 AND viewed_at > NOW() - INTERVAL '60 seconds'`,
          [vendorId]
        )
        send('viewer_count', { count: Number(result.rows[0]?.viewers ?? 0), ts: Date.now() })
      } catch (err) {
        logger.error(serializeErr(err), 'live-viewers initial error:')
      }

      const interval = setInterval(async () => {
        try {
          const result = await pool.query(
            `SELECT COUNT(DISTINCT user_id) as viewers
             FROM vendor_views
             WHERE vendor_id = $1 AND viewed_at > NOW() - INTERVAL '60 seconds'`,
            [vendorId]
          )
          send('viewer_count', { count: Number(result.rows[0]?.viewers ?? 0), ts: Date.now() })
        } catch (err) {
          logger.error(serializeErr(err), 'live-viewers tick error:')
        }
      }, 10000)

      // Heartbeat to keep connection alive.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          // Stream closed
        }
      }, 25000)

      // Close handler.
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        clearInterval(heartbeat)
        releaseOnce()
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })

      // Hard kill after the duration budget — auto-reconnect via EventSource.
      setTimeout(() => releaseOnce(), STREAM_LIMITS.MAX_DURATION_MS)
    },
  })

  return new Response(stream, { headers: streamHeaders() })
}