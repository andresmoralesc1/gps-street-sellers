/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const path = require('path')

const nextConfig = {
  reactStrictMode: true,
  // Disable the X-Powered-By: Next.js header (fingerprinting the stack).
  poweredByHeader: false,

  // Explicit workspace root — Next.js was getting confused by /home/telchar/bun.lock
  // (an orphaned file from a different project) and warning about inferred root.
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // ---------------------------------------------------------------------
  // Image optimization (Etapa 13)
  //
  // Whitelist external hosts so <Image src="https://..." /> can optimize.
  // Currently used by product photos uploaded to Supabase Storage.
  // ---------------------------------------------------------------------
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
        pathname: '/storage/v1/object/**',
      },
      // Allow Carrd / marketing landing pages hosted externally to render OG previews.
      {
        protocol: 'https',
        hostname: 'andresmorales.com.co',
      },
      {
        protocol: 'https',
        hostname: 'gps.andresmorales.com.co',
      },
    ],
  },

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
      // sync with /etc/caddy/Caddyfile line 24 (gps.andresmorales.com.co block).
      // Caddy overwrites this header in production via header_down, so next.config.js
      // is only authoritative in dev/preview. Keep them in lock-step.
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://umami.andresmorales.com.co`, // Next.js hydration + Umami analytics
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, // Tailwind + Google Fonts CSS
      `style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: blob: https:`, // Supabase storage + user uploads + external product photos
      `font-src 'self' data: https://fonts.gstatic.com`, // Google Fonts files
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://umami.andresmorales.com.co`,
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
      // Don't cache HTML pages — they change often (marketing copy, contact info).
      // Static assets in /_next/static/* keep their long cache (hash-based busting).
      {
        source: '/((?!_next/static|sw\\.js|manifest\\.json|favicon).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  // Source-map upload config. No-op when SENTRY_AUTH_TOKEN isn't set,
  // so dev builds work without a Sentry account.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  hideSourceMaps: true,
  // disableLogger is deprecated in @sentry/nextjs 10+ — use the
  // webpack treeshake option instead. Equivalent effect: no Sentry
  // debug logs in production builds.
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
})