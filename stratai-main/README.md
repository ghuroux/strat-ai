# StratHost Chat

A lightweight SvelteKit chat interface for LiteLLM. This is a POC (Proof of Concept) designed with a clear upgrade path to multi-tenant SaaS.

## Features

- Real-time SSE streaming responses
- Model selection via LiteLLM proxy
- Single-user authentication (env-based password)
- Dark mode UI with Tailwind CSS
- In-memory chat history (per session)
- TypeScript throughout

## Quick Start

### Prerequisites

- Node.js 18+
- LiteLLM proxy running on port 4000

### Development

1. Install dependencies:

```bash
cd sveltekit-chat
npm install
```

2. Copy environment template:

```bash
cp .env.example .env
```

3. Edit `.env` with your settings:

```bash
# LiteLLM Configuration
LITELLM_BASE_URL=http://localhost:4000
LITELLM_API_KEY=sk-1234

# Authentication
ADMIN_PASSWORD=your-secure-password

# Session (generate with: openssl rand -hex 32)
SESSION_SECRET=your-random-secret

# App
PUBLIC_APP_NAME=StratHost Chat
```

4. Start development server:

```bash
npm run dev
```

5. Open http://localhost:5173

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LITELLM_BASE_URL` | LiteLLM proxy URL | `http://localhost:4000` |
| `LITELLM_API_KEY` | LiteLLM API key | `sk-1234` |
| `ADMIN_PASSWORD` | Login password | Required |
| `SESSION_SECRET` | Session signing secret | Required |
| `PUBLIC_APP_NAME` | App display name | `StratHost Chat` |

## Architecture

```
src/
├── routes/              # SvelteKit routes
│   ├── api/             # Backend API endpoints
│   │   ├── chat/        # SSE streaming chat endpoint
│   │   └── models/      # Fetch available models
│   ├── login/           # Authentication
│   └── +page.svelte     # Main chat UI
├── lib/
│   ├── server/          # Server-only code
│   │   ├── auth.ts      # Password hashing utilities
│   │   ├── session.ts   # Session cookie management
│   │   ├── litellm.ts   # LiteLLM API client
│   │   └── persistence/ # Data access layer
│   ├── stores/          # Svelte stores
│   │   ├── chat.ts      # Chat state management
│   │   └── toast.ts     # Toast notifications
│   ├── components/      # UI components
│   │   ├── ChatMessage.svelte
│   │   ├── ChatInput.svelte
│   │   ├── ModelSelector.svelte
│   │   └── Toast.svelte
│   └── types/           # TypeScript types
└── hooks.server.ts      # Server hooks (auth middleware)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run check` | TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

## Multi-Tenant Upgrade Path

This POC is designed with a clear upgrade path:

1. **Current (POC)**: Single user, in-memory, works with LiteLLM
2. **Phase 2**: PostgreSQL persistence
3. **Phase 3**: User registration, per-user conversations
4. **Phase 4**: OAuth/OIDC integration
5. **Phase 5**: Organization/tenant support
6. **Phase 6**: Per-tenant API key management

Key design decisions enabling this:
- Repository pattern for swappable persistence
- User ID threaded through session context
- Typed interfaces for all data structures
- Separation of concerns (auth, persistence, LiteLLM client)

## License

Private - StratHost
