# Meeting Lifecycle System

> **The Complete Meeting Journey: From Creation to Context**

This document specifies the end-to-end meeting lifecycle system for StratAI—from AI-guided meeting creation through scheduling, capture, and context integration. This is where the Data Flywheel becomes tangible: every meeting becomes organizational intelligence.

**Key Insight: A Meeting is a Task.** Meetings require preparation, execution, and completion. By treating meetings as a special type of task, we integrate seamlessly with existing Task/Focus Mode infrastructure while ensuring every meeting's value is captured.

---

## Table of Contents

1. [Vision & Mental Model](#1-vision--mental-model)
2. [Core Concepts](#2-core-concepts)
3. [Meeting Lifecycle States](#3-meeting-lifecycle-states)
4. [Database Schema](#4-database-schema)
5. [Microsoft Graph Integration](#5-microsoft-graph-integration)
6. [Phase 1: AI-Guided Meeting Creation](#6-phase-1-ai-guided-meeting-creation)
7. [Phase 2: Intelligent Scheduling](#7-phase-2-intelligent-scheduling)
8. [Phase 3: Meeting Execution & Prep](#8-phase-3-meeting-execution--prep)
9. [Phase 4: Post-Meeting Capture (via Task)](#9-phase-4-post-meeting-capture-via-task)
10. [Phase 5: AI-Assisted Extraction](#10-phase-5-ai-assisted-extraction)
11. [Phase 6: Guided Capture Flow](#11-phase-6-guided-capture-flow)
12. [Phase 7: Context Integration](#12-phase-7-context-integration)
13. [Implementation Roadmap](#13-implementation-roadmap)
14. [Security & Privacy](#14-security--privacy)
15. [Edge Cases & Error Handling](#15-edge-cases--error-handling)
16. [Acceptance Criteria Summary](#16-acceptance-criteria-summary)

---

## 1. Vision & Mental Model

### The Problem with Meetings Today

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MEETINGS TODAY: LOST VALUE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   BEFORE                    DURING                    AFTER                      │
│   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐         │
│   │ Calendar invite │      │ Discussion      │      │ "What did we    │         │
│   │ with vague      │      │ happens         │      │  decide?"       │         │
│   │ subject line    │      │                 │      │                 │         │
│   │                 │      │ Decisions made  │      │ Action items    │         │
│   │ No agenda       │      │ but not         │      │ forgotten       │         │
│   │                 │      │ captured        │      │                 │         │
│   │ No context      │      │                 │      │ No follow-up    │         │
│   │                 │      │ No owner        │      │                 │         │
│   │ No prep         │      │ accountable     │      │ No learning     │         │
│   └─────────────────┘      └─────────────────┘      └─────────────────┘         │
│           │                        │                        │                    │
│           └────────────────────────┴────────────────────────┘                    │
│                                    │                                             │
│                                    ▼                                             │
│                          ┌─────────────────┐                                     │
│                          │  VALUE LOST     │                                     │
│                          │                 │                                     │
│                          │  • No record    │                                     │
│                          │  • No learning  │                                     │
│                          │  • No context   │                                     │
│                          │  • No ownership │                                     │
│                          └─────────────────┘                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### The StratAI Meeting Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STRATAI: MEETING = TASK                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   When you create a meeting, you create a TASK that:                             │
│   • Appears in the owner's task list                                             │
│   • Has clear accountability                                                     │
│   • Tracks prep work                                                             │
│   • Captures outcomes on completion                                              │
│   • Creates subtasks for action items                                            │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────┐│
│   │                                                                             ││
│   │   CREATE              SCHEDULE            PREP                              ││
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    ││
│   │   │ AI-guided   │───▶│ Find time   │───▶│ Task in     │                    ││
│   │   │             │    │             │    │ owner's     │                    ││
│   │   │ • Purpose   │    │ Query       │    │ task list   │                    ││
│   │   │ • Outcomes  │    │ free/busy   │    │             │                    ││
│   │   │ • Agenda    │    │             │    │ • AI prep   │                    ││
│   │   │ • Attendees │    │ Create      │    │ • Context   │                    ││
│   │   │ • OWNER ★   │    │ Teams mtg   │    │ • Join link │                    ││
│   │   └─────────────┘    └─────────────┘    └─────────────┘                    ││
│   │         │                  │                  │                             ││
│   │         │                  │                  │                             ││
│   │         ▼                  ▼                  ▼                             ││
│   │   ┌─────────────────────────────────────────────────────────────────────┐  ││
│   │   │                    📋 TASK CREATED                                   │  ││
│   │   │                                                                     │  ││
│   │   │   "Q1 Planning Review"               📅 Tomorrow 2:30 PM            │  ││
│   │   │   Owner: John Smith                  Area: Nedbank SVS              │  ││
│   │   │   Status: Scheduled                                                 │  ││
│   │   └─────────────────────────────────────────────────────────────────────┘  ││
│   │                                                                             ││
│   └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────┐│
│   │                                                                             ││
│   │   MEET                CAPTURE             COMPLETE                          ││
│   │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    ││
│   │   │ Teams call  │───▶│ Via task    │───▶│ Task done   │                    ││
│   │   │ happens     │    │ completion  │    │             │                    ││
│   │   │             │    │             │    │ • Page      │                    ││
│   │   │ Transcribed │    │ • Transcript│    │   created   │                    ││
│   │   │ (optional)  │    │ • Manual    │    │ • Subtasks  │                    ││
│   │   │             │    │ • Guided    │    │   created   │                    ││
│   │   │             │    │   capture   │    │ • Context   │                    ││
│   │   └─────────────┘    └─────────────┘    │   updated   │                    ││
│   │                                          └─────────────┘                    ││
│   │                                                                             ││
│   └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│   ═══════════════════════════════════════════════════════════════════════════   │
│                              THE FLYWHEEL TURNS                                  │
│                                                                                  │
│   Action items from this meeting become SUBTASKS assigned to team members.       │
│   Decisions feed Area context. Next meeting, AI knows what was decided.          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Meeting = Task** — Every meeting creates a task assigned to the owner. Prep, execution, and capture are tracked as task work.

2. **Owner ≠ Organizer** — The person who schedules (organizer) may differ from the person responsible for outcomes (owner). Owner accountability is explicit.

3. **Task-Native Capture** — Outcomes are captured through completing the meeting task, not a separate UI. This reuses existing Task/Focus Mode infrastructure.

4. **Action Items = Subtasks** — Follow-up work becomes subtasks of the meeting task, maintaining clear hierarchy and assignee visibility.

5. **Manual Always Works** — Transcript-based AI extraction is optional. Guided capture works without any transcript.

6. **Progressive Enhancement** — Start with manual capture, add AI assistance when transcript available, improve over time.

---

## 2. Core Concepts

### Organizer vs Owner

| Role | Definition | Responsibilities | Example |
|------|------------|------------------|---------|
| **Organizer** | Person who creates/schedules the meeting | Send invites, manage calendar logistics | EA booking a meeting |
| **Owner** | Person accountable for meeting outcomes | Prepare, run meeting, capture outcomes, ensure follow-up | CEO who runs the meeting |

**Rules:**
- By default, organizer = owner (most common case)
- Organizer can assign any attendee as owner during creation
- Owner receives the meeting task in their task list
- Only owner can complete the meeting task (capture outcomes)
- Organizer can edit calendar details; owner controls capture

### Meeting Task Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MEETING TASK LIFECYCLE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   TASK STATUS              MEETING STATUS           WHAT'S HAPPENING             │
│   ─────────────            ──────────────           ──────────────────           │
│                                                                                  │
│   📋 pending               draft                    Meeting being created        │
│        │                                                                         │
│        ▼                                                                         │
│   📋 pending               scheduled                Invites sent, on calendars   │
│        │                                            Task visible, prep can start │
│        │                                                                         │
│        │ (meeting time approaches)                                               │
│        ▼                                                                         │
│   🔄 in_progress           in_progress              Meeting happening now        │
│        │                                            Join link prominent          │
│        │                                                                         │
│        │ (meeting ends)                                                          │
│        ▼                                                                         │
│   🔄 in_progress           completed                Awaiting capture             │
│        │                                            "Capture Outcomes" prominent │
│        │                                                                         │
│        │ (owner captures outcomes)                                               │
│        ▼                                                                         │
│   ✅ completed              finalized               Page created, subtasks made  │
│                                                     Context updated              │
│                                                                                  │
│   ───────────────────────────────────────────────────────────────────────────── │
│                                                                                  │
│   ALTERNATE PATHS:                                                               │
│                                                                                  │
│   📋 pending               cancelled                Meeting cancelled            │
│        └──────────────────▶ Task also cancelled                                  │
│                                                                                  │
│   🔄 in_progress           abandoned                Owner skipped capture        │
│        └──────────────────▶ Task marked complete (no subtasks)                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Action Items as Subtasks

When the meeting task is completed, action items become **subtasks** of the meeting task:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  TASK HIERARCHY AFTER MEETING COMPLETION                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ✅ Q1 Planning Review (meeting task - completed)                                │
│      │                                                                           │
│      ├── 📋 Draft REST API specification                                         │
│      │       Assignee: Sarah Chen                                                │
│      │       Due: Jan 21                                                         │
│      │       Status: pending                                                     │
│      │                                                                           │
│      ├── 📋 Set up OAuth2 test environment                                       │
│      │       Assignee: Mike Johnson                                              │
│      │       Due: Jan 24                                                         │
│      │       Status: pending                                                     │
│      │                                                                           │
│      └── 📋 Schedule follow-up with David                                        │
│              Assignee: John Smith                                                │
│              Due: Jan 24                                                         │
│              Status: pending                                                     │
│                                                                                  │
│  Benefits:                                                                       │
│  • Clear lineage: action items trace back to meeting                             │
│  • Assignees see subtasks in their task list                                     │
│  • Meeting owner can track all follow-up progress                                │
│  • Completing subtasks doesn't require re-opening meeting                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Meeting Lifecycle States

### State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MEETING + TASK STATE MACHINE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌───────────────────────────────────────────────────────────────────────────┐ │
│   │  CREATION PHASE                                                           │ │
│   │                                                                           │ │
│   │                    ┌─────────────────┐                                    │ │
│   │                    │     DRAFT       │                                    │ │
│   │                    │                 │                                    │ │
│   │                    │ Meeting: draft  │                                    │ │
│   │                    │ Task: (not yet) │                                    │ │
│   │                    └────────┬────────┘                                    │ │
│   │                             │                                             │ │
│   │                   User clicks "Schedule"                                  │ │
│   │                             │                                             │ │
│   │                             ▼                                             │ │
│   │                    ┌─────────────────┐                                    │ │
│   │                    │   SCHEDULED     │                                    │ │
│   │                    │                 │                                    │ │
│   │                    │ Meeting: sched  │  ← Task CREATED here               │ │
│   │                    │ Task: pending   │  ← Owner sees in task list         │ │
│   │                    │                 │  ← Invites sent                    │ │
│   │                    └────────┬────────┘                                    │ │
│   │                             │                                             │ │
│   └─────────────────────────────┼─────────────────────────────────────────────┘ │
│                                 │                                               │
│   ┌─────────────────────────────┼─────────────────────────────────────────────┐ │
│   │  EXECUTION PHASE            │                                             │ │
│   │                             ▼                                             │ │
│   │                    ┌─────────────────┐                                    │ │
│   │                    │  IN_PROGRESS    │  ← Optional: detected via time     │ │
│   │                    │                 │                                    │ │
│   │                    │ Meeting: active │                                    │ │
│   │                    │ Task: in_prog   │                                    │ │
│   │                    └────────┬────────┘                                    │ │
│   │                             │                                             │ │
│   │                   Meeting end time passed                                 │ │
│   │                             │                                             │ │
│   │                             ▼                                             │ │
│   │                    ┌─────────────────┐                                    │ │
│   │                    │   COMPLETED     │  ← Awaiting capture                │ │
│   │                    │                 │  ← "Capture Outcomes" prominent    │ │
│   │                    │ Meeting: done   │                                    │ │
│   │                    │ Task: in_prog   │                                    │ │
│   │                    └────────┬────────┘                                    │ │
│   │                             │                                             │ │
│   └─────────────────────────────┼─────────────────────────────────────────────┘ │
│                                 │                                               │
│   ┌─────────────────────────────┼─────────────────────────────────────────────┐ │
│   │  CAPTURE PHASE              │                                             │ │
│   │            ┌────────────────┼────────────────┐                            │ │
│   │            │                │                │                            │ │
│   │      Transcript       Guided capture    Skip capture                      │ │
│   │      (+ AI assist)    (manual)          (abandon)                         │ │
│   │            │                │                │                            │ │
│   │            ▼                ▼                ▼                            │ │
│   │     ┌───────────┐    ┌───────────┐    ┌───────────┐                      │ │
│   │     │ CAPTURED  │    │ CAPTURED  │    │ ABANDONED │                      │ │
│   │     │           │    │           │    │           │                      │ │
│   │     │ Has       │    │ Manual    │    │ No data   │                      │ │
│   │     │ transcript│    │ entries   │    │ captured  │                      │ │
│   │     └─────┬─────┘    └─────┬─────┘    └───────────┘                      │ │
│   │           │                │               │                              │ │
│   │           │    ┌───────────┘               │                              │ │
│   │           │    │                           │                              │ │
│   │           ▼    ▼                           │                              │ │
│   │     ┌─────────────────┐                    │                              │ │
│   │     │   FINALIZED     │◄───────────────────┘                              │ │
│   │     │                 │                                                   │ │
│   │     │ Meeting: final  │  ← Page created                                   │ │
│   │     │ Task: completed │  ← Subtasks created (action items)                │ │
│   │     │                 │  ← Decisions propagated to Area                   │ │
│   │     └─────────────────┘                                                   │ │
│   │                                                                           │ │
│   └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│   CANCELLATION (any phase before finalized):                                     │
│                                                                                  │
│   Meeting: cancelled → Task: cancelled (if exists)                               │
│   Calendar invite: cancelled notification sent                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### State Definitions

| Meeting State | Task Status | Description | User Actions |
|---------------|-------------|-------------|--------------|
| `draft` | N/A | Meeting being created | Edit, Schedule, Delete |
| `scheduled` | `pending` | Invites sent, task created | Edit, Cancel, Prepare |
| `in_progress` | `in_progress` | Meeting happening now | Join, View details |
| `completed` | `in_progress` | Meeting ended, awaiting capture | Capture, Skip |
| `captured` | `in_progress` | Data entered, reviewing | Review, Edit, Finalize |
| `finalized` | `completed` | Complete, subtasks created | View, Re-open (rare) |
| `abandoned` | `completed` | Capture skipped | Re-open for capture |
| `cancelled` | `cancelled` | Meeting cancelled | View history |

---

## 4. Database Schema

### Migration: 030-meeting-lifecycle.sql

```sql
-- Migration 030: Meeting Lifecycle System
-- Creates tables for end-to-end meeting management with task integration

-- ============================================================================
-- MEETINGS TABLE
-- Core meeting entity linking to Areas, Tasks, and external calendar systems
-- ============================================================================

CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership & Context
    area_id UUID NOT NULL REFERENCES focus_areas(id) ON DELETE CASCADE,

    -- ORGANIZER vs OWNER distinction
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,  -- Who created/scheduled
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,       -- Who is accountable (gets task)

    -- Meeting Details
    title VARCHAR(500) NOT NULL,
    purpose TEXT,                              -- AI-assisted: "What's this meeting about?"

    -- Scheduling
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    timezone VARCHAR(100) DEFAULT 'UTC',
    duration_minutes INTEGER,                  -- Planned duration
    actual_duration_minutes INTEGER,           -- Actual (from transcript or manual)

    -- State Machine
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',        -- Being created, no task yet
            'scheduled',    -- Invites sent, task created
            'in_progress',  -- Meeting happening now
            'completed',    -- Meeting ended, awaiting capture
            'captured',     -- Data entered, in review
            'finalized',    -- Complete, subtasks created
            'abandoned',    -- Capture skipped
            'cancelled'     -- Meeting cancelled
        )),

    -- Task Integration (CORE RELATIONSHIP)
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- The meeting task for owner

    -- External Integration (Microsoft Graph)
    external_event_id VARCHAR(500),            -- Graph API event ID
    external_meeting_id VARCHAR(500),          -- Teams online meeting ID
    external_calendar_id VARCHAR(500),         -- Which calendar (if multiple)
    external_provider VARCHAR(50) DEFAULT 'microsoft'
        CHECK (external_provider IN ('microsoft', 'google', 'manual')),
    external_join_url TEXT,                    -- Teams/Meet join link
    external_sync_status VARCHAR(50) DEFAULT 'pending'
        CHECK (external_sync_status IN ('pending', 'synced', 'failed', 'manual')),
    external_sync_error TEXT,
    external_last_synced_at TIMESTAMPTZ,

    -- Generated Content Links
    page_id UUID REFERENCES pages(id) ON DELETE SET NULL,  -- Generated meeting minutes

    -- Transcript
    transcript_source VARCHAR(50)
        CHECK (transcript_source IN ('teams_api', 'manual_upload', 'bot', 'none')),
    transcript_status VARCHAR(50) DEFAULT 'none'
        CHECK (transcript_status IN ('none', 'pending', 'available', 'processing', 'processed', 'failed')),
    transcript_url TEXT,
    transcript_text TEXT,                      -- Raw transcript text
    transcript_metadata JSONB,                 -- Format, duration, speakers, etc.

    -- AI Processing
    ai_processing_status VARCHAR(50) DEFAULT 'none'
        CHECK (ai_processing_status IN ('none', 'pending', 'processing', 'completed', 'failed')),
    ai_processing_started_at TIMESTAMPTZ,
    ai_processing_completed_at TIMESTAMPTZ,
    ai_extracted_data JSONB,                   -- Raw AI extraction before confirmation
    ai_confidence_scores JSONB,

    -- Capture Method Tracking
    capture_method VARCHAR(50)
        CHECK (capture_method IN ('transcript_ai', 'transcript_manual', 'guided_manual', 'quick_notes', 'skipped')),

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,                  -- When invites were sent
    completed_at TIMESTAMPTZ,                  -- When meeting ended
    captured_at TIMESTAMPTZ,                   -- When capture started
    finalized_at TIMESTAMPTZ,                  -- When owner confirmed
    cancelled_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT meeting_scheduled_times CHECK (
        (status = 'draft') OR
        (scheduled_start IS NOT NULL AND scheduled_end IS NOT NULL AND scheduled_start < scheduled_end)
    ),
    CONSTRAINT meeting_owner_is_attendee CHECK (
        -- Owner must be an attendee (enforced at application level for flexibility)
        TRUE
    )
);

-- Indexes for meetings
CREATE INDEX idx_meetings_area ON meetings(area_id);
CREATE INDEX idx_meetings_organizer ON meetings(organizer_id);
CREATE INDEX idx_meetings_owner ON meetings(owner_id);
CREATE INDEX idx_meetings_task ON meetings(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_start) WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_meetings_awaiting_capture ON meetings(completed_at) WHERE status = 'completed';
CREATE INDEX idx_meetings_external_event ON meetings(external_event_id) WHERE external_event_id IS NOT NULL;

-- ============================================================================
-- MEETING AGENDA ITEMS
-- Structured agenda created during meeting planning
-- ============================================================================

CREATE TABLE meeting_agenda_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(500) NOT NULL,
    description TEXT,
    duration_minutes INTEGER,
    item_type VARCHAR(50) DEFAULT 'discussion'
        CHECK (item_type IN ('discussion', 'decision', 'update', 'review', 'other')),

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Presenter (optional)
    presenter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    presenter_external_email VARCHAR(500),

    -- AI Assistance
    ai_suggested BOOLEAN DEFAULT FALSE,
    ai_context TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agenda_items_meeting ON meeting_agenda_items(meeting_id);
CREATE INDEX idx_agenda_items_order ON meeting_agenda_items(meeting_id, sort_order);

-- ============================================================================
-- MEETING EXPECTED OUTCOMES
-- What decisions/results are expected from this meeting
-- ============================================================================

CREATE TABLE meeting_expected_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

    -- Content
    description TEXT NOT NULL,
    outcome_type VARCHAR(50) DEFAULT 'decision'
        CHECK (outcome_type IN ('decision', 'approval', 'alignment', 'information', 'action_plan', 'other')),

    -- Resolution (filled after meeting)
    was_achieved BOOLEAN,
    resolution_notes TEXT,
    linked_decision_id UUID,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- AI Assistance
    ai_suggested BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expected_outcomes_meeting ON meeting_expected_outcomes(meeting_id);

-- ============================================================================
-- MEETING ATTENDEES
-- Both internal (Space members) and external participants
-- ============================================================================

CREATE TABLE meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

    -- Attendee Identity (one of these is required)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    external_email VARCHAR(500),
    external_name VARCHAR(500),

    -- Role
    attendee_type VARCHAR(50) NOT NULL DEFAULT 'required'
        CHECK (attendee_type IN ('required', 'optional', 'resource', 'organizer')),

    -- Special Flags
    is_owner BOOLEAN DEFAULT FALSE,            -- Is this attendee the meeting owner?

    -- Response Status (from calendar system)
    response_status VARCHAR(50) DEFAULT 'none'
        CHECK (response_status IN ('none', 'accepted', 'declined', 'tentative', 'not_responded')),
    response_time TIMESTAMPTZ,

    -- Attendance (filled after meeting)
    actually_attended BOOLEAN,
    attendance_source VARCHAR(50)
        CHECK (attendance_source IN ('transcript', 'manual', 'teams_api', NULL)),

    -- External Sync
    external_attendee_id VARCHAR(500),

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT attendee_identity CHECK (
        (user_id IS NOT NULL) OR (external_email IS NOT NULL)
    ),
    CONSTRAINT unique_attendee UNIQUE (meeting_id, user_id, external_email)
);

CREATE INDEX idx_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX idx_attendees_user ON meeting_attendees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_attendees_owner ON meeting_attendees(meeting_id) WHERE is_owner = TRUE;

-- ============================================================================
-- MEETING DECISIONS
-- Decisions captured from the meeting
-- ============================================================================

CREATE TABLE meeting_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(500) NOT NULL,
    description TEXT,
    rationale TEXT,

    -- Ownership (decision owner, not meeting owner)
    decision_owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    decision_owner_external_email VARCHAR(500),

    -- Related Outcomes
    linked_expected_outcome_id UUID REFERENCES meeting_expected_outcomes(id) ON DELETE SET NULL,

    -- Extraction Metadata
    extraction_source VARCHAR(50) DEFAULT 'manual'
        CHECK (extraction_source IN ('ai_transcript', 'ai_notes', 'manual')),
    ai_confidence DECIMAL(3,2),
    ai_transcript_reference TEXT,

    -- User Confirmation
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,

    -- Context Integration
    propagated_to_context BOOLEAN DEFAULT FALSE,
    propagated_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_decisions_meeting ON meeting_decisions(meeting_id);
CREATE INDEX idx_decisions_unconfirmed ON meeting_decisions(meeting_id) WHERE confirmed = FALSE;

-- ============================================================================
-- MEETING ACTION ITEMS
-- Action items that become subtasks of the meeting task
-- ============================================================================

CREATE TABLE meeting_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Assignment
    assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assignee_external_email VARCHAR(500),
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- Subtask Creation
    create_as_subtask BOOLEAN DEFAULT TRUE,    -- Create as subtask of meeting task
    subtask_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- The created subtask
    subtask_created_at TIMESTAMPTZ,

    -- Extraction Metadata
    extraction_source VARCHAR(50) DEFAULT 'manual'
        CHECK (extraction_source IN ('ai_transcript', 'ai_notes', 'manual')),
    ai_confidence DECIMAL(3,2),
    ai_transcript_reference TEXT,

    -- User Confirmation
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX idx_action_items_subtask ON meeting_action_items(subtask_id) WHERE subtask_id IS NOT NULL;
CREATE INDEX idx_action_items_unconfirmed ON meeting_action_items(meeting_id) WHERE confirmed = FALSE;

-- ============================================================================
-- MEETING KEY POINTS
-- Important discussion points (not decisions or actions)
-- ============================================================================

CREATE TABLE meeting_key_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,
    point_type VARCHAR(50) DEFAULT 'discussion'
        CHECK (point_type IN ('discussion', 'insight', 'concern', 'question', 'agreement', 'other')),

    -- Attribution
    speaker_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    speaker_external_email VARCHAR(500),

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Extraction Metadata
    extraction_source VARCHAR(50) DEFAULT 'manual'
        CHECK (extraction_source IN ('ai_transcript', 'ai_notes', 'manual')),
    ai_confidence DECIMAL(3,2),
    ai_transcript_reference TEXT,

    -- Inclusion in Minutes
    include_in_minutes BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_key_points_meeting ON meeting_key_points(meeting_id);

-- ============================================================================
-- CALENDAR CONNECTIONS
-- User's connected calendar accounts
-- ============================================================================

CREATE TABLE calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Provider
    provider VARCHAR(50) NOT NULL DEFAULT 'microsoft'
        CHECK (provider IN ('microsoft', 'google')),

    -- OAuth Tokens (encrypted at rest)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,

    -- Scopes Granted
    scopes_granted TEXT[] NOT NULL,

    -- Account Info
    external_account_id VARCHAR(500),
    external_account_email VARCHAR(500),
    external_account_name VARCHAR(500),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    last_error TEXT,

    -- Sync Settings
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    sync_delta_token TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_user_provider UNIQUE (user_id, provider, external_account_email)
);

CREATE INDEX idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX idx_calendar_connections_status ON calendar_connections(status) WHERE status = 'active';

-- ============================================================================
-- TASK TYPE EXTENSION
-- Add meeting task type to existing tasks table
-- ============================================================================

-- Add task_type column if not exists (depends on current schema)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'task_type'
    ) THEN
        ALTER TABLE tasks ADD COLUMN task_type VARCHAR(50) DEFAULT 'standard'
            CHECK (task_type IN ('standard', 'meeting'));
    END IF;
END $$;

-- Add meeting_id reference to tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'meeting_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;
        CREATE INDEX idx_tasks_meeting ON tasks(meeting_id) WHERE meeting_id IS NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_agenda_items_updated_at
    BEFORE UPDATE ON meeting_agenda_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_expected_outcomes_updated_at
    BEFORE UPDATE ON meeting_expected_outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_attendees_updated_at
    BEFORE UPDATE ON meeting_attendees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_decisions_updated_at
    BEFORE UPDATE ON meeting_decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_action_items_updated_at
    BEFORE UPDATE ON meeting_action_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_connections_updated_at
    BEFORE UPDATE ON calendar_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENTITY RELATIONSHIPS (Graph-Ready)
-- Reference: See ENTITY_MODEL.md Section 9 for full schema
-- This migration assumes entity_relationships table exists from 031-entity-relationships.sql
-- ============================================================================

-- No table creation here - entity_relationships is a shared infrastructure table
-- defined in ENTITY_MODEL.md Section 12.7 and created in a separate migration.
-- This comment documents that Meeting Lifecycle USES entity_relationships for:
--   - user → organized → meeting
--   - user → owns → meeting
--   - user → attended → meeting (with response/role context)
--   - meeting → produced → decision
--   - meeting → produced → task (action items)
--   - task → subtask_of → task (meeting task)
--   - decision → informed_by → document
--   - decision → discussed_in → meeting
```

### Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MEETING ENTITY RELATIONSHIPS                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────┐                                                               │
│   │    AREA     │                                                               │
│   └──────┬──────┘                                                               │
│          │ 1:N                                                                  │
│          ▼                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                           MEETING                                        │   │
│   │                                                                         │   │
│   │  • title, purpose                                                       │   │
│   │  • organizer_id (who scheduled)                                         │   │
│   │  • owner_id (who is accountable) ────────────────────┐                  │   │
│   │  • task_id (the meeting task) ───────────────────────┼──┐               │   │
│   │  • page_id (generated minutes) ──────────────────────┼──┼──┐            │   │
│   │  • status, transcript, etc.                          │  │  │            │   │
│   └─────────────────────────────────────────────────────────┼──┼──┼─────────┘   │
│          │                                               │  │  │               │
│          │ 1:N                                           │  │  │               │
│   ┌──────┴──────────────────────────────────────┐        │  │  │               │
│   │                                             │        │  │  │               │
│   ▼                                             ▼        │  │  │               │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │  │               │
│   │  ATTENDEES  │  │   AGENDA    │  │  OUTCOMES   │     │  │  │               │
│   │             │  │   ITEMS     │  │  (expected) │     │  │  │               │
│   │ • user_id   │  │             │  │             │     │  │  │               │
│   │ • is_owner★ │  │ • title     │  │ • desc      │     │  │  │               │
│   │ • response  │  │ • duration  │  │ • achieved? │     │  │  │               │
│   └─────────────┘  └─────────────┘  └──────┬──────┘     │  │  │               │
│                                            │            │  │  │               │
│                                   linked_to│            │  │  │               │
│   ┌────────────────────────────────────────┴────────────┼──┼──┼───────────┐   │
│   │                                                     │  │  │           │   │
│   │  AFTER MEETING CAPTURE:                             │  │  │           │   │
│   │                                                     │  │  │           │   │
│   ▼                                                     │  │  │           │   │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │  │           │   │
│   │  DECISIONS  │  │   ACTION    │  │ KEY POINTS  │     │  │  │           │   │
│   │             │  │   ITEMS     │  │             │     │  │  │           │   │
│   │ • title     │  │             │  │ • content   │     │  │  │           │   │
│   │ • owner     │  │ • title     │  │ • speaker   │     │  │  │           │   │
│   │ • confirmed │  │ • assignee  │  │             │     │  │  │           │   │
│   │             │  │ • subtask_id│──┼──┐          │     │  │  │           │   │
│   └──────┬──────┘  └─────────────┘  └─────────────┘     │  │  │           │   │
│          │                          │                    │  │  │           │   │
│          │ propagated_to            │ creates            │  │  │           │   │
│          ▼                          ▼                    │  │  │           │   │
│   ┌─────────────┐           ┌─────────────┐             │  │  │           │   │
│   │    AREA     │           │   SUBTASK   │◄────────────┘  │  │           │   │
│   │   CONTEXT   │           │             │                │  │           │   │
│   │  (Memory)   │           │ parent_id = │◄───────────────┘  │           │   │
│   └─────────────┘           │ meeting_task│                   │           │   │
│                             └─────────────┘                   │           │   │
│                                                               │           │   │
│   ┌─────────────────────────────────────────────────────────────┐         │   │
│   │                         TASK (meeting type)                 │◄────────┘   │
│   │                                                             │             │
│   │  • task_type = 'meeting'                                    │             │
│   │  • meeting_id = meeting.id                                  │             │
│   │  • assignee_id = meeting.owner_id                           │             │
│   │  • due_date = meeting.scheduled_start                       │             │
│   │  • parent_id = NULL (top-level)                             │             │
│   │                                                             │             │
│   │  SUBTASKS (action items):                                   │             │
│   │  • parent_id = this task                                    │             │
│   │  • assignee_id = action_item.assignee                       │             │
│   └─────────────────────────────────────────────────────────────┘             │
│                                                                               │
│   ┌───────────────────────────────────────────────────────────────────────────┘
│   │
│   ▼
│   ┌─────────────────────────────────────────────────────────────┐
│   │                         PAGE (minutes)                       │
│   │                                                             │
│   │  • area_id = meeting.area_id                                │
│   │  • title = "{meeting.title} - Meeting Notes"                │
│   │  • content = generated TipTap document                      │
│   │  • visibility = 'area' (shared with Area members)           │
│   └─────────────────────────────────────────────────────────────┘
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Graph-Ready Relationship Capture

Meetings are rich relationship generators. We capture these in the `entity_relationships` table (see ENTITY_MODEL.md Section 9) to enable expertise discovery, provenance queries, and future graph analytics.

> **Principle**: Capture relationships when they happen, for relationships that FKs don't already give us.

#### Relationships Captured by Meeting Lifecycle

| When | Relationship | Source → Target | Context Stored |
|------|--------------|-----------------|----------------|
| **Meeting Created** ||||
| Schedule confirmed | `organized` | user → meeting | `{ "role": "organizer" }` |
| Owner assigned | `owns` | user → meeting | `{ "role": "accountable" }` |
| Attendees invited | `attended` | user → meeting | `{ "response": "accepted/pending", "role": "required/optional" }` |
| **Meeting Finalized** ||||
| Decision confirmed | `produced` | meeting → decision | `{ "ai_confidence": 0.92 }` |
| Decision assigned | `owns` | user → decision | `{ "confirmed_at": "..." }` |
| Action item created | `produced` | meeting → task | `{ "source": "action_item" }` |
| Subtask linked | `subtask_of` | task → meeting_task | `{}` |
| Document referenced | `informed_by` | decision → document | `{ "reference_type": "supporting" }` |
| **Context Propagated** ||||
| Memory created | `discussed_in` | decision → meeting | `{ "propagated_at": "..." }` |

#### Relationship Capture Code Pattern

```typescript
// In meeting-service.ts or meeting-relationships.ts

import { postgresEntityRelationshipRepository } from '$lib/server/persistence';

async function captureAttendeeRelationships(
  meeting: Meeting,
  attendees: MeetingAttendee[],
  userId: string
): Promise<void> {
  const relationships = attendees
    .filter(a => a.userId) // Only internal users
    .map(attendee => ({
      sourceType: 'user' as const,
      sourceId: attendee.userId!,
      relationship: 'attended' as const,
      targetType: 'meeting' as const,
      targetId: meeting.id,
      weight: attendee.isOwner ? 1.0 : 0.8,
      context: {
        response: attendee.responseStatus,
        role: attendee.attendeeType,
        isOwner: attendee.isOwner
      },
      createdBy: userId
    }));

  await postgresEntityRelationshipRepository.createMany(relationships);
}

async function captureMeetingOutcomes(
  meeting: Meeting,
  decisions: MeetingDecision[],
  actionItems: MeetingActionItem[],
  userId: string
): Promise<void> {
  const relationships = [];

  // Decisions produced by meeting
  for (const decision of decisions) {
    relationships.push({
      sourceType: 'meeting',
      sourceId: meeting.id,
      relationship: 'produced',
      targetType: 'decision',
      targetId: decision.id,
      context: { ai_confidence: decision.aiConfidence }
    });

    // Decision owner
    if (decision.ownerUserId) {
      relationships.push({
        sourceType: 'user',
        sourceId: decision.ownerUserId,
        relationship: 'owns',
        targetType: 'decision',
        targetId: decision.id
      });
    }
  }

  // Action items → tasks produced by meeting
  for (const item of actionItems.filter(a => a.subtaskId)) {
    relationships.push({
      sourceType: 'meeting',
      sourceId: meeting.id,
      relationship: 'produced',
      targetType: 'task',
      targetId: item.subtaskId!,
      context: { source: 'action_item', ai_confidence: item.aiConfidence }
    });

    // Subtask relationship
    relationships.push({
      sourceType: 'task',
      sourceId: item.subtaskId!,
      relationship: 'subtask_of',
      targetType: 'task',
      targetId: meeting.taskId!
    });
  }

  await postgresEntityRelationshipRepository.createMany(relationships);
}
```

#### Why This Matters

These relationships enable queries that foreign keys alone cannot:

```sql
-- "Find experts on payment processing"
-- Uses: user → attended → meeting + meeting → produced → decision
-- Where decisions relate to "payments" (semantic search)

-- "What led to the microservices decision?"
-- Uses: decision → discussed_in → meeting + decision → informed_by → document
-- Traverses provenance chain backwards

-- "Who should I invite to discuss API rate limiting?"
-- Uses: user → attended → meeting + meeting → produced → decision
-- Finds users with related expertise
```

See `docs/AI_RETRIEVAL_ARCHITECTURE.md` for complete query patterns.

---

## 5. Microsoft Graph Integration

### Required Permissions

| Permission | Type | Purpose | Admin Consent |
|------------|------|---------|---------------|
| `Calendars.ReadWrite` | Delegated | Create/update calendar events | No |
| `Calendars.Read` | Delegated | Query free/busy, list events | No |
| `OnlineMeetings.ReadWrite` | Delegated | Create Teams meetings | No |
| `OnlineMeetingTranscript.Read.All` | Delegated | Read meeting transcripts | Yes |
| `User.Read` | Delegated | Get user profile info | No |

### OAuth Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MICROSOFT GRAPH OAUTH FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. USER INITIATES                                                               │
│     Settings → Integrations → [ Connect Outlook Calendar ]                       │
│                                                                                  │
│  2. REDIRECT TO MICROSOFT                                                        │
│     GET https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize         │
│     ?client_id={STRATAI_CLIENT_ID}                                               │
│     &redirect_uri=https://app.stratai.com/api/integrations/microsoft/callback    │
│     &response_type=code                                                          │
│     &scope=Calendars.ReadWrite OnlineMeetings.ReadWrite User.Read offline_access │
│     &state={encrypted_user_id_and_csrf}                                          │
│                                                                                  │
│  3. USER CONSENTS                                                                │
│     Microsoft shows permission screen, user clicks Accept                        │
│                                                                                  │
│  4. CALLBACK WITH CODE                                                           │
│     GET /api/integrations/microsoft/callback?code={auth_code}&state={...}        │
│                                                                                  │
│  5. EXCHANGE FOR TOKENS                                                          │
│     POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token            │
│     → Receive access_token + refresh_token                                       │
│                                                                                  │
│  6. STORE & USE                                                                  │
│     Encrypt tokens, store in calendar_connections table                          │
│     User sees: "Outlook Calendar connected ✓"                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key API Operations

#### Create Meeting with Teams Link

```typescript
const createMeeting = async (meeting: Meeting, timeSlot: TimeSlot, connection: CalendarConnection) => {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': `outlook.timezone="${timeSlot.timezone}"`
    },
    body: JSON.stringify({
      subject: meeting.title,
      body: {
        contentType: 'HTML',
        content: generateMeetingBody(meeting)
      },
      start: { dateTime: timeSlot.start, timeZone: timeSlot.timezone },
      end: { dateTime: timeSlot.end, timeZone: timeSlot.timezone },
      attendees: meeting.attendees.map(a => ({
        emailAddress: { address: a.email, name: a.name },
        type: a.type === 'optional' ? 'optional' : 'required'
      })),
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness'
    })
  });

  return response.json();
};
```

#### Query Free/Busy

```typescript
const findAvailableTimes = async (attendeeEmails: string[], searchWindow: TimeRange, connection: CalendarConnection) => {
  // Only internal attendees can be queried
  const internalEmails = attendeeEmails.filter(email => isInternalEmail(email));

  const response = await fetch('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      schedules: internalEmails,
      startTime: { dateTime: searchWindow.start, timeZone: searchWindow.timezone },
      endTime: { dateTime: searchWindow.end, timeZone: searchWindow.timezone },
      availabilityViewInterval: 30
    })
  });

  return findCommonFreeSlots(await response.json());
};
```

#### Fetch Transcript (When Available)

```typescript
const fetchTranscript = async (meeting: Meeting, connection: CalendarConnection) => {
  // Get online meeting by join URL
  const meetingsResponse = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter=joinWebUrl eq '${encodeURIComponent(meeting.externalJoinUrl)}'`,
    { headers: { 'Authorization': `Bearer ${connection.accessToken}` } }
  );

  const meetings = await meetingsResponse.json();
  if (!meetings.value?.[0]) {
    return { available: false, reason: 'Meeting not found in Teams' };
  }

  // Get transcripts
  const transcriptsResponse = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetings.value[0].id}/transcripts`,
    { headers: { 'Authorization': `Bearer ${connection.accessToken}` } }
  );

  const transcripts = await transcriptsResponse.json();
  if (!transcripts.value?.length) {
    return { available: false, reason: 'No transcripts found' };
  }

  // Get content
  const contentResponse = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetings.value[0].id}/transcripts/${transcripts.value[0].id}/content?$format=text/vtt`,
    { headers: { 'Authorization': `Bearer ${connection.accessToken}` } }
  );

  return {
    available: true,
    content: await contentResponse.text(),
    format: 'vtt'
  };
};
```

---

## 6. Phase 1: AI-Guided Meeting Creation

### User Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CREATE MEETING                                                    Step 1 of 5  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Area: Nedbank SVS Project                                                       │
│                                                                                  │
│  STEP 1: CONTEXT                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  What's this meeting about?                                                 ││
│  │  ┌───────────────────────────────────────────────────────────────────────┐  ││
│  │  │ Discuss API integration approach with the technical team              │  ││
│  │  └───────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ 💡 AI Understanding:                                                │    ││
│  │  │                                                                     │    ││
│  │  │ This sounds like a technical decision meeting. Suggested purpose:   │    ││
│  │  │ "Align technical team on API integration strategy and agree on      │    ││
│  │  │  approach for Nedbank SVS Phase 2 delivery"                         │    ││
│  │  │                                                                     │    ││
│  │  │ [ Use This ]  [ Edit ]                                              │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                                            [ Continue → ]        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  CREATE MEETING                                                    Step 2 of 5  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  STEP 2: EXPECTED OUTCOMES                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  What decisions or outcomes do you need from this meeting?                  ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ 💡 AI Suggestions based on Area context:                            │    ││
│  │  │                                                                     │    ││
│  │  │ ☑ Decide: REST vs GraphQL for external API                         │    ││
│  │  │ ☑ Decide: Authentication approach (OAuth2 vs API keys)             │    ││
│  │  │ ☐ Align: Timeline for Phase 2 delivery                             │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  │  [ + Add custom outcome ]                                                   ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                             [ ← Back ]  [ Continue → ]           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  CREATE MEETING                                                    Step 3 of 5  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  STEP 3: AGENDA                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  💡 AI-generated agenda based on your outcomes:                             ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │  1. Context Setting (5 min)                            [Edit] [×]   │    ││
│  │  │     Brief recap of current state and Phase 2 requirements           │    ││
│  │  ├─────────────────────────────────────────────────────────────────────┤    ││
│  │  │  2. REST vs GraphQL Discussion (15 min)                [Edit] [×]   │    ││
│  │  │     Present options, discuss trade-offs → Decision                  │    ││
│  │  ├─────────────────────────────────────────────────────────────────────┤    ││
│  │  │  3. Authentication Approach (10 min)                   [Edit] [×]   │    ││
│  │  │     OAuth2 vs API keys → Decision                                   │    ││
│  │  ├─────────────────────────────────────────────────────────────────────┤    ││
│  │  │  4. Next Steps & Actions (5 min)                       [Edit] [×]   │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  │  [ + Add agenda item ]                              Total: 35 min           ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                             [ ← Back ]  [ Continue → ]           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  CREATE MEETING                                                    Step 4 of 5  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  STEP 4: ATTENDEES & OWNER                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  Who should attend?                                                         ││
│  │                                                                             ││
│  │  From this Space:                                                           ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ ☑ John Smith (PM)                      Required ▼     ★ OWNER       │    ││
│  │  │ ☑ Sarah Chen (Tech Lead)               Required ▼                   │    ││
│  │  │ ☐ Mike Johnson (Dev)                   Optional ▼                   │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  │  External attendees:                                                        ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ ✉ david@nedbank.co.za (David Nkosi)   Required ▼                   │    ││
│  │  │ [ + Add external attendee ]                                         │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  │  ─────────────────────────────────────────────────────────────────────────  ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ 👤 MEETING OWNER                                                    │    ││
│  │  │                                                                     │    ││
│  │  │ The owner is responsible for:                                       │    ││
│  │  │ • Preparing for the meeting (task appears in their list)            │    ││
│  │  │ • Running the meeting                                               │    ││
│  │  │ • Capturing outcomes after                                          │    ││
│  │  │                                                                     │    ││
│  │  │ Current owner: John Smith (you)                                     │    ││
│  │  │                                                                     │    ││
│  │  │ [ Change Owner ▼ ]                                                  │    ││
│  │  │   ○ John Smith (you)                                                │    ││
│  │  │   ○ Sarah Chen                                                      │    ││
│  │  │   ○ Mike Johnson                                                    │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                             [ ← Back ]  [ Find Times → ]         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  CREATE MEETING                                                    Step 5 of 5  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  STEP 5: SCHEDULE                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  Find a time in the next [ 2 days ▼ ]                                       ││
│  │                                                                             ││
│  │  ┌───────────────────────────────────────────────────────────────────────┐  ││
│  │  │ 🔍 Checking availability for internal attendees...                    │  ││
│  │  │    ✓ John Smith    ✓ Sarah Chen    ✓ Mike Johnson                     │  ││
│  │  │    ⚠ David (external) - will receive proposed times                   │  ││
│  │  └───────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                             ││
│  │  Suggested times (all internal attendees free):                             ││
│  │                                                                             ││
│  │  ○ Tomorrow, Jan 14                                                         ││
│  │    ┌─────────────────────────────────────────────────────────────────────┐  ││
│  │    │  10:00 AM - 10:35 AM                                      [ Select ]│  ││
│  │    │  ✓ All 3 internal attendees free                                   │  ││
│  │    └─────────────────────────────────────────────────────────────────────┘  ││
│  │    ┌─────────────────────────────────────────────────────────────────────┐  ││
│  │    │  2:30 PM - 3:05 PM                                 💡 [ Select ]    │  ││
│  │    │  ✓ All 3 internal attendees free                                   │  ││
│  │    │  Recommended: Good energy for decisions                            │  ││
│  │    └─────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                             [ ← Back ]  [ Schedule Meeting ]     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### On "Schedule Meeting" - What Happens

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ON SCHEDULE - SYSTEM ACTIONS                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  User clicks "Schedule Meeting"                                                  │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  1. CREATE MEETING RECORD                                                 │  │
│  │     • meeting.status = 'scheduled'                                        │  │
│  │     • meeting.organizer_id = current_user                                 │  │
│  │     • meeting.owner_id = selected_owner                                   │  │
│  │     • meeting.scheduled_at = NOW()                                        │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  2. CREATE MEETING TASK (for owner)                                       │  │
│  │     • task.task_type = 'meeting'                                          │  │
│  │     • task.meeting_id = meeting.id                                        │  │
│  │     • task.title = meeting.title                                          │  │
│  │     • task.assignee_id = meeting.owner_id                                 │  │
│  │     • task.area_id = meeting.area_id                                      │  │
│  │     • task.due_date = meeting.scheduled_start                             │  │
│  │     • task.status = 'pending'                                             │  │
│  │     • meeting.task_id = task.id                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  3. CREATE TEAMS MEETING (via Graph API)                                  │  │
│  │     • POST /me/events with isOnlineMeeting: true                          │  │
│  │     • Store external_event_id, external_join_url                          │  │
│  │     • Invites automatically sent to all attendees                         │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  4. CONFIRMATION                                                          │  │
│  │     • Show success message                                                │  │
│  │     • "Task created for {owner_name}"                                     │  │
│  │     • "Invites sent to {attendee_count} people"                           │  │
│  │     • Link to view meeting task                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Phase 2: Intelligent Scheduling

### Free/Busy Query

- **Internal attendees**: Query via Microsoft Graph API `/calendar/getSchedule`
- **External attendees**: Cannot query; propose times and note "External attendees will receive these options"

### Time Slot Selection

The system suggests slots where all internal attendees are free, ordered by:
1. Soonest available
2. Time of day preference (configurable)
3. Duration fit

---

## 8. Phase 3: Meeting Execution & Prep

### Meeting Task View (Before Meeting)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📅 Q1 Planning Review                                           MEETING TASK   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Status: Scheduled                         Tomorrow, Jan 14 at 2:30 PM          │
│  Area: Nedbank SVS Project                 Duration: 35 min                     │
│  Owner: John Smith (you)                                                        │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════════│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  📋 MEETING DETAILS                                                         ││
│  │  ─────────────────────────────────────────────────────────────────────────  ││
│  │                                                                             ││
│  │  Purpose:                                                                   ││
│  │  Align technical team on API integration strategy for Phase 2               ││
│  │                                                                             ││
│  │  Expected Outcomes:                                                         ││
│  │  • Decide: REST vs GraphQL for external API                                 ││
│  │  • Decide: Authentication approach (OAuth2 vs API keys)                     ││
│  │                                                                             ││
│  │  Agenda:                                                                    ││
│  │  1. Context Setting (5 min)                                                 ││
│  │  2. REST vs GraphQL Discussion (15 min)                                     ││
│  │  3. Authentication Approach (10 min)                                        ││
│  │  4. Next Steps & Actions (5 min)                                            ││
│  │                                                                             ││
│  │  Attendees: John (you), Sarah, Mike, David (Nedbank)                        ││
│  │                                                                             ││
│  │  [ Join Meeting ]  [ View Full Agenda ]  [ Edit Meeting ]                   ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  💡 AI PREP ASSISTANT                                                       ││
│  │  ─────────────────────────────────────────────────────────────────────────  ││
│  │                                                                             ││
│  │  Based on recent Area activity, consider these points:                      ││
│  │                                                                             ││
│  │  • Open blocker: "API design decision needed" (Task #123)                   ││
│  │  • Recent decision: "Use PostgreSQL for new service" (Jan 10)               ││
│  │  • Last meeting with David: Dec 15 (discussed timeline concerns)            ││
│  │                                                                             ││
│  │  [ Prepare for Meeting ]  ← Opens chat with meeting context                 ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  📝 PREP NOTES (private)                                                    ││
│  │  ─────────────────────────────────────────────────────────────────────────  ││
│  │                                                                             ││
│  │  ┌───────────────────────────────────────────────────────────────────────┐  ││
│  │  │ • Ask Sarah about caching strategy before REST decision              │  ││
│  │  │ • David mentioned rate limiting last time - follow up                │  ││
│  │  │                                                                      │  ││
│  │  └───────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Phase 4: Post-Meeting Capture (via Task)

### Meeting Task View (After Meeting)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📅 Q1 Planning Review                                           MEETING TASK   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Status: Awaiting Capture                  Meeting ended 15 min ago             │
│  Area: Nedbank SVS Project                 Duration: 38 min (actual)            │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════════│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  📝 CAPTURE MEETING OUTCOMES                                                ││
│  │  ─────────────────────────────────────────────────────────────────────────  ││
│  │                                                                             ││
│  │  How would you like to capture this meeting?                                ││
│  │                                                                             ││
│  │  ┌───────────────────────┐  ┌───────────────────────┐                      ││
│  │  │  🔄 PULL FROM TEAMS   │  │  📤 UPLOAD TRANSCRIPT │                      ││
│  │  │                       │  │                       │                      ││
│  │  │  Auto-fetch if        │  │  .vtt or .docx file   │                      ││
│  │  │  transcription was    │  │  from any source      │                      ││
│  │  │  enabled              │  │                       │                      ││
│  │  │                       │  │                       │                      ││
│  │  │  [ Try Pull ]         │  │  [ Choose File ]      │                      ││
│  │  └───────────────────────┘  └───────────────────────┘                      ││
│  │                                                                             ││
│  │  ┌───────────────────────┐  ┌───────────────────────┐                      ││
│  │  │  ✏️ GUIDED CAPTURE    │  │  ⏭️ SKIP FOR NOW      │                      ││
│  │  │                       │  │                       │                      ││
│  │  │  Answer questions     │  │  Complete task        │                      ││
│  │  │  to capture key       │  │  without capturing    │                      ││
│  │  │  outcomes manually    │  │  outcomes             │                      ││
│  │  │                       │  │                       │                      ││
│  │  │  [ Start Guided ]     │  │  [ Skip ]             │                      ││
│  │  └───────────────────────┘  └───────────────────────┘                      ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ 💡 Tip: Guided capture works great even without a transcript.       │    ││
│  │  │ AI will help you structure your notes into decisions and actions.   │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Manual Upload (Always Available)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  UPLOAD TRANSCRIPT                                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │                         ┌─────────────────────┐                             ││
│  │                         │                     │                             ││
│  │                         │    📄 Drop file     │                             ││
│  │                         │       here          │                             ││
│  │                         │                     │                             ││
│  │                         │  or click to browse │                             ││
│  │                         │                     │                             ││
│  │                         └─────────────────────┘                             ││
│  │                                                                             ││
│  │  Supported formats:                                                         ││
│  │  • .vtt (WebVTT from Teams/Zoom)                                            ││
│  │  • .docx (Word transcript from Teams)                                       ││
│  │  • .txt (Plain text transcript)                                             ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ ℹ️ How to get your transcript:                                       │    ││
│  │  │                                                                     │    ││
│  │  │ Teams: Open meeting in Teams → Files tab → Download transcript      │    ││
│  │  │ Zoom: Meeting recordings → More → Download transcript               │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  [ Cancel ]                                                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Phase 5: AI-Assisted Extraction

When a transcript is available (pulled or uploaded), AI extracts:

### Extraction Prompt

```typescript
const EXTRACTION_SYSTEM_PROMPT = `You are an expert meeting analyst. Extract structured information from this meeting transcript.

Meeting Context:
- Title: {meeting.title}
- Purpose: {meeting.purpose}
- Expected Outcomes: {meeting.expectedOutcomes}
- Attendees: {meeting.attendees}
- Area: {area.name}

Extract:

1. DECISIONS: What was decided? Who owns each decision? Why (rationale)?

2. ACTION ITEMS: What needs to be done? Who is responsible? By when?

3. KEY POINTS: Important discussion points, concerns raised, insights shared.

Return JSON matching this schema with confidence scores:
- 0.9+ : Explicitly stated with clear ownership
- 0.7-0.9 : Clearly implied but needs confirmation
- <0.7 : Inferred, definitely needs human review

If ownership is unclear, set to null for human review.`;
```

### Processing UI

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PROCESSING TRANSCRIPT                                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │                      🔄 Analyzing transcript...                             ││
│  │                                                                             ││
│  │  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  45%                       ││
│  │                                                                             ││
│  │  ✓ Transcript loaded (38 min, 4 speakers detected)                         ││
│  │  ✓ Identifying key moments                                                 ││
│  │  → Extracting decisions...                                                 ││
│  │  ○ Extracting action items                                                 ││
│  │  ○ Matching to expected outcomes                                           ││
│  │                                                                             ││
│  │  This usually takes 30-60 seconds.                                         ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  [ Cancel ]                                                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Phase 6: Guided Capture Flow

Whether using AI extraction or manual entry, the capture follows a guided flow:

### Step 1: Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CAPTURE: Q1 Planning Review                                        Step 1 of 4 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SUMMARY                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  In 2-3 sentences, what happened in this meeting?                           ││
│  │                                                                             ││
│  │  ┌───────────────────────────────────────────────────────────────────────┐  ││
│  │  │ We aligned on using REST API for Phase 2 integration. OAuth2 will    │  ││
│  │  │ be used for partner authentication. Implementation starts next       │  ││
│  │  │ sprint with Sarah leading the API spec work.                         │  ││
│  │  └───────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ 💡 If you uploaded a transcript, AI pre-filled this. Edit as needed.│    ││
│  │  │    Without transcript, just type your summary above.                │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                                    [ Skip ]  [ Continue → ]      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Step 2: Decisions

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CAPTURE: Q1 Planning Review                                        Step 2 of 4 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  DECISIONS                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  Your expected outcomes were:                                               ││
│  │  • Decide: REST vs GraphQL for external API                                 ││
│  │  • Decide: Authentication approach                                          ││
│  │                                                                             ││
│  │  ─────────────────────────────────────────────────────────────────────────  ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │  Decision 1                                    ✓ Confirmed  [Remove] │    ││
│  │  │                                                                     │    ││
│  │  │  What was decided?                                                  │    ││
│  │  │  ┌───────────────────────────────────────────────────────────────┐  │    ││
│  │  │  │ Use REST API for external integrations                       │  │    ││
│  │  │  └───────────────────────────────────────────────────────────────┘  │    ││
│  │  │                                                                     │    ││
│  │  │  Why? (rationale)                                                   │    ││
│  │  │  ┌───────────────────────────────────────────────────────────────┐  │    ││
│  │  │  │ Team has more REST experience, simpler for partners          │  │    ││
│  │  │  └───────────────────────────────────────────────────────────────┘  │    ││
│  │  │                                                                     │    ││
│  │  │  Who owns this decision?                                            │    ││
│  │  │  [ Sarah Chen                    ▼ ]                                │    ││
│  │  │                                                                     │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │  Decision 2                                  ⚠ Needs owner  [Remove] │    ││
│  │  │                                                                     │    ││
│  │  │  What was decided?                                                  │    ││
│  │  │  ┌───────────────────────────────────────────────────────────────┐  │    ││
│  │  │  │ Use OAuth2 for partner authentication                        │  │    ││
│  │  │  └───────────────────────────────────────────────────────────────┘  │    ││
│  │  │                                                                     │    ││
│  │  │  Who owns this decision?                                            │    ││
│  │  │  [ Select owner...               ▼ ]  ← Required                    │    ││
│  │  │    ○ John Smith                                                     │    ││
│  │  │    ○ Sarah Chen                                                     │    ││
│  │  │    ○ Mike Johnson                                                   │    ││
│  │  │    ○ David (external)                                               │    ││
│  │  │                                                                     │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  │  [ + Add another decision ]                                                 ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                             [ ← Back ]  [ Continue → ]           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Step 3: Action Items

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CAPTURE: Q1 Planning Review                                        Step 3 of 4 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ACTION ITEMS                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  What needs to happen next?                                                 ││
│  │  Action items will become subtasks of this meeting.                         ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │  Action Item 1                                             [Remove]  │    ││
│  │  │                                                                     │    ││
│  │  │  What needs to be done?                                             │    ││
│  │  │  ┌───────────────────────────────────────────────────────────────┐  │    ││
│  │  │  │ Draft REST API specification document                        │  │    ││
│  │  │  └───────────────────────────────────────────────────────────────┘  │    ││
│  │  │                                                                     │    ││
│  │  │  Who?                           Due?                                │    ││
│  │  │  [ Sarah Chen      ▼ ]          [ Jan 21         📅 ]               │    ││
│  │  │                                                                     │    ││
│  │  │  ☑ Create as subtask                                                │    ││
│  │  │                                                                     │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │  Action Item 2                                             [Remove]  │    ││
│  │  │                                                                     │    ││
│  │  │  What needs to be done?                                             │    ││
│  │  │  ┌───────────────────────────────────────────────────────────────┐  │    ││
│  │  │  │ Set up OAuth2 test environment                               │  │    ││
│  │  │  └───────────────────────────────────────────────────────────────┘  │    ││
│  │  │                                                                     │    ││
│  │  │  Who?                           Due?                                │    ││
│  │  │  [ Mike Johnson    ▼ ]          [ Jan 24         📅 ]               │    ││
│  │  │                                                                     │    ││
│  │  │  ☑ Create as subtask                                                │    ││
│  │  │                                                                     │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  │  [ + Add action item ]                                                      ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ 💡 Subtasks appear in assignees' task lists and track back to this  │    ││
│  │  │    meeting. You can view progress from the meeting task.            │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                             [ ← Back ]  [ Continue → ]           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Step 4: Key Points & Complete

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CAPTURE: Q1 Planning Review                                        Step 4 of 4 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  KEY POINTS & COMPLETE                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  Anything else important to remember?                                       ││
│  │  (Concerns raised, questions to follow up, insights shared)                 ││
│  │                                                                             ││
│  │  ┌───────────────────────────────────────────────────────────────────────┐  ││
│  │  │ • David emphasized Nedbank prefers standard REST patterns            │  ││
│  │  │ • Need to confirm rate limiting requirements before spec             │  ││
│  │  │ • Sarah raised caching concerns - discuss in next sync               │  ││
│  │  └───────────────────────────────────────────────────────────────────────┘  ││
│  │                                                                             ││
│  │  ─────────────────────────────────────────────────────────────────────────  ││
│  │                                                                             ││
│  │  REVIEW YOUR CAPTURE                                                        ││
│  │                                                                             ││
│  │  Summary: ✓ Added                                                           ││
│  │  Decisions: 2 captured (both with owners)                                   ││
│  │  Action Items: 2 items → 2 subtasks will be created                         ││
│  │  Key Points: Added                                                          ││
│  │                                                                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │ What happens when you complete:                                     │    ││
│  │  │                                                                     │    ││
│  │  │ ✓ Meeting Page created (Meeting Notes in Nedbank SVS Project)       │    ││
│  │  │ ✓ 2 subtasks created and assigned                                   │    ││
│  │  │ ✓ Decisions added to Area context                                   │    ││
│  │  │ ✓ This meeting task marked as complete                              │    ││
│  │  │ ✓ Assignees notified of their subtasks                              │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                 [ ← Back ]  [ Complete Meeting Task ]            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Phase 7: Context Integration

### On "Complete Meeting Task"

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    FINALIZATION PROCESS                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  User clicks "Complete Meeting Task"                                             │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  1. CREATE MEETING MINUTES PAGE                                           │  │
│  │     • Generate TipTap document from captured data                         │  │
│  │     • Include: summary, decisions, action items, key points               │  │
│  │     • Save to Area: "{meeting.title} - Meeting Notes"                     │  │
│  │     • Set visibility: 'area' (shared with Area members)                   │  │
│  │     • Link: meeting.page_id = page.id                                     │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  2. CREATE SUBTASKS (from action items)                                   │  │
│  │     For each action item with create_as_subtask = true:                   │  │
│  │     • Create task with parent_id = meeting.task_id                        │  │
│  │     • task.assignee_id = action_item.assignee_user_id                     │  │
│  │     • task.due_date = action_item.due_date                                │  │
│  │     • task.area_id = meeting.area_id                                      │  │
│  │     • Link: action_item.subtask_id = task.id                              │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  3. PROPAGATE DECISIONS TO AREA CONTEXT                                   │  │
│  │     For each confirmed decision:                                          │  │
│  │     • Add to Area's decision history (for AI context)                     │  │
│  │     • Include: what, why, who, when, source_meeting_id                    │  │
│  │     • Mark: decision.propagated_to_context = true                         │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  4. UPDATE MEETING & TASK STATUS                                          │  │
│  │     • meeting.status = 'finalized'                                        │  │
│  │     • meeting.finalized_at = NOW()                                        │  │
│  │     • task.status = 'completed'                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  5. NOTIFY STAKEHOLDERS                                                   │  │
│  │     • Notify subtask assignees of new tasks                               │  │
│  │     • (Optional) Email meeting summary to attendees                       │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                           │                                                      │
│                           ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  6. SHOW COMPLETION CONFIRMATION                                          │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Completion Confirmation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ✅ MEETING CAPTURED                                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Q1 Planning Review has been captured successfully.                              │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                             ││
│  │  📄 Meeting notes saved                                                     ││
│  │     "Q1 Planning Review - Meeting Notes"                                    ││
│  │     Saved to: Nedbank SVS Project                                           ││
│  │     [ View Page ]                                                           ││
│  │                                                                             ││
│  │  ✅ 2 decisions recorded                                                    ││
│  │     Added to Area context for future AI reference                           ││
│  │                                                                             ││
│  │  📋 2 subtasks created                                                      ││
│  │     ┌─────────────────────────────────────────────────────────────────┐    ││
│  │     │ • Draft REST API specification → Sarah (due Jan 21)             │    ││
│  │     │ • Set up OAuth2 test environment → Mike (due Jan 24)            │    ││
│  │     └─────────────────────────────────────────────────────────────────┘    ││
│  │     [ View Subtasks ]                                                       ││
│  │                                                                             ││
│  │  🔔 Assignees notified                                                      ││
│  │     Sarah and Mike have been notified of their new tasks                    ││
│  │                                                                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                                                              [ Done ]            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Implementation Roadmap

### Phase Overview

| Phase | Focus | Duration | Key Deliverables |
|-------|-------|----------|------------------|
| **1** | Foundation | 3-4 weeks | DB schema, OAuth, calendar connection |
| **2** | Meeting Creation | 2-3 weeks | AI-guided wizard, owner selection |
| **3** | Scheduling | 2-3 weeks | Free/busy, Teams meeting creation |
| **4** | Task Integration | 2-3 weeks | Meeting task, task list display |
| **5** | Capture Flow | 3-4 weeks | Guided capture, transcript upload |
| **6** | AI Extraction | 2-3 weeks | Transcript processing, suggestions |
| **7** | Finalization | 2-3 weeks | Page gen, subtasks, context |

**Total: 16-23 weeks**

---

### Phase 1: Foundation (3-4 weeks)

**Goal**: Database schema, Microsoft Graph OAuth, calendar connection UI.

#### Deliverables

- [ ] Database migration 030-meeting-lifecycle.sql applied
- [ ] CalendarConnection repository (CRUD, token encryption)
- [ ] Microsoft OAuth flow (/api/integrations/microsoft/connect, /callback)
- [ ] Token refresh background job
- [ ] Settings UI: "Connect Outlook Calendar" card
- [ ] Connection status display

#### Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| P1.1 | User can initiate calendar connection from Settings | Manual: Click "Connect Outlook Calendar" redirects to Microsoft |
| P1.2 | OAuth flow completes successfully | Manual: After consent, redirected back with "Connected" status |
| P1.3 | Tokens stored encrypted in database | Verify: access_token_encrypted is not plaintext |
| P1.4 | Token refresh works before expiry | Verify: Background job refreshes tokens expiring in <30 min |
| P1.5 | User can disconnect calendar | Manual: "Disconnect" removes connection, confirms |
| P1.6 | Connection errors shown clearly | Manual: Invalid token shows "Connection expired, reconnect" |
| P1.7 | Multiple accounts NOT supported (V1) | Manual: Second connection replaces first |

---

### Phase 2: Meeting Creation (2-3 weeks)

**Goal**: AI-guided meeting creation wizard with owner selection.

#### Deliverables

- [ ] CreateMeetingModal component
- [ ] 5-step wizard: Context → Outcomes → Agenda → Attendees/Owner → Schedule
- [ ] AI integration for purpose/outcomes/agenda suggestions
- [ ] Attendee selector (Space members + external emails)
- [ ] Owner selection UI (defaults to creator)
- [ ] Meeting saved as 'draft' status

#### Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| P2.1 | User can start "New Meeting" from Area | Manual: Button visible, opens modal |
| P2.2 | AI suggests purpose from description | Manual: Type description, see AI suggestion |
| P2.3 | AI suggests outcomes from Area context | Manual: See relevant outcomes suggested |
| P2.4 | AI generates agenda from outcomes | Manual: Outcomes selected → agenda appears |
| P2.5 | User can select Space members as attendees | Manual: Search/select works |
| P2.6 | User can add external email attendees | Manual: Type email, add to list |
| P2.7 | Owner defaults to current user | Manual: Creator shown as owner |
| P2.8 | Owner can be changed to any attendee | Manual: Select different attendee as owner |
| P2.9 | Meeting saved as draft on exit (before schedule) | Verify: Database has meeting with status='draft' |
| P2.10 | Draft meetings visible in Area | Manual: See drafts in meeting list |

---

### Phase 3: Scheduling (2-3 weeks)

**Goal**: Free/busy query, time slot selection, Teams meeting creation.

#### Deliverables

- [ ] Free/busy API integration (/calendar/getSchedule)
- [ ] Time slot suggestion algorithm
- [ ] TimeSlotPicker component
- [ ] Graph API meeting creation with Teams link
- [ ] Task creation for owner on schedule

#### Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| P3.1 | Free/busy queried for internal attendees | Verify: API called with internal emails only |
| P3.2 | External attendees noted as "will propose times" | Manual: See note in UI |
| P3.3 | At least 3 time slots shown (if available) | Manual: See slot options |
| P3.4 | User can select a time slot | Manual: Click selects, shows confirmation |
| P3.5 | Teams meeting created via Graph API | Verify: external_event_id populated |
| P3.6 | Join URL stored and displayed | Manual: See "Join Meeting" link |
| P3.7 | Invites sent to all attendees | Verify: Attendees receive calendar invite |
| P3.8 | Task created for owner | Verify: Task with task_type='meeting' exists |
| P3.9 | Task assignee = owner | Verify: task.assignee_id = meeting.owner_id |
| P3.10 | Meeting status = 'scheduled' | Verify: meeting.status = 'scheduled' |
| P3.11 | Task appears in owner's task list | Manual: Owner sees meeting in task list |

---

### Phase 4: Task Integration (2-3 weeks)

**Goal**: Meeting task display in task list, prep view, Focus Mode support.

#### Deliverables

- [ ] Task type badge for meeting tasks (📅)
- [ ] Meeting task detail view (shows meeting info)
- [ ] Join button before meeting time
- [ ] Capture prompt after meeting time
- [ ] Prep notes section (private to owner)
- [ ] AI prep assistant (context suggestions)

#### Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| P4.1 | Meeting tasks show 📅 badge in task list | Manual: See icon |
| P4.2 | Meeting task shows meeting time (not just due date) | Manual: "Tomorrow at 2:30 PM" visible |
| P4.3 | Click meeting task opens meeting detail view | Manual: See purpose, agenda, attendees |
| P4.4 | "Join Meeting" button visible before meeting | Manual: Button links to Teams |
| P4.5 | "Capture Outcomes" prominent after meeting ends | Manual: Transition to capture view |
| P4.6 | Owner can add prep notes before meeting | Manual: Notes saved |
| P4.7 | AI prep assistant shows relevant Area context | Manual: See recent tasks, decisions |
| P4.8 | "Prepare for Meeting" opens chat with context | Manual: Chat includes meeting info |

---

### Phase 5: Capture Flow (3-4 weeks)

**Goal**: Guided capture flow, transcript upload, manual capture.

#### Deliverables

- [ ] Capture options UI (Pull from Teams, Upload, Guided, Skip)
- [ ] Transcript upload (VTT, DOCX, TXT parser)
- [ ] Manual upload always available
- [ ] Guided capture wizard (Summary, Decisions, Actions, Key Points)
- [ ] Decision owner selector (dropdown of attendees)
- [ ] Action item creator with assignee and due date

#### Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| P5.1 | Four capture options shown after meeting ends | Manual: See all four options |
| P5.2 | "Pull from Teams" attempts transcript fetch | Manual: Click shows loading, then result |
| P5.3 | Clear message if transcript unavailable | Manual: "No transcript found" with alternatives |
| P5.4 | Upload accepts .vtt files | Manual: Upload, file parsed |
| P5.5 | Upload accepts .docx files | Manual: Upload, file parsed |
| P5.6 | Upload accepts .txt files | Manual: Upload, file stored |
| P5.7 | "Guided Capture" works without transcript | Manual: Can enter all fields manually |
| P5.8 | Summary step captures 2-3 sentence overview | Manual: Can type and save |
| P5.9 | Decision step allows adding multiple decisions | Manual: Add, edit, remove decisions |
| P5.10 | Decision owner required before completion | Verify: Cannot complete with null owner |
| P5.11 | Action item step allows adding multiple items | Manual: Add, edit, remove |
| P5.12 | Action item assignee selector includes all attendees | Manual: See all attendees in dropdown |
| P5.13 | Action item due date picker works | Manual: Select date |
| P5.14 | "Skip" completes meeting without capture | Manual: Meeting finalized, no subtasks |

---

### Phase 6: AI Extraction (2-3 weeks)

**Goal**: AI-powered extraction from transcript, pre-filling guided capture.

#### Deliverables

- [ ] Extraction service with meeting context
- [ ] Extraction prompt optimized for decisions/actions
- [ ] Confidence scoring (high/medium/low)
- [ ] Pre-fill guided capture with AI suggestions
- [ ] Visual indicators for AI confidence

#### Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| P6.1 | Transcript triggers AI extraction | Verify: After upload, AI called |
| P6.2 | AI extracts decisions with rationale | Verify: Decisions populated in response |
| P6.3 | AI extracts action items with assignees | Verify: Actions populated |
| P6.4 | Confidence scores calculated per item | Verify: ai_confidence field populated |
| P6.5 | Low-confidence items highlighted | Manual: See ⚠ indicator |
| P6.6 | Pre-filled summary editable | Manual: Can edit AI summary |
| P6.7 | Pre-filled decisions editable | Manual: Can edit/remove |
| P6.8 | Pre-filled actions editable | Manual: Can edit/remove |
| P6.9 | AI failure falls back to manual | Manual: Error shown, guided capture still works |

---

### Phase 7: Finalization (2-3 weeks)

**Goal**: Page generation, subtask creation, context propagation.

#### Deliverables

- [ ] TipTap page generator from meeting data
- [ ] Subtask creation from action items
- [ ] Decision propagation to Area context
- [ ] Notification to subtask assignees
- [ ] Meeting completion confirmation UI

#### Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|--------------|
| P7.1 | Meeting Page created in Area | Verify: Page exists with meeting.page_id |
| P7.2 | Page title: "{meeting.title} - Meeting Notes" | Verify: Page.title format |
| P7.3 | Page contains summary, decisions, actions, key points | Manual: View page content |
| P7.4 | Page visibility = 'area' | Verify: page.visibility = 'area' |
| P7.5 | Subtasks created for action items | Verify: Tasks with parent_id = meeting.task_id |
| P7.6 | Subtask assignee = action item assignee | Verify: task.assignee_id matches |
| P7.7 | Subtask due date = action item due date | Verify: task.due_date matches |
| P7.8 | Decisions added to Area context | Verify: Context query returns decisions |
| P7.9 | Meeting task status = 'completed' | Verify: task.status = 'completed' |
| P7.10 | Meeting status = 'finalized' | Verify: meeting.status = 'finalized' |
| P7.11 | Subtask assignees notified | Verify: Notifications sent |
| P7.12 | Completion confirmation shown | Manual: See success message with links |
| P7.13 | Subtasks visible in assignees' task lists | Manual: Assignee sees new task |
| P7.14 | Relationship: user→organized→meeting | Verify: entity_relationships row exists |
| P7.15 | Relationship: user→owns→meeting | Verify: entity_relationships row with owner context |
| P7.16 | Relationship: user→attended→meeting (per attendee) | Verify: rows with response/role context |
| P7.17 | Relationship: meeting→produced→decision (per decision) | Verify: rows exist |
| P7.18 | Relationship: meeting→produced→task (per action item) | Verify: rows exist |
| P7.19 | Relationship: task→subtask_of→meeting_task | Verify: rows exist for subtasks |

---

## 14. Security & Privacy

### Data Handling

1. **OAuth Tokens**: Encrypted at rest using server-side key
2. **Transcript Data**: Encrypted in database, sanitized for PII
3. **User Consent**: Clear permission explanation before OAuth
4. **Audit Trail**: All calendar API calls logged

### Privacy Considerations

- User controls calendar connection (can disconnect)
- Transcript processing happens server-side, not sent to third parties
- Meeting content visible only to Area members
- Decisions propagated only within Area context

---

## 15. Edge Cases & Error Handling

### Scenarios

| Scenario | Handling |
|----------|----------|
| Owner declines meeting | Task remains assigned; owner can still capture |
| Owner changed after scheduling | Update task.assignee_id; notify new owner |
| Meeting cancelled | meeting.status = 'cancelled'; task.status = 'cancelled' |
| OAuth token expired mid-flow | Auto-refresh; if fails, prompt reconnect |
| Transcript API permission denied | Show clear message; offer manual upload |
| AI extraction fails | Log error; continue with manual capture |
| External meeting (no calendar connection) | Manual meeting creation without Teams integration |
| Recurring meetings | V1: Create as individual meetings; V2: Recurrence support |

### Graceful Degradation

```
Level 0: Full Integration
  ✓ Calendar connected
  ✓ Teams meeting created
  ✓ Transcript auto-pulled
  ✓ AI extraction
  → Full automated flow

Level 1: No Transcript API
  ✓ Calendar connected
  ✓ Teams meeting created
  ✗ Transcript unavailable
  → Manual upload or guided capture

Level 2: No Calendar Connection
  ✗ No calendar
  → Manual meeting record, manual capture

Level 3: Manual Only
  → User creates meeting record manually
  → Still captures value via guided flow
```

---

## 16. Acceptance Criteria Summary

### Total Acceptance Criteria by Phase

| Phase | Count | Critical |
|-------|-------|----------|
| Phase 1: Foundation | 7 | P1.2, P1.3, P1.4 |
| Phase 2: Meeting Creation | 10 | P2.7, P2.8 |
| Phase 3: Scheduling | 11 | P3.5, P3.8, P3.9 |
| Phase 4: Task Integration | 8 | P4.1, P4.5 |
| Phase 5: Capture Flow | 14 | P5.7, P5.10, P5.14 |
| Phase 6: AI Extraction | 9 | P6.9 |
| Phase 7: Finalization | 19 | P7.5, P7.6, P7.8, P7.14-P7.19 |
| **Total** | **78** | |

### Critical Path Items

1. **P3.8**: Task created for owner on schedule
2. **P3.9**: Task assignee = owner (accountability)
3. **P5.7**: Guided capture works without transcript (fallback)
4. **P7.5**: Subtasks created from action items (follow-through)
5. **P7.8**: Decisions added to Area context (flywheel)
6. **P7.14-P7.19**: Relationship capture for graph-ready analytics

---

## Appendix A: Component Reference

```
src/lib/components/meetings/
├── CreateMeetingModal.svelte         # Main modal wrapper
├── MeetingCreationWizard.svelte      # 5-step wizard
├── steps/
│   ├── ContextStep.svelte            # Step 1: Purpose
│   ├── OutcomesStep.svelte           # Step 2: Expected outcomes
│   ├── AgendaStep.svelte             # Step 3: Agenda builder
│   ├── AttendeesStep.svelte          # Step 4: Attendees + Owner
│   └── ScheduleStep.svelte           # Step 5: Time selection
├── task/
│   ├── MeetingTaskView.svelte        # Task detail for meetings
│   ├── MeetingTaskBadge.svelte       # 📅 badge component
│   ├── MeetingPrepPanel.svelte       # AI prep assistant
│   └── MeetingJoinButton.svelte      # Join meeting button
├── capture/
│   ├── CaptureOptions.svelte         # Four capture options
│   ├── TranscriptUploader.svelte     # File upload
│   ├── GuidedCaptureWizard.svelte    # 4-step capture
│   ├── SummaryStep.svelte            # Capture step 1
│   ├── DecisionsStep.svelte          # Capture step 2
│   ├── ActionsStep.svelte            # Capture step 3
│   └── KeyPointsStep.svelte          # Capture step 4
├── shared/
│   ├── AISuggestionCard.svelte
│   ├── OwnerSelector.svelte          # Owner dropdown
│   ├── AttendeeSelector.svelte
│   ├── AgendaItemEditor.svelte
│   └── ConfidenceBadge.svelte
└── settings/
    └── CalendarConnectionCard.svelte

src/lib/stores/
├── meetings.svelte.ts
└── calendarConnections.svelte.ts

src/lib/server/
├── meetings/
│   ├── meetings-postgres.ts
│   ├── meeting-attendees-postgres.ts
│   └── meeting-capture-postgres.ts
├── integrations/
│   ├── microsoft-graph.ts
│   └── token-manager.ts
└── ai/
    └── meeting-extractor.ts
```

---

## Appendix B: Related Documents

| Document | Relationship |
|----------|--------------|
| `CONTEXT_STRATEGY.md` | Decisions propagate to Area context |
| `GUIDED_CREATION.md` | Capture follows guided creation patterns |
| `DOCUMENT_SYSTEM.md` | Meeting minutes become Pages |
| `ENTITY_MODEL.md` | Task schema, parent_id for subtasks |
| `PRODUCT_VISION.md` | Part of the Data Flywheel |

---

*Last Updated: January 2026*
*Status: Specification Complete - Ready for Implementation*
*Total Acceptance Criteria: 72*
