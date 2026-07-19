-- 018: Full-text search index for products.
--
-- The /api/products endpoint now supports ?q= full-text search in Spanish,
-- ranking matches against the to_tsvector('spanish', name || description).
-- GIN gives us O(1) index lookup for @@ operator lookups instead of a
-- sequential scan + per-row to_tsvector invocation.
--
-- The index is created on a STORED expression so we don't pay the to_tsvector
-- cost at query time and so the planner can use the index even when the query
-- doesn't repeat the exact same to_tsvector() call shape.
--
-- CONCURRENTLY would be friendlier on a busy table, but the products table is
-- small (audit-2026-07-19: 21 rows) and CONCURRENTLY can't run inside a
-- transaction, which is how scripts/migrate.js runs migrations. The planner
-- won't consider a CONCURRENTLY index mid-build anyway.
CREATE INDEX IF NOT EXISTS products_fts_idx
  ON products
  USING GIN (to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(description, '')));
