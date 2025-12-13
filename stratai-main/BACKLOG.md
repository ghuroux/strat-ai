# StratAI Development Backlog

This file tracks planned features and improvements, aligned with the product vision in `PRODUCT_VISION.md`.

---

## Phase 0.1: POC - LLM Interaction Integrity (COMPLETE)

**Goal**: Establish a rock-solid foundation for AI interactions ✅

### Completed
- [x] Core chat functionality with streaming
- [x] Multi-model support via LiteLLM (27 models, 7 providers)
- [x] Token counting with js-tiktoken
- [x] System prompt caching (Anthropic)
- [x] Extended thinking (Claude) / Reasoning effort (OpenAI)
- [x] Model capability detection
- [x] Document export (Markdown, DOCX, PDF)
- [x] Model Arena with AI judging
- [x] Frontend branding (StratHost → StratAI)
- [x] AWS Bedrock integration (5 models)
- [x] Google Gemini integration (3 models)

### Deferred to Later
- [ ] Backend branding (localStorage keys use strathost- prefix)
- [ ] Performance baseline measurement
- [ ] Error boundary implementation

---

## Phase 0.2: Persistence & History (COMPLETE)

**Goal**: Users never lose their work ✅

### Database Integration
- [x] PostgreSQL setup (local PostgreSQL 18)
- [x] Implement PostgreSQL adapter for existing repository interfaces
- [x] Migration from in-memory to persistent storage (hybrid: localStorage cache + PostgreSQL source of truth)

### Chat History
- [x] Conversation list sidebar (Sidebar.svelte with pinned/recent sections)
- [x] Auto-generated chat titles (from first user message)
- [x] Search across conversations (local search in sidebar)
- [x] Delete/archive conversations (soft delete with deleted_at)

### Data Management
- [x] Export conversations (JSON via exportConversation)
- [x] Import conversations (JSON via importConversation)
- [ ] Storage usage indicators (deferred - nice-to-have)

### Bonus: Arena Persistence
- [x] Arena battles table with full response content
- [x] Model rankings with Elo ratings (K=32, start 1500)
- [x] API sync for battles, votes, judgments

---

## Phase 0.3: Spaces & Templates (NEXT)

**Goal**: Reduce cognitive load, fast-track productivity

### Space Framework
- [ ] Space concept implementation (Work, R&D, Random, Personal)
- [ ] Space-specific default models
- [ ] Space-specific system prompts
- [ ] Visual differentiation between spaces

### Template System
- [ ] Template library per space
- [ ] Template variables/placeholders
- [ ] Quick template selection UI
- [ ] Custom template creation

### Work Space (Priority)
- [ ] Meeting summary template
- [ ] Email drafting template
- [ ] Document review template
- [ ] Report generation template

### R&D Space (Priority)
- [ ] Research synthesis template
- [ ] Competitive analysis template
- [ ] Brainstorming template
- [ ] Technical exploration template

---

## Phase 0.4: Team Management

**Goal**: Multi-user enterprise foundation

### Authentication
- [ ] User registration/login
- [ ] Password reset flow
- [ ] Session management improvements

### Team Structure
- [ ] Team creation
- [ ] User invitations
- [ ] Role definitions (admin, member)
- [ ] LiteLLM virtual keys per team

### Usage Tracking
- [ ] Per-user token usage
- [ ] Per-team token usage
- [ ] Usage history/trends

---

## Phase 0.5: Policy Engine

**Goal**: Enterprise AI governance

### Policy Definition
- [ ] Model access control per team
- [ ] Usage limits and quotas
- [ ] Content filtering rules
- [ ] Allowed/blocked features per team

### Admin Dashboard
- [ ] Team overview
- [ ] Usage analytics
- [ ] Policy management UI
- [ ] Audit logging

---

## Ongoing: Model Arena Evolution

**Purpose**: User education + Internal optimization (see PRODUCT_VISION.md)

### Current (Complete)
- [x] Multi-model comparison (2-4 models)
- [x] AI-powered judging
- [x] User voting
- [x] Battle history

### Phase 2: Context-Aware Arena
- [ ] "Send to Arena" from chat (with conversation context)
- [ ] Conversation summary injection for context
- [ ] Follow-up rounds within battles
- [ ] Per-model conversation history in battles

### Phase 3: A/B Testing Mode
- [ ] Same model, different settings comparison
- [ ] Temperature variations
- [ ] Thinking budget variations
- [ ] Save optimal settings per use case

### Phase 4: Model Strength Mapping
- [ ] Categorize prompts by task type
- [ ] Track win rates per model per category
- [ ] Generate model recommendations
- [ ] Background automated testing (future)

### Phase 5: Analytics
- [ ] Win rate dashboard
- [ ] Head-to-head charts
- [ ] Cost per battle tracking
- [ ] Export statistics

---

## Technical Improvements (Ongoing)

### Google Deep Research Integration
**Status**: Planned

Google's Deep Research Pro (`deep-research-pro-preview`) is an autonomous research agent that uses the Interactions API (async polling), not standard chat completions. Implementation would require:

- [ ] New "Deep Research" mode/feature in UI
- [ ] Async task creation via Google Interactions API
- [ ] Progress polling and status display
- [ ] Research results rendering (can be lengthy reports)
- [ ] File Search tool integration (optional - for custom data)

**Technical Notes**:
- Uses `POST /interactions` with `background: true`
- Poll `GET /interactions/{id}` for completion
- Research tasks can take minutes to complete
- Rate limit: 1 RPM (Tier 1)

### Prompt Caching Optimization
**Status**: Phase 1 Complete

- [x] System prompt caching
- [ ] Conversation history caching (cache breakpoints)
- [ ] Cache statistics in UI
- [ ] Cost savings display

**Technical Notes**:
- Anthropic: 90% discount cached reads, 25% premium writes, 5-min TTL
- OpenAI: 50% discount, automatic for 1024+ tokens

### Token Management
**Status**: Complete

- [x] Accurate counting with js-tiktoken
- [x] Context window percentage display
- [ ] Real-time count as user types
- [ ] Warning when approaching limit
- [ ] Auto-summarization near limit

### UX Enhancements
- [ ] Keyboard shortcuts (Cmd+Enter, Cmd+K, Escape)
- [ ] Edit sent messages and regenerate
- [ ] Fork conversation from any point
- [ ] Dark/light/system theme (complete)

---

## Priority Matrix

| Feature | Phase | Impact | Effort | Status |
|---------|-------|--------|--------|--------|
| ~~Codebase cleanup~~ | 0.1 | High | Low | ✅ |
| ~~Bedrock integration~~ | 0.1 | Medium | Low | ✅ |
| ~~PostgreSQL integration~~ | 0.2 | Critical | Medium | ✅ |
| ~~Chat history sidebar~~ | 0.2 | Critical | Medium | ✅ |
| Space framework | 0.3 | High | Medium | Next |
| Work templates | 0.3 | High | Medium | Next |
| Send to Arena (context) | Arena | Medium | Medium | Planned |
| Team management | 0.4 | High | High | Planned |
| Policy engine | 0.5 | High | High | Planned |

---

## Notes

- **Foundation first**: A bad chat experience is a non-starter
- **Baby steps**: Small iterations, quality over speed
- **No bloat**: Every feature must earn its place
- **Speed matters**: Optimize for time-to-first-token
- **Guide users**: Many are AI novices, help them succeed

---

*Aligned with PRODUCT_VISION.md - Last Updated: December 2024*
*Completed: Phase 0.1, Phase 0.2 | Next: Phase 0.3 Spaces & Templates*
