# Spaces, Focus Areas & Chat Context Awareness - Unified Design

> **Status:** Ready for Implementation
> **Date:** 2025-12-21
> **Supersedes:** `DESIGN-CHAT-CONTEXT-AWARENESS.md` (merged into this document)

---

## Executive Summary

This document defines the complete design for:
1. **Focus Areas** - Specialized contexts within spaces (Phase A)
2. **Custom Spaces** - User-defined top-level spaces (Phase B)
3. **Chat Context Awareness** - Smart sidebar filtering and navigation (Phase C)

---

## Core Concepts

### Spaces
Top-level organizational containers with their own context.
- **System spaces:** Work, Research, Random, Personal (fixed, always present)
- **Custom spaces:** User-created (e.g., "Acme Client", "Side Project X")

### Focus Areas
Specialized contexts within a space that inherit the parent space's context.
- Example: Work > Automations, Work > CI/CD, Work > Infrastructure
- Context chain: Space context + Focus Area context = Combined context

### Context Inheritance
```
Platform Base Prompt
    └── Space Context (Work)
            └── Focus Area Context (Automations)
                    └── Task Context (Deploy service)
                            └── Conversation
```

Each level adds context, creating efficient token usage (only inject what's relevant).

---

## Data Model

### Spaces Table
```sql
CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'custom')),
  context TEXT,                    -- Space-level context (markdown)
  context_document_ids TEXT[],     -- Linked documents for context
  color TEXT NOT NULL,             -- Accent color (hex or variable)
  icon TEXT,                       -- Optional icon identifier
  order_index INTEGER DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Seed system spaces (run once)
INSERT INTO spaces (id, name, type, color, user_id) VALUES
  ('work', 'Work', 'system', '#3b82f6', 'system'),
  ('research', 'Research', 'system', '#a855f7', 'system'),
  ('random', 'Random', 'system', '#f97316', 'system'),
  ('personal', 'Personal', 'system', '#22c55e', 'system');

CREATE INDEX idx_spaces_user ON spaces(user_id) WHERE deleted_at IS NULL;
```

### Focus Areas Table
```sql
CREATE TABLE focus_areas (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  context TEXT,                    -- Additional context (markdown)
  context_document_ids TEXT[],     -- Linked documents for context
  color TEXT,                      -- Optional override color
  icon TEXT,                       -- Optional icon
  order_index INTEGER DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(space_id, name, user_id)
);

CREATE INDEX idx_focus_areas_space ON focus_areas(space_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_focus_areas_user ON focus_areas(user_id) WHERE deleted_at IS NULL;
```

### Updated Tasks Table
```sql
-- Add column to existing tasks table
ALTER TABLE tasks ADD COLUMN focus_area_id TEXT REFERENCES focus_areas(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_focus_area ON tasks(focus_area_id) WHERE deleted_at IS NULL;
```

### Updated Conversations Table
```sql
-- Migrate space column and add new columns
-- Note: space column becomes space_id (foreign key to spaces)
ALTER TABLE conversations ADD COLUMN space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN focus_area_id TEXT REFERENCES focus_areas(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL;

-- Migrate existing data
UPDATE conversations SET space_id = space WHERE space IS NOT NULL;

-- Eventually drop old column
-- ALTER TABLE conversations DROP COLUMN space;

CREATE INDEX idx_conversations_space ON conversations(space_id);
CREATE INDEX idx_conversations_focus_area ON conversations(focus_area_id);
CREATE INDEX idx_conversations_task ON conversations(task_id);
```

### TypeScript Types

```typescript
// src/lib/types/spaces.ts

export interface Space {
  id: string;
  name: string;
  type: 'system' | 'custom';
  context?: string;
  contextDocumentIds?: string[];
  color: string;
  icon?: string;
  orderIndex: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FocusArea {
  id: string;
  spaceId: string;
  name: string;
  context?: string;
  contextDocumentIds?: string[];
  color?: string;
  icon?: string;
  orderIndex: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFocusAreaInput {
  spaceId: string;
  name: string;
  context?: string;
  contextDocumentIds?: string[];
  color?: string;
}

export interface CreateSpaceInput {
  name: string;
  context?: string;
  color: string;
  icon?: string;
}

// System space IDs (for type safety)
export type SystemSpaceId = 'work' | 'research' | 'random' | 'personal';

export const SYSTEM_SPACES: SystemSpaceId[] = ['work', 'research', 'random', 'personal'];

export function isSystemSpace(id: string): id is SystemSpaceId {
  return SYSTEM_SPACES.includes(id as SystemSpaceId);
}
```

```typescript
// Updated src/lib/types/chat.ts

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  parentConversationId?: string | null;

  // Context linking
  spaceId?: string | null;       // Which space (was: space?: SpaceType)
  focusAreaId?: string | null;   // Which focus area within space
  taskId?: string | null;        // Which task (for task environment navigation)
}
```

---

## Context Injection

### Context Chain
When chatting in Work > Automations > Task "Deploy service":

```
1. Platform base prompt (always)
2. + Space context (Work) - company info, team patterns
3. + Focus area context (Automations) - k8s docs, terraform patterns
4. + Focus area documents (uploaded PDFs, etc.)
5. + Task context (linked docs, related tasks)
6. = Full context for this conversation
```

### Token Budget Management
- Space context: ~5k tokens max
- Focus area context: ~10k tokens max
- Task context: ~10k tokens max (from existing system)
- Total budget: ~50k tokens (configurable)

If over budget, prioritize: Task > Focus Area > Space (most specific wins)

### Implementation in context-builder.ts

```typescript
export interface FullContextInfo {
  space?: {
    id: string;
    name: string;
    context?: string;
    documents?: DocumentSummary[];
  };
  focusArea?: {
    id: string;
    name: string;
    context?: string;
    documents?: DocumentSummary[];
  };
  task?: TaskContextInfo;  // Existing type
}

export function buildFullContextPrompt(info: FullContextInfo): string {
  const sections: string[] = [];

  if (info.space?.context) {
    sections.push(`## Space Context: ${info.space.name}\n${info.space.context}`);
  }

  if (info.focusArea?.context) {
    sections.push(`## Focus Area: ${info.focusArea.name}\n${info.focusArea.context}`);
  }

  if (info.task) {
    sections.push(buildTaskContextPrompt(info.task));  // Existing function
  }

  return sections.join('\n\n---\n\n');
}
```

---

## UI Design

### Space Navigation (Header)

```
┌──────────────────────────────────────────────────────────────────┐
│ [Work] [Research] [Random] [Personal] │ [Acme Client] [+]        │
│  └── System spaces (fixed)            │  └── Custom spaces       │
└──────────────────────────────────────────────────────────────────┘
```

- System spaces always visible, can't delete/rename
- Custom spaces after separator
- [+] opens create space modal
- Limit: 5 custom spaces per user

### Focus Area Pills (Within Space)

```
┌─────────────────────────────────────────────────────────────────┐
│ WORK                                                            │
│ ┌───────┬──────────────┬─────────┬──────────┬─────────────────┐│
│ │  All  │ Automations  │  CI/CD  │  Infra   │ [+ Focus Area]  ││
│ └───────┴──────────────┴─────────┴──────────┴─────────────────┘│
│                                                                 │
│ (Selecting "Automations" = Work context + Automation context)   │
└─────────────────────────────────────────────────────────────────┘
```

- "All" shows everything in space (no focus area filter)
- Pills for each focus area
- [+ Focus Area] opens creation modal
- Limit: 10 focus areas per space

### Context Management Panel

```
┌─────────────────────────────────────────────────────────────────┐
│ WORK > Automations                              [⚙️ Settings]   │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Active Context                                        [▼]    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📄 Work space context (2.1k tokens)                    [✎]  │ │
│ │ 📄 Automations context (1.4k tokens)                   [✎]  │ │
│ │ 📎 k8s-runbook.pdf (3.2k tokens)                       [×]  │ │
│ │ 📎 terraform-patterns.md (1.1k tokens)                 [×]  │ │
│ │                                                             │ │
│ │ Total: ~7.8k tokens                          [+ Add Doc]    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

- Shows what context is being injected
- Token estimates for transparency
- Edit context inline
- Add/remove documents
- Collapsible by default

### Focus Area Creation Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Create Focus Area                                          [×]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Name                                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Automations                                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Context (optional)                                              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ This focus area is for Kubernetes and Terraform work.      │ │
│ │ Our clusters run on AWS EKS...                              │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Documents (optional)                                   [Upload] │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ No documents attached                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                        [Cancel]  [Create]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Chat Context Awareness

### Sidebar Visual Design

#### Border Colors (Origin Indicator)

Left border using space accent color:

| Origin | Border Color | Variable |
|--------|--------------|----------|
| Work | Blue (#3b82f6) | `--space-accent-work` |
| Research | Purple (#a855f7) | `--space-accent-research` |
| Random | Orange (#f97316) | `--space-accent-random` |
| Personal | Green (#22c55e) | `--space-accent-personal` |
| Custom | User-defined | From `spaces.color` |
| Main | None | - |

### Sidebar Sections by Context

#### Main Chat View
```
┌─────────────────────────────────────┐
│ + New Chat                          │
├─────────────────────────────────────┤
│ 🔍 Search conversations...          │
├─────────────────────────────────────┤
│ 📌 PINNED                           │
│   Chat about pricing                │
│   │ Q1 Planning              (Work) │
├─────────────────────────────────────┤
│ 🕐 RECENT                           │
│   General question                  │
│   │ Research synthesis    (Research)│
├─────────────────────────────────────┤
│ 📁 FROM OTHER CONTEXTS         ▼    │
│   │ Work: Budget discussion         │
│   │ Research: AI trends             │
│   📋 Task: Deploy service (Work)    │
└─────────────────────────────────────┘
```

#### Space View (All - no focus area selected)
```
┌─────────────────────────────────────┐
│ + New Chat                          │
├─────────────────────────────────────┤
│ WORK CONVERSATIONS                  │
│   │ Q1 Planning                     │
│   │ Budget discussion               │
│   │ Automations: K8s deploy         │
├─────────────────────────────────────┤
│ 📁 FROM OTHER CONTEXTS         ▼    │
│   Main: General question            │
│   │ Research: AI trends             │
└─────────────────────────────────────┘
```

#### Space View (Focus Area selected)
```
┌─────────────────────────────────────┐
│ WORK > AUTOMATIONS                  │
├─────────────────────────────────────┤
│ AUTOMATIONS CONVERSATIONS           │
│   │ K8s deployment planning         │
│   │ Terraform refactor              │
├─────────────────────────────────────┤
│ 📁 OTHER IN WORK               ▼    │
│   │ CI/CD: Pipeline optimization    │
│   │ General: Budget discussion      │
├─────────────────────────────────────┤
│ 📁 OTHER CONTEXTS              ▼    │
│   Main: General question            │
│   │ Research: AI trends             │
└─────────────────────────────────────┘
```

#### Task Environment (Deep Work Mode)
```
┌─────────────────────────────────────┐
│ TASK: Deploy new service            │
├─────────────────────────────────────┤
│ TASK CONVERSATIONS                  │
│   │ Plan Mode: Breaking down...     │
│   │ Follow-up: Dependencies...      │
│                                     │
│ (NO other contexts shown)           │
│ (Deep work = zero distractions)     │
└─────────────────────────────────────┘
```

### Navigation Matrix

| From | Click on | Action |
|------|----------|--------|
| **Main** | Main chat | Open normally |
| Main | Space chat | Navigate to space → open |
| Main | Focus area chat | Navigate to space + select focus area → open |
| Main | Task chat | Navigate to space → focus task → open |
| **Space (All)** | Same space chat | Open normally |
| Space (All) | Different space chat | Navigate to that space → open |
| Space (All) | Main chat | **Prompt: "Bring here?" or "Open in Main"** |
| Space (All) | Task chat | Focus on that task → open |
| **Focus Area** | Same focus area chat | Open normally |
| Focus Area | Different focus area (same space) | Switch focus area → open |
| Focus Area | Different space chat | Navigate to that space → open |
| Focus Area | Main chat | **Prompt: "Bring here?" or "Open in Main"** |
| Focus Area | Task chat | Focus on that task → open |
| **Task Env** | Same task chat | Open normally |
| Task Env | Different task chat | Switch to that task → open |
| Task Env | Space/focus area chat | Exit task focus → open |
| Task Env | Main chat | **Prompt: "Bring here?" or "Open in Main"** |

### "Bring to Context" Modal

When clicking a main chat from a space/focus area:

```
┌─────────────────────────────────────────────┐
│ This chat isn't in Work                     │
│                                             │
│ [Open in Main]  [Bring to Work > Automations]
└─────────────────────────────────────────────┘
```

- **Open in Main** → Navigate to main chat, open conversation
- **Bring to [context]** → Update conversation's `spaceId`/`focusAreaId`, open here

---

## Limits & Constraints

| Entity | Limit | Rationale |
|--------|-------|-----------|
| Custom spaces per user | 5 | Prevent sprawl |
| Focus areas per space | 10 | Keep navigation manageable |
| Space context size | ~5k tokens | Token budget |
| Focus area context size | ~10k tokens | Token budget |
| Documents per focus area | 10 | Storage/performance |

---

## Deletion Behavior

### Deleting a Focus Area
- Tasks in focus area → `focus_area_id` set to NULL (move to "All")
- Conversations in focus area → `focus_area_id` set to NULL
- Confirmation: "X tasks and Y conversations will be moved to general Work area"

### Deleting a Custom Space
- Prevented if space has tasks or conversations
- User must first move/delete content
- Or: Soft delete, content becomes inaccessible but preserved

### Task Deleted, Chat Remains
- Conversation's `task_id` set to NULL
- Chat remains in space/focus area
- No longer appears in task environment

---

## Open Questions - Resolved

| Question | Decision |
|----------|----------|
| Search show all chats? | Yes, with space/focus area filter chips |
| Task deleted, chat remains? | Chat stays in space/focus area, `taskId` becomes null |
| "View all chats" toggle? | No - search serves this purpose |
| Pinned chats transcend boundaries? | Yes, shown in all contexts with origin border |
| Focus areas shared across spaces? | No - scoped to their space |
| Templates for focus areas? | No for v1 - revisit when there's functionality to unlock |

---

## Implementation Phases

### Phase A: Focus Areas (Core Feature)

| Step | Description | Files |
|------|-------------|-------|
| A.1 | Create `focus_areas` database table | `focus-areas-schema.sql` |
| A.2 | Add `focus_area_id` to tasks table | `tasks-schema.sql` |
| A.3 | Create focus areas repository | `focus-areas-postgres.ts` |
| A.4 | Create focus areas API endpoints | `api/focus-areas/+server.ts` |
| A.5 | Create focus areas store | `stores/focusAreas.svelte.ts` |
| A.6 | Update context injection | `context-builder.ts`, `system-prompts.ts` |
| A.7 | Create focus area pills UI | `FocusAreaPills.svelte` |
| A.8 | Create focus area modal | `FocusAreaModal.svelte` |
| A.9 | Create context management panel | `ContextPanel.svelte` |
| A.10 | Integrate into space pages | `spaces/[space]/+page.svelte` |

### Phase B: Custom Spaces (Extension)

| Step | Description | Files |
|------|-------------|-------|
| B.1 | Create `spaces` table, seed system spaces | `spaces-schema.sql` |
| B.2 | Migrate `space` → `space_id` in tasks | Migration script |
| B.3 | Create spaces repository | `spaces-postgres.ts` |
| B.4 | Create spaces API endpoints | `api/spaces/+server.ts` |
| B.5 | Create spaces store | `stores/spaces.svelte.ts` |
| B.6 | Update header navigation | `Header.svelte` |
| B.7 | Create space modal | `SpaceModal.svelte` |
| B.8 | Update routing for custom spaces | `spaces/[space]/+page.svelte` |

### Phase C: Chat Context Awareness (Polish)

| Step | Description | Files |
|------|-------------|-------|
| C.1 | Add `space_id`, `focus_area_id`, `task_id` to conversations | Migration |
| C.2 | Update chat store for new fields | `chat.svelte.ts` |
| C.3 | Add border color to ConversationItem | `ConversationItem.svelte` |
| C.4 | Implement sidebar grouped sections | `Sidebar.svelte` |
| C.5 | Implement cross-context navigation | `Sidebar.svelte`, page handlers |
| C.6 | Create "Bring to context" modal | `BringToContextModal.svelte` |
| C.7 | Implement task environment deep work filter | `spaces/[space]/+page.svelte` |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/server/persistence/spaces-schema.sql` | Spaces table |
| `src/lib/server/persistence/focus-areas-schema.sql` | Focus areas table |
| `src/lib/server/persistence/spaces-postgres.ts` | Spaces repository |
| `src/lib/server/persistence/focus-areas-postgres.ts` | Focus areas repository |
| `src/lib/types/spaces.ts` | TypeScript types |
| `src/lib/stores/spaces.svelte.ts` | Spaces state management |
| `src/lib/stores/focusAreas.svelte.ts` | Focus areas state management |
| `src/routes/api/spaces/+server.ts` | Spaces list/create API |
| `src/routes/api/spaces/[id]/+server.ts` | Space CRUD API |
| `src/routes/api/focus-areas/+server.ts` | Focus areas list/create API |
| `src/routes/api/focus-areas/[id]/+server.ts` | Focus area CRUD API |
| `src/lib/components/spaces/FocusAreaPills.svelte` | Focus area tabs |
| `src/lib/components/spaces/FocusAreaModal.svelte` | Create/edit focus area |
| `src/lib/components/spaces/SpaceModal.svelte` | Create/edit custom space |
| `src/lib/components/spaces/ContextPanel.svelte` | View/edit active context |
| `src/lib/components/chat/BringToContextModal.svelte` | Adopt chat prompt |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types/chat.ts` | Add `spaceId`, `focusAreaId`, `taskId` to Conversation |
| `src/lib/types/tasks.ts` | Add `focusAreaId` to Task |
| `src/lib/stores/chat.svelte.ts` | Handle new conversation fields |
| `src/lib/stores/tasks.svelte.ts` | Handle focus area assignment |
| `src/lib/utils/context-builder.ts` | Add space/focus area context injection |
| `src/lib/config/system-prompts.ts` | Update for full context chain |
| `src/lib/components/layout/Header.svelte` | Custom spaces in navigation |
| `src/lib/components/layout/Sidebar.svelte` | Grouped sections, filtering |
| `src/lib/components/layout/ConversationItem.svelte` | Border colors |
| `src/routes/spaces/[space]/+page.svelte` | Focus area integration |
| `src/routes/api/chat/+server.ts` | Inject full context chain |

---

## Success Criteria

### Phase A Complete When:
- [ ] Users can create focus areas within spaces
- [ ] Focus areas have editable context (text + documents)
- [ ] Tasks can be assigned to focus areas
- [ ] Context injection includes space + focus area context
- [ ] Token estimates shown in context panel

### Phase B Complete When:
- [ ] Users can create custom top-level spaces
- [ ] Custom spaces appear in header navigation
- [ ] All existing functionality works with custom spaces
- [ ] Space migration is complete (no more SpaceType references)

### Phase C Complete When:
- [ ] Conversations show space border colors
- [ ] Sidebar groups chats by context
- [ ] Cross-context navigation works per matrix
- [ ] "Bring to context" modal works
- [ ] Task environment shows only task chats

---

## Testing Guide

### Prerequisites

1. Ensure database is running and migrations are applied:
   ```bash
   ./scripts/setup-database.sh --fresh
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Log in as the test user (or create a session)

---

### Phase A: Focus Areas Testing

#### A.1 Create Focus Area
1. Navigate to `/spaces/work`
2. Click the **[+ Focus Area]** button in the focus area pills
3. Enter name: "Automations"
4. Optionally add context text: "This area covers Kubernetes and Terraform automation work"
5. Click **Create**
6. **Expected:** New "Automations" pill appears in the focus area bar

#### A.2 Edit Focus Area Context
1. In Work space, click the **Automations** pill
2. Click the settings/edit icon on the focus area
3. Modify the context text
4. Save changes
5. **Expected:** Context is persisted and shows in context panel

#### A.3 Assign Task to Focus Area
1. Create a new task in Work space
2. In the task details, select "Automations" as the focus area
3. **Expected:** Task appears when Automations is selected, hidden when other focus areas selected

#### A.4 Context Injection Verification
1. Select the "Automations" focus area
2. Start a new chat
3. Ask: "What context do you have about my work?"
4. **Expected:** AI response references both Work space context AND Automations focus area context

---

### Phase B: Custom Spaces Testing

#### B.1 Create Custom Space
1. In the header, click the **[+]** button after the system spaces
2. Enter name: "Acme Client"
3. Select a color (e.g., cyan)
4. Click **Create**
5. **Expected:** "Acme Client" appears in header navigation with the selected color

#### B.2 Navigate to Custom Space
1. Click "Acme Client" in the header
2. **Expected:** URL changes to `/spaces/acme-client`, page loads with custom space theming

#### B.3 Create Focus Area in Custom Space
1. In "Acme Client" space, create a focus area "API Integration"
2. **Expected:** Focus area created successfully, same behavior as system spaces

#### B.4 Edit Custom Space
1. Click the settings icon on "Acme Client"
2. Change the name to "Acme Corp"
3. Change the color
4. Save
5. **Expected:** Header and URL update to reflect changes

#### B.5 Delete Custom Space
1. Try to delete "Acme Corp" while it has conversations
2. **Expected:** Warning shown that content exists
3. Delete all conversations from the space
4. Delete the space
5. **Expected:** Space removed from header, redirected to main

---

### Phase C: Chat Context Awareness Testing

#### C.1 Space Border Colors
1. Go to main chat (`/`)
2. Create a conversation in main (no space)
3. Go to `/spaces/work` and create a conversation
4. Go to `/spaces/research` and create a conversation
5. Return to main chat (`/`)
6. **Expected:**
   - Main conversations have no left border
   - Work conversations have blue left border
   - Research conversations have purple left border

#### C.2 Sidebar Grouped Sections
1. From main chat, verify sidebar shows:
   - **Pinned** section (if any pinned)
   - **Recent** section (main context conversations)
   - **From Spaces** collapsible section (conversations from Work, Research, etc.)
2. Click the "From Spaces" header to expand/collapse
3. **Expected:** Section toggles visibility with smooth animation

#### C.3 Cross-Context Navigation (Main → Space)
1. From main chat, expand "From Spaces" section
2. Click on a Work conversation
3. **Expected:** "Bring to Context" modal appears with options:
   - "Open in Work"
   - "Bring to Main"

#### C.4 "Open in Origin" Action
1. From the modal, click "Open in Work"
2. **Expected:**
   - Navigate to `/spaces/work`
   - Conversation opens in the chat area
   - Conversation remains in Work space

#### C.5 "Bring Here" Action
1. Go back to main chat
2. Click on a Work conversation again
3. Click "Bring to Main"
4. **Expected:**
   - Modal closes
   - Conversation opens
   - Conversation now appears in "Recent" section (moved to main)
   - Toast shows "Moved conversation to Main"

#### C.6 Space View Grouping
1. Navigate to `/spaces/work`
2. Create 2-3 conversations in Work
3. **Expected:** Sidebar shows:
   - **Work Conversations** section with space conversations
   - **From Other Contexts** collapsible with main/research conversations

#### C.7 Deep Work Mode (Task Focus)
1. In Work space, create or select a task
2. Click "Focus" on the task
3. **Expected:**
   - `FocusedTaskWelcome` appears
   - Sidebar shows ONLY conversations linked to this task
   - No "From Other Contexts" section (deep work = zero distractions)

#### C.8 Exit Deep Work Mode
1. While focused on a task, click "Exit Focus" button
2. **Expected:**
   - Returns to normal space view
   - Sidebar shows all space conversations again
   - "From Other Contexts" section returns

#### C.9 Task-Linked Conversation Auto-Creation
1. Focus on a task
2. Start typing a new message
3. **Expected:**
   - New conversation created with `taskId` set to focused task
   - Conversation appears in task's conversation list

#### C.10 Pinned Conversations Across Contexts
1. Pin a conversation from Work space
2. Go to main chat
3. **Expected:** Pinned conversation appears in Pinned section with blue Work border
4. Go to Research space
5. **Expected:** Same pinned conversation visible with Work border

---

### Edge Cases to Test

#### Conversation Context Updates
1. Create conversation in main
2. Move to Work via "Bring Here"
3. Then move to Research via another "Bring Here"
4. **Expected:** Conversation should be in Research only, not duplicated

#### Search Across Contexts
1. Search for a term that exists in conversations across multiple spaces
2. **Expected:** Results show from all spaces with appropriate border colors

#### Empty States
1. Create a new custom space with no conversations
2. **Expected:** Empty state message shown, no errors

#### Focus Area Deletion
1. Create focus area with conversations
2. Delete the focus area
3. **Expected:** Conversations remain but `focusAreaId` is null (moved to "All")

---

### Database Verification Queries

After testing, verify data integrity:

```sql
-- Check conversations have proper context fields
SELECT id, title, space_id, focus_area_id, task_id
FROM conversations
WHERE deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 10;

-- Verify focus areas linked to spaces
SELECT fa.name, s.name as space_name
FROM focus_areas fa
JOIN spaces s ON fa.space_id = s.id
WHERE fa.deleted_at IS NULL;

-- Check tasks in focus areas
SELECT t.title, fa.name as focus_area, s.name as space
FROM tasks t
LEFT JOIN focus_areas fa ON t.focus_area_id = fa.id
LEFT JOIN spaces s ON t.space_id = s.id
WHERE t.deleted_at IS NULL;
```

---

### Performance Testing

1. Create 50+ conversations across different spaces
2. Navigate between spaces rapidly
3. **Expected:** No lag, smooth transitions, sidebar updates instantly

2. Search with common terms
3. **Expected:** Results appear within 500ms

---

### Checklist Summary

**Phase A:**
- [ ] Create focus area in space
- [ ] Edit focus area context
- [ ] Assign task to focus area
- [ ] Context injection works with focus area

**Phase B:**
- [ ] Create custom space
- [ ] Navigate to custom space
- [ ] Focus areas work in custom space
- [ ] Edit custom space name/color
- [ ] Delete custom space (with proper warnings)

**Phase C:**
- [ ] Border colors show space origin
- [ ] Sidebar groups by context
- [ ] "From Spaces/Other Contexts" collapsible works
- [ ] Cross-context click shows modal
- [ ] "Open in Origin" navigates correctly
- [ ] "Bring Here" updates conversation context
- [ ] Deep work mode filters to task only
- [ ] Exit deep work restores full sidebar
- [ ] Pinned conversations visible across contexts
- [ ] New conversations get correct context fields
