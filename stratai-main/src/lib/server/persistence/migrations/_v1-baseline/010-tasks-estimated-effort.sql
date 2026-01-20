-- Migration 010: Add estimated_effort column to tasks table
-- Estimated effort helps users plan their day by knowing how long tasks might take

-- Add estimated_effort column
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS estimated_effort VARCHAR(20);

-- Add comment for documentation
COMMENT ON COLUMN tasks.estimated_effort IS 'Estimated effort: quick (<15m), short (<1h), medium (1-4h), long (4h+), multi_day';

-- Create index for filtering by effort (optional, but useful for "what can I do in 15 min?" queries)
CREATE INDEX IF NOT EXISTS idx_tasks_estimated_effort ON tasks(estimated_effort) WHERE estimated_effort IS NOT NULL;
