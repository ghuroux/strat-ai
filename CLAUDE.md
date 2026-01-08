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

- [ ] localStorage keys use `strathost-` prefix (will lose POC data on rename)
- [ ] README.md outdated (needs rewrite)
- [ ] No error boundaries (add before production)

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

### Latest: 2026-01-08 (Model Arena Redesign)

**Completed:**

*Arena UX Improvements (Phases 1-5, 7):*
- Phase 1: Added `isArena` route check to Header, removed sidebar from Arena page for focused experience
- Phase 2: Created `ArenaCategoryChips.svelte` for filtering battles by category (coding, analysis, creative, general, etc.)
- Phase 3: Extended AI Judge endpoint with automatic category detection - suggests category when "general" selected
- Phase 4: Created `ArenaContextPicker.svelte` for injecting Space/Area context into battle prompts
- Phase 5: Created `ArenaContinueModal.svelte` for continuing winning battles as full conversations
- Phase 7: Updated BACKLOG.md with Arena Rankings Dashboard future feature

*Arena Store Enhancements:*
- Added category state and `BattleSettings` type to arena store
- Category persistence across battles

*Deferred to Future:*
- Phase 6 (BattleOutcome): Comprehensive data model and migration documented in BACKLOG.md

**Files Created:**
- `src/lib/components/arena/ArenaCategoryChips.svelte`
- `src/lib/components/arena/ArenaContextPicker.svelte`
- `src/lib/components/arena/ArenaContinueModal.svelte`
- `src/lib/components/arena/index.ts`

**Files Modified:**
- `src/lib/components/layout/Header.svelte`
- `src/routes/arena/+page.svelte`
- `src/lib/stores/arena.svelte.ts`
- `src/routes/api/arena/judge/+server.ts`
- `BACKLOG.md`

**Next steps:**
- Implement BattleOutcome persistence (Phase 6) when ready for Arena Rankings Dashboard
- Continue with Areas Architecture Redesign work

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
