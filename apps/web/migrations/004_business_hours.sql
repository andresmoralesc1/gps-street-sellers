-- Migration: business hours for vendors (N11)
-- Auto-toggle a vendor as "active" during business hours.

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS business_hours_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_hours_start TIME,
ADD COLUMN IF NOT EXISTS business_hours_end TIME,
ADD COLUMN IF NOT EXISTS business_days TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun']::TEXT[];

COMMENT ON COLUMN vendors.business_hours_enabled IS 'When true, vendor auto-toggles is_active based on hours/days';
COMMENT ON COLUMN vendors.business_hours_start IS 'Start of business hours (local time)';
COMMENT ON COLUMN vendors.business_hours_end IS 'End of business hours (local time). NULL = 24h.';
COMMENT ON COLUMN vendors.business_days IS 'Days of week: mon, tue, wed, thu, fri, sat, sun';

-- Index for the cron query (find vendors that should be active right now)
CREATE INDEX IF NOT EXISTS idx_vendors_business_hours_enabled ON vendors(business_hours_enabled) WHERE business_hours_enabled = TRUE;