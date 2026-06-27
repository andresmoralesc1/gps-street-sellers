import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'gps-street-sellers-secret-key-change-in-production'
)
const JWT_SECRET_PREVIOUS = process.env.JWT_SECRET_PREVIOUS
  ? new TextEncoder().encode(process.env.JWT_SECRET_PREVIOUS)
  : null

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/orders',
  '/settings',
  '/favorites',
  '/profile/edit',
  '/notifications',
]

// Routes that require SELLER role
const SELLER_ROUTES = ['/dashboard', '/profile/edit']

// Routes that should redirect to /login if unauthenticated
const AUTH_ROUTES = ['/favorites', '/orders', '/settings', '/notifications']

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7)
  }
  const cookies = req.cookies.getAll()
  const tokenCookie = cookies.find((c) => c.name === 'token')
  return tokenCookie?.value || null
}

async function verifyToken(token: string): Promise<{ userId: string; role: string; tokenVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      role: payload.role as string,
      tokenVersion: payload.tokenVersion as number,
    }
  } catch {
    if (!JWT_SECRET_PREVIOUS) return null
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_PREVIOUS)
      return {
        userId: payload.userId as string,
        role: payload.role as string,
        tokenVersion: payload.tokenVersion as number,
      }
    } catch {
      return null
    }
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip middleware for API routes, static files, and public routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public/') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/map' ||
    pathname === '/onboarding' ||
    pathname === '/' ||
    pathname.startsWith('/nosotros') ||
    pathname.startsWith('/contacto') ||
    pathname.startsWith('/preguntas-frecuentes') ||
    pathname.startsWith('/privacidad') ||
    pathname.startsWith('/terminos') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg'
  ) {
    return NextResponse.next()
  }

  const token = extractToken(req)

  // Redirect unauthenticated users from protected app routes to login
  if (!token) {
    const isProtectedAppRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
    if (isProtectedAppRoute) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  const decoded = await verifyToken(token)

  if (!decoded) {
    // Invalid or revoked token — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('token')
    return response
  }

  // Seller-only routes
  if (SELLER_ROUTES.some((r) => pathname.startsWith(r))) {
    if (decoded.role !== 'seller') {
      return NextResponse.redirect(new URL('/map', req.url))
    }
  }

  // Authenticated — attach user info to headers for API routes
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-user-id', decoded.userId)
  requestHeaders.set('x-user-role', decoded.role)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - api routes (they handle auth themselves)
     */
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|sitemap.xml|robots.txt|api/).*)',
  ],
}
