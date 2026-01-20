-- ============================================================
-- Migration 016: User ID TEXT → UUID Migration
-- ============================================================
-- Migrates all tables from TEXT user_id to UUID user_id with
-- proper foreign key references to the users table.
--
-- Tables affected:
--   - spaces
--   - areas (formerly focus_areas)
--   - tasks
--   - conversations
--   - documents
--   - arena_battles
--   - model_rankings (composite PK - special handling)
--
-- Strategy:
--   1. Add user_uuid UUID column
--   2. Populate from user_id_mappings table
--   3. Add NOT NULL constraint and FK to users
--   4. Drop old TEXT user_id column
--   5. Rename user_uuid to user_id
--
-- Prerequisites:
--   - Migration 015 must be applied (foundation tables + user_id_mappings)
--   - user_id_mappings must have mapping for 'admin' → UUID
-- ============================================================

-- Helper function to map TEXT user_id to UUID
-- Note: Parameter named p_legacy_id to avoid collision with column name
CREATE OR REPLACE FUNCTION map_user_id_to_uuid(p_legacy_id TEXT)
RETURNS UUID AS $$
DECLARE
    result_uuid UUID;
BEGIN
    SELECT m.user_id INTO result_uuid
    FROM user_id_mappings m
    WHERE m.legacy_id = p_legacy_id;

    RETURN result_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SPACES TABLE
-- ============================================================
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS user_uuid UUID;

UPDATE spaces
SET user_uuid = map_user_id_to_uuid(user_id)
WHERE user_uuid IS NULL;

-- Verify all rows have been mapped
DO $$
DECLARE
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmapped_count FROM spaces WHERE user_uuid IS NULL;
    IF unmapped_count > 0 THEN
        RAISE EXCEPTION 'Found % spaces rows with unmapped user_id', unmapped_count;
    END IF;
END $$;

ALTER TABLE spaces ALTER COLUMN user_uuid SET NOT NULL;
ALTER TABLE spaces ADD CONSTRAINT fk_spaces_user FOREIGN KEY (user_uuid) REFERENCES users(id);

-- Drop old column, drop old indexes first
DROP INDEX IF EXISTS idx_spaces_user;
DROP INDEX IF EXISTS idx_spaces_order;

ALTER TABLE spaces DROP COLUMN user_id;
ALTER TABLE spaces RENAME COLUMN user_uuid TO user_id;

-- Recreate indexes
CREATE INDEX idx_spaces_user ON spaces(user_id);
CREATE INDEX idx_spaces_order ON spaces(user_id, order_index);

-- ============================================================
-- AREAS TABLE (formerly focus_areas)
-- ============================================================
ALTER TABLE areas ADD COLUMN IF NOT EXISTS user_uuid UUID;

UPDATE areas
SET user_uuid = map_user_id_to_uuid(user_id)
WHERE user_uuid IS NULL;

DO $$
DECLARE
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmapped_count FROM areas WHERE user_uuid IS NULL;
    IF unmapped_count > 0 THEN
        RAISE EXCEPTION 'Found % areas rows with unmapped user_id', unmapped_count;
    END IF;
END $$;

ALTER TABLE areas ALTER COLUMN user_uuid SET NOT NULL;
ALTER TABLE areas ADD CONSTRAINT fk_areas_user FOREIGN KEY (user_uuid) REFERENCES users(id);

DROP INDEX IF EXISTS idx_areas_user_space;
ALTER TABLE areas DROP COLUMN user_id;
ALTER TABLE areas RENAME COLUMN user_uuid TO user_id;

CREATE INDEX idx_areas_user_space ON areas(user_id, space_id);

-- ============================================================
-- TASKS TABLE
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_uuid UUID;

UPDATE tasks
SET user_uuid = map_user_id_to_uuid(user_id)
WHERE user_uuid IS NULL;

DO $$
DECLARE
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmapped_count FROM tasks WHERE user_uuid IS NULL;
    IF unmapped_count > 0 THEN
        RAISE EXCEPTION 'Found % tasks rows with unmapped user_id', unmapped_count;
    END IF;
END $$;

ALTER TABLE tasks ALTER COLUMN user_uuid SET NOT NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_user FOREIGN KEY (user_uuid) REFERENCES users(id);

DROP INDEX IF EXISTS idx_tasks_user_space;
ALTER TABLE tasks DROP COLUMN user_id;
ALTER TABLE tasks RENAME COLUMN user_uuid TO user_id;

CREATE INDEX idx_tasks_user_space ON tasks(user_id, space_id);

-- ============================================================
-- CONVERSATIONS TABLE
-- ============================================================
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_uuid UUID;

UPDATE conversations
SET user_uuid = map_user_id_to_uuid(user_id)
WHERE user_uuid IS NULL AND user_id IS NOT NULL;

-- For conversations, user_id might be nullable, so we need to handle NULLs
-- Only set NOT NULL if all rows have a user_id
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM conversations WHERE user_uuid IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE 'Found % conversations with NULL user_uuid (will remain nullable)', null_count;
    END IF;
END $$;

-- Add FK but keep nullable for now
ALTER TABLE conversations ADD CONSTRAINT fk_conversations_user FOREIGN KEY (user_uuid) REFERENCES users(id);

DROP INDEX IF EXISTS idx_conversations_user_updated;
ALTER TABLE conversations DROP COLUMN IF EXISTS user_id;
ALTER TABLE conversations RENAME COLUMN user_uuid TO user_id;

CREATE INDEX idx_conversations_user_updated ON conversations(user_id, updated_at);

-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_uuid UUID;

UPDATE documents
SET user_uuid = map_user_id_to_uuid(user_id)
WHERE user_uuid IS NULL;

DO $$
DECLARE
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmapped_count FROM documents WHERE user_uuid IS NULL;
    IF unmapped_count > 0 THEN
        RAISE EXCEPTION 'Found % documents rows with unmapped user_id', unmapped_count;
    END IF;
END $$;

ALTER TABLE documents ALTER COLUMN user_uuid SET NOT NULL;
ALTER TABLE documents ADD CONSTRAINT fk_documents_user FOREIGN KEY (user_uuid) REFERENCES users(id);

DROP INDEX IF EXISTS idx_documents_user;
ALTER TABLE documents DROP COLUMN user_id;
ALTER TABLE documents RENAME COLUMN user_uuid TO user_id;

CREATE INDEX idx_documents_user ON documents(user_id);

-- ============================================================
-- ARENA_BATTLES TABLE
-- ============================================================
ALTER TABLE arena_battles ADD COLUMN IF NOT EXISTS user_uuid UUID;

UPDATE arena_battles
SET user_uuid = map_user_id_to_uuid(user_id)
WHERE user_uuid IS NULL;

DO $$
DECLARE
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmapped_count FROM arena_battles WHERE user_uuid IS NULL;
    IF unmapped_count > 0 THEN
        RAISE EXCEPTION 'Found % arena_battles rows with unmapped user_id', unmapped_count;
    END IF;
END $$;

ALTER TABLE arena_battles ALTER COLUMN user_uuid SET NOT NULL;
ALTER TABLE arena_battles ADD CONSTRAINT fk_arena_battles_user FOREIGN KEY (user_uuid) REFERENCES users(id);

DROP INDEX IF EXISTS idx_arena_battles_user_created;
ALTER TABLE arena_battles DROP COLUMN user_id;
ALTER TABLE arena_battles RENAME COLUMN user_uuid TO user_id;

CREATE INDEX idx_arena_battles_user_created ON arena_battles(user_id, created_at DESC);

-- ============================================================
-- MODEL_RANKINGS TABLE (composite primary key - special handling)
-- ============================================================
-- model_rankings has PRIMARY KEY (user_id, model_id), so we need to:
-- 1. Drop the primary key constraint
-- 2. Add new UUID column and migrate
-- 3. Create new primary key with UUID

-- First, add the new column
ALTER TABLE model_rankings ADD COLUMN IF NOT EXISTS user_uuid UUID;

UPDATE model_rankings
SET user_uuid = map_user_id_to_uuid(user_id)
WHERE user_uuid IS NULL;

DO $$
DECLARE
    unmapped_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unmapped_count FROM model_rankings WHERE user_uuid IS NULL;
    IF unmapped_count > 0 THEN
        RAISE EXCEPTION 'Found % model_rankings rows with unmapped user_id', unmapped_count;
    END IF;
END $$;

-- Drop the primary key (need to find its name first)
DO $$
DECLARE
    pk_name TEXT;
BEGIN
    SELECT constraint_name INTO pk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'model_rankings' AND constraint_type = 'PRIMARY KEY';

    IF pk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE model_rankings DROP CONSTRAINT %I', pk_name);
    END IF;
END $$;

-- Drop old column and rename
DROP INDEX IF EXISTS idx_model_rankings_elo;
ALTER TABLE model_rankings DROP COLUMN user_id;
ALTER TABLE model_rankings RENAME COLUMN user_uuid TO user_id;

-- Recreate primary key and FK
ALTER TABLE model_rankings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE model_rankings ADD PRIMARY KEY (user_id, model_id);
ALTER TABLE model_rankings ADD CONSTRAINT fk_model_rankings_user FOREIGN KEY (user_id) REFERENCES users(id);

CREATE INDEX idx_model_rankings_elo ON model_rankings(user_id, elo_rating DESC);

-- ============================================================
-- CLEANUP
-- ============================================================
-- Drop the helper function
DROP FUNCTION IF EXISTS map_user_id_to_uuid(TEXT);

-- Add comments
COMMENT ON COLUMN spaces.user_id IS 'UUID reference to users table';
COMMENT ON COLUMN areas.user_id IS 'UUID reference to users table';
COMMENT ON COLUMN tasks.user_id IS 'UUID reference to users table';
COMMENT ON COLUMN conversations.user_id IS 'UUID reference to users table (nullable)';
COMMENT ON COLUMN documents.user_id IS 'UUID reference to users table';
COMMENT ON COLUMN arena_battles.user_id IS 'UUID reference to users table';
COMMENT ON COLUMN model_rankings.user_id IS 'UUID reference to users table (part of composite PK)';

-- ============================================================
-- NOTES FOR APPLICATION UPDATES
-- ============================================================
-- After this migration:
-- 1. All user_id columns are now UUID type
-- 2. Session should use UUID userId (from users table)
-- 3. Remove DEFAULT_USER_ID patterns in API routes
-- 4. Update login to return UUID instead of legacy 'admin'
-- 5. user_id_mappings table can be kept for reference but is no longer
--    needed at runtime once the application uses UUID user IDs
-- ============================================================
