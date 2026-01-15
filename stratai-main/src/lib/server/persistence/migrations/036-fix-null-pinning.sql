-- Migration 036: Fix NULL is_pinned values
-- Ensures all spaces have explicit is_pinned values (not NULL)
-- This fixes the frontend/backend count mismatch for pinned spaces

-- ============================================
-- 1. FIX SPACES TABLE
-- ============================================
-- Set is_pinned = true for all owned spaces where it's NULL
-- (They should have been set by migration 034's DEFAULT, but may have been missed)

UPDATE spaces
SET is_pinned = true
WHERE is_pinned IS NULL
  AND deleted_at IS NULL;

-- Make the column NOT NULL with a default going forward
ALTER TABLE spaces
ALTER COLUMN is_pinned SET DEFAULT true;

ALTER TABLE spaces
ALTER COLUMN is_pinned SET NOT NULL;

-- ============================================
-- 2. FIX SPACE_MEMBERSHIPS TABLE
-- ============================================
-- Set is_pinned = false for all memberships where it's NULL
-- (Memberships default to unpinned)

UPDATE space_memberships
SET is_pinned = false
WHERE is_pinned IS NULL;

-- Make the column NOT NULL with a default going forward
ALTER TABLE space_memberships
ALTER COLUMN is_pinned SET DEFAULT false;

ALTER TABLE space_memberships
ALTER COLUMN is_pinned SET NOT NULL;

-- ============================================
-- 3. VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:
--
-- Check for any NULL is_pinned in spaces (should be 0):
-- SELECT COUNT(*) FROM spaces WHERE is_pinned IS NULL;
--
-- Check for any NULL is_pinned in space_memberships (should be 0):
-- SELECT COUNT(*) FROM space_memberships WHERE is_pinned IS NULL;
--
-- Check pinned counts per user:
-- SELECT u.email,
--        (SELECT COUNT(*) FROM spaces s WHERE s.user_id = u.id AND s.is_pinned = true AND s.deleted_at IS NULL) as owned_pinned,
--        (SELECT COUNT(*) FROM space_memberships sm WHERE sm.user_id = u.id AND sm.is_pinned = true) as membership_pinned
-- FROM users u;
