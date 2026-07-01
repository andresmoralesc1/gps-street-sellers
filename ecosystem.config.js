/**
 * PM2 ecosystem file for GPS Street Sellers.
 *
 * Why this file exists:
 * - Next.js doesn't auto-load .env.local at PM2 start unless you point PM2 at it
 *   explicitly via `env_file`. Without that, env precedence puts .env.local on top
 *   at runtime but the shell-launched process never sees it.
 * - The previous "just npm start" approach broke whenever someone needed to change
 *   env (had to pm2 kill the whole daemon, which was scary with other services).
 *   This file makes restarts surgical: `pm2 reload gps` is enough.
 *
 * Usage:
 *   pm2 start ecosystem.config.js             # first-time start
 *   pm2 reload gps                            # after code changes (zero-downtime)
 *   pm2 restart gps                           # hard restart (faster than reload)
 *   pm2 logs gps                              # tail logs
 *
 * Safe: only this app is managed. n8n, twenty, minio, postgres, redis, caddy
 * are all separate (systemd / docker / standalone) and are NOT touched.
 */

module.exports = {
  apps: [
    {
      name: 'gps',
      script: 'npm',
      args: 'start -- -p 3005',
      cwd: '/home/telchar/gps-street-sellers/apps/web',
      exec_mode: 'fork',
      autorestart: true,
      // PM2 will respawn the app if it crashes. With max_restarts=10 inside
      // min_uptime=30s, a flaky process gives up after 10 quick failures.
      max_restarts: 10,
      min_uptime: '30s',
      // Give Next.js a chance to drain in-flight requests on reload.
      kill_timeout: 8000,
      wait_ready: false,
      // Load .env explicitly so the port and secrets are present at process start.
      // We only need the file; Next.js itself reads .env.local with higher priority
      // inside the app, so we don't override anything here.
      env: {
        NODE_ENV: 'production',
        PORT: '3005',
      },
    },
  ],
}
