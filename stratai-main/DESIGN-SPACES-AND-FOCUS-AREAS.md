# Spaces, Areas & Chat Context Awareness - Unified Design

> **Status:** Updated - Ready for Implementation
> **Date:** 2026-01-01
> **Supersedes:** Previous Focus Areas design

---

## Executive Summary

This document defines the complete design for:
1. **Areas** - Navigable sub-spaces within spaces (renamed from Focus Areas)
2. **Custom Spaces** - User-defined top-level spaces
3. **Chat Context Awareness** - Smart sidebar filtering and navigation
4. **Task-Area Linking** - Context injection from linked areas

### Key Changes from Previous Design

| Aspect | Previous | Current |
|--------|----------|---------|
| Naming | "Focus Areas" | **"Areas"** |
| Default area | None | **"General" (auto-created, undeletable)** |
| Space-level chats | Exist | **Don't exist → belong to Areas** |
| Space Dashboard | Has chat | **Navigation hub only (no chat)** |
| Area navigation | Filter pills | **Navigable destinations (cards)** |
| "All" pill | Shows all in space | **Removed - dashboard IS "all"** |
| Pinned chats | Show everywhere | **Show in origin context only** |
| Task chat ownership | Ambiguous | **Belongs to task** |
| Task context | Unclear | **Can link an Area for context** |
| Exit task focus | Return to area | **Return to Space Dashboard** |

---

## Core Concepts

### Spaces
Top-level organizational containers representing mindsets/contexts.
- **System spaces:** Work, Research, Random, Personal (fixed, always present)
- **Custom spaces:** User-created (e.g., "Acme Client", "Side Project X")

### Areas (formerly Focus Areas)
Navigable sub-spaces within a space. Areas are **destinations**, not filters.
- Every space has at least a "General" area (auto-created, cannot be deleted)
- Users navigate **into** an area to chat
- Example: Work > General, Work > Automations, Work > CI/CD

### General Area
The default area in each space:
- Auto-created when space is created
- Cannot be deleted or renamed
- First card on Space Dashboard
- Orphan conversations (space-level) migrate here
- "Start a Chat" from dashboard → General area

### Context Inheritance
```
Platform Base Prompt
    └── Space Context (Work)
            └── Area Context (Automations)
                    └── Task Context (Deploy service)
                            └── Conversation
```

Each level adds context, creating efficient token usage (only inject what's relevant).

### Tasks
Tasks are **independent entities** that may reference an Area:
- Tasks live independently (not owned by Areas)
- Tasks CAN optionally link an Area for context injection
- Task chats belong to the task itself
- Tasks can be discovered from Areas (if linked)
- Exit task focus → Space Dashboard (safe landing)

---

## Navigation Hierarchy

```
/ (Home)
  └── /spaces/{space} (Space Dashboard - navigation hub, NO chat)
        └── /spaces/{space}/{area} (Area - HAS chat)
        └── Task Focus Mode (independent, exits to Dashboard)
```

### URL Examples
- `/spaces/work` → Work Dashboard
- `/spaces/work/general` → Work > General Area (chat)
- `/spaces/work/automations` → Work > Automations Area (chat)

---

## Data Model

### Spaces Table
```sql
CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'custom')),
  slug TEXT NOT NULL,                -- URL-safe identifier
  context TEXT,                      -- Space-level context (markdown)
  context_document_ids TEXT[],       -- Linked documents for context
  color TEXT NOT NULL,               -- Accent color (hex)
  icon TEXT,                         -- Optional icon identifier
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Seed system spaces (run once)
INSERT INTO spaces (id, user_id, name, type, slug, color) VALUES
  ('work', 'system', 'Work', 'system', 'work', '#3b82f6'),
  ('research', 'system', 'Research', 'system', 'research', '#a855f7'),
  ('random', 'system', 'Random', 'system', 'random', '#f97316'),
  ('personal', 'system', 'Personal', 'system', 'personal', '#22c55e');

CREATE UNIQUE INDEX idx_spaces_user_slug ON spaces(user_id, slug) WHERE deleted_at IS NULL;
```

### Areas Table (renamed from focus_areas)
```sql
CREATE TABLE areas (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,                -- URL-safe identifier
  is_general BOOLEAN DEFAULT false,  -- True for General area (undeletable)
  context TEXT,                      -- Additional context (markdown)
  context_document_ids TEXT[],       -- Linked documents for context
  color TEXT,                        -- Optional override color
  icon TEXT,                         -- Optional icon
  order_index INTEGER DEFAULT 0,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(space_id, slug, user_id)
);

CREATE INDEX idx_areas_space ON areas(space_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_areas_user ON areas(user_id) WHERE deleted_at IS NULL;
```

### Updated Tasks Table
```sql
-- Add linked_area_id column for task-area context linking
ALTER TABLE tasks ADD COLUMN linked_area_id TEXT REFERENCES areas(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_linked_area ON tasks(linked_area_id) WHERE deleted_at IS NULL;
```

### Updated Conversations Table
```sql
-- Conversations belong to Areas (not Spaces directly)
-- space_id is deprecated - derive from area_id

ALTER TABLE conversations ADD COLUMN area_id TEXT REFERENCES areas(id) ON DELETE SET NULL;
-- task_id already exists for task-linked conversations

CREATE INDEX idx_conversations_area ON conversations(area_id);
```

### Migration Script
```sql
-- 1. Rename focus_areas to areas
ALTER TABLE focus_areas RENAME TO areas;

-- 2. Add new columns
ALTER TABLE areas ADD COLUMN slug TEXT;
ALTER TABLE areas ADD COLUMN is_general BOOLEAN DEFAULT false;

-- 3. Generate slugs from names
UPDATE areas SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'));

-- 4. Create General areas for each space
INSERT INTO areas (id, space_id, name, slug, is_general, order_index, user_id)
SELECT
  s.id || '-general',
  s.id,
  'General',
  'general',
  true,
  0,
  s.user_id
FROM spaces s
WHERE NOT EXISTS (
  SELECT 1 FROM areas a WHERE a.space_id = s.id AND a.is_general = true
);

-- 5. Move orphan conversations to General
UPDATE conversations c
SET area_id = (
  SELECT a.id FROM areas a
  WHERE a.space_id = c.space_id AND a.is_general = true
)
WHERE c.space_id IS NOT NULL
  AND c.area_id IS NULL
  AND c.task_id IS NULL;

-- 6. Add linked_area_id to tasks
ALTER TABLE tasks ADD COLUMN linked_area_id TEXT REFERENCES areas(id) ON DELETE SET NULL;
```

### TypeScript Types

```typescript
// src/lib/types/areas.ts (renamed from focus-areas.ts)

export interface Area {
  id: string;
  spaceId: string;
  name: string;
  slug: string;
  isGeneral: boolean;
  context?: string;
  contextDocumentIds?: string[];
  color?: string;
  icon?: string;
  orderIndex: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAreaInput {
  spaceId: string;
  name: string;
  context?: string;
  contextDocumentIds?: string[];
  color?: string;
}

export interface UpdateAreaInput {
  name?: string;
  context?: string;
  contextDocumentIds?: string[];
  color?: string;
  icon?: string;
  orderIndex?: number;
}
```

```typescript
// Updated src/lib/types/tasks.ts

export interface Task {
  // ... existing fields ...
  linkedAreaId?: string | null;  // NEW: Optional area for context
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

  // Context linking (updated)
  areaId?: string | null;       // Which area (replaces spaceId + focusAreaId)
  taskId?: string | null;       // Which task (for task conversations)
}
```

---

## UI Design

### Space Dashboard (Navigation Hub)

The Space Dashboard is a **navigation hub** with no chat. Users choose an Area to enter.

```
┌─────────────────────────────────────────────────────────────────┐
│ WORK                                               [⚙️ Settings] │
│ Your productivity home for work-related conversations          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ 📋 General       │  │ ⚙️ Automations   │  │ 🚀 CI/CD     │  │
│  │ 3 conversations  │  │ 5 conversations  │  │ 2 convs      │  │
│  │ ↳ Last: 5m ago   │  │ ↳ Last: 2h ago   │  │ ↳ Last: 1d   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                 │
│  ┌──────────────────┐                                          │
│  │ + New Area       │                                          │
│  └──────────────────┘                                          │
│                                                                 │
│  ─────────────────── Recent Activity ──────────────────────────│
│                                                                 │
│  💬 Recent Chats                                   [View all →] │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ K8s deployment planning       (Automations)   5 min ago    ││
│  │ Q1 Budget discussion          (General)       2 hours ago  ││
│  │ Task: Deploy new service                      Yesterday    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  📋 Active Tasks                                   [View all →] │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • Deploy new service          (Automations)   In Progress  ││
│  │ • Fix CI pipeline             (CI/CD)         Todo         ││
│  │ • Review Q1 planning          (General)       Todo         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Dashboard UX Principles:**
- **Where am I?**: Clear space header with name and description
- **What can I do?**: Area cards are primary action (prominent)
- **Continue from where I left off**: Recent activity section below
- **Clean hierarchy**: Areas first, then recent activity, then tasks
- **No cognitive overload**: Limited items shown (3-5), "View all" for more

### Area Page (Chat Experience)

Clicking an Area card navigates to the Area page with full chat.

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Work]  AUTOMATIONS                              [⚙️ Settings] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Sidebar]              │  [Chat Area]                          │
│                         │                                       │
│  AUTOMATIONS            │  Welcome to Automations!              │
│    K8s deployment...    │  This area is for...                  │
│    Terraform refactor   │                                       │
│                         │  [Chat input]                         │
│  ─────────────────────  │                                       │
│  📁 OTHER AREAS    ▼    │                                       │
│    CI/CD: Pipeline...   │                                       │
│    General: Budget...   │                                       │
│                         │                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Area Page Features:**
- [← Work] badge returns to Space Dashboard
- Full chat experience within area
- Area context injected into prompts
- Sidebar shows area's conversations
- "From other areas" collapsible section
- Task conversations visible if task links this area

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

### Task Focus Mode (Serene, Isolated)

Task focus provides a distraction-free environment.

```
┌─────────────────────────────────────────────────────────────────┐
│ TASK: Deploy new service                       [✓ Done] [← Exit]│
│ (Automations)                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Sidebar - TASK ONLY]  │  [Chat Area]                          │
│                         │                                       │
│  TASK CONVERSATIONS     │  Planning the deployment...           │
│    Plan Mode: Breaking  │                                       │
│    Follow-up: Deps...   │                                       │
│                         │                                       │
│  (NO other contexts)    │  [Chat input]                         │
│  (Deep work mode)       │                                       │
│                         │                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Task Focus Features:**
- Full isolation (serene, no other contexts)
- No "from other contexts" section
- Shows linked Area badge (if any)
- **Exit → Space Dashboard** (safe landing)
- If task links Area → Area context injected

---

## Sidebar Filtering by Context

### Area View (in /spaces/{space}/{area})
```
┌─────────────────────────────────────┐
│ [← Work] AUTOMATIONS                │
├─────────────────────────────────────┤
│ 📌 PINNED (in Automations only)     │
│   K8s best practices                │
├─────────────────────────────────────┤
│ AUTOMATIONS CONVERSATIONS           │
│   K8s deployment planning           │
│   Terraform refactor                │
│   Task: Deploy service              │
├─────────────────────────────────────┤
│ 📁 OTHER AREAS                 ▼    │
│   CI/CD: Pipeline optimization      │
│   General: Budget discussion        │
└─────────────────────────────────────┘
```

**Key Changes:**
- **Pinned chats**: Only show in origin context (not everywhere)
- **Task chats**: Visible if task links to this area
- **Other areas**: Collapsible section for cross-navigation

### Task Focus View
```
┌─────────────────────────────────────┐
│ TASK: Deploy new service            │
├─────────────────────────────────────┤
│ TASK CONVERSATIONS                  │
│   Plan Mode: Breaking down...       │
│   Follow-up: Dependencies...        │
│                                     │
│ (NO other contexts shown)           │
│ (Deep work = zero distractions)     │
└─────────────────────────────────────┘
```

---

## Task-Area Linking

### How It Works

Tasks can optionally link an Area for context injection:

```
Task: "Deploy new service"
  └── Linked Area: "Automations"
        └── Injects: Automations context + documents
```

### Implementation

```typescript
// In context-builder.ts
async function buildTaskContext(task: Task): Promise<ContextChain> {
  const linkedArea = task.linkedAreaId
    ? await getArea(task.linkedAreaId)
    : null;
  const space = linkedArea
    ? await getSpace(linkedArea.spaceId)
    : (task.spaceId ? await getSpace(task.spaceId) : null);

  return {
    space: space ? await getSpaceContext(space) : null,
    area: linkedArea ? await getAreaContext(linkedArea) : null,
    task: await getTaskContext(task),
  };
}
```

### UI Integration

| Location | Change |
|----------|--------|
| Task detail panel | Show linked Area badge |
| AddContextModal | Add "Link an Area" option |
| Area sidebar | Show tasks that link to this Area |
| Task focus header | Show task title + linked Area badge |
| Context chain display | Platform → Space → Area → Task |

---

## Limits & Constraints

| Entity | Limit | Rationale |
|--------|-------|-----------|
| Custom spaces per user | 5 | Prevent sprawl |
| Areas per space | 10 | Keep navigation manageable |
| Space context size | ~5k tokens | Token budget |
| Area context size | ~10k tokens | Token budget |
| Documents per area | 10 | Storage/performance |

---

## Deletion Behavior

### Deleting an Area
- **Cannot delete General area** (protected)
- Tasks linked to area → `linked_area_id` set to NULL
- Conversations in area → `area_id` set to NULL (move to General?)
- Confirmation: "X conversations will be moved to General"

### Deleting a Custom Space
- Prevented if space has areas with content
- User must first move/delete content
- Or: Soft delete, content becomes inaccessible but preserved

### Task Deleted, Chat Remains
- Conversation's `task_id` set to NULL
- Chat moves to area (if any) or General
- No longer appears in task environment

---

## Implementation Phases

### Phase 1: Rename Focus Areas → Areas

| Step | Description | Files |
|------|-------------|-------|
| 1.1 | Rename types | `focus-areas.ts` → `areas.ts` |
| 1.2 | Rename store | `focusAreas.svelte.ts` → `areas.svelte.ts` |
| 1.3 | Rename repository | `focus-areas-postgres.ts` → `areas-postgres.ts` |
| 1.4 | Rename API routes | `api/focus-areas/` → `api/areas/` |
| 1.5 | Rename components | `focus-areas/` → `areas/` |
| 1.6 | Update all imports | Throughout codebase |

### Phase 2: General Area Infrastructure

| Step | Description |
|------|-------------|
| 2.1 | Add `is_general` and `slug` columns to areas |
| 2.2 | Create General areas for system spaces |
| 2.3 | Protect General from deletion (API + UI) |
| 2.4 | Auto-create General on space creation |

### Phase 3: Space Dashboard Redesign

| Step | Description |
|------|-------------|
| 3.1 | Create `SpaceDashboard.svelte` component |
| 3.2 | Create `AreaCard.svelte` component |
| 3.3 | Create `RecentChatsSection.svelte` |
| 3.4 | Create `ActiveTasksSection.svelte` |
| 3.5 | Convert `/spaces/[space]/+page.svelte` to dashboard |

### Phase 4: Area Page Creation

| Step | Description |
|------|-------------|
| 4.1 | Create `/spaces/[space]/[area]/+page.svelte` |
| 4.2 | Move chat experience to area page |
| 4.3 | Add space badge navigation |
| 4.4 | Wire up area context injection |

### Phase 5: Conversation Migration

| Step | Description |
|------|-------------|
| 5.1 | Run migration script |
| 5.2 | Move orphan conversations to General |
| 5.3 | Verify data integrity |

### Phase 6: Chat Filtering Refactor

| Step | Description |
|------|-------------|
| 6.1 | Update `groupedConversations` in chat store |
| 6.2 | Make pinned chats origin-only |
| 6.3 | Add task visibility in areas |
| 6.4 | Implement "From other areas" collapsible |

### Phase 7: Task Integration

| Step | Description |
|------|-------------|
| 7.1 | Add `linked_area_id` to tasks |
| 7.2 | Update `AddContextModal` with Area option |
| 7.3 | Update context injection to include Area |
| 7.4 | Show linked Area in task UI |
| 7.5 | Update exit behavior → Dashboard |

---

## Success Criteria

### Phase Complete When:
- [ ] "Focus Areas" renamed to "Areas" throughout
- [ ] General Area exists for all spaces
- [ ] Space Dashboard shows Area cards + recent activity
- [ ] Clicking Area card navigates to Area page
- [ ] Area page has full chat experience
- [ ] Pinned chats show in origin context only
- [ ] Tasks can link an Area for context
- [ ] Task focus exits to Space Dashboard
- [ ] **User always knows where they are and what to do next**

---

## Testing Checklist

### Space Dashboard
- [ ] Dashboard shows clear space header
- [ ] Area cards are prominent (General first)
- [ ] Recent Chats shows from ALL areas
- [ ] Active Tasks shows from this space
- [ ] Click chat → navigates to Area + opens chat
- [ ] Click task → opens task focus mode

### Navigation
- [ ] Click Area card → `/spaces/{space}/{area}`
- [ ] Click Space badge → Space Dashboard
- [ ] URL reflects location accurately

### General Area
- [ ] Auto-created for new spaces
- [ ] Cannot be deleted
- [ ] Shows as first card
- [ ] Orphans migrated here

### Chat Filtering
- [ ] Area shows only its conversations
- [ ] Pinned in origin only
- [ ] Task chats visible if linked
- [ ] "From other areas" works

### Task-Area Linking
- [ ] Task can link an Area
- [ ] Linked Area context injected
- [ ] Task visible in Area sidebar
- [ ] Area badge on task detail

### Task Focus
- [ ] Full isolation (serene)
- [ ] No other contexts
- [ ] Exit → Space Dashboard
- [ ] Area context injected if linked
