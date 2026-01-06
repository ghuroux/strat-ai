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

### Latest: 2026-01-06 (Task Dashboard & Scaling UX)

**Completed:**

*Task Dashboard (`/spaces/[space]/tasks`):*
- `TaskDashboard.svelte` - main dashboard with time-based task grouping
- `TaskGroupSection.svelte` - reusable section component with "Show More" pattern (caps at 5 visible tasks)
- `TaskCard.svelte` - individual task card with subtask progress, area badges, due dates
- `StatsRow.svelte` - shows completion streak and daily stats
- `FocusSuggestion.svelte` - suggests what to work on based on priority/overdue

*Recently Completed Section:*
- `RecentlyCompletedSection.svelte` - shows today's completions by default
- Expands to show this month's completions (flat list, newest first)
- Fixed visibility bug - now shows even when no tasks completed today
- Reopen action to restore completed tasks
- TODO added for future pagination if 100+ completions

*Stale Task Detection:*
- Tasks flagged as stale after 7+ days no activity
- `stale_dismissed_at` column for users to dismiss stale warnings
- Migration `008-task-stale-dismissed.sql` adds the column
- `dismissStale()` method in store and API

*Reopen Task:*
- New API endpoint `/api/tasks/[id]/reopen`
- `reopenTask()` method in store
- Clears `completedAt` and sets status back to active

*Bug Fixes:*
- Fixed nested button error (button inside button) using div with role="button"
- Fixed visibility condition for Recently Completed section

**BEFORE STARTING NEXT SESSION - Run database migration:**
```bash
psql -d stratai -f src/lib/server/persistence/migrations/008-task-stale-dismissed.sql
```
This adds the `stale_dismissed_at` column to the tasks table. Without this, stale dismissal will fail.

**Next steps:**
- Continue Phase 0.3e: Temporal Awareness (day change detection, cleanup offers)
- Add keyboard shortcuts for common task actions
- Consider adding task time estimates

### Previous: 2026-01-04 (Task Planning & AI Prompt Engineering)

**Completed:**
- `TaskModal.svelte` - modal for task creation with title, due date, deadline type (soft/hard), priority (normal/high), and area linking
- `TasksSection.svelte` - task list component with modal-based creation (replaced inline input)
- `SpaceDashboard.svelte` - integrated TaskModal with full `CreateTaskInput` type support
- ConversationDrawer, TaskContextBanner, AreaWelcomeScreen components
- Space dashboard components and area routing
- Migrations 005-areas-rename-migrate.sql and 006-tasks-area-rename.sql

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
