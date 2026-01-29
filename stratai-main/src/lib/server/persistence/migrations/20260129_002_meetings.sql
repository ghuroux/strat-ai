-- Migration: Meeting Creation Wizard — meetings + meeting_attendees tables
-- Phase 1: Data layer for Meeting Creation Wizard
-- See: docs/features/MEETING_CREATION_WIZARD.md
--
-- Creates two tables:
--   1. meetings — core meeting entity (draft → scheduled → completed lifecycle)
--   2. meeting_attendees — participants with roles and response tracking
--
-- Rollback:
--   DROP TABLE IF EXISTS meeting_attendees;
--   DROP TABLE IF EXISTS meetings;

-- =====================================================
-- Table: meetings
-- =====================================================

CREATE TABLE IF NOT EXISTS meetings (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    purpose         TEXT,
    duration_minutes INTEGER DEFAULT 30,

    -- Location & hierarchy
    space_id        TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    area_id         TEXT REFERENCES areas(id) ON DELETE SET NULL,

    -- People
    organizer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Lifecycle status
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'awaiting_capture', 'captured')),

    -- Structured data (JSONB)
    expected_outcomes JSONB DEFAULT '[]'::jsonb,
    capture_data      JSONB,

    -- Calendar integration (Phase 3+)
    external_provider   TEXT CHECK (external_provider IS NULL OR external_provider IN ('microsoft', 'google')),
    external_event_id   TEXT,
    external_join_url   TEXT,

    -- Scheduling
    scheduled_start TIMESTAMPTZ,
    scheduled_end   TIMESTAMPTZ,

    -- Capture method (future)
    capture_method  TEXT CHECK (capture_method IS NULL OR capture_method IN ('manual_upload', 'auto_teams', 'auto_zoom', 'manual_notes')),

    -- Linked entities (Phase 3+)
    task_id         TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    page_id         TEXT REFERENCES pages(id) ON DELETE SET NULL,

    -- Timestamps & soft delete
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- =====================================================
-- Table: meeting_attendees
-- =====================================================

CREATE TABLE IF NOT EXISTS meeting_attendees (
    id              TEXT PRIMARY KEY,
    meeting_id      TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

    -- Attendee identity (user_id for internal, email for external)
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    display_name    TEXT,

    -- Role
    attendee_type   TEXT NOT NULL DEFAULT 'required'
                    CHECK (attendee_type IN ('required', 'optional', 'organizer')),
    is_owner        BOOLEAN NOT NULL DEFAULT false,

    -- Response tracking (future calendar integration)
    response_status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate attendees per meeting
    UNIQUE (meeting_id, email)
);

-- =====================================================
-- Indexes
-- =====================================================

-- Meetings: common query patterns
CREATE INDEX IF NOT EXISTS idx_meetings_space_id ON meetings(space_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_area_id ON meetings(area_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_id ON meetings(organizer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status) WHERE deleted_at IS NULL;

-- Scheduled meetings (upcoming view)
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled ON meetings(scheduled_start)
    WHERE status = 'scheduled' AND deleted_at IS NULL;

-- Awaiting capture (post-meeting processing)
CREATE INDEX IF NOT EXISTS idx_meetings_awaiting_capture ON meetings(scheduled_end)
    WHERE status = 'awaiting_capture' AND deleted_at IS NULL;

-- External event lookup (calendar sync)
CREATE INDEX IF NOT EXISTS idx_meetings_external_event ON meetings(external_provider, external_event_id)
    WHERE external_event_id IS NOT NULL AND deleted_at IS NULL;

-- Meeting attendees: lookup by meeting
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);

-- Meeting attendees: lookup by user (across meetings)
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id)
    WHERE user_id IS NOT NULL;
