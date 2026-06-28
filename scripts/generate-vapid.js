#!/usr/bin/env node
/**
 * Generate VAPID keys for web push notifications.
 *
 * Usage: node scripts/generate-vapid.js
 *
 * Prints the keys to stdout. Add them to your .env file:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<output.publicKey>
 *   VAPID_PRIVATE_KEY=<output.privateKey>
 *   VAPID_SUBJECT=mailto:admin@barriotech.com
 *
 * The public key is exposed to the browser (NEXT_PUBLIC_*) so the
 * service worker can subscribe. The private key MUST stay on the server.
 */

const webpush = require('web-push')

const keys = webpush.generateVAPIDKeys()

console.log('# Add these to apps/web/.env')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:admin@barriotech.com`)
console.log('')
console.log('# IMPORTANT:')
console.log('# - NEXT_PUBLIC_* is exposed to the browser (it is the PUBLIC key — safe).')
console.log('# - VAPID_PRIVATE_KEY must NEVER have NEXT_PUBLIC_ prefix and must NEVER leave the server.')
console.log('# - Regenerating keys invalidates all existing push subscriptions.')