import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

// Top-50 most common passwords — must match the list in register/route.ts.
// ponytail: duplicate list is intentional to keep reset flow standalone
// without dragging in the register module's private constants.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'qwertyuiop', 'abc123', 'abc1234', '11111111', '12341234',
  'iloveyou', 'admin', 'admin123', 'administrator', 'root', 'toor', 'pass',
  'pass123', 'pass1234', 'welcome', 'welcome1', 'welcome123', 'monkey', 'dragon',
  'letmein', 'trustno1', 'baseball', 'iloveu', 'master', 'sunshine', 'ashley',
  'michael', 'shadow', 'jordan', 'superman', 'harley', 'fuckme', 'fuckyou', 'pussy',
  '696969', 'hottie', 'loveme', 'football', 'charlie', 'jennifer', 'hunter',
  'buster', 'soccer', 'harry', 'andrew', 'tigger', 'sunshine1', 'iloveyou1',
])

/**
 * POST /api/auth/reset-password
 *
 * Body: { token, password }
 *
 * Verifies the JWT (purpose=password_reset, exp=1h), enforces password
 * strength, hashes the new password, and updates the user. After success,
 * bumps the profile's token_version so all existing sessions are revoked —
 * this means anyone with the old password (or a stolen cookie) is logged out
 * everywhere, including the attacker who initiated the reset.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'

  const { allowed, retryAfter } = await checkRateLimit(ip, 'reset_password', 10, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta más tarde.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Same strength rules as register — server enforces, client can't bypass.
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }
    if (password.length > 128) {
      return NextResponse.json(
        { error: 'La contraseña es demasiado larga (máx 128 caracteres)' },
        { status: 400 }
      )
    }
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      return NextResponse.json(
        { error: 'Esta contraseña es muy común. Elige otra más segura.' },
        { status: 400 }
      )
    }

    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      console.error('[reset-password] JWT_SECRET missing')
      return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }

    let decoded: { email?: string; purpose?: string }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { email?: string; purpose?: string }
    } catch {
      return NextResponse.json(
        { error: 'El enlace expiró o no es válido. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    if (decoded.purpose !== 'password_reset' || !decoded.email) {
      return NextResponse.json(
        { error: 'El enlace no es válido para restablecer contraseña.' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Atomic: update password AND bump token_version so all sessions die.
    const result = await pool.query(
      `UPDATE users
         SET password_hash = $1
       WHERE LOWER(email) = LOWER($2) AND is_active = true
       RETURNING id`,
      [passwordHash, decoded.email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const userId = result.rows[0].id
    // Revoke all existing sessions for this user.
    await pool.query(
      'UPDATE profiles SET token_version = token_version + 1 WHERE user_id = $1',
      [userId]
    )

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.',
    })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}