-- Tasks Schema for Phase 0.3c+: Task Lifecycle Foundation with Subtasks
-- Central hub for all productivity assists

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'deferred')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  color TEXT NOT NULL,

  -- Due dates with hard/soft distinction
  due_date TIMESTAMPTZ,
  due_date_type TEXT CHECK (due_date_type IN ('hard', 'soft')),

  -- Completion tracking
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,

  -- Source tracking (which assist/feature created this task)
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('assist', 'meeting', 'chat', 'manual')),
  source_assist_id TEXT,
  source_conversation_id TEXT,

  -- Linked conversations (for task-conversation relationship)
  linked_conversation_ids TEXT[] DEFAULT '{}',

  -- Subtask support (Phase 0.3d++)
  parent_task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  subtask_type TEXT DEFAULT 'conversation' CHECK (subtask_type IN ('conversation', 'action')),
  subtask_order INTEGER DEFAULT 0,
  context_summary TEXT,

  -- Space and user scoping
  space TEXT NOT NULL CHECK (space IN ('work', 'research', 'random', 'personal')),
  user_id TEXT NOT NULL,

  -- Timestamps
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Index for fetching user's tasks in a space (most common query)
CREATE INDEX IF NOT EXISTS idx_tasks_user_space ON tasks(user_id, space) WHERE deleted_at IS NULL;

-- Index for fetching user's tasks by status
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status) WHERE deleted_at IS NULL;

-- Index for fetching active tasks (for badge count, greetings)
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(user_id, space, status) WHERE deleted_at IS NULL AND status = 'active';

-- Index for fetching subtasks of a parent task
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id, subtask_order) WHERE parent_task_id IS NOT NULL AND deleted_at IS NULL;

-- Index for checking if a task has subtasks
CREATE INDEX IF NOT EXISTS idx_tasks_has_subtasks ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL AND deleted_at IS NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();
