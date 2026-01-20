-- Migration 038: Reduce System Spaces to Personal Only
--
-- Based on user feedback: too many auto-created spaces confuses new users.
-- New users should only get:
--   1. Personal space (system space, owned)
--   2. Org Space (if they belong to an org, via membership)
--
-- This migration soft-deletes Work, Research, and Random system spaces.
-- Personal remains as the only system space.
--
-- Note: space_memberships have ON DELETE CASCADE, but since we're soft-deleting
-- (not hard deleting), we need to also remove the associated memberships.

-- ============================================
-- 1. SOFT DELETE WORK, RESEARCH, RANDOM SPACES
-- ============================================

UPDATE spaces
SET deleted_at = NOW(), updated_at = NOW()
WHERE type = 'system'
  AND slug IN ('work', 'research', 'random')
  AND deleted_at IS NULL;

-- ============================================
-- 2. REMOVE ASSOCIATED SPACE MEMBERSHIPS
-- ============================================
-- Since we soft-deleted (not hard deleted), the cascade doesn't trigger.
-- We need to explicitly remove memberships to these deleted spaces.

DELETE FROM space_memberships
WHERE space_id IN (
    SELECT id FROM spaces
    WHERE type = 'system'
      AND slug IN ('work', 'research', 'random')
      AND deleted_at IS NOT NULL
);

-- ============================================
-- 3. MOVE CONVERSATIONS FROM DELETED SPACES TO PERSONAL
-- ============================================
-- Any conversations in Work/Research/Random should be moved to Personal
-- to prevent orphaned data

UPDATE conversations c
SET space_id = personal_space.id,
    updated_at = NOW()
FROM (
    SELECT id, user_id FROM spaces
    WHERE type = 'system'
      AND slug = 'personal'
      AND deleted_at IS NULL
) personal_space
WHERE c.space_id IN (
    SELECT id FROM spaces
    WHERE type = 'system'
      AND slug IN ('work', 'research', 'random')
      AND deleted_at IS NOT NULL
)
AND c.user_id::text = personal_space.user_id::text;

-- ============================================
-- 4. MOVE DOCUMENTS FROM DELETED SPACES TO PERSONAL
-- ============================================

UPDATE documents d
SET space_id = personal_space.id,
    updated_at = NOW()
FROM (
    SELECT id, user_id FROM spaces
    WHERE type = 'system'
      AND slug = 'personal'
      AND deleted_at IS NULL
) personal_space
WHERE d.space_id IN (
    SELECT id FROM spaces
    WHERE type = 'system'
      AND slug IN ('work', 'research', 'random')
      AND deleted_at IS NOT NULL
)
AND d.user_id::text = personal_space.user_id::text;

-- ============================================
-- 5. MOVE TASKS FROM DELETED SPACES TO PERSONAL
-- ============================================

UPDATE tasks t
SET space_id = personal_space.id,
    updated_at = NOW()
FROM (
    SELECT id, user_id FROM spaces
    WHERE type = 'system'
      AND slug = 'personal'
      AND deleted_at IS NULL
) personal_space
WHERE t.space_id IN (
    SELECT id FROM spaces
    WHERE type = 'system'
      AND slug IN ('work', 'research', 'random')
      AND deleted_at IS NOT NULL
)
AND t.user_id::text = personal_space.user_id::text;

-- ============================================
-- 6. SOFT-DELETE AREAS FROM DELETED SPACES
-- ============================================
-- Instead of moving areas (which could cause slug conflicts),
-- we soft-delete them along with their parent spaces.
-- Content in these areas (conversations) was already moved in step 3.

UPDATE areas
SET deleted_at = NOW(), updated_at = NOW()
WHERE space_id IN (
    SELECT id FROM spaces
    WHERE type = 'system'
      AND slug IN ('work', 'research', 'random')
      AND deleted_at IS NOT NULL
)
AND deleted_at IS NULL;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================
--
-- Check that Work, Research, Random are deleted:
-- SELECT id, name, slug, type, deleted_at FROM spaces
-- WHERE slug IN ('work', 'research', 'random') ORDER BY slug;
--
-- Check that Personal spaces still exist:
-- SELECT COUNT(*) FROM spaces WHERE slug = 'personal' AND deleted_at IS NULL;
--
-- Check no orphaned space_memberships:
-- SELECT COUNT(*) FROM space_memberships sm
-- WHERE NOT EXISTS (
--     SELECT 1 FROM spaces s
--     WHERE s.id = sm.space_id AND s.deleted_at IS NULL
-- );
