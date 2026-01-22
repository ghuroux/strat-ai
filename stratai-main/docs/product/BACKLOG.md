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

*Last Updated: January 22, 2026*
