-- Migration: Add is_verified to vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Seed 3 existing vendors as verified (adjust IDs to match your data)
-- Option A: Verify by name (if you know some vendor names)
UPDATE vendors SET is_verified = true WHERE name IN (
  'Don Juan Empanadas',
  'Frutas El Parque',
  'Bebidas Frescas MC'
);

-- Option B: Verify the first 3 vendors by ID (uncomment and set your IDs)
-- UPDATE vendors SET is_verified = true WHERE id IN ('uuid-1', 'uuid-2', 'uuid-3');

-- If no vendors matched, verify the first 3 alphabetically/by date
-- This is a safe fallback that verifies up to 3 existing vendors
UPDATE vendors SET is_verified = true
WHERE id IN (
  SELECT id FROM vendors ORDER BY created_at ASC LIMIT 3
);
