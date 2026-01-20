-- Migration 002: Convert space (slug) to space_id (foreign key)
-- This migration normalizes the space reference in conversations and tasks tables
--
-- For system spaces: id === slug (e.g., 'work', 'research')
-- For custom spaces: id is UUID, slug is user-defined
--
-- Run this AFTER spaces table is created and seeded

-- ============================================================================
-- STEP 1: Conversations Table Migration
-- ============================================================================

-- 1a. Add new space_id column (nullable initially)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS space_id TEXT;

-- 1b. Migrate existing data (space slug -> space_id)
-- For system spaces, the id equals the slug, so this is a direct copy
-- For any custom spaces (unlikely at this point), they'd need manual mapping
UPDATE conversations
SET space_id = space
WHERE space IS NOT NULL AND space_id IS NULL;

-- 1c. Add foreign key constraint (SET NULL on delete to preserve conversations)
-- Note: This requires that all space values exist in spaces table
-- The constraint is added without validation initially for safety
ALTER TABLE conversations
ADD CONSTRAINT fk_conversations_space
FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL
NOT VALID;

-- 1d. Validate the constraint (do this after verifying data)
-- ALTER TABLE conversations VALIDATE CONSTRAINT fk_conversations_space;

-- 1e. Drop the old space column and its constraint
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS valid_space;

-- 1f. Rename columns (drop old, rename new to match code expectations)
-- We keep space_id as the column name since it's a foreign key
-- The old 'space' column can be dropped after migration is verified
-- ALTER TABLE conversations DROP COLUMN IF EXISTS space;

-- 1g. Create index for space_id lookups
DROP INDEX IF EXISTS idx_conversations_space;
CREATE INDEX IF NOT EXISTS idx_conversations_space_id
ON conversations(user_id, space_id, updated_at DESC)
WHERE deleted_at IS NULL AND space_id IS NOT NULL;

-- ============================================================================
-- STEP 2: Tasks Table Migration
-- ============================================================================

-- 2a. Add new space_id column (nullable initially, will be NOT NULL after migration)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS space_id TEXT;

-- 2b. Migrate existing data
UPDATE tasks
SET space_id = space
WHERE space IS NOT NULL AND space_id IS NULL;

-- 2c. Add foreign key constraint
ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_space
FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE RESTRICT
NOT VALID;

-- 2d. Drop old constraints
-- Note: We need to handle the CHECK constraint carefully
-- The old constraint name may vary, so we use a general approach

-- 2e. Update indexes
DROP INDEX IF EXISTS idx_tasks_user_space;
CREATE INDEX IF NOT EXISTS idx_tasks_user_space_id
ON tasks(user_id, space_id) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_tasks_active;
CREATE INDEX IF NOT EXISTS idx_tasks_active_space_id
ON tasks(user_id, space_id, status)
WHERE deleted_at IS NULL AND status = 'active';

-- ============================================================================
-- STEP 3: Cleanup (run after verifying migration)
-- ============================================================================

-- These should be run manually after verifying the migration worked:

-- Validate foreign key constraints
-- ALTER TABLE conversations VALIDATE CONSTRAINT fk_conversations_space;
-- ALTER TABLE tasks VALIDATE CONSTRAINT fk_tasks_space;

-- Make space_id NOT NULL on tasks (after ensuring all rows have values)
-- ALTER TABLE tasks ALTER COLUMN space_id SET NOT NULL;

-- Drop old columns (after code is updated to use space_id)
-- ALTER TABLE conversations DROP COLUMN IF EXISTS space;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS space;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN conversations.space_id IS 'Foreign key to spaces table. For system spaces, equals the slug (work, research, random, personal). For custom spaces, is the UUID.';
COMMENT ON COLUMN tasks.space_id IS 'Foreign key to spaces table. Required for all tasks.';
