-- Migration 003: Add planning status and planning_data to tasks table
-- Enables persistent Plan Mode state that survives page refreshes
--
-- Run with: psql -U stratai -d stratai -f migrations/003-planning-status.sql

-- Step 1: Update status CHECK constraint to include 'planning'
-- First drop the existing constraint, then add new one with 'planning'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('active', 'planning', 'completed', 'deferred'));

-- Step 2: Add planning_data JSONB column for storing plan mode state
-- This column stores: { phase, proposedSubtasks, conversationId, startedAt }
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planning_data JSONB;

-- Step 3: Add index for finding tasks in planning status
-- Useful for auto-restore on page load and ensuring only one task is planning
CREATE INDEX IF NOT EXISTS idx_tasks_planning
ON tasks(user_id, space_id)
WHERE status = 'planning' AND deleted_at IS NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN tasks.planning_data IS
  'JSONB storage for Plan Mode state including phase, proposedSubtasks, and conversation reference. NULL when not in planning status.';

-- Verification query (uncomment to test)
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'tasks' AND column_name = 'planning_data';
