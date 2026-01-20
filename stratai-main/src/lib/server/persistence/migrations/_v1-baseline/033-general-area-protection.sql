-- Migration 033: General Area Protection Constraint
-- Part of Phase A.1: Area Visibility Fixes (US-001)
--
-- Purpose:
-- 1. Fix any existing General areas that were incorrectly marked as restricted
-- 2. Add database-level constraint to prevent General areas from being restricted
--
-- Rationale:
-- General areas must always be accessible to all space members by design.
-- This constraint provides defense-in-depth alongside application-level validation.

-- ============================================================================
-- STEP 1: Fix any existing misconfigured General areas
-- ============================================================================

-- General areas should never be restricted - fix any that are
UPDATE areas
SET is_restricted = false,
    updated_at = NOW()
WHERE is_general = true
  AND is_restricted = true
  AND deleted_at IS NULL;

-- ============================================================================
-- STEP 2: Add CHECK constraint to prevent future misconfigurations
-- ============================================================================

-- Constraint: General areas cannot be restricted
-- This enforces the business rule at the database level
ALTER TABLE areas
ADD CONSTRAINT chk_general_area_not_restricted
CHECK (NOT (is_general = true AND is_restricted = true));

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

-- Should return 0 rows - no restricted General areas should exist
SELECT 'Restricted General areas (should be 0)' as check_type,
       COUNT(*) as count
FROM areas
WHERE is_general = true
  AND is_restricted = true
  AND deleted_at IS NULL;

-- Show all General areas with their restriction status
SELECT 'General areas verification' as check_type,
       id,
       space_id,
       name,
       is_general,
       is_restricted
FROM areas
WHERE is_general = true
  AND deleted_at IS NULL
ORDER BY space_id;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT chk_general_area_not_restricted ON areas IS
    'General areas must always be accessible to all space members. They cannot be restricted.';
