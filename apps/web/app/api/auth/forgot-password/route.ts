import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/trusted-ip'
import { sendPasswordResetEmail } from '@/lib/email'

/**
 * POST /api/auth/forgot-password
 *
 * Body: { email }
 *
 * Always returns 200 with the same generic message — does NOT reveal whether
 * the email exists (prevents user enumeration via this endpoint).
 *
 * If the email matches a user, generates a short-lived JWT (1h) with
 * purpose: 'password_reset', embeds it in a reset link, and emails it via
 * Brevo. The link points at /reset-password?token=...
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  // Rate limit tighter than login: forgot-password emails are a phishing vector.
  // 5 requests per IP per hour is enough for legitimate use, blocks abuse.
  const { allowed, retryAfter } = await checkRateLimit(ip, 'forgot_password', 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta más tarde.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      // Generic OK even on bad input — don't leak whether we expect an email.
      return NextResponse.json({
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.',
      })
    }

    // CRIT-6: per-email rate limit prevents targeting a single victim with a
    // burst of resets (e.g. bombarding one address from rotating IPs).
    // Normalize to lowercase so case variation doesn't bypass.
    const normalizedEmail = email.toLowerCase()
    const emailLimit = await checkRateLimit(
      normalizedEmail,
      'forgot_password_email',
      3,
      60 * 60 * 1000,
    )
    if (!emailLimit.allowed) {
      return NextResponse.json({
        message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.',
      }, { status: 429, headers: { 'Retry-After': String(emailLimit.retryAfter) } })
    }

    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      console.error('[forgot-password] JWT_SECRET missing')
      return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }

    // Always do a DB lookup so timing is similar whether or not email exists.
    // Doesn't fully prevent enumeration but raises the bar.
    const result = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email]
    )

    if (result.rows.length > 0) {
      const resetToken = jwt.sign(
        { email: email.toLowerCase(), purpose: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      )

      const userResult = await pool.query(
        'SELECT name FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
        [email]
      )
      const name = userResult.rows[0]?.name ?? ''

      // Send via the email helper. We await so failures are logged, but the
      // user-facing response is the same generic message either way (no
      // enumeration).
      try {
        const result = await sendPasswordResetEmail({
          to: email.toLowerCase(),
          name,
          token: resetToken,
        })
        if (!result.ok) {
          logger.error({ to: email, error: result.error }, '[forgot-password] Email send failed:')
        }
      } catch (emailErr) {
        logger.error(serializeErr(emailErr), '[forgot-password] Email error (non-fatal):')
      }
    }

    return NextResponse.json({
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.',
    })
  } catch (err) {
    logger.error(serializeErr(err), 'Forgot password error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}