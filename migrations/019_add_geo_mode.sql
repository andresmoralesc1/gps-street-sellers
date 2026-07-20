-- 019 — vendor geo_mode + zone fields (precise | battery)
--
-- Why:
--   BarrioTech updates the vendor's GPS every 10s while is_active. That
--   drains battery and burns data on mobile sellers. Let the seller pick:
--     * 'precise' — push lat/lng every 10s (default, current behavior).
--     * 'battery' — push only when the seller leaves a saved circular zone
--                   (geo_zone_lat/geo_zone_lng + geo_zone_radius_m).
--
-- Defaults:
--   - Existing rows are already 'precise' (column default).
--   - New rows inherit 'precise' so behavior is unchanged for vendors who
--     never touch /profile/edit.
--
-- Constraints:
--   - geo_mode: enum-like check (precise|battery).
--   - geo_zone_radius_m: 100..5000m to avoid nonsense radii (1m or 1km).
--
-- Index:
--   - We don't index by zone — clients search by is_active + city. The
--     remaining predicates are handled by the existing composite indexes.

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS geo_mode VARCHAR(16) NOT NULL
    DEFAULT 'precise'
    CHECK (geo_mode IN ('precise', 'battery'));

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS geo_zone_lat DOUBLE PRECISION;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS geo_zone_lng DOUBLE PRECISION;

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS geo_zone_radius_m INTEGER
    CHECK (geo_zone_radius_m IS NULL OR (geo_zone_radius_m BETWEEN 100 AND 5000));

COMMENT ON COLUMN vendors.geo_mode IS
  'precise = push GPS every 10s. battery = push only when leaving a saved zone.';
COMMENT ON COLUMN vendors.geo_zone_lat IS
  'When geo_mode=battery: last known center of the vendor''s circle (server-side, updated when the vendor crosses the boundary).';
COMMENT ON COLUMN vendors.geo_zone_lng IS
  'When geo_mode=battery: longitude counterpart of geo_zone_lat.';
COMMENT ON COLUMN vendors.geo_zone_radius_m IS
  'When geo_mode=battery: radius in meters around geo_zone_lat/geo_zone_lng. Constrained 100..5000.';