-- Migration: Add source_meeting_id to tasks table
-- Links tasks to the meeting that created them (meeting preparation tasks)
--
-- Rollback: ALTER TABLE tasks DROP COLUMN IF EXISTS source_meeting_id;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_meeting_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_source_meeting
  ON tasks(source_meeting_id)
  WHERE source_meeting_id IS NOT NULL AND deleted_at IS NULL;
