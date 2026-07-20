import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { COLOMBIA_CITIES } from '@/lib/core/constants'
import { signTokenSync } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  isEmail,
  isPhone,
  normalizeEmail,
  normalizePhone,
} from '@/lib/auth-helpers'

// Top-50 most common passwords leaked in credential dumps. Lowercase; we
// compare against password.toLowerCase(). Source: SecLists top-100, trimmed
// to remove entries >32 chars (already blocked by min-length=8).
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

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || null
  const { allowed, retryAfter } = await checkRateLimit(ip ?? 'unknown', 'register', 20, 15 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { email, password, name, phone, cityId, role, acceptedTerms, acceptedPrivacy } = await req.json()

// ── Required: name + role + password + at least one of (email, phone)
    // Name: trim, collapse internal whitespace, min 2 chars, max 100.
    // ponytail: min length kept at 2 (real 2-char names exist).
    const trimmedName = typeof name === 'string'
      ? name.trim().replace(/\s+/g, ' ')
      : ''
    if (!trimmedName) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 }
      )
    }
    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'El nombre es demasiado largo (máx 100 caracteres)' },
        { status: 400 }
      )
    }

    // Role must be explicit — silent default to 'buyer' would surprise sellers.
    if (role !== 'buyer' && role !== 'seller') {
      return NextResponse.json(
        { error: 'Selecciona un tipo de cuenta: vendedor o comprador' },
        { status: 400 }
      )
    }

    // ── Password strength: minimum 8 chars, no top-50 common passwords.
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

    // ── Email/phone validation: at least one must be present and valid.
    // Both can be present (we store both). Frontend decides which to require.
    // DB CHECK constraint enforces the at-least-one invariant at the schema level.
    const rawEmail = typeof email === 'string' ? email.trim() : ''
    const rawPhone = typeof phone === 'string' ? phone.trim() : ''

    let cleanEmail: string | null = null
    let cleanPhone: string | null = null

    if (rawEmail) {
      cleanEmail = normalizeEmail(rawEmail)
      if (!cleanEmail) {
        return NextResponse.json(
          { error: 'El email no tiene un formato válido' },
          { status: 400 }
        )
      }
    }

    if (rawPhone) {
      cleanPhone = normalizePhone(rawPhone)
      if (!cleanPhone) {
        return NextResponse.json(
          { error: 'Ingresa un número de teléfono colombiano válido (10 dígitos)' },
          { status: 400 }
        )
      }
    }

    if (!cleanEmail && !cleanPhone) {
      return NextResponse.json(
        { error: 'Necesitas al menos un email o un teléfono para registrarte' },
        { status: 400 }
      )
    }

    // ── Ley 1581/2012 art. 9 — consent must be explicit and informed.
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

    // ── Atomic insert — handles both duplicate-email AND duplicate-phone races.
    // ON CONFLICT DO NOTHING makes it atomic; if no rows return, a row matched
    // the unique key (email or phone) and we report which one collided.
    //
    // Trade-off: we now hash the password BEFORE knowing if the email/phone is
    // free. Bcrypt cost 12 = ~250ms wasted on rare duplicates. Acceptable.
    const passwordHash = await bcrypt.hash(password, 12)
    const roleValue = role

    // Wrap users + profiles insert in a transaction so a profile failure
    // rolls back the user row. Before this fix a profile INSERT failure left
    // a user with no profile, making logout a no-op (isTokenRevoked returns
    // false when no profile exists). DO UPDATE on conflict guarantees the
    // token_version matches the JWT we issue right after.
    const client = await pool.connect()
    let user: { id: string; email: string; name: string; role: string; phone: string; city_id: string | null }
    try {
      await client.query('BEGIN')

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, name, phone, city_id, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING
         RETURNING id, email, name, role, phone, city_id`,
        [cleanEmail, passwordHash, trimmedName, cleanPhone, cityId || null, roleValue]
      )

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK')
        // Could be email OR phone conflict — narrow it down so the user knows
        // which field to change.
        if (cleanEmail) {
          const dup = await client.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [cleanEmail])
          if (dup.rows.length > 0) {
            return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
          }
        }
        if (cleanPhone) {
          const dup = await client.query('SELECT 1 FROM users WHERE phone = $1 LIMIT 1', [cleanPhone])
          if (dup.rows.length > 0) {
            return NextResponse.json({ error: 'El teléfono ya está registrado' }, { status: 400 })
          }
        }
        // Both NULL — race condition we couldn't narrow down.
        return NextResponse.json({ error: 'No se pudo crear la cuenta. Verifica email y teléfono.' }, { status: 400 })
      }

      user = userResult.rows[0]

      // Profile upsert: token_version is forced to 1 so the JWT we issue
      // matches profiles.token_version (otherwise isTokenRevoked would treat
      // the brand-new token as revoked on the very first request).
      await client.query(
        `INSERT INTO profiles (id, user_id, email, name, role, token_version)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 1)
         ON CONFLICT (user_id) DO UPDATE
           SET token_version = 1,
               email = EXCLUDED.email,
               name = EXCLUDED.name,
               role = EXCLUDED.role`,
        [user.id, user.email, user.name, roleValue]
      )

      // ── Ley 1581/2012 — record the consent inside the same tx so the
      // audit log never refers to a user that doesn't exist.
      const policyVersion = process.env.POLICY_VERSION || 'v1.0'
      await client.query(
        `INSERT INTO consent_logs
          (user_id, consent_type, policy_version, granted, ip_address, user_agent)
         VALUES ($1, 'terms', $2, true, $3, $4),
                ($1, 'privacy', $2, true, $3, $4)`,
        [user.id, policyVersion, ip, req.headers.get('user-agent')]
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      client.release()
    }

    const tokenPayload = { userId: user.id, email: user.email, role: roleValue as 'buyer' | 'seller', tokenVersion: 1 }
    const token = signTokenSync(tokenPayload, '15m')
    const refreshToken = signTokenSync(tokenPayload, '7d')

    // Token is set via httpOnly cookies only — never echo it in the body
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email || '',
        fullName: user.name,
        phone: user.phone || '',
        cityId: user.city_id,
        role: user.role,
        avatarUrl: '',
      },
    })

    const isProd = process.env.NODE_ENV === 'production'
    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 15,
      sameSite: 'lax',
      secure: isProd,
    })
    response.cookies.set('refresh-token', refreshToken, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: isProd,
    })

    return response
  } catch (err) {
    logger.error(serializeErr(err), 'Register error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}