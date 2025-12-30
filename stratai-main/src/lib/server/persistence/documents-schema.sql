-- Documents Schema for Task Context System
-- Stores extracted text content for AI context (not raw binary)
-- Part of Phase 0.3e+: Task Context Linking

-- ============================================================================
-- DOCUMENTS TABLE
-- First-class persistent file storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  space_id TEXT,  -- Foreign key to spaces table (null allowed for unassigned)

  -- File metadata
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  char_count INTEGER NOT NULL,
  page_count INTEGER,

  -- Content (extracted text, NOT raw binary)
  -- This is what gets injected into AI prompts
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- SHA256 for deduplication

  -- Optional AI-enhanced fields
  title TEXT,    -- User-provided or AI-extracted
  summary TEXT,  -- AI-generated for large docs (>50k chars)
  truncated BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_user
  ON documents(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_space_id
  ON documents(user_id, space_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_hash
  ON documents(user_id, content_hash)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_updated
  ON documents(user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- TASK_DOCUMENTS JUNCTION TABLE
-- Many-to-many: Tasks <-> Documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_documents (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- Context role: how this document relates to the task
  -- reference: background/supporting material
  -- input: source data for the task
  -- output: produced by the task
  context_role TEXT NOT NULL DEFAULT 'reference'
    CHECK (context_role IN ('reference', 'input', 'output')),

  -- Optional user annotation
  context_note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each document can only be linked once to a task
  UNIQUE(task_id, document_id)
);

-- Indexes for task_documents
CREATE INDEX IF NOT EXISTS idx_task_documents_task
  ON task_documents(task_id);

CREATE INDEX IF NOT EXISTS idx_task_documents_document
  ON task_documents(document_id);

-- ============================================================================
-- RELATED_TASKS JUNCTION TABLE
-- Many-to-many: Tasks <-> Tasks (self-referential)
-- Distinct from parent_task_id hierarchy - these are peer relationships
-- ============================================================================
CREATE TABLE IF NOT EXISTS related_tasks (
  id TEXT PRIMARY KEY,
  source_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  target_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Relationship types:
  -- related: general connection
  -- blocks: source blocks target (target can't start until source done)
  -- depends_on: source depends on target (source can't start until target done)
  -- informs: output of source informs/feeds into target
  relationship_type TEXT NOT NULL DEFAULT 'related'
    CHECK (relationship_type IN ('related', 'blocks', 'depends_on', 'informs')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each pair can only have one relationship
  UNIQUE(source_task_id, target_task_id),

  -- Can't relate a task to itself
  CHECK (source_task_id != target_task_id)
);

-- Indexes for related_tasks
CREATE INDEX IF NOT EXISTS idx_related_tasks_source
  ON related_tasks(source_task_id);

CREATE INDEX IF NOT EXISTS idx_related_tasks_target
  ON related_tasks(target_task_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for documents
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE documents IS 'Persistent document storage with extracted text content for AI context injection';
COMMENT ON TABLE task_documents IS 'Junction table linking tasks to documents for context';
COMMENT ON TABLE related_tasks IS 'Junction table for peer task relationships (distinct from parent-child hierarchy)';
COMMENT ON COLUMN documents.content IS 'Extracted text content, NOT raw binary. This is what gets injected into AI prompts.';
COMMENT ON COLUMN documents.content_hash IS 'SHA256 hash of content for deduplication';
COMMENT ON COLUMN task_documents.context_role IS 'How this document relates to the task: reference, input, or output';
COMMENT ON COLUMN related_tasks.relationship_type IS 'Type of relationship: related, blocks, depends_on, or informs';
