---
name: creating-endpoints
description: Creates SvelteKit API endpoints following StratAI patterns. Use when creating new API routes, backend endpoints, or modifying existing API handlers.
---

# Creating API Endpoints

## Endpoint Location

API endpoints go in `src/routes/api/`:

```
src/routes/api/
├── chat/           # Chat/LLM endpoints
│   ├── +server.ts          # POST /api/chat (streaming)
│   └── second-opinion/
│       └── +server.ts      # POST /api/chat/second-opinion
├── conversations/  # Conversation CRUD
├── tasks/          # Task CRUD
│   ├── +server.ts          # GET, POST /api/tasks
│   └── [id]/
│       ├── +server.ts      # GET, PATCH, DELETE /api/tasks/:id
│       ├── context/        # GET /api/tasks/:id/context
│       └── documents/      # Task-document links
├── documents/      # Document CRUD
├── focus-areas/    # Focus area CRUD
└── spaces/         # Space CRUD
```

## CRUD Endpoint Template

### Collection Endpoint (`+server.ts`)

```typescript
// src/routes/api/items/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresItemRepository } from '$lib/server/persistence/items-postgres';

/**
 * GET /api/items
 * List all items for the current user
 */
export const GET: RequestHandler = async ({ locals, url }) => {
    const userId = locals.userId ?? 'admin';

    // Optional query params
    const spaceId = url.searchParams.get('spaceId');
    const status = url.searchParams.get('status');

    try {
        const filter = {
            ...(spaceId && { spaceId }),
            ...(status && { status })
        };

        const items = await postgresItemRepository.findAll(userId, filter);
        return json({ items });
    } catch (error) {
        console.error('[GET /api/items] Error:', error);
        return json({ error: 'Failed to fetch items' }, { status: 500 });
    }
};

/**
 * POST /api/items
 * Create a new item
 */
export const POST: RequestHandler = async ({ request, locals }) => {
    const userId = locals.userId ?? 'admin';

    try {
        const body = await request.json();

        // Validate required fields
        if (!body.title?.trim()) {
            return json({ error: 'title is required' }, { status: 400 });
        }
        if (!body.spaceId) {
            return json({ error: 'spaceId is required' }, { status: 400 });
        }

        const item = await postgresItemRepository.create({
            title: body.title.trim(),
            spaceId: body.spaceId,
            priority: body.priority ?? 'normal',
            metadata: body.metadata ?? null
        }, userId);

        return json({ item }, { status: 201 });
    } catch (error) {
        console.error('[POST /api/items] Error:', error);
        return json({ error: 'Failed to create item' }, { status: 500 });
    }
};
```

### Individual Resource Endpoint (`[id]/+server.ts`)

```typescript
// src/routes/api/items/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresItemRepository } from '$lib/server/persistence/items-postgres';

/**
 * GET /api/items/:id
 */
export const GET: RequestHandler = async ({ params, locals }) => {
    const userId = locals.userId ?? 'admin';
    const { id } = params;

    try {
        const item = await postgresItemRepository.findById(id, userId);

        if (!item) {
            return json({ error: 'Item not found' }, { status: 404 });
        }

        return json({ item });
    } catch (error) {
        console.error(`[GET /api/items/${id}] Error:`, error);
        return json({ error: 'Failed to fetch item' }, { status: 500 });
    }
};

/**
 * PATCH /api/items/:id
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    const userId = locals.userId ?? 'admin';
    const { id } = params;

    try {
        const body = await request.json();

        // Only include fields that were provided
        const updates: Record<string, unknown> = {};
        if (body.title !== undefined) updates.title = body.title.trim();
        if (body.status !== undefined) updates.status = body.status;
        if (body.priority !== undefined) updates.priority = body.priority;

        if (Object.keys(updates).length === 0) {
            return json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const item = await postgresItemRepository.update(id, updates, userId);

        if (!item) {
            return json({ error: 'Item not found' }, { status: 404 });
        }

        return json({ item });
    } catch (error) {
        console.error(`[PATCH /api/items/${id}] Error:`, error);
        return json({ error: 'Failed to update item' }, { status: 500 });
    }
};

/**
 * DELETE /api/items/:id
 */
export const DELETE: RequestHandler = async ({ params, locals, url }) => {
    const userId = locals.userId ?? 'admin';
    const { id } = params;

    // Optional cascade options via query params
    const cascade = url.searchParams.get('cascade') === 'true';

    try {
        if (cascade) {
            // Delete related entities first
            await postgresItemRepository.deleteRelated(id, userId);
        }

        const deleted = await postgresItemRepository.delete(id, userId);

        if (!deleted) {
            return json({ error: 'Item not found' }, { status: 404 });
        }

        return json({ success: true });
    } catch (error) {
        console.error(`[DELETE /api/items/${id}] Error:`, error);
        return json({ error: 'Failed to delete item' }, { status: 500 });
    }
};
```

## Streaming Endpoint Template

For LLM/chat endpoints that stream responses:

```typescript
// src/routes/api/stream/+server.ts
import type { RequestHandler } from './$types';
import { createLLMStream } from '$lib/server/litellm';

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Helper to send SSE data
            const send = (data: unknown) => {
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                );
            };

            try {
                // Stream from LLM
                const llmStream = await createLLMStream(body);

                for await (const chunk of llmStream) {
                    send({
                        type: 'content',
                        content: chunk.content,
                        ...(chunk.thinking && { thinking: chunk.thinking })
                    });
                }

                // Signal completion
                send({ type: 'done' });
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));

            } catch (error) {
                const message = error instanceof Error
                    ? error.message
                    : 'Unknown error';

                send({ type: 'error', error: message });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
};
```

## Request Validation

```typescript
// Inline validation
if (!body.title?.trim()) {
    return json({ error: 'title is required' }, { status: 400 });
}

// Type guard validation
interface CreateItemBody {
    title: string;
    spaceId: string;
    priority?: 'normal' | 'high';
}

function isValidCreateItem(body: unknown): body is CreateItemBody {
    if (!body || typeof body !== 'object') return false;
    const b = body as Record<string, unknown>;

    if (typeof b.title !== 'string' || !b.title.trim()) return false;
    if (typeof b.spaceId !== 'string') return false;
    if (b.priority && !['normal', 'high'].includes(b.priority as string)) {
        return false;
    }

    return true;
}

// Usage
if (!isValidCreateItem(body)) {
    return json({
        error: 'Invalid request body',
        details: 'title (string) and spaceId (string) are required'
    }, { status: 400 });
}
```

## Error Response Patterns

```typescript
// 400 Bad Request - Client error
return json({ error: 'title is required' }, { status: 400 });

// 401 Unauthorized - Not logged in
return json({ error: 'Authentication required' }, { status: 401 });

// 403 Forbidden - Logged in but not allowed
return json({ error: 'Permission denied' }, { status: 403 });

// 404 Not Found - Resource doesn't exist
return json({ error: 'Item not found' }, { status: 404 });

// 500 Internal Server Error - Server error
return json({ error: 'Failed to process request' }, { status: 500 });

// With details for debugging
return json({
    error: 'Validation failed',
    details: { field: 'priority', message: 'Must be "normal" or "high"' }
}, { status: 400 });
```

## Repository Integration

```typescript
// Import from persistence layer
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

// Repository methods follow consistent pattern
const items = await repo.findAll(userId, filter);
const item = await repo.findById(id, userId);
const created = await repo.create(input, userId);
const updated = await repo.update(id, input, userId);
const deleted = await repo.delete(id, userId);
```

## Checklist for New Endpoints

1. [ ] Create file at correct path (`src/routes/api/...`)
2. [ ] Import types from `./$types`
3. [ ] Import repository from persistence layer
4. [ ] Get userId from `locals.userId ?? 'admin'`
5. [ ] Validate request body for POST/PATCH
6. [ ] Handle 404 for non-existent resources
7. [ ] Wrap in try/catch with console.error logging
8. [ ] Return proper status codes (201 for create, 200 for others)
9. [ ] Test with curl or API client

## File Reference

- `src/routes/api/tasks/+server.ts` - CRUD collection
- `src/routes/api/tasks/[id]/+server.ts` - CRUD individual
- `src/routes/api/chat/+server.ts` - Streaming endpoint
- `src/routes/api/documents/+server.ts` - File handling
