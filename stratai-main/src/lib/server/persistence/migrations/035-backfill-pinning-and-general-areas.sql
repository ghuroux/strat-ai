-- Migration 035: Backfill Pinning and General Areas
-- Run AFTER 034-space-pinning.sql
-- Fixes existing data for users who had space memberships before pinning feature

-- ============================================
-- 1. BACKFILL: PIN FIRST MEMBERSHIP PER USER
-- ============================================
-- Users with only invited spaces (no owned spaces) need at least one pinned
-- This pins their first membership if they have < 6 total pinned spaces

WITH user_pinned_counts AS (
    -- Count how many spaces each user has pinned (owned + invited)
    SELECT user_id, COUNT(*) as pinned_count
    FROM (
        SELECT user_id FROM spaces WHERE deleted_at IS NULL AND is_pinned = true
        UNION ALL
        SELECT user_id FROM space_memberships WHERE is_pinned = true
    ) pinned
    GROUP BY user_id
),
first_membership_per_user AS (
    -- Get each user's first (oldest) space membership
    SELECT DISTINCT ON (user_id) id, user_id
    FROM space_memberships
    ORDER BY user_id, created_at ASC
)
UPDATE space_memberships sm
SET is_pinned = true
FROM first_membership_per_user fmu
LEFT JOIN user_pinned_counts upc ON fmu.user_id = upc.user_id
WHERE sm.id = fmu.id
  AND sm.is_pinned = false
  AND COALESCE(upc.pinned_count, 0) < 6;

-- ============================================
-- 2. BACKFILL: CREATE GENERAL AREAS FOR SPACES WITHOUT THEM
-- ============================================
-- Some spaces were created before General area auto-creation was added
-- This ensures every non-deleted space has a General area

INSERT INTO areas (id, space_id, name, slug, color, is_general, order_index, user_id, created_at, updated_at)
SELECT
    'area_' || substr(md5(random()::text), 1, 20),
    s.id,
    'General',
    'general',
    COALESCE(s.color, '#6366f1'),
    true,
    0,
    s.user_id,
    NOW(),
    NOW()
FROM spaces s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM areas fa
    WHERE fa.space_id = s.id AND fa.is_general = true
  );

-- ============================================
-- 3. VERIFICATION QUERIES (for manual inspection)
-- ============================================
-- Run these after migration to verify:
--
-- Check users with 0 pinned spaces (should be 0 after backfill):
-- SELECT u.id, u.email, u.display_name
-- FROM users u
-- WHERE NOT EXISTS (
--     SELECT 1 FROM spaces s WHERE s.user_id = u.id AND s.deleted_at IS NULL AND s.is_pinned = true
-- )
-- AND NOT EXISTS (
--     SELECT 1 FROM space_memberships sm WHERE sm.user_id = u.id AND sm.is_pinned = true
-- );
--
-- Check spaces without General areas (should be 0 after backfill):
-- SELECT s.id, s.name FROM spaces s
-- WHERE s.deleted_at IS NULL
--   AND NOT EXISTS (SELECT 1 FROM focus_areas fa WHERE fa.space_id = s.id AND fa.is_general = true);
