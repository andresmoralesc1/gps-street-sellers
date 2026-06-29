import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { COLOMBIA_CITIES } from '@/lib/core/constants'
import { signTokenSync } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

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

    // Check if user exists (case-insensitive)
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Sellers go through onboarding — start as buyer, upgrade via onboarding flow
    const roleValue = 'buyer'

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, phone, city_id, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role, phone, city_id`,
      [email.toLowerCase(), passwordHash, name, phone, cityId || null, roleValue]
    )

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

    const response = NextResponse.json({
      token,
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
