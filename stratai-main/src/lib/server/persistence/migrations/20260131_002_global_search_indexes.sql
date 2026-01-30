-- Global Search: Full-text search indexes for Cmd+K search
-- Enables fast search across tasks and documents (pages already has idx_pages_search)

-- Tasks: search across title, description, and completion notes
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING GIN(
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
) WHERE deleted_at IS NULL;

-- Documents: search across filename, title, summary (not full content — too large for GIN)
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN(
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(filename, '') || ' ' || COALESCE(summary, ''))
) WHERE deleted_at IS NULL;

-- Conversations: search across title (lightweight — most search value is in title)
CREATE INDEX IF NOT EXISTS idx_conversations_search ON conversations USING GIN(
    to_tsvector('english', COALESCE(title, ''))
) WHERE deleted_at IS NULL;
