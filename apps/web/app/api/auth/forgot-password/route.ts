import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'

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

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gps.andresmorales.com.co'
      const resetUrl = `${siteUrl}/reset-password?token=${resetToken}`

      // Send via Brevo. We await so failures are logged, but the user-facing
      // response is the same generic message either way (no enumeration).
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: process.env.EMAIL_FROM_NAME || 'BarrioTech',
              email: process.env.EMAIL_FROM || 'info@andresmorales.com.co',
            },
            to: [{ email: email.toLowerCase() }],
            subject: 'Restablece tu contraseña — BarrioTech',
            htmlContent: `
              <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #F97316;">Restablece tu contraseña</h1>
                <p>Hola,</p>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en BarrioTech.</p>
                <p>Si no fuiste tú, puedes ignorar este mensaje. Tu contraseña no cambiará hasta que uses el enlace.</p>
                <p style="margin: 32px 0;">
                  <a href="${resetUrl}" style="background: #F97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                    Restablecer contraseña
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">Este enlace expira en 1 hora.</p>
                <p style="color: #666; font-size: 14px;">Si el botón no funciona, copia y pega este enlace:<br/><span style="word-break: break-all;">${resetUrl}</span></p>
              </div>
            `,
          }),
        })
        if (!res.ok) {
          console.error('[forgot-password] Brevo send failed:', res.status, await res.text())
        }
      } catch (emailErr) {
        console.error('[forgot-password] Email error (non-fatal):', emailErr)
      }
    }

    return NextResponse.json({
      message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.',
    })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}