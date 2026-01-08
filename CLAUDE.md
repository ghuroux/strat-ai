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

**Current phase:** Context Management Architecture - building intelligent memory and context persistence.

**Strategic Documents:**
- `stratai-main/CONTEXT_STRATEGY.md` - **Foundational context/memory architecture** (moat-level work)
- `stratai-main/PRICING_STRATEGY.md` - **Pricing strategy V1 (launch) + V2 (evolution)**
- `stratai-main/PRODUCT_VISION.md` - Product vision and roadmap
- `stratai-main/BACKLOG.md` - Feature backlog and priorities

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
| PostgreSQL + pgvector | Simplicity over dedicated vector DB; existing stack, sufficient scale |
| text-embedding-3-small | Cost efficiency ($0.02/1M tokens), good performance for memory search |
| Bi-temporal memory model | Enterprise compliance needs; track when events occurred AND when learned |
| Hybrid search (semantic + keyword) | Research shows 67% improvement over semantic-only |
| Hierarchical memory | Space → Area → Task mirrors cognitive memory patterns (research-backed) |
| Memory unlimited on paid tiers | Core value prop; monetize collaboration/governance instead |
| $29 Pro price point | Signals enterprise quality, above commodity ($10-15), below enterprise ($50+) |
| V2 as evolution not pivot | V1 proves value and funds V2 development; smooth transition |
| Premium models at cost + 25% | Transparency builds trust; competitive margin |

---

## Known Issues

- [ ] **Mobile responsiveness** - App-wide issue; layouts break on small screens (Arena, Spaces, Chat). Needs systematic review.
- [ ] **localStorage quota exceeded** - Chat store hitting storage limits. **Addressed by CONTEXT_STRATEGY.md Phase 1** (server-side persistence)
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

### Latest: 2026-01-08 (Pricing Strategy)

**Completed:**

*Pricing Strategy Document - PRICING_STRATEGY.md:*

**V1: Launch Pricing (Per-Seat Model)**
- **Explorer** (Free): 100 msgs/mo, 1 space, session memory only - conversion funnel entry
- **Pro** ($29/user/mo): Unlimited messages, full memory persistence, all standard models
- **Team** ($45/user/mo, min 3 seats): Shared spaces, team context, basic admin
- **Enterprise** (Custom ~$65+): Org memory, governance, SSO/SAML, audit logs, SLA

*Strategic Principles:*
- Memory unlimited on paid tiers (don't monetize the moat)
- Premium models at cost + 25% (transparency builds trust)
- Volume discounts encourage adoption (10-20% based on seats)
- Annual commitment: 17% off (2 months free)

**V2: Enterprise AI Operating System (Future Evolution)**
- Pricing shifts to % of AI spend managed (8-15% based on tier)
- AI Spend Dashboard with real-time cost tracking by team/project
- Intelligent Cost Optimization (smart model routing, recommendations)
- ROI Measurement (the holy grail - prove AI investment returns)
- Path to $1B valuation with <200 enterprise customers

*Revenue Projections (V1):*
- Year 1: ~$750k ARR (conservative)
- Year 2: ~$4.5M ARR (growth)
- Year 3: ~$19M ARR (scale)

*Key Strategic Insight:*
- V1 proves the value, funds development, builds data foundation
- V2 captures full enterprise opportunity once platform and market ready
- The "AI Tax" play: become the financial control plane for enterprise AI

**Files Created:**
- `stratai-main/PRICING_STRATEGY.md` - Comprehensive pricing strategy document

**Files Modified:**
- `CLAUDE.md` - Added pricing strategy reference

**Key Decisions:**
- Memory unlimited (don't monetize core value prop)
- $29 Pro signals quality, not commodity
- V2 as evolution, not pivot (smooth transition path)

**Next steps:**
- Begin CONTEXT_STRATEGY.md Phase 1 implementation
- Build billing infrastructure when ready for launch
- Gather usage data to validate pricing assumptions

### Previous: 2026-01-08 (Context Management Strategy + Organizational Knowledge)

**Completed:**

*Strategic Research - Context Management:*
- Launched 6 parallel research agents covering:
  - LLM memory architectures (MemGPT/Letta, MemoryOS, hierarchical systems)
  - RAG and retrieval innovations (GraphRAG, Agentic RAG, hybrid search)
  - Commercial product patterns (ChatGPT Memory, Claude Projects, Cursor/Windsurf)
  - Academic research (long context models, attention optimization, infinite context)
  - Startup innovations (Mem0, Zep/Graphiti, LangMem)
  - Database/storage strategies (vector DBs, graph DBs, hybrid patterns)

*CONTEXT_STRATEGY.md - Comprehensive Architecture Document:*

**Phase 1: Foundation**
- PostgreSQL + pgvector, conversation persistence migration
- Memory search (semantic + keyword + hybrid)
- Basic memory UI in Context Panel

**Phase 2: Active Memory**
- Memory extraction pipeline (post-conversation)
- Memory evaluation and deduplication
- Decay and consolidation services
- Context assembly service

**Phase 3: Shared Context** (NEW)
- Space-level and Area-level shared context
- Approval workflows for memory sharing
- Memory proposals and review system
- Context inheritance queries

**Phase 4: Organizational Intelligence** (NEW)
- Multi-tenant infrastructure (organizations, groups)
- Full context hierarchy: Org → Group → Space → Area → User
- Admin dashboards and governance tools
- Compliance and audit features

*Organizational Knowledge Architecture:*
- Knowledge propagation model with clear hierarchy
- Contribution mechanism (explicit sharing + auto-detection)
- Conflict resolution strategies (temporal, admin, scope, confidence)
- Privacy and governance controls at every level
- Integration with planned admin panel hierarchy
- Business case: "Your organization's AI brain"
- Network effects: more users = smarter AI for everyone

*Database Schemas Added:*
- `organizations` - Multi-tenant support
- `groups` - Teams/departments within orgs
- `user_memberships` - Roles and permissions
- `memory_proposals` - Approval workflow
- `context_audit_log` - Compliance tracking

*UI Fix:*
- Standardized chat input styling across space/area/task pages
- Removed redundant input-container border that created visual inconsistency

**Files Created:**
- `stratai-main/CONTEXT_STRATEGY.md` - Strategic architecture document (1800+ lines)

**Files Modified:**
- `src/routes/spaces/[space]/[area]/+page.svelte` - Removed input-container wrapper
- `src/routes/spaces/[space]/task/[taskId]/+page.svelte` - Removed redundant border
- `CLAUDE.md` - Updated with new phase, decisions, and strategy reference

**Commits Made:**
- `a7096c6` - fix: Standardize chat input styling across space/area/task pages

**Key Strategic Decisions:**
- Hierarchical inheritance mirrors org structure (Org → Group → Space → Area)
- Approval workflow for sharing (trust and quality control)
- Temporal conflict resolution as default (most intuitive, auditable)
- Network effects as moat (knowledge compounds with usage)

**Next steps:**
- Review CONTEXT_STRATEGY.md and validate organizational approach
- Begin Phase 1: Database migrations, embedding service
- Design memory UI components in parallel

### Previous: 2026-01-08 (Quick Starts, Clear Modal, Move Chat)

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

*Move Chat Modal:*
- `MoveChatModal.svelte` - destination picker for moving conversations between Main Chat, Spaces, and Areas
- `moveChatModal.svelte.ts` - global store for modal state (open/close/move methods)
- Context menu "Move Chat..." option on conversation items in sidebar
- Dynamic area loading when space is selected, auto-selects General area
- Shows success toast on move completion
- Refactored from per-page to global store pattern for reusability

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
- `9843552` - feat: Add Move Chat modal for relocating conversations

**Next steps:**
- Continue Areas Architecture work
- Test Move Chat functionality across different scenarios

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
