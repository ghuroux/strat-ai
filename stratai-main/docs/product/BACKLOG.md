# StratAI Development Backlog

Active and planned features, aligned with the product vision.

> **Completed Work**: See `BACKLOG_COMPLETED.md` for archived phases
> **Vision**: See `VISION-WORK-OS.md` for the Work Operating System vision
> **Competitive Intel**: See `docs/CONFLUENCE_COMPETITIVE_ANALYSIS.md`

---

## Current Phase: 0.3 - Spaces & Templates

**Goal**: Reduce cognitive load through invisible prompt engineering

| Sub-Phase | Focus | Status |
|-----------|-------|--------|
| 0.3a | Space Foundation | ✅ Complete |
| 0.3b | Assists Framework | ✅ Complete |
| 0.3c | Task Lifecycle | ✅ Complete |
| 0.3c+ | Enhanced Focus Mode | ✅ Complete |
| 0.3d++ | Subtasks & Plan Mode | ✅ Complete |
| 0.3d | Meeting Summary | Deferred |
| **0.3e** | **Temporal Awareness** | **In Progress** |
| 0.3e+ | Context Panel | Planned |
| 0.3f | Form Templates | Planned |
| 0.3g | Entity Extraction | Planned |
| 0.3h | Onboarding | Stretch |

---

## Phase 0.3e: Temporal Awareness (In Progress)

**Goal**: The system understands time and proactively helps manage work

### Completed ✅
- Task Dashboard with time-based grouping
- Stale task detection (7 days threshold)
- Recently completed section
- Reopen task functionality

### Remaining
- [ ] Day change detection (store `lastSessionDate`)
- [ ] Detect Monday (start of work week)
- [ ] Greeting variations (morning, Monday, overdue alerts)
- [ ] Cleanup offer workflow
- [ ] Guided cleanup flow (walk through stale items)
- [ ] Snooze/remind functionality (`snoozedUntil` field)
- [ ] Pagination for 100+ completions

---

## Phase 0.3e+: Context Panel

**Goal**: Single UI for managing "what the AI knows" about an area

- [ ] Rename `DocsPanel` → `ContextPanel`
- [ ] Area Notes section (view/edit inline)
- [ ] Documents section with activation checkboxes
- [ ] Search bar for 50+ docs
- [ ] Character count display (context budget)
- [ ] Upload zone with auto-activation

---

## Context Transparency: Phase 1 (Foundation) ✅

**Completed:** January 2026

> See `docs/features/CONTEXT_TRANSPARENCY.md` for full specification

Phase 1 builds ambient awareness of what context the AI has access to.

### Completed ✅
- [x] ContextBar with chips (📎 docs, 📝 notes, ✓ tasks)
- [x] Expandable DocumentsPanel with activate/deactivate
- [x] NotesPanel with preview and edit link
- [x] TasksPanel with status badges
- [x] "Loading context" indicator before API call (replaces incorrect "Searching the web")
- [x] Context chips during loading state (shows what's being loaded)
- [x] ResponseContextBadge on assistant messages ("Context: N sources used")
- [x] Context capture at message send time (usedContext on Message type)
- [x] Integration with Area and Task chat pages

---

## Context Transparency: Phase 2 (Proactive Disclosure)

**Goal**: First-message context modal with ability to adjust before chatting

> See `docs/features/CONTEXT_TRANSPARENCY.md` Phase 2 for full specification

### 2.0 Enhanced Area Creation Modal

#### Completed ✅
- [x] Visibility selector in Create Area modal (Open / Private radio group)
- [x] Default based on space type: org space → private, personal → open
- [x] "Recommended" badge for private option in org spaces
- [x] Contextual privacy hint for documents when Private selected
- [x] `isRestricted` wired through type → API → repository → database

#### Remaining
- [ ] AreaModal light/dark theme support — modal uses scoped dark CSS with no `html.light` overrides. Needs full light mode pass across entire modal (not just visibility selector). See `DESIGN-SYSTEM.md`.

### 2.1 Context Snapshot Modal

#### Features
- [ ] ContextSnapshotModal - appears on first message in NEW conversation
- [ ] Shows: Area notes, active documents, available documents, team context, related tasks
- [ ] Quick activate/deactivate documents directly from modal
- [ ] "Start Chatting" and "Skip for now" actions
- [ ] "Don't show again" preference (per-Area/Task)
- [ ] Mobile responsive (bottom sheet pattern)
- [ ] Light/dark theme support

#### Acceptance Criteria (Key)
- [ ] Modal ONLY appears for new conversations (no messages yet)
- [ ] "Available but not activated" section highlights unactivated Space documents
- [ ] Preference persisted in localStorage: `stratai-context-modal-dismissed-{type}-{id}`

---

## Context Transparency: Phase 3 (Intelligent Detection)

**Goal**: Detect when users reference documents not in their context

> See `docs/features/CONTEXT_TRANSPARENCY.md` Phase 3 for full specification

### Features
- [ ] Document mention detection (fuzzy matching against available docs)
- [ ] Inline suggestion banner above input: "You mentioned X but it's not in context"
- [ ] Quick [+ Activate] and [Dismiss] actions
- [ ] Debounced detection (500ms) on input change
- [ ] No false positives for common words

### Detection Strategy
- Option A: Exact filename match (MVP) - simple, low false positives
- Option B: Fuzzy match + confirmation (Recommended) - 80% confidence threshold
- Option C: AI-assisted (Future) - most accurate but adds latency

---

## Phase 0.3f-h: Templates & Onboarding

**0.3f - Form Templates**:
- [ ] `FormTemplate.svelte` component
- [ ] Weekly Status Update template
- [ ] Decision Log template

**0.3g - Entity Extraction**:
- [ ] Extract people, decisions from outputs
- [ ] Working Context view

**0.3h - Onboarding** (Stretch):
- [ ] Activity selection flow
- [ ] Template recommendations

---

## Deferred: Phase 0.3d Meeting Summary

**Why Deferred**: Focus on core task/subtask flow first

- [ ] Conversation step system
- [ ] Guided conversation UI
- [ ] Meeting Summary template
- [ ] Action item extraction → tasks

---

## Competitive Response (Immediate Priority)

> From `docs/CONFLUENCE_COMPETITIVE_ANALYSIS.md`

### 1. Mobile Responsiveness 📱
**Priority: HIGH | Impact: HIGH**

**Completed:**
- [x] MobileHeader pattern across all main pages (Quick Chat, Spaces, Arena, Area Chat, Pages Dashboard, Page Editor)
- [x] ModelSelector mobile bottom sheet (replaces overflow dropdown)
- [x] ChatInput toggles collapse to 3-dot menu on mobile

**Remaining:**
- [ ] Pages editor toolbar optimization (formatting buttons for mobile)
- [ ] Systematic mobile audit (Arena, Spaces, Chat, Pages)
- [ ] Fix layout breakpoints (<768px, <480px)
- [ ] 44x44px touch targets
- [ ] Safe-area padding for iOS

### 2. Global Search UI 🔍
**Priority: HIGH | Impact: HIGH**
- [ ] Search bar in header (Cmd+K)
- [ ] Search across Pages, Areas, Spaces, Conversations
- [ ] Real-time results dropdown

### 3. Comments & Discussions 💬
**Priority: HIGH | Impact: HIGH**
- [ ] `page_comments` table (threaded)
- [ ] @mentions with email notifications
- [ ] Resolve/unresolve threads

### 4. Short-term
- [ ] Activity Dashboard (Recent Activity feed)
- [ ] Page Table of Contents
- [ ] Labels/Tags system

### 5. Medium-term
- [ ] **Confluence Import Tool** (market capture!)
- [ ] Content Freshness System (solve graveyard problem)
- [ ] Page Navigation Sidebar

---

## Model Arena: Future Phases

### Rankings Dashboard
- [ ] `/arena/rankings` page
- [ ] Per-category leaderboards
- [ ] BattleOutcome data model (lightweight storage)

### Context-Aware Arena
- [ ] "Send to Arena" from chat
- [ ] Follow-up rounds within battles

### A/B Testing Mode
- [ ] Same model, different settings comparison

---

## Pages System: Future Enhancements

### Image Upload
- [x] Phase 1: Base64 in TEXT field with `content_type` discriminator ✅ (2026-01-26)
- [x] AI-generated descriptions via Haiku 4.5 vision ✅ (2026-01-26)
- [x] Vision context injection for capable models ✅ (2026-01-26)
- [ ] Paste from clipboard support
- [ ] Phase 2: Page assets table (production)

### ~~Context-Aware Unlock (Page Lifecycle)~~ ✅ RESOLVED
**Resolved in Phase 4: Page Lifecycle Polish (2026-01-29)**

- [x] On unlock: If page has `in_context = true`, show modal asking "Keep v{N} active in context while you edit?"
  - **Yes**: Sets `context_version_number` on pages table → context system serves frozen version content (not draft)
  - **No**: Current behavior (clear `in_context`)
- [x] On finalize: If `context_version_number` is set, auto-replace with new version and clear the field
- [x] On finalize (without prior context): Normal "Add to Context" checkbox behavior
- [x] Schema: Added `context_version_number INTEGER` to pages table (nullable)
- [x] Context loading: `findPagesInContext` JOINs `page_versions` when `context_version_number` is set
- [x] Bonus: Added "Editing v{N}" indicator, pinned context badge, discard changes flow, ContextPanel pinned state

### ~~Audit Trail & Activity Log (Page Lifecycle Phase 5)~~ ✅ Tier 1+2 Complete

> See `docs/features/PAGE_AUDIT_TRAIL.md` for full specification

**Tier 1 — Core Compliance** ✅ (2026-01-30):
- [x] 16 event types covering full page lifecycle
- [x] Wire `logEvent()` in all page API endpoints (9 endpoints)
- [x] View deduplication (1 per user/page/day)
- [x] Populate `organization_id` on events
- [x] Backfill `organizationId` in existing sharing audit calls

**Tier 2 — Usability** ✅ (2026-01-30):
- [x] Activity Log accessible to page owners (not just admins)
- [x] "Lifecycle" filter tab (finalize, unlock, restore, create, delete)
- [x] Formatters and icons for all 16 event types
- [x] Expandable metadata details for rich events (word counts, context state, summaries)

**Tier 3 — Enterprise** (Future):
- [ ] Immutable audit table (DB rules preventing UPDATE/DELETE)
- [ ] Retention policy (13-month active, 7-year archive)
- [ ] IP/User-Agent capture
- [ ] Organization audit dashboard + export

### Editor UX Polish

| Priority | Items | Status |
|----------|-------|--------|
| P1 (High) | Undo/redo buttons, paragraph option, link modal | ✅ Complete |
| P2 (Medium) | Title input auto-select, clear formatting, visibility confirm | ✅ Complete |
| P3 (Low) | Text alignment, shortcuts ref | Remaining (auto-save indicator ✅) |
| P4 (Future) | Drag handles, link click-edit | Future |

---

## Technical Improvements

### Centralize LLM Timeouts
- [ ] Create `src/lib/config/timeouts.ts`
- [ ] Single source of truth for timeout values

### Model Pricing (Phases 2-4)
- [ ] Admin UI "Sync Pricing" button
- [ ] Runtime price overrides in DB
- [ ] Automated monitoring/alerts

### Prompt Caching
- [ ] Conversation history caching
- [ ] Cache statistics in UI

### UI Cleanup
- [ ] Light mode compatibility (90+ components)
- [ ] Button style standardization
- [ ] Accessibility fixes (42 a11y suppressions)

### Settings Architecture
- [ ] Per-Space/Area system prompts
- [ ] Scope clarity in UI

---

## Calendar Integration

**Status**: Core functionality complete, production deployed ✅

> See `docs/features/CALENDAR_INTEGRATION.md` for full specification
> See `docs/features/MEETING_LIFECYCLE.md` for the full meeting journey vision

### Completed ✅
- [x] Microsoft Graph OAuth flow (multi-tenant)
- [x] User-level Settings UI for calendar connection
- [x] Calendar listing tool (`calendar_list_events`)
- [x] Meeting creation with Teams links (`calendar_create_event`)
- [x] Free/busy checking (`calendar_get_free_busy`)
- [x] Find meeting times (`calendar_find_meeting_times`)
- [x] AI confirmation before creating events
- [x] Calendar status animation (emerald green) in ALL chat contexts
- [x] Token refresh for expired access tokens
- [x] Clean post-creation response with meeting prep offer
- [x] Production deployment (Azure redirect URI, env vars)

### Next Steps (Calendar → Meeting Lifecycle)
- [ ] **Org-level admin consent** for new organizations
  - Admin clicks "Grant Org Access" → Azure admin consent flow
  - URL pattern: `https://login.microsoftonline.com/{tenant}/adminconsent?client_id=...`
  - Required for orgs with restricted user consent policies
- [ ] **Calendar context in Tasks Dashboard**
  - Show "TODAY" section with upcoming meetings alongside tasks
  - Meeting cards with attendees, time, join link
  - Visual distinction between tasks and meetings
- [ ] **Global Tasks View** with calendar integration
  - Cross-space task aggregation
  - Calendar events interleaved with tasks
  - Day/week timeline view option
- [ ] **Post-meeting capture prompts**
  - Detect recently ended meetings
  - Prompt: "Your meeting just ended. Capture decisions?"
  - Guided capture flow (decisions, actions, follow-ups)
- [ ] **Meeting = Task** (from MEETING_LIFECYCLE.md)
  - Meetings create tasks assigned to owner
  - Task completion triggers capture flow
  - Action items become subtasks

---

## Jira Service Manager Integration

**Status**: Researched, backlogged
**Phase**: 2 (Team Intelligence) per `docs/features/INTEGRATIONS_ARCHITECTURE.md`
**Tier**: Contextual (add-on UX, per-Area activation)

> Research completed January 2026. MCP ecosystem ready.

### MCP Options Available

| Option | Type | Cloud | Server/DC | Notes |
|--------|------|-------|-----------|-------|
| **Atlassian Rovo MCP** | Official | ✅ | ❌ | OAuth 2.1, read+write, Beta |
| **mcp-atlassian** (sooperset) | Community | ✅ | ✅ | Combined Confluence + Jira |
| **jira-mcp** (cosmix) | Community | ✅ | ✅ | Relationship tracking, AI-optimized |

### Target Use Cases

- [ ] **Project ticket summary** — open ticket count, status breakdown
- [ ] **Highest priority tickets** — sorted by priority, SLA breach status
- [ ] **Tickets with no responses** — requires client-side filtering (JQL limitation)
- [ ] **Sprint context** — current sprint progress, blockers
- [ ] **Area-scoped ticket views** — filter by labels, components, queues

### Key Findings

- Official Atlassian Rovo MCP provides `searchJiraIssuesUsingJql` (JQL-powered search), `getJiraIssue`, `createJiraIssue`, `editJiraIssue`, and 9 more tools
- **JQL limitation**: Cannot natively filter by comment count (no "tickets with zero responses" query). Workaround: fetch issues → filter client-side in StratAI wrapper layer
- JSM-specific statuses (`Waiting for customer`, `SLA breach`) may be better proxies for "needs attention"
- Architecture fit: StratAI MCP Host + provider model handles this cleanly (same pattern as Calendar)

### Dependencies

- [ ] Integrations Architecture foundation (Phase 0 from `INTEGRATIONS_ARCHITECTURE.md`)
- [ ] Calendar integration validates the MCP Host pattern first

---

## Future Phases (0.4+)

| Phase | Goal | Priority |
|-------|------|----------|
| 0.4 | Contexts & Projects | Future |
| 0.5 | Tasks & Meetings | Future |
| 0.6 | Home Dashboard | Future |
| 0.7 | Team Management | Future |
| 0.8 | Policy Engine | Future |
| 0.9 | Privacy Shield (Anonymization) | Future |
| 0.10 | Temporal Intelligence (RAG) | Future |

---

## Strategic: Context Intelligence (The Moat)

**Priority: CRITICAL | Impact: 10x**

> See `docs/CONTEXT_STRATEGY.md` for full architecture

- [ ] Phase 1: Foundation (conversations to DB, embeddings)
- [ ] Phase 2: Active Memory (extraction, evaluation, decay)
- [ ] Phase 3: Shared Context (Space-level, approval workflows)
- [ ] Phase 4: Organizational Intelligence

**Value**: New hires inherit institutional knowledge. Knowledge compounds.

---

## Deferred Items (Low Priority)

- [ ] Backend branding (localStorage keys use strathost- prefix)
- [ ] Performance baseline measurement
- [ ] Error boundary implementation
- [ ] Storage usage indicators
- [ ] Diagram library self-hosting
- [ ] Subtask context inheritance
- [ ] AI suggestions in chat ("+ Add as subtask")

---

## Development Principles

- **Foundation first**: A bad chat experience is a non-starter
- **Baby steps**: Small iterations, quality over speed
- **No bloat**: Every feature must earn its place
- **Speed matters**: Optimize for time-to-first-token
- **Tasks are central**: All assists feed into the task hub

---

*Last Updated: January 30, 2026*
