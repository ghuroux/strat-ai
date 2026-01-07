-- Migration 011: Normalize document space_ids
--
-- Documents were created with slug-style space_ids ('work', 'personal')
-- but after migration 009, the rest of the app uses proper space IDs.
-- This migration updates documents to use proper space IDs.

-- Update documents to use proper space IDs (match slug to id)
UPDATE documents d
SET space_id = s.id
FROM spaces s
WHERE d.space_id = s.slug
  AND d.space_id != s.id;

-- Log the migration
COMMENT ON TABLE documents IS 'Documents - space_id normalized to proper IDs (migration 011)';
