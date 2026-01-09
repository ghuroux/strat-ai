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
- `stratai-main/ENTITY_MODEL.md` - **Authoritative data architecture** (implementation source of truth)
- `stratai-main/docs/CONTEXT_STRATEGY.md` - **Context/memory architecture** (WHAT to store - moat-level work)
- `stratai-main/docs/context-loading-architecture.md` - **Just-in-time context loading** (HOW to load via tool calling)
- `stratai-main/docs/COST_OPTIMIZATION_STRATEGY.md` - **LLM cost optimization** (50-85% savings roadmap)
- `stratai-main/docs/auto-model-routing-research.md` - **Model routing research** (smart routing strategies)
- `stratai-main/docs/UI_AUDIT.md` - **UI cleanup audit** (mobile, light mode, consistency)
- `stratai-main/PRICING_STRATEGY.md` - **Pricing strategy V1 (launch) + V2 (evolution)**
- `stratai-main/PRODUCT_VISION.md` - Product vision and roadmap
- `stratai-main/BACKLOG.md` - Feature backlog and priorities
- `stratai-main/docs/enterprise-roadmap.md` - Implementation phases and timeline

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
| Models as first-class entities | Enable per-model guardrails, not just tier-level |
| Two Space types (org/personal) | Clear governance boundary, appropriate context propagation |
| Areas as collaboration unit | Granular sharing without exposing entire Spaces |
| Separate subscription from governance | Tiers for billing, guardrails for access control (orthogonal) |
| `space_id` in usage_records | Enable V2 project-based cost attribution |

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

### Latest: 2026-01-09 (Cost Optimization Strategy)

**Completed:**

*Comprehensive Cost Optimization Research:*
- Launched 6 parallel research agents covering:
  - Prompt compression (LLMLingua-2, Chain-of-Draft)
  - Advanced caching (semantic caching, prefix caching, KV cache)
  - Multi-model strategies (cascading, speculative decoding, distillation)
  - Provider economics (batch APIs, committed use, pricing trends)
  - Output optimization (token-efficient tools, max tokens, structured outputs)
  - Emerging techniques (vLLM, SGLang, dynamic token pruning)

*Codebase Analysis for Optimization Opportunities:*
- Analyzed LLM integration points in `chat/+server.ts`
- Reviewed system prompt structure in `system-prompts.ts`
- Examined existing caching in `tool-cache-postgres.ts`
- Identified model pricing configuration in `model-pricing.ts`

*COST_OPTIMIZATION_STRATEGY.md - Comprehensive Document:*

**Key Findings:**
- Anthropic prompt caching: 90% savings on cache reads
- Model routing/cascading: 40-85% cost reduction (RouteLLM)
- Batch APIs: 50% automatic discount (OpenAI, Anthropic)
- Semantic caching: 40%+ savings on repeated queries
- Token-efficient tools header: 14-70% output reduction

**StratAI-Specific Opportunities Identified:**
1. System prompt caching structure (25-30% savings)
2. Enable GPT/Gemini cache optimization (10-15% savings)
3. Model cascading via LiteLLM (40-60% savings)
4. Task-level document caching vs conversation-level (15-25% savings)
5. Token-efficient tools header for Claude (14-70% output savings)
6. Batch API for non-interactive work (50% savings)

**Implementation Roadmap:**
- Phase 1 (Week 1-2): Quick wins - token-efficient tools, prompt restructuring
- Phase 2 (Week 3-4): Model routing - query classifier, cascade fallback
- Phase 3 (Week 5-8): Batch & semantic caching infrastructure

**Target Outcomes:**
- Cost per conversation: ~$0.15-0.50 → ~$0.03-0.10 (50-85% reduction)
- Cache hit rate: ~10% → 60-80%
- Cheap model usage: 0% → 40-60%

**Files Created:**
- `stratai-main/docs/COST_OPTIMIZATION_STRATEGY.md` - Full strategy document

**Files Modified:**
- `CLAUDE.md` - Added strategic document reference, session log

**Next Steps:**
- Phase 1 implementation: Token-efficient tools header, prompt restructuring
- Set up cost monitoring dashboard
- Implement simple model routing heuristics

### Previous: 2026-01-09 (Usage Tracking & Auto Model Routing Research)

**Completed:**

*Usage Tracking Cache Fix:*
- Fixed cache metrics not being saved to database
- Root cause: Code extracted cache from HTTP headers, but Anthropic returns in usage object
- Fixed `handleChatWithTools` at lines 1331-1345 to extract from `responseData.usage`
- Added logging: `[Cache] model: created=X, read=Y tokens`

*Auto Model Routing Research:*
- Comprehensive research on LLM model routing approaches (Jan 2026)
- Analyzed industry players: OpenRouter Auto, Martian, Not Diamond, RouteLLM
- Documented approaches: Rule-based, Embedding-based, Classifier, Meta-model, Cascading
- Research finding: 2-5x cost savings possible without quality degradation
- Created strategic document: `stratai-main/docs/auto-model-routing-research.md`

*Recommended Hybrid Approach:*
- Tier 1: Explicit context rules (Space/Area type → model preference)
- Tier 2: Fast signal detection (code patterns, keywords, query length)
- Tier 3: Embedding-based classification (~50ms, for ambiguous queries)
- Tier 4: User preference learning (personalization over time)

**Files Created:**
- `stratai-main/docs/auto-model-routing-research.md` - Complete research & strategy document

**Files Modified:**
- `src/routes/api/chat/+server.ts` - Fixed cache metrics extraction in handleChatWithTools

**Key Research Sources:**
- RouteLLM (LMSYS, ICLR 2025) - 85% cost reduction at 95% quality
- OpenRouter Auto Router - Meta-model analysis
- Martian - Model behavior prediction, 98% cost savings claim
- Red Hat Semantic Router - Embedding-based approach

**Next Steps:**
- Finalize Auto routing approach (leaning embedding-based with explicit rules for Spaces)
- Phase 1 implementation: Model capabilities matrix, basic context rules
- Test cache metrics capture with new fix

### Previous: 2026-01-09 (Command Palette & Enterprise Foundation)

**Completed:**

*Command Palette (Cmd+K / Ctrl+K):*
- `src/lib/stores/commandPalette.svelte.ts` - Store for open/close state and search query
- `src/lib/config/commands.ts` - Command definitions (~580 lines):
  - Static commands: navigation (Home, Arena, Spaces), actions (New Chat, Toggle Sidebar), settings (Theme toggle)
  - Dynamic commands: Spaces, Areas, Tasks (auto-populated from stores)
- `src/lib/components/CommandPalette.svelte` - Full UI (~490 lines):
  - Search input with live filtering
  - Keyboard navigation (Arrow keys, Enter, Escape)
  - Category grouping (Navigation, Actions, Settings, Conversations)
  - Fuzzy matching on labels, descriptions, and keywords
- Integrated into `+layout.svelte` with global Cmd+K/Ctrl+K shortcut

*Conversation Search in Command Palette:*
- 'conversations' category only appears when searching (2+ chars)
- Smart scoring: title starts (100pts) > title contains (50pts) > message contains (25pts)
- Searches 100 most recent conversations, first 10 messages each, returns max 8 results
- Rich context display showing where conversations live (Main Chat, Space, Area, Task)
- Smart icons based on context (MessageSquare, FolderOpen, Target, ListTodo)
- `getSpaceByIdOrSlug()` helper for system spaces (slug-based) vs custom spaces (UUID)
- `isConversationContextValid()` filters out orphaned conversations

*Enterprise Auth Foundation:*
- `getRequiredUser()` helper in `src/lib/server/auth.ts`
- API route authentication added across all endpoints (areas, documents, spaces, tasks, chat)
- Session handling updates in hooks and login flow
- User persistence layer (`users-postgres.ts`, `users-schema.sql`)
- Organization persistence layer (`organizations-postgres.ts`, `org-memberships-postgres.ts`)
- User ID mappings for Auth0 integration preparation

*Admin Infrastructure:*
- `src/routes/admin/+page.svelte` - Admin dashboard page (~900 lines)
- `src/routes/admin/+page.server.ts` - Server-side data loading
- `src/lib/components/admin/UsageDashboard.svelte` - Usage analytics component
- `src/lib/components/admin/UsageChart.svelte` - Usage visualization
- Database migrations: 015 (foundation), 016 (user-id-uuid), 017 (llm-usage)

*Documentation:*
- Moved `CONTEXT_STRATEGY.md` to `docs/` directory
- Removed deprecated `DESIGN-CHAT-CONTEXT-AWARENESS.md`
- Added comprehensive light mode styling to `app.css` (~120 lines)

*Other:*
- `src/lib/config/model-pricing.ts` - Model cost calculations
- `src/lib/components/layout/UserMenu.svelte` - Auth UI component
- `src/routes/+layout.server.ts` - Layout server load function

**Files Created:**
- `src/lib/stores/commandPalette.svelte.ts`
- `src/lib/components/CommandPalette.svelte`
- `src/lib/config/commands.ts`
- `src/lib/config/model-pricing.ts`
- `src/lib/components/layout/UserMenu.svelte`
- `src/lib/components/admin/UsageDashboard.svelte`
- `src/lib/components/admin/UsageChart.svelte`
- `src/routes/admin/+page.svelte`
- `src/routes/admin/+page.server.ts`
- `src/routes/+layout.server.ts`
- `src/lib/server/persistence/users-postgres.ts`
- `src/lib/server/persistence/users-schema.sql`
- `src/lib/server/persistence/organizations-postgres.ts`
- `src/lib/server/persistence/organizations-schema.sql`
- `src/lib/server/persistence/org-memberships-postgres.ts`
- `src/lib/server/persistence/org-memberships-schema.sql`
- `src/lib/server/persistence/usage-postgres.ts`
- `src/lib/server/persistence/user-id-mappings-postgres.ts`
- `src/lib/server/persistence/user-id-mappings-schema.sql`
- `src/lib/server/persistence/migrations/015-foundation-tables.sql`
- `src/lib/server/persistence/migrations/016-user-id-uuid-migration.sql`
- `src/lib/server/persistence/migrations/017-llm-usage.sql`
- `docs/UI_AUDIT.md`
- `docs/context-loading-architecture.md`

**Files Modified:**
- `src/routes/+layout.svelte` - CommandPalette integration
- `src/app.css` - Light mode styling for command palette
- `src/lib/server/auth.ts` - getRequiredUser helper
- `src/hooks.server.ts` - Session handling
- All API routes - Authentication middleware
- `BACKLOG.md` - New items added

**Key Decisions:**
- Command Palette uses Cmd+K (Mac) / Ctrl+K (Windows) - standard convention
- Conversation search only activates at 2+ characters (reduces noise)
- Orphaned conversations filtered out to prevent navigation errors
- Enterprise auth uses session-based approach with Auth0 preparation

**Next Steps:**
- Test Command Palette across different scenarios
- Complete enterprise auth integration with Auth0
- Run database migrations for new schema

### Previous: 2026-01-09 (Entity Model Architecture)

**Completed:**

*Entity Model Document - ENTITY_MODEL.md:*
- Created authoritative data architecture reference (implementation source of truth)
- Comprehensive 1800+ line document covering all entity definitions

*Key Architectural Decisions:*
- **Models as first-class entities**: Separate `models` table (individual LLMs) from `model_tiers` (subscription bundles) - enables per-model guardrails
- **Two Space types**: `organizational` (org-provided, auto-access via groups) vs `personal` (user-created) - clear governance boundary
- **Areas as collaboration unit**: Granular sharing via `area_memberships` (users + groups) without exposing entire Spaces
- **Separate subscription from governance**: Tiers for billing, guardrails for access control (orthogonal concerns)
- **Private Areas in Org Spaces**: Users can create restricted areas for incubation before sharing

*Entity Hierarchy Defined:*
```
Platform: Models, Model Tiers, Guardrails
Organization: Organizations, Groups, Users, Profiles, Memberships
Workspace: Spaces (org/personal), Areas, Tasks
Context: Conversations, Messages, Memories, Documents
Operations: Usage Records, Budgets, Invoices, Audit Log
```

*Complete Schema Defined:*
- 25+ tables with full DDL
- All constraints and relationships
- Access resolution algorithms (Space, Area, Model access)
- Guardrails resolution logic (stacking, most-restrictive-wins)
- Comprehensive index strategy for all query patterns
- Migration path from current state (8 phases)

*Clarifications from Discussion:*
- "Modules" = "Model Tiers" (subscription bundles for billing)
- Individual model guardrails = governance layer (separate from tiers)
- Spaces = broad context container (Work, Department)
- Areas = sub-context with collaboration (Client, Project)

**Files Created:**
- `stratai-main/ENTITY_MODEL.md` - Complete entity model reference

**Files Modified:**
- `CLAUDE.md` - Added entity model to strategic documents, added decisions to Decision Log

**Key Decisions Made:**
1. Models as first-class entities (enable per-model guardrails)
2. Two Space types (organizational/personal) with clear governance boundary
3. Areas as collaboration unit with group + user invites
4. `is_restricted` flag for private Areas in org Spaces
5. `space_id` in usage_records for V2 project attribution
6. Separate document from enterprise-roadmap (schema vs implementation)

**Next Steps:**
- Review ENTITY_MODEL.md for final approval
- Begin Phase 1 migrations (organization infrastructure)
- Update enterprise-roadmap.md to reference entity model for schema details

### Previous: 2026-01-08 (LLM Gateway Evaluation & Enterprise Architecture)

**Completed:**

*LLM Gateway Evaluation - LiteLLM vs Bifrost:*
- Researched Bifrost OSS vs LiteLLM OSS for B2B multi-tenant requirements
- Tested both gateways with load testing scripts
- **Key finding:** Bifrost OSS is SQLite-only (PostgreSQL requires Enterprise license)
  - This breaks horizontal scaling for production multi-tenant deployment
- **Recommendation:** LiteLLM OSS remains the right choice
  - PostgreSQL included in OSS version
  - Enables horizontal scaling
  - Virtual keys for per-customer API key management
- Created comprehensive evaluation: `stratai-main/docs/llm-gateway-evaluation.md`

*Enterprise Architecture Roadmap:*
- Analyzed gaps between current single-tenant app and B2B enterprise vision
- Clarified "Modules" terminology = Model Access Tiers (Basic/Standard/Premium)
- **Auth decision:** Auth0 recommended (3 days vs 3 weeks to build custom)
  - SSO-ready for enterprise upsell
  - RBAC support built-in
- **SSO analysis:** Phase 3 feature (enterprise tier upsell, not launch blocker)
- Multi-tenancy architecture designed:
  - Org -> Group -> User hierarchy
  - `org_id` column migration for all tenant-scoped tables
  - Row-level security considerations
- 4-week implementation timeline:
  - Phase 1: Auth0 integration (3 days)
  - Phase 2: Multi-tenancy core (5 days)
  - Phase 3: Model tiers + virtual keys (4 days)
  - Phase 4: Usage tracking (3 days)
- Created comprehensive roadmap: `stratai-main/docs/enterprise-roadmap.md`

**Files Created:**
- `stratai-main/docs/llm-gateway-evaluation.md` - LiteLLM vs Bifrost comparison
- `stratai-main/docs/enterprise-roadmap.md` - Full B2B transformation plan

**Files Modified:**
- `docker-compose.yml` - Added Bifrost environment variables for testing
- `.gitignore` - Added Bifrost SQLite files (data/*.db)

**Key Decisions Made:**
1. **LiteLLM OSS** - Stick with it (PostgreSQL enables horizontal scaling)
2. **Modules = Model Tiers** - Basic/Standard/Premium model access levels
3. **Auth0** for authentication (speed to market, SSO-ready)
4. **SSO in Phase 3** - Enterprise upsell, not launch requirement
5. **Admin via RBAC** - In main app, not separate admin routes

**Next Steps:**
- Phase 1: Auth0 integration (3 days)
- Phase 2: Multi-tenancy core with org_id migration (5 days)
- Phase 3: Model tiers + virtual keys (4 days)
- Phase 4: Usage tracking (3 days)
- Internal pilot target: ~3-4 weeks
- External beta target: +1 month

### Previous: 2026-01-08 (Pricing Strategy)

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
