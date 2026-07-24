import { NextRequest, NextResponse } from 'next/server'
import { logger, serializeErr } from '@/lib/logger'
import { verifyToken, getTokenFromRequest, signTokenSync } from '@/lib/auth'
import { isTokenRevoked } from '@/lib/auth-db'
import { requireSameOrigin } from '@/lib/csrf'

/**
 * POST /api/auth/refresh
 *
 * Re-issues a fresh access token (15min) using the current one, AS LONG AS:
 *   - the current token is still valid (signature + expiry OK)
 *   - the user's tokenVersion in DB still matches the one in the token
 *
 * The access token lives in the 'token' cookie (read by middleware).
 * The 'refresh-token' cookie holds the same JWT but with a 7-day expiry,
 * which the client uses to call this endpoint when the access token expires.
 *
 * If the access token has expired, this endpoint will accept the refresh-token
 * cookie instead. If both are gone, the user must log in again.
 *
 * Response: { token: string, expiresIn: 900 }
 */
export async function POST(req: NextRequest) {
    const csrf = requireSameOrigin(req); if (csrf) return csrf
  try {
    // Try access token first, fall back to refresh-token cookie.
    const accessToken = getTokenFromRequest(req)
    const refreshToken = req.cookies.get('refresh-token')?.value || null
    const token = accessToken || refreshToken

    if (!token) {
      return NextResponse.json({ error: 'No hay token para refrescar' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    // Check the token hasn't been revoked (logout bumped token_version).
    if (await isTokenRevoked(decoded.userId, decoded.tokenVersion)) {
      return NextResponse.json({ error: 'Sesión revocada' }, { status: 401 })
    }

    // Issue a fresh access token with the SAME tokenVersion.
    const freshAccessToken = signTokenSync(
      {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tokenVersion: decoded.tokenVersion,
      },
      '15m'
    )

    // Optionally re-issue a 7-day refresh token if the caller used the access token.
    // If they used the refresh token, we keep the same one to avoid runaway issuance.
    let freshRefreshToken: string | undefined
    if (accessToken && !refreshToken) {
      freshRefreshToken = signTokenSync(
        {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          tokenVersion: decoded.tokenVersion,
        },
        '7d'
      )
    }

    // Token is set via httpOnly cookies only — never echo it in the body
    const response = NextResponse.json({
      expiresIn: 900,
    })

    const isProd = process.env.NODE_ENV === 'production'
    response.cookies.set('token', freshAccessToken, {
      httpOnly: true,
      secure: isProd,
      // S3-SEC-3 (audit 2026-07-23): changed SameSite from 'lax' to 'strict'.
      // See apps/web/app/api/auth/login/route.ts for rationale. Defense in
      // depth on top of the Origin/Referer CSRF check in lib/csrf.ts
      // (S3-SEC-4 below).
      sameSite: 'strict',
      maxAge: 60 * 15, // 15 min — matches access token
      path: '/',
    })

    if (freshRefreshToken) {
      response.cookies.set('refresh-token', freshRefreshToken, {
        httpOnly: true,
        secure: isProd,
        // S3-SEC-3 (audit 2026-07-23): changed SameSite from 'lax' to 'strict'.
      // See apps/web/app/api/auth/login/route.ts for rationale. Defense in
      // depth on top of the Origin/Referer CSRF check in lib/csrf.ts
      // (S3-SEC-4 below).
      sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
    }

    return response
  } catch (err) {
    logger.error(serializeErr(err), 'POST /api/auth/refresh error:')
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}