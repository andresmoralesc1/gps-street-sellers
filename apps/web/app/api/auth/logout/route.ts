import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyToken } from '@/lib/auth'

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

    // No token — nothing to revoke
    if (!token) {
      const response = NextResponse.json({ success: true })
      clearCookie(response)
      return response
    }

    const decoded = verifyToken(token)

    // Invalid/expired token — just clear the cookie
    if (!decoded) {
      const response = NextResponse.json({ success: true })
      clearCookie(response)
      return response
    }

    // Revoke: increment token_version so existing tokens become invalid
    await pool.query(
      'UPDATE profiles SET token_version = token_version + 1 WHERE user_id = $1',
      [decoded.userId]
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