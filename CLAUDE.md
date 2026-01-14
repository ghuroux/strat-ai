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
- `stratai-main/docs/DATABASE_STANDARDIZATION_PROJECT.md` - **🔴 CRITICAL: Database standardization** (snake_case vs camelCase, postgres.js guide, reference for all DB work)
- `stratai-main/docs/DOCUMENT_SYSTEM.md` - **Pages system** (AI-native created content - Area-level, TipTap editor)
- `stratai-main/docs/DOCUMENT_SHARING.md` - **Document sharing** (uploaded files - Space storage, Area-level sharing)
- `stratai-main/docs/GUIDED_CREATION.md` - **Guided creation system** (templates as data schemas, Meeting Notes first)
- `stratai-main/docs/CONTEXT_STRATEGY.md` - **Context/memory architecture** (WHAT to store - moat-level work)
- `stratai-main/docs/context-loading-architecture.md` - **Just-in-time context loading** (HOW to load via tool calling)
- `stratai-main/docs/COST_OPTIMIZATION_STRATEGY.md` - **LLM cost optimization** (50-85% savings roadmap)
- `stratai-main/docs/auto-model-routing-research.md` - **Model routing research** (smart routing strategies)
- `stratai-main/docs/AUTO_MODEL_ROUTING.md` - **AUTO routing implementation** (complexity analysis, tiers)
- `stratai-main/PRICING_STRATEGY.md` - **Pricing strategy V1 (launch) + V2 (evolution)**
- `stratai-main/PRODUCT_VISION.md` - Product vision and roadmap
- `stratai-main/BACKLOG.md` - Feature backlog and priorities
- `stratai-main/docs/enterprise-roadmap.md` - Implementation phases and timeline
- `stratai-main/docs/SENDGRID_EMAIL_INTEGRATION.md` - **Email system** (SendGrid, password reset, future notifications)
- `stratai-main/docs/MODEL_CONFIGURATION_SYSTEM.md` - **Model configuration** (parameter constraints, runtime overrides, Admin UI)
- `stratai-main/docs/SPACE_MEMBERSHIPS.md` - **Space memberships & Org Spaces** (collaboration model, Guest role, "Shared with Me")
- `stratai-main/docs/CONFLUENCE_COMPETITIVE_ANALYSIS.md` - **Competitive intelligence** (Confluence pain points, feature gaps, opportunities)
- `stratai-main/docs/MEETING_LIFECYCLE.md` - **Meeting lifecycle system** (end-to-end: AI-guided creation → Teams scheduling → transcript capture → context integration)
- `stratai-main/docs/AI_RETRIEVAL_ARCHITECTURE.md` - **AI retrieval mechanics** (how AI accesses org knowledge via tools, graph traversal, semantic search)

---

## Development Principles

- **Quality over speed** - Baby steps, every feature earns its place, address tech debt immediately
- **No bloat** - Every line justified, simple over clever, prefer removing code
- **Performance first** - Optimize time-to-first-token, UI responsiveness, prompt caching
- **UX excellence** - Reduce cognitive load (paramount), clean/clear/premium aesthetic
- **Database access** - ALWAYS use camelCase for column access (postgres.js transforms snake_case → camelCase). See `DATABASE_STANDARDIZATION_PROJECT.md` before any DB work.

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
| WorkOS for auth | 1M MAU free tier, native SvelteKit SDK, predictable SSO pricing ($125/connection), B2B focus |
| TipTap for document editor | ProseMirror-based, extensible, Y.js compatible for future real-time collab |
| Pages in Areas (not Spaces) | Natural filing - work context determines location, reduces "where do I put this" |
| AI-native docs, not bolted on | Inline suggestions, guided creation, chat panel - AI woven into experience |
| Page visibility: private/shared | Simple binary for V1; per-user/group sharing is V2 complexity |
| Document ↔ Chat bidirectional | Docs created from chat, chat discusses docs - peers not hierarchy |
| Documents vs Pages | **Documents** = uploaded files (Space-level, activate per-area); **Pages** = created content (Area-level, born from context) |
| Document Area-level sharing | Documents stored at Space (dedup), shared at Area (precision, no noise). Unshare auto-deactivates. V2 adds cross-Space references. |
| Templates as data schemas | Guided creation collects structured JSON, renders to TipTap + creates entities (Tasks) |
| Meeting Notes first template | Most common, clearest structure, proves pattern before expanding |
| Guided creation progressive disclosure | Card-based interview (not wizard forms), skip always available, context does heavy lifting |
| Decisions feed context hierarchy | Structured decisions from meetings bubble up to Area memory (CONTEXT_STRATEGY.md integration) |
| Model config: hybrid code + DB | Code provides type-safe defaults; DB enables runtime fixes without deployment; Admin UI for quick tweaks |
| Space membership = gateway | Must be Space member to access ANY areas; prevents orphan content, maintains context chain |
| Guest role for externals | Limited Space role (only sees shared areas); enables collaboration without full org access |
| Org Space name = editable | Defaults to org name; admins can customize in settings |
| "Shared with Me" in Org Space | Convenience view, not separate container; areas link to actual Space/Area URL |
| No cross-Space area visibility | Would break context hierarchy; sharing requires Space membership first |
| Meeting lifecycle end-to-end | Create → Schedule → Capture → Process → Context. Meetings are context generators, not just calendar events |
| Microsoft Graph for calendar | Direct API integration for control; MCP considered for future multi-integration standardization |
| Transcript: manual first, auto second | Manual upload reliable; Teams API depends on tenant policies. Graceful degradation over hard requirements |
| AI extraction with human confirmation | AI suggests decisions/actions, humans confirm ownership. Never auto-commit without review |
| Meetings create Pages + Tasks + Context | Finalization generates minutes Page, creates Tasks from actions, propagates decisions to Area memory |
| Graph-ready, not graph-native | Capture relationships in PostgreSQL `entity_relationships` table now; add Neo4j/Neptune later when CTEs >500ms or need recommendations |
| entity_relationships table | Universal edge table for typed relationships (attended, produced, informed_by, etc.); enables expertise discovery, provenance chains |
| AI retrieval via tools | AI has no inherent org knowledge; uses tool calls to query data, then reasons over results. Semantic + hierarchical + relational queries |
| postgres.js camelCase standard | Database columns use snake_case, postgres.js transforms to camelCase at runtime. ALWAYS access as camelCase (row.userId not row.user_id) |
| Database standardization project | Systematic fix of snake_case bugs + comprehensive docs. 6-phase plan over 2 weeks. Critical for reliable development. |

---

## Known Issues

- [ ] **🔴 Database snake_case/camelCase confusion** - ACTIVE PROJECT. Multiple repository files use snake_case access (returns undefined). See `DATABASE_STANDARDIZATION_PROJECT.md` for ongoing fix plan.
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

### Latest: 2026-01-14 (Database Standardization Project & Membership Bug Fixes)

**Completed:**

*Critical Bug Fixes (Committed: b7a21c3):*
- Fixed member names showing "Unknown" (postgres.js camelCase issue)
- Fixed duplicate owner in member lists (existence check)
- Fixed General area not created for new spaces (per-space not per-user)
- Fixed area access control not persisting (isRestricted flag handling)
- All fixes pushed to main branch

*Database Standardization Project Plan:*
- Created comprehensive 2-week project plan: `DATABASE_STANDARDIZATION_PROJECT.md`
- Documented postgres.js snake_case → camelCase transformation issue
- Defined 6 implementation phases with detailed checklists
- Created "For Coding Agents" quick start guide
- Established success criteria (code quality, docs, tooling, testing, process)
- Defined reference patterns for all database access
- Planned audit script, schema generator, lint rules, CI validation
- Updated CLAUDE.md with database access principles

**Key Insights:**
- postgres.js automatically transforms column names: `user_id` → `userId`
- Mixed patterns in codebase causing silent undefined access bugs
- Type definitions don't match runtime shapes (illusion of type safety)
- Every new feature risks similar bugs without standardization
- Comprehensive docs needed: schema, relationships, access patterns, type mapping

**Files Created:**
- `docs/DATABASE_STANDARDIZATION_PROJECT.md` - Complete 6-phase implementation plan

**Files Modified:**
- `CLAUDE.md` - Added database principles, strategic doc reference, known issue, 2 decision log entries, session log

**Decision Log Entries:**
- postgres.js camelCase standard (row.userId not row.user_id)
- Database standardization project (2-week systematic fix)

**Next Steps:**
- Phase 1: Create docs structure, audit script, POSTGRES_JS_GUIDE.md
- Phase 2: Fix all repositories to use camelCase consistently
- Phase 3: Generate schema docs, relationships, access patterns
- See DATABASE_STANDARDIZATION_PROJECT.md for full roadmap

### Previous: 2026-01-14 (Graph-Ready Architecture & AI Retrieval Documentation)

**Completed:**

*Graph-Ready Architecture (ENTITY_MODEL.md - Section 9):*
- Added new Section 9: Relationship Modeling (Graph-Ready Architecture)
- Designed `entity_relationships` table for typed relationship capture
- Defined relationship vocabulary: attended, produced, informed_by, owns, etc.
- PostgreSQL query patterns: expertise discovery, decision provenance, impact analysis
- Future graph DB migration path documented (Neo4j/Neptune when CTEs >500ms)
- Updated Complete Schema (Section 12.7) with full table definition + indexes
- Added 2 decision log entries for graph-ready approach

*AI Retrieval Architecture (docs/AI_RETRIEVAL_ARCHITECTURE.md):*
- New comprehensive document explaining how AI accesses organizational knowledge
- The "Intelligence Triangle": Semantic (pgvector) + Hierarchical (tree) + Relational (graph)
- Detailed retrieval patterns: AI-initiated tool calling vs System-initiated suggestions
- Tool definitions for context retrieval (find_experts, get_decision_provenance, etc.)
- Query composition strategies and optimization patterns
- Privacy/permission-aware retrieval and audit logging
- Performance considerations: latency budgets, caching strategy, query limits

*Azure App Registration Instructions:*
- Created step-by-step DevOps instructions for Microsoft Graph API setup
- Required permissions: Calendars.ReadWrite, OnlineMeetings.ReadWrite, etc.
- OAuth redirect URI configuration
- Security notes for credential handling

**Key Insights:**
- AI doesn't "know" org data - it retrieves via tools and reasons over results
- Relationship data must be captured at creation time (irreversible decision)
- Graph-ready in PostgreSQL now; dedicated graph DB only when patterns justify
- Three query types (semantic + hierarchical + relational) are complementary, not competing

**Files Created:**
- `docs/AI_RETRIEVAL_ARCHITECTURE.md` - Complete retrieval mechanics documentation

**Files Modified:**
- `ENTITY_MODEL.md` - New Section 9 (Relationship Modeling), Section 12.7 (entity_relationships table), updated numbering, 2 decision log entries
- `CLAUDE.md` - Strategic doc reference, 3 decision log entries, session log

**Next Steps:**
- Azure App Registration (waiting on DevOps)
- Phase 1 Foundation: Database migration, OAuth flow implementation
- Consider adding `entity_relationships` migration alongside meeting lifecycle migration

### Previous: 2026-01-13 (Meeting Lifecycle System - Complete Specification)

**Completed:**

*Strategic Research - Microsoft Outlook Calendar Integration:*
- Researched MCP ecosystem for Microsoft 365 (found 3+ production-ready servers)
- Analyzed Microsoft Graph API capabilities (Calendar, Teams, Transcripts)
- Evaluated integration patterns from leading tools (Slack, Otter.ai, Fireflies, Copilot)
- Decision: Direct Microsoft Graph API for control; MCP for future multi-integration

*Meeting Lifecycle Specification (docs/MEETING_LIFECYCLE.md):*
- Complete 2,200+ line specification document
- End-to-end flow: Create → Schedule → Meet → Capture → Process → Confirm → Context
- Database schema: 8 tables (meetings, agenda_items, expected_outcomes, attendees, decisions, action_items, key_points, calendar_connections)
- Microsoft Graph OAuth integration design with token refresh strategy
- AI-guided creation flow: 4-step wizard (Context, Outcomes, Agenda, Attendees)
- Intelligent scheduling: Free/busy query for internal, propose times for external
- Post-meeting capture: Teams transcript API, manual upload, quick notes fallback
- AI extraction: Decisions, action items, key points with confidence scoring
- Gap-filling UI: Human confirms ownership before finalization
- Context integration: Minutes Page + Tasks + Area decisions (flywheel)
- 7-phase implementation roadmap (15-22 weeks total)
- Graceful degradation levels (full integration → manual only)
- ASCII wireframes for all major UI flows

*Key Insights:*
- Transcript retrieval depends on Teams admin policies (manual upload as fallback)
- External attendee free/busy not queryable (propose times pattern)
- AI extraction with human confirmation (never auto-commit)
- Meetings are context generators, not just calendar events

**Files Created:**
- `docs/MEETING_LIFECYCLE.md` - Complete specification

**Files Modified:**
- `CLAUDE.md` - Added strategic doc reference, 5 decision log entries

**Next Steps:**
- Phase 1 Foundation: Azure App Registration, OAuth flow, database migration
- Test transcript API with StratGroup tenant to determine auto-pull feasibility

### Previous: 2026-01-13 (Page Sharing Phase 1 - Backend Complete)

**Completed:**

*Page Sharing Phase 1 - Backend Infrastructure (8 Sub-Phases):*
- Database migration 029: 3 tables (page_user_shares, page_group_shares, audit_events), 10 indexes
- Complete type system: page-sharing.ts, audit.ts with converters and UI metadata
- page-sharing-postgres.ts: 4-tier access control algorithm (owner → user_share → group_share → area → space)
- audit-postgres.ts: Event logging repository with JSONB metadata, filtering, pagination
- Updated pages-postgres.ts: Permission checks in findById/update, visibility change handling
- 4 API endpoints: share management + audit log query with admin permission checks
- All repositories exported (including previously missing postgresPageRepository)
- 23/23 automated verification checks passed (100%)
- 0 TypeScript errors, all 54 backend acceptance criteria met

*Key Features:*
- 3-tier permissions: Viewer (read), Editor (edit), Admin (share)
- Smart access model: Private pages can invite anyone; area/space pages are member-only
- Auto-cleanup: Specific shares removed when changing private → area/space visibility
- Comprehensive audit trail: All sharing operations logged with metadata
- Area role mapping: owner/admin/member → editor, viewer → viewer

**Files Created (11):**
- `src/lib/server/persistence/migrations/029-page-sharing-audit.sql`
- `src/lib/types/page-sharing.ts`
- `src/lib/types/audit.ts`
- `src/lib/server/persistence/page-sharing-postgres.ts`
- `src/lib/server/persistence/audit-postgres.ts`
- `src/routes/api/pages/[id]/share/+server.ts`
- `src/routes/api/pages/[id]/share/users/[userId]/+server.ts`
- `src/routes/api/pages/[id]/share/groups/[groupId]/+server.ts`
- `src/routes/api/pages/[id]/audit/+server.ts`
- `verify-migration-029.ts`
- `verify-phase1-complete.ts`

**Files Modified (6):**
- `src/lib/server/persistence/pages-postgres.ts`
- `src/lib/server/persistence/index.ts`
- `src/lib/types/index.ts`
- `src/lib/types/page.ts`
- `src/lib/components/pages/PageHeader.svelte`
- `src/lib/components/pages/DeletePageModal.svelte`

**Commits Made:**
- `97aef43` - Page Sharing Phase 1 Backend Infrastructure

**Next Steps:**
- Phase 2: Frontend (SharePageModal, PagePermissionSelector, PagePermissionBadge)
- Phase 3: Audit UI (PageAuditLog, read-only editor enforcement)

### Previous: 2026-01-13 (Area Sharing Phase 4 Complete + Page Sharing Architecture)

**Completed:**

*Area Sharing Phase 4 - Visual Integration & Polish:*
- AreaAvatarStack component: Overlapping member avatars (3 + "+N more") in area headers
- AreaSharedIndicator component: Compact badges on area cards (blue for open, red for restricted)
- Context menu integration: "Share" option added to area card three-dot menu
- Dashboard integration: Member counts, share modal wiring in SpaceDashboard
- Mobile optimization: Full-screen modal on <768px with fixed header and search
- Staggered animations: Member list items fade in with 50ms delay
- Accessibility: prefers-reduced-motion support in app.css
- Role color system: CSS variables for all permission levels (owner/admin/member/viewer)
- Avatar stack in area page headers (clickable to open share modal)
- Shared indicator clickable (opens share modal, stops propagation)
- Touch target enhancements: 44x44px minimum for mobile
- Light/dark mode support throughout

*Page Sharing with Permissions & Audit - Complete Architecture:*
- Comprehensive documentation: `docs/page-sharing-permissions-audit.md` (2,239 lines)
- 3-tier permission model: Viewer (read), Editor (edit), Admin (share)
- Smart access model: Private pages can invite anyone; area/space pages are member-only
- Complete 3-week implementation roadmap (Backend → Frontend → Audit UI)
- Database schemas: page_user_shares, page_group_shares, audit_events tables
- Access control algorithm with permission inheritance from area roles
- Audit logging design: View sampling (first per day), 1-year retention
- Read-only editor enforcement: Viewer permission grays out editor with indicator
- 194 acceptance criteria across 3 phases (54 backend, 88 frontend, 52 audit)
- Strategic context: "Context remains current through collaboration"

**Files Created:**
- `docs/page-sharing-permissions-audit.md`
- `src/lib/components/areas/AreaAvatarStack.svelte`
- `src/lib/components/areas/AreaSharedIndicator.svelte`

**Files Modified:**
- `src/app.css`
- `src/lib/components/areas/AreaMemberList.svelte`
- `src/lib/components/areas/ShareAreaModal.svelte`
- `src/lib/components/spaces/AreaCard.svelte`
- `src/lib/components/spaces/SpaceDashboard.svelte`
- `src/routes/spaces/[space]/[area]/+page.svelte`

**Commits Made:**
- `1463c86` - feat: Complete Area Sharing UI Phase 4 and document Page Sharing architecture

**Next Steps:**
- Manual testing of Area Sharing complete flow
- Implement Page Sharing (3-week roadmap documented)

### Previous: 2026-01-12 (SendGrid Email Integration + Area Sharing + UX Improvements)

**Completed:**

*SendGrid Email Integration (All 10 Phases):*
- Secure password reset flow with SHA256 token hashing
- Rate limiting: 5 attempts/email, 10 attempts/IP per 15min
- Email service with SendGrid API integration
- Beautiful HTML email templates (password reset, future extensible)
- Email audit logging with deliverability tracking
- Timing attack and email enumeration prevention
- Forgot-password and reset-password UI flows
- Database migrations: email_logs, password_reset_tokens tables
- Successfully tested end-to-end (email sent to gabriel@stratech.co.za)

*Area Sharing Implementation (Phases 0-5):*
- Database schema: area_memberships table, is_restricted flag on focus_areas
- Repository layer with full access control (CanAccessArea, AddMember, RemoveMember, UpdateRole)
- Complete component suite: AreaAccessToggle, AreaMemberList, ShareAreaModal
- Search with debounce for adding members
- API endpoints with authorization: /api/areas/[id]/members (GET/POST/PATCH/DELETE)
- UX integration: Area header toggle, sliding member panel
- Rate limiting and error handling

*UX Improvements:*
- Main chat navigation button in header (desktop + mobile) with active state
- Login redirects to user's preferred home URL (main-chat, space, area, task-dashboard)

*Bug Fixes:*
- Fixed groups-postgres.ts column name mismatch (u.name → u.display_name)

**Files Created (29 new files):**
- Database: migrations/027-area-sharing.sql, 028-email-system.sql
- Types: area-memberships.ts, email.ts
- Repositories: area-memberships-postgres.ts, email-logs-postgres.ts, password-reset-tokens-postgres.ts
- Email Service: src/lib/server/email/ (sendgrid.ts, templates.ts, index.ts)
- Components: src/lib/components/areas/ (9 components)
- API Endpoints: api/auth/forgot-password, api/auth/reset-password, api/areas/[id]/members
- UI Pages: forgot-password/+page.svelte, reset-password/+page.svelte
- Utils: debounce.ts
- Documentation: area-sharing-ux.md, run-migration.ts

**Files Modified (19 files):**
- users-postgres.ts - Added findByEmailGlobal(), updatePassword()
- areas-postgres.ts - Added findByIdWithMemberships(), updateIsRestricted()
- persistence/types.ts - Updated UserRepository interface
- persistence/index.ts - Exported new repositories
- hooks.server.ts - Added password reset routes to PUBLIC_ROUTES
- Header.svelte - Added main chat navigation button
- login/+page.server.ts - Respects home URL preference
- login/+page.svelte - Added "Forgot password?" link
- areas.svelte.ts - Added member management state
- user.svelte.ts - Updated homeUrl handling
- .env.example - Added SendGrid configuration section
- docs/SENDGRID_EMAIL_INTEGRATION.md - Complete roadmap with 17 email types prioritized

**Key Decisions:**
- Area-level sharing (not Space-level) for collaboration precision
- Email templates built extensible for 17 future notification types
- Rate limiting at both email and IP level for abuse prevention
- Member search debounce (300ms) for UX performance

**Next Steps:**
- Document sharing implementation (upload, activate, share flows)
- Admin portal enhancements (group management, usage analytics)
- Email notification system expansion (invites, activity digests)

### Previous: 2026-01-12 (Document Sharing Architecture & ENTITY_MODEL Reconciliation)

**Completed:**

*Documents vs Pages Clarification:*
- Identified naming confusion between uploaded Documents and created Pages
- Documents = uploaded files (PDFs, specs) at Space-level for deduplication
- Pages = created content (meeting notes, proposals) at Area-level
- Updated ENTITY_MODEL.md Section 7.5 with complete distinction
- Added new Section 7.6 for Pages schema
- Updated DOCUMENT_SYSTEM.md → renamed to Pages System with terminology note

*Document Sharing Architecture - Deep Design:*
- Collaborative ultrathink sessions defining the mental model
- Key insight: **Stored at Space-level (dedup), shared at Area-level (precision)**
- Prevents Slack/Teams anti-pattern where same doc gets uploaded multiple times
- Visibility levels: private → areas (granular) → space (rare)
- Upload context matters: Area upload prompts "Share with Area?"
- Unshare auto-deactivates document from Area's contextDocumentIds

*DOCUMENT_SHARING.md Implementation Specification (~900 lines):*
- Complete mental model documentation
- Database schema: documents (with visibility), document_area_shares, document_references (V2)
- Access control algorithms: CanSeeDocument, CanShareDocument, CanActivateDocumentForArea
- Detailed UX flows with ASCII wireframes: upload, share modal, document views, unshare
- 8 implementation phases with acceptance tests per phase
- Edge cases: unshare handling, ownership transfer, duplicate detection
- V2 cross-Space references design (for future)

**Key Decisions:**
- Documents stored at Space, shared at Area (no noise for irrelevant Areas)
- Area-level sharing instead of Space-level (precision)
- Unshare auto-deactivates from contextDocumentIds (clean break)
- V1: "Copy to My Space" creates duplicate; V2: References with sync

**Files Created:**
- `stratai-main/docs/DOCUMENT_SHARING.md` - Complete implementation specification

**Files Modified:**
- `stratai-main/ENTITY_MODEL.md` - Section 7.5 updated, Section 7.6 added, Complete Schema updated, Decision Log
- `stratai-main/docs/DOCUMENT_SYSTEM.md` - Renamed to Pages System, added terminology note
- `stratai-main/docs/CONTEXT_STRATEGY.md` - Added Related Documents references
- `CLAUDE.md` - Strategic doc reference, Decision Log entries

**Next Steps:**
- Area sharing implementation (separate track)
- Document sharing Phase 1: Migration (024-document-sharing.sql)
- Document sharing Phase 2: Repository layer

### Previous: 2026-01-12 (Guided Creation System Design)

**Completed:**

*Environment Setup (fresh pull):*
- Ran database migrations 018-023 (groups, pages, routing_decisions, user_preferences)
- Database now has 21 tables (up from 15)
- Installed TipTap dependencies, TypeScript compiles cleanly

*Guided Creation System - Comprehensive Design:*
- Deep UX analysis of template-based document creation
- Key insight: **Templates as data schemas**, not just layouts
- Guided interview collects structured JSON → renders to TipTap + creates entities
- Progressive disclosure: Card-based steps, skip always available, context does heavy lifting

*Meeting Notes as First Implementation:*
- 5-step flow: Basics → Attendees → Context → Outcomes → Actions
- Attendees: Internal (from Space/Area members) + External (freeform)
- Decisions with owner + rationale (feeds context hierarchy)
- Action items with "Create as Task" toggle → automatic Task creation
- Area context can be included in document

*GUIDED_CREATION.md Specification (~1600 lines):*
- Complete architecture with component structure
- Core type definitions (TemplateSchema, StepDefinition, FieldDefinition)
- Meeting Notes data schema with full field definitions
- 6 implementation phases with clear acceptance tests
- Template renderer design (JSON → TipTap)
- Entity creation service design (action items → Tasks)
- Context Strategy integration (decisions → Area memory)
- Future templates outlined (Decision Record, Proposal, Project Brief, Weekly Update)
- Admin Template Editor vision (future)

**Files Created:**
- `stratai-main/docs/GUIDED_CREATION.md` - Complete specification

### Previous: 2026-01-11 (Phase 5 Research & Area Sharing Analysis)

**Completed:**
- AUTO Model Routing Phase 5: DEFERRED with metrics gate (override rate >10% or low confidence >30%)
- Area Sharing gap analysis vs ENTITY_MODEL.md

**Gaps Identified:**
- `area_memberships` table not implemented
- `is_restricted` flag on focus_areas missing
- CanAccessArea algorithm not built

### Previous: 2026-01-11 (Document System & AUTO Routing)

**Completed:**
- AI-Native Document System: TipTap editor, document types, discussion panel, export
- Apply Button fix for cross-formatting text
- AUTO Model Routing: complexity analysis, context-aware, tier-based selection
- Layered System Prompt Caching
- Settings pages infrastructure

**Key Files:** `src/lib/components/pages/`, `src/lib/services/model-router/`, `src/routes/admin/routing/`

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
