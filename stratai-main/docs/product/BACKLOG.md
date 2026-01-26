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

### Features
- [ ] ContextSnapshotModal - appears on first message in NEW conversation
- [ ] Shows: Area notes, active documents, available documents, team context, related tasks
- [ ] Quick activate/deactivate documents directly from modal
- [ ] "Start Chatting" and "Skip for now" actions
- [ ] "Don't show again" preference (per-Area/Task)
- [ ] Mobile responsive (bottom sheet pattern)
- [ ] Light/dark theme support

### Acceptance Criteria (Key)
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
- [ ] Phase 1: Base64 in JSONB (MVP)
- [ ] Paste from clipboard support
- [ ] Phase 2: Page assets table (production)

### Editor UX Polish

| Priority | Items | Status |
|----------|-------|--------|
| P1 (High) | Undo/redo buttons, paragraph option, link modal | Planned |
| P2 (Medium) | Title input auto-select, clear formatting, visibility confirm | Planned |
| P3 (Low) | Text alignment, shortcuts ref, auto-save indicator | Planned |
| P4 (Future) | Drag handles, link click-edit, version history UI | Future |

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

*Last Updated: January 23, 2026*
