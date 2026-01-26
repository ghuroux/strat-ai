# Task Assignment System

> **Status:** Design Complete | **Priority:** High | **Dependencies:** Space Memberships, Area Sharing

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
8. [Implementation Phases](#8-implementation-phases)
9. [Edge Cases](#9-edge-cases)
10. [Future Enhancements (V2)](#10-future-enhancements-v2)

---

## 1. Problem Statement

### Current State

Tasks in StratAI are personal:
- Created by a user (`user_id`)
- Visible only to that user
- No way to delegate work to team members

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
| **Meeting Follow-through** | Action items become assigned tasks |
| **Team Visibility** | Track delegated work completion |

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

Each subtask can have a different assignee:

```
┌─────────────────────────────────────────────────────────────────┐
│  Parent Task: "Q1 Planning Meeting"                              │
│  Creator: Sarah    Assignee: Sarah                               │
│                                                                  │
│  └── Subtask: "Draft budget proposal"                           │
│      Creator: Sarah    Assignee: John                           │
│                                                                  │
│  └── Subtask: "Review competitor analysis"                      │
│      Creator: Sarah    Assignee: Maria                          │
│                                                                  │
│  └── Subtask: "Send meeting notes to stakeholders"              │
│      Creator: Sarah    Assignee: Sarah                          │
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
I WANT TO assign action items to attendees
SO THAT follow-up work is clearly owned

Acceptance Criteria:
- [ ] When creating meeting notes, can assign each action item
- [ ] Assignee selector shows meeting attendees first
- [ ] Each action item becomes a subtask with its assignee
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
-- Migration: YYYYMMDD_001_task_assignment.sql

-- Add assignee_id column to tasks
ALTER TABLE tasks
ADD COLUMN assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Backfill: existing tasks assigned to creator
UPDATE tasks
SET assignee_id = user_id
WHERE assignee_id IS NULL;

-- Index for fetching tasks assigned to a user
CREATE INDEX idx_tasks_assignee
ON tasks(assignee_id, space_id, status)
WHERE deleted_at IS NULL;

-- Index for fetching tasks created by a user (delegated view)
CREATE INDEX idx_tasks_creator_delegated
ON tasks(user_id, space_id)
WHERE deleted_at IS NULL AND user_id != assignee_id;
```

### Updated Task Type

```typescript
// In src/lib/types/tasks.ts

export interface Task {
  id: string;
  title: string;
  // ... existing fields ...

  // Ownership
  userId: string;      // Creator - who made this task
  assigneeId: string;  // Assignee - who should complete it (defaults to userId)

  // ... rest of fields ...
}

export interface CreateTaskInput {
  title: string;
  // ... existing fields ...
  assigneeId?: string;  // Optional, defaults to current user
}

export interface UpdateTaskInput {
  // ... existing fields ...
  assigneeId?: string;  // Can reassign
}
```

### TaskRow Update

```typescript
export interface TaskRow {
  // ... existing fields ...
  assigneeId: string;  // postgres.js camelCase transformation
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

**PATCH /api/tasks/[id]** - Update task
```typescript
// Request body addition
{
  assigneeId?: string  // Can reassign
}
```

### New Endpoint: Get Assignable Users

**GET /api/spaces/[spaceId]/members/assignable**

Returns users who can be assigned tasks in this space.
If `areaId` query param provided, filters to users with Area access.

```typescript
// Response
{
  members: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  }>
}
```

### Repository Changes

```typescript
// In tasks-postgres.ts

// Update getTasksForUser to filter by assignee
async getTasksForUser(userId: string, filter?: TaskListFilter): Promise<Task[]> {
  // WHERE assignee_id = userId (not user_id)
}

// New method: get tasks user created but assigned to others
async getDelegatedTasks(userId: string, spaceId?: string): Promise<Task[]> {
  // WHERE user_id = userId AND assignee_id != userId
}
```

---

## 6. UI Components

### 6.1 MemberSelector Component

New component for selecting a user from Space members.

**Location:** `src/lib/components/shared/MemberSelector.svelte`

```svelte
<script lang="ts">
  interface Props {
    spaceId: string;
    areaId?: string;
    value: string | null;  // Selected user ID
    onchange: (userId: string) => void;
    label?: string;
    placeholder?: string;
  }
</script>
```

**Features:**
- Dropdown with user avatars and names
- Search/filter functionality
- Shows current user first with "(You)" suffix
- Loads members from API on mount
- Filters by Area access when areaId provided

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

Add assignee field to TaskModal:

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

### 6.4 Guided Creation: Action Items Step

Update the action items step in Meeting Notes guided creation:

```
┌─────────────────────────────────────────────────────────┐
│  Action Items                                           │
│                                                         │
│  What follow-up tasks came out of this meeting?         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Draft budget proposal                           │   │
│  │ 👤 John Smith ▼           📅 Jan 30 (soft)      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Review competitor analysis                      │   │
│  │ 👤 Maria Garcia ▼         📅 Feb 5 (soft)       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [+ Add another]                                        │
│                                                         │
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
│  │  Description:                                             │  │
│  │  Create initial budget proposal based on Q4 actuals       │  │
│  │  and projected growth targets.                            │  │
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

export async function sendTaskAssignmentEmail(params: {
  task: Task;
  assignee: User;
  assigner: User;
  space: Space;
  area?: Area;
}): Promise<void> {
  // Skip if assigner === assignee (self-assigned)
  if (params.assigner.id === params.assignee.id) return;

  // Use SendGrid template
  await sendEmail({
    to: params.assignee.email,
    templateId: 'task-assigned',
    dynamicData: {
      assignerName: params.assigner.name,
      taskTitle: params.task.title,
      taskDescription: params.task.description,
      dueDate: params.task.dueDate,
      priority: params.task.priority,
      spaceName: params.space.name,
      areaName: params.area?.name,
      taskUrl: `${BASE_URL}/spaces/${params.space.slug}/task/${params.task.id}`
    }
  });
}
```

---

## 8. Implementation Phases

### Phase 1: Schema & Backend (Session 1)

- [ ] Create migration: add `assignee_id` to tasks
- [ ] Update `TaskRow` and `Task` types
- [ ] Update `rowToTask` conversion
- [ ] Update tasks repository:
  - [ ] `createTask` - accept assigneeId
  - [ ] `updateTask` - accept assigneeId
  - [ ] `getTasksForUser` - filter by assigneeId
  - [ ] New: `getDelegatedTasks`
- [ ] Update task API endpoints
- [ ] Create `/api/spaces/[spaceId]/members/assignable` endpoint
- [ ] Run migration, verify backfill

### Phase 2: UI Components (Session 2)

- [ ] Create `MemberSelector` component
- [ ] Update `TaskModal` with assignee field
- [ ] Update task cards to show assignee
- [ ] Update task store to handle assignee
- [ ] Test: create task with assignee, verify visibility

### Phase 3: Email Notification (Session 2-3)

- [ ] Create email template: `task-assigned`
- [ ] Create `sendTaskAssignmentEmail` function
- [ ] Hook into task creation/update flow
- [ ] Test: assign task, verify email sent

### Phase 4: Meeting Integration (Session 3)

- [ ] Update action items step with assignee selector
- [ ] Ensure subtasks created with correct assignees
- [ ] Test: complete meeting capture, verify assignees

### Phase 5: Polish & Edge Cases (Session 3)

- [ ] Handle reassignment (send new notification?)
- [ ] Handle deleted users (SET NULL)
- [ ] Verify Area access enforcement
- [ ] UI polish and testing

---

## 9. Edge Cases

| Scenario | Handling |
|----------|----------|
| Assignee loses Area access | Task remains, but they can't see Area context |
| Assignee deleted from system | `assignee_id` set to NULL, task orphaned |
| Reassign to different user | Update assignee, send notification to new assignee |
| Assign to self | No notification sent |
| Create subtask with assignee | Each subtask independent, notifications per assignee |
| Bulk assign from meeting | One notification per unique assignee |

---

## 10. Future Enhancements (V2)

**Not in V1 scope - defer these:**

| Enhancement | Description |
|-------------|-------------|
| **Delegated Tasks View** | Dedicated view showing tasks you assigned to others |
| **Assignment History** | Audit log of who assigned/reassigned when |
| **In-app Notifications** | Bell icon with assignment notifications |
| **Notification Preferences** | User settings for email frequency |
| **Team Task Views** | See all tasks in a Space (manager view) |
| **Assignment Comments** | Add context when assigning ("Please prioritize this") |
| **Due Date Reminders** | Email reminders before due dates |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/server/persistence/tasks-postgres.ts` | Task repository |
| `src/lib/types/tasks.ts` | Task types |
| `src/lib/stores/tasks.svelte.ts` | Task store |
| `src/routes/api/tasks/+server.ts` | Task API endpoints |
| `src/lib/components/spaces/TaskModal.svelte` | Task create/edit modal |
| `src/lib/components/shared/MemberSelector.svelte` | **NEW** - Member selector |
| `src/lib/server/email/task-notifications.ts` | **NEW** - Assignment emails |
| `docs/features/MEETING_LIFECYCLE.md` | Meeting system (related) |
| `docs/features/GUIDED_CREATION.md` | Guided creation (related) |
