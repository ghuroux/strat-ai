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