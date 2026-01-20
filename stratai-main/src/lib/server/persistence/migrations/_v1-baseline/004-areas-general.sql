-- Migration 004: Areas - Add is_general and slug columns, create General areas
-- Part of Areas Architecture Redesign (Phase 2)

-- Step 1: Add new columns to focus_areas table
ALTER TABLE focus_areas ADD COLUMN IF NOT EXISTS is_general BOOLEAN DEFAULT FALSE;
ALTER TABLE focus_areas ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Generate slugs for existing focus areas
UPDATE focus_areas
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Clean up leading/trailing hyphens from slugs
UPDATE focus_areas
SET slug = TRIM(BOTH '-' FROM slug)
WHERE slug LIKE '-%' OR slug LIKE '%-';

-- Step 3: Add unique constraint on slug per space per user
-- First, handle any duplicate slugs by appending a number
DO $$
DECLARE
    rec RECORD;
    counter INTEGER;
    new_slug TEXT;
BEGIN
    FOR rec IN (
        SELECT id, space_id, user_id, slug,
               ROW_NUMBER() OVER (PARTITION BY space_id, user_id, slug ORDER BY created_at) as rn
        FROM focus_areas
        WHERE deleted_at IS NULL
    ) LOOP
        IF rec.rn > 1 THEN
            new_slug := rec.slug || '-' || rec.rn::TEXT;
            UPDATE focus_areas SET slug = new_slug WHERE id = rec.id;
        END IF;
    END LOOP;
END $$;

-- Create unique index on slug per space per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_areas_slug
ON focus_areas(space_id, slug, user_id)
WHERE deleted_at IS NULL;

-- Step 4: Create General areas for all existing spaces
-- For system spaces (work, research, random, personal)
INSERT INTO focus_areas (id, space_id, name, slug, is_general, order_index, user_id, created_at, updated_at)
SELECT DISTINCT
    space_id || '-' || user_id || '-general' as id,
    space_id,
    'General' as name,
    'general' as slug,
    TRUE as is_general,
    0 as order_index,
    user_id,
    NOW() as created_at,
    NOW() as updated_at
FROM focus_areas
WHERE deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM focus_areas fa2
    WHERE fa2.space_id = focus_areas.space_id
      AND fa2.user_id = focus_areas.user_id
      AND fa2.is_general = TRUE
      AND fa2.deleted_at IS NULL
  )
ON CONFLICT DO NOTHING;

-- Also create General areas for spaces from the spaces table that don't have any focus areas yet
INSERT INTO focus_areas (id, space_id, name, slug, is_general, order_index, user_id, created_at, updated_at)
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
    SELECT 1 FROM focus_areas fa
    WHERE fa.space_id = s.id
      AND fa.user_id = s.user_id
      AND fa.is_general = TRUE
      AND fa.deleted_at IS NULL
  )
ON CONFLICT DO NOTHING;

-- Step 5: Update order_index for existing non-general focus areas to be after General (order_index > 0)
UPDATE focus_areas
SET order_index = order_index + 1
WHERE is_general = FALSE
  AND order_index = 0
  AND deleted_at IS NULL;

-- Step 6: Make slug NOT NULL after populating
-- Note: Run this only after confirming all rows have slugs
-- ALTER TABLE focus_areas ALTER COLUMN slug SET NOT NULL;

-- Index for General area lookups
CREATE INDEX IF NOT EXISTS idx_focus_areas_general
ON focus_areas(space_id, user_id, is_general)
WHERE is_general = TRUE AND deleted_at IS NULL;

-- Verify migration
SELECT
    'Focus areas with is_general=TRUE' as check_type,
    COUNT(*) as count
FROM focus_areas
WHERE is_general = TRUE AND deleted_at IS NULL
UNION ALL
SELECT
    'Focus areas with slug' as check_type,
    COUNT(*) as count
FROM focus_areas
WHERE slug IS NOT NULL AND deleted_at IS NULL;
