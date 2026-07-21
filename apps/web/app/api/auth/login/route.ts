import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { signTokenSync } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/trusted-ip'
import { isEmail, normalizeEmail, normalizePhone } from '@/lib/auth-helpers'

// Defense against user-enumeration via response timing:
// On startup we hash a fixed string with bcrypt cost 12 so the dummy-hash path
// takes ~as long as a real compare. Module-level memoization — runs once per
// process. The hash itself is throwaway (we never check what it produces).
let DUMMY_HASH_PROMISE: Promise<string> | null = null
function getDummyHash(): Promise<string> {
  if (!DUMMY_HASH_PROMISE) {
    DUMMY_HASH_PROMISE = bcrypt.hash('dummy-not-a-real-password', 12)
  }
  return DUMMY_HASH_PROMISE
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed, remaining, retryAfter } = await checkRateLimit(ip, 'login', 10, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { identifier, password } = await req.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 })
    }

    const id = identifier.trim()

    // Detect whether the identifier is an email or a phone. The helper rules
    // are shared with /api/auth/register so users can log in with whichever
    // they registered with.
    let lookupColumn: 'email' | 'phone'
    let lookupValue: string

    if (isEmail(id)) {
      lookupColumn = 'email'
      const normalized = normalizeEmail(id)
      if (!normalized) {
        // Shouldn't happen given isEmail() passed, but be defensive.
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
      }
      lookupValue = normalized
    } else {
      // Try to interpret as phone. If it doesn't even look like a phone,
      // return 401 (don't leak whether the format is wrong vs the user doesn't exist).
      const normalized = normalizePhone(id)
      if (!normalized) {
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
      }
      lookupColumn = 'phone'
      lookupValue = normalized
    }

    // Lookup by either email or phone.
    // CRIT-13: branch on the column NAME explicitly instead of interpolating
    // `u.${lookupColumn}` into the SQL. The whitelist type guard makes the
    // current code safe, but a single mis-edit to widen the union type would
    // silently become a SQL injection vector. The explicit branches below are
    // static SQL — pg-parameterized only on the value side.
    let result
    if (lookupColumn === 'email') {
      result = await pool.query(
        `SELECT u.*, p.token_version FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.email = $1`,
        [lookupValue]
      )
    } else {
      result = await pool.query(
        `SELECT u.*, p.token_version FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.phone = $1`,
        [lookupValue]
      )
    }

    // Defense against user-enumeration via response timing:
    // if no row, still hash a dummy password so the request takes ~as long as a
    // real bcrypt compare (~250ms with cost 12). The error message stays the
    // same ("Credenciales inválidas") so neither path leaks which field is wrong.
    if (result.rows.length === 0) {
      await bcrypt.compare(password, await getDummyHash())
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const user = result.rows[0]

    if (!user.is_active) {
      // Same timing even for inactive users — hash to mask the deactivated branch.
      await bcrypt.compare(password, user.password_hash)
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)

    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    // Access token (15 min) — used by middleware + API routes.
    // Refresh token (7 days) — used only by /api/auth/refresh.
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version || 1,
    }
    const token = signTokenSync(tokenPayload, '15m')
    const refreshToken = signTokenSync(tokenPayload, '7d')

    // Token is set via httpOnly cookies only — never echo it in the body
    // (avoids leaking it to browser history, extensions, server logs).
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email || '',
        fullName: user.name,
        role: user.role,
        avatarUrl: '',
        phone: user.phone || '',
        cityId: user.city_id || '',
        // email_verified lives on the user row; the login route already
        // selected it earlier. Mirror it into the response so the
        // client-side store can render the verify banner without an
        // extra /api/auth/me round-trip.
        emailVerified: user.email_verified,
      }
    })

    const isProd = process.env.NODE_ENV === 'production'
    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 15, // 15 minutes — matches access token expiry
      sameSite: 'lax',
      secure: isProd,
    })
    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      secure: isProd,
    })

    return response
  } catch (err) {
    logger.error(serializeErr(err), 'Login error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}