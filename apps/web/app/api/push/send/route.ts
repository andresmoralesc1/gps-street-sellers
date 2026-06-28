import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { notify } from '@/lib/push'

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
  // 1. Authenticate
  const token = getTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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
  const targetUserId = body.userId ?? payload.userId
  if (targetUserId !== payload.userId) {
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
  const result = await notify(payload.userId, message)
  return NextResponse.json({
    ok: true,
    delivered: result.sent,
    failed: result.failed,
  })
}