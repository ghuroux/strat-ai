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
- `stratai-main/docs/DATABASE_STANDARDIZATION_PROJECT.md` - **Database standardization** (snake_case vs camelCase, postgres.js guide)
- `stratai-main/docs/database/POSTGRES_JS_GUIDE.md` - **✅ MUST READ for DB work** (postgres.js transformation, patterns, anti-patterns)
- `stratai-main/docs/database/SCHEMA_REFERENCE.md` - **Auto-generated schema** (32 tables, all columns with camelCase mapping)
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

# Database migrations (see .claude/commands/db-migrate.md for details)
node -e "import('postgres').then(({default:postgres})=>{import('fs').then(fs=>{const sql=postgres(process.env.DATABASE_URL||'postgres://ghuroux@localhost:5432/stratai');const schemas=['schema.sql','users-schema.sql','organizations-schema.sql','org-memberships-schema.sql','user-id-mappings-schema.sql','tasks-schema.sql','documents-schema.sql','focus-areas-schema.sql','spaces-schema.sql','arena-schema.sql','tool-cache-schema.sql'];(async()=>{for(const file of schemas){console.log(\`Running: \${file}\`);const schema=fs.readFileSync(\`src/lib/server/persistence/\${file}\`,'utf-8');await sql.unsafe(schema).catch(e=>console.log(\`Notice: \${e.message}\`))}await sql.end();console.log('✅ Migrations complete')})()})})"
```

---

## Agent Skills & Commands

Claude Code has access to specialized skills and commands. **Before working on related tasks, READ the relevant skill file.**

### Available Skills

| Task | Skill Location | Trigger Condition |
|------|----------------|-------------------|
| Creating Svelte components | `stratai-main/.claude/skills/creating-components/SKILL.md` | Any new `.svelte` file in `src/lib/components/` |
| Creating API endpoints | `stratai-main/.claude/skills/creating-endpoints/SKILL.md` | Any new `+server.ts` file in `src/routes/api/` |
| Working with PostgreSQL | `stratai-main/.claude/skills/working-with-postgres/SKILL.md` | Any `*-postgres.ts` file or SQL query work |
| Managing Svelte 5 stores | `stratai-main/.claude/skills/managing-state/SKILL.md` | Any `.svelte.ts` file in `src/lib/stores/` |
| StratAI conventions | `stratai-main/.claude/skills/stratai-conventions/SKILL.md` | General coding, bug fixes, refactoring, architecture |

**Quick references within StratAI conventions skill:**
- `SVELTE5.md` - Svelte 5 runes patterns (stores, components, reactivity)
- `POSTGRES.md` - Database patterns (camelCase access, query building)
- `API-PATTERNS.md` - API endpoint patterns (streaming, error handling)
- `PROMPTS.md` - Prompt engineering patterns (layered prompts, context)
- `DESIGN-SYSTEM.md` - **✅ MUST READ for UI work** (colors, buttons, theme support, modals, loading states)

### Quick Commands

| Command | Purpose | How to Use |
|---------|---------|------------|
| `check` | TypeScript type check | See `.claude/commands/check.md` |
| `dev` | Start dev server | See `.claude/commands/dev.md` |
| `build` | Production build | See `.claude/commands/build.md` |
| `db-migrate` | Run database migration | See `.claude/commands/db-migrate.md` |
| `session-log` | Update session log | See `.claude/commands/session-log.md` |

### Mandatory Skill Usage

**BEFORE creating or modifying:**
- A Svelte component → **READ** `creating-components/SKILL.md`
- An API endpoint → **READ** `creating-endpoints/SKILL.md`
- Database code → **READ** `working-with-postgres/SKILL.md`
- A Svelte 5 store → **READ** `managing-state/SKILL.md`
- Any StratAI code → **REFERENCE** `stratai-conventions/SKILL.md`

**ALWAYS check** `stratai-conventions/SKILL.md` for:
- Svelte 5 runes (NOT Svelte 4 patterns)
- postgres.js camelCase transformation
- Store patterns with `SvelteMap`
- File naming conventions
- Common gotchas

### Agent Systems

StratAI has two complementary agent systems:

| System | Location | Purpose | When to Use |
|--------|----------|---------|-------------|
| **Claude Code Skills** | `stratai-main/.claude/skills/` | Code patterns & conventions | Implementation details, component/endpoint creation |
| **Ralph Agent Loop** | `stratai-main/agents/ralph/` | Feature development workflow | PRD creation, multi-story features, validation pipeline |

For **feature development**: Use Ralph loop (see `agents/ralph/prompt.md` and `agents/ralph/skills/`)  
For **implementation details**: Use Claude Code skills (patterns, conventions, templates)

---

## Failure Handling

When encountering ambiguity or missing information, follow these protocols:

### When to Ask for Clarification

1. **Missing requirements**: Ask before implementing rather than assuming
2. **Ambiguous behavior**: Present options with trade-offs, recommend one
3. **Conflicting guidance**: Flag the conflict, cite sources, ask for resolution
4. **Schema uncertainty**: Reference `docs/database/SCHEMA_REFERENCE.md` first, then ask if unclear
5. **Pattern uncertainty**: Search existing code for similar implementations, follow established patterns

### How to Express Uncertainty

Instead of guessing or hallucinating:
- Say: "I need clarification on X before proceeding"
- Say: "I found two approaches in the codebase; which should I follow?"
- Say: "This conflicts with Y pattern; how should I resolve this?"

### Resolution Hierarchy

When multiple sources conflict, this file takes precedence:

1. **CLAUDE.md** (this file) - highest authority
2. **Strategic Documents** (ENTITY_MODEL, DATABASE_STANDARDIZATION, etc.)
3. **Skills** (.claude/skills/* and agents/ralph/skills/*)
4. **Existing code patterns** (established conventions)
5. **Comments in code** (implementation notes)

### Error Recovery

If you make a mistake:
1. Acknowledge it explicitly
2. Explain what went wrong
3. Propose the correct solution
4. Implement the fix immediately
5. Update relevant documentation if the mistake revealed a gap

Never assume. When uncertain, **ask**.

---

## Quality Gates

Before marking work complete, ensure all applicable gates pass:

### Code Quality

| Gate | Command | Pass Criteria |
|------|---------|---------------|
| **TypeScript** | `npm run check` | 0 errors (warnings acceptable if pre-existing) |
| **Lint** | `npm run lint` | 0 errors (or no worse than before) |
| **Build** | `npm run build` | Successful production build |

### Pattern Compliance

| Pattern | Check | Pass Criteria |
|---------|-------|---------------|
| **Svelte 5 Runes** | Manual review | Uses `$state`, `$derived`, `$effect` (NOT Svelte 4 `writable`, `derived`) |
| **Database Access** | Manual review | Uses camelCase access (`row.userId` NOT `row.user_id`) |
| **File Naming** | Manual review | Components: PascalCase, Stores: camelCase + `.svelte.ts`, Routes: lowercase |
| **Store Patterns** | Manual review | Uses `SvelteMap` for reactive collections, `_version` counter for fine-grained updates |
| **Theme Support** | Manual review | All UI supports both dark AND light mode (uses `dark:` prefix pattern). See `DESIGN-SYSTEM.md` |

### Database Work

| Gate | Tool | Pass Criteria |
|------|------|---------------|
| **CamelCase Access** | `npm run audit-db-access` | 0 snake_case access violations |
| **Schema Alignment** | Manual review | Matches `docs/database/SCHEMA_REFERENCE.md` |
| **Migration Safety** | Manual review | Includes rollback plan, tested locally |

### Documentation

| Gate | Check | Pass Criteria |
|------|-------|---------------|
| **Strategic Docs** | Manual review | Updated if architecture/data model changed |
| **Session Log** | Manual review | Updated if significant work completed |
| **Decision Log** | Manual review | Updated if architectural decision made |

### Before Committing

✅ All relevant quality gates pass  
✅ No new linter errors introduced  
✅ Follows established patterns from skills  
✅ Documentation updated if needed  

If any gate fails, **fix before proceeding**. Do not commit broken code.

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
| Theme support mandatory | All UI components MUST support both dark AND light modes using `dark:` prefix pattern. Light mode is base, dark mode overrides. Prevents "invisible in light mode" bugs. See `DESIGN-SYSTEM.md`. |

---

## Known Issues

- [x] **✅ Database snake_case/camelCase - RESOLVED** - All 22 *-postgres.ts files now use correct camelCase access. Audit script: `npm run audit-db-access`. Docs: `docs/database/`
- [ ] **Icon inconsistency** - ~124 components use inline SVG, ~46 use `lucide-svelte`. Standard is `lucide-svelte` for new work. Migrate gradually as components are touched. See `.claude/skills/creating-components/SKILL.md`
- [x] **✅ 🔴 CRITICAL SECURITY FIX (2026-01-16)** - `creating-endpoints` skill taught insecure auth pattern. **FIXED** - Now teaches correct `locals.session` pattern. Audit confirmed 0 production endpoints affected.
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
