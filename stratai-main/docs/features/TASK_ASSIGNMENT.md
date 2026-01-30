# Task Assignment System

> **Status:** Implementation Ready | **Priority:** High | **Dependencies:** Space Memberships (✅ built), Area Sharing (✅ built), Meeting Capture Loop (✅ built)
>
> **Updated:** 2026-01-30 — Refreshed to reflect Post-Meeting Capture Loop, SendGrid infrastructure, and current codebase state.

Enable assigning tasks to other users within a Space, with email notifications and proper visibility rules.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Core Concepts](#2-core-concepts)
3. [User Stories](#3-user-stories)
4. [Database Schema](#4-database-schema)
5. [API Changes](#5-api-changes)
6. [UI Components](#6-ui-components)
7. [Email Notification](#7-email-notification)
8. [Meeting Capture Integration](#8-meeting-capture-integration)
9. [Implementation Phases](#9-implementation-phases)
10. [Edge Cases](#10-edge-cases)
11. [Future Enhancements (V2)](#11-future-enhancements-v2)

---

## 1. Problem Statement

### Current State

Tasks in StratAI are personal:
- Created by a user (`user_id`)
- Visible only to that user
- No way to delegate work to team members
- **Meeting capture creates subtasks, but all owned by the capturer** — assignee selection in the capture wizard is cosmetic only (name stored in title, not as real assignment)

### The Gap

Teams need to:
- Assign tasks from meetings to attendees
- Delegate work within a Space/Area
- Track what they've assigned vs what's assigned to them
- Be notified when assigned new work

### Value Proposition

| Benefit | Description |
|---------|-------------|
| **Delegation** | Assign work to team members directly |
| **Accountability** | Clear ownership of every task |
| **Meeting Follow-through** | Action items become assigned tasks (closes the capture loop) |
| **Team Visibility** | Track delegated work completion |

### What Already Exists

| Component | Status | Notes |
|-----------|--------|-------|
| Space Memberships | ✅ Built | `space_memberships` table, member loading, role system |
| Area Sharing | ✅ Built | `area_memberships`, restricted areas, access checks |
| Meeting Capture Wizard | ✅ Built | `CaptureActionsStep` has attendee dropdown for assignee |
| `createSubtask()` | ✅ Built | Takes `parentTaskId`, creates nested tasks — needs `assigneeId` param |
| SendGrid Email | ✅ Built | `src/lib/server/email/sendgrid.ts`, templates for password reset & invites |
| Task Store | ✅ Built | `src/lib/stores/tasks.svelte.ts` — needs assignee-aware filtering |

---

## 2. Core Concepts

### Creator vs Assignee

```
┌─────────────────────────────────────────────────────────────────┐
│                    TASK OWNERSHIP MODEL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   CREATOR (user_id)              ASSIGNEE (assignee_id)         │
│   ─────────────────              ──────────────────────         │
│   • Person who created           • Person responsible for       │
│     the task                       completing the task          │
│   • Can edit/delete task         • Task appears in their list   │
│   • Sees task in "delegated"     • Can update status/complete   │
│     view (if assigned away)      • Receives assignment email    │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Common case: Creator = Assignee (self-assigned)        │   │
│   │  Delegation: Creator ≠ Assignee                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Task List Visibility Rules

| Scenario | Appears in Your Task List? |
|----------|---------------------------|
| You created, assigned to yourself | Yes |
| You created, assigned to someone else | No (see "Delegated" view) |
| Someone else created, assigned to you | Yes |
| Subtask of your parent task | Visible on parent task |

### Assignment Scope

**V1: Space + Area Access Required**

You can only assign tasks to users who:
1. Are members of the Space
2. Have access to the Area (if task is in an Area)

This keeps the access model simple - no implicit access grants.

### Subtask Assignment

Each subtask can have a different assignee. This is the core model that enables the Meeting Capture → Task Assignment flow:

```
┌─────────────────────────────────────────────────────────────────┐
│  Parent Task: "Prepare for: Q1 Planning Meeting"                │
│  Creator: Sarah    Assignee: Sarah    (source: meeting)         │
│                                                                  │
│  └── Subtask: "Draft budget proposal"                           │
│      Creator: Sarah    Assignee: John    (from capture wizard)  │
│                                                                  │
│  └── Subtask: "Review competitor analysis"                      │
│      Creator: Sarah    Assignee: Maria   (from capture wizard)  │
│                                                                  │
│  └── Subtask: "Send meeting notes to stakeholders"              │
│      Creator: Sarah    Assignee: Sarah   (self-assigned)        │
└─────────────────────────────────────────────────────────────────┘
```

Sarah sees the parent task and all subtasks (as creator/owner).
John sees only his subtask in his task list.
Maria sees only her subtask in her task list.

---

## 3. User Stories

### Basic Assignment

```
AS A team member
I WANT TO assign a task to a colleague
SO THAT I can delegate work within my team

Acceptance Criteria:
- [ ] Can select assignee from Space members when creating task
- [ ] Can change assignee when editing task
- [ ] Assignee must have access to the Area (if applicable)
- [ ] Default assignee is self
```

### My Task List

```
AS A user
I WANT TO see tasks assigned to me
SO THAT I know what I need to work on

Acceptance Criteria:
- [ ] Task list shows tasks where I am the assignee
- [ ] Tasks I created but assigned away are NOT in my main list
- [ ] Assigned tasks show who assigned them (creator)
```

### Meeting Action Items

```
AS A meeting owner
I WANT TO assign action items from the capture wizard to attendees
SO THAT follow-up work is clearly owned

Acceptance Criteria:
- [ ] CaptureActionsStep assignee selection maps to real assigneeId
- [ ] finalizeMeeting() creates subtasks with correct assignees
- [ ] Each assignee receives email notification
- [ ] Subtasks appear in assignee's task list
```

### Assignment Notification

```
AS a user
I WANT TO be notified when assigned a task
SO THAT I don't miss new work

Acceptance Criteria:
- [ ] Receive email when assigned a task
- [ ] Email shows task title, description, due date, who assigned
- [ ] Email has link to open task in StratAI
```

---

## 4. Database Schema

### Migration: Add assignee_id to tasks

```sql
-- Migration: 20260130_003_task_assignment.sql

-- Add assignee_id column to tasks
-- UUID type to match users(id), nullable for gradual rollout
ALTER TABLE tasks
ADD COLUMN assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Backfill: existing tasks assigned to creator
UPDATE tasks
SET assignee_id = user_id
WHERE assignee_id IS NULL;

-- Index for fetching tasks assigned to a user
CREATE INDEX idx_tasks_assignee
ON tasks(assignee_id, space_id, status)
WHERE deleted_at IS NULL;

-- Index for fetching tasks created by a user but assigned to others (delegated view)
CREATE INDEX idx_tasks_creator_delegated
ON tasks(user_id, space_id)
WHERE deleted_at IS NULL AND user_id != assignee_id;
```

> **Note:** Column is `UUID` not `TEXT` — matches existing `user_id UUID` column type on tasks table.

### Updated Task Type

```typescript
// In src/lib/types/tasks.ts

export interface Task {
  id: string;
  title: string;
  // ... existing fields ...

  // Ownership
  userId: string;        // Creator - who made this task
  assigneeId?: string;   // Assignee - who should complete it (defaults to userId)

  // ... rest of fields ...
}

export interface CreateTaskInput {
  title: string;
  // ... existing fields ...
  assigneeId?: string;  // Optional, defaults to current user
}

export interface CreateSubtaskInput {
  title: string;
  parentTaskId: string;
  // ... existing fields ...
  assigneeId?: string;  // Optional, defaults to current user
}

export interface UpdateTaskInput {
  // ... existing fields ...
  assigneeId?: string | null;  // Can reassign, null to unassign
}
```

### TaskRow Update

```typescript
export interface TaskRow {
  // ... existing fields ...
  assigneeId: string | null;  // postgres.js camelCase transformation from assignee_id
}
```

---

## 5. API Changes

### Task Endpoints

**POST /api/tasks** - Create task
```typescript
// Request body addition
{
  assigneeId?: string  // Optional, defaults to authenticated user
}
```

**POST /api/tasks/[id]/subtasks** - Create subtask
```typescript
// Request body addition
{
  assigneeId?: string  // Optional, defaults to authenticated user
}
```

**PATCH /api/tasks/[id]** - Update task
```typescript
// Request body addition
{
  assigneeId?: string  // Can reassign
}
```

### Assignable Members

No new endpoint needed — the existing space members endpoint (`GET /api/spaces/[id]/members`) already returns members with user data. The `MemberSelector` component can consume this directly.

For Area-scoped filtering, the `area_memberships` table provides access checks. V1 keeps it simple: show all Space members, validate Area access server-side on save.

### Repository Changes

```typescript
// In tasks-postgres.ts

// CHANGE: Filter by assignee_id instead of user_id for "my tasks"
async findAll(userId: string, filter?: TaskListFilter): Promise<Task[]> {
  // WHERE assignee_id = userId (tasks assigned to me)
  // OR (user_id = userId AND assignee_id = userId) (tasks I self-assigned)
}

// NEW: Get tasks user created but assigned to others
async findDelegated(userId: string, filter?: TaskListFilter): Promise<Task[]> {
  // WHERE user_id = userId AND assignee_id != userId AND assignee_id IS NOT NULL
}

// CHANGE: createSubtask accepts assigneeId
async createSubtask(input: CreateSubtaskInput, userId: string): Promise<Task> {
  // INSERT ... assignee_id = input.assigneeId ?? userId
}
```

---

## 6. UI Components

### 6.1 MemberSelector Component

Shared component for selecting a user from Space members. Used by both TaskModal and CaptureActionsStep.

**Location:** `src/lib/components/shared/MemberSelector.svelte`

```svelte
<script lang="ts">
  interface Props {
    spaceId: string;
    value: string | null;  // Selected user ID
    onchange: (userId: string | null) => void;
    label?: string;
    placeholder?: string;
    currentUserId?: string;  // To show "(You)" suffix
    /** Pre-loaded members — avoids fetch when parent already has members */
    members?: Array<{ userId: string; displayName?: string; email: string }>;
  }
</script>
```

**Features:**
- Dropdown with user initials/avatars and names
- Shows current user first with "(You)" suffix
- Accepts pre-loaded members (for capture wizard which already has attendees) or loads from API
- "Unassigned" option to clear assignment

### 6.2 Task Card Updates

Show assignee on task cards:

```
┌─────────────────────────────────────────────────────────┐
│ ○ Draft Q1 budget proposal                    [High]    │
│   Due: Jan 30                                           │
│   👤 Assigned to: John Smith                            │
└─────────────────────────────────────────────────────────┘
```

- If assigned to self: don't show assignee line (implicit)
- If assigned to someone else: show avatar + name
- If you're viewing someone else's task: show "Assigned by: [Creator]"

### 6.3 Task Modal Updates

Add `MemberSelector` to `TaskModal.svelte`:

```
┌─────────────────────────────────────────────────────────┐
│  Create Task                                      [X]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Title                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Draft Q1 budget proposal                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Assign to                                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 👤 John Smith                              ▼    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Due Date                    Priority                   │
│  ┌───────────────────┐      ┌───────────────────┐      │
│  │ Jan 30, 2026      │      │ High          ▼   │      │
│  └───────────────────┘      └───────────────────┘      │
│                                                         │
│                              [Cancel]  [Create Task]    │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Email Notification

### Template: Task Assignment

**Trigger:** When a task is assigned to someone other than the creator.

**Subject:** `[StratAI] {Creator} assigned you a task: {TaskTitle}`

**Template Location:** `src/lib/server/email/templates/task-assigned.ts`

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [StratAI Logo]                                                 │
│                                                                  │
│  You've been assigned a task                                    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Sarah Johnson assigned you a task in Nedbank SVS:              │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  📋 Draft Q1 budget proposal                              │  │
│  │                                                           │  │
│  │  📅 Due: January 30, 2026                                 │  │
│  │  🏷️ Priority: High                                        │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│            [ View Task in StratAI ]                             │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Space: Nedbank SVS                                             │
│  Area: Q1 Planning                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Email Service Integration

```typescript
// In src/lib/server/email/task-notifications.ts

import type { Task } from '$lib/types/tasks';

interface TaskAssignmentEmailParams {
  task: Task;
  assigneeEmail: string;
  assigneeName: string;
  assignerName: string;
  spaceName: string;
  areaName?: string;
}

export async function sendTaskAssignmentEmail(params: TaskAssignmentEmailParams): Promise<void> {
  // Uses existing sendgrid.ts infrastructure
  // Follows same pattern as space-invite emails
}
```

---

## 8. Meeting Capture Integration

> **This section is new** — describes how task assignment plugs into the Post-Meeting Capture Loop built on 2026-01-30.

### Current State (Cosmetic Assignment)

The `CaptureActionsStep.svelte` component already has:
- Attendee dropdown per action item (`assigneeId` field on `CaptureActionItem`)
- Assignee name resolution (`assigneeName` field)

But `finalizeMeeting()` in `meeting-finalize.ts` creates subtasks via:
```typescript
await postgresTaskRepository.createSubtask({
  title: action.text,
  parentTaskId: meeting.taskId,
  subtaskType: 'action'
}, userId);
```

The `assigneeId` from the capture data is **not passed through** — all subtasks end up owned by the capturer.

### After Task Assignment (Real Assignment)

Wire the existing capture UI to real assignment:

```typescript
// In meeting-finalize.ts — createActionSubtask()
await postgresTaskRepository.createSubtask({
  title: action.text,
  parentTaskId: meeting.taskId,
  subtaskType: 'action',
  assigneeId: action.assigneeId  // ← Wire this through
}, userId);

// Send notification to assignee (if different from creator)
if (action.assigneeId && action.assigneeId !== userId) {
  await sendTaskAssignmentEmail({...});
}
```

### Changes Required

| File | Change |
|------|--------|
| `meeting-finalize.ts` | Pass `action.assigneeId` to `createSubtask()` |
| `CaptureActionsStep.svelte` | Already done — UI exists, just needs real backend wiring |
| `CaptureReviewStep.svelte` | Already shows assignee names — no changes needed |

**Estimated effort:** ~30 minutes once task assignment backend is in place.

---

## 9. Implementation Phases

### Phase 1: Schema + Types + Repository

- [ ] Create migration: `20260130_003_task_assignment.sql`
  - [ ] Add `assignee_id UUID` to tasks
  - [ ] Backfill existing tasks (`assignee_id = user_id`)
  - [ ] Create indexes (`idx_tasks_assignee`, `idx_tasks_creator_delegated`)
- [ ] Update `src/lib/types/tasks.ts`:
  - [ ] Add `assigneeId` to `Task`, `TaskRow`, `CreateTaskInput`, `UpdateTaskInput`, `CreateSubtaskInput`
  - [ ] Update `rowToTask()` conversion
- [ ] Update `src/lib/server/persistence/tasks-postgres.ts`:
  - [ ] `create()` — accept and store `assigneeId` (default to `userId`)
  - [ ] `createSubtask()` — accept and store `assigneeId` (default to `userId`)
  - [ ] `update()` — accept `assigneeId` for reassignment
  - [ ] `findAll()` — filter by `assignee_id` for "my tasks" (this is the visibility change)
  - [ ] New: `findDelegated()` — tasks user created but assigned to others
- [ ] Update repository interface in `persistence/types.ts`
- [ ] Update task API endpoints:
  - [ ] `POST /api/tasks` — accept `assigneeId`
  - [ ] `PATCH /api/tasks/[id]` — accept `assigneeId`
  - [ ] Subtask endpoint — accept `assigneeId`
- [ ] Update `fresh-install/schema.sql` with new column
- [ ] Run migration, verify backfill

### Phase 2: UI Components

- [ ] Create `MemberSelector.svelte` shared component
- [ ] Update `TaskModal.svelte` with MemberSelector
- [ ] Update task cards to show assignee (when different from self)
- [ ] Update `tasks.svelte.ts` store to handle `assigneeId` field
- [ ] Test: create task with assignee, verify visibility rules

### Phase 3: Email Notification

- [ ] Create `src/lib/server/email/templates/task-assigned.ts`
- [ ] Create `src/lib/server/email/task-notifications.ts`
- [ ] Hook into task creation flow (non-blocking, fire-and-forget)
- [ ] Hook into task update flow (reassignment notification)
- [ ] Test: assign task to another user, verify email

### Phase 4: Meeting Capture Wiring

- [ ] Update `meeting-finalize.ts` → pass `assigneeId` to `createSubtask()`
- [ ] Send assignment emails for each unique assignee from capture
- [ ] Replace inline `<select>` in `CaptureActionsStep` with `MemberSelector`
- [ ] Test: capture meeting with assigned actions, verify subtask owners

### Phase 5: Polish

- [ ] Handle reassignment (new notification, old assignee loses task from list)
- [ ] Handle deleted/removed users (SET NULL behavior)
- [ ] Verify Area access enforcement on assignment
- [ ] Global tasks page — filter by "assigned to me" vs "delegated"
- [ ] TypeScript check + build gate

---

## 10. Edge Cases

| Scenario | Handling |
|----------|----------|
| Assignee loses Area access | Task remains, but they can't see Area context |
| Assignee removed from Space | `assignee_id` stays (FK to users, not memberships), task visible but Space context lost |
| Assignee deleted from system | `ON DELETE SET NULL` — task orphaned, falls back to creator view |
| Reassign to different user | Update assignee_id, send notification to new assignee |
| Assign to self | No notification sent (skip if assigner === assignee) |
| Create subtask with assignee | Each subtask independent, notifications per assignee |
| Bulk assign from meeting capture | One notification per unique assignee (batch, non-blocking) |
| User has no Space membership | Server-side validation rejects assignment (403) |

---

## 11. Future Enhancements (V2)

**Not in V1 scope - defer these:**

| Enhancement | Description |
|-------------|-------------|
| **Delegated Tasks View** | Dedicated UI tab showing tasks you assigned to others |
| **Assignment History** | Audit log of who assigned/reassigned when |
| **In-app Notifications** | Bell icon with assignment notifications |
| **Notification Preferences** | User settings for email frequency |
| **Team Task Views** | See all tasks in a Space (manager view) |
| **Assignment Comments** | Add context when assigning ("Please prioritize this") |
| **Due Date Reminders** | Email reminders before due dates |
| **@mention in chat** | "Assign this to @John" creates task with assignee from chat |

---

## Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/server/persistence/tasks-postgres.ts` | Task repository | **Modify** — add assigneeId support |
| `src/lib/types/tasks.ts` | Task types | **Modify** — add assigneeId fields |
| `src/lib/stores/tasks.svelte.ts` | Task store | **Modify** — assignee-aware filtering |
| `src/routes/api/tasks/+server.ts` | Task API endpoints | **Modify** — accept assigneeId |
| `src/lib/components/spaces/TaskModal.svelte` | Task create/edit modal | **Modify** — add MemberSelector |
| `src/lib/components/shared/MemberSelector.svelte` | Member selector | **NEW** |
| `src/lib/server/email/task-notifications.ts` | Assignment emails | **NEW** |
| `src/lib/server/email/templates/task-assigned.ts` | Email template | **NEW** |
| `src/lib/server/services/meeting-finalize.ts` | Meeting finalization | **Modify** — wire assigneeId |
| `src/lib/components/meetings/capture/CaptureActionsStep.svelte` | Capture actions UI | **Modify** — use MemberSelector |
| `src/lib/server/email/sendgrid.ts` | SendGrid integration | ✅ Exists |
| `src/lib/server/email/templates.ts` | Email templates | ✅ Exists (extend) |
