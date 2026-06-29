/**
 * Minimal type declarations for `web-push` (no @types/web-push is published).
 * Covers only the methods we actually use in lib/push.ts.
 *
 * See https://github.com/web-push-libs/web-push for the full API.
 */
declare module 'web-push' {
  interface PushSubscription {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }

  export interface VapidKeys {
    publicKey: string
    privateKey: string
  }

  export interface WebPushError extends Error {
    statusCode: number
    body?: string
    endpoint?: string
  }

  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void

  function generateVAPIDKeys(): VapidKeys

  function sendNotification(
    subscription: PushSubscription | string,
    payload: string | Buffer | null,
    options?: {
      TTL?: number
      headers?: Record<string, string>
      contentEncoding?: string
      timeout?: number
      proxy?: string
    }
  ): Promise<{
    statusCode: number
    body: string
    headers: Record<string, string>
  }>

  const _default: {
    setVapidDetails: typeof setVapidDetails
    generateVAPIDKeys: typeof generateVAPIDKeys
    sendNotification: typeof sendNotification
  }

  export default _default
}