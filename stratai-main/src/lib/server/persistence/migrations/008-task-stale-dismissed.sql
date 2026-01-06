-- Migration: Add stale_dismissed_at column to tasks
-- Purpose: Track when users dismiss stale task warnings to prevent nagging

-- Add stale_dismissed_at column for tracking stale warning dismissals
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stale_dismissed_at TIMESTAMPTZ;

-- Add comment explaining the field
COMMENT ON COLUMN tasks.stale_dismissed_at IS 'Timestamp when user dismissed the stale warning. Reset when there is new activity on the task.';
