import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { requireAuth } from '@/lib/auth'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'


/**
 * POST /api/push/subscribe — persist (or refresh) a Web Push subscription.
 *
 * The client sends PushSubscription.toJSON():
 *   { endpoint, keys: { p256dh, auth } }
 *
 * Upsert keyed on (user_id, endpoint) so re-subscribing on the same device
 * replaces the previous keys instead of leaking rows.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const { allowed, retryAfter } = await checkRateLimit(ip, 'push_subscribe', 10, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await req.json().catch(() => null) as
      | { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
      | null
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
    const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : ''
    const authKey = typeof body?.keys?.auth === 'string' ? body.keys.auth : ''

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { error: 'Suscripción inválida. Faltan endpoint o claves.' },
        { status: 400 }
      )
    }
    if (!/^https:\/\//i.test(endpoint)) {
      return NextResponse.json(
        { error: 'endpoint debe ser https://' },
        { status: 400 }
      )
    }

    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, last_used_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, endpoint) DO UPDATE
         SET p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth,
             last_used_at = NOW()`,
      [userId, endpoint, p256dh, authKey]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error(serializeErr(err), 'Push subscribe error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/push/subscribe — remove a single subscription (opt-out path).
 * Body: { endpoint: string }
 */
export async function DELETE(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const { allowed, retryAfter } = await checkRateLimit(ip, 'push_subscribe', 10, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { endpoint } = await req.json()

    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error(serializeErr(err), 'Push unsubscribe error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}