-- Migration 026: Fix General areas for all users
--
-- Issues being fixed:
-- 1. The unique index idx_areas_slug on (space_id, slug, user_id) is missing
-- 2. Existing users may not have General areas in their spaces
-- 3. The createGeneral code relies on ON CONFLICT which doesn't work without the index

-- ============================================================================
-- STEP 1: Add the missing unique index
-- ============================================================================

-- This index is required for ON CONFLICT (space_id, slug, user_id) to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_slug
ON areas(space_id, slug, user_id)
WHERE deleted_at IS NULL;

-- ============================================================================
-- STEP 2: Create General areas for ALL spaces that don't have one
-- ============================================================================

-- For each space that doesn't have a General area, create one
INSERT INTO areas (id, space_id, name, slug, is_general, order_index, user_id, created_at, updated_at)
SELECT
    s.id || '-' || s.user_id || '-general' as id,
    s.id as space_id,
    'General' as name,
    'general' as slug,
    TRUE as is_general,
    0 as order_index,
    s.user_id,
    NOW() as created_at,
    NOW() as updated_at
FROM spaces s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM areas a
    WHERE a.space_id = s.id
      AND a.user_id = s.user_id
      AND a.is_general = TRUE
      AND a.deleted_at IS NULL
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

-- Show spaces without General areas (should be 0 after migration)
SELECT 'Spaces without General areas' as check_type,
       s.id as space_id,
       s.name as space_name,
       s.user_id
FROM spaces s
WHERE s.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM areas a
    WHERE a.space_id = s.id
      AND a.user_id = s.user_id
      AND a.is_general = TRUE
      AND a.deleted_at IS NULL
  );

-- Count General areas per user
SELECT 'General areas per user' as check_type,
       u.display_name,
       u.id as user_id,
       COUNT(a.id) as general_area_count
FROM users u
LEFT JOIN areas a ON a.user_id = u.id AND a.is_general = TRUE AND a.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.display_name;
