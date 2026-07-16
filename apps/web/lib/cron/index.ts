import { startBusinessHoursCron } from '@/lib/cron/business-hours'
import { startLocationHistoryPruneCron, stopLocationHistoryPruneCron } from '@/lib/cron/prune-location-history'

/**
 * Boot file: imports all cron starters.
 * Imported from instrumentation.ts so they only run in production.
 */
export function startCrons() {
  startBusinessHoursCron()
  startLocationHistoryPruneCron()
}

export function stopCrons() {
  // Future: wire stopBusinessHoursCron() when it becomes stateful.
  stopLocationHistoryPruneCron()
}