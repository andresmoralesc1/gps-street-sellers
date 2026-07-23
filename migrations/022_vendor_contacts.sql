-- M-001 D: Vendor contact audit trail.
-- Records every time a buyer clicks "Llamar" / "WhatsApp" / "Cómo llegar"
-- on a vendor. Enables:
--   * Analytics: "how often does vendor X receive contact attempts?"
--   * Spam detection: 1000 attempts/hour from one IP = bot.
--   * Trust: vendor sees their own stats in /dashboard.
--   * Compliance: immutable audit trail (no UPDATE / DELETE in the API).
--
-- buyer_id is NULL for guest visitors — we still log the IP/UA.
-- contact_type matches the CTAs in VendorContactActions.tsx.
--
-- Run: psql ... -f migrations/022_vendor_contacts.sql
-- Or:  npm run migrate

CREATE TABLE IF NOT EXISTS vendor_contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  -- NULL for guest visitors; ON DELETE SET NULL preserves the audit row
  -- even if the buyer account is deleted (compliance + analytics).
  buyer_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  contact_type  varchar(20) NOT NULL
                CHECK (contact_type IN ('call', 'whatsapp', 'directions')),
  ip_address    inet,
  user_agent    text,
  created_at    timestamp with time zone NOT NULL DEFAULT now()
);

-- Most common query: "show me vendor X's contacts in the last 30 days".
CREATE INDEX IF NOT EXISTS vendor_contacts_vendor_created_idx
  ON vendor_contacts (vendor_id, created_at DESC);

-- Spam detection: rate-limit one IP across all vendors.
CREATE INDEX IF NOT EXISTS vendor_contacts_ip_created_idx
  ON vendor_contacts (ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;

-- "Per-buyer engagement" — useful for recommendation ML later.
CREATE INDEX IF NOT EXISTS vendor_contacts_buyer_created_idx
  ON vendor_contacts (buyer_id, created_at DESC)
  WHERE buyer_id IS NOT NULL;
