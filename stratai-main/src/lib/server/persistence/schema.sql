-- StratAI Conversations Schema
-- PostgreSQL 18+ with JSONB for messages
-- Created: 2024-12

-- Enable UUID extension (for uuid_generate_v4 if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conversations table with embedded JSONB messages
CREATE TABLE IF NOT EXISTS conversations (
    -- Primary key (text UUID for flexibility)
    id TEXT PRIMARY KEY,

    -- Core fields
    title TEXT NOT NULL DEFAULT 'New Chat',
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',

    -- Messages stored as JSONB array
    -- Each message: {id, role, content, timestamp, thinking?, attachments?, sources?, etc.}
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Metadata
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    summary JSONB, -- Can be structured {points: []} or legacy string

    -- Context continuation fields
    continued_from_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
    continuation_summary TEXT,
    refreshed_at TIMESTAMPTZ,

    -- Multi-tenant fields (nullable for Phase 0.2, required later)
    user_id TEXT, -- Will become NOT NULL in Phase 0.4
    team_id TEXT,
    space TEXT, -- 'work', 'research', 'random', 'personal'
    tags TEXT[] DEFAULT '{}', -- For template auto-tagging and filtering (Phase 0.3b+)

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete

    -- Constraints
    CONSTRAINT valid_space CHECK (space IS NULL OR space IN ('work', 'research', 'random', 'personal'))
);

-- Indexes for common queries
-- User's conversations (filtered by user, ordered by update)
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
    ON conversations(user_id, updated_at DESC)
    WHERE deleted_at IS NULL;

-- Pinned conversations
CREATE INDEX IF NOT EXISTS idx_conversations_pinned
    ON conversations(user_id, pinned, updated_at DESC)
    WHERE deleted_at IS NULL AND pinned = TRUE;

-- Team conversations
CREATE INDEX IF NOT EXISTS idx_conversations_team
    ON conversations(team_id, updated_at DESC)
    WHERE deleted_at IS NULL;

-- GIN index on messages for full-text search in message content
-- This enables fast searches like: messages @> '[{"content": "search term"}]'
CREATE INDEX IF NOT EXISTS idx_conversations_messages_gin
    ON conversations USING GIN (messages jsonb_path_ops);

-- Continuation chain lookups
CREATE INDEX IF NOT EXISTS idx_conversations_continued_from
    ON conversations(continued_from_id)
    WHERE continued_from_id IS NOT NULL;

-- Space filtering (for Phase 0.3a Spaces)
CREATE INDEX IF NOT EXISTS idx_conversations_space
    ON conversations(user_id, space, updated_at DESC)
    WHERE deleted_at IS NULL AND space IS NOT NULL;

-- Tags filtering with GIN index for array containment queries (Phase 0.3b+)
CREATE INDEX IF NOT EXISTS idx_conversations_tags
    ON conversations USING GIN (tags)
    WHERE deleted_at IS NULL;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment on table for documentation
COMMENT ON TABLE conversations IS 'Chat conversations with embedded JSONB messages. Supports soft deletes and multi-tenant access patterns.';
COMMENT ON COLUMN conversations.messages IS 'Array of message objects: [{id, role, content, timestamp, thinking?, attachments?, sources?}]';
COMMENT ON COLUMN conversations.summary IS 'Conversation summary - either structured {points: [{text, messageIndices}]} or legacy string';
COMMENT ON COLUMN conversations.space IS 'Productivity space: work, research, random, or personal';
