-- Migration: job_runs table for cron observability.
CREATE TABLE IF NOT EXISTS job_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  payload JSONB,
  ran_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_runs_job_name_ran_at ON job_runs(job_name, ran_at DESC);