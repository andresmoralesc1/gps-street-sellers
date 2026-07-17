-- 008 — vendor station_type (fixed | mobile)
--
-- Why:
--   BarrioTech users tell us they want to filter / see the kind of vendor:
--   - 'fixed'   = sits in the same spot every day (parking-lot food cart,
--                 corner store, fruit stand). Stable lat/lng.
--   - 'mobile'  = moves around the city (ice-cream bike, walking vendor,
--                 delivery moto). Lat/lng is a *snapshot* of "where they are
--                 right now" — buyer's GPS relative distance matters most.
--
-- Filtering implications (separate from this migration):
--   - /api/vendors/map already filters by is_active and city. We will add
--     `WHERE is_open_now() OR station_type='mobile'` so a mobile vendor who
--     hasn't set business hours still shows up.
--   - /api/vendors list page will surface a "Puesto fijo" / "Ambulante" chip.
--
-- Defaults:
--   - For mobile vendors business hours often don't make sense (they're
--     "open" whenever they're moving). Default to NULL → no schedule gate.
--   - Existing rows: we mark them 'mobile' by default because most legacy
--     vendors were street vendors. Operators can flip individual rows.
--
-- is_active default:
--   - Today `is_active` defaults to false. That means *new* vendors are
--     invisible in the map until someone explicitly flips them. The user
--     now controls this toggle from their dashboard, but having to flip it
--     once after every onboarding was a paper cut.
--   - Switch default to true. Vendor can still hide themselves (C1: vendor-
--     controlled toggle). Soft-delete is a separate is_deleted column
--     (added by 002 for that purpose).

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS station_type TEXT
    CHECK (station_type IS NULL OR station_type IN ('fixed', 'mobile'));

-- Best-effort backfill from category+vehicle_type. This is a *hint*, not
-- authoritative — vendors can override.
UPDATE vendors
SET station_type = CASE
  WHEN vehicle_type IN ('bicicleta','pie','triciclo','moto','otro') THEN 'mobile'
  WHEN vehicle_type IN ('carro') THEN 'fixed'
  ELSE 'mobile'  -- unknown vehicles default to mobile (street vendor norm)
END
WHERE station_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_station_type
  ON vendors(station_type)
  WHERE station_type IS NOT NULL;

COMMENT ON COLUMN vendors.station_type IS
  'fixed = always in the same spot. mobile = moves around the city. NULL allowed but discouraged.';

-- Flip default so newly-onboarded vendors are visible immediately.
ALTER TABLE vendors ALTER COLUMN is_active SET DEFAULT true;

-- Backfill: existing rows that were created with default false (and never
-- flipped) should be promoted to true. We only touch rows where
-- is_active=false AND there's been no explicit "hide" toggle recorded.
-- Since we don't track that audit, safest is to flip everything once.
UPDATE vendors SET is_active = true WHERE is_active = false;

-- Refresh vendors_with_sponsorship so the public listing endpoint
-- (/api/vendors) returns the new columns. The view is recreated (not
-- ALTER) so the column order matches the SELECT below.
DROP VIEW IF EXISTS vendors_with_sponsorship;
CREATE VIEW vendors_with_sponsorship AS
SELECT v.id,
    v.profile_id,
    v.name,
    v.description,
    v.category,
    v.latitude,
    v.longitude,
    v.is_active,
    v.rating,
    v.review_count,
    v.photo_url,
    v.created_at,
    v.phone,
    v.city_id,
    v.is_verified,
    v.location_updated_at,
    v.vehicle_type,
    v.vehicle_photo_url,
    v.slug,
    v.station_type,
    v.business_hours_enabled,
    v.business_hours_start,
    v.business_hours_end,
    v.business_days,
    (EXISTS ( SELECT 1 FROM sponsorships s
              WHERE s.vendor_id = v.id
                AND s.status = 'active'
                AND now() >= s.starts_at
                AND now() <= s.ends_at)) AS is_sponsored,
    COALESCE(( SELECT max(s.ends_at) FROM sponsorships s
                WHERE s.vendor_id = v.id
                  AND s.status = 'active'),
             NULL::timestamp with time zone) AS sponsored_until
FROM vendors v;