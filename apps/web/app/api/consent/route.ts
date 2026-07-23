import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/trusted-ip'
import pool from '@/lib/db'
import { parseJsonBody } from '@/lib/parse-json'

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
  const parsed = await parseJsonBody<{
    consentType?: unknown; granted?: unknown; policyVersion?: unknown; email?: unknown;
  }>(request)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const body = parsed.body

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

  const policyVersion =
    typeof body.policyVersion === 'string' && body.policyVersion.length > 0
      ? body.policyVersion
      : DEFAULT_POLICY_VERSION

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
  const { allowed, retryAfter } = await checkRateLimit(getClientIp(request), 'consent', 20, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  // For anonymous consent, require an email so we can de-duplicate + audit.
  let email: string | null = null
  if (!userId) {
    const rawEmail = body.email
    if (typeof rawEmail !== 'string' || rawEmail.length === 0 || rawEmail.length > 255) {
      return NextResponse.json(
        { error: 'email is required when caller is not authenticated' },
        { status: 400 }
      )
    }
    email = rawEmail.toLowerCase().trim()
  }

  // 3. Capture metadata.
  const ip = getClientIp(request) === 'unknown' ? null : getClientIp(request)
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
      [userId, email, consentType, policyVersion, typeof body.granted === 'boolean' ? body.granted : false, ip, userAgent]
    )
  } catch (err) {
    logger.error(serializeErr(err), '[consent] insert failed:')
    return NextResponse.json({ error: 'Error interno. Intenta de nuevo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}