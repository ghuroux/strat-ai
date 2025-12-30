-- Focus Areas Schema for Spaces & Focus Areas Feature
-- Specialized contexts within spaces that inherit parent space context

CREATE TABLE IF NOT EXISTS focus_areas (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,  -- References space ('work', 'research', etc. - will be FK when spaces table exists)
  name TEXT NOT NULL,

  -- Context content
  context TEXT,                     -- Markdown text context
  context_document_ids TEXT[],      -- Array of document IDs for context

  -- Visual customization
  color TEXT,                       -- Optional override color (hex)
  icon TEXT,                        -- Optional icon identifier

  -- Ordering
  order_index INTEGER DEFAULT 0,

  -- Ownership
  user_id TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Unique name per space per user
  UNIQUE(space_id, name, user_id)
);

-- Index for fetching focus areas in a space (most common query)
CREATE INDEX IF NOT EXISTS idx_focus_areas_space ON focus_areas(space_id, user_id) WHERE deleted_at IS NULL;

-- Index for fetching all focus areas for a user
CREATE INDEX IF NOT EXISTS idx_focus_areas_user ON focus_areas(user_id) WHERE deleted_at IS NULL;

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_focus_areas_order ON focus_areas(space_id, user_id, order_index) WHERE deleted_at IS NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_focus_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS focus_areas_updated_at ON focus_areas;
CREATE TRIGGER focus_areas_updated_at
  BEFORE UPDATE ON focus_areas
  FOR EACH ROW
  EXECUTE FUNCTION update_focus_areas_updated_at();
