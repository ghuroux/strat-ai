# StratAI Development Backlog

This file tracks planned features and improvements, aligned with the product vision.

> **Vision Reference**: See `VISION-WORK-OS.md` for the full Work Operating System vision.
> **Spaces Design**: See `PHASE-0.3-SPACES-DESIGN.md` for Phase 0.3 implementation details.

---

## Phase 0.1: POC - LLM Interaction Integrity (COMPLETE)

**Goal**: Establish a rock-solid foundation for AI interactions ✅

### Completed
- [x] Core chat functionality with streaming
- [x] Multi-model support via LiteLLM (27 models, 7 providers)
- [x] Token counting with js-tiktoken
- [x] System prompt caching (Anthropic)
- [x] Extended thinking (Claude) / Reasoning effort (OpenAI)
- [x] Model capability detection
- [x] Document export (Markdown, DOCX, PDF)
- [x] Model Arena with AI judging
- [x] Frontend branding (StratHost → StratAI)
- [x] AWS Bedrock integration (5 models)
- [x] Google Gemini integration (3 models)

### Deferred to Later
- [ ] Backend branding (localStorage keys use strathost- prefix)
- [ ] Performance baseline measurement
- [ ] Error boundary implementation

---

## Phase 0.2: Persistence & History (COMPLETE)

**Goal**: Users never lose their work ✅

### Database Integration
- [x] PostgreSQL setup (local PostgreSQL 18)
- [x] Implement PostgreSQL adapter for existing repository interfaces
- [x] Migration from in-memory to persistent storage (hybrid: localStorage cache + PostgreSQL source of truth)

### Chat History
- [x] Conversation list sidebar (Sidebar.svelte with pinned/recent sections)
- [x] Auto-generated chat titles (from first user message)
- [x] Search across conversations (local search in sidebar)
- [x] Delete/archive conversations (soft delete with deleted_at)

### Data Management
- [x] Export conversations (JSON via exportConversation)
- [x] Import conversations (JSON via importConversation)
- [ ] Storage usage indicators (deferred - nice-to-have)

### Bonus: Arena Persistence
- [x] Arena battles table with full response content
- [x] Model rankings with Elo ratings (K=32, start 1500)
- [x] API sync for battles, votes, judgments

---

## Phase 0.3: Spaces & Templates (NEXT)

**Goal**: Reduce cognitive load, fast-track productivity through invisible prompt engineering

> **Design Reference**: See `PHASE-0.3-SPACES-DESIGN.md` for complete vision, philosophy, and technical details.

**Core Insight**: Templates are not shortcuts—they're invisible prompt engineering that makes AI novices into power users. Spaces are not folders—they're productivity environments with accumulated context.

This phase is broken into 7 sub-phases to ensure quality and allow course-correction.

---

### Phase 0.3a: Space Navigation Foundation (COMPLETE)
**Goal**: Establish space infrastructure with embedded chat ✅

**Database**:
- [x] `space` column exists in `conversations` table
- [x] `tags` column added for future project tagging
- [x] Indexes for space and tags queries

**Routes & Navigation**:
- [x] `/spaces` route (space selector dashboard)
- [x] `/spaces/work` route with embedded chat
- [x] `/spaces/research` route with embedded chat
- [x] Space switcher in header
- [x] Dynamic `[space]` route handling

**Visual Differentiation**:
- [x] Space-specific accent colors (Work=blue, Research=purple)
- [x] Premium SVG icons (SpaceIcon component)
- [x] Space-aware welcome screens with tailored copy
- [x] CSS custom properties for theming

**Embedded Chat**:
- [x] Full chat functionality within each space
- [x] Conversations tagged with space on creation
- [x] Space-aware sidebar (shows only space conversations)
- [x] Active conversation cleared when entering different space
- [x] Space-specific system prompt additions (defined, ready to wire)

**Depends on**: Phase 0.2 (PostgreSQL)

---

### Phase 0.3b: Assists Framework (COMPLETE)
**Goal**: Build "Help me with..." productivity assists ✅

> **Design Reference**: See `.claude/plans/replicated-brewing-flask.md` for full Assists design.

**Core Insight**: Instead of template pickers, use focused "Assist" modes that guide users through specific tasks with a phased UX flow.

**Assists Architecture**:
- [x] `Assist` interface with phases (collecting, confirming, prioritizing, focused)
- [x] `AssistState` with task tracking and phase management
- [x] Assist registry with space filtering (`src/lib/config/assists.ts`)
- [x] Phase-specific system prompt injection

**Assists UI Components**:
- [x] `AssistDropdown.svelte` - "Help me with..." dropdown in header
- [x] `WorkingPanel.svelte` - Right-side panel for structured output
- [x] Task list with confirm/edit/add/remove capabilities
- [x] Phase-aware UI (different messaging per phase)

**First Assist: "What's on your plate?" (Task Breakdown)**:
- [x] Simplified extraction-focused system prompt
- [x] Task extraction from AI responses (`src/lib/utils/task-extraction.ts`)
- [x] User confirms task list in WorkingPanel
- [x] Priority check after confirmation
- [x] Task-focused conversations (click task to dive in)

**UX Flow**:
```
Brain dump → AI extracts tasks → Confirm in WorkingPanel → Priority check → Click task to focus
```

**Visual Mode Shift**:
- [x] Sidebar hides when assist active
- [x] Amber glow on chat input
- [x] Subtle background tint
- [x] WorkingPanel slides in from right

**Success Criteria**:
- ✅ "Help me with..." dropdown works
- ✅ Task breakdown extracts and displays tasks
- ✅ Users confirm tasks before proceeding
- ✅ Task-specific conversations are scoped
- ✅ Architecture extensible for more assists

**Depends on**: Phase 0.3a

---

### Phase 0.3c: Task Lifecycle Foundation (COMPLETE)
**Goal**: Make "What's on your plate?" a daily-use productivity tool ✅

> **Core Insight**: The task assist is the CENTRAL HUB of the productivity OS. All other assists (Meeting Summary, Email Draft, etc.) will feed into or pull from the task list.

**Database Schema** ✅:
- [x] `tasks` table with full schema (id, user_id, space, title, description, status, priority, due_date, due_date_type, color, source fields, timestamps)
- [x] Indexes for user, status, due_date, space
- [x] Migration script (`tasks-schema.sql`)

**Task Persistence** ✅:
- [x] API endpoints: GET/POST `/api/tasks`, PATCH/DELETE `/api/tasks/[id]`, POST `/api/tasks/[id]/complete`
- [x] Task repository with PostgreSQL adapter (`tasks-postgres.ts`)
- [x] Task store with reactivity (`tasks.svelte.ts`)
- [x] Load tasks on space entry

**Intelligent Greeting** ✅:
- [x] Detect returning user (has existing tasks)
- [x] AI-generated greeting message (via `generateGreeting` utility)
- [x] Task summary in greeting (count, priority, due dates)
- [x] Action buttons: [Focus on priority] [Review all] [Something else]
- [x] Greeting is ephemeral (not persisted)

**Header Components** ✅:
- [x] `TaskBadge` - Shows pending task count, click opens TaskPanel
- [x] `FocusIndicator` - Shows focused task name with dropdown actions

**Focus Mode** ✅:
- [x] Header indicator when focused: `🎯 [Task name] ▼`
- [x] Dropdown actions: Mark done, Add note, Switch task, Exit focus
- [x] Task color theming via CSS variable `--task-accent`
- [x] Smooth color transitions
- [x] Focus context in system prompt (AI knows current task)

**Task Color System** ✅:
- [x] 8-color palette (Indigo, Teal, Amber, Rose, Violet, Emerald, Cyan, Orange)
- [x] Color assigned on task creation (rotating)
- [x] When focused: header border, input ring, background tint

**Due Dates** ✅:
- [x] Optional due date with hard/soft type
- [x] Subtle display (not anxiety-inducing)
- [x] Overdue indicator (visual, not aggressive)

**TaskPanel CRUD** ✅:
- [x] Full task list with inline edit
- [x] Complete with optional notes
- [x] Edit title, due date, priority
- [x] Delete with confirmation
- [x] Add new task (manual entry)

**Depends on**: Phase 0.3b

---

### Phase 0.3c+: Enhanced Focus Mode Experience (COMPLETE)
**Goal**: Transform focus mode into a complete context shift ✅

> **Core Insight**: A task isn't a single conversation—it's a collaboration that may span multiple conversations, model changes, or fresh approaches. The task is the anchor, conversations are attempts.

**FocusedTaskWelcome Component** ✅:
- [x] `FocusedTaskWelcome.svelte` replaces WelcomeScreen when task is focused
- [x] Task header with title in task color, priority badge, due date
- [x] Guidance cards with example prompts for new tasks
- [x] "Edit" button opens TaskPanel, "×" exits focus mode
- [x] Non-anxious due date display (overdue/due soon indicators)

**Space Page Integration** ✅:
- [x] Conditional rendering: chat → focused-welcome → greeting → welcome
- [x] FocusedTaskWelcome shows when task focused + no messages

**Task-Conversation Linking** ✅:
- [x] `linked_conversation_ids` column in tasks table (TEXT[])
- [x] Repository methods: `linkConversation`, `unlinkConversation`, `getTaskByConversation`
- [x] API endpoint: POST/DELETE `/api/tasks/[id]/link`
- [x] Store methods: `linkConversation`, `unlinkConversation`, `getTaskForConversation`

**Auto-Link Behavior** ✅:
- [x] First message while focused on task auto-links conversation
- [x] Only links if conversation not already linked to another task
- [x] Subtle toast notification: "Linked to [task name]"

**Sidebar Task Pill** ✅:
- [x] Task pill shows on conversations linked to tasks
- [x] Pill styled with task color (background + text)
- [x] Click pill focuses that task
- [x] Truncated task title with hover for full name

**Success Criteria**:
- ✅ FocusedTaskWelcome shows when task focused + no messages
- ✅ Task header displays title in task color with icon
- ✅ New tasks show guidance cards with example prompts
- ✅ First message auto-links conversation to focused task
- ✅ Task pill shows in sidebar for linked conversations
- ✅ Clicking task pill focuses that task

**Depends on**: Phase 0.3c

---

### Phase 0.3d++: Subtasks & Plan Mode (COMPLETE)
**Goal**: Transform tasks into structured collaborations with guided breakdown ✅

> **Core Insight**: Users have the knowledge but lack the process. Plan Mode provides scaffolding to overcome analysis paralysis. Subtasks are focused conversations with specific outcomes, not checklist items.

> **Design Reference**: See `.claude/plans/sharded-honking-toast.md` for full design.

**Database Schema** ✅:
- [x] `parent_task_id` column for subtask hierarchy (one level max)
- [x] `subtask_type` column ('conversation' | 'action')
- [x] `subtask_order` column for ordering
- [x] `context_summary` column for inherited context
- [x] Index on parent_task_id for efficient queries

**Subtask Types** ✅:
- [x] `SubtaskType` = 'conversation' | 'action'
- [x] `CreateSubtaskInput` interface
- [x] `PlanModeState` interface (taskId, taskTitle, phase, proposedSubtasks)
- [x] `ProposedSubtask` interface (id, title, type, confirmed)

**Repository & API** ✅:
- [x] `getSubtasks(parentId)` - List subtasks for a parent task
- [x] `createSubtask(input)` - Create subtask under parent
- [x] `canHaveSubtasks(taskId)` - Enforce one-level hierarchy
- [x] `getSubtaskCount(taskId)` - Count subtasks
- [x] API endpoints: GET/POST `/api/tasks/[id]/subtasks`

**Store Integration** ✅:
- [x] `expandedTasks` state for expand/collapse UI
- [x] `planMode` state for Plan Mode workflow
- [x] Subtask methods: `createSubtask`, `getSubtasksForTask`, `hasSubtasks`
- [x] Plan Mode methods: `startPlanMode`, `exitPlanMode`, `setPlanModePhase`
- [x] Proposed subtask management: `setProposedSubtasks`, `toggleProposedSubtask`, etc.
- [x] `createSubtasksFromPlanMode()` - Bulk create confirmed subtasks

**TaskPanel Subtask Display** ✅:
- [x] Parent tasks shown in main list (subtasks hidden)
- [x] Expand/collapse chevron on tasks with subtasks
- [x] Subtask count badge showing completed/total
- [x] Subtask list with indent when expanded
- [x] Inline subtask creation form
- [x] "Subtask" button in task actions

**Plan Mode Foundation** ✅:
- [x] "Help me plan this" button on FocusedTaskWelcome
- [x] Plan Mode system prompts per phase (eliciting, proposing, confirming)
- [x] Chat API wired to use Plan Mode prompts when active
- [x] Progressive elicitation: AI asks 3-5 clarifying questions

**Plan Mode UI** ✅:
- [x] `PlanModePanel.svelte` component (slides in from right)
- [x] Shows proposed subtasks with checkboxes
- [x] Edit/toggle/remove individual subtasks
- [x] Add custom subtasks
- [x] "Create Subtasks" button for bulk creation

**Subtask Extraction** ✅:
- [x] `subtask-extraction.ts` utility
- [x] `contentContainsProposal()` - Detect when AI proposes subtasks
- [x] `extractProposedSubtasks()` - Parse numbered list into subtasks
- [x] Auto-transition to confirming phase when proposal detected

**Success Criteria**:
- ✅ Tasks can have subtasks (one level only)
- ✅ Subtasks display indented in TaskPanel with expand/collapse
- ✅ "Help me plan this" button starts Plan Mode
- ✅ AI asks clarifying questions progressively (eliciting phase)
- ✅ AI proposes 3-5 subtasks after elicitation (proposing phase)
- ✅ User can edit/confirm proposed subtasks in PlanModePanel
- ✅ Confirmed subtasks are created automatically

**Deferred to Future**:
- [ ] Slice 6: Context inheritance (parent context summary in subtask prompts)
- [ ] Slice 7: AI suggestions in chat ("Next Step:" → "+ Add as subtask" button)
- [ ] Slice 8: Action-only subtasks (checkbox without conversation)

**Depends on**: Phase 0.3c+

---

### Phase 0.3d: Meeting Summary & Guided Conversations (DEFERRED)
**Goal**: Build the signature conversational UX pattern + first integration with tasks

> **Key Integration**: Meeting Summary extracts action items → injects into task list from 0.3c

**Conversation Step System**:
- [ ] `ConversationStep` interface (question, followUp, extraction)
- [ ] Step sequencing logic (linear + conditional)
- [ ] Dynamic question generation based on previous answers
- [ ] Step completion detection

**Step-by-Step UI**:
- [ ] `GuidedConversation.svelte` component
- [ ] Question display with context
- [ ] User response input
- [ ] Progress indication (step X of Y)
- [ ] Back/edit previous answers
- [ ] Final output generation

**Meeting Summary Template** (Priority 1):
- [ ] Natural question sequence:
  - "What was this meeting about?"
  - "Who was there?"
  - "What were the key decisions?"
  - "Any action items or next steps?"
- [ ] Professional output formatting
- [ ] Action item extraction → creates tasks
- [ ] User confirms extracted tasks before adding

**Task Integration**:
- [ ] Meeting Summary → extracts action items
- [ ] Confirmation UI: "I found 3 action items. Add to your plate?"
- [ ] Each action item becomes a task with source='meeting'
- [ ] Tasks link back to meeting summary conversation

**Email Draft Template**:
- [ ] Recipient, purpose, key points
- [ ] Tone selection
- [ ] Can reference tasks: "about [task name]"

**Success Criteria**:
- Meeting Summary feels like natural conversation
- Action items flow seamlessly into task list
- Output quality exceeds freestyle prompting
- Users get power-user results without prompting knowledge

**Depends on**: Phase 0.3c

---

### Phase 0.3e: Temporal Awareness & Day Intelligence
**Goal**: The system understands time and proactively helps manage work

> **Core Insight**: Knowledge workers need help managing their time, not just their tasks. The AI should know when it's a new day, when tasks are stale, and when to offer help.

**Task Dashboard (COMPLETE)** - `/spaces/[space]/tasks`:
- [x] `TaskDashboard.svelte` - main dashboard with time-based task grouping
- [x] Task groups: Needs Attention, Today, This Week, Later, Anytime
- [x] `TaskGroupSection.svelte` - reusable section with "Show More" pattern (max 5 visible)
- [x] `TaskCard.svelte` - task display with subtask progress, area badges, due dates
- [x] `StatsRow.svelte` - completion streak and daily stats
- [x] `FocusSuggestion.svelte` - suggests what to work on based on priority/overdue

**Recently Completed (COMPLETE)**:
- [x] `RecentlyCompletedSection.svelte` - shows today's completions
- [x] Expand to show this month's completions
- [x] Reopen action to restore completed tasks
- [ ] Pagination for 100+ completions (future)

**Stale Task Detection (COMPLETE)**:
- [x] Track `lastActivityAt` on tasks
- [x] Define stale threshold (7 days no activity)
- [x] `stale_dismissed_at` column for dismissing stale warnings
- [x] Migration `008-task-stale-dismissed.sql`
- [x] Surface stale/overdue in "Needs Attention" group
- [x] Due date passed = overdue (hard deadlines)

**Reopen Task (COMPLETE)**:
- [x] API endpoint `/api/tasks/[id]/reopen`
- [x] `reopenTask()` method in store

**Day Change Detection**:
- [ ] Store `lastSessionDate` in user preferences
- [ ] Detect new day on space entry
- [ ] Detect Monday (start of work week)
- [ ] Configure week start (Sunday/Monday)

**Greeting Variations**:
- [ ] Normal day: "Morning! 4 tasks on your plate..."
- [ ] Monday: "Happy Monday! Quick check on your week..."
- [ ] Overdue items: "Heads up - 2 items slipped past their dates..."
- [ ] Stale items: "Some tasks have been sitting a while..."

**Cleanup Offer**:
- [ ] When conditions met (Monday, 2+ overdue, stale items)
- [ ] Offer: "Want to do a quick cleanup? Takes a minute."
- [ ] [Clean up my list] [Skip for now]

**Guided Cleanup Flow**:
- [ ] AI walks through stale/overdue items one by one
- [ ] For each: [✓ Done] [📅 Reschedule] [🗑️ Remove]
- [ ] Reschedule options: Today, Tomorrow, This Friday, Next week, No deadline
- [ ] Summary at end: "All cleaned up! 3 active, 1 completed, 0 removed"

**Cleanup Frequency Control**:
- [ ] Max 1 cleanup offer per week
- [ ] Store `lastCleanupOfferedDate`
- [ ] User can disable cleanup prompts
- [ ] Don't nag if skipped

**Snooze/Remind Functionality**:
- [ ] "Remind me next week" on tasks
- [ ] `snoozedUntil` field in task schema
- [ ] Snoozed tasks hidden until date
- [ ] Return to active list automatically

**Success Criteria**:
- ✅ System knows when it's a new day/Monday
- ✅ Stale tasks are surfaced, not buried
- ✅ Cleanup is helpful, not nagging
- ✅ Users feel in control of their time
- ✅ Task list stays current and actionable

**Depends on**: Phase 0.3d

---

### Phase 0.3e+: Context Panel (Area Context Management)
**Goal**: Single UI for managing "what the AI knows" about an area

> **Core Insight**: Users need one place to answer "What context does the AI have?" - combining area notes and document activation.

**Data Model** (Already Exists):
- [x] `area.context` - Free-form markdown notes
- [x] `area.contextDocumentIds` - Array of activated document IDs
- [x] Documents stored at space-level (avoids duplication across areas)
- [x] Per-area activation via `contextDocumentIds`

**Context Panel UI** (Replaces DocsPanel):
- [ ] Rename `DocsPanel` → `ContextPanel`
- [ ] **Area Notes Section**: View/edit `area.context` inline
- [ ] **Documents Section**: Single list with activation checkboxes
- [ ] Search bar (scales to 50+ docs)
- [ ] Character count display (context budget awareness)
- [ ] Upload zone with auto-activation

**Document Activation UX**:
- [ ] Checkbox = in/out of `contextDocumentIds`
- [ ] Upload → auto-activated (checked by default)
- [ ] Toggle off = stays in space, not in this area's context
- [ ] Delete = permanent removal from space (with confirmation)

**Scalability Path**:
- Phase 1 (MVP): Single list with checkboxes + search
- Phase 2: Collapsible "Active" / "Available" sections when >15 docs
- Phase 3: Optional folders/tags when >30 docs

**Wire-up**:
- [ ] Update `area.context` via area API on notes save
- [ ] Update `area.contextDocumentIds` via area API on toggle
- [ ] Pass `area` object to ContextPanel (not just spaceId)

**Success Criteria**:
- Users manage all area context from one panel
- Documents can be activated/deactivated without deletion
- Same document usable in multiple areas
- Character count shows context budget impact

**Depends on**: Phase 0.3a (Areas)

---

### Phase 0.3f: Form Pattern + Additional Templates
**Goal**: Complete template variety with structured input

**Form-Based Template UI**:
- [ ] `FormTemplate.svelte` component
- [ ] Field type renderers (text, textarea, select, multiselect, date)
- [ ] Form validation (required, format)
- [ ] Submit → generate flow
- [ ] Preview before generation

**Weekly Status Update** (Work Space):
- [ ] Form fields: Accomplishments, In Progress, Blockers, Next Week
- [ ] Can pull from completed tasks this week
- [ ] Role/team-aware output formatting

**Decision Log** (Work Space):
- [ ] Form fields: Decision, Rationale, Stakeholders, Date
- [ ] Can create follow-up tasks
- [ ] Clear documentation output

**Research Synthesis** (Research Space - Guided):
- [ ] Question sequence for research topics
- [ ] Source tracking
- [ ] Findings → implications flow

**Success Criteria**:
- Form and guided patterns both functional
- At least 5 templates available across spaces
- Templates integrate with task system where appropriate

**Depends on**: Phase 0.3e

---

### Phase 0.3g: Entity Extraction & Working Context
**Goal**: Extract structured data from all template outputs

**Database Schema**:
- [ ] Create `context_people` table
- [ ] Create `context_decisions` table
- [ ] Create `template_outputs` table
- [ ] Indexes for temporal queries

**Extraction Pipeline**:
- [ ] AI extraction prompts per entity type
- [ ] Extraction from template outputs (post-generation)
- [ ] Entity parsing and normalization
- [ ] Person deduplication (name matching)

**Confirmation UI**:
- [ ] "I found X items—confirm what to save"
- [ ] Checkboxes to include/exclude
- [ ] Inline editing before save
- [ ] User controls what gets persisted

**Working Context View**:
- [ ] Recent template outputs per space
- [ ] People mentioned frequently
- [ ] Decisions log
- [ ] Quick re-view capability

**Depends on**: Phase 0.3f

---

### Phase 0.3h: Onboarding & Polish (Stretch)
**Goal**: Personalized experience and refinement

**Activity Selection (Spotify Approach)**:
- [ ] First-run onboarding flow
- [ ] "What activities do you want help with?" (pick 3-5)
- [ ] Activity icons and descriptions
- [ ] Store selections in user profile

**Suggested Activities**:
1. 📝 Summarize meetings
2. ✉️ Draft emails
3. 📊 Write status updates
4. 📋 Track decisions & actions
5. 🔍 Research topics
6. 📄 Review documents
7. 💡 Brainstorm ideas
8. 📈 Analyze data
9. 📝 Write specs & docs
10. 🎯 Plan projects
11. 👥 Prep for 1:1s
12. 📣 Create presentations

**Template Recommendations**:
- [ ] Surface relevant templates based on activities
- [ ] "Recommended for you" section on dashboard
- [ ] Prioritize quick actions per user

**Polish Items**:
- [ ] Empty states for all views
- [ ] Error handling and recovery
- [ ] Loading states and transitions
- [ ] Keyboard shortcuts for common actions

**Success Criteria**:
- New users get personalized template recommendations
- Dashboard feels curated, not overwhelming
- Overall experience is polished and production-ready

**Depends on**: Phase 0.3g

---

### Phase 0.3 Summary

| Sub-Phase | Focus | Key Deliverable | Status |
|-----------|-------|-----------------|--------|
| 0.3a | Space Foundation | Spaces with embedded chat | ✅ Complete |
| 0.3b | Assists Framework | Architecture + task breakdown | ✅ Complete |
| 0.3c | Task Lifecycle | Persistent tasks, daily use | ✅ Complete |
| 0.3c+ | Enhanced Focus Mode | FocusedTaskWelcome, task-conversation linking | ✅ Complete |
| 0.3d++ | Subtasks & Plan Mode | Guided task breakdown with subtasks | ✅ Complete |
| 0.3d | Meeting Summary | Guided conversation + task integration | Deferred |
| 0.3e | Temporal Awareness | Day detection, stale cleanup | Planned |
| 0.3f | Form Templates | Status Update, Decision Log | Planned |
| 0.3g | Entity Extraction | People, decisions, context | Planned |
| 0.3h | Onboarding | Personalization (stretch) | Stretch |

**Total POC Templates**:
1. What's on your plate? (dump → tasks) ✅
2. Plan Mode (guided task breakdown → subtasks) ✅
3. Meeting Summary (guided → tasks) - Deferred
4. Weekly Status Update (form)
5. Decision Log (form → tasks)
6. Email Draft (guided)
7. Research Synthesis (guided)

**What Phase 0.3 Proves**:
- ✅ Tasks are the central hub of productivity
- ✅ Subtasks enable structured collaboration within tasks
- ✅ Plan Mode overcomes analysis paralysis
- ✅ Assists feed into and pull from task list
- ✅ Temporal awareness makes the system proactive
- ✅ Template → Structured Data pipeline works
- ✅ Working Context accumulates value
- ✅ Spaces feel like environments, not folders
- ✅ AI novices become power users invisibly

---

## Task Focus Mode: Future Vision

> **Status**: Core implementation in progress. This section documents future enhancements to revisit.

Task Focus Mode (`/spaces/[space]/task/[taskId]`) provides a dedicated, distraction-free environment for working on individual tasks. The following features are planned for future phases.

### Productivity Features

**Task Timer & Pomodoro**:
- [ ] Built-in timer with Pomodoro mode (25 min focus / 5 min break)
- [ ] Visual timer in header (non-intrusive, no anxiety)
- [ ] Auto-pause when leaving task focus
- [ ] Session summary: "You spent 47 minutes on this task"

**Focus Analytics**:
- [ ] Time spent per task (tracked automatically)
- [ ] Messages exchanged per task
- [ ] Completion velocity (tasks completed per week)
- [ ] Personal insights: "You're most productive between 9-11 AM"

**Completion Experience**:
- [ ] Satisfying completion animation
- [ ] Optional reflection: "What went well?"
- [ ] Streak tracking: "3 tasks completed today!"
- [ ] Weekly summary digest

### Intelligence Features

**Auto-Suggest Subtasks**:
- [ ] Analyze task title/description → suggest initial subtasks
- [ ] "Based on similar tasks, you might need: ..."
- [ ] One-click to accept suggestions

**Time Estimation**:
- [ ] Learn from historical task completion times
- [ ] "Tasks like this usually take ~2 hours"
- [ ] Compare estimate vs actual after completion

**Smart Context**:
- [ ] Suggest related documents from knowledge base
- [ ] "You mentioned X in a previous conversation—relevant?"
- [ ] Surface similar completed tasks for reference

**Next Step Suggestions**:
- [ ] After subtask completion: "Ready for the next step?"
- [ ] AI suggests what to tackle next based on priority/dependencies
- [ ] Natural transition prompts in chat

### Collaboration Features (Post-MVP)

**Task Sharing**:
- [ ] Share task with teammate (read-only or collaborative)
- [ ] Task handoff with context summary
- [ ] Comments vs chat (async collaboration)

**Notifications**:
- [ ] Slack/Teams integration for task updates
- [ ] Email digest of task progress
- [ ] Mention teammates in task chat

### Integration Features (Post-MVP)

**Calendar Integration**:
- [ ] "Block time for this task" → creates calendar event
- [ ] See upcoming time blocks in task header
- [ ] Sync with Google Calendar / Outlook

**External Tool Sync**:
- [ ] Jira/Linear integration (2-way sync)
- [ ] GitHub issue linking
- [ ] Import tasks from external tools

**Export & Reporting**:
- [ ] Export task summary (markdown, PDF)
- [ ] Weekly/monthly task reports
- [ ] Time tracking export for billing

### UX Enhancements

**Keyboard Shortcuts**:
- [ ] `Cmd+Enter` - Send message
- [ ] `Cmd+Shift+S` - Toggle subtask complete
- [ ] `Cmd+Shift+N` - New subtask
- [ ] `Escape` - Exit task focus (with confirmation if unsaved)

**Mobile Experience**:
- [ ] Responsive task focus layout
- [ ] Swipe gestures for subtask completion
- [ ] Voice input for quick task notes

**Ambient Mode**:
- [ ] Subtle background sounds (optional)
- [ ] Do Not Disturb integration
- [ ] Fullscreen focus mode (hide all chrome)

---

## Phase 0.4: Contexts & Projects

**Goal**: Lightweight persistent containers within spaces

> See `VISION-WORK-OS.md` for full context on how this fits the Work OS vision.

### Context/Project Model
- [ ] `contexts` table (id, user_id, space, name, description, created_at)
- [ ] Link conversations to contexts (conversation.context_id)
- [ ] Context creation through chat ("Create context: Q4 Planning")
- [ ] AI-suggested context creation when topic doesn't fit existing

### Context UI
- [ ] Context filter in space sidebar
- [ ] Context badge on conversations
- [ ] Quick context switcher
- [ ] Context-scoped conversation list

### Context Intelligence
- [ ] Context-specific system prompt injection
- [ ] Context summary/description auto-generated
- [ ] Related documents/artifacts (future: file attachments)

**Success Criteria**:
- Users can create contexts through natural conversation
- Conversations belong to contexts, carrying persistent knowledge
- Context switching is filtering, not navigation

**Depends on**: Phase 0.3

---

## Phase 0.5: Tasks & Meetings

**Goal**: First-class entities with lifecycle

> Meetings and tasks are not just data—they have lifecycles and intelligence.

### Task Entity
- [ ] `tasks` table (id, user_id, context_id, title, status, due_date, priority)
- [ ] Chat-first task creation ("I need to write the Q4 doc")
- [ ] Task status (pending, in_progress, completed)
- [ ] Task-to-context linking

### Meeting Entity
- [ ] `meetings` table (id, user_id, title, start_time, attendees, status)
- [ ] Meeting lifecycle: prep → during → follow-up
- [ ] Pre-meeting intelligence (research, previous notes, attendee profiles)
- [ ] Post-meeting outcome capture
- [ ] Action items extracted to tasks

### Calendar Integration
- [ ] Read-only calendar sync (Google/Outlook)
- [ ] Meeting auto-population from calendar
- [ ] Today's meetings view

**Success Criteria**:
- Tasks created through conversation, not forms
- Meetings have AI-enriched prep available
- Outcomes flow naturally into tasks

**Depends on**: Phase 0.4

---

## Phase 0.6: Home Dashboard

**Goal**: Command center for the workday

### Dashboard Components
- [ ] Today's meetings (with prep status)
- [ ] Today's tasks (actual + AI-recommended)
- [ ] Needs attention section (overdue, stale items)
- [ ] Quick actions (common templates)

### Intelligence Layer
- [ ] AI-recommended task prioritization
- [ ] Meeting prep alerts ("Johnson call in 2 hours—review prep?")
- [ ] Pattern-based suggestions

**Success Criteria**:
- Users start their day from Home
- Relevant context is surfaced, not hunted for
- Reduces "what should I work on?" friction

**Depends on**: Phase 0.5

---

## Phase 0.7: Team Management

**Goal**: Multi-user enterprise foundation

### Authentication
- [ ] User registration/login
- [ ] Password reset flow
- [ ] Session management improvements

### Team Structure
- [ ] Team creation and invitations
- [ ] Role definitions (admin, member)
- [ ] LiteLLM virtual keys per team

### Usage Tracking
- [ ] Per-user/team token usage
- [ ] Usage history and trends
- [ ] Second Opinion governance controls

**Depends on**: Phase 0.6

---

## Phase 0.8: Policy Engine

**Goal**: Enterprise AI governance

### Policy Definition
- [ ] Model access control per team
- [ ] Usage limits and quotas
- [ ] Content filtering rules

### Admin Dashboard
- [ ] Team overview and analytics
- [ ] Policy management UI
- [ ] Audit logging

**Depends on**: Phase 0.7

---

## Phase 0.9: Data Anonymization & Privacy Shield

**Goal**: Protect sensitive information from third-party LLM providers

> Enterprise customers need confidence that confidential information (company names, client names, deal details, legal matters) never reaches external AI providers in identifiable form.

### Core Concept

```
User Input:    "Spur is facing a lawsuit from Acme Corp about IP theft"
                ↓ (pre-processing - anonymize)
To LLM:        "Company_A is facing a lawsuit from Company_B about IP theft"
                ↓ (LLM responds)
From LLM:      "Company_A should consider these legal strategies..."
                ↓ (post-processing - de-anonymize)
To User:       "Spur should consider these legal strategies..."
```

### Phase 0.9a: User-Defined Dictionary (v1)
**Goal**: Simple, predictable, user-controlled anonymization

**Dictionary Management**:
- [ ] `anonymization_rules` table (id, user_id, space, original, placeholder, case_insensitive)
- [ ] Per-conversation dictionary (ephemeral, session-only option)
- [ ] Per-space dictionary (persisted, applies to all conversations in space)
- [ ] Global user dictionary (applies everywhere)
- [ ] Quick-add: highlight text in chat → "Add to anonymization"

**AI-Suggested Variations** (user confirms):
- [ ] User enters base term (e.g., "Spur")
- [ ] AI suggests variations to include:
  - Case variations: SPUR, spur, SpUr
  - Common suffixes: Spur Inc, Spur Inc., Spur Corporation, Spur Ltd
  - Compound forms: SpurTech, Spur-Tech, Spur Tech
  - Possessives: Spur's, Spur's
  - Domain/handles: spur.com, @spur, #spur
  - Abbreviations: if known (e.g., "Microsoft" → "MSFT", "MS")
- [ ] User confirms which variations to include (checkboxes)
- [ ] One-click "Select All Suggested"
- [ ] User can add custom variations not suggested

**Anonymization Engine**:
- [ ] Pre-process user messages before sending to LLM
- [ ] Handle case variations (Spur, SPUR, spur → Company_A)
- [ ] Handle partial matches (SpurTech, Spur Inc → Company_A variants)
- [ ] Maintain consistent mapping across conversation turns
- [ ] Apply to system prompts if they contain sensitive terms

**De-anonymization Engine**:
- [ ] Post-process LLM responses before displaying to user
- [ ] Preserve original case context where possible
- [ ] Handle plural forms (Company_A's, Company_As)

**UI Components**:
- [ ] Anonymization panel in conversation settings
- [ ] "Shield active" indicator when rules are in effect
- [ ] Quick-view of active mappings
- [ ] Toggle to see anonymized vs. original view

**Success Criteria**:
- Users can define sensitive terms and see them anonymized
- LLM never receives original sensitive data
- Response is seamlessly de-anonymized for readability

---

### Phase 0.9b: Smart Detection (v2)
**Goal**: AI-assisted entity detection with user confirmation

**Entity Detection**:
- [ ] Named Entity Recognition (NER) for companies, people, locations
- [ ] Pattern detection for project names, codenames
- [ ] Domain-specific patterns (case numbers, deal names)

**Confirmation Flow**:
- [ ] "I detected these potentially sensitive terms..." UI
- [ ] User confirms which to anonymize
- [ ] One-click "anonymize all detected"
- [ ] Learn from user confirmations over time

**Context Leakage Prevention**:
- [ ] Detect indirect identifiers ("the Austin-based fintech")
- [ ] Flag potential leakage for user review
- [ ] Suggest additional anonymization

---

### Phase 0.9c: Team & Admin Controls (v3)
**Goal**: Enterprise-wide data protection policies

**Admin Controls**:
- [ ] Mandatory anonymization rules per team
- [ ] Blocked terms list (always anonymize, no override)
- [ ] Audit log of what was anonymized
- [ ] Compliance reports

**Team Dictionaries**:
- [ ] Shared team anonymization rules
- [ ] Team-level sensitive terms (client names, project codes)
- [ ] Inheritance: team rules + personal rules

**Depends on**: Phase 0.7 (Team Management)

---

### Technical Considerations

**Performance**:
- Regex-based replacement is fast
- NER adds latency (~100-200ms) - consider async
- Cache compiled patterns per conversation

**Edge Cases**:
- Acronyms: "MSFT" vs "Microsoft" - handle as separate entries
- Pronouns: "They announced..." - can't anonymize without losing context
- Embedded mentions: "I met with John-from-Spur" - partial match handling
- Numbers: Case #12345 - pattern-based anonymization

**Storage**:
- Anonymized version sent to LLM (never stored)
- Original user input stored locally (with user consent)
- Mapping table ephemeral by default, optionally persisted

---

## Phase 0.10: Temporal Intelligence

**Goal**: Proactive AI that understands time and context

> This phase builds on the Working Context from Phase 0.3 to provide intelligent, time-aware assistance.

### Smart Context Injection (RAG)
- [ ] Generate embeddings for template outputs
- [ ] pgvector extension for similarity search
- [ ] "Find relevant past context" for conversations
- [ ] Automatic context injection based on conversation topic

### Proactive Features
- [ ] Morning briefing ("3 items due today, 2 meetings")
- [ ] Smart reminders ("Deadline for X is tomorrow")
- [ ] Pattern detection ("Recurring theme in your meetings: deployment delays")
- [ ] Stale item alerts ("5 action items pending >2 weeks")

### Database Considerations
- [ ] Add embedding columns to template_outputs (pgvector)
- [ ] Consider external vector DB if scale requires it
- [ ] Optimize for temporal queries (date ranges, recency)

---

## Phase 0.7: Collaboration & Knowledge Graph (Future)

**Goal**: Team-aware productivity with relationship intelligence

> This phase extends individual productivity to team collaboration.

### Entity Relationships Table
- [ ] Generic `entity_relationships` table for graph-like queries:
  ```sql
  entity_relationships (
    source_type, source_id,
    target_type, target_id,
    relationship,  -- 'assigned_to', 'stakeholder_of', 'mentioned_in'
    strength, metadata
  )
  ```
- [ ] Relationship extraction from templates
- [ ] Recursive CTE queries for multi-hop traversal
- [ ] Consider Apache AGE or Neo4j if complexity warrants

### Team Features
- [ ] Shared spaces (team-level, not just user-level)
- [ ] Collaborative template outputs (multiple contributors)
- [ ] Action items assigned across team members
- [ ] Decision notifications to stakeholders
- [ ] Team dashboards with collective context

### Knowledge Graph Queries
- [ ] "Who worked on things related to Project X?"
- [ ] "What decisions led to this outcome?"
- [ ] "Find colleagues with similar work patterns"

---

## Ongoing: Model Arena Evolution

**Purpose**: User education + Internal optimization (see PRODUCT_VISION.md)

### Current (Complete)
- [x] Multi-model comparison (2-4 models)
- [x] AI-powered judging
- [x] User voting
- [x] Battle history
- [x] Category selection (general, coding, reasoning, creative, analysis)
- [x] AI Judge category detection (suggests category when "general" selected)
- [x] Space/Area context injection (add context to Arena prompts)
- [x] Continue Conversation flow (continue battle with chosen model)

### Arena Rankings Dashboard (Future)
- [ ] `/arena/rankings` page
- [ ] Per-category leaderboards (best model for coding, creative, etc.)
- [ ] User votes vs AI judge comparison
- [ ] Win rate trends over time
- [ ] Head-to-head comparison charts
- [ ] Filter by time period (week, month, all time)
- [ ] Model performance insights

### BattleOutcome Data Model (Prerequisites for Rankings)

**Status**: Designed, not yet implemented

**Purpose**: Replace full battle storage with lightweight outcome records for analytics. Currently, Arena stores complete battle data including full model responses in localStorage. This is heavy and unnecessary for long-term analytics. BattleOutcome captures only what's needed for rankings and insights.

**Type Definition** (`src/lib/types/arena.ts`):
```typescript
export interface BattleOutcome {
  id: string;                          // Battle ID (primary key)
  promptSnippet: string;               // First 150 chars (for display, not full storage)
  category: TemplateCategory;          // User-selected category
  suggestedCategory?: TemplateCategory; // AI Judge's suggestion (if detected)
  modelIds: string[];                  // Models that participated
  aiWinnerId: string | null;           // Model chosen by AI Judge
  aiScores: Record<string, number>;    // Per-model scores from judge (0-100)
  userWinnerId: string | null;         // Model chosen by user vote
  contextAreaId?: string;              // If context was injected from an Area
  continuedAsConversationId?: string;  // If user continued conversation
  timestamp: number;                   // Battle completion time
}
```

**Database Migration** (`migrations/012-arena-outcomes.sql`):
```sql
CREATE TABLE IF NOT EXISTS arena_outcomes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt_snippet TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  suggested_category TEXT,
  model_ids TEXT[] NOT NULL,
  ai_winner_id TEXT,
  ai_scores JSONB,
  user_winner_id TEXT,
  context_area_id TEXT,
  continued_as_conversation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rankings queries
CREATE INDEX idx_arena_outcomes_user ON arena_outcomes(user_id);
CREATE INDEX idx_arena_outcomes_category ON arena_outcomes(category);
CREATE INDEX idx_arena_outcomes_created ON arena_outcomes(created_at DESC);
CREATE INDEX idx_arena_outcomes_ai_winner ON arena_outcomes(ai_winner_id);
CREATE INDEX idx_arena_outcomes_user_winner ON arena_outcomes(user_winner_id);
```

**Implementation Tasks**:
- [ ] Create `src/lib/types/arena.ts` with BattleOutcome interface
- [ ] Create migration `012-arena-outcomes.sql`
- [ ] Add `POST /api/arena/outcomes` endpoint
- [ ] Add `saveBattleOutcome()` to arena store (called after judging completes)
- [ ] Add `GET /api/arena/outcomes` endpoint with filtering (for rankings page)
- [ ] Remove full battle sync to PostgreSQL (only persist outcomes)
- [ ] Reduce localStorage to active battle + user preferences only

**Design Decisions**:
- **No foreign keys**: Models/areas may be deleted; outcome records should survive
- **Prompt snippet only**: Privacy + storage efficiency; 150 chars enough for display
- **Dual winner tracking**: Compare AI vs user choices for "judge accuracy" insights
- **JSONB scores**: Flexible structure for future scoring enhancements

### Phase 2: Context-Aware Arena
- [ ] "Send to Arena" from chat (with conversation context)
- [ ] Conversation summary injection for context
- [ ] Follow-up rounds within battles
- [ ] Per-model conversation history in battles

### Phase 3: A/B Testing Mode
- [ ] Same model, different settings comparison
- [ ] Temperature variations
- [ ] Thinking budget variations
- [ ] Save optimal settings per use case

### Phase 4: Model Strength Mapping
- [ ] Categorize prompts by task type
- [ ] Track win rates per model per category
- [ ] Generate model recommendations
- [ ] Background automated testing (future)

### Phase 5: Analytics
- [ ] Win rate dashboard
- [ ] Head-to-head charts
- [ ] Cost per battle tracking
- [ ] Export statistics

---

## Pages System: Future Enhancements

> **Status**: Documented for future implementation. Not V1 blockers.

### Image Upload in Pages

**Goal**: Allow users to embed images in Pages (screenshots, diagrams, photos)

**Why Deferred**: Pages work well text-only for V1 use cases (meeting notes, proposals, briefs). Images add infrastructure complexity without blocking core value.

#### Conceptual Model

Images in Pages are **content** (integral to document), not **attachments** (supporting files). This differs from Documents (uploaded files at Space-level).

#### Recommended Phased Approach

**Phase 1 (MVP)**: Base64 in JSONB
- Install `@tiptap/extension-image`
- Images stored as base64 data URLs in TipTap JSON
- Client-side compression before upload (canvas resize, cap at 2MB)
- Validates feature, zero infrastructure

**Phase 2 (Polish)**: Page Assets Table
- Decouple images from page JSON for performance
- Deduplication by checksum
- Image optimization pipeline (Sharp)
- Migration: detect base64 images → extract to assets table

**Phase 3 (Scale)**: S3 Migration
- Only if usage justifies (monitor asset table size)
- Assets table becomes metadata pointing to S3
- CDN integration for global delivery

#### Storage Strategy Analysis

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| Base64 in JSONB | Zero infrastructure, atomic saves, offline-capable | 33% size overhead, no CDN, duplicates across pages | MVP, <20 images/page |
| Page Assets Table | Dedup by checksum, fast page saves, can optimize | More complex, orphan cleanup needed | Production, moderate usage |
| S3 + Signed URLs | Infinite scale, CDN-ready, cost-efficient at scale | AWS dependency, signed URL complexity | Enterprise, heavy media |

#### UX Requirements

**Insert Methods** (priority order):
1. **Paste from clipboard** - Critical for screenshots (Cmd+Shift+4 → Cmd+V)
2. **Toolbar button** - Most discoverable (click → file picker → upload)
3. **Drag and drop** - Intuitive (TipTap supports natively)
4. **Markdown syntax** - `![alt](url)` (nice-to-have)

**Upload Flow**:
```
User pastes/drops image
    ↓
[Inline placeholder with spinner]
    ↓
Validate (size ≤5MB, type: jpeg/png/gif/webp)
    ↓
Compress if needed (client-side canvas)
    ↓
Upload to server
    ↓
[Replace placeholder with image]
    ↓
Auto-save triggers
```

**In-Editor Controls**:
- Resize handles (TipTap default)
- Alignment (left, center, right)
- Alt text editing
- Delete
- **Skip**: Crop, filters, advanced editing

#### AI Integration

The discussion panel needs to handle images for context:

```typescript
// Pass images to AI when discussing page
messages: [
  {
    role: "user",
    content: [
      { type: "text", text: "Help me improve this document" },
      { type: "image_url", url: "data:image/png;base64,..." }
    ]
  }
]
```

**Considerations**:
- Claude Sonnet: ~$0.48/1000 image tiles (each tile ~768 tokens)
- Downsample images before sending to AI
- Consider only sending images when user explicitly asks
- Cache AI responses about images

#### Export Handling

**PDF**: Base64 images work directly in HTML → PDF conversion
**DOCX**: Requires `ImageRun` with buffer - more complex than text export

```typescript
// docx library pattern
new ImageRun({
  data: imageBuffer,
  transformation: { width: 400, height: 300 }
})
```

Test export early - image handling is a common pain point.

#### Security Requirements

1. **File Validation**
   - Validate MIME type server-side (check magic bytes)
   - Reject SVG (XSS vector) unless sanitized
   - Allowlist: jpeg, png, gif, webp

2. **Size Limits**
   - Per-image: 5MB
   - Per-page total: 20MB
   - Prevent DOS via massive uploads

3. **Access Control**
   - Asset endpoint must verify page access
   - No predictable/guessable URLs without auth

4. **Future (Enterprise)**
   - Malware scanning on upload
   - Sensitive content detection (PII in screenshots)

#### Database Schema (If Page Assets)

```sql
CREATE TABLE page_assets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- File metadata
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,

  -- Storage (supports future S3 migration)
  storage_type TEXT NOT NULL DEFAULT 'database', -- 'database' | 's3'
  content BYTEA,          -- if storage_type = 'database'
  storage_key TEXT,       -- if storage_type = 's3'

  -- Deduplication
  checksum TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_storage CHECK (
    (storage_type = 'database' AND content IS NOT NULL) OR
    (storage_type = 's3' AND storage_key IS NOT NULL)
  )
);

CREATE INDEX idx_page_assets_page ON page_assets(page_id);
CREATE INDEX idx_page_assets_checksum ON page_assets(checksum);
```

#### Open Questions (Resolve When Implementing)

1. **Should images be shareable across pages?** (Like Documents across Areas) Or always page-specific?
2. **Image-from-chat flow?** Screenshot in chat → "Add to page" button?
3. **Thumbnail generation?** For page list previews?
4. **Version history?** Track image changes across page versions?

#### Implementation Checklist

- [ ] Install `@tiptap/extension-image`
- [ ] Add image button to `EditorToolbar.svelte`
- [ ] Implement paste handler in `PageEditor.svelte`
- [ ] Implement drag-drop handler
- [ ] Client-side image compression utility
- [ ] Image upload endpoint (`POST /api/pages/[id]/assets`)
- [ ] Asset serving endpoint (`GET /api/pages/assets/[assetId]`)
- [ ] Update `extractTextFromContent()` to include alt text
- [ ] Update PDF export to handle images
- [ ] Update DOCX export to handle images
- [ ] Test AI discussion panel with image context

---

### Pages Editor UX Polish

**Goal**: Tighten the editor experience with expected rich text editor behaviors.

**Status**: Audit complete. Ready for implementation sprint.

#### Priority Summary

| Priority | Issues | Effort |
|----------|--------|--------|
| P0 (Critical) | Toolbar reactivity | Low |
| P1 (High) | Undo/redo, paragraph option, link modal | Low |
| P2 (Medium) | Char count, title input, clear formatting, visibility confirm | Low |
| P3 (Low) | Alignment, shortcuts ref, PDF export, auto-save indicator | Medium |
| P4 (Future) | Drag handles, link click-edit, page type edit, version history | Medium-High |

---

#### P0: Critical - Toolbar State Not Reactive

**Problem**: Toolbar buttons use `editor.isActive('bold')` but don't update when cursor moves to differently-formatted text. Heading buttons don't reflect current heading level.

**Root Cause**: TipTap's `editor.isActive()` is synchronous. Svelte doesn't re-evaluate when selection changes because there's no reactive dependency.

**Location**: `EditorToolbar.svelte:67` and similar `class:active={editor.isActive(...)}` calls.

**Fix**:
```typescript
// In PageEditor.svelte
let editorTick = $state(0);

editor = new Editor({
  ...
  onTransaction: () => {
    editorTick++; // Force reactive update
  }
});

// Pass to toolbar
<EditorToolbar {editor} {editorTick} />
```

```svelte
// In EditorToolbar.svelte - use editorTick as dependency
// Option 1: {#key editorTick} wrapper
// Option 2: Derived state that depends on editorTick
let isBoldActive = $derived(editorTick && editor?.isActive('bold'));
```

**Checklist**:
- [ ] Add `onTransaction` callback to editor initialization
- [ ] Create reactive `editorTick` counter
- [ ] Pass to `EditorToolbar` as prop
- [ ] Update all `isActive()` checks to be reactive
- [ ] Test: Click in bold text → Bold button highlighted
- [ ] Test: Click in H2 → H2 button highlighted
- [ ] Test: Click in list → List button highlighted

---

#### P1: High Priority

##### Undo/Redo Buttons

**Problem**: History works via keyboard (Cmd+Z) but no visual buttons.

**Fix**: Add to toolbar with proper disabled states.

```svelte
<button
  class="toolbar-btn"
  onclick={() => editor.chain().focus().undo().run()}
  disabled={!editor.can().undo()}
  title="Undo ({modKey}+Z)"
>
  <!-- Undo icon -->
</button>

<button
  class="toolbar-btn"
  onclick={() => editor.chain().focus().redo().run()}
  disabled={!editor.can().redo()}
  title="Redo ({modKey}+Shift+Z)"
>
  <!-- Redo icon -->
</button>
```

**Checklist**:
- [ ] Add undo button with icon
- [ ] Add redo button with icon
- [ ] Wire up `editor.can().undo()` / `editor.can().redo()` for disabled state
- [ ] Position in toolbar (typically far left, before text formatting)

##### Paragraph / Normal Text Option

**Problem**: Can toggle H1/H2/H3, but no explicit way to convert back to normal paragraph. Users must know to "toggle off" the current heading.

**Fix**: Add paragraph button or convert heading group to dropdown.

**Option A - Paragraph Button**:
```svelte
<button
  class="toolbar-btn"
  class:active={editor.isActive('paragraph') && !editor.isActive('heading')}
  onclick={() => editor.chain().focus().setParagraph().run()}
  title="Normal text"
>
  <span class="text-label">¶</span>
</button>
```

**Option B - Heading Dropdown** (better UX, more complex):
```svelte
<select onchange={(e) => {
  const level = e.target.value;
  if (level === 'p') editor.chain().focus().setParagraph().run();
  else editor.chain().focus().setHeading({ level: parseInt(level) }).run();
}}>
  <option value="p">Normal</option>
  <option value="1">Heading 1</option>
  <option value="2">Heading 2</option>
  <option value="3">Heading 3</option>
</select>
```

**Checklist**:
- [ ] Decide: Button or dropdown approach
- [ ] Implement chosen approach
- [ ] Ensure active state reflects current block type

##### Link Modal UX Improvements

**Problems**:
1. Input doesn't auto-focus when modal opens
2. No way to remove existing link
3. Can't see what text is being linked

**Location**: `EditorToolbar.svelte:270-300`

**Fixes**:

```svelte
<!-- Auto-focus input -->
{#if showLinkModal}
  <input
    type="url"
    bind:value={linkUrl}
    use:autofocus
    ...
  />
{/if}

<!-- Add remove link button -->
<div class="link-modal-footer">
  {#if editor.isActive('link')}
    <button
      type="button"
      class="btn-remove"
      onclick={() => {
        editor.chain().focus().unsetLink().run();
        showLinkModal = false;
      }}
    >
      Remove link
    </button>
  {/if}
  <button class="btn-cancel" ...>Cancel</button>
  <button class="btn-apply" ...>Apply</button>
</div>
```

**Checklist**:
- [ ] Add `use:autofocus` action or manual focus in `openLinkModal()`
- [ ] Show selected text in modal (read-only, for context)
- [ ] Add "Remove link" button (only when editing existing link)
- [ ] Style remove button as destructive action

---

#### P2: Medium Priority

##### Character Count

**Problem**: Only word count shown. Character count needed for constrained content.

**Location**: `PageEditor.svelte:346` (footer)

**Fix**:
```typescript
let charCount = $derived(extractTextFromContent(content).length);
let charCountNoSpaces = $derived(extractTextFromContent(content).replace(/\s/g, '').length);
```

```svelte
<span class="word-count">{wordCount} words · {charCount} chars</span>
```

**Checklist**:
- [ ] Add character count derived state
- [ ] Display in footer alongside word count
- [ ] Consider toggle or hover for "with/without spaces"

##### Title Input Behavior

**Problem**: Clicking to edit title doesn't auto-focus or select text.

**Location**: `PageHeader.svelte:91-94`

**Fix**:
```typescript
function startEditingTitle() {
  editedTitle = title;
  isEditingTitle = true;
  // Focus and select happens via effect
}

$effect(() => {
  if (isEditingTitle) {
    // Need ref to input element
    tick().then(() => {
      titleInputRef?.focus();
      titleInputRef?.select();
    });
  }
});
```

**Checklist**:
- [ ] Add ref to title input element
- [ ] Auto-focus on edit start
- [ ] Select all text for easy replacement
- [ ] Test: Click title → all text selected, ready to type

##### Clear Formatting Button

**Problem**: No easy way to strip all formatting from selected text.

**Fix**:
```svelte
<button
  class="toolbar-btn"
  onclick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
  title="Clear formatting"
>
  <!-- Clear format icon: Tx with strikethrough -->
</button>
```

**Checklist**:
- [ ] Add clear formatting button to toolbar
- [ ] Position after text formatting group
- [ ] Test: Select formatted text → click → plain text

##### Visibility Change Confirmation

**Problem**: Changing from private to shared has no confirmation. Could accidentally expose sensitive content.

**Location**: `PageHeader.svelte:100-104`

**Fix**:
```typescript
function handleVisibilityChange(newVisibility: PageVisibility) {
  if (newVisibility === 'shared' && visibility === 'private') {
    const confirmed = confirm(
      'This will make the page visible to all Area members. Continue?'
    );
    if (!confirmed) return;
  }
  if (onVisibilityChange && newVisibility !== visibility) {
    onVisibilityChange(newVisibility);
  }
}
```

**Checklist**:
- [ ] Add confirmation when changing private → shared
- [ ] Consider toast notification after change
- [ ] No confirmation needed for shared → private (safe direction)

---

#### P3: Lower Priority

##### Text Alignment

**Problem**: No left/center/right alignment options.

**Fix**: Install and configure TextAlign extension.

```bash
npm install @tiptap/extension-text-align
```

```typescript
import TextAlign from '@tiptap/extension-text-align';

// In editor config
TextAlign.configure({
  types: ['heading', 'paragraph'],
})
```

**Checklist**:
- [ ] Install `@tiptap/extension-text-align`
- [ ] Add to editor extensions
- [ ] Add alignment buttons to toolbar
- [ ] Test with headings and paragraphs

##### Keyboard Shortcuts Reference

**Problem**: Shortcuts exist but no central reference in editor.

**Fix**: Add help button that shows shortcuts modal (reuse pattern from main app's `KeyboardShortcutsModal`).

**Checklist**:
- [ ] Create `EditorShortcutsModal.svelte` or reuse existing
- [ ] Add "?" button to toolbar or header
- [ ] List all editor shortcuts

##### PDF Export

**Problem**: Only Markdown and DOCX export. PDF commonly requested.

**Fix**: Add PDF option using html-pdf or puppeteer.

**Checklist**:
- [ ] Research PDF generation library (puppeteer, html-pdf, pdfkit)
- [ ] Add PDF option to ExportMenu
- [ ] Implement PDF endpoint
- [ ] Test with various content types

##### Auto-Save Visual Indicator

**Problem**: No visual feedback during auto-save (only "Last saved X ago" after).

**Fix**: Show subtle indicator when auto-save is in progress.

```svelte
{#if saveStatus === 'saving'}
  <span class="auto-save-indicator">
    <span class="pulse-dot"></span>
    Saving...
  </span>
{/if}
```

**Checklist**:
- [ ] Add auto-save indicator in footer or header
- [ ] Subtle animation (pulse dot or spinner)
- [ ] Disappears after save completes

---

#### P4: Future Enhancements

##### Block Drag Handles

TipTap supports dragging blocks to reorder. Add visual drag handles.

- [ ] Research TipTap drag handle implementation
- [ ] Add drag handle UI to block nodes
- [ ] Test with paragraphs, lists, code blocks

##### Link Click-to-Edit

Currently links don't open on click and require manual selection to edit.

- [ ] Add floating menu on link click
- [ ] Options: Edit URL, Open link, Remove link
- [ ] Consider bubble menu extension

##### Page Type Editable

Type badge is display-only after creation.

- [ ] Make type badge clickable
- [ ] Show type selector dropdown
- [ ] Update page type via API

##### Version History UI

Version API exists but no UI to browse/restore.

- [ ] Add "History" button to header
- [ ] Create version list panel/modal
- [ ] Show diff between versions
- [ ] Restore functionality

---

#### Implementation Order (Recommended Sprint)

**Day 1: Critical + Quick Wins**
- [ ] P0: Toolbar reactivity fix
- [ ] P1: Undo/redo buttons
- [ ] P1: Paragraph option
- [ ] P1: Link modal auto-focus

**Day 2: Polish**
- [ ] P2: Character count
- [ ] P2: Title input auto-select
- [ ] P2: Clear formatting button
- [ ] P2: Visibility confirmation
- [ ] P1: Link modal remove link

**Day 3: Nice-to-haves**
- [ ] P3: Auto-save indicator
- [ ] P3: Text alignment (if time)

**Later Sprint**
- [ ] P3: Keyboard shortcuts reference
- [ ] P3: PDF export
- [ ] P4: Future enhancements

---

## Technical Improvements (Ongoing)

### Google Deep Research Integration
**Status**: Planned

Google's Deep Research Pro (`deep-research-pro-preview`) is an autonomous research agent that uses the Interactions API (async polling), not standard chat completions. Implementation would require:

- [ ] New "Deep Research" mode/feature in UI
- [ ] Async task creation via Google Interactions API
- [ ] Progress polling and status display
- [ ] Research results rendering (can be lengthy reports)
- [ ] File Search tool integration (optional - for custom data)

**Technical Notes**:
- Uses `POST /interactions` with `background: true`
- Poll `GET /interactions/{id}` for completion
- Research tasks can take minutes to complete
- Rate limit: 1 RPM (Tier 1)

### Prompt Caching Optimization
**Status**: Phase 1 Complete

- [x] System prompt caching
- [ ] Conversation history caching (cache breakpoints)
- [ ] Cache statistics in UI
- [ ] Cost savings display

**Technical Notes**:
- Anthropic: 90% discount cached reads, 25% premium writes, 5-min TTL
- OpenAI: 50% discount, automatic for 1024+ tokens

### Token Management
**Status**: Complete

- [x] Accurate counting with js-tiktoken
- [x] Context window percentage display
- [ ] Real-time count as user types
- [ ] Warning when approaching limit
- [ ] Auto-summarization near limit

### UX Enhancements
- [ ] Keyboard shortcuts (Cmd+Enter, Cmd+K, Escape)
- [ ] Edit sent messages and regenerate
- [ ] Fork conversation from any point
- [ ] Dark/light/system theme (complete)

### Settings Architecture Review
- [ ] **System Prompt Scope**: Currently global (affects all conversations). Consider:
  - Per-Space system prompts (different personas for Work vs Personal)
  - Per-Area system prompts (e.g., "coding assistant" in Coding area)
  - Per-Conversation overrides (maximum flexibility)
  - Inheritance: Global → Space → Area → Conversation
- [ ] **Impact Analysis**: Changing global system prompt affects ALL future messages in ALL conversations - users may not expect this
- [ ] **UX Clarity**: Settings panel doesn't indicate scope - users may think it's per-conversation

### UI Cleanup & Polish
**Status**: Audit Complete - Ready for Implementation

> **Reference**: See `docs/UI_AUDIT.md` for comprehensive audit findings with file:line references and fix code.

**Mobile Responsiveness** (15 critical + 20 major issues):
- [ ] Second Opinion Panel responsive width (`SecondOpinionPanel.svelte:61`)
- [ ] Message action buttons touch-accessible (`ChatMessage.svelte:407`)
- [ ] Safe-area padding for iOS (`ChatInput.svelte:297`, `Toast.svelte:13`)
- [ ] Conversation drawer responsive width (`ConversationDrawer.svelte:228`)
- [ ] Dropdown menu positioning fix (`ConversationItem.svelte:86`)
- [ ] Touch targets minimum 44x44px (multiple files)

**Light Mode Compatibility** (90+ components):
- [ ] Root layout background fix (`+layout.svelte:11`)
- [ ] Theme hydration script (`app.html`)
- [ ] Tailwind `darkMode: 'class'` config (`tailwind.config.js`)
- [ ] Focus ring offset light mode (`app.css`)
- [ ] Systematic `dark:` prefix additions (90+ components)

**UI Consistency**:
- [ ] Button style standardization (13 variants → 4)
- [ ] Padding scale enforcement (p-2, p-3, p-4)
- [ ] Border radius standardization
- [ ] Transition duration standardization

**Accessibility**:
- [ ] Address 42 svelte-ignore a11y suppressions
- [ ] Add aria-labels to 30+ icon buttons
- [ ] Global focus indicators
- [ ] Color contrast fixes

---

## Priority Matrix

| Feature | Phase | Impact | Effort | Status |
|---------|-------|--------|--------|--------|
| ~~Codebase cleanup~~ | 0.1 | High | Low | ✅ |
| ~~Bedrock integration~~ | 0.1 | Medium | Low | ✅ |
| ~~PostgreSQL integration~~ | 0.2 | Critical | Medium | ✅ |
| ~~Chat history sidebar~~ | 0.2 | Critical | Medium | ✅ |
| ~~Space navigation~~ | 0.3a | High | Medium | ✅ |
| ~~Assists framework~~ | 0.3b | High | Medium | ✅ |
| ~~Task Lifecycle Foundation~~ | 0.3c | Critical | High | ✅ |
| ~~Enhanced Focus Mode~~ | 0.3c+ | High | Medium | ✅ |
| ~~Subtasks & Plan Mode~~ | 0.3d++ | High | Medium | ✅ |
| Meeting Summary + Guided | 0.3d | High | High | Deferred |
| Task Dashboard + Stale Detection | 0.3e | High | Medium | ✅ |
| Day Change + Cleanup Offers | 0.3e | High | Medium | **NEXT** |
| Form templates | 0.3f | Medium | Medium | Planned |
| Entity extraction | 0.3g | High | High | Planned |
| Onboarding (stretch) | 0.3h | Medium | Low | Stretch |
| Send to Arena (context) | Arena | Medium | Medium | Planned |
| Team management | 0.7 | High | High | Future |
| Policy engine | 0.8 | High | High | Future |
| Data anonymization (Privacy Shield) | 0.9 | High | Medium | Future |
| Temporal intelligence (RAG) | 0.10 | High | High | Future |
| Knowledge graph / collaboration | Future | Medium | High | Future |

---

## Notes

- **Foundation first**: A bad chat experience is a non-starter
- **Baby steps**: Small iterations, quality over speed
- **No bloat**: Every feature must earn its place
- **Speed matters**: Optimize for time-to-first-token
- **Guide users**: Many are AI novices, help them succeed
- **Tasks are central**: All assists feed into the task hub

---

*Aligned with PRODUCT_VISION.md - Last Updated: January 6, 2026*
*Completed: Phase 0.1, Phase 0.2, Phase 0.3a, Phase 0.3b, Phase 0.3c, Phase 0.3c+, Phase 0.3d++, Phase 0.3e (Task Dashboard) | Next: Phase 0.3e (Day Change + Cleanup)*
