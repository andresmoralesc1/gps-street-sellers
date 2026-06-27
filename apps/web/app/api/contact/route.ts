import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(req: NextRequest) {
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
