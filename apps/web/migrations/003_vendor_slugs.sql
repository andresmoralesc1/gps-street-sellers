-- Migration 003: vendor slugs
--
-- Add a human-friendly `slug` column to `vendors` (e.g. "frutas-don-jaime-cali")
-- and backfill it for all existing rows. Slugs are used for public vendor URLs
-- instead of exposing the UUID.
--
-- Format: lower(translate(lower(name), accents, plain)) + '-' + city_id
-- We use Postgres' `translate` + `regexp_replace` to mirror the JS slugify
-- in lib/core/utils/slug.ts.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill: generate slug for every existing vendor.
UPDATE vendors
SET slug = lower(
  regexp_replace(
    regexp_replace(
      translate(lower(coalesce(name, 'vendedor')),
        'áéíóúüñÁÉÍÓÚÜÑ',
        'aeiouunAEIOUUN'),
      '[^a-z0-9 -]', '', 'gi'),
    '\s+', '-', 'g')
) || '-' || coalesce(city_id, 'unknown')
WHERE slug IS NULL;

-- Uniqueness per city (two vendors in different cities may share a name,
-- but never within the same city).
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_slug_unique
  ON vendors (slug);

-- Index for fast lookup.
CREATE INDEX IF NOT EXISTS idx_vendors_slug_idx
  ON vendors (slug);
