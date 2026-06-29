-- Persistent rate limit tracking.
-- Survives PM2 restarts (unlike the in-memory Map that was here before).
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  bucket TEXT NOT NULL,             -- e.g. 'login', 'register'
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speed up "count attempts in the last N minutes" queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_bucket_time
  ON rate_limit_attempts (ip, bucket, attempted_at DESC);