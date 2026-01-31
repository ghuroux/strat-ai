# StratAI

**Enterprise LLM context-aware routing app** — a productivity partner that marries business AI policies to a quality chat experience.

StratAI gives organizations governed, context-rich AI conversations organized into Spaces and Areas, with document management, meeting lifecycle integration, model routing, and enterprise budgeting built in.

## Key Features

**Intelligent AI Chat**
- Multi-model support (Claude, GPT, Gemini, open-source via Bedrock) with per-conversation model selection
- AUTO routing — automatic model selection based on query complexity
- SSE streaming responses with prompt caching and cost optimization
- Model Arena for side-by-side comparisons

**Spaces & Areas**
- Hierarchical workspace organization: Organization → Spaces → Areas
- Per-area AI context — documents, pages, skills, and memory scoped to where you work
- Role-based access with Space memberships and area-level restrictions
- Org Spaces and personal Spaces with distinct governance

**Documents & Pages**
- Document upload (PDF, Word, Excel, images) with AI-powered summaries
- Pages — AI-native created content with TipTap rich text editor
- Guided creation templates (e.g., Meeting Notes with structured extraction)
- Version lifecycle: draft → finalized → shared, with context pinning during edits

**Calendar & Meeting Lifecycle**
- Microsoft Graph calendar integration with OAuth
- Meeting creation wizard with AI-assisted agenda generation
- Transcript capture → AI extraction of decisions, action items, and context
- Meetings generate Pages, Tasks, and Area memory automatically

**Enterprise Governance**
- Admin dashboard with usage analytics and member management
- Per-member budget caps with progressive tier restrictions
- Model access control and guardrails per tier
- Group-based policy management
- Audit events for compliance

**Additional Capabilities**
- Task management with assignment and email notifications
- Skills system — reusable AI instruction sets for Spaces and Areas
- Full-text and semantic search
- Email integration via SendGrid
- Gamification (Model Arena leaderboards)

## Architecture

```
                    ┌─────────────────────────────┐
                    │         SvelteKit App        │
                    │     (SSR + API routes)        │
                    │        Port 5173 (dev)        │
                    └──────┬──────────┬────────────┘
                           │          │
              ┌────────────┘          └────────────┐
              ▼                                    ▼
    ┌──────────────────┐                ┌──────────────────┐
    │   PostgreSQL 15   │                │   LiteLLM Proxy   │
    │    Port 5432      │                │    Port 4000      │
    │                   │                │                   │
    │  32 tables        │                │  39 models        │
    │  pgvector         │                │  4 providers      │
    └──────────────────┘                └────────┬─────────┘
                                                 │
                                    ┌────────────┼────────────┐
                                    ▼            ▼            ▼
                               Anthropic     OpenAI     AWS Bedrock
                                Claude        GPT        Gemini +
                                                       Open-source
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | SvelteKit + Svelte 5 (runes) + Tailwind CSS |
| Editor | TipTap (ProseMirror-based) |
| Backend | SvelteKit API routes (Node adapter) |
| Database | PostgreSQL 15+ with pgvector |
| LLM Routing | LiteLLM proxy |
| Auth | Custom (session cookies, HMAC-SHA256); WorkOS SSO planned |
| Email | SendGrid |
| Icons | lucide-svelte |
| Testing | Vitest (unit) + Playwright (smoke tests) |

## Prerequisites

- **Node.js** 18+ (developed on v24)
- **PostgreSQL** 15+
- **Docker & Docker Compose** (for LiteLLM proxy)
- API keys for at least one LLM provider (Anthropic, OpenAI, or AWS Bedrock)

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd strat-ai-1/stratai-main
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your settings. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `LITELLM_BASE_URL` | LiteLLM proxy URL (default: `http://localhost:4000`) |
| `LITELLM_API_KEY` | LiteLLM API key |
| `SESSION_SECRET` | Session encryption key (`openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | Initial admin password |
| `SENDGRID_API_KEY` | Email sending (optional) |
| `BRAVE_SEARCH_API_KEY` | Web search (optional) |

### 3. Start infrastructure

```bash
# From project root
docker-compose up -d    # Starts LiteLLM + PostgreSQL
```

### 4. Set up database

```bash
cd stratai-main

# Fresh install (new database)
psql -d stratai -f fresh-install/schema.sql

# Or run setup script (schemas + migrations)
npx tsx scripts/setup-db.ts
```

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project Structure

```
strat-ai-1/
├── stratai-main/              # Main application
│   ├── src/
│   │   ├── routes/            # Pages + API endpoints
│   │   │   ├── api/           # REST + SSE endpoints
│   │   │   ├── spaces/        # Workspace UI
│   │   │   ├── admin/         # Admin dashboard
│   │   │   ├── arena/         # Model Arena
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── components/    # Svelte 5 UI components
│   │   │   ├── stores/        # Reactive state (.svelte.ts)
│   │   │   ├── server/        # Server utilities + repositories
│   │   │   ├── config/        # Model capabilities, prompts
│   │   │   └── types/         # TypeScript types
│   │   └── hooks.server.ts    # Auth middleware
│   ├── fresh-install/         # Consolidated schema for new DBs
│   ├── migrations/            # Incremental schema changes
│   ├── docs/                  # Architecture & feature docs
│   └── .claude/               # Claude Code skills & commands
├── docker-compose.yml         # Infrastructure services
├── litellm-config.yaml        # LLM model configuration
└── CLAUDE.md                  # Development context & decisions
```

## Development

### Common Commands

```bash
cd stratai-main

npm run dev              # Dev server (port 5173)
npm run build            # Production build
npm run check            # TypeScript type checking
npm run lint             # ESLint
npm run format           # Prettier formatting
npm test                 # Unit tests (Vitest)
npm run test:smoke       # Browser tests (Playwright)
```

### Database Commands

```bash
npx tsx scripts/setup-db.ts       # Full DB setup
npm run audit-db-access           # Check camelCase compliance
npm run generate-schema-docs      # Regenerate schema reference
```

### Adding a New LLM Model

1. Add to `litellm-config.yaml`
2. Update `src/lib/config/model-capabilities.ts`
3. Update `src/lib/services/model-router/config/model-tiers.ts`
4. `docker-compose restart litellm`

Model names must match exactly across all three files.

## Documentation

Detailed documentation lives in `stratai-main/docs/`:

| Document | Contents |
|----------|----------|
| [ENTITY_MODEL.md](stratai-main/ENTITY_MODEL.md) | Authoritative data architecture |
| [SCHEMA_REFERENCE.md](stratai-main/docs/database/SCHEMA_REFERENCE.md) | Auto-generated schema (32 tables) |
| [POSTGRES_JS_GUIDE.md](stratai-main/docs/database/POSTGRES_JS_GUIDE.md) | Database access patterns |
| [CONTEXT_STRATEGY.md](stratai-main/docs/architecture/CONTEXT_STRATEGY.md) | Context & memory architecture |
| [PRODUCT_VISION.md](stratai-main/PRODUCT_VISION.md) | Product vision and roadmap |
| [PRICING_STRATEGY.md](stratai-main/PRICING_STRATEGY.md) | Pricing model |

For development conventions and patterns, see `CLAUDE.md` in the project root.

## License

Private — StratOS
