-- Migration 009: Normalize space_id values in areas, tasks, and conversations tables
--
-- Problem: Legacy data used space slugs (e.g., 'work') as space_id,
-- but the spaces table uses proper IDs (e.g., 'sp_1766329543471_qr47k5q').
--
-- This migration updates areas, tasks, and conversations to use proper space IDs.
-- Special handling for duplicate General areas (both slug and proper ID versions exist).

-- Step 1: Soft-delete duplicate General areas with slug-based space_id
-- (Keep the ones with proper space_id)
UPDATE areas a
SET deleted_at = NOW()
WHERE a.is_general = true
  AND a.space_id NOT LIKE 'sp_%'
  AND a.deleted_at IS NULL
  AND EXISTS (
    -- Only delete if there's already a General area with proper ID for this space
    SELECT 1 FROM areas a2
    JOIN spaces s ON a2.space_id = s.id
    WHERE a2.is_general = true
      AND s.slug = a.space_id
      AND a2.deleted_at IS NULL
  );

-- Step 2: Update non-General areas - convert slug-based space_id to proper ID
UPDATE areas a
SET space_id = s.id
FROM spaces s
WHERE a.space_id = s.slug
  AND a.space_id != s.id
  AND a.is_general = false
  AND a.deleted_at IS NULL;

-- Step 3: Update remaining General areas with slug-based space_id
-- (For cases where there's no proper-ID version)
UPDATE areas a
SET space_id = s.id
FROM spaces s
WHERE a.space_id = s.slug
  AND a.space_id != s.id
  AND a.is_general = true
  AND a.deleted_at IS NULL;

-- Step 4: Update tasks table - convert slug-based space_id to proper ID
UPDATE tasks t
SET space_id = s.id
FROM spaces s
WHERE t.space_id = s.slug
  AND t.space_id != s.id
  AND t.deleted_at IS NULL;

-- Step 5: Clean up orphaned areas with invalid space_id
-- (Areas where space_id doesn't match any space)
UPDATE areas
SET deleted_at = NOW()
WHERE space_id NOT IN (SELECT id FROM spaces WHERE deleted_at IS NULL)
  AND space_id NOT IN (SELECT slug FROM spaces WHERE deleted_at IS NULL)
  AND deleted_at IS NULL;

-- Step 6: Clean up orphaned tasks with invalid space_id
UPDATE tasks
SET deleted_at = NOW()
WHERE space_id NOT IN (SELECT id FROM spaces WHERE deleted_at IS NULL)
  AND space_id NOT IN (SELECT slug FROM spaces WHERE deleted_at IS NULL)
  AND deleted_at IS NULL;

-- Step 7: Update conversations table - convert slug-based space_id to proper ID
UPDATE conversations c
SET space_id = s.id
FROM spaces s
WHERE c.space_id = s.slug
  AND c.space_id != s.id
  AND c.deleted_at IS NULL;

-- Step 8: Clean up orphaned conversations with invalid space_id
-- (Don't delete conversations with NULL space_id - those are valid legacy conversations)
UPDATE conversations
SET deleted_at = NOW()
WHERE space_id IS NOT NULL
  AND space_id != ''
  AND space_id NOT IN (SELECT id FROM spaces WHERE deleted_at IS NULL)
  AND space_id NOT IN (SELECT slug FROM spaces WHERE deleted_at IS NULL)
  AND deleted_at IS NULL;
