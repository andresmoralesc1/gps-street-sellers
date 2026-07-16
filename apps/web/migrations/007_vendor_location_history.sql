-- Migration: vendor location history (N14).
-- Stores GPS snapshots sent by ActiveToggle every 10s while vendor is active.
-- Powers the heatmap component on the seller dashboard.

CREATE TABLE IF NOT EXISTS vendor_location_history (
  id BIGSERIAL PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for time-range queries (the endpoint filters by vendor + recorded_at).
CREATE INDEX IF NOT EXISTS idx_vendor_location_history_vendor_time
  ON vendor_location_history(vendor_id, recorded_at DESC);

-- Retention: auto-prune snapshots older than 90 days (heatmap max range).
-- Run via daily cron in production.
DELETE FROM vendor_location_history WHERE recorded_at < NOW() - INTERVAL '90 days';