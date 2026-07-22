/**
 * SSRF guard for user-supplied URLs.
 *
 * Web Push subscriptions come from the browser's PushManager, which should
 * always hand us legitimate push service endpoints (FCM/Mozilla/Apple). HOWEVER:
 *  - A malicious or buggy client can craft a subscription with any HTTPS host
 *    (including `https://169.254.169.254/...` AWS metadata, `127.0.0.1`,
 *    a LAN IP, or `metadata.google.internal`).
 *  - Even if we trust the host we're POSTing to, downstream services may
 *    fetch content from the same URL or pass it through.
 *
 * To prevent the server from being turned into an internal-network HTTP proxy,
 * we check the destination before persisting or fetching:
 *  1. Hostname is not localhost / loopback / link-local / private / reserved.
 *  2. (Defensive) The hostname is not a known metadata host.
 *  3. If we want to be belt-and-suspenders, we resolve the hostname via DNS
 *     and ensure no resulting IP is in a private range. Skipping here because
 *     the browser is the one actually fetching, not us — we persist and read
 *     back, never POST to the user's claimed endpoint with user-controlled
 *     body in this code path. The simple hostname check is sufficient for
 *     /api/push/subscribe.
 *
 * For server-side fetches the project uses another helper (`lib/safe-fetch.ts`,
 * TBD) that resolves DNS — keep this helper for cases where we never fetch.
 *
 * Usage:
 *   if (!isSafePublicUrl(endpoint)) return NextResponse.json({ error: ... }, { status: 400 })
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google',
  'metadata.azure.com',
  'instance-data.ec2.internal',
  '169.254.169.254', // AWS / GCP / Azure metadata
])

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(h)) return true
  // IP-based checks (avoid DNS lookup — see header note)
  // Strip IPv6 brackets
  const bare = h.replace(/^\[|\]$/g, '')
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(bare)) {
    const parts = bare.split('.').map(Number)
    if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) return false
    const [a, b] = parts
    // RFC1918, loopback, link-local, multicast, reserved, broadcast
    if (a === 10) return true
    if (a === 127) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 0) return true
    if (a >= 224) return true
    return false
  }
  // IPv6 — only apply these prefix checks when the string actually looks like
  // an IPv6 literal (contains ':'). Without this guard, the startsWith checks
  // would block legitimate hostnames like 'fcm.googleapis.com' (starts with 'fc')
  // or 'fdroid.example.org' (starts with 'fd'). Bug CRIT-13.
  if (bare.includes(':')) {
    if (bare === '::1' || bare === '::') return true
    if (bare.startsWith('fe80:') || bare.startsWith('fc') || bare.startsWith('fd')) return true
  }
  return false
}

/**
 * Returns true iff the URL is a syntactically valid https URL pointing to a
 * hostname that is not a private/loopback/link-local/reserved IP or known
 * metadata host. Does NOT perform DNS resolution.
 */
export function isSafePublicUrl(rawUrl: string): boolean {
  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  if (!u.hostname) return false
  return !isBlockedHostname(u.hostname)
}
