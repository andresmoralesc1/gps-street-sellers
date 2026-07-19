-- Migration: cleanup orphan vendors (profile_id IS NULL) — demo data only.
--
-- Background (from AUDITORIA_DB.md §3 finding #1):
--   4 vendors were created without a parent profile (likely seed data + an
--   audit-vendor test record). They violate the implicit invariant that every
--   vendor has a profile. CASCADE deletes also clean up associated products,
--   reviews, vendor_views, etc., keeping referential integrity intact.
--
-- Idempotent: re-running is safe — vendors that already have profile_id are
-- left untouched, and the DELETE simply finds 0 rows on second run.
--
-- Verified before running:
--   - 0 orders reference these vendors (FK NO ACTION would have blocked)
--   - 11 products, 3 reviews, 4 vendor_views → all CASCADE-delete
--   - 0 unique buyers across all 4 vendors (confirmed demo data)

BEGIN;

-- 1. Log which vendors are about to be deleted (audit trail in console)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, name, slug, category, is_active, created_at
    FROM vendors WHERE profile_id IS NULL
  LOOP
    RAISE NOTICE 'Deleting orphan vendor: % (%) — created %', rec.name, rec.id, rec.created_at;
  END LOOP;
END $$;

-- 2. Delete (CASCADE handles products, reviews, vendor_views,
--    vendor_location_history, favorites, sponsorships).
DELETE FROM vendors WHERE profile_id IS NULL;

COMMIT;
