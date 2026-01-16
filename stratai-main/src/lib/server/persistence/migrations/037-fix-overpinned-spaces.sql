-- Migration 037: Fix Over-Pinned Spaces
-- Migration 036 set ALL spaces with NULL is_pinned to TRUE
-- This caused all users to have all their spaces pinned (hitting the max 6 limit)
--
-- Fix: Unpin system spaces, keep only custom spaces pinned
-- Rationale: Custom spaces are user-created and more likely to be important

-- ============================================
-- 1. UNPIN ALL SYSTEM SPACES
-- ============================================
-- System spaces (Work, Research, Random, Personal) are always available
-- Users can manually pin them if they want

UPDATE spaces
SET is_pinned = false, updated_at = NOW()
WHERE type = 'system'
  AND deleted_at IS NULL;

-- ============================================
-- 2. ENSURE CUSTOM SPACES STAY PINNED (up to 6)
-- ============================================
-- Custom spaces remain pinned (migration 036 already set them to true)
-- No action needed - they're already pinned

-- ============================================
-- 3. FOR USERS WITH NO CUSTOM SPACES, PIN FIRST SYSTEM SPACE
-- ============================================
-- Users who only have system spaces should have at least one pinned

WITH users_with_no_pinned AS (
    SELECT DISTINCT u.id as user_id
    FROM users u
    WHERE NOT EXISTS (
        -- No pinned owned spaces
        SELECT 1 FROM spaces s
        WHERE s.user_id = u.id
          AND s.is_pinned = true
          AND s.deleted_at IS NULL
    )
    AND NOT EXISTS (
        -- No pinned memberships
        SELECT 1 FROM space_memberships sm
        WHERE sm.user_id = u.id
          AND sm.is_pinned = true
    )
),
first_space_per_user AS (
    SELECT DISTINCT ON (s.user_id) s.id, s.user_id
    FROM spaces s
    WHERE s.deleted_at IS NULL
    ORDER BY s.user_id, s.order_index ASC, s.created_at ASC
)
UPDATE spaces s
SET is_pinned = true, updated_at = NOW()
FROM users_with_no_pinned u
JOIN first_space_per_user f ON f.user_id = u.user_id
WHERE s.id = f.id;

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================
-- Run after migration to verify:
--
-- Check pinned counts per user (should be <= 6 for all):
-- SELECT u.email,
--        (SELECT COUNT(*) FROM spaces s WHERE s.user_id = u.id AND s.is_pinned = true AND s.deleted_at IS NULL) as owned_pinned,
--        (SELECT COUNT(*) FROM space_memberships sm WHERE sm.user_id = u.id AND sm.is_pinned = true) as membership_pinned
-- FROM users u
-- ORDER BY owned_pinned DESC;
--
-- Check no system spaces are pinned:
-- SELECT COUNT(*) FROM spaces WHERE type = 'system' AND is_pinned = true AND deleted_at IS NULL;
-- Should be 0 (or small number if step 3 pinned some for users with no custom spaces)
