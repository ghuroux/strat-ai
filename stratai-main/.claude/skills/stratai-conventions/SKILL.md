---
name: stratai-conventions
description: |
  Use for ALL StratAI development work: features, bugs, refactoring, architecture decisions.
  MANDATORY reference for: Understanding codebase structure, common patterns, avoiding gotchas.
  READ THIS SKILL at session start and reference throughout development.
  Covers: Architecture overview, Svelte 5 runes, postgres.js camelCase, API streaming, prompt layering, store patterns, file naming, quality standards.
globs:
  - "src/**/*.ts"
  - "src/**/*.svelte"
  - "src/**/*.js"
---

# StratAI Codebase Conventions

## Architecture Overview

StratAI is an enterprise LLM routing application built with:
- **Frontend**: SvelteKit + Svelte 5 (runes) + Tailwind CSS
- **Backend**: SvelteKit API routes + LiteLLM proxy
- **Database**: PostgreSQL via postgres.js
- **State**: Svelte 5 stores with `$state` runes

## Key Directories

```
stratai-main/
├── src/
│   ├── routes/           # Pages and API endpoints
│   │   ├── api/          # Backend endpoints (chat, tasks, etc.)
│   │   └── spaces/       # Space pages (Work, Research)
│   ├── lib/
│   │   ├── components/   # Svelte components
│   │   ├── stores/       # Svelte 5 reactive stores
│   │   ├── server/       # Server-side code (persistence, LiteLLM)
│   │   ├── config/       # Configuration (prompts, models, assists)
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
```

## Critical Patterns

### 1. Svelte 5 Runes (NOT Svelte 4)

This project uses **Svelte 5 runes**, not Svelte 4 stores.

```typescript
// CORRECT - Svelte 5 runes
class MyStore {
    items = $state<Map<string, Item>>(new SvelteMap());
    count = $derived(this.items.size);
}

// WRONG - Svelte 4 patterns (do not use)
const items = writable([]);
$: count = items.length;
```

See [SVELTE5.md](SVELTE5.md) for detailed patterns.

### 2. postgres.js CamelCase Transformation

**CRITICAL**: postgres.js auto-transforms column names to camelCase:

```typescript
// SQL: SELECT MAX(subtask_order) as max_order FROM tasks
// Result: row.maxOrder (NOT row.max_order)

// CORRECT
const result = await sql`SELECT MAX(subtask_order) as max_order...`;
const maxOrder = result[0]?.maxOrder ?? 0;  // camelCase!

// WRONG
const maxOrder = result[0]?.max_order;  // undefined!
```

**For comprehensive database patterns** (transactions, CTEs, JOINs, UPSERT), see the **`working-with-postgres`** skill. [POSTGRES.md](POSTGRES.md) has quick examples.

### 3. API Endpoint Patterns

**IMPORTANT**: For comprehensive API endpoint patterns (authentication, authorization, JSDoc, error handling), see the **`creating-endpoints`** skill.

Quick reference for streaming:

```typescript
// Chat endpoints use Server-Sent Events (SSE)
return new Response(stream, {
    headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    }
});
```

See `creating-endpoints` skill for full patterns. [API-PATTERNS.md](API-PATTERNS.md) has quick examples.

### 4. Layered Prompt Architecture

System prompts are composed in layers:
1. Platform prompt (model-specific)
2. Space prompt (personal/organization/project context)
3. Focus area prompt (specialized context with document summaries)
4. Task prompt (current work context)
5. Task context (linked documents/tasks)

**Key pattern**: Document **summaries** in prompts, full content via `read_document` tool for token efficiency.

See [PROMPTS.md](PROMPTS.md) for prompt engineering patterns.

## Component Props Pattern

Use Svelte 5 `$props()` with interface:

```svelte
<script lang="ts">
    interface Props {
        taskId: string;
        onClose: () => void;
        onSave?: (data: FormData) => Promise<void>;
    }

    let { taskId, onClose, onSave }: Props = $props();
</script>
```

## Store Pattern

All stores use class-based pattern with Svelte 5 runes:

```typescript
import { SvelteMap } from 'svelte/reactivity';

class MyStore {
    // Reactive state
    items = $state<SvelteMap<string, Item>>(new SvelteMap());
    isLoading = $state(false);

    // Derived values
    itemList = $derived.by(() => {
        const _ = this._version;  // Subscribe to version changes
        return Array.from(this.items.values());
    });

    // Version counter for fine-grained updates
    _version = $state(0);

    // Methods
    async loadItems(): Promise<void> {
        this.isLoading = true;
        // ...
        this._version++;  // Trigger derived updates
    }
}

export const myStore = new MyStore();
```

**For comprehensive store patterns**, see the **`managing-state`** skill.

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `TaskPanel.svelte` |
| Stores | camelCase + `.svelte.ts` | `tasks.svelte.ts` |
| Types | camelCase | `tasks.ts` |
| API routes | lowercase + `+server.ts` | `api/tasks/+server.ts` |
| Page routes | lowercase + `+page.svelte` | `spaces/[space]/+page.svelte` |

## Common Gotchas

1. **SvelteMap for reactivity**: Regular `Map` doesn't trigger updates. Use `SvelteMap` from `svelte/reactivity`.

2. **postgres.js camelCase**: All column aliases become camelCase in results.

3. **JSONB handling**: postgres.js may return JSONB as string or object. Always check type before parsing.

4. **Cache control**: Only add `cache_control` for Anthropic Claude models, not OpenAI.

5. **Version counter**: Increment `_version` to force derived value recalculation when mutating collections.

## Quality Standards

- **No over-engineering**: Simple solutions over clever ones
- **No bloat**: Every line must be justified
- **Performance first**: Optimize for time-to-first-token
- **UX excellence**: Reduce cognitive load for users

## Reference Files

**In this skill:**
- [SVELTE5.md](SVELTE5.md) - Svelte 5 runes patterns
- [PROMPTS.md](PROMPTS.md) - Prompt engineering patterns (document summaries, layering)
- [POSTGRES.md](POSTGRES.md) - Quick database reference
- [API-PATTERNS.md](API-PATTERNS.md) - Quick API reference
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) - **UI/UX design tokens, colors, components** (READ for any UI work)

**For comprehensive patterns, see these skills:**
- **`creating-components`** - Complete component patterns (icons, forms, data loading)
- **`creating-endpoints`** - Complete API patterns (auth, JSDoc, access control, debugging)
- **`working-with-postgres`** - Complete database patterns (transactions, CTEs, JOINs)
- **`managing-state`** - Complete state management patterns (Svelte 5 stores, reactivity)
