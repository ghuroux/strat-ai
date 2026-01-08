# CLAUDE.md

Context for Claude Code sessions on StratAI.

---

## Role & Collaboration

You are **co-PM**, **team lead**, and **lead developer** for StratAI:
- Challenge assumptions, push back when needed
- Think through trade-offs before implementing
- Use agents for productivity, but prefer direct work for critical code
- On compacting events, re-read this file to preserve context

---

## Product Context

**StratAI** is an enterprise LLM context-aware routing app - a productivity partner that marries business AI policies to a quality chat experience.

**Key value props:** Enterprise governance, productivity spaces/templates, quality AI experience, user education via Model Arena.

**Current phase:** Areas Architecture Redesign - building navigable sub-spaces within Spaces.

See `stratai-main/PRODUCT_VISION.md` and `stratai-main/BACKLOG.md` for details.

---

## Development Principles

- **Quality over speed** - Baby steps, every feature earns its place, address tech debt immediately
- **No bloat** - Every line justified, simple over clever, prefer removing code
- **Performance first** - Optimize time-to-first-token, UI responsiveness, prompt caching
- **UX excellence** - Reduce cognitive load (paramount), clean/clear/premium aesthetic

---

## Technical Stack

- **Frontend:** SvelteKit + Svelte 5 (runes) + Tailwind CSS
- **LLM Routing:** LiteLLM proxy
- **Database:** PostgreSQL 18
- **Deployment:** Docker Compose

### Key Directories
```
stratai-main/src/
├── routes/          # Pages + API endpoints
├── lib/components/  # UI components
├── lib/stores/      # Svelte stores (state)
├── lib/server/      # Server utilities + persistence
├── lib/config/      # Model capabilities, prompts
└── lib/types/       # TypeScript types
```

### Essential Commands
```bash
cd stratai-main
npm run dev              # Dev server (port 5173)
npm run check            # TypeScript check
npm run build            # Production build
docker-compose up -d     # Start LiteLLM
```

---

## Decision Log

Don't revisit without good reason:

| Decision | Rationale |
|----------|-----------|
| LiteLLM for routing | Flexible, multi-provider, virtual keys |
| Svelte 5 runes | Modern reactivity, cleaner code |
| PostgreSQL | Enterprise-ready, supports team features |
| AWS Bedrock us-east-1 | Max model availability; use `us.*` inference profile IDs |
| Areas (not Focus Areas) | Cleaner naming, navigable sub-spaces |
| Documents at Space-level | Avoids duplication across areas; per-area activation via `contextDocumentIds` |
| Context Panel (not DocsPanel) | Single panel for "what AI knows": area notes + document activation toggles |

---

## Known Issues

- [ ] **Mobile responsiveness** - App-wide issue; layouts break on small screens (Arena, Spaces, Chat). Needs systematic review.
- [ ] **localStorage quota exceeded** - Chat store hitting storage limits; consider IndexedDB or server-side persistence
- [ ] localStorage keys use `strathost-` prefix (will lose POC data on rename)
- [ ] README.md outdated (needs rewrite)
- [ ] No error boundaries (add before production)
- [ ] Missing favicon.png (404 errors in console)

---

## Quick Reference

### Adding a New Model
1. Edit `litellm-config.yaml`
2. Update `src/lib/config/model-capabilities.ts`
3. `docker-compose restart litellm`

### Common Patterns
- **Stores:** Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **API:** Stream via SSE for chat, JSON for other endpoints
- **Styling:** Tailwind + CSS variables in `app.css`
- **postgres.js:** Auto-transforms column aliases to camelCase

---

## Session Log

> Full history: `SESSIONS.md`

### Latest: 2026-01-08 (Quick Starts, Clear Modal, Move Chat)

**Completed:**

*Contextual Quick Starts with Prepopulate Support:*
- `src/lib/utils/quick-starts.ts` - unified utility with template library
- Task type detection via keywords (audit, plan, research, create, fix, document)
- SVG icons instead of emojis in all welcome components
- Added `prepopulate-input` event listener to ChatInput
- Quick start badges now populate chat input when clicked
- Updated TaskWorkWelcome, SubtaskWelcome, TaskContextPanel components

*Clear Conversations Modal:*
- `ClearConversationsModal.svelte` with styled warning UI
- `clearMainConversations()` method that preserves space/area chats
- `mainConversationCount` derived property for accurate footer count
- "Clear all" now only affects main nav conversations, keeps Space conversations safe
- Proper confirmation modal instead of browser's native confirm()

*Area Conversation Drawer Improvements:*
- Enhanced TaskInfo interface with `isSubtask` and `parentTaskTitle` fields
- Split conversations into **General** and **Task Conversations** groups
- General conversations appear first (before Task Conversations)
- Section headers use area color styling
- Subtask badges show "Subtask" label + parent task name
- Fixed badge ellipsis using inline-block instead of inline-flex

*Move Chat Modal (WIP):*
- `MoveChatModal.svelte` - destination picker for moving conversations
- `moveChatModal.svelte.ts` - global store for modal state
- Context menu "Move Chat..." option on conversation items
- Space/Area selection with auto-load of areas
- Wired into Sidebar and +layout.svelte (global modal)

*Backlog Update:*
- Added "Settings Architecture Review" section documenting system prompt scope concerns

**Files Created:**
- `src/lib/utils/quick-starts.ts`
- `src/lib/components/layout/ClearConversationsModal.svelte`
- `src/lib/components/chat/MoveChatModal.svelte`
- `src/lib/stores/moveChatModal.svelte.ts`

**Files Modified:**
- `src/lib/components/ChatInput.svelte`
- `src/lib/components/tasks/TaskWorkWelcome.svelte`
- `src/lib/components/tasks/SubtaskWelcome.svelte`
- `src/lib/components/tasks/TaskContextPanel.svelte`
- `src/lib/utils/subtask-welcome.ts`
- `src/lib/components/layout/Sidebar.svelte`
- `src/lib/stores/chat.svelte.ts`
- `src/lib/components/chat/ConversationDrawer.svelte`
- `src/routes/spaces/[space]/[area]/+page.svelte`
- `src/lib/components/layout/ConversationItem.svelte`
- `src/routes/+layout.svelte`
- `src/routes/+page.svelte`
- `BACKLOG.md`

**Commits Made:**
- `69ae980` - feat: Add contextual quick starts with prepopulate support
- `18ea44f` - feat: Add confirmation modal for clearing main nav conversations
- `ececd9d` - feat: Improve area conversation drawer grouping and styling

**Next steps:**
- Complete Move Chat Modal integration (test and debug)
- Continue Areas Architecture work

### Previous: 2026-01-08 (Model Arena Redesign - COMPLETE)

**Model Arena UX Redesign - All Phases Complete:**

*Setup Screen (Phases 1-2):*
- Quick Start template dropdown with category filtering
- "Customize Your Battle" section with category chips + context picker
- Mutually exclusive modes: template selected hides customize, customizing hides templates
- Smart model selection with grid expansion, "Surprise me", click-outside collapse

*Battle Experience:*
- Sword burst animation on battle start (900ms, 10 particles)
- 2-column max response grid for readability
- Focus mode: expand button to view single response full-width (Escape to exit)
- Copy response button with visual feedback
- Enhanced token usage display (total + breakdown)

*Voting & Results:*
- Winner badge timing fix: only shows after user votes/skips
- Blind mode reveal animation (cascading scale/fly transitions)
- Vote-first flow with ArenaVotingPrompt
- AI Judge with score comparison

*Post-Battle:*
- Continue conversation modal with Space/Area pre-fill
- New Battle options

**Files Modified:**
- `src/routes/arena/+page.svelte` - Main arena page with all features
- `src/lib/components/arena/ArenaResponseCard.svelte` - Focus mode, copy, tokens, reveal animation
- `src/lib/components/arena/ArenaGrid.svelte` - Focus mode layout support
- `src/lib/components/arena/ArenaQuickStart.svelte` - Template dropdown
- `src/lib/components/arena/ArenaModelSelection.svelte` - Grid improvements
- `src/lib/components/arena/ArenaInput.svelte` - Sword burst animation, template reset
- `src/lib/components/arena/ArenaCategoryChips.svelte` - Removed duplicate label
- `src/lib/components/arena/ArenaContextPicker.svelte` - Side-by-side layout

**Deferred to Future:**
- Phase 6 (BattleOutcome persistence): Documented in BACKLOG.md for Rankings Dashboard
- Mobile responsiveness: Added to Known Issues (app-wide concern)

**Next steps:**
- Continue with Areas Architecture Redesign work
- Address mobile responsiveness across application

### Previous: 2026-01-07 (Session Log Cleanup)

**Verified as Complete:**

*Task Planning Model Selection - FULLY WIRED:*
- `TaskPlanningModelModal.svelte` shows tiered model selection
- "Help me plan this" button -> `handlePlanButtonClick()` -> shows modal (or skips if preference saved)
- Modal selection -> `handlePlanningModelSelect()` -> `handleStartPlanMode(modelId)`
- Conversation created WITH selected model, initial planning message sent
- Skip modal option with localStorage persistence works

*Day Change Detection - FULLY IMPLEMENTED:*
- `temporal-context.ts` - tracks visits, detects new day/Monday/absence (3+ days)
- `greeting.ts` - generates context-aware greetings based on tasks, urgency, time of day
- `GreetingMessage.svelte` - displays greeting with task previews and action buttons
- `FocusSuggestion.svelte` - uses temporal context for suggestions

*Area Deletion (from previous session):*
- `DeleteAreaModal.svelte` with keep/delete content options
- Context menu on `AreaCard.svelte` (three-dot button)
- General area protected from deletion

**Note:** Previous "Next steps" were stale - these features were already complete.

### Previous: 2026-01-07 (Multiple Plan Mode & Model Selection)

**Completed:**

*Documents API Fix:*
- Normalized documents with slug-style space_ids to UUIDs
- Migration `011-documents-space-id-normalize.sql` (already applied)

*Task Loading Race Condition Fix:*
- Changed from `onMount` to reactive `$effect` for space switching

*Multiple Plan Mode Support:*
- Multiple tasks can be in planning simultaneously
- `PlanningTasksIndicator.svelte` - purple badge in header with dropdown

*Task Planning Model Selection:*
- `TaskPlanningCapabilities` interface with tiers (recommended/capable/experimental)
- `TaskPlanningModelModal.svelte` - tiered model selection with localStorage persistence
- Full flow wired: button → modal → model selection → conversation creation → planning

### Previous: 2026-01-06 (Task Focus UX & Navigation Fixes)

**Completed:**
- Fixed "Open Task Focus" to preserve current conversation via `conversationId` query param
- Hidden empty subtasks panel - only shows when subtasks actually exist
- Added context isolation: clears conversation when entering area if it doesn't belong
- `ModelBadge.svelte` - compact badge showing locked model
- Renamed `DocsPanel` to `ContextPanel`
- Added `estimated_effort` field to tasks

### Previous: 2026-01-06 (Task Dashboard & Scaling UX)

**Completed:**
- `TaskDashboard.svelte` - time-based task grouping
- `TaskGroupSection.svelte`, `TaskCard.svelte`, `StatsRow.svelte`, `FocusSuggestion.svelte`
- `RecentlyCompletedSection.svelte` with reopen action
- Stale task detection (7+ days no activity)
- `dismissStale()` and `reopenTask()` methods

### Previous: 2026-01-04 (Task Planning & AI Prompt Engineering)

**Completed:**
- `TaskModal.svelte` - modal for task creation
- ConversationDrawer, TaskContextBanner, AreaWelcomeScreen components
- Space dashboard components and area routing

---

## Context Preservation

**On compacting:** Re-read this file immediately.

Retain:
- Current phase and focus
- Recent session work
- Decision Log entries
- Collaboration model (pushback welcome)

**For agents at session start:**
1. Check Session Log for recent work
2. Review Known Issues before related changes
3. Respect Decision Log

**At session end:**
1. Update Session Log (move old entries to SESSIONS.md)
2. Update Known Issues if debt introduced
3. Add to Decision Log for significant architecture choices
