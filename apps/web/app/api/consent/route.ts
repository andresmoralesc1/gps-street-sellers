import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import pool from '@/lib/db'

/**
 * POST /api/consent — record a consent event for Ley 1581/2012 compliance.
 *
 * Used by:
 *   - Registration flow (terms + privacy)
 *   - Cookie banner (cookies)
 *   - Push subscription prompt (push)
 *
 * Body: {
 *   consentType: 'terms' | 'privacy' | 'cookies' | 'push',
 *   granted: boolean,
 *   policyVersion?: string,   // defaults to POLICY_VERSION env or 'v1.0'
 * }
 *
 * If the request has a valid session, the consent is tied to that user.
 * If not (e.g. cookie banner shown to a logged-out visitor), the consent
 * is recorded with just the email from the body (if provided). Anonymous
 * consent logs are kept for audit (art. 12 Ley 1581).
 */

const VALID_TYPES = ['terms', 'privacy', 'cookies', 'push'] as const
type ConsentType = (typeof VALID_TYPES)[number]

const DEFAULT_POLICY_VERSION = process.env.POLICY_VERSION || 'v1.0'

export async function POST(request: NextRequest) {
  // 1. Parse + validate body.
  let body: {
    consentType?: string
    granted?: boolean
    policyVersion?: string
    email?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const consentType = body.consentType as ConsentType | undefined
  if (!consentType || !VALID_TYPES.includes(consentType)) {
    return NextResponse.json(
      { error: `consentType must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  if (typeof body.granted !== 'boolean') {
    return NextResponse.json(
      { error: 'granted (boolean) is required' },
      { status: 400 }
    )
  }

  const policyVersion = body.policyVersion || DEFAULT_POLICY_VERSION

  // 2. Identify the caller (optional — anonymous consents are valid).
  let userId: string | null = null
  const token = getTokenFromRequest(request)
  if (token) {
    const payload = await verifyToken(token)
    if (payload) userId = payload.userId
  }

  // 2.5. Rate limit by IP — 20/hour. Public endpoint per Ley 1581/2012,
  // but unauthenticated callers could otherwise pollute consent_logs.
  // For authenticated callers this also blocks programmatic abuse.
  const rlIp =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const { allowed, retryAfter } = await checkRateLimit(rlIp, 'consent', 20, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  // For anonymous consent, require an email so we can de-duplicate + audit.
  let email: string | null = null
  if (!userId) {
    if (!body.email || typeof body.email !== 'string' || body.email.length > 255) {
      return NextResponse.json(
        { error: 'email is required when caller is not authenticated' },
        { status: 400 }
      )
    }
    email = body.email.toLowerCase().trim()
  }

  // 3. Capture metadata.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null
  const userAgent = request.headers.get('user-agent') || null

  // 4. Insert. ON CONFLICT DO NOTHING — re-submitting the same consent
  // is idempotent (art. 12 Ley 1581 doesn't require multiple records of
  // the same acceptance; the latest is what counts).
  try {
    await pool.query(
      `INSERT INTO consent_logs
        (user_id, email, consent_type, policy_version, granted, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (COALESCE(user_id::text, email), consent_type, policy_version)
         WHERE user_id IS NOT NULL
       DO NOTHING`,
      [userId, email, consentType, policyVersion, body.granted, ip, userAgent]
    )
  } catch (err) {
    logger.error(serializeErr(err), '[consent] insert failed:')
    return NextResponse.json({ error: 'Error interno. Intenta de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}