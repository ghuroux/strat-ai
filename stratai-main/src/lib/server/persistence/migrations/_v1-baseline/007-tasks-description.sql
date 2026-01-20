-- Migration: Add description column to tasks
-- Purpose: Allow users to provide background context that improves AI planning quality

-- Add description column for user-provided task context/background
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN tasks.description IS 'User-provided description/background context for the task. Injected into AI prompts for better planning quality.';
