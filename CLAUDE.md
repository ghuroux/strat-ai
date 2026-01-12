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

### Latest: 2026-01-12 (Document Sharing Architecture & ENTITY_MODEL Reconciliation)

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
