-- Migration: Add user preferences column
-- This stores user-specific preferences like home page settings

-- Add preferences JSONB column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.preferences IS 'User preferences as JSON. Includes homePage settings, etc.';

-- Example structure:
-- {
--   "homePage": {
--     "type": "main-chat" | "task-dashboard" | "space" | "area",
--     "spaceId": "uuid",  -- for task-dashboard, space, area types
--     "areaId": "uuid"    -- for area type only
--   }
-- }
