-- 014: ads view — closes the pre-existing "ads table missing" warn.
--
-- Background:
--   GET /api/vendors has been returning empty ads since the feature was first
--   added. The query in apps/web/app/api/vendors/route.ts reads FROM ads, but
--   the actual table is `ad_campaigns` (defined in 007_sponsorships_ads.sql).
--   The mismatch was patched in code with a try/catch on error code 42P01
--   (undefined_table), so the GET never crashed — it just always returned
--   `ads: []` and logged a warn per request.
--
-- This migration creates a VIEW named `ads` that maps `ad_campaigns` to the
-- shape the GET expects. Using a view (not a new table) keeps
-- `ad_campaigns` as the single source of truth: any future admin UI keeps
-- editing the same rows, and the public listing reads through this stable
-- contract.
--
-- Schema diff from ad_campaigns → ads (VIEW):
--   ad_campaigns.status ('active'|'paused'|'expired'|'pending_payment')
--                    → ads.is_active  (boolean: status = 'active')
--   ad_campaigns has no priority column yet → ads.priority  (default 0)
--   contact_email, amount_cents, clicks_count, created_by etc. are NOT
--     exposed by the view — public listings must not leak billing or admin
--     identity to anonymous buyers.
--
-- The window filter (active + starts_at/ends_at) stays in the GET query
-- (not the view) so admin tooling can still SELECT paused/expired rows if
-- it ever needs to.
--
-- No seed: amount_cents is NOT NULL CHECK > 0 (legitimate business rule —
-- no free ads), so placeholder rows would violate it. The first real ad
-- will be inserted by the admin UI / billing flow when those land. The
-- public listing will then start returning ads: [...] automatically.

CREATE OR REPLACE VIEW ads AS
SELECT
  id,
  brand_name,
  image_url,
  target_url,
  (status = 'active') AS is_active,
  starts_at,
  ends_at,
  0::int AS priority,             -- placeholder; add a real column when ranking matters
  created_at
FROM ad_campaigns;

COMMENT ON VIEW ads IS
  'Public read shape for external brand campaigns. Backed by ad_campaigns. '
  'Does NOT expose contact_email, amount_cents, or created_by — those are '
  'admin-only. Window filtering (is_active + starts_at/ends_at) happens in '
  'the listing query; this view exposes all rows so admin tooling can still '
  'see paused/expired ones.';