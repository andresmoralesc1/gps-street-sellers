-- 004_fk_indexes.sql
-- Add missing FK indexes identified in P0 #10 (reviews) + P1 #22 audit.
--
-- Goals:
--   - Speed up JOINs on these FKs.
--   - Speed up ON DELETE CASCADE / SET NULL operations (Postgres does NOT add
--     these automatically when you declare a FK).
--   - Avoid bloat: composite indexes that already LEAD with the FK column
--     are reused (e.g. idx_product_photos_product_id). Partial indexes only
--     used in active-filter queries don't help FK checks — we keep both.
--
-- Tables intentionally NOT indexed:
--   - favorites.buyer_id       : covered as leading col of (buyer_id, vendor_id) UNIQUE
--   - profiles.user_id          : UNIQUE profiles_user_id_key
--   - push_subscriptions.user_id: idx_push_user
--   - vendor_location_history.vendor_id: leading col of (vendor_id, recorded_at)
--   - vendor_views.vendor_id    : idx_vendor_views_vendor_id
--   - product_photos.product_id : leading col of (product_id, position)
--   - sponsorships.vendor_id    : partial idx covers hot path; the bare FK
--                                 check on tiny non-active rows is fine.

-- P0 #10: reviews.vendor_id — used by every "vendor detail" page load.
CREATE INDEX IF NOT EXISTS idx_reviews_vendor_id
  ON public.reviews (vendor_id);

-- P1: notifications by user (header bell, dropdown)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id, created_at DESC);

-- vendor_views.user_id — listing "vendors I viewed" + dedup
CREATE INDEX IF NOT EXISTS idx_vendor_views_user_id
  ON public.vendor_views (user_id);

-- favorites.vendor_id — "vendors who favorited me" + ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_favorites_vendor_id
  ON public.favorites (vendor_id);

-- products.vendor_id — every vendor dashboard call
CREATE INDEX IF NOT EXISTS idx_products_vendor_id
  ON public.products (vendor_id);

-- orders.buyer_id + orders.vendor_id — split into two so both can be hit
-- independently by buyer history vs vendor sales reports.
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id
  ON public.orders (buyer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_vendor_id
  ON public.orders (vendor_id, created_at DESC);

-- order_items.{order_id, product_id}
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON public.order_items (product_id);

-- ad_campaigns
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_target_category
  ON public.ad_campaigns (target_category);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_created_by
  ON public.ad_campaigns (created_by);

-- vendors.profile_id — vendor resolution at every login
-- Profile→vendor is 1:1 in practice, so a UNIQUE constraint would be ideal,
-- but it would require deduplication first. For now a plain btree is enough.
CREATE INDEX IF NOT EXISTS idx_vendors_profile_id
  ON public.vendors (profile_id);

-- vendors.category — directory filtering by category
CREATE INDEX IF NOT EXISTS idx_vendors_category
  ON public.vendors (category);
