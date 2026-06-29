/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ---------------------------------------------------------------------
  // Security headers (Etapa 5)
  //
  // Applied to ALL responses — pages, API routes, static assets.
  // Bare minimum OWASP baseline: HSTS, frame-ancestors, nosniff,
  // strict referrer policy, locked-down permissions policy.
  //
  // CSP is intentionally permissive about https: in script-src/img-src
  // because the app pulls product photos from Supabase Storage URLs.
  // Inline styles ('unsafe-inline' in style-src) are required by Tailwind
  // utility classes + some shadcn components. Inline scripts ('unsafe-inline'
  // in script-src) are required by Next.js' dev-mode hydration bootstrap;
  // remove in production once we move to nonce-based.
  // ---------------------------------------------------------------------
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'

    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, // Next.js hydration
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, // Tailwind + Google Fonts CSS
      `style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: blob: https:`, // Supabase storage + user uploads + external product photos
      `font-src 'self' data: https://fonts.gstatic.com`, // Google Fonts files
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
      `worker-src 'self'`, // service worker for push notifications
      `manifest-src 'self'`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `object-src 'none'`,
    ].join('; ')

    // Permissions-Policy feature names must match the W3C spec:
    // https://github.com/w3c/webappsec-permissions-policy/blob/main/features.md
    // 'notifications' is NOT a valid feature name (it doesn't exist in spec).
    // Web push does NOT require Permissions-Policy declaration.
    const permissionsPolicy = [
      `geolocation=(self)`, // required for "vendors nearby"
      `camera=()`,
      `microphone=()`,
      `payment=()`,
      `usb=()`,
      `magnetometer=()`,
      `gyroscope=()`,
      `accelerometer=()`,
    ].join(', ')

    return [
      {
        source: '/(.*)',
        headers: [
          // Strict transport security — 1 year, include subdomains, preload-ready
          {
            key: 'Strict-Transport-Security',
            value: isProd
              ? 'max-age=31536000; includeSubDomains'
              : 'max-age=0',
          },
          // Clickjacking protection
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Privacy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy — only what we need
          { key: 'Permissions-Policy', value: permissionsPolicy },
          // CSP
          { key: 'Content-Security-Policy', value: csp },
          // Cross-origin isolation OFF (no SharedArrayBuffer use case)
          // { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]
  },
}

module.exports = nextConfig