-- Migration: Extend capture_method CHECK constraint for post-meeting capture loop
-- Adds 'wizard' (manual capture via wizard) and 'auto_expired' (7-day expiry) methods
--
-- Rollback: ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_capture_method_check;
--           ALTER TABLE meetings ADD CONSTRAINT meetings_capture_method_check
--             CHECK (capture_method IS NULL OR capture_method IN ('manual_upload', 'auto_teams', 'auto_zoom', 'manual_notes'));

-- Drop existing constraint and re-add with new values
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_capture_method_check;
ALTER TABLE meetings ADD CONSTRAINT meetings_capture_method_check
    CHECK (capture_method IS NULL OR capture_method IN (
        'manual_upload', 'auto_teams', 'auto_zoom', 'manual_notes',
        'wizard', 'auto_expired'
    ));
