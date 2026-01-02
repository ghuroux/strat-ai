-- Migration 005: Rename focus_areas to areas and migrate conversations
-- Part of Areas Architecture Redesign (Phase 6)
--
-- This migration:
-- 1. Renames focus_areas table to areas
-- 2. Renames focus_area_id to area_id in conversations
-- 3. Creates General areas for system spaces
-- 4. Migrates orphan conversations to General areas

-- ============================================================================
-- STEP 1: Rename focus_areas table to areas
-- ============================================================================

-- Drop old trigger first
DROP TRIGGER IF EXISTS focus_areas_updated_at ON focus_areas;

-- Rename the table
ALTER TABLE focus_areas RENAME TO areas;

-- Rename primary key constraint
ALTER INDEX focus_areas_pkey RENAME TO areas_pkey;

-- Rename unique constraint
ALTER INDEX focus_areas_space_id_name_user_id_key RENAME TO areas_space_id_name_user_id_key;

-- Rename indexes
ALTER INDEX idx_focus_areas_space RENAME TO idx_areas_space;
ALTER INDEX idx_focus_areas_user RENAME TO idx_areas_user;
ALTER INDEX idx_focus_areas_order RENAME TO idx_areas_order;
ALTER INDEX idx_focus_areas_slug RENAME TO idx_areas_slug;
ALTER INDEX idx_focus_areas_general RENAME TO idx_areas_general;

-- Create new trigger with correct name
CREATE OR REPLACE FUNCTION update_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW
  EXECUTE FUNCTION update_areas_updated_at();

-- Drop old function
DROP FUNCTION IF EXISTS update_focus_areas_updated_at();

-- ============================================================================
-- STEP 2: Rename focus_area_id to area_id in conversations
-- ============================================================================

-- Rename the column
ALTER TABLE conversations RENAME COLUMN focus_area_id TO area_id;

-- Rename the index
ALTER INDEX idx_conversations_focus_area RENAME TO idx_conversations_area;

-- ============================================================================
-- STEP 3: Create General areas for system spaces
-- ============================================================================

-- Ensure General areas exist for all system spaces
-- Using 'admin' as the default user_id for POC phase

INSERT INTO areas (id, space_id, name, slug, is_general, order_index, user_id, created_at, updated_at)
VALUES
  ('work-general', 'work', 'General', 'general', true, 0, 'admin', NOW(), NOW()),
  ('research-general', 'research', 'General', 'general', true, 0, 'admin', NOW(), NOW()),
  ('random-general', 'random', 'General', 'general', true, 0, 'admin', NOW(), NOW()),
  ('personal-general', 'personal', 'General', 'general', true, 0, 'admin', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: Migrate orphan conversations to General areas
-- ============================================================================

-- Migrate conversations that have space_id but no area_id (and no task_id)
-- to the General area of their space
UPDATE conversations c
SET area_id = (
  SELECT a.id
  FROM areas a
  WHERE a.space_id = c.space_id
    AND a.is_general = true
    AND a.deleted_at IS NULL
    AND a.user_id = COALESCE(c.user_id, 'admin')
  LIMIT 1
)
WHERE c.space_id IS NOT NULL
  AND c.area_id IS NULL
  AND c.task_id IS NULL
  AND c.deleted_at IS NULL;

-- For conversations without matching user, try with 'admin'
UPDATE conversations c
SET area_id = (
  SELECT a.id
  FROM areas a
  WHERE a.space_id = c.space_id
    AND a.is_general = true
    AND a.deleted_at IS NULL
    AND a.user_id = 'admin'
  LIMIT 1
)
WHERE c.space_id IS NOT NULL
  AND c.area_id IS NULL
  AND c.task_id IS NULL
  AND c.deleted_at IS NULL;

-- ============================================================================
-- STEP 5: Add foreign key constraint (optional, for referential integrity)
-- ============================================================================

-- Add FK from conversations.area_id to areas.id
-- Note: This may fail if there are area_ids that don't exist in areas table
-- ALTER TABLE conversations
--   ADD CONSTRAINT fk_conversations_area
--   FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count areas by space
SELECT 'Areas by space' as check_type, space_id, COUNT(*) as count,
       SUM(CASE WHEN is_general THEN 1 ELSE 0 END) as general_count
FROM areas
WHERE deleted_at IS NULL
GROUP BY space_id
ORDER BY space_id;

-- Count remaining orphan conversations (should be 0)
SELECT 'Remaining orphan conversations' as check_type,
       COUNT(*) as count
FROM conversations
WHERE space_id IS NOT NULL
  AND area_id IS NULL
  AND task_id IS NULL
  AND deleted_at IS NULL;

-- Sample of migrated conversations
SELECT 'Sample migrated conversations' as check_type,
       c.id, c.title, c.space_id, c.area_id, a.name as area_name
FROM conversations c
LEFT JOIN areas a ON c.area_id = a.id
WHERE c.space_id IS NOT NULL
  AND c.deleted_at IS NULL
LIMIT 10;
