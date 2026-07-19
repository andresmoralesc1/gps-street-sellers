-- 017: Backfill product_photos for legacy products whose photo_url is set
-- but who have no rows in product_photos (seed-data inconsistency).
-- The MultiPhotoUploader and Buyer-side gallery fall back to product_photos;
-- without a row, position-0 queries (and the new reorder endpoint) treat
-- these products as having zero photos even though the card thumbnail works.
--
-- Strategy: for every product p where p.photo_url IS NOT NULL AND no
-- product_photos row exists yet, INSERT one row at position 0 with
-- p.photo_url as the URL. Idempotent — wrapped in a CTE that only picks
-- products without existing rows.
INSERT INTO product_photos (product_id, url, position, created_at)
SELECT
  p.id,
  p.photo_url,
  0,
  NOW()
FROM products p
LEFT JOIN product_photos ph ON ph.product_id = p.id
WHERE p.photo_url IS NOT NULL
  AND ph.id IS NULL
ON CONFLICT DO NOTHING;
