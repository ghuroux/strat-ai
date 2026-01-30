-- Migration: 20260131_001_task_assignment
-- Description: Add assignee_id to tasks for task delegation
-- Rollback: ALTER TABLE tasks DROP COLUMN IF EXISTS assignee_id;
--           DROP INDEX IF EXISTS idx_tasks_assignee;
--           DROP INDEX IF EXISTS idx_tasks_creator_delegated;

-- Add assignee_id column (who should complete the task)
ALTER TABLE tasks
ADD COLUMN assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Backfill: existing tasks assigned to their creator
UPDATE tasks SET assignee_id = user_id WHERE assignee_id IS NULL;

-- Index for "my tasks" (assigned to me) — the primary query path
CREATE INDEX idx_tasks_assignee
ON tasks(assignee_id, space_id, status) WHERE deleted_at IS NULL;

-- Index for future "delegated" view (created by me, assigned to others)
CREATE INDEX idx_tasks_creator_delegated
ON tasks(user_id, space_id) WHERE deleted_at IS NULL AND user_id != assignee_id;

-- Update email_logs CHECK constraint to include 'task_assigned'
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;
ALTER TABLE email_logs ADD CONSTRAINT email_logs_email_type_check
CHECK (email_type IN ('password_reset', 'email_verification', 'team_invite', 'space_invite', 'notification', 'welcome', 'calendar_connect', 'task_assigned'));
