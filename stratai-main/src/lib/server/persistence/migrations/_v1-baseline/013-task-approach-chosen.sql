-- Migration 013: Add approach_chosen_at column to tasks
--
-- Tracks when a user explicitly chose their approach for a task via the
-- Task Approach Modal (either "Work directly" or "Break into subtasks").
-- This enables showing the choice modal only on first visit.
--
-- When NULL: Task hasn't been visited yet, show approach modal
-- When set: User made a choice, proceed to work mode or planning

-- Add the column
ALTER TABLE tasks ADD COLUMN approach_chosen_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN tasks.approach_chosen_at IS 'Timestamp when user chose work/plan approach via modal. NULL = show modal on first visit.';
