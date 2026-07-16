import { NextRequest } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'

/**
 * GET /api/vendors/[id]/live-viewers — Server-Sent Events stream.
 * Emits a "viewer_count" event every 10s with the number of buyers currently
 * viewing this vendor's public profile page.
 *
 * Tracking method: count vendor_views rows for this vendor in the last 60s.
 * Approximation; matches what DoorDash/Wolt do for "live" indicators.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const vendorId = params.id

  // Auth: must be the owner of this vendor.
  const token = getTokenFromRequest(req)
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  const decoded = await verifyToken(token)
  if (!decoded) {
    return new Response('Invalid token', { status: 401 })
  }

  // Verify ownership.
  const ownerCheck = await pool.query(
    'SELECT id FROM vendors WHERE id = $1 AND profile_id IN (SELECT id FROM profiles WHERE user_id = $2)',
    [vendorId, decoded.userId]
  )
  if (ownerCheck.rows.length === 0) {
    return new Response('Forbidden', { status: 403 })
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
          `SELECT COUNT(DISTINCT user_ip) as viewers
           FROM vendor_views
           WHERE vendor_id = $1 AND viewed_at > NOW() - INTERVAL '60 seconds'`,
          [vendorId]
        )
        send('viewer_count', { count: Number(result.rows[0]?.viewers ?? 0), ts: Date.now() })
      } catch (err) {
        console.error('live-viewers initial error:', err)
      }

      const interval = setInterval(async () => {
        try {
          const result = await pool.query(
            `SELECT COUNT(DISTINCT user_ip) as viewers
             FROM vendor_views
             WHERE vendor_id = $1 AND viewed_at > NOW() - INTERVAL '60 seconds'`,
            [vendorId]
          )
          send('viewer_count', { count: Number(result.rows[0]?.viewers ?? 0), ts: Date.now() })
        } catch (err) {
          console.error('live-viewers tick error:', err)
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
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    },
  })
}