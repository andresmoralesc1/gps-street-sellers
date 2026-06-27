-- Add location_updated_at to vendors for tracking GPS freshness
-- Used by /api/vendors/[id]/location route to filter stale vendors from map
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;