-- Spaces table
-- Stores both system spaces (Work, Research, Random, Personal) and custom user-created spaces
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  -- Space definition
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'custom')),
  slug TEXT NOT NULL,  -- URL-safe identifier (e.g., 'work', 'acme-client')

  -- Customization
  context TEXT,                          -- Space-level context (markdown) for AI
  context_document_ids TEXT[] DEFAULT '{}',  -- References to uploaded documents for context
  color TEXT,                            -- Accent color (hex, e.g., '#3b82f6')
  icon TEXT,                             -- Icon identifier (e.g., 'briefcase', 'beaker')
  order_index INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,       -- Whether space is pinned to top of navigation

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Unique slug per user (only for active spaces)
CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_user_slug
  ON spaces(user_id, slug)
  WHERE deleted_at IS NULL;

-- User's spaces lookup
CREATE INDEX IF NOT EXISTS idx_spaces_user
  ON spaces(user_id)
  WHERE deleted_at IS NULL;

-- Order by index for navigation
CREATE INDEX IF NOT EXISTS idx_spaces_order
  ON spaces(user_id, order_index)
  WHERE deleted_at IS NULL;

-- Seed system spaces for default user (admin)
-- Using slug as ID for system spaces for simplicity
INSERT INTO spaces (id, user_id, name, type, slug, color, icon, order_index)
VALUES
  ('work', 'admin', 'Work', 'system', 'work', '#3b82f6', 'briefcase', 0),
  ('research', 'admin', 'Research', 'system', 'research', '#a855f7', 'beaker', 1),
  ('random', 'admin', 'Random', 'system', 'random', '#f97316', 'sparkles', 2),
  ('personal', 'admin', 'Personal', 'system', 'personal', '#22c55e', 'home', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  updated_at = NOW();
