# Code Quality Assessment

> Findings on test coverage, build tooling, code patterns, and developer experience.

**Assessment Date:** 2026-01-30

---

## Overall Scores

| Aspect | Score | Notes |
|--------|-------|-------|
| Component Patterns | 9/10 | Consistent Svelte 5 runes; some god files |
| API Endpoints | 9/10 | Consistent auth/response shape; auth logic duplicated |
| Store Patterns | 10/10 | Perfect consistency across 22 stores |
| File Organization | 7/10 | Good structure; several files exceed 1,500 lines |
| Naming Conventions | 10/10 | Excellent consistency everywhere |
| Import Patterns | 9/10 | Consistent `$lib` alias, well organized |
| Dead Code | 8/10 | Minor legacy code (focusAreas alias), mostly clean |
| Code Duplication | 6/10 | Auth, space resolution, error handling all repeated |
| Scripts Organization | 9/10 | Multi-tier testing, clear separation |
| Linting Config | 5/10 | ESLint v9 runs with defaults; no explicit config file for Svelte/TS rules |

---

## 1. Test Coverage {#1-test-coverage}

**Status: SMOKE TESTS STRONG, UNIT TESTS GAP** (smoke tests comprehensive; API/store/component unit tests still needed for refactoring confidence)

### Current State (Updated 2026-01-31)

| Category | Files | Tests | Coverage |
|----------|-------|-------|----------|
| Smoke tests (Playwright) | 4 | **51** | 3 tiers: auth, workflows, UX |
| Unit tests (Vitest) | 4 | ~20 | Formula engine, model router, color generation |
| API endpoint tests | 0 | 0 | None |
| Store tests | 0 | 0 | None |
| Component tests | 0 | 0 | None |
| Integration tests | 0 | 0 | None |

### Smoke Test Infrastructure (Comprehensive)

Built out across 3 phases (2026-01-30 to 2026-01-31):

```
tests/smoke/
├── tier1-critical.spec.ts    # 17 tests: login, logout, auth, protected routes, API health, settings/admin pages
├── tier2-core.spec.ts        # 20 tests: chat streaming, space/area/page CRUD, deletion, panels, model selection,
│                             #           command palette, error recovery, admin member invitation
├── tier3-ux.spec.ts          # 14 tests: settings panel, modals, sidebar, overflow, keyboard, theme persistence,
│                             #           arena page, task creation
└── helpers/auth.ts           # Shared auth (tester + admin login flows)

src/lib/services/
├── cell-references.test.ts
├── formula-engine.test.ts
├── formula-parser.test.ts
└── model-router/__tests__/router.test.ts
```

**Tiered failure handling:**
- T1 failures → ABORT deployment
- T2 failures → BLOCK completion
- T3 failures → WARN only

**Key smoke test capabilities:** end-to-end workflows (not just "element exists"), API response capture/validation, context snapshot modal handling, graceful skip on environment-dependent features, cleanup tests (space deletion prevents limit accumulation).

See `docs/SMOKE_TEST_PLAN.md` for full test inventory and Phase 3 remaining items.

### Remaining Gap

- No refactoring confidence on server code — API endpoint tests needed
- No store state management tests — complex stores (chat, tasks) untested in isolation
- No coverage thresholds — `vitest.config.ts` has no coverage configuration

### Recommended Actions

**Phase 1: API endpoint tests (top 20 endpoints)**

Priority endpoints for testing:
1. `POST /api/chat` — Core product surface, streaming, tool execution
2. `GET/POST /api/spaces` — Space CRUD
3. `GET/POST /api/areas` — Area CRUD with access control
4. `GET/POST /api/tasks` — Task management
5. `GET/POST /api/pages` — Page lifecycle (draft → finalize → share)
6. `GET/POST /api/documents` — Document upload and search
7. `POST /api/auth/login` — Authentication flow
8. `POST /api/auth/register` — Registration flow
9. `POST /api/auth/reset-password` — Password reset
10. `GET /api/conversations` — Conversation listing with pagination

**Phase 2: Store unit tests**

Priority stores:
1. `chat.svelte.ts` — Most complex, localStorage persistence
2. `tasks.svelte.ts` — Plan mode, subtasks, relationships
3. `spaces.svelte.ts` — Space management
4. `pages.svelte.ts` — Page lifecycle state

**Phase 3: Coverage thresholds**

```typescript
// vitest.config.ts addition
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 50,
    statements: 60
  }
}
```

---

## 2. Build Tooling {#2-build-tooling}

**Status: INCOMPLETE** — ESLint runs but with minimal defaults; no Svelte or TypeScript rules

### ESLint Not Configured

ESLint v9 and `eslint-plugin-svelte` are installed in `package.json`, and `npm run lint` runs, but **no configuration file exists**:

```bash
$ ls eslint.config.* .eslintrc*
# Nothing found
```

This means linting works but only enforces ESLint's minimal built-in rules. Svelte-specific rules, TypeScript rules, and project conventions (e.g., `no-console`) are not enforced.

> **Note:** The primary "other developers" today are Claude Code agents, which have their own conventions via `.claude/skills/`. This reduces the urgency but doesn't eliminate it — human developers and CI pipelines need a config file.

**Fix:** Create `eslint.config.js` with the flat config format:

```javascript
// eslint.config.js (ESLint v9 flat config)
import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { parser: ts.parser }
    }
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  { ignores: ['build/', '.svelte-kit/', 'node_modules/'] }
];
```

### No Prettier Configuration

No `.prettierrc` exists. Prettier uses defaults.

**Fix:** Create `.prettierrc`:

```json
{
  "useTabs": true,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100,
  "plugins": ["prettier-plugin-svelte"],
  "overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]
}
```

### Package Identity

`package.json` still reads:

```json
{
  "name": "sveltekit-chat",
  "version": "0.1.0"
}
```

Should be `"name": "stratai"` with a meaningful version.

---

## 3. API Error Handling {#3-api-error-handling}

**Status: INCONSISTENT — duplicated across ~40 endpoints**

### Auth Check Duplication

The same 3-line pattern is copy-pasted into every endpoint:

```typescript
// Appears 40+ times across all API endpoints
if (!locals.session) {
    return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
}
```

### Space Resolution Duplication

Duplicated ~15+ times:

```typescript
const resolvedSpaceId = await resolveSpaceIdAccessible(spaceParam, userId);
if (!resolvedSpaceId) {
    return json({ error: `Space not found: ${spaceParam}` }, { status: 404 });
}
```

### Error Response Shape Inconsistency

Three different error shapes used across endpoints:

```typescript
// Shape 1 (auth endpoints)
{ error: { message: 'Unauthorized', type: 'auth_error' } }

// Shape 2 (most CRUD endpoints)
{ error: 'Failed to create task' }

// Shape 3 (some endpoints with details)
{ error: 'Failed to fetch', details: 'Connection timeout' }
```

### Recommended Fix

Create `src/lib/server/api-utils.ts` using SvelteKit's `error()` helper (the idiomatic way to short-circuit endpoints):

```typescript
import { error, json } from '@sveltejs/kit';
import { resolveSpaceIdAccessible } from '$lib/server/persistence';

/** Require authenticated session. Returns userId or throws 401. */
export function requireAuth(locals: App.Locals): string {
    if (!locals.session) {
        throw error(401, { message: 'Unauthorized' });
    }
    return locals.session.userId;
}

/** Resolve and authorize space access. Returns spaceId or throws 404. */
export async function requireSpace(spaceParam: string, userId: string): Promise<string> {
    const resolved = await resolveSpaceIdAccessible(spaceParam, userId);
    if (!resolved) {
        throw error(404, { message: `Space not found: ${spaceParam}` });
    }
    return resolved;
}

/** Standard JSON error response (for cases where you need a custom shape). */
export function errorResponse(message: string, status: number, details?: string) {
    return json(
        { error: { message, ...(details && { details }) } },
        { status }
    );
}
```

> **Note:** SvelteKit's `error()` throws an `HttpError` that SvelteKit catches and renders. This is the idiomatic pattern — do not throw raw `json()` responses. Use `errorResponse()` only when you need a custom JSON shape (e.g., returning validation errors with field details).

---

## 4. God Files {#4-god-files}

**Status: 7 files exceed 1,500 lines**

### Largest Files

| File | Lines | Responsibility Overload |
|------|-------|------------------------|
| `routes/spaces/[space]/task/[taskId]/+page.svelte` | 3,647 | Task display + editing + chat integration + subtasks |
| `routes/api/chat/+server.ts` | 3,400 | Streaming + tools + usage + context + token mgmt |
| `components/pages/PageEditor.svelte` | 2,612 | TipTap editor + save logic + toolbar + AI features |
| `stores/tasks.svelte.ts` | 1,911 | Plan mode + subtasks + global tasks + relationships |
| `config/system-prompts.ts` | 1,637 | All system prompts in one file |
| `components/chat/ChatInput.svelte` | 1,644 | Input + file upload + context handling |
| `components/pages/EditorToolbar.svelte` | 1,626 | All formatting actions + AI features |
| `stores/chat.svelte.ts` | 1,550 | Chat state + persistence + localStorage |

### Chat Server Decomposition (Highest Priority)

`routes/api/chat/+server.ts` at 3,400 lines is the core product logic. Suggested split:

```
routes/api/chat/
├── +server.ts              # Entry point, request parsing, response streaming
├── context-loader.ts       # Area context, document fetching, memory retrieval
├── tool-executor.ts        # Tool definitions, execution, result formatting
├── usage-tracker.ts        # Token counting, usage records, cost attribution
└── stream-handler.ts       # SSE formatting, chunk processing, error recovery
```

### Component Decomposition

```
components/pages/
├── PageEditor.svelte       # 2,612 → split into:
│   ├── PageEditor.svelte           # Editor shell, save orchestration
│   ├── EditorContent.svelte        # TipTap instance, content sync
│   └── EditorAIFeatures.svelte     # AI suggestions, inline generation

components/chat/
├── ChatInput.svelte        # 1,644 → split into:
│   ├── ChatInput.svelte            # Input field, send logic
│   ├── ChatFileUpload.svelte       # File/image attachment
│   └── ChatContextSelector.svelte  # Context panel toggle, indicators
```

---

## 5. Code Duplication {#5-code-duplication}

### High-Duplication Patterns

| Pattern | Occurrences | Fix |
|---------|-------------|-----|
| Auth check | ~40 | `requireAuth()` utility |
| Space resolution | ~15 | `requireSpace()` utility |
| Error response formatting | ~40 | `errorResponse()` utility |
| Store data fetching | ~14 | `fetchFromApi()` utility |
| 401 redirect handling | ~14 | Centralized in fetch wrapper |

### Store Fetch Pattern (duplicated 14+ times)

```typescript
// This exact pattern appears in every store:
try {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 401) return; // silent auth redirect
        throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    // process data
} catch (e) {
    this.error = e instanceof Error ? e.message : 'Failed to load';
    toastStore.error('...');
}
```

**Fix:** Create `src/lib/utils/api-client.ts`:

```typescript
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
        if (response.status === 401) {
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        const body = await response.json().catch(() => ({}));
        throw new ApiError(response.status, body.error?.message ?? `API error: ${response.status}`);
    }
    return response.json();
}
```

---

## 6. Icon Inconsistency {#6-icons}

**Status: Mixed — already tracked in Known Issues**

- ~124 components use inline SVG
- ~46 components use `lucide-svelte`
- Standard for new work: `lucide-svelte`
- No lint rule to enforce

**Fix:** Add ESLint rule to warn on inline `<svg>` in `.svelte` files. Migrate gradually as components are touched.

---

## 7. Dark Mode Selector Inconsistency {#7-dark-mode}

Two patterns in use for light-mode-specific styles:

```css
/* Pattern 1 (majority) */
:global(.light) .element { ... }

/* Pattern 2 (some components) */
:global([data-theme='light']) .element { ... }
```

Both work, but only one should be canonical. Pick one and add it to `DESIGN-SYSTEM.md`.

---

## 8. Legacy Code {#8-legacy}

### Focus Areas Alias

```typescript
// src/lib/server/persistence/index.ts
export { postgresAreaRepository as postgresFocusAreaRepository } from './areas-postgres';
```

This backward-compatibility alias should be removed once all consumers are updated.

### localStorage Prefix

Storage keys use `'strathost-'` prefix (documented in Known Issues). Renaming will lose POC data. Plan a migration or accept the data loss.

---

## Summary of Recommended Actions

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| **P1** | Create `eslint.config.js` | Small | Enforces Svelte/TS rules beyond defaults |
| **P1** | Create `.prettierrc` | Small | Consistent formatting |
| **P1** | Update package.json name/version | Small | Identity |
| **P1** | Create `api-utils.ts` (auth, errors) | Medium | Reduces duplication, enforces contract |
| **P2** | API endpoint tests (top 20) | Large | Refactoring confidence |
| **P2** | Vitest coverage thresholds | Small | Quality gate |
| **P2** | Split `chat/+server.ts` | Large | Maintainability of core product logic |
| **P2** | Split large components | Medium | Comprehension, review quality |
| **P2** | Store unit tests | Medium | State management confidence |
| **P3** | `apiFetch()` client utility | Small | Removes store duplication |
| **P3** | Migrate inline SVGs to lucide-svelte | Ongoing | Bundle size, consistency |
| **P3** | Remove focusAreas alias | Small | Dead code cleanup |

> **Note:** ESLint, Prettier, and package.json were originally P0 but downgraded to P1. `npm run lint` already runs (with defaults), and these are developer experience improvements, not security or stability blockers. Security items (bcrypt, fail-fast secrets, headers) are the true P0s.
