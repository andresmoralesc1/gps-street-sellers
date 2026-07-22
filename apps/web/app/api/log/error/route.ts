import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/trusted-ip'

// Client-side error reporter. The /dashboard error.tsx boundary POSTs
// here when it catches a render error, so we can grep the server log
// for the real cause instead of relying on the user reading a red box.
//
// S1-SEC-2 (audit 2026-07-22): rate-limit by IP — was previously
// unlimited, allowing disk-fill DoS and data poisoning (an attacker
// could inject crafted log lines to mask real incidents). The
// endpoint is still public (unauthenticated client errors are valid)
// but capped at 10/min/IP. Body caps (4KB stack, 64B where, etc.)
// remain as a second layer.

const MAX_STACK = 4 * 1024

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed, retryAfter } = await checkRateLimit(ip, 'log_error', 10, 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: 'Demasiados reportes. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }
  try {
    const body = await req.json().catch(() => ({}))
    const where = typeof body.where === 'string' ? body.where.slice(0, 64) : 'unknown'
    const message = typeof body.message === 'string' ? body.message.slice(0, 512) : ''
    const digest = typeof body.digest === 'string' ? body.digest.slice(0, 64) : ''
    const stack = typeof body.stack === 'string' ? body.stack.slice(0, MAX_STACK) : ''
    logger.error(
      { where, digest, ip, stack },
      `[client-error] ${message || '(no message)'}`
    )
  } catch {
    // Don't let logging errors break the page further.
  }
  return NextResponse.json({ ok: true })
}