/**
 * Minimal job-status recorder — logs to DB table `job_runs`.
 * Used by cron jobs to record start/finish + payload.
 */
import pool from './db'

export async function recordJobRun(jobName: string, payload: Record<string, any> = {}) {
  try {
    await pool.query(
      `INSERT INTO job_runs (job_name, payload, ran_at) VALUES ($1, $2, NOW())`,
      [jobName, payload]
    )
  } catch (err) {
    // If the table doesn't exist, just log — never break the cron.
    console.error(`[job-status] Could not record run for ${jobName}:`, err instanceof Error ? err.message : err)
  }
}