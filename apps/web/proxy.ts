import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTokenFromRequest, verifyTokenEdge } from '@/lib/auth-edge'

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
// Note: /favorites and /orders handle their own unauthenticated state
// in-page (show a "Log in" CTA), so we don't force-redirect from the proxy.
const AUTH_ROUTES = ['/settings', '/notifications']

export async function proxy(req: NextRequest) {
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

  const token = getTokenFromRequest(req)

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

  const decoded = await verifyTokenEdge(token)

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