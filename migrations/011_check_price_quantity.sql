-- Migration: CHECK constraints on products.price and order_items.{price,quantity}
--
-- Background (from AUDITORIA_DB.md §6 finding #6):
--   - products.price: numeric(10,2) — no constraint, accepts 0, negative, or
--     prices like 99999999.99 that overflow downstream arithmetic.
--   - order_items.price: numeric(10,2) — same problem; mirrors the price
--     that was paid at order time and must be > 0.
--   - order_items.quantity: integer default 1 — no min/max, accepts 0 (free
--     item) or -5 (refund?) or 999999 (DOS pattern).
--
-- Bounds chosen to match business reality:
--   - price > 0: nothing is free and negative prices would corrupt totals
--   - price <= 99999999.99: numeric(10,2) max is 99999999.99 anyway, but the
--     CHECK makes overflow attempts fail loudly instead of silently truncating
--   - quantity BETWEEN 1 AND 999: sane range for street-vendor catalog items.
--     Anything over 999 is almost certainly abuse or a bug.
--
-- Safe for existing data: pre-flight confirmed all rows already satisfy the
-- constraints (minimum price > 0 in all products/orders, all quantities = 1).

BEGIN;

-- products.price: must be a positive amount within numeric(10,2) bounds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_price_positive'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_price_positive
      CHECK (price > 0 AND price <= 99999999.99);
  END IF;
END $$;

-- order_items.price: same as above — frozen-at-purchase price must be > 0
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_price_positive'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_price_positive
      CHECK (price > 0 AND price <= 99999999.99);
  END IF;
END $$;

-- order_items.quantity: between 1 and 999
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_quantity_range'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_quantity_range
      CHECK (quantity BETWEEN 1 AND 999);
  END IF;
END $$;

COMMIT;
