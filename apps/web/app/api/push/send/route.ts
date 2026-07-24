import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { notify } from '@/lib/push'
import { checkRateLimitFromRequest } from '@/lib/rate-limit'
import { requireSameOrigin } from '@/lib/csrf'

/**
 * POST /api/push/send — authenticated user-triggered push.
 *
 * Use cases:
 *   - client self-test of push subscription (after subscribing, fire one to
 *     verify it works end-to-end)
 *   - generic in-app notifications that don't fit the targeted endpoints
 *     (orders, vendor-active)
 *
 * IMPORTANT: This endpoint can ONLY target the calling user themselves
 * (userId in body must equal the JWT userId). Admin broadcasts should
 * be done via a DB-level job or a future admin role — we do not expose
 * arbitrary-user push here to prevent a buyer from spamming sellers.
 *
 * Body: { message: { title, body, url? } }
 * Response: { ok, delivered, failed }
 */

interface SendBody {
  userId?: string
  message?: { title?: string; body?: string; url?: string }
}

export async function POST(request: NextRequest) {
    const csrf = requireSameOrigin(request); if (csrf) return csrf
  // 1. Authenticate
  const auth = await requireAuth(request)

  if (auth instanceof NextResponse) return auth

  const userId = auth.userId

  // 1b. Rate limit — each /push/send inserts a row into `notifications` AND
  // fires a web-push HTTP request to FCM/Mozilla. Without a per-user cap, a
  // buggy/script-kiddie client could fill both `notifications` and the push
  // provider quota at line speed.
  const rl = await checkRateLimitFromRequest(request, 'push_send', 30, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } }
    )
  }

  // 2. Validate body
  let body: SendBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const title = body.message?.title?.trim()
  const text = body.message?.body?.trim()
  if (!title || !text) {
    return NextResponse.json(
      { error: 'message.title and message.body are required' },
      { status: 400 }
    )
  }

  // 3. Scope to caller — prevent cross-user push.
  // If the caller specifies a userId, it MUST equal their own JWT userId.
  const targetUserId = body.userId ?? auth.userId
  if (targetUserId !== auth.userId) {
    return NextResponse.json(
      { error: 'Forbidden — cannot send push to another user' },
      { status: 403 }
    )
  }

  const message = {
    title,
    body: text,
    url: body.message?.url ?? '/',
  }

  // 4. Deliver
  const result = await notify(auth.userId, message)
  return NextResponse.json({
    ok: true,
    delivered: result.sent,
    failed: result.failed,
  })
}