-- Migration 014: Add last_viewed_at column to conversations
-- This tracks when the user last opened/viewed a conversation
-- Used for "Recent Conversations" sorting (instead of updated_at)

-- Add the column
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Set initial values: For existing conversations, use updated_at as the baseline
-- (we don't have historical view data, so this is the best approximation)
UPDATE conversations
SET last_viewed_at = updated_at
WHERE last_viewed_at IS NULL;

-- Add index for sorting by last viewed
CREATE INDEX IF NOT EXISTS idx_conversations_last_viewed
    ON conversations(user_id, last_viewed_at DESC NULLS LAST)
    WHERE deleted_at IS NULL;

-- Add index for space + last viewed (for Recent Conversations in space dashboard)
CREATE INDEX IF NOT EXISTS idx_conversations_space_last_viewed
    ON conversations(user_id, space_id, last_viewed_at DESC NULLS LAST)
    WHERE deleted_at IS NULL AND space_id IS NOT NULL;

COMMENT ON COLUMN conversations.last_viewed_at IS 'Timestamp when user last opened/viewed this conversation. Used for Recent Conversations sorting.';
