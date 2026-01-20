-- Migration 030: Add first_name and last_name columns to users table
-- Phase 0 of Space Member Management UI
-- Enables "Space (OwnerFirstName)" display for name collision resolution

-- Add first_name and last_name columns
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Migrate existing display_name data
-- Split "Gabriel Roux" → first: "Gabriel", last: "Roux"
-- Split "William mc Donald" → first: "William", last: "mc Donald"
UPDATE users
SET
  first_name = SPLIT_PART(display_name, ' ', 1),
  last_name = CASE
    WHEN POSITION(' ' IN display_name) > 0
    THEN SUBSTRING(display_name FROM POSITION(' ' IN display_name) + 1)
    ELSE NULL
  END
WHERE display_name IS NOT NULL;

-- Create indexes for name lookups
CREATE INDEX idx_users_first_name ON users(first_name);
CREATE INDEX idx_users_last_name ON users(last_name);

-- Record migration
INSERT INTO schema_migrations (version, applied_at)
VALUES ('030', NOW())
ON CONFLICT (version) DO NOTHING;
