import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'
const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS || ''

// ── In-memory rate limiter (IP-based, per-process) ──
const attempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000   // 15 min
const MAX_ATTEMPTS = 10

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
  const { allowed, remaining, retryAfter } = rateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Intenta de nuevo más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 })
    }

    const result = await pool.query(
      'SELECT u.*, p.token_version FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE LOWER(u.email) = LOWER($1)',
      [email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const user = result.rows[0]

    if (!user.is_active) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)

    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, tokenVersion: user.token_version || 1 },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.name,
        role: user.role,
        avatarUrl: '',
        phone: user.phone || '',
        cityId: user.city_id || '',
      }
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
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
