-- Migration: product photos table (N12) — multiple photos per product.
CREATE TABLE IF NOT EXISTS product_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_photos_product_id ON product_photos(product_id, position);

-- Backfill from existing products.photo_url (column kept for backward compat).
INSERT INTO product_photos (product_id, url, position)
SELECT id, photo_url, 0
FROM products
WHERE photo_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM product_photos pp WHERE pp.product_id = products.id
  );

COMMENT ON TABLE product_photos IS 'Multiple photos per product. First by position is primary.';