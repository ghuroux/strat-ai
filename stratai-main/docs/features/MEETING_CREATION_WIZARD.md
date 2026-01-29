# Meeting Creation Wizard

> **Lean but Powerful: From Intent to Structured Invite in 3 Steps**

This document specifies the guided meeting creation experience for StratAI. The wizard is intentionally lean (3 steps) but strategically powerful — it turns Area context into AI-suggested outcomes, generates professional invite bodies, and sets up the scaffolding that makes post-meeting capture trivial.

**Key Insight: Creation IS capture prep.** The expected outcomes you define at creation become the checklist you review at capture. No recall needed. No blank page. The meeting's value is framed before it starts.

**Relationship to other specs:**
- **Depends on:** [CALENDAR_INTEGRATION.md](./CALENDAR_INTEGRATION.md) (OAuth, Graph API tools — ✅ built)
- **Feeds into:** [MEETING_LIFECYCLE.md](./MEETING_LIFECYCLE.md) (capture, extraction, finalization — future phases)
- **Uses:** Area context (notes, tasks, decisions) for AI suggestions

---

## Table of Contents

1. [Why a Wizard](#1-why-a-wizard)
2. [The 3-Step Flow](#2-the-3-step-flow)
3. [Step 1: Purpose & Outcomes](#3-step-1-purpose--outcomes)
4. [Step 2: People & Ownership](#4-step-2-people--ownership)
5. [Step 3: Schedule](#5-step-3-schedule)
6. [Invite Body Generation](#6-invite-body-generation)
7. [Meeting Entity & Task Creation](#7-meeting-entity--task-creation)
8. [Data Model](#8-data-model)
9. [Creation → Capture Bridge](#9-creation--capture-bridge)
10. [Implementation Plan](#10-implementation-plan)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Future Expansions](#12-future-expansions)

---

## 1. Why a Wizard

### The Problem

People create meetings without thinking:
- No purpose beyond a vague subject line
- No expected outcomes — success is unmeasurable
- No owner accountable for results
- No agenda — attendees can't prepare
- Invitees don't know what to expect or bring

The result: meetings that waste time and lose value.

### Our Approach

A **short, AI-assisted wizard** that forces intentionality without adding friction:

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   Traditional Calendar App          StratAI Wizard                 │
│   ────────────────────────          ──────────────                 │
│                                                                    │
│   Title: [          ]               What's this meeting about?     │
│   Time:  [          ]               → AI suggests outcomes from    │
│   People:[          ]                  Area context                 │
│   Done.                             → Owner is explicit            │
│                                     → Invite body auto-generated   │
│   Result: Vague invite,             Result: Structured invite,     │
│   no prep, no capture               easy prep, trivial capture     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **3 steps max** — Purpose/Outcomes → People/Owner → Schedule
2. **Skip always available** — quick meetings get through in 30 seconds
3. **AI earns its place** — suggestions come from Area context, not generic templates
4. **Invite body is the output** — attendees see the value even if they don't use StratAI
5. **Creation scaffolds capture** — expected outcomes become the post-meeting checklist

---

## 2. The 3-Step Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MEETING CREATION WIZARD                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   CONTEXT: Space "StratTech" → Area "Nedbank SVS"                  │
│   AI has access to: area notes, open tasks, recent decisions        │
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │   STEP 1     │───▶│   STEP 2     │───▶│   STEP 3     │         │
│   │              │    │              │    │              │         │
│   │  Purpose &   │    │  People &    │    │  Schedule    │         │
│   │  Outcomes    │    │  Ownership   │    │              │         │
│   │              │    │              │    │  • Find time │         │
│   │  • What?     │    │  • Who?      │    │  • Duration  │         │
│   │  • Walk out  │    │  • Owner?    │    │  • Teams?    │         │
│   │    with?     │    │              │    │  • Confirm   │         │
│   │  [AI assist] │    │              │    │              │         │
│   └──────────────┘    └──────────────┘    └──────────────┘         │
│         │                                        │                  │
│         │              SKIP available            │                  │
│         │              at every step             │                  │
│         │                                        ▼                  │
│         │                              ┌──────────────────┐        │
│         │                              │  OUTPUTS:        │        │
│         │                              │                  │        │
│         └─────────────────────────────▶│  1. Calendar     │        │
│                                        │     event with   │        │
│                                        │     rich body    │        │
│                                        │                  │        │
│                                        │  2. Meeting      │        │
│                                        │     entity in DB │        │
│                                        │                  │        │
│                                        │  3. Task for     │        │
│                                        │     owner        │        │
│                                        └──────────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step 1: Purpose & Outcomes

### The Most Important Step

This is where the AI earns its place. Using Area context (notes, tasks, recent decisions, open items), the AI suggests what this meeting should achieve.

### UX

```
┌─────────────────────────────────────────────────────────────────────┐
│  NEW MEETING                                        Area: Nedbank SVS │
│  Step 1 of 3: Purpose & Outcomes                               [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  What's this meeting about?                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Align the team on API integration approach                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  What should you walk out with?                    [AI Suggest ✨]  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  AI-suggested (from Area context):                          │   │
│  │                                                             │   │
│  │  ☑ Decide on REST vs GraphQL approach                       │   │
│  │    ↳ Open task since Jan 15, no resolution yet              │   │
│  │                                                             │   │
│  │  ☑ Approve revised project timeline                         │   │
│  │    ↳ Blocked by API decision, 3 tasks waiting               │   │
│  │                                                             │   │
│  │  ☐ Assign OAuth implementation owner                        │   │
│  │    ↳ Unassigned task, high priority                         │   │
│  │                                                             │   │
│  │  ──────────────────────────────────────────────────────     │   │
│  │  ☐ + Add custom outcome                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                              [Skip]  [Next →]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### AI Suggestion Logic

The AI uses Area context to suggest outcomes. Sources (in priority order):

| Context Source | Suggestion Type | Example |
|---------------|----------------|---------|
| **Open tasks with no owner** | "Assign X" | Unassigned high-priority tasks |
| **Stale/blocked tasks** | "Resolve/decide on X" | Tasks blocked for >5 days |
| **Recent decisions needing follow-up** | "Review progress on X" | Decisions from past meetings |
| **Area notes mentioning open questions** | "Decide on X" | Questions flagged in notes |
| **Overdue tasks** | "Address overdue X" | Past-due items |

```typescript
// Conceptual: AI prompt for outcome suggestions
const suggestionPrompt = `
You are helping the user plan a meeting in the "${area.name}" area.
The user described the meeting as: "${purpose}"

Based on the Area context below, suggest 2-4 expected outcomes
that would make this meeting successful.

Area context:
- Area notes: ${areaNotes}
- Open tasks: ${openTasks}
- Recent decisions: ${recentDecisions}
- Stale items: ${staleItems}

For each outcome, explain briefly WHY it's relevant (1 line).
Format as: outcome | reason
`;
```

### Data Captured

```typescript
interface WizardStep1Data {
  purpose: string;                    // Free text
  expectedOutcomes: {
    description: string;              // What to achieve
    outcomeType: 'decision' | 'approval' | 'alignment' | 'action_plan' | 'other';
    aiSuggested: boolean;             // Was this AI-generated?
    aiReason?: string;                // Why AI suggested it
    sourceTaskId?: string;            // Linked to an open task
  }[];
}
```

---

## 4. Step 2: People & Ownership

### Attendees + Explicit Owner

```
┌─────────────────────────────────────────────────────────────────────┐
│  NEW MEETING                                        Area: Nedbank SVS │
│  Step 2 of 3: People & Ownership                               [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Who needs to be there?                                            │
│                                                                     │
│  Space Members:                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ☑ Sarah Chen (sarah@stratgroup.com)                        │   │
│  │  ☑ James Wilson (james@stratgroup.com)                      │   │
│  │  ☑ Mike Johnson (mike@stratgroup.com)                       │   │
│  │  ☐ Lisa Torres (lisa@stratgroup.com)                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  External Attendees:                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [david.kumar@nedbank.co.za ×]  [+ Add email]              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Who owns the outcomes?                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  [You (John Smith) ▼]                                       │   │
│  │                                                             │   │
│  │  The owner is accountable for capturing outcomes after the  │   │
│  │  meeting. They'll see this as a task in their task list.    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                         [Back]  [Skip]  [Next →]   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Decisions

- **Space members shown by default** — pre-populated from the Area's Space
- **External emails** — free-form input for non-StratAI attendees (e.g. clients)
- **Owner defaults to creator** — most common case. Can reassign to any attendee.
- **Owner tooltip** — brief explanation of what "owner" means (accountability, task assignment)

### Data Captured

```typescript
interface WizardStep2Data {
  attendees: {
    userId?: string;                  // Internal Space member
    email: string;                    // Always present
    name: string;
    type: 'required' | 'optional';
  }[];
  ownerId: string;                    // Must be an attendee's userId
}
```

---

## 5. Step 3: Schedule

### AI-Assisted Time Finding

```
┌─────────────────────────────────────────────────────────────────────┐
│  NEW MEETING                                        Area: Nedbank SVS │
│  Step 3 of 3: Schedule                                          [X] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Duration: [30 min ▼]                                              │
│  Online meeting (Teams): [✓]                                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Suggested times (all attendees available):                  │   │
│  │                                                             │   │
│  │  ○ Tomorrow, Wed 29 Jan — 2:30 PM (30 min)                 │   │
│  │  ○ Thursday 30 Jan — 10:00 AM (30 min)                     │   │
│  │  ○ Friday 31 Jan — 1:00 PM (30 min)                        │   │
│  │                                                             │   │
│  │  [Show more times]                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Or pick manually:                                                 │
│  Date: [         📅]  Time: [    ⏰]                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ⚠ External attendees (david.kumar@nedbank.co.za):          │   │
│  │  Availability unknown — they'll receive the invite to       │   │
│  │  accept or propose a new time.                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                    [Back]  [Skip]  [Schedule ✓]    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Scheduling Logic

1. **Internal attendees**: Use `calendar_find_meeting_times` (already built) to query free/busy
2. **External attendees**: Note as "availability unknown" — they receive the invite normally
3. **Fallback**: If no common slots found, show message + manual date/time picker
4. **Duration options**: 15 min, 30 min, 45 min, 1 hour, 1.5 hours, 2 hours

### Data Captured

```typescript
interface WizardStep3Data {
  scheduledStart: string;             // ISO 8601
  scheduledEnd: string;               // ISO 8601
  durationMinutes: number;
  isOnlineMeeting: boolean;           // Create Teams meeting
  timezone: string;                   // User's timezone
}
```

---

## 6. Invite Body Generation

### The Marketing Channel

When the calendar event is created via Microsoft Graph, the body contains a professionally structured invite. This is how non-StratAI users experience the value.

### Template

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px;">

  <h2 style="margin-bottom: 4px;">{title}</h2>

  <p style="color: #666; margin-top: 0;">
    Owner: {ownerName} &bull; Area: {areaName}
  </p>

  <h3>Purpose</h3>
  <p>{purpose}</p>

  <h3>Expected Outcomes</h3>
  <ul>
    {#each expectedOutcomes as outcome}
    <li>
      <strong>{outcome.description}</strong>
      {#if outcome.outcomeType === 'decision'}
        <span style="color: #666;"> (Decision needed)</span>
      {/if}
    </li>
    {/each}
  </ul>

  <p style="color: #999; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
    Please come prepared to discuss the above.
    <br/>Organized with <a href="https://stratai.com">StratAI</a>
  </p>

</div>
```

### Example Output

```
───────────────────────────────────────────────────
API Integration Review

Owner: John Smith · Area: Nedbank SVS

Purpose
Align the team on API integration approach for
the Nedbank SVS project.

Expected Outcomes
• Decide on REST vs GraphQL approach (Decision needed)
• Approve revised project timeline (Decision needed)
• Assign OAuth implementation owner

Please come prepared to discuss the above.
Organized with StratAI
───────────────────────────────────────────────────
```

---

## 7. Meeting Entity & Task Creation

### What Happens on "Schedule"

When the user clicks "Schedule" in Step 3, three things happen atomically:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ON SCHEDULE CLICK:                                                 │
│                                                                     │
│  1. CREATE MEETING ENTITY (database)                               │
│     ┌─────────────────────────────────────────┐                    │
│     │ meetings row:                            │                    │
│     │   area_id, organizer_id, owner_id        │                    │
│     │   title, purpose, status='scheduled'     │                    │
│     │   scheduled_start, scheduled_end         │                    │
│     │   + expected_outcomes (JSONB or rows)     │                    │
│     │   + attendees (rows)                      │                    │
│     └─────────────────────────────────────────┘                    │
│                                                     │               │
│  2. CREATE CALENDAR EVENT (Microsoft Graph)         │               │
│     ┌─────────────────────────────────────────┐     │               │
│     │ calendar_create_event:                   │     │               │
│     │   subject, start, end, attendees         │     │               │
│     │   body = generated invite HTML           │     │               │
│     │   isOnlineMeeting = true (Teams link)    │     │               │
│     │   → returns: eventId, joinUrl            │     │               │
│     └─────────────────────────────────────────┘     │               │
│          │                                          │               │
│          │  eventId, joinUrl stored on meeting      │               │
│          ▼                                          ▼               │
│  3. CREATE TASK FOR OWNER                                          │
│     ┌─────────────────────────────────────────┐                    │
│     │ tasks row:                               │                    │
│     │   title = meeting.title                  │                    │
│     │   user_id = owner_id                     │                    │
│     │   area_id = meeting.area_id              │                    │
│     │   source_type = 'meeting'                │                    │
│     │   due_date = scheduled_start             │                    │
│     │   status = 'active'                      │                    │
│     │   → meeting.task_id = task.id            │                    │
│     └─────────────────────────────────────────┘                    │
│                                                                     │
│  RESULT: Owner sees meeting in task list with 📅 badge             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Model

### Lean Schema (V1)

The full `MEETING_LIFECYCLE.md` spec defines 7 tables. For the wizard, we need a **lean subset** that supports creation and connects to capture later.

```sql
-- ============================================================================
-- MEETINGS: Core meeting entity (lean V1)
-- Connects Area context → Calendar event → Owner task
-- ============================================================================

CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Context
    area_id UUID NOT NULL REFERENCES focus_areas(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- People
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Content
    title VARCHAR(500) NOT NULL,
    purpose TEXT,

    -- Expected Outcomes (JSONB for V1 simplicity)
    -- Graduates to separate table if we need to query outcomes independently
    expected_outcomes JSONB DEFAULT '[]',
    -- Format: [{ description, outcomeType, aiSuggested, sourceTaskId? }]

    -- Scheduling
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    duration_minutes INTEGER,
    timezone VARCHAR(100) DEFAULT 'UTC',

    -- State
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft',         -- Being created in wizard
            'scheduled',     -- Calendar event created, task assigned
            'in_progress',   -- Meeting happening
            'completed',     -- Ended, awaiting capture
            'finalized',     -- Capture done, subtasks created
            'abandoned',     -- Capture skipped
            'cancelled'
        )),

    -- Task Integration
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    -- Calendar Integration (Microsoft Graph)
    external_event_id VARCHAR(500),
    external_join_url TEXT,
    external_provider VARCHAR(50) DEFAULT 'microsoft'
        CHECK (external_provider IN ('microsoft', 'google', 'manual')),

    -- Capture (populated post-meeting, see MEETING_LIFECYCLE.md)
    capture_data JSONB,
    -- Format: { summary, decisions[], actionItems[], keyPoints[] }
    capture_method VARCHAR(50)
        CHECK (capture_method IN (
            'transcript_ai', 'guided_manual', 'quick_notes', 'skipped'
        )),

    -- Generated content
    page_id UUID REFERENCES pages(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_meetings_area ON meetings(area_id);
CREATE INDEX idx_meetings_owner ON meetings(owner_id);
CREATE INDEX idx_meetings_task ON meetings(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_start)
    WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_meetings_awaiting_capture ON meetings(completed_at)
    WHERE status = 'completed';

-- ============================================================================
-- MEETING ATTENDEES: Internal + external participants
-- ============================================================================

CREATE TABLE meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,

    -- Identity (one required)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(500) NOT NULL,
    name VARCHAR(500),

    -- Role
    attendee_type VARCHAR(50) NOT NULL DEFAULT 'required'
        CHECK (attendee_type IN ('required', 'optional')),
    is_owner BOOLEAN DEFAULT FALSE,

    -- Calendar response (synced from Graph)
    response_status VARCHAR(50) DEFAULT 'none'
        CHECK (response_status IN (
            'none', 'accepted', 'declined', 'tentative', 'not_responded'
        )),

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_meeting_attendee UNIQUE (meeting_id, email)
);

CREATE INDEX idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX idx_meeting_attendees_user ON meeting_attendees(user_id)
    WHERE user_id IS NOT NULL;
```

### Why JSONB for Outcomes and Capture

| Approach | Pros | Cons | When to Graduate |
|----------|------|------|------------------|
| **JSONB (V1)** | Simple, fast, one table | Can't query outcomes independently | When you need cross-meeting outcome search |
| **Separate tables** | Queryable, relational | More complexity, more joins | Phase 2 of Meeting Lifecycle |

V1 decision: `expected_outcomes` and `capture_data` as JSONB. They're always read with the meeting. Separate tables come when we need "show me all unresolved decisions across meetings" — that's a Phase 2 problem.

---

## 9. Creation → Capture Bridge

### How Expected Outcomes Drive Capture

This is the core product insight: creation scaffolds capture.

```
CREATION (Step 1)                    CAPTURE (post-meeting)
─────────────────                    ──────────────────────

expected_outcomes: [                 capture_data.outcomes: [
  {                                    {
    description: "REST vs GraphQL",      description: "REST vs GraphQL",
    outcomeType: "decision",             outcomeType: "decision",
    aiSuggested: true                    wasAchieved: true,           ← NEW
  },                                     resolution: "Chose GraphQL", ← NEW
  {                                      decisionOwner: "Sarah Chen"  ← NEW
    description: "Approve timeline",   },
    outcomeType: "approval",           {
    aiSuggested: true                    description: "Approve timeline",
  },                                     outcomeType: "approval",
  {                                      wasAchieved: true,
    description: "Assign OAuth owner",   resolution: "Approved +2 weeks",
    outcomeType: "action_plan",          decisionOwner: "consensus"
    aiSuggested: false                 },
  }                                    {
]                                        description: "Assign OAuth owner",
                                         outcomeType: "action_plan",
                                         wasAchieved: false,
                                         resolution: "Deferred to next sync"
                                       }
                                     ]
```

The capture UI becomes: **"Did you achieve these outcomes?"** with a yes/no toggle and a notes field per outcome. Compare that to a blank textarea asking "what happened?"

---

## 10. Implementation Plan

### Prerequisites (Already Built)

- [x] Microsoft Graph OAuth flow
- [x] `calendar_create_event` tool (creates events with attendees, Teams link, body)
- [x] `calendar_find_meeting_times` tool (free/busy query)
- [x] Task system (CRUD, subtasks, source_type='meeting')
- [x] CalendarEventCard component
- [x] MeetingNotesData types (decisions, action items)
- [x] Area context loading (notes, tasks, documents)

### Build Phases

#### Phase 1: Meeting Entity & Migration

- [ ] Create migration for `meetings` + `meeting_attendees` tables
- [ ] Create `meetings-postgres.ts` repository (CRUD)
- [ ] Create `meeting-attendees-postgres.ts` repository
- [ ] Create API endpoints: `POST /api/meetings`, `GET /api/meetings`, `GET /api/meetings/[id]`
- [ ] TypeScript types for Meeting entity

#### Phase 2: Wizard UI

- [ ] `CreateMeetingModal.svelte` — 3-step wizard container
- [ ] `MeetingPurposeStep.svelte` — Step 1: purpose + expected outcomes
- [ ] `MeetingPeopleStep.svelte` — Step 2: attendees + owner
- [ ] `MeetingScheduleStep.svelte` — Step 3: time selection
- [ ] AI outcome suggestion endpoint: `POST /api/meetings/suggest-outcomes`
- [ ] Trigger: "New Meeting" button in Area header or task dashboard

#### Phase 3: Invite Generation & Calendar Event

- [ ] Invite body HTML generator from wizard data
- [ ] On "Schedule": create meeting entity + calendar event + task (atomic)
- [ ] Store `external_event_id` and `external_join_url` on meeting
- [ ] Meeting task appears in owner's task list with 📅 badge
- [ ] Area meeting list view (upcoming + past)

#### Phase 4: "Prepare for Existing Meeting" Path

- [ ] "Prepare for meeting" entry point from CalendarEventCard
- [ ] Pull calendar event details → pre-fill wizard Step 1
- [ ] User adds purpose/outcomes to an existing calendar event
- [ ] Creates meeting entity + links to existing calendar event (no new invite)
- [ ] Enables capture flow for meetings NOT created through wizard

---

## 11. Acceptance Criteria

### Wizard Flow

| ID | Criterion | Verification |
|----|-----------|--------------|
| W1 | User can start "New Meeting" from Area | Manual: button visible in Area header / task dashboard |
| W2 | Step 1 shows purpose input and outcome list | Manual: free-text + checkboxes visible |
| W3 | AI suggests 2-4 outcomes from Area context | Manual: click "AI Suggest", see contextual suggestions |
| W4 | User can add/remove/edit custom outcomes | Manual: add, edit, remove all work |
| W5 | Step 2 shows Space members as attendees | Manual: see member list with checkboxes |
| W6 | User can add external email attendees | Manual: type email, appears in list |
| W7 | Owner defaults to current user, can change | Manual: dropdown shows attendees, current user selected |
| W8 | Step 3 shows AI-suggested time slots | Manual: see 3+ available times |
| W9 | User can pick manual date/time | Manual: date picker works |
| W10 | Skip available at every step | Manual: skip button present, works |

### Meeting Creation

| ID | Criterion | Verification |
|----|-----------|--------------|
| C1 | Meeting entity created in database | Verify: `meetings` row with status='scheduled' |
| C2 | Calendar event created via Graph API | Verify: `external_event_id` populated |
| C3 | Invite body contains purpose + outcomes | Manual: check invite in Outlook |
| C4 | Teams meeting link created | Verify: `external_join_url` populated |
| C5 | Task created for owner | Verify: `tasks` row with source_type='meeting' |
| C6 | Task visible in owner's task list | Manual: owner sees 📅 meeting task |
| C7 | Attendees receive calendar invite | Manual: attendees see invite in Outlook |
| C8 | Meeting visible in Area meeting list | Manual: see meeting in Area |

### Prepare for Existing Meeting

| ID | Criterion | Verification |
|----|-----------|--------------|
| P1 | CalendarEventCard has "Prepare" action | Manual: see button/action on card |
| P2 | Clicking "Prepare" opens wizard pre-filled | Manual: title, time pre-populated from calendar |
| P3 | Meeting entity created linked to existing event | Verify: `external_event_id` matches calendar event |
| P4 | No duplicate calendar invite sent | Verify: no new Graph API create call |

---

## 12. Future Expansions

These are explicitly **out of scope** for V1 but the schema and architecture support them:

| Expansion | Trigger | What Changes |
|-----------|---------|-------------|
| **Separate agenda step** | Users want meeting structure beyond outcomes | Add Step 1.5 with agenda items, time allocation per item |
| **Outcome → separate table** | Need cross-meeting outcome queries | Migrate JSONB to `meeting_expected_outcomes` table |
| **Recurring meetings** | Users create weekly syncs | `recurrence_pattern` field + auto-create meeting entities per occurrence |
| **Meeting templates** | "Weekly standup" has fixed outcomes/attendees | Pre-fill wizard from template, save wizard state as template |
| **Google Calendar** | Non-Microsoft customers | Add Google OAuth provider, same wizard |
| **Capture flow** | After this wizard ships | See MEETING_LIFECYCLE.md Phases 4-7 |
| **Post-meeting notifications** | Detect meeting end via polling | "Your meeting ended — capture outcomes?" push |
| **AI prep context** | Before meeting starts | "Here's what's relevant for your meeting" briefing |

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| 3 steps, not 5 | Reduce friction. Agenda is a V2 expansion. Purpose + Outcomes + People + Schedule is sufficient. | 2026-01-29 |
| AI suggests outcomes from Area context | This is the value prop — AI knows what's unresolved in the Area. Generic templates don't help. | 2026-01-29 |
| JSONB for outcomes and capture | Simple V1. Outcomes are always read with the meeting. Separate tables when cross-meeting queries needed. | 2026-01-29 |
| Invite body as marketing | Non-StratAI attendees see structured invites. Organic adoption pressure without requiring accounts. | 2026-01-29 |
| "Prepare for existing meeting" path | Most meetings are created in Outlook. Must support adding structure to existing events, not just wizard-created ones. | 2026-01-29 |
| Owner defaults to creator | Most common case. Explicit owner selection available but not required. | 2026-01-29 |
| Skip always available | Quick informal meetings shouldn't be blocked by the wizard. Let users add as much or as little structure as they want. | 2026-01-29 |
| Lean meetings table + attendees only | Full 7-table schema from MEETING_LIFECYCLE.md is V2. Start with 2 tables, JSONB for outcomes/capture. | 2026-01-29 |

---

## Related Documents

- [CALENDAR_INTEGRATION.md](./CALENDAR_INTEGRATION.md) — Calendar primitives (OAuth, Graph API tools)
- [MEETING_LIFECYCLE.md](./MEETING_LIFECYCLE.md) — Full meeting journey (capture, extraction, finalization)
- [GUIDED_CREATION.md](../../docs/GUIDED_CREATION.md) — Guided creation system (templates, forms)
- [CONTEXT_STRATEGY.md](../architecture/CONTEXT_STRATEGY.md) — How decisions feed Area context
