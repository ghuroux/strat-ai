-- ============================================================
-- USER ID MAPPINGS TABLE
-- ============================================================
-- Backward compatibility bridge from legacy TEXT user_ids to UUIDs.
-- Maps old identifiers (e.g., 'admin') to new UUID user IDs.
-- This table enables gradual migration from the POC TEXT-based user system.

CREATE TABLE IF NOT EXISTS user_id_mappings (
    legacy_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for reverse lookup
CREATE INDEX IF NOT EXISTS idx_user_id_mappings_user ON user_id_mappings(user_id);

-- Comments
COMMENT ON TABLE user_id_mappings IS 'Backward compatibility: maps legacy TEXT user_ids to UUID user_ids';
COMMENT ON COLUMN user_id_mappings.legacy_id IS 'Original TEXT user_id (e.g., admin, tester)';
COMMENT ON COLUMN user_id_mappings.user_id IS 'New UUID user_id in users table';

-- Known Mappings:
-- 'admin' -> 20000000-0000-0000-0000-000000000001 (Gabriel Roux)
