-- Migration 016: composite index on products(vendor_id, created_at DESC).
--
-- Background (products audit 2026-07-19):
--   GET /api/products?vendorId=X and GET /api/vendors/[id]/catalog both run
--     SELECT ... FROM products WHERE vendor_id = $1 ORDER BY created_at DESC
--   with only `idx_products_vendor_id` (single-column) covering the WHERE.
--   Postgres does the WHERE on the index, then a separate Sort node for the
--   ORDER BY. With 21 rows it doesn't matter, but with 10k products and
--   ~200/vendor the Sort becomes the dominant cost.
--
-- A composite btree index on (vendor_id, created_at DESC) lets Postgres
-- satisfy both the WHERE and the ORDER BY from the index alone — no Sort
-- node, no temporary buffer.
--
-- Safe for existing data: pure index add, no row changes.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_products_vendor_created
  ON products (vendor_id, created_at DESC);

COMMIT;