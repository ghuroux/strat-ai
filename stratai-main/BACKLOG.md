# StratAI Development Backlog

This file tracks planned features and improvements, aligned with the product vision.

> **Vision Reference**: See `VISION-WORK-OS.md` for the full Work Operating System vision.
> **Spaces Design**: See `PHASE-0.3-SPACES-DESIGN.md` for Phase 0.3 implementation details.

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

**Goal**: Reduce cognitive load, fast-track productivity through invisible prompt engineering

> **Design Reference**: See `PHASE-0.3-SPACES-DESIGN.md` for complete vision, philosophy, and technical details.

**Core Insight**: Templates are not shortcuts—they're invisible prompt engineering that makes AI novices into power users. Spaces are not folders—they're productivity environments with accumulated context.

This phase is broken into 7 sub-phases to ensure quality and allow course-correction.

---

### Phase 0.3a: Space Navigation Foundation (COMPLETE)
**Goal**: Establish space infrastructure with embedded chat ✅

**Database**:
- [x] `space` column exists in `conversations` table
- [x] `tags` column added for future project tagging
- [x] Indexes for space and tags queries

**Routes & Navigation**:
- [x] `/spaces` route (space selector dashboard)
- [x] `/spaces/work` route with embedded chat
- [x] `/spaces/research` route with embedded chat
- [x] Space switcher in header
- [x] Dynamic `[space]` route handling

**Visual Differentiation**:
- [x] Space-specific accent colors (Work=blue, Research=purple)
- [x] Premium SVG icons (SpaceIcon component)
- [x] Space-aware welcome screens with tailored copy
- [x] CSS custom properties for theming

**Embedded Chat**:
- [x] Full chat functionality within each space
- [x] Conversations tagged with space on creation
- [x] Space-aware sidebar (shows only space conversations)
- [x] Active conversation cleared when entering different space
- [x] Space-specific system prompt additions (defined, ready to wire)

**Depends on**: Phase 0.2 (PostgreSQL)

---

### Phase 0.3b: Template Framework
**Goal**: Build the template system architecture

**Template Definitions** (`src/lib/config/templates/`):
- [ ] Create `Template` interface with all properties
- [ ] Create `TemplateCategory` types
- [ ] Create `UXPattern` types (guided, form, dump, quick)
- [ ] Create template registry with space filtering
- [ ] Define extraction schema types

**Template UI Components**:
- [ ] `TemplatePicker.svelte` - Quick action grid
- [ ] `TemplateBrowser.svelte` - Full library with categories
- [ ] `TemplateCard.svelte` - Individual template display
- [ ] Template search/filter

**Template Execution Context**:
- [ ] Template execution store/state
- [ ] Space + user context injection
- [ ] Model selection per template

**First Template (Dump Pattern)**:
- [ ] "Quick Note → Structure" template
- [ ] Paste unstructured content → get organized output
- [ ] Validates basic execution pipeline

**Success Criteria**:
- Template picker displays available templates
- At least one template works end-to-end
- Architecture is extensible for other patterns

**Depends on**: Phase 0.3a

---

### Phase 0.3c: Guided Conversation Pattern
**Goal**: Build the signature UX innovation—conversational templates

This is the core differentiator. Users answer natural questions and get power-user results without learning "prompting."

**Conversation Step System**:
- [ ] `ConversationStep` interface (question, followUp, extraction)
- [ ] Step sequencing logic (linear + conditional)
- [ ] Dynamic question generation based on previous answers
- [ ] Step completion detection

**Step-by-Step UI**:
- [ ] `GuidedConversation.svelte` component
- [ ] Question display with context
- [ ] User response input (text, voice future)
- [ ] Progress indication (step X of Y)
- [ ] Back/edit previous answers
- [ ] Final output generation

**Meeting Summary Template** (Priority 1):
- [ ] Natural question sequence:
  - "What was this meeting about?"
  - "Who was there?"
  - "What were the key decisions?"
  - "Any action items or next steps?"
- [ ] Professional output formatting
- [ ] Attendee/action item extraction hints

**Success Criteria**:
- Meeting Summary feels like natural conversation
- Output quality exceeds freestyle prompting
- Users get power-user results without prompting knowledge

**Depends on**: Phase 0.3b

---

### Phase 0.3d: Form Pattern + Core Templates
**Goal**: Complete template variety with structured input

**Form-Based Template UI**:
- [ ] `FormTemplate.svelte` component
- [ ] Field type renderers (text, textarea, select, multiselect, date)
- [ ] Form validation (required, format)
- [ ] Submit → generate flow
- [ ] Preview before generation

**Weekly Status Update** (Work Space):
- [ ] Form fields: Accomplishments, In Progress, Blockers, Next Week
- [ ] Role/team-aware output formatting
- [ ] Professional structure

**Decision Log** (Work Space):
- [ ] Form fields: Decision, Rationale, Stakeholders, Date
- [ ] Clear documentation output
- [ ] Future-proof format for searching

**Research Synthesis** (Research Space - Guided):
- [ ] Question sequence for research topics
- [ ] Source tracking
- [ ] Findings → implications flow

**Email Draft** (Work Space - Guided):
- [ ] Recipient, purpose, key points
- [ ] Tone selection
- [ ] Professional output

**Success Criteria**:
- Form and guided patterns both functional
- At least 5 templates available across spaces
- Clear value over freestyle prompting

**Depends on**: Phase 0.3c

---

### Phase 0.3e: Entity Extraction System
**Goal**: Extract structured data from template outputs

**Database Schema**:
- [ ] Create `context_people` table
- [ ] Create `context_action_items` table
- [ ] Create `context_decisions` table
- [ ] Create `template_outputs` table
- [ ] Indexes for temporal queries
- [ ] Migration script

**Extraction Pipeline**:
- [ ] AI extraction prompts per entity type
- [ ] Extraction from template outputs (post-generation)
- [ ] Entity parsing and normalization
- [ ] Person deduplication (name matching)

**Extraction Types**:
- [ ] **Action Items**: title, assignee, due date, priority
- [ ] **Decisions**: title, rationale, stakeholders, status
- [ ] **People**: name, role, team, relationship type

**Integration with Templates**:
- [ ] Add `extractionSchema` to template definitions
- [ ] Trigger extraction after template completion
- [ ] Store raw extraction results

**Success Criteria**:
- Entities are extracted from Meeting Summary and Decision Log
- Extraction quality is reliable (>80% accuracy)
- Data is ready for confirmation UI

**Depends on**: Phase 0.3d

---

### Phase 0.3f: Confirmation & Working Context
**Goal**: User control over extracted entities + visible accumulated context

**Confirmation UI**:
- [ ] `ExtractionConfirmation.svelte` component
- [ ] Display extracted entities post-template
- [ ] Checkboxes to include/exclude items
- [ ] Inline editing before save
- [ ] "Save All" / "Save Selected" / "Skip" actions
- [ ] Clear messaging: "I found X items—confirm what to save"

**Entity Persistence**:
- [ ] Save confirmed entities to database
- [ ] Link entities to source template output
- [ ] Update person interaction counts
- [ ] Handle edit-before-save changes

**Action Items View**:
- [ ] `ActionItemsList.svelte` component
- [ ] Filter by status (pending, in_progress, completed)
- [ ] Filter by due date (overdue, today, this week)
- [ ] Mark complete / edit / delete
- [ ] Sort options

**Recent Outputs View**:
- [ ] Template outputs list per space
- [ ] Quick re-view capability
- [ ] Link to original conversation

**Context Statistics**:
- [ ] "X open items, Y completed this week"
- [ ] Per-space statistics
- [ ] Productivity indicators

**Context Badge** (Header):
- [ ] "🔴 3" indicator for open action items
- [ ] Click to expand quick view
- [ ] First glimpse of temporal awareness

**Success Criteria**:
- Users feel in control of what gets saved
- Extraction errors don't pollute data
- Users can see and manage their accumulated context
- Value of the system becomes visible

**Depends on**: Phase 0.3e

---

### Phase 0.3g: Onboarding & Polish (Stretch)
**Goal**: Personalized experience and refinement

**Activity Selection (Spotify Approach)**:
- [ ] First-run onboarding flow
- [ ] "What activities do you want help with?" (pick 3-5)
- [ ] Activity icons and descriptions
- [ ] Store selections in user profile

**Suggested Activities**:
1. 📝 Summarize meetings
2. ✉️ Draft emails
3. 📊 Write status updates
4. 📋 Track decisions & actions
5. 🔍 Research topics
6. 📄 Review documents
7. 💡 Brainstorm ideas
8. 📈 Analyze data
9. 📝 Write specs & docs
10. 🎯 Plan projects
11. 👥 Prep for 1:1s
12. 📣 Create presentations

**Template Recommendations**:
- [ ] Surface relevant templates based on activities
- [ ] "Recommended for you" section on dashboard
- [ ] Prioritize quick actions per user

**User Profile Storage**:
- [ ] Create `user_profiles` table (or extend existing)
- [ ] Store selected activities
- [ ] Store onboarding completion status
- [ ] Optional role/team info

**Polish Items**:
- [ ] Empty states for all views
- [ ] Error handling and recovery
- [ ] Loading states and transitions
- [ ] Mobile responsiveness for space views
- [ ] Keyboard shortcuts for common actions

**Success Criteria**:
- New users get personalized template recommendations
- Dashboard feels curated, not overwhelming
- Overall experience is polished and production-ready

**Depends on**: Phase 0.3f

---

### Phase 0.3 Summary

| Sub-Phase | Focus | Key Deliverable | Effort |
|-----------|-------|-----------------|--------|
| 0.3a | Space Foundation | Spaces with embedded chat | Medium |
| 0.3b | Template Framework | Architecture + first template | Medium |
| 0.3c | Guided Conversations | Meeting Summary template | High |
| 0.3d | Form Pattern | Status Update, Decision Log | Medium |
| 0.3e | Entity Extraction | Action items, decisions, people | High |
| 0.3f | Confirmation + Context | User control + visibility | High |
| 0.3g | Onboarding (Stretch) | Personalization | Low |

**Total POC Templates**:
1. Quick Note → Structure (dump)
2. Meeting Summary (guided)
3. Weekly Status Update (form)
4. Decision Log (form)
5. Research Synthesis (guided)
6. Email Draft (guided)

**What Phase 0.3 Proves**:
- ✅ Template → Structured Data pipeline works
- ✅ Working Context accumulates value
- ✅ Spaces feel like environments, not folders
- ✅ AI novices become power users invisibly
- ✅ Foundation for temporal agents is visible
- ✅ Path to integrations is clear

---

## Phase 0.4: Contexts & Projects

**Goal**: Lightweight persistent containers within spaces

> See `VISION-WORK-OS.md` for full context on how this fits the Work OS vision.

### Context/Project Model
- [ ] `contexts` table (id, user_id, space, name, description, created_at)
- [ ] Link conversations to contexts (conversation.context_id)
- [ ] Context creation through chat ("Create context: Q4 Planning")
- [ ] AI-suggested context creation when topic doesn't fit existing

### Context UI
- [ ] Context filter in space sidebar
- [ ] Context badge on conversations
- [ ] Quick context switcher
- [ ] Context-scoped conversation list

### Context Intelligence
- [ ] Context-specific system prompt injection
- [ ] Context summary/description auto-generated
- [ ] Related documents/artifacts (future: file attachments)

**Success Criteria**:
- Users can create contexts through natural conversation
- Conversations belong to contexts, carrying persistent knowledge
- Context switching is filtering, not navigation

**Depends on**: Phase 0.3

---

## Phase 0.5: Tasks & Meetings

**Goal**: First-class entities with lifecycle

> Meetings and tasks are not just data—they have lifecycles and intelligence.

### Task Entity
- [ ] `tasks` table (id, user_id, context_id, title, status, due_date, priority)
- [ ] Chat-first task creation ("I need to write the Q4 doc")
- [ ] Task status (pending, in_progress, completed)
- [ ] Task-to-context linking

### Meeting Entity
- [ ] `meetings` table (id, user_id, title, start_time, attendees, status)
- [ ] Meeting lifecycle: prep → during → follow-up
- [ ] Pre-meeting intelligence (research, previous notes, attendee profiles)
- [ ] Post-meeting outcome capture
- [ ] Action items extracted to tasks

### Calendar Integration
- [ ] Read-only calendar sync (Google/Outlook)
- [ ] Meeting auto-population from calendar
- [ ] Today's meetings view

**Success Criteria**:
- Tasks created through conversation, not forms
- Meetings have AI-enriched prep available
- Outcomes flow naturally into tasks

**Depends on**: Phase 0.4

---

## Phase 0.6: Home Dashboard

**Goal**: Command center for the workday

### Dashboard Components
- [ ] Today's meetings (with prep status)
- [ ] Today's tasks (actual + AI-recommended)
- [ ] Needs attention section (overdue, stale items)
- [ ] Quick actions (common templates)

### Intelligence Layer
- [ ] AI-recommended task prioritization
- [ ] Meeting prep alerts ("Johnson call in 2 hours—review prep?")
- [ ] Pattern-based suggestions

**Success Criteria**:
- Users start their day from Home
- Relevant context is surfaced, not hunted for
- Reduces "what should I work on?" friction

**Depends on**: Phase 0.5

---

## Phase 0.7: Team Management

**Goal**: Multi-user enterprise foundation

### Authentication
- [ ] User registration/login
- [ ] Password reset flow
- [ ] Session management improvements

### Team Structure
- [ ] Team creation and invitations
- [ ] Role definitions (admin, member)
- [ ] LiteLLM virtual keys per team

### Usage Tracking
- [ ] Per-user/team token usage
- [ ] Usage history and trends
- [ ] Second Opinion governance controls

**Depends on**: Phase 0.6

---

## Phase 0.8: Policy Engine

**Goal**: Enterprise AI governance

### Policy Definition
- [ ] Model access control per team
- [ ] Usage limits and quotas
- [ ] Content filtering rules

### Admin Dashboard
- [ ] Team overview and analytics
- [ ] Policy management UI
- [ ] Audit logging

**Depends on**: Phase 0.7

---

## Phase 0.9: Temporal Intelligence

**Goal**: Proactive AI that understands time and context

> This phase builds on the Working Context from Phase 0.3 to provide intelligent, time-aware assistance.

### Smart Context Injection (RAG)
- [ ] Generate embeddings for template outputs
- [ ] pgvector extension for similarity search
- [ ] "Find relevant past context" for conversations
- [ ] Automatic context injection based on conversation topic

### Proactive Features
- [ ] Morning briefing ("3 items due today, 2 meetings")
- [ ] Smart reminders ("Deadline for X is tomorrow")
- [ ] Pattern detection ("Recurring theme in your meetings: deployment delays")
- [ ] Stale item alerts ("5 action items pending >2 weeks")

### Database Considerations
- [ ] Add embedding columns to template_outputs (pgvector)
- [ ] Consider external vector DB if scale requires it
- [ ] Optimize for temporal queries (date ranges, recency)

---

## Phase 0.7: Collaboration & Knowledge Graph (Future)

**Goal**: Team-aware productivity with relationship intelligence

> This phase extends individual productivity to team collaboration.

### Entity Relationships Table
- [ ] Generic `entity_relationships` table for graph-like queries:
  ```sql
  entity_relationships (
    source_type, source_id,
    target_type, target_id,
    relationship,  -- 'assigned_to', 'stakeholder_of', 'mentioned_in'
    strength, metadata
  )
  ```
- [ ] Relationship extraction from templates
- [ ] Recursive CTE queries for multi-hop traversal
- [ ] Consider Apache AGE or Neo4j if complexity warrants

### Team Features
- [ ] Shared spaces (team-level, not just user-level)
- [ ] Collaborative template outputs (multiple contributors)
- [ ] Action items assigned across team members
- [ ] Decision notifications to stakeholders
- [ ] Team dashboards with collective context

### Knowledge Graph Queries
- [ ] "Who worked on things related to Project X?"
- [ ] "What decisions led to this outcome?"
- [ ] "Find colleagues with similar work patterns"

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
| Space navigation foundation | 0.3a | High | Medium | **Next** |
| Template framework | 0.3b | High | Medium | Planned |
| Guided conversations | 0.3c | Critical | High | Planned |
| Form templates | 0.3d | High | Medium | Planned |
| Entity extraction | 0.3e | High | High | Planned |
| Confirmation + context | 0.3f | High | High | Planned |
| Onboarding (stretch) | 0.3g | Medium | Low | Stretch |
| Send to Arena (context) | Arena | Medium | Medium | Planned |
| Team management | 0.4 | High | High | Future |
| Policy engine | 0.5 | High | High | Future |
| Temporal intelligence (RAG) | 0.6 | High | High | Future |
| Knowledge graph / collaboration | 0.7 | Medium | High | Future |

---

## Notes

- **Foundation first**: A bad chat experience is a non-starter
- **Baby steps**: Small iterations, quality over speed
- **No bloat**: Every feature must earn its place
- **Speed matters**: Optimize for time-to-first-token
- **Guide users**: Many are AI novices, help them succeed

---

*Aligned with PRODUCT_VISION.md - Last Updated: December 14, 2024*
*Completed: Phase 0.1, Phase 0.2 | Next: Phase 0.3a Space Navigation Foundation*
