import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'
import { COLOMBIA_CITIES } from '@/lib/core/constants'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'
const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS || ''

// ── In-memory rate limiter (IP-based, per-process) ──
const attempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const MAX_ATTEMPTS = 20

function rateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  const record = attempts.get(ip)
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetAt - now) / 1000) }
  }
  record.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const { allowed, retryAfter } = rateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { email, password, name, phone, cityId, role } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (!phone || phone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ error: 'Ingresa un número de teléfono válido' }, { status: 400 })
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

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, tokenVersion: 1 },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

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

    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
