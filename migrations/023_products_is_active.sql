-- Migration 023: products.is_active for per-product publish/unpublish toggle.
--
-- Before this migration, every product a seller created was instantly
-- public. There was no way to hide a single product (e.g. out-of-stock
-- item, seasonal, or just a draft) without deleting it. Deleting is
-- destructive — no audit trail, no recovery, and no "unpublish" semantic
-- that maps to the seller's mental model.
--
-- Design decisions:
--
-- 1. DEFAULT TRUE so existing rows stay public (no behavior change for
--    the 39+ products already in dev / 18+ in test). Sellers who want
--    to hide a product must explicitly toggle it off via the new
--    PATCH /api/products/[id] route handler.
--
-- 2. NOT NULL constraint. The default covers existing rows; the API
--    route handler is responsible for sending `isActive` on every
--    create/update so future rows can't sneak in with NULL either.
--
-- 3. Partial index on `is_active = true` so the public catalog query
--    (`SELECT … WHERE is_active = true ORDER BY created_at DESC`) hits
--    a tight index instead of scanning + filtering. Naming follows the
--    `*_partial_active_idx` convention used elsewhere in this repo.
--
-- 4. After applying this migration the schema must be regenerated for
--    CI: `pg_dump … | tail -n +11 | head -n -1 > schema.full.sql`. The
--    CI workflow applies schema.full.sql directly (see ci.yml), so an
--    out-of-date snapshot will fail the migration history check on the
--    next push.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Tight index for the public catalog query. The "false" case is rare
-- (unpublished products) so we don't index it.
CREATE INDEX IF NOT EXISTS products_is_active_true_idx
  ON products (created_at DESC)
  WHERE is_active = true;

-- Comment for future readers / ORM reflection.
COMMENT ON COLUMN products.is_active IS
  'Sprint 6 D.1: per-product visibility toggle. True = visible in public catalog. False = hidden from buyers but kept for the seller.';