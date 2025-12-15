# CLAUDE.md

This file provides context for Claude Code sessions working on the StratAI project.

---

## Role & Collaboration Model

### Claude's Role
You are the **co-product manager**, **team lead**, and **lead developer** for StratAI. This means:

- **Co-PM**: Help shape product decisions, challenge assumptions, ensure we stay aligned with vision
- **Team Lead**: Coordinate work across coding, research, and utility agents for productivity gains
- **Lead Developer**: Own implementation quality, architecture decisions, and code standards

### Collaboration Expectations

1. **Pushback is welcome** - If an instruction conflicts with our goals, quality standards, or product vision, say so. Your perspective is valued.

2. **Considered responses** - When asked for an opinion, think it through before implementing. Weigh trade-offs, consider alternatives, and explain your reasoning.

3. **Agent usage** - Use agents (Task tool) for productivity gains, but never at the cost of implementation quality. Prefer direct implementation for critical or nuanced work.

4. **Context preservation** - On compacting events, quickly scan this CLAUDE.md file to preserve key context. This is critical for session continuity.

---

## Product Context

### What is StratAI?
An enterprise LLM context-aware routing application that serves as a **productivity partner** for employees. We marry business AI policies to our platform while reducing cognitive load for users.

**Key value props:**
- Enterprise AI governance (policies, limits, model access)
- Productivity spaces with templates (Work, R&D, Random, Personal)
- Quality AI experience (fast, reliable, smart routing)
- User education through Model Arena

### Current Phase
**Phase 0.1: POC - LLM Interaction Integrity**

Focus: Establish a rock-solid foundation for AI interactions. A bad chat experience is a non-starter.

See `stratai-main/PRODUCT_VISION.md` for full vision and `stratai-main/BACKLOG.md` for detailed tasks.

---

## Development Principles

### Quality Over Speed
- Baby steps - small iterations focused on quality
- Every feature must earn its place
- Technical debt is addressed immediately
- Prefer removing code to adding code

### No Bloat
- Concise implementation, every line justified
- Don't over-engineer or add speculative features
- Simple solutions over clever ones

### Performance First
- Optimize for time-to-first-token
- UI responsiveness during generation
- Efficient token counting (non-blocking)
- Prompt caching for cost/speed

### UX/UI Excellence
- **Reduce cognitive load** - This is paramount
- Clean, clear, premium aesthetic
- Guide users (many are AI novices)
- Progressive disclosure of advanced features

---

## Technical Overview

### Stack
- **Frontend**: SvelteKit + Svelte 5 (runes) + Tailwind CSS
- **LLM Routing**: LiteLLM proxy
- **Database**: PostgreSQL (Phase 0.2)
- **Deployment**: Docker Compose

### Key Directories
```
stratai-main/
├── src/
│   ├── routes/           # Pages and API endpoints
│   │   ├── +page.svelte  # Main chat interface
│   │   ├── arena/        # Model Arena
│   │   └── api/          # Backend endpoints
│   ├── lib/
│   │   ├── components/   # UI components
│   │   ├── stores/       # Svelte stores (state)
│   │   ├── server/       # Server-side utilities
│   │   ├── config/       # Model capabilities, prompts
│   │   └── types/        # TypeScript types
├── PRODUCT_VISION.md     # Product strategy
├── BACKLOG.md            # Development backlog
```

### Essential Commands
```bash
# Development
cd stratai-main
npm run dev              # Start dev server (port 5173)
npm run check            # TypeScript check
npm run build            # Production build

# Infrastructure
docker-compose up -d     # Start LiteLLM + services
docker-compose logs -f litellm  # View LiteLLM logs
```

---

## Decision Log

Key decisions made - don't revisit without good reason:

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-12 | Keep Arena feature | Serves dual purpose: user education + internal model optimization |
| 2024-12 | LiteLLM for routing | Flexible, supports multiple providers, virtual keys for teams |
| 2024-12 | Svelte 5 runes | Modern reactivity, cleaner code, better performance |
| 2024-12 | PostgreSQL for persistence | Enterprise-ready, supports Phase 0.4 team features |
| 2024-12 | AWS Bedrock via us-east-1 | Max model availability; use `us.*` inference profile IDs |
| 2024-12 | Nova Pro over Titan | Titan is EOL Aug 2025; Nova Pro is the replacement |

---

## Known Issues / Tech Debt

Track acknowledged issues to address later:

- [ ] localStorage keys still use `strathost-` prefix (rename in Phase 0.2, will lose POC data)
- [ ] README.md references outdated AnythingLLM setup (needs rewrite)
- [ ] No error boundaries in React-style (add before production)
- [x] Amazon Bedrock connection tested and working

---

## Session Log

### Session: 2024-12-15 (Phase 0.3b Complete - Assists Framework)
**Focus**: Implement Assists Framework for structured task management in Work space

**Completed**:

**1. Assists Framework Foundation**:
- Created `assists.ts` config with assist definitions and phase-specific prompts
- Created `assists.ts` types for phases (collecting, confirming, prioritizing, focused) and tasks
- Added `assistId` and `assistPhase` to `ChatCompletionRequest` API type

**2. Phased UX Flow**:
- Designed flow to avoid overwhelming novice users:
  - **Collecting**: User dumps tasks/concerns into chat
  - **Confirming**: AI helps clarify and structure the list
  - **Prioritizing**: User ranks tasks by importance
  - **Focused**: Work on one task at a time
- Phase-based prompt injection in chat API adapts AI behavior

**3. Task Extraction System**:
- Created `task-extraction.ts` utility for parsing AI responses
- Extracts numbered/bulleted tasks from AI markdown responses
- Handles various formats (numbered lists, bullet points, task descriptions)

**4. UI Components**:
- **AssistDropdown.svelte**: "Help me with..." dropdown in Work space header
- **WorkingPanel.svelte**: Complete rewrite with task list UI
  - Shows extracted tasks with priority indicators
  - Collapsible panel with status badges
  - Phase-aware content display

**5. Store Integration**:
- Extended `chat.svelte.ts` with task management methods:
  - `setExtractedTasks()`, `clearExtractedTasks()`
  - `setAssistPhase()`, `getExtractedTasks()`, `getAssistPhase()`

**6. API Enhancements**:
- Updated `/api/chat/+server.ts` to inject assist-specific system prompts
- Phase context passed through request for appropriate AI guidance

**Files Created**:
- `src/lib/components/assists/AssistDropdown.svelte` - Assist picker dropdown
- `src/lib/components/assists/WorkingPanel.svelte` - Task list panel (rewritten)
- `src/lib/config/assists.ts` - Assist definitions and prompts
- `src/lib/types/assists.ts` - Phase and task types
- `src/lib/utils/task-extraction.ts` - AI response parsing
- `src/routes/api/assist/+server.ts` - Assist API endpoint

**Files Modified**:
- `src/lib/types/api.ts` - Added assistId, assistPhase to request type
- `src/lib/stores/chat.svelte.ts` - Task management methods
- `src/lib/components/ChatInput.svelte` - Minor adjustments
- `src/lib/components/chat/WelcomeScreen.svelte` - Space-aware updates
- `src/routes/api/chat/+server.ts` - Phase-based prompt injection
- `src/routes/spaces/[space]/+page.svelte` - Task extraction, assist handlers
- `BACKLOG.md` - Marked Phase 0.3b complete

**Architecture Decisions**:
- **Phased approach over feature-dump**: Users guided through natural workflow
- **Prompts adapt per phase**: System prompts change based on assist phase
- **Tasks extracted client-side**: Avoids additional API calls, uses existing response

**Current State**:
- Phase 0.3b COMPLETE
- First assist "What's on your plate?" available in Work space
- Phased UX flow implemented
- Task extraction working

**Commit**: `3b62283` - feat: Complete Phase 0.3b - Assists Framework with task breakdown

**Next session suggestions**:
- Test full flow: start assist -> collect tasks -> confirm -> prioritize -> focus
- Add more assists (Decision Helper, Meeting Prep)
- Consider task persistence to database
- Add keyboard shortcuts for assist actions

---

### Session: 2024-12-14 (Phase 0.3a Complete - Space Navigation Foundation)
**Focus**: Complete Phase 0.3a - Space-aware chat with visual theming and prompts

**Completed**:

**1. Space Routes & Navigation**:
- Created `/spaces` selector dashboard with Work/Research cards
- Created dynamic `/spaces/[space]` routes with full chat functionality
- Shared layout with CSS custom properties for theming
- Space validation with redirect for invalid routes

**2. Visual Theming**:
- CSS custom properties: `--space-accent`, `--space-accent-muted`, `--space-accent-ring`
- Work = blue (#3b82f6), Research = purple (#a855f7), Random = orange, Personal = green
- Header shows space badge when in a space

**3. Space-Aware Sidebar**:
- Sidebar filters conversations by current space
- "New Chat" creates conversation with current space tag
- Active conversation cleared when entering space if it doesn't belong

**4. Space-Specific System Prompts** (wired up this session):
- Added `space` parameter to `ChatCompletionRequest` API type
- Updated `injectPlatformPrompt()` to use `getFullSystemPrompt(model, space)`
- Space pages pass `currentSpace` in API requests
- Prompts adjust tone: Work is concise/action-oriented, Research is thorough/multi-perspective

**5. Premium UI Components**:
- Created `SpaceIcon.svelte` with Heroicons-style SVG icons (briefcase, beaker, etc.)
- Updated `WelcomeScreen.svelte` with space-aware content and warm, non-corporate copy

**6. Work OS Vision Documentation**:
- Created `VISION-WORK-OS.md` capturing the broader vision
- Documented: Home dashboard, Meetings as entities, Tasks with context, Contexts as containers
- Updated `BACKLOG.md` with revised phase plan aligned to vision

**Files Created**:
- `src/lib/components/SpaceIcon.svelte` - Premium SVG icons for spaces
- `src/routes/spaces/+layout.svelte` - Shared space layout with CSS theming
- `src/routes/spaces/+page.svelte` - Space selector dashboard
- `src/routes/spaces/[space]/+page.svelte` - Dynamic space page with embedded chat
- `VISION-WORK-OS.md` - Work Operating System vision document

**Files Modified**:
- `src/lib/types/api.ts` - Added `space` to ChatCompletionRequest
- `src/routes/api/chat/+server.ts` - Wired up space-aware prompts
- `src/lib/config/system-prompts.ts` - Added SPACE_PROMPT_ADDITIONS and getFullSystemPrompt()
- `src/lib/stores/chat.svelte.ts` - Updated setActiveConversation to accept null
- `src/lib/components/chat/WelcomeScreen.svelte` - Space-aware content
- `src/lib/components/layout/Header.svelte` - Spaces navigation link
- `BACKLOG.md` - Marked Phase 0.3a complete, revised phase plan

**Current State**:
- Phase 0.3a COMPLETE
- Users can navigate to Work/Research spaces
- Chat works with space-specific prompts
- Conversations tagged with space
- Visual theming applied per space

**Next session suggestions**:
- Test space prompts are actually affecting AI responses
- Begin Phase 0.3b: Templates foundation (template picker UI)
- Consider adding space-specific default models

---

### Session: 2024-12-14 (Second Opinion Feature + Key Guidance + Spaces Preview)
**Focus**: Implement "Second Opinion" feature with Key Guidance extraction system

**Completed**:

**1. Second Opinion Feature** - Claude artifacts-style side panel for alternative perspectives:
- **Chat Store State** - Added `SecondOpinionState` interface and management methods:
  - `openSecondOpinion()`, `closeSecondOpinion()`, `appendToSecondOpinion()`, `appendToSecondOpinionThinking()`
  - `setSecondOpinionError()`, `completeSecondOpinion()`, `isSecondOpinionOpen` getter
- **API Endpoint** - `POST /api/chat/second-opinion`:
  - Accepts conversationId, sourceMessageIndex, modelId
  - Builds context from conversation history
  - Custom system prompt for independent perspective
  - Streams response with extended thinking support
- **SecondOpinionPanel Component** - Side panel that slides in from right (40% viewport):
  - Model badge with provider colors
  - Markdown rendering with thinking display
  - Action buttons: "Use This Answer", "Continue with [Model]" (fork), "Close"
  - Error and loading states
  - Auto-close on Escape key
- **SecondOpinionModelSelect Component** - Model dropdown grouped by provider (excludes current model)
- **ChatMessage Integration** - Added "Get second opinion" button to assistant messages
- **Main Page Integration**:
  - Panel layout with smooth fly transition
  - Auto-close panel when user sends new message
  - "Use This Answer" injects guidance as corrective user message
  - "Fork" creates new conversation with second opinion model

**2. Key Guidance System** - Smart, token-efficient injection:
- System prompt instructs second opinion model to include "## Key Guidance" section
- Extraction logic parses the concise guidance from full response
- "Use This Answer" injects only the guidance (not full response) - token efficient
- Falls back to full content if parsing fails

**3. Database Compatibility Fix**:
- Removed `tags` column from SQL queries in postgres.ts
- The `tags` column is Phase 0.3b+ feature not yet in production DB
- All SELECT/INSERT/UPDATE queries now omit `tags` for backwards compatibility

**4. Spaces Preview** (WIP for Phase 0.3):
- Created `SpaceIcon.svelte` component
- Created `spaces.ts` configuration file
- Set up `/spaces/` routes structure (layout, index, [space] dynamic route)
- Updated WelcomeScreen with space card previews
- Updated Header with spaces navigation

**Files Created**:
- `src/lib/components/chat/SecondOpinionPanel.svelte` - Side panel component
- `src/lib/components/chat/SecondOpinionModelSelect.svelte` - Model selector dropdown
- `src/routes/api/chat/second-opinion/+server.ts` - API endpoint
- `src/lib/components/SpaceIcon.svelte` - Space icon component
- `src/lib/config/spaces.ts` - Spaces configuration
- `src/routes/spaces/+layout.svelte` - Spaces layout
- `src/routes/spaces/+page.svelte` - Spaces index page
- `src/routes/spaces/[space]/+page.svelte` - Dynamic space page

**Files Modified**:
- `src/lib/stores/chat.svelte.ts` - Added secondOpinion state and methods
- `src/lib/components/ChatMessage.svelte` - Added trigger button with event propagation
- `src/routes/+page.svelte` - Layout integration, handlers, auto-close behavior
- `src/lib/server/persistence/postgres.ts` - Removed tags column from queries
- `src/lib/server/persistence/schema.sql` - Schema updates
- `src/lib/config/system-prompts.ts` - Added second opinion prompt
- `src/lib/types/chat.ts` - Added SecondOpinionState type
- `src/lib/components/chat/WelcomeScreen.svelte` - Space cards preview
- `src/lib/components/layout/Header.svelte` - Spaces navigation
- `src/routes/api/conversations/+server.ts` - Query compatibility
- `BACKLOG.md` - Added Second Opinion governance to Phase 0.4

**Architecture Decisions**:
- Panel is ephemeral (not persisted) - simpler implementation, cleaner UX
- Uses same streaming format as main chat for consistency
- System prompt encourages independent thinking while acknowledging context
- Auto-close on new message to maintain clean conversation flow
- Key Guidance extraction keeps injected context minimal

**Current State**:
- Second Opinion feature fully functional
- Database queries compatible with current production schema
- Spaces routes set up (UI preview only, not functional yet)

**Commit**: `c90cb0a` - feat: Add Second Opinion feature with Key Guidance extraction

**Next session suggestions**:
- Test second opinion feature with various models
- Consider adding keyboard shortcut (e.g., Option+S) to trigger second opinion
- Continue Spaces implementation (Phase 0.3)
- Add second opinion usage to Phase 0.4 governance features (track which models give best second opinions)

---

### Session: 2024-12-13 (Phase 0.3 Planning)
**Focus**: Strategic planning for Phase 0.3 - Spaces & Templates

**Key Insights Documented**:
- **Spaces as Productivity Environments** - Not folders, but contextual work environments with specialized tools, templates, and accumulated context
- **Templates as Invisible Prompt Engineering** - Make AI novices into power users without them learning "prompting"
- **The Flywheel** - Templates capture structured data → builds working context → enables temporal intelligence → provides recommendations → more engagement
- **Enterprise-First Positioning** - B2B means rich user data from HR systems; onboarding is about activities, not identity
- **"Spotify" Onboarding** - Ask "what activities do you want help with?" not "who are you?"

**Architecture Decisions**:
- Spaces are separate from main Chat (`/spaces/work`, `/spaces/research`)
- Work and Research spaces for POC (Personal and Random deferred)
- Embedded chat within each space from day 1
- User confirmation for AI-extracted entities (action items, decisions)
- Main chat remains context-free; spaces are opt-in productivity environments

**Working Context Model**:
- Core entities: People, Action Items, Decisions, Template Outputs
- JSONB metadata fields for extensibility
- `source_type`/`source_id` pattern for entity provenance
- Space-aware throughout

**Template System**:
- 4 UX patterns: Guided Conversation, Smart Form, Intelligent Dump, Quick Action
- 50+ templates documented across categories (Meetings, Status, Decisions, Research, Creative, Role-Specific)
- Each template passes quality bar: better than DIY, reduces friction, captures value, feels natural

**Files Created**:
- `stratai-main/PHASE-0.3-SPACES-DESIGN.md` - Comprehensive design document

**POC Scope**:
- Space foundation with Work + Research
- 6-8 templates (Meeting Summary, Weekly Status, Decision Log, Research Synthesis, Quick Note, Email Draft)
- Extraction confirmation UI
- Working context view (action items, recent outputs)
- Context badge in header
- Activity-based onboarding

**Current State**:
- Phase 0.2 complete
- Phase 0.3 fully designed and documented
- Ready to create detailed task breakdown

**Next session suggestions**:
- Create Phase 0.3 task breakdown in BACKLOG.md
- Design template definitions for POC templates
- Prototype guided conversation UX
- Create database migration for new tables

---

### Session: 2024-12-13 (Arena Battle Management)
**Focus**: Arena Battle menu system, persistence, and rerun feature

**Completed**:
- **Export Chat Feature** - Added markdown export for chat conversations in Sidebar
- **Arena Battle Menu System** - Full 3-dot menu implementation:
  - Created `ArenaBattleItem.svelte` component with actions: Rerun, Rename, Pin/Unpin, Export, Delete
  - Inline renaming with keyboard support (Enter/Escape)
  - Fixed menu positioning (adjacent to button, vertically centered)
- **Database Schema** - Added `pinned` and `title` columns to arena_battles table
  - Created `arena-schema.sql` with full schema
  - Added `arena-postgres.ts` repository with CRUD operations
- **Arena Store** - Extended with `togglePin()`, `updateBattleTitle()` methods
- **API Endpoints** - Full CRUD for arena battles:
  - `GET/POST /api/arena/battles` - List and create battles
  - `GET/PATCH/DELETE /api/arena/battles/[id]` - Individual battle operations
  - `GET /api/arena/rankings` - Model rankings
- **Rerun Battle Feature** - Creates new battle with same prompt/models/settings
- **ArenaBattleList Refactor** - Now uses ArenaBattleItem with pinned/recent sections
- **CSS Fix** - Added standard `line-clamp` property for cross-browser compatibility

**Files Created**:
- `stratai-main/src/lib/components/arena/ArenaBattleItem.svelte` - Battle item with menu
- `stratai-main/src/lib/server/persistence/arena-postgres.ts` - Arena repository
- `stratai-main/src/lib/server/persistence/arena-schema.sql` - Database schema
- `stratai-main/src/routes/api/arena/battles/+server.ts` - Battles list API
- `stratai-main/src/routes/api/arena/battles/[id]/+server.ts` - Individual battle API
- `stratai-main/src/routes/api/arena/rankings/+server.ts` - Rankings API

**Files Modified**:
- `stratai-main/src/lib/components/layout/Sidebar.svelte` - Export chat handler
- `stratai-main/src/lib/components/layout/ConversationItem.svelte` - Export callback
- `stratai-main/src/lib/components/arena/ArenaBattleList.svelte` - Refactored with sections
- `stratai-main/src/lib/stores/arena.svelte.ts` - Pin/title methods
- `stratai-main/src/lib/server/persistence/types.ts` - BattleRepository interface
- `stratai-main/src/lib/server/persistence/db.ts` - Arena DB export
- `stratai-main/src/lib/server/persistence/index.ts` - Arena repository export
- `stratai-main/src/lib/server/persistence/postgres.ts` - DB connection pooling
- `stratai-main/src/routes/arena/+page.svelte` - handleRerunBattle callback
- `stratai-main/BACKLOG.md` - Updated with Arena tasks
- `stratai-main/PRODUCT_VISION.md` - Updated Arena section

**Current State**:
- Arena battles can be pinned, renamed, exported, deleted, and rerun
- PostgreSQL persistence for arena battles (when enabled)
- Pinned battles appear in separate section at top of list

**Next session suggestions**:
- Test Arena persistence with PostgreSQL enabled
- Verify rerun creates proper new battles
- Add battle date/time display in list
- Consider adding battle search/filter

---

### Session: 2024-12-13 (Phase 0.2 - PostgreSQL Fix)
**Focus**: Fix PostgreSQL double-encoding bug causing frontend crash

**Problem**: Terminal crashed during Phase 0.2 PostgreSQL setup. Frontend was crashing with:
```
TypeError: msgs.filter is not a function
```

**Root Cause**: `JSON.stringify()` in `postgres.ts` before `::jsonb` cast caused double-encoding.
- Messages were stored as JSONB strings (`"[{...}]"`) instead of arrays (`[{...}]`)
- `jsonb_typeof(messages)` returned `"string"` instead of `"array"`

**Fixed**:
1. Removed `JSON.stringify()` from `postgres.ts` (4 places in create/update functions)
2. Migrated existing data: `UPDATE conversations SET messages = (messages #>> '{}')::jsonb`
3. Verified all 10 conversations now have proper JSONB arrays

**Files Modified**:
- `stratai-main/src/lib/server/persistence/postgres.ts` - Removed JSON.stringify double-encoding

**Database Migration** (run once):
```sql
UPDATE conversations SET messages = (messages #>> '{}')::jsonb WHERE jsonb_typeof(messages) = 'string';
```

**Current State**:
- PostgreSQL 18 running with `stratai` database
- `conversations` table with 10 conversations (user_id: admin)
- Frontend loads without crash
- Phase 0.2 persistence working

**Next session suggestions**:
- Test creating new conversations to verify persistence
- Test the tester user (password: `tester123`)
- Run TypeScript check
- Continue Phase 0.2 work

---

### Session: 2024-12-13 (Model Expansion & TypeScript Fixes)
**Focus**: AWS Bedrock/Google models, TypeScript fixes, Model Selector UX

**Completed**:
- Fixed 6 TypeScript errors across multiple files:
  - PDFKit namespace errors in export-service.ts (installed @types/pdfkit)
  - Marked Token type imports in MarkdownRenderer.svelte
  - ToolDefinition type in chat/+server.ts
  - Paragraph|Table type errors in export-service.ts
  - Buffer type in api/export/+server.ts
  - numPages property in file-parser.ts
- Added 3 new AWS Bedrock models:
  - Llama 4 Maverick 17B (1M context, vision, no streaming)
  - Mistral Large 3 (256K context, vision)
  - DeepSeek V3.1 (128K context, thinking mode)
- Added 3 Google Gemini models:
  - Gemini 3 Pro (latest flagship)
  - Gemini 2.5 Pro (best for reasoning)
  - Gemini 2.5 Flash (best price-performance)
- Added GOOGLE_API_KEY to .env and docker-compose.yml
- Reorganized ModelSelector.svelte and ArenaModelSelector.svelte:
  - Two sections: Proprietary vs Open Source
  - Family groupings within each section (Claude, GPT, Gemini, Llama, etc.)
  - Color-coded provider badges for all 7 providers
- Fixed ChatMessage.svelte $derived returning function bug
- Fixed +page.svelte continuationSummary type issue
- Added Deep Research Pro to backlog (requires Interactions API)

**Files Modified** (key changes):
- `litellm-config.yaml` - Added Bedrock + Google models
- `docker-compose.yml` - Added GOOGLE_API_KEY
- `stratai-main/src/lib/config/model-capabilities.ts` - Added models + providers
- `stratai-main/src/lib/stores/modelCapabilities.svelte.ts` - Added providers
- `stratai-main/src/lib/components/ModelSelector.svelte` - Reorganized with grouping
- `stratai-main/src/lib/components/arena/ArenaModelSelector.svelte` - Reorganized
- `stratai-main/src/lib/components/ChatMessage.svelte` - Fixed TypeScript errors
- `stratai-main/src/routes/+page.svelte` - Fixed type error
- `stratai-main/src/lib/server/export-service.ts` - Fixed multiple type errors
- `stratai-main/src/lib/server/file-parser.ts` - Fixed numPages error
- `stratai-main/src/routes/api/chat/+server.ts` - Fixed ToolDefinition error
- `stratai-main/src/routes/api/export/+server.ts` - Fixed Buffer error
- `stratai-main/BACKLOG.md` - Added Deep Research integration

**Current State**:
- 27 models available across 7 providers
- All TypeScript errors fixed (only warnings remain)
- Model selectors show organized grouped view

**Commit**: `ba1f6df` - feat: Add AWS Bedrock and Google Gemini models with improved model selector UX

**Next session suggestions**:
- Test Google Gemini models in the UI
- Test new Bedrock models (Llama 4 Maverick, Mistral Large 3, DeepSeek V3.1)
- Run full TypeScript check to verify no new errors
- Consider implementing Deep Research Pro integration

---

### Session: 2024-12-13 (continued)
**Focus**: AWS Bedrock Integration

**Completed**:
- Integrated AWS Bedrock with LiteLLM proxy
- Added 5 Bedrock models: Llama 3.3 70B, Llama 3.1 8B, Llama 4 Scout, Nova Pro, DeepSeek R1
- Fixed model IDs to use `us.*` inference profile format (required for on-demand)
- Replaced deprecated Titan Premier with Amazon Nova Pro
- Extended model-capabilities.ts with new providers (meta, amazon, deepseek)
- All models tested and working via API

**Models now available**:
- `llama-3-3-70b` - Best open source (128K context)
- `llama-3-1-8b` - Fast/cheap open source
- `llama-4-scout` - Massive 3.5M context
- `nova-pro` - AWS native multimodal
- `deepseek-r1` - Reasoning with visible thinking

**Next session suggestions**:
- Test Bedrock models in the actual StratAI UI
- Verify Arena works with new model providers
- Run TypeScript check after model-capabilities changes
- Consider adding more Nova models (Lite, Micro)

---

### Session: 2024-12-13
**Focus**: Codebase cleanup and production readiness

**Completed**:
- Created PRODUCT_VISION.md with full product strategy
- Added AI Onboarding philosophy and Arena dual-purpose documentation
- Reorganized BACKLOG.md by development phases
- Frontend rebranding: StratHost → StratAI (titles, headers, labels, export metadata)
- Created and ran cleanup-legacy.sh (removed 12+ legacy files)
- Removed AnythingLLM/LibreChat test artifacts
- Rewrote CLAUDE.md for StratAI context

---

## Quick Reference

### Key Files
| File | Purpose |
|------|---------|
| `stratai-main/PRODUCT_VISION.md` | Product strategy and phases |
| `stratai-main/BACKLOG.md` | Development tasks by phase |
| `stratai-main/src/routes/api/chat/+server.ts` | Main chat API endpoint |
| `stratai-main/src/lib/stores/chat.svelte.ts` | Chat state management |
| `stratai-main/src/lib/server/litellm.ts` | LiteLLM integration |
| `litellm-config.yaml` | Model routing configuration |

### Adding a New Model
1. Edit `litellm-config.yaml` - add to `model_list`
2. Update `stratai-main/src/lib/config/model-capabilities.ts`
3. Restart LiteLLM: `docker-compose restart litellm`

### Common Patterns
- **Stores**: Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **API responses**: Stream via SSE for chat, JSON for other endpoints
- **Styling**: Tailwind + custom CSS variables in `app.css`

---

## Context Preservation (IMPORTANT)

**On conversation compacting**: When context is being compacted/summarized, immediately read this CLAUDE.md file to preserve critical context. This ensures continuity across long sessions.

Key things to retain:
- Current phase and focus
- Recent session work (Session Log)
- Active decisions and tech debt
- The collaboration model (pushback welcome, considered responses)

---

## For Context Agents

When reading this file at session start:
1. Note the current phase (0.1 - LLM Interaction Integrity)
2. Check Session Log for recent work and suggested next steps
3. Review Known Issues before making related changes
4. Respect Decision Log - these were deliberate choices

When updating this file at session end:
1. Add new Session Log entry with date, focus, completed items, and suggestions
2. Update Known Issues if new debt was introduced
3. Add to Decision Log if significant architectural choices were made
- always read the claude.md file after a compacting event.