/**
 * Web Push helper.
 *
 * Sends a push notification to all of a user's subscribed devices.
 * If a subscription returns 404/410 (endpoint invalid or expired),
 * it is deleted from the DB so we don't keep retrying dead endpoints.
 *
 * Required env vars (generate with `npm run generate-vapid`):
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT  (mailto:you@example.com or https://yourdomain.com)
 */

import webpush, { type WebPushError } from 'web-push'
import pool from './db'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
// VAPID subject: web-push requires a `mailto:` or `https://` contact URL so
// push providers can reach the application owner. We accept either name.
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || process.env.VAPID_EMAIL || 'mailto:admin@barriotech.com'

let vapidConfigured = false

function configureVapid(): boolean {
  if (vapidConfigured) return true
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    // Push notifications not configured — skip silently so the rest of the
    // app still works. The caller should log this once on startup.
    return false
  }
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    vapidConfigured = true
    return true
  } catch (err) {
    console.error('[push] Failed to configure VAPID:', err)
    return false
  }
}

// Configure at module load — best-effort.
vapidConfigured = configureVapid()
if (!vapidConfigured) {
  console.warn('[push] VAPID keys not configured. Push notifications are disabled. Run `npm run generate-vapid` to generate keys.')
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  data?: Record<string, unknown>
}

export interface SendResult {
  sent: number
  failed: number
  removed: number
}

/**
 * Send a push notification to every subscription of the given user (by users.id).
 *
 * Returns counts of how many notifications were successfully delivered,
 * how many failed (network / quota / etc), and how many dead subscriptions
 * were cleaned up.
 *
 * Never throws — failures are logged and counted.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<SendResult> {
  if (!vapidConfigured) {
    return { sent: 0, failed: 0, removed: 0 }
  }

  const subsRes = await pool.query(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  )

  if (subsRes.rows.length === 0) {
    return { sent: 0, failed: 0, removed: 0 }
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    icon: payload.icon ?? '/logo-avatar.png',
    data: payload.data ?? {},
  })

  let sent = 0
  let failed = 0
  let removed = 0

  // Send to all subscriptions in parallel. We collect results instead of
  // throwing so one bad endpoint doesn't take down the rest.
  const results = await Promise.allSettled(
    subsRes.rows.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        notificationPayload,
        { TTL: 60 * 60 } // 1 hour
      )
    )
  )

  // Sweep up dead endpoints in a single query.
  const deadIds: string[] = []

  results.forEach((result, idx) => {
    const sub = subsRes.rows[idx]
    if (result.status === 'fulfilled') {
      sent++
      return
    }
    failed++
    const err = result.reason as WebPushError | Error
    const statusCode = (err as WebPushError)?.statusCode
    // 404 (endpoint gone) and 410 (subscription expired) are permanent failures.
    if (statusCode === 404 || statusCode === 410) {
      deadIds.push(sub.id)
      removed++
    } else {
      // Transient — log but keep the subscription.
      console.error(`[push] send failed for ${sub.endpoint.slice(0, 60)}...:`, err.message || err)
    }
  })

  if (deadIds.length > 0) {
    await pool.query(
      'DELETE FROM push_subscriptions WHERE id = ANY($1::uuid[])',
      [deadIds]
    )
  }

  return { sent, failed, removed }
}

/**
 * Convenience wrapper: send a push + persist a row in the `notifications` table
 * so the in-app inbox shows it too. Use for buyer-facing events like order
 * status changes.
 *
 * `userId` is a users.id (FK to push_subscriptions.user_id).
 * The notifications.user_id FK is to profiles.id, so we resolve it here.
 */
export async function notify(
  userId: string,
  payload: PushPayload
): Promise<SendResult> {
  // Persist in-app notification row (FK to profiles.id, not users.id).
  const profileRes = await pool.query(
    'SELECT id FROM profiles WHERE user_id = $1',
    [userId]
  )
  if (profileRes.rows.length > 0) {
    await pool.query(
      `INSERT INTO notifications (user_id, title, body, read)
       VALUES ($1, $2, $3, false)`,
      [profileRes.rows[0].id, payload.title, payload.body]
    )
  }

  return sendPushToUser(userId, payload)
}

/**
 * Returns true if VAPID is configured and pushes will be delivered.
 */
export function isPushEnabled(): boolean {
  return vapidConfigured
}