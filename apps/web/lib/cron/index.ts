import { startBusinessHoursCron } from '@/lib/cron/business-hours'

/**
 * Boot file: imports all cron starters.
 * Imported from instrumentation.ts so they only run in production.
 */
export function startCrons() {
  startBusinessHoursCron()
}