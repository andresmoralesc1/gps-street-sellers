-- Migration: CHECK dates_valid on sponsorships and ad_campaigns
--
-- Background (from AUDITORIA_DB.md §6 finding #12):
--   Both tables store time-bounded campaigns (sponsorships and ad_campaigns)
--   with starts_at and ends_at. A row where ends_at <= starts_at is logically
--   meaningless and almost always a bug or a maliciously crafted insert.
--   Pre-flight: 0 rows in either table violate this constraint.
--
-- Constraint name follows the existing pattern (table_colname_check).

BEGIN;

-- sponsorships: a sponsorship must end after it starts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sponsorships_dates_valid'
  ) THEN
    ALTER TABLE sponsorships
      ADD CONSTRAINT sponsorships_dates_valid
      CHECK (ends_at > starts_at);
  END IF;
END $$;

-- ad_campaigns: same invariant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ad_campaigns_dates_valid'
  ) THEN
    ALTER TABLE ad_campaigns
      ADD CONSTRAINT ad_campaigns_dates_valid
      CHECK (ends_at > starts_at);
  END IF;
END $$;

COMMIT;
