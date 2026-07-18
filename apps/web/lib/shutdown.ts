import type { Pool } from 'pg'

// Per-process state. Next.js forks workers, so this module is evaluated
// once per worker. We collect cleanup hooks and run them in order on
// SIGTERM/SIGINT.

interface ShutdownHook {
  name: string
  fn: () => Promise<void> | void
}

const hooks: ShutdownHook[] = []
let registered = false
let shuttingDown = false

export function registerShutdownHook(hook: ShutdownHook): void {
  hooks.push(hook)
}

export function registerShutdownHandlers(): void {
  if (registered) return
  registered = true

  const handle = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[shutdown] received ${signal}, running ${hooks.length} hooks`)

    // Run hooks sequentially — order matters (cron-stop before pg-pool-end).
    // CRIT-19: per-hook 3000ms timeout. PM2's kill_timeout is 8s for the
    // whole process — give each hook a fair share so we always reach the
    // critical DB-pool-end step even with several cron-style hooks ahead of it.
    for (const hook of hooks) {
      try {
        await Promise.race([
          Promise.resolve(hook.fn()),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('hook timeout')), 3000)
          ),
        ])
        console.log(`[shutdown] ${hook.name} OK`)
      } catch (err) {
        console.error(`[shutdown] ${hook.name} FAILED:`, err)
      }
    }
    console.log('[shutdown] done, exiting')
    // Don't call process.exit here — let Node exit naturally once the
    // event loop drains. PM2 has kill_timeout 8s as a backstop.
  }

  process.on('SIGTERM', () => void handle('SIGTERM'))
  process.on('SIGINT', () => void handle('SIGINT'))
}

export type { Pool }