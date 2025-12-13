# StratAI Product Vision

## What We're Building

**StratAI** is an enterprise LLM context-aware routing application that serves as a productivity partner for employees, powered by AI.

### Core Value Proposition

1. **Enterprise AI Governance** - Businesses marry their internal AI policy to our platform
2. **Productivity Partnership** - AI as the employee's partner, reducing cognitive load and fast-tracking productivity
3. **Context-Aware Routing** - Smart model selection based on policy, use case, and user preferences

---

## Target Users

### Primary: Enterprise Administrators
- Define AI usage policies
- Manage employee access and limits
- Control which LLM models are accessible
- Monitor usage and costs

### Secondary: Enterprise Employees
- Access AI within policy guardrails
- Personal customization within allowed parameters
- Productivity-focused templates and spaces
- Seamless, quality AI interaction experience

---

## Core Features

### 1. Policy-Aware LLM Routing (via LiteLLM)
- Virtual keys per team for access management
- Model access control per team/user
- Usage limits and quotas
- Support for:
  - Third-party LLMs (Anthropic, OpenAI, etc.)
  - Amazon Bedrock (for clients requiring data sovereignty)

### 2. Productivity Spaces
Contextual workspaces with templates tailored to specific use cases:

| Space | Purpose | Priority |
|-------|---------|----------|
| **Work Space** | Day-to-day professional tasks | High |
| **R&D Space** | Research, exploration, innovation | High |
| **Random Space** | Freeform experimentation | Medium |
| **Personal Space** | Individual productivity | Medium |

Each space includes:
- Pre-built templates reducing cognitive load
- Context document uploads
- Use-case specific prompts
- Optimized model defaults

### 3. Quality AI Experience
- Fast, responsive interactions
- Streaming responses
- Accurate token counting
- Prompt caching for cost efficiency
- Model capability awareness

---

## AI Onboarding & Education Philosophy

Many enterprise users are new to AI or uncertain about its capabilities. StratAI takes an **iterative onboarding approach**:

### Guiding Users Into AI
- Not all users are AI natives - we meet them where they are
- Templates and spaces reduce the "blank page" problem
- Contextual guidance helps users understand what's possible
- Progressive disclosure of advanced features

### Model Arena: Education & Optimization Tool

The **Model Arena** serves dual purposes:

#### 1. User Education
- Side-by-side model comparisons demystify AI differences
- Users see firsthand how models differ in reasoning, style, and capability
- Builds confidence and understanding of when to use which model
- "Send to Arena" feature: test a specific prompt against multiple models with conversation context

#### 2. Internal Model Optimization
- Continuous benchmarking of model strengths for task categories
- Data-driven model routing recommendations
- Background testing to maintain optimal user experience
- Maps model capabilities to template/space use cases

**Future Vision**: Automated model strength mapping runs as a background process, continuously optimizing which models are recommended for which tasks based on real performance data.

---

## Development Philosophy

### Guiding Principles

1. **Baby Steps** - Small iterations focused on quality
2. **No Bloat** - Concise implementation, every line justified
3. **Speed First** - Optimize for response time to frontend
4. **Foundation Matters** - A bad interaction experience is a non-starter
5. **Don't Get Over Skis** - Resist feature creep, build deliberately

### Quality Over Quantity
- Prefer removing code to adding code
- Each feature must earn its place
- Technical debt is addressed immediately
- Performance is a feature, not an afterthought

---

## Development Phases

### Phase 0.1: POC - LLM Interaction Integrity (COMPLETE)
**Focus**: Foundation of quality AI experience

**Objectives**:
- [x] Core chat functionality
- [x] Multi-model support via LiteLLM (27 models across 7 providers)
- [x] Streaming responses
- [x] Token counting and context management
- [x] System prompt handling
- [x] Prompt caching (Phase 1)
- [x] AWS Bedrock integration tested and working
- [x] Google Gemini integration
- [x] Model Arena with AI judging

**Success Criteria**: Users have a smooth, fast, reliable chat experience ✅

### Phase 0.2: Persistence & History (COMPLETE)
**Focus**: Chat persistence and management

**Objectives**:
- [x] PostgreSQL integration (local PostgreSQL 18)
- [x] Conversation persistence (CRUD with soft deletes)
- [x] Chat history sidebar (pinned/recent sections)
- [x] Chat search and management (local search, delete, pin)
- [x] Export/Import conversations (JSON)
- [x] Arena persistence (battles, Elo rankings)

### Phase 0.3: Spaces & Templates (NEXT)
**Focus**: Productivity features for Work Space

**Objectives**:
- [ ] Space concept implementation
- [ ] Work Space templates
- [ ] Context document uploads
- [ ] Template-driven prompts

### Phase 0.4: Team Management
**Focus**: Multi-user and team features

**Objectives**:
- [ ] User authentication
- [ ] Team creation and management
- [ ] LiteLLM virtual keys per team
- [ ] Basic usage tracking

### Phase 0.5: Policy Engine
**Focus**: Enterprise governance

**Objectives**:
- [ ] Policy definition interface
- [ ] Model access controls
- [ ] Usage limits and quotas
- [ ] Admin dashboard

### Future Phases
- R&D Space templates
- Amazon Bedrock integration
- Advanced analytics
- API for integrations

---

## Technical Architecture

### Current Stack
- **Frontend**: SvelteKit with Svelte 5 (runes)
- **Styling**: Tailwind CSS
- **LLM Routing**: LiteLLM proxy
- **Deployment**: Docker Compose

### Planned Additions
- **Database**: PostgreSQL
- **Auth**: TBD (considering options)
- **Cloud LLMs**: Amazon Bedrock (ready to test)

### Performance Priorities
1. Time to first token (streaming start)
2. UI responsiveness during generation
3. Efficient token counting (no blocking)
4. Prompt caching for cost/speed

---

## Current Codebase Status

### What's Working
- Chat interface with streaming
- Multi-model selection (27 models, 7 providers)
- Extended thinking (Claude)
- Reasoning effort (OpenAI)
- Token estimation with js-tiktoken
- System prompt caching
- Markdown rendering
- PostgreSQL persistence (conversations, arena)
- Chat history with search
- Conversation management (delete, pin, export/import)

### Established Features
- Model Arena (multi-model comparison with AI judging)
- Arena Elo rankings
- Document export (Markdown, DOCX, PDF)

### Not Yet Implemented
- User authentication
- Team management
- Spaces/Templates
- Policy engine

---

## References

- `BACKLOG.md` - Detailed feature backlog with priorities
- `CLAUDE.md` - Development guidance for AI assistants
- LiteLLM docs: https://docs.litellm.ai

---

*Last Updated: December 2024*
*Current Phase: 0.3 Spaces & Templates (Next)*
*Completed: Phase 0.1 (LLM Interaction), Phase 0.2 (Persistence & History)*
