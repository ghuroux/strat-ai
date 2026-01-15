# Planning Mode & Task Extraction

> **Last Updated:** January 2026
> **Audience:** Developers, Product Managers

## Table of Contents

1. [Overview](#overview)
2. [Task Types & Work Units](#task-types--work-units)
3. [User Flow](#user-flow)
4. [Architecture](#architecture)
5. [Data Model](#data-model)
6. [Phase System](#phase-system)
7. [System Prompts](#system-prompts)
8. [Subtask Extraction](#subtask-extraction)
9. [API Reference](#api-reference)
10. [Code Locations](#code-locations)
11. [Design Decisions](#design-decisions)

---

## Overview

### What is Planning Mode?

Planning Mode is an AI-assisted feature that helps users break down complex tasks into manageable subtasks. It transforms a single task like "Plan Q1 Marketing Campaign" into actionable pieces like "Define target audience", "Set budget", "Create timeline", etc.

### Core Principles

1. **Explicit User Intent** — Planning mode only activates when the user clicks "Help me plan this". No automatic triggers.
2. **Cognitive Load Reduction** — The AI asks smart questions to understand scope before proposing subtasks.
3. **User Control** — Users can edit, reorder, or reject proposed subtasks before committing.
4. **Subtasks Are Terminal** — Subtasks cannot have their own subtasks (no infinite nesting).
5. **Model Flexibility** — Users choose which AI model to use for planning.

### What Planning Mode is NOT

- **Not automatic** — AI mentioning subtasks in normal conversation doesn't trigger planning mode
- **Not for subtasks** — Only parent tasks can enter planning mode
- **Not required** — Users can manually create subtasks without using planning mode

---

## Task Types & Work Units

### Task Classification

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TASK TYPES                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PARENT TASK (no subtasks) ──► WORK UNIT                                │
│  └─ Can have multiple conversations                                     │
│  └─ Has Context Panel (details, docs, conversations, planning actions) │
│  └─ Can enter Planning Mode                                             │
│                                                                          │
│  PARENT TASK (with subtasks) ──► CONTAINER                              │
│  └─ Shows Subtask Dashboard                                             │
│  └─ Planning conversations only                                         │
│  └─ Cannot re-enter Planning Mode (already has subtasks)               │
│                                                                          │
│  SUBTASK ──► TERMINAL WORK UNIT                                         │
│  └─ Can have multiple conversations                                     │
│  └─ Has Context Panel (parent context, docs, conversations)            │
│  └─ Cannot enter Planning Mode (no sub-subtasks allowed)               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### First-Visit Task Approach Modal

When a user first visits a parent task (no subtasks, no conversations, no previous choice), they see an **Approach Modal**:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│              How do you want to approach this?                   │
│                                                                  │
│                   "Task Title Here"                              │
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐       │
│  │         💬              │  │         📋              │       │
│  │    Work directly        │  │   Break into subtasks   │       │
│  │                         │  │                         │       │
│  │  Start working with AI  │  │  Let AI help you break  │       │
│  │  assistance. Have       │  │  this into smaller,     │       │
│  │  multiple conversations │  │  manageable pieces.     │       │
│  │  and add context docs.  │  │                         │       │
│  └─────────────────────────┘  └─────────────────────────┘       │
│                                                                  │
│         You can always change your approach later                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- **"Work directly"** → Sets `approachChosenAt`, shows Work Welcome screen, Context Panel available
- **"Break into subtasks"** → Sets `approachChosenAt`, opens Model Selection Modal, enters Planning Mode

This modal educates users about the system's capabilities while capturing intent.

### Context Panel for Work Units

Work units (parent tasks without subtasks) have a Context Panel that provides:

| Section | Contents |
|---------|----------|
| **Details** | Due date, priority, estimated effort |
| **Description** | Task description (if any) |
| **Planning Actions** | "Help me plan this" or "Cancel Planning" |
| **Conversations** | List of linked conversations, "New Chat" button |

**Panel behavior during Planning Mode:**
- Panel **stays visible** (provides Cancel Planning escape hatch)
- Shows "Cancel Planning" button instead of "Help me plan this"
- Panel naturally hides when subtasks are created (task becomes container)

---

## User Flow

### Full Journey with Approach Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. USER CREATES TASK                                                    │
│     └─→ Task created with status: 'active', approachChosenAt: null      │
│                                                                          │
│  2. USER VISITS TASK PAGE (first time)                                  │
│     └─→ No subtasks, no conversations, no approachChosenAt              │
│     └─→ TASK APPROACH MODAL appears                                     │
│                                                                          │
│  3a. USER CHOOSES "WORK DIRECTLY"                                       │
│     └─→ approachChosenAt set to current timestamp                       │
│     └─→ Work Welcome screen displayed                                   │
│     └─→ Context Panel available (collapsed by default)                  │
│     └─→ User can chat, add documents, start multiple conversations      │
│     └─→ "Help me plan this" available in panel if user changes mind     │
│                                                                          │
│  3b. USER CHOOSES "BREAK INTO SUBTASKS"                                 │
│     └─→ approachChosenAt set to current timestamp                       │
│     └─→ MODEL SELECTION MODAL appears                                   │
│     └─→ User selects planning model (can differ from default)          │
│     └─→ Continue to step 4                                              │
│                                                                          │
│  4. PLANNING MODE STARTS                                                │
│     └─→ Task status → 'planning'                                        │
│     └─→ New conversation created with selected model                    │
│     └─→ If existing context, conversation history preserved            │
│     └─→ planningData initialized with phase: 'eliciting'                │
│     └─→ Context Panel shows "Cancel Planning" button                    │
│                                                                          │
│  5. ELICITATION PHASE                                                   │
│     └─→ AI asks clarifying questions (max 2-3 exchanges)                │
│     └─→ AI cites specifics from task description/documents              │
│     └─→ After 2+ exchanges, AI offers: "Ready for me to suggest?"       │
│                                                                          │
│  6. USER CONFIRMS READINESS                                             │
│     └─→ Phase transitions to 'proposing'                                │
│     └─→ AI generates numbered subtask list                              │
│                                                                          │
│  7. PROPOSAL EXTRACTION                                                  │
│     └─→ System parses AI response for "1. Task" "2. Task" pattern       │
│     └─→ Phase transitions to 'confirming'                               │
│     └─→ Full-page review UI displayed                                   │
│                                                                          │
│  8. USER CONFIRMS/EDITS                                                 │
│     └─→ User can edit titles, reorder, delete proposed subtasks         │
│     └─→ User clicks "Create X Subtasks"                                 │
│                                                                          │
│  9. SUBTASKS CREATED                                                    │
│     └─→ Subtasks created in database (status: 'active')                 │
│     └─→ Parent task exits planning mode (status → 'active')             │
│     └─→ planningData cleared                                            │
│     └─→ Task becomes "container" → Subtask Dashboard shown              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Model Selection & Context Preservation

When entering Planning Mode with existing conversation context:

| Scenario | Behavior |
|----------|----------|
| **Fresh task** (no conversations) | Create new conversation with selected model, send clarifying questions prompt |
| **Same model selected** (has context) | Reuse existing conversation, continue naturally |
| **Different model selected** (has context) | Create new conversation with new model, **copy message history**, send continuation prompt |

**Continuation prompt (when context exists):**
> "Based on our discussion above, please help me break down [task] into actionable subtasks. What would be a good breakdown based on what we've discussed?"

This ensures the new model benefits from all previous context.

### Cancellation Flow

Users can cancel planning at any point:
- Click "Cancel Planning" button in Context Panel
- Task returns to `status: 'active'`, `planningData` cleared
- User lands in work mode with panel accessible
- Can restart planning via "Help me plan this" in panel

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (SvelteKit)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │   Task Page         │    │   Task Store        │                     │
│  │   (+page.svelte)    │◄──►│   (tasks.svelte.ts) │                     │
│  │                     │    │                     │                     │
│  │  • Approach modal   │    │  • startPlanMode()  │                     │
│  │  • Work welcome     │    │  • exitPlanMode()   │                     │
│  │  • Context panel    │    │  • setApproachChosen│                     │
│  │  • Plan mode UI     │    │  • setPlanModePhase │                     │
│  │  • Chat integration │    │  • setProposedSubtasks                    │
│  └─────────────────────┘    └─────────────────────┘                     │
│            │                          │                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ TaskApproachModal   │    │ TaskContextPanel    │                     │
│  │ (first-visit choice)│    │ (work unit panel)   │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ TaskWorkWelcome     │    │ TaskPlanningModel   │                     │
│  │ (after work choice) │    │ Modal (model select)│                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (API)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │   /api/chat         │    │   System Prompts    │                     │
│  │   (+server.ts)      │───►│   (system-prompts.ts)                     │
│  │                     │    │                     │                     │
│  │  • Receives planMode│    │  • getPlanModePrompt│                     │
│  │  • Injects prompts  │    │  • Phase-specific   │                     │
│  │  • Streams response │    │    instructions     │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │   /api/tasks/[id]   │    │   /api/tasks/[id]/  │                     │
│  │   (+server.ts)      │    │   planning          │                     │
│  │                     │    │   (+server.ts)      │                     │
│  │  • PATCH status     │    │  • PATCH planningData                     │
│  │  • approachChosenAt │    │  • Subtask guard    │                     │
│  │  • Subtask guard    │    │                     │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (PostgreSQL)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  tasks table:                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ id | title | status | approach_chosen_at | planning_data | ...   │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │ t1 | "Marketing" | 'planning' | 2026-01-08 | {phase:...} | NULL  │   │
│  │ t2 | "Audience"  | 'active'   | NULL       | NULL        | t1    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Task Status

```typescript
type TaskStatus = 'active' | 'planning' | 'completed';
```

| Status | Description |
|--------|-------------|
| `active` | Default state. Task is being worked on. |
| `planning` | Task is in Planning Mode. AI prompts are specialized. |
| `completed` | Task is done. |

### Key Task Fields

```typescript
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  approachChosenAt?: Date;      // When user chose work/plan via modal
  planningData?: PlanningData;  // Only set during planning mode
  parentTaskId?: string;        // NULL for parent tasks
  linkedConversationIds: string[];
  // ... other fields
}
```

### Planning Data

Stored in `tasks.planning_data` (JSONB column):

```typescript
interface PlanningData {
  phase: 'eliciting' | 'proposing' | 'confirming';
  exchangeCount: number;        // Number of conversation turns
  proposedSubtasks: ProposedSubtask[];
  conversationId?: string;      // Linked conversation
  startedAt: string;            // ISO timestamp
}

interface ProposedSubtask {
  id: string;                   // Temporary ID (uuid)
  title: string;                // Subtask title
  synopsis?: string;            // AI-generated description
  selected: boolean;            // User can deselect
  order: number;                // Display/creation order
}
```

### Database Schema

```sql
-- Relevant columns in tasks table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'active',           -- 'active' | 'planning' | 'completed'
  approach_chosen_at TIMESTAMPTZ,          -- When user chose approach via modal
  planning_data JSONB,                     -- NULL when not in planning mode
  parent_task_id TEXT REFERENCES tasks(id), -- NULL for parent tasks
  -- ... other columns
);

-- Migration 013: Add approach tracking
ALTER TABLE tasks ADD COLUMN approach_chosen_at TIMESTAMPTZ;
COMMENT ON COLUMN tasks.approach_chosen_at IS
  'Timestamp when user chose work/plan approach via modal. NULL = show modal on first visit.';

-- Constraint: subtasks cannot have planning status
-- (enforced at API level, not DB level)
```

---

## Phase System

Planning Mode progresses through three phases:

### Phase 1: Eliciting

**Purpose:** Understand the task scope before proposing subtasks.

**AI Behavior:**
- Asks focused clarifying questions
- Cites specific details from task description/documents
- Keeps responses brief (< 400 characters)
- After 2+ exchanges, offers to propose: "Ready for me to suggest a breakdown?"

**Transition Trigger:** User confirms readiness (detected by keyword matching)

**Exchange Tracking:**
- `exchangeCount` increments after each AI response
- Affects prompt behavior (more flexible after 2+ exchanges)

### Phase 2: Proposing

**Purpose:** Generate a structured list of subtasks.

**AI Behavior:**
- Outputs numbered list in exact format: `1. Task title`
- Adjusts quantity based on deadline urgency
- Includes brief intro and closing question

**Output Format (Required for parsing):**
```
Based on what we've discussed, here's my suggested breakdown:

1. First subtask title
2. Second subtask title
3. Third subtask title

Would you like to adjust any of these?
```

**Transition Trigger:** System detects and extracts numbered list

### Phase 3: Confirming

**Purpose:** User reviews and commits to subtasks.

**AI Behavior:** Minimal (user is editing subtask cards)

**User Actions:**
- Edit subtask titles
- Delete unwanted subtasks
- Reorder subtasks (drag & drop)
- Click "Create X Subtasks" to commit

**Transition Trigger:** User clicks create button → exits planning mode

---

## System Prompts

### How Prompts Change Per Phase

The Chat API injects phase-specific system prompts when `planModeContext` is provided:

```typescript
// In /api/chat/+server.ts
if (planModeContext) {
  const fullPrompt = getFullSystemPromptForPlanMode(
    model,
    space,
    planModeContext.taskTitle,
    planModeContext.phase,        // ← Phase determines prompt
    focusArea,
    taskMetadata,
    exchangeCount                  // ← Affects elicitation style
  );
}
```

### Prompt Composition

```
┌─────────────────────────────────────────┐
│         Platform Base Prompt            │
│  (Model capabilities, tool usage, etc.) │
├─────────────────────────────────────────┤
│         Plan Mode Context               │
│  - Today's date                         │
│  - Task title                           │
│  - Priority, due date, description      │
├─────────────────────────────────────────┤
│         Phase-Specific Instructions     │
│  - Eliciting: Ask questions, stay brief │
│  - Proposing: Numbered list format      │
│  - Confirming: (minimal)                │
├─────────────────────────────────────────┤
│         Document/Context Injection      │
│  (If reference documents attached)      │
└─────────────────────────────────────────┘
```

### Response Constraints

| Phase | Max Tokens | Character Limit | Format |
|-------|------------|-----------------|--------|
| Eliciting (exchanges 0-1) | 120 | ~400 chars | Prose, single question |
| Eliciting (exchanges 2+) | 100 | ~300 chars | Pattern A or B only |
| Proposing | Unlimited | N/A | Numbered list required |
| Confirming | N/A | N/A | User-driven |

---

## Subtask Extraction

### Parser Overview

When AI responds in `proposing` phase, the system extracts subtasks using regex:

```typescript
// In task-suggestion-parser.ts
export function extractProposedSubtasks(content: string): ProposedSubtask[] {
  // Matches lines starting with "1. ", "2. ", etc.
  const pattern = /^\d+\.\s+(.+)$/gm;
  // ...
}
```

### Detection Flow

```typescript
// In +page.svelte (after AI response completes)
if (taskIdParam && isPlanModeActive) {
  const hasProposal = contentContainsProposal(finalMessage.content);

  if (hasProposal) {
    const extracted = extractProposedSubtasks(finalMessage.content);

    if (extracted.length > 0) {
      await taskStore.setProposedSubtasks(extracted);
      await taskStore.setPlanModePhase('confirming');
    }
  }
}
```

### Key Design Choice: No Auto-Trigger

**Important:** Subtask extraction ONLY runs when `isPlanModeActive` is true.

If the AI mentions subtasks during normal conversation (not in planning mode), the system does NOT:
- Auto-start planning mode
- Extract or propose subtasks
- Change any task state

This is intentional. Planning mode requires explicit user action.

---

## API Reference

### Start Planning Mode

**Endpoint:** `PATCH /api/tasks/[id]` + `PATCH /api/tasks/[id]/planning`

**Called by:** `taskStore.startPlanMode(taskId, conversationId)`

**Flow:**
1. Set `status: 'planning'` via main PATCH
2. Set `planningData` via planning endpoint

**Guards:**
- Subtasks cannot enter planning mode (400 error)
- Task must exist and belong to user

### Set Approach Chosen

**Endpoint:** `PATCH /api/tasks/[id]`

**Called by:** `taskStore.setApproachChosen(taskId)`

**Body:**
```typescript
{
  approachChosenAt: "2026-01-08T12:00:00.000Z"
}
```

**Purpose:** Records when user dismissed the Approach Modal (chose work or plan).

### Update Planning Data

**Endpoint:** `PATCH /api/tasks/[id]/planning`

**Body:**
```typescript
{
  planningData: {
    phase?: 'eliciting' | 'proposing' | 'confirming',
    exchangeCount?: number,
    proposedSubtasks?: ProposedSubtask[]
  }
}
```

### Exit Planning Mode

**Endpoint:** `PATCH /api/tasks/[id]` + `PATCH /api/tasks/[id]/planning`

**Called by:** `taskStore.exitPlanMode()`

**Flow:**
1. Set `status: 'active'`
2. Set `planningData: null`

### Create Subtasks

**Endpoint:** `POST /api/tasks/[parentId]/subtasks`

**Body:**
```typescript
{
  subtasks: Array<{
    title: string,
    synopsis?: string,
    priority?: 'normal' | 'high'
  }>
}
```

**Result:** All subtasks created with `status: 'active'`, linked to parent.

---

## Code Locations

### Frontend

| File | Purpose |
|------|---------|
| `src/routes/spaces/[space]/task/[taskId]/+page.svelte` | Task page with all planning mode integration |
| `src/lib/stores/tasks.svelte.ts` | Task store with planning methods, setApproachChosen |
| `src/lib/components/tasks/TaskApproachModal.svelte` | First-visit choice modal (work/plan) |
| `src/lib/components/tasks/TaskWorkWelcome.svelte` | Welcome screen after choosing "Work directly" |
| `src/lib/components/tasks/TaskContextPanel.svelte` | Context panel for work units & subtasks |
| `src/lib/components/tasks/TaskPlanningModelModal.svelte` | Model selection for planning |
| `src/lib/components/tasks/PlanningTasksIndicator.svelte` | Header badge for tasks in planning |
| `src/lib/utils/task-suggestion-parser.ts` | Subtask extraction from AI response |

### Backend

| File | Purpose |
|------|---------|
| `src/routes/api/tasks/[id]/+server.ts` | Task CRUD, status guards, approachChosenAt |
| `src/routes/api/tasks/[id]/planning/+server.ts` | Planning data updates |
| `src/routes/api/tasks/[id]/subtasks/+server.ts` | Subtask creation |
| `src/routes/api/chat/+server.ts` | Chat API with plan mode prompt injection |
| `src/lib/config/system-prompts.ts` | Phase-specific AI prompts |

### Database

| File | Purpose |
|------|---------|
| `src/lib/server/persistence/tasks-postgres.ts` | Task repository with approachChosenAt |
| `src/lib/server/persistence/migrations/012-fix-subtask-planning-status.sql` | Fix for subtask planning bug |
| `src/lib/server/persistence/migrations/013-task-approach-chosen.sql` | Add approachChosenAt column |

---

## Design Decisions

### Why the Approach Modal?

**Decision:** First-visit to parent task (no subtasks, no conversations) shows a choice modal.

**Rationale:**
- Educates users about system capabilities (multiple conversations, planning mode)
- Captures user intent explicitly
- Prevents confusion about what "working on a task" means
- Users can always change their mind later (panel has "Help me plan this")

### Why Preserve Conversation History on Model Switch?

**Decision:** When switching models for planning, copy message history to new conversation.

**Rationale:**
- User has invested time building context with previous model
- New model benefits from all clarifying questions and answers
- Avoids re-asking the same questions
- Provides "better departure point" for the new model

### Why Keep Panel Visible During Planning?

**Decision:** Context Panel stays visible during planning mode.

**Rationale:**
- Provides "Cancel Planning" escape hatch
- Users can see task details while planning
- Consistent with work unit experience
- Panel naturally hides when subtasks are created (task becomes container)

### Why Explicit Activation Only?

**Decision:** Planning mode only starts via user action (modal choice or panel button).

**Rationale:**
- Users should control when AI helps break down their work
- Auto-triggering on AI subtask mentions caused confusion
- Normal task conversations shouldn't change task state unexpectedly
- Reduces cognitive load (predictable behavior)

### Why Can't Subtasks Enter Planning Mode?

**Decision:** Subtasks cannot have `status: 'planning'`.

**Rationale:**
- Subtasks cannot have children (no sub-subtasks)
- Planning mode's purpose is to CREATE subtasks
- Applying planning mode to subtasks is semantically meaningless
- Prevents infinite nesting complexity

### Why Three Phases?

**Decision:** Eliciting → Proposing → Confirming

**Rationale:**
- **Eliciting:** AI needs context before suggesting (garbage in, garbage out)
- **Proposing:** Clear output format enables reliable parsing
- **Confirming:** User control before committing to database changes

### Why Limit Elicitation Responses?

**Decision:** Strict character limits (300-400) during elicitation.

**Rationale:**
- Long AI responses lose user engagement
- Forces AI to ask ONE focused question
- Maintains conversational flow
- Prevents "framework dumps" and generic advice

### Why Numbered List Format?

**Decision:** AI must output `1. Task` `2. Task` format in proposing phase.

**Rationale:**
- Regex parsing is reliable and fast
- Clear format reduces parsing errors
- Easy for users to read and understand
- Established UX pattern (numbered lists)

---

## Troubleshooting

### Task Stuck in Planning Mode

**Symptom:** Task shows "Planning" badge but user can't interact.

**Fix:**
```sql
UPDATE tasks
SET status = 'active', planning_data = NULL
WHERE id = 'task_id_here';
```

### Subtask Incorrectly in Planning Mode

**Symptom:** Subtask shows "Planning" status.

**Cause:** Bug in auto-trigger (fixed in migration 012).

**Fix:** Run migration 012 or manually:
```sql
UPDATE tasks
SET status = 'active', planning_data = NULL
WHERE parent_task_id IS NOT NULL AND status = 'planning';
```

### AI Not Generating Numbered List

**Symptom:** AI responds with prose instead of numbered subtasks.

**Cause:** Phase might not have transitioned to 'proposing'.

**Debug:**
1. Check browser console for `[Plan Mode] Phase:` logs
2. Verify `planMode.phase === 'proposing'` in store
3. Check if user confirmed readiness (keyword detection)

### Approach Modal Not Showing

**Symptom:** User visits task but doesn't see approach modal.

**Cause:** One of the conditions is not met.

**Check:**
- `approachChosenAt` is NULL (user hasn't made choice before)
- `linkedConversationIds` is empty (no existing conversations)
- `subtasks.length === 0` (no subtasks exist)
- `status !== 'planning'` (not already planning)

### Panel Disappears During Planning

**Symptom:** Context Panel hidden when task enters planning mode.

**Cause:** Bug where `shouldShowWorkUnitPanel` excluded planning status (fixed).

**Verify:** `shouldShowWorkUnitPanel` should NOT check `task.status !== 'planning'`.

---

## Future Considerations

1. **Subtask Templates** — Pre-defined breakdowns for common task types
2. **AI Synopsis Quality** — Improve auto-generated subtask descriptions
3. **Multi-Level Planning** — Allow planning within planning (wizard-style)
4. **Collaborative Planning** — Multiple users planning same task
5. **Planning History** — Track changes to proposed subtasks over time
6. **Document Attachment During Planning** — Add reference docs mid-planning
