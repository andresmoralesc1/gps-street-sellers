import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Client-side error reporter. The /dashboard error.tsx boundary POSTs
// here when it catches a render error, so we can grep the server log
// for the real cause instead of relying on the user reading a red box.
//
// Accepts POST from any origin (no auth required) — these are diagnostic
// payloads only. Cap stack at 4KB to prevent log spam.

const MAX_STACK = 4 * 1024

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const where = typeof body.where === 'string' ? body.where.slice(0, 64) : 'unknown'
    const message = typeof body.message === 'string' ? body.message.slice(0, 512) : ''
    const digest = typeof body.digest === 'string' ? body.digest.slice(0, 64) : ''
    const stack = typeof body.stack === 'string' ? body.stack.slice(0, MAX_STACK) : ''
    logger.error(
      { where, digest, stack },
      `[client-error] ${message || '(no message)'}`
    )
  } catch {
    // Don't let logging errors break the page further.
  }
  return NextResponse.json({ ok: true })
}