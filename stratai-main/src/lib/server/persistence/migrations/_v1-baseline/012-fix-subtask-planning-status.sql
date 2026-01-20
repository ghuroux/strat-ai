-- Migration 012: Fix subtasks incorrectly in planning status
--
-- Subtasks should never be in 'planning' status because:
-- 1. Planning mode is for breaking down tasks into subtasks
-- 2. Subtasks cannot have children (sub-subtasks)
-- 3. This was caused by auto-trigger logic that didn't check for subtasks
--
-- This migration resets any subtasks in planning status back to active.

-- Fix subtasks with planning status
UPDATE tasks
SET
    status = 'active',
    planning_data = NULL,
    updated_at = NOW()
WHERE
    parent_task_id IS NOT NULL
    AND status = 'planning';

-- Log how many were fixed (will show in psql output)
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE 'Fixed % subtasks that were incorrectly in planning status', fixed_count;
END $$;

-- Add a comment for documentation
COMMENT ON TABLE tasks IS 'Tasks - subtask planning status bug fixed (migration 012)';
