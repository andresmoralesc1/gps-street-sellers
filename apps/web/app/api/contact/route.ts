import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  // Rate limit BEFORE doing any work — 5 messages per IP per hour.
  // Contact form is public; without this an attacker can flood contact_messages.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const { allowed, retryAfter } = await checkRateLimit(ip, 'contact', 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados mensajes. Intenta más tarde.', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Mensaje demasiado largo (máx 2000 caracteres)' }, { status: 400 })
    }

    // Store in DB
    await pool.query(
      `INSERT INTO contact_messages (name, email, subject, message, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [name, email, subject || 'Sin asunto', message]
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
