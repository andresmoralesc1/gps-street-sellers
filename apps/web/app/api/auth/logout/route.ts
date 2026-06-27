import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'
const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS || ''

function clearCookie(response: NextResponse) {
  response.cookies.set('token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value
    if (!token) {
      const response = NextResponse.json({ success: true })
      clearCookie(response)
      return response
    }

    const jwt = require('jsonwebtoken') as any
    let decoded: { userId: string } | null = null

    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    } catch {
      if (JWT_SECRET_PREVIOUS) {
        try {
          decoded = jwt.verify(token, JWT_SECRET_PREVIOUS) as { userId: string }
        } catch {
          // Token invalid with both secrets — clear cookie
          const response = NextResponse.json({ success: true })
          clearCookie(response)
          return response
        }
      } else {
        const response = NextResponse.json({ success: true })
        clearCookie(response)
        return response
      }
    }

    // Revoke: increment token_version
    await pool.query(
      'UPDATE profiles SET token_version = token_version + 1 WHERE user_id = $1',
      [decoded!.userId]
    )

    const response = NextResponse.json({ success: true })
    clearCookie(response)
    return response
  } catch (err) {
    console.error('Logout error:', err)
    const response = NextResponse.json({ success: true })
    clearCookie(response)
    return response
  }
}
