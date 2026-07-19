import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import pool from '@/lib/db'
import { verifyToken } from '@/lib/auth'

function clearCookies(response: NextResponse) {
  const isProd = process.env.NODE_ENV === 'production'
  response.cookies.set('token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: isProd,
  })
  response.cookies.set('refresh-token', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: isProd,
  })
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    // No token — nothing to revoke
    if (!token) {
      const response = NextResponse.json({ success: true })
      clearCookies(response)
      return response
    }

    const decoded = await verifyToken(token)

    // Invalid/expired token — just clear the cookie
    if (!decoded) {
      const response = NextResponse.json({ success: true })
      clearCookies(response)
      return response
    }

    // Revoke: increment token_version so existing tokens become invalid
    await pool.query(
      'UPDATE profiles SET token_version = token_version + 1 WHERE user_id = $1',
      [decoded.userId]
    )

    const response = NextResponse.json({ success: true })
    clearCookies(response)
    return response
  } catch (err) {
    logger.error(serializeErr(err), 'Logout error:')
    const response = NextResponse.json({ success: true })
    clearCookies(response)
    return response
  }
}