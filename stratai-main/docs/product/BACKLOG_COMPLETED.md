# StratAI Completed Work Archive

This file archives completed phases and features from the development backlog.

> **Active Backlog**: See `BACKLOG.md` for current and planned work.

---

## Phase 0.1: POC - LLM Interaction Integrity ✅

**Goal**: Establish a rock-solid foundation for AI interactions

**Completed**:
- Core chat functionality with streaming
- Multi-model support via LiteLLM (27 models, 7 providers)
- Token counting with js-tiktoken
- System prompt caching (Anthropic)
- Extended thinking (Claude) / Reasoning effort (OpenAI)
- Model capability detection
- Document export (Markdown, DOCX, PDF)
- Model Arena with AI judging
- Frontend branding (StratHost → StratAI)
- AWS Bedrock integration (5 models)
- Google Gemini integration (3 models)

---

## Phase 0.2: Persistence & History ✅

**Goal**: Users never lose their work

**Database Integration**:
- PostgreSQL setup (local PostgreSQL 18)
- PostgreSQL adapter for existing repository interfaces
- Migration from in-memory to persistent storage (hybrid: localStorage cache + PostgreSQL source of truth)

**Chat History**:
- Conversation list sidebar (Sidebar.svelte with pinned/recent sections)
- Auto-generated chat titles (from first user message)
- Search across conversations (local search in sidebar)
- Delete/archive conversations (soft delete with deleted_at)

**Data Management**:
- Export conversations (JSON via exportConversation)
- Import conversations (JSON via importConversation)

**Arena Persistence**:
- Arena battles table with full response content
- Model rankings with Elo ratings (K=32, start 1500)
- API sync for battles, votes, judgments

---

## Phase 0.3a: Space Navigation Foundation ✅

**Goal**: Establish space infrastructure with embedded chat

**Database**:
- `space` column exists in `conversations` table
- `tags` column added for future project tagging
- Indexes for space and tags queries

**Routes & Navigation**:
- `/spaces` route (space selector dashboard)
- `/spaces/work` route with embedded chat
- `/spaces/research` route with embedded chat
- Space switcher in header
- Dynamic `[space]` route handling

**Visual Differentiation**:
- Space-specific accent colors (Work=blue, Research=purple)
- Premium SVG icons (SpaceIcon component)
- Space-aware welcome screens with tailored copy
- CSS custom properties for theming

**Embedded Chat**:
- Full chat functionality within each space
- Conversations tagged with space on creation
- Space-aware sidebar (shows only space conversations)
- Active conversation cleared when entering different space
- Space-specific system prompt additions (defined, ready to wire)

---

## Phase 0.3b: Assists Framework ✅

**Goal**: Build "Help me with..." productivity assists

**Assists Architecture**:
- `Assist` interface with phases (collecting, confirming, prioritizing, focused)
- `AssistState` with task tracking and phase management
- Assist registry with space filtering (`src/lib/config/assists.ts`)
- Phase-specific system prompt injection

**Assists UI Components**:
- `AssistDropdown.svelte` - "Help me with..." dropdown in header
- `WorkingPanel.svelte` - Right-side panel for structured output
- Task list with confirm/edit/add/remove capabilities
- Phase-aware UI (different messaging per phase)

**First Assist: "What's on your plate?" (Task Breakdown)**:
- Simplified extraction-focused system prompt
- Task extraction from AI responses (`src/lib/utils/task-extraction.ts`)
- User confirms task list in WorkingPanel
- Priority check after confirmation
- Task-focused conversations (click task to dive in)

**Visual Mode Shift**:
- Sidebar hides when assist active
- Amber glow on chat input
- Subtle background tint
- WorkingPanel slides in from right

---

## Phase 0.3c: Task Lifecycle Foundation ✅

**Goal**: Make "What's on your plate?" a daily-use productivity tool

**Database Schema**:
- `tasks` table with full schema (id, user_id, space, title, description, status, priority, due_date, due_date_type, color, source fields, timestamps)
- Indexes for user, status, due_date, space
- Migration script (`tasks-schema.sql`)

**Task Persistence**:
- API endpoints: GET/POST `/api/tasks`, PATCH/DELETE `/api/tasks/[id]`, POST `/api/tasks/[id]/complete`
- Task repository with PostgreSQL adapter (`tasks-postgres.ts`)
- Task store with reactivity (`tasks.svelte.ts`)
- Load tasks on space entry

**Intelligent Greeting**:
- Detect returning user (has existing tasks)
- AI-generated greeting message (via `generateGreeting` utility)
- Task summary in greeting (count, priority, due dates)
- Action buttons: [Focus on priority] [Review all] [Something else]
- Greeting is ephemeral (not persisted)

**Header Components**:
- `TaskBadge` - Shows pending task count, click opens TaskPanel
- `FocusIndicator` - Shows focused task name with dropdown actions

**Focus Mode**:
- Header indicator when focused: `🎯 [Task name] ▼`
- Dropdown actions: Mark done, Add note, Switch task, Exit focus
- Task color theming via CSS variable `--task-accent`
- Smooth color transitions
- Focus context in system prompt (AI knows current task)

**Task Color System**:
- 8-color palette (Indigo, Teal, Amber, Rose, Violet, Emerald, Cyan, Orange)
- Color assigned on task creation (rotating)
- When focused: header border, input ring, background tint

**Due Dates**:
- Optional due date with hard/soft type
- Subtle display (not anxiety-inducing)
- Overdue indicator (visual, not aggressive)

**TaskPanel CRUD**:
- Full task list with inline edit
- Complete with optional notes
- Edit title, due date, priority
- Delete with confirmation
- Add new task (manual entry)

---

## Phase 0.3c+: Enhanced Focus Mode Experience ✅

**Goal**: Transform focus mode into a complete context shift

**FocusedTaskWelcome Component**:
- `FocusedTaskWelcome.svelte` replaces WelcomeScreen when task is focused
- Task header with title in task color, priority badge, due date
- Guidance cards with example prompts for new tasks
- "Edit" button opens TaskPanel, "×" exits focus mode
- Non-anxious due date display (overdue/due soon indicators)

**Space Page Integration**:
- Conditional rendering: chat → focused-welcome → greeting → welcome
- FocusedTaskWelcome shows when task focused + no messages

**Task-Conversation Linking**:
- `linked_conversation_ids` column in tasks table (TEXT[])
- Repository methods: `linkConversation`, `unlinkConversation`, `getTaskByConversation`
- API endpoint: POST/DELETE `/api/tasks/[id]/link`
- Store methods: `linkConversation`, `unlinkConversation`, `getTaskForConversation`

**Auto-Link Behavior**:
- First message while focused on task auto-links conversation
- Only links if conversation not already linked to another task
- Subtle toast notification: "Linked to [task name]"

**Sidebar Task Pill**:
- Task pill shows on conversations linked to tasks
- Pill styled with task color (background + text)
- Click pill focuses that task
- Truncated task title with hover for full name

---

## Phase 0.3d++: Subtasks & Plan Mode ✅

**Goal**: Transform tasks into structured collaborations with guided breakdown

**Database Schema**:
- `parent_task_id` column for subtask hierarchy (one level max)
- `subtask_type` column ('conversation' | 'action')
- `subtask_order` column for ordering
- `context_summary` column for inherited context
- Index on parent_task_id for efficient queries

**Subtask Types**:
- `SubtaskType` = 'conversation' | 'action'
- `CreateSubtaskInput` interface
- `PlanModeState` interface (taskId, taskTitle, phase, proposedSubtasks)
- `ProposedSubtask` interface (id, title, type, confirmed)

**Repository & API**:
- `getSubtasks(parentId)` - List subtasks for a parent task
- `createSubtask(input)` - Create subtask under parent
- `canHaveSubtasks(taskId)` - Enforce one-level hierarchy
- `getSubtaskCount(taskId)` - Count subtasks
- API endpoints: GET/POST `/api/tasks/[id]/subtasks`

**Store Integration**:
- `expandedTasks` state for expand/collapse UI
- `planMode` state for Plan Mode workflow
- Subtask methods: `createSubtask`, `getSubtasksForTask`, `hasSubtasks`
- Plan Mode methods: `startPlanMode`, `exitPlanMode`, `setPlanModePhase`
- Proposed subtask management: `setProposedSubtasks`, `toggleProposedSubtask`, etc.
- `createSubtasksFromPlanMode()` - Bulk create confirmed subtasks

**TaskPanel Subtask Display**:
- Parent tasks shown in main list (subtasks hidden)
- Expand/collapse chevron on tasks with subtasks
- Subtask count badge showing completed/total
- Subtask list with indent when expanded
- Inline subtask creation form
- "Subtask" button in task actions

**Plan Mode Foundation**:
- "Help me plan this" button on FocusedTaskWelcome
- Plan Mode system prompts per phase (eliciting, proposing, confirming)
- Chat API wired to use Plan Mode prompts when active
- Progressive elicitation: AI asks 3-5 clarifying questions

**Plan Mode UI**:
- `PlanModePanel.svelte` component (slides in from right)
- Shows proposed subtasks with checkboxes
- Edit/toggle/remove individual subtasks
- Add custom subtasks
- "Create Subtasks" button for bulk creation

**Subtask Extraction**:
- `subtask-extraction.ts` utility
- `contentContainsProposal()` - Detect when AI proposes subtasks
- `extractProposedSubtasks()` - Parse numbered list into subtasks
- Auto-transition to confirming phase when proposal detected

---

## Phase 0.3e (Partial): Task Dashboard ✅

**Task Dashboard** - `/spaces/[space]/tasks`:
- `TaskDashboard.svelte` - main dashboard with time-based task grouping
- Task groups: Needs Attention, Today, This Week, Later, Anytime
- `TaskGroupSection.svelte` - reusable section with "Show More" pattern (max 5 visible)
- `TaskCard.svelte` - task display with subtask progress, area badges, due dates
- `StatsRow.svelte` - completion streak and daily stats
- `FocusSuggestion.svelte` - suggests what to work on based on priority/overdue

**Recently Completed**:
- `RecentlyCompletedSection.svelte` - shows today's completions
- Expand to show this month's completions
- Reopen action to restore completed tasks

**Stale Task Detection**:
- Track `lastActivityAt` on tasks
- Define stale threshold (7 days no activity)
- `stale_dismissed_at` column for dismissing stale warnings
- Migration `008-task-stale-dismissed.sql`
- Surface stale/overdue in "Needs Attention" group
- Due date passed = overdue (hard deadlines)

**Reopen Task**:
- API endpoint `/api/tasks/[id]/reopen`
- `reopenTask()` method in store

---

## Model Arena (Current Features) ✅

- Multi-model comparison (2-4 models)
- AI-powered judging
- User voting
- Battle history
- Category selection (general, coding, reasoning, creative, analysis)
- AI Judge category detection (suggests category when "general" selected)
- Space/Area context injection (add context to Arena prompts)
- Continue Conversation flow (continue battle with chosen model)

---

## Diagram Libraries System ✅

- Library picker panel with categories (Cloud, Development, Design, General)
- Server-side proxy to avoid CORS (`/api/diagrams/library/[...source]`)
- Support for v1 and v2 library formats
- Library loading into Excalidraw editor
- Loading states and success indicators

---

## Pages Editor UX (Completed Items) ✅

**P0: Toolbar Reactivity** - Fixed toolbar buttons not updating when cursor moves
- Added `onTransaction` callback to editor initialization
- Created reactive `editorTick` counter
- Updated all `isActive()` checks to be reactive

**P2: Character Count** - Added character count display
- Character count derived state
- Displayed in footer alongside word count

---

## Model Pricing Sync (Phase 1) ✅

- Sync script created: `scripts/sync-model-pricing.ts`
- 17 prices verified against LiteLLM database
- 12 prices verified against provider official sources (OpenAI, Google, Anthropic)
- 7 Bedrock models flagged for AWS Console verification
- Tiered verification system (LiteLLM → Provider → Bedrock)
- Run `npx tsx scripts/sync-model-pricing.ts` to check prices

---

## Technical Improvements (Completed) ✅

**System Prompt Caching**: Phase 1 complete
- System prompt caching working

**Token Management**:
- Accurate counting with js-tiktoken
- Context window percentage display

**Theme Support**:
- Dark/light/system theme complete

---

*Archived: January 22, 2026*
