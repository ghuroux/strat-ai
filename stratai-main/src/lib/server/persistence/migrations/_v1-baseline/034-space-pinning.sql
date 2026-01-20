-- Migration 034: Space Pinning
-- Enables users to pin up to 6 spaces to their navigation bar
-- Pattern matches existing column addition migrations

-- ============================================
-- 1. ADD IS_PINNED TO SPACES TABLE
-- ============================================

-- For owned spaces: controls pinning state directly
-- Default true = new spaces auto-pin when under max 6
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT true;

COMMENT ON COLUMN spaces.is_pinned IS 'Whether this owned space is pinned to the nav bar. Default true for new spaces (auto-pin if under max 6).';

-- ============================================
-- 2. ADD PINNING COLUMNS TO SPACE_MEMBERSHIPS TABLE
-- ============================================

-- For invited spaces: controls pinning state per-user
-- Default false = invited spaces don't auto-pin
ALTER TABLE space_memberships ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Optional display alias for user customization (future feature)
ALTER TABLE space_memberships ADD COLUMN IF NOT EXISTS display_alias VARCHAR(100);

COMMENT ON COLUMN space_memberships.is_pinned IS 'Whether this invited space is pinned to the nav bar. Default false = invited spaces start unpinned.';
COMMENT ON COLUMN space_memberships.display_alias IS 'Optional user-defined display name for this space (future feature for name collision disambiguation).';

-- ============================================
-- 3. CREATE INDEXES FOR PINNED SPACES QUERIES
-- ============================================

-- Index for fetching pinned owned spaces efficiently
-- Partial index: only includes pinned spaces that aren't deleted
CREATE INDEX IF NOT EXISTS idx_spaces_pinned
    ON spaces(user_id, is_pinned)
    WHERE deleted_at IS NULL AND is_pinned = true;

-- Index for fetching pinned invited spaces efficiently
-- Partial index: only includes pinned memberships
CREATE INDEX IF NOT EXISTS idx_space_memberships_pinned
    ON space_memberships(user_id, is_pinned)
    WHERE is_pinned = true;

-- ============================================
-- 4. BACKFILL: PIN EXISTING SPACES (UP TO 6 PER USER)
-- ============================================

-- For existing users, we want to:
-- 1. Keep owned spaces pinned by default (they already have is_pinned = true)
-- 2. Keep invited spaces unpinned by default (they have is_pinned = false)
-- No backfill needed since defaults match desired behavior

-- Note: Users with many spaces will start with all owned spaces pinned.
-- The UI will enforce the max 6 limit on new pin actions, not on existing state.
-- This allows gradual migration as users manually unpin excess spaces.

-- ============================================
-- 5. ADD COMMENTS
-- ============================================

COMMENT ON INDEX idx_spaces_pinned IS 'Optimizes queries for pinned owned spaces per user';
COMMENT ON INDEX idx_space_memberships_pinned IS 'Optimizes queries for pinned invited spaces per user';
