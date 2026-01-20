-- Migration 025: Add 'document' source type for guided creation tasks
-- Allows tasks created from guided document creation to track their source

-- Drop existing constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;

-- Add updated constraint with 'document' type
ALTER TABLE tasks ADD CONSTRAINT tasks_source_type_check
  CHECK (source_type IN ('assist', 'meeting', 'chat', 'manual', 'document'));

-- Add index for finding tasks by source document
CREATE INDEX IF NOT EXISTS idx_tasks_source_document
  ON tasks(source_assist_id)
  WHERE source_type = 'document' AND deleted_at IS NULL;
