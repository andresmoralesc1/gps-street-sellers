import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { COLOMBIA_CITIES } from '@/lib/core/constants'
import { signTokenSync } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

// Top-50 most common passwords leaked in credential dumps. Lowercase; we
// compare against password.toLowerCase(). Source: SecLists top-100, trimmed
// to remove entries >32 chars (already blocked by min-length=8).
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'qwertyuiop', 'abc123', 'abc1234', '11111111', '12341234',
  'iloveyou', 'admin', 'admin123', 'administrator', 'root', 'toor', 'pass',
  'pass123', 'pass1234', 'welcome', 'welcome1', 'welcome123', 'monkey', 'dragon',
  'letmein', 'trustno1', 'baseball', 'iloveu', 'master', 'sunshine', 'ashley',
  'michael', 'shadow', 'jordan', 'superman', 'harley', 'fuckme', 'fuckyou', 'pussy',
  '696969', 'hottie', 'loveme', 'football', 'charlie', 'jennifer', 'hunter',
  'buster', 'soccer', 'harry', 'andrew', 'tigger', 'sunshine1', 'iloveyou1',
])

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const { allowed, retryAfter } = await checkRateLimit(ip, 'register', 20, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { email, password, name, phone, cityId, role, acceptedTerms, acceptedPrivacy } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Password strength: minimum 8 chars, no top-50 common passwords.
    // Server-side enforcement — never trust the client to validate.
    // ponytail: 50-entry list is enough — longer lists become maintenance burden.
    // For real strength scoring, swap to zxcvbn when volume justifies it.
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

    if (!phone || phone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ error: 'Ingresa un número de teléfono válido' }, { status: 400 })
    }

    // Ley 1581/2012 art. 9 — consent must be explicit and informed.
    // The frontend must send acceptedTerms and acceptedPrivacy = true
    // after the user ticked the boxes. We refuse registration otherwise.
    if (!acceptedTerms || !acceptedPrivacy) {
      return NextResponse.json(
        { error: 'Debes aceptar los Términos y la Política de Tratamiento de Datos Personales' },
        { status: 400 }
      )
    }

    // Validate cityId if provided (cities are static config, not in DB)
    if (cityId) {
      const validCity = COLOMBIA_CITIES.some((c) => c.id === cityId)
      if (!validCity) {
        return NextResponse.json({ error: 'Ciudad inválida' }, { status: 400 })
      }
    }

    // Atomic insert — the previous SELECT-then-INSERT pattern had a TOCTOU race:
    // two concurrent requests with the same email could both pass the existence
    // check and the second INSERT would 500 with a unique_violation. ON CONFLICT
    // DO NOTHING makes it atomic; if rows.length === 0 the email was already taken.
    //
    // Trade-off: we now hash the password BEFORE knowing if the email is free.
    // Bcrypt cost 10 = ~100ms wasted on the rare duplicate-email path. Acceptable
    // because (a) duplicates are rare and (b) keeping the INSERT atomic is worth
    // more than the saved CPU. ponytail: revisit if cost rises to 12+ or if
    // duplicate-email traffic becomes significant — then consider a UNIQUE check
    // before hashing and accept the small race window back.
    const passwordHash = await bcrypt.hash(password, 10)

    // Sellers go through onboarding — start as buyer, upgrade via onboarding flow
    const roleValue = 'buyer'

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, city_id, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, name, role, phone, city_id`,
      [email.toLowerCase(), passwordHash, name, phone, cityId || null, roleValue]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
    }

    const user = userResult.rows[0]

    // Create profile entry with token_version = 1
    await pool.query(
      `INSERT INTO profiles (id, user_id, email, name, role, token_version)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 1)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id, user.email, user.name, roleValue]
    )

    // Ley 1581/2012 — record the consent the user gave at registration.
    // The frontend already validated that the boxes were checked (we 400'd
    // earlier otherwise). Logged for audit / ARCO rights requests.
    // We do NOT block registration if this insert fails — it's an audit log,
    // not part of the user identity. A failure is logged for ops to follow up.
    try {
      const policyVersion = process.env.POLICY_VERSION || 'v1.0'
      await pool.query(
        `INSERT INTO consent_logs
          (user_id, consent_type, policy_version, granted, ip_address, user_agent)
         VALUES ($1, 'terms', $2, true, $3, $4),
                ($1, 'privacy', $2, true, $3, $4)`,
        [user.id, policyVersion, ip, req.headers.get('user-agent')]
      )
    } catch (err) {
      console.error('[register] consent log failed (non-fatal):', err)
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role, tokenVersion: 1 }
    const token = signTokenSync(tokenPayload, '15m')
    const refreshToken = signTokenSync(tokenPayload, '7d')

    // Token is set via httpOnly cookies only — never echo it in the body
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.name,
        phone: user.phone,
        cityId: user.city_id,
        role: user.role,
        avatarUrl: '',
      },
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
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
