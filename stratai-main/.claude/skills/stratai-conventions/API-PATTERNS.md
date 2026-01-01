# API Endpoint Patterns

SvelteKit API endpoints in `src/routes/api/`.

## Basic CRUD Endpoint

```typescript
// src/routes/api/tasks/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

// GET /api/tasks
export const GET: RequestHandler = async ({ locals }) => {
    const userId = locals.userId ?? 'admin';

    try {
        const tasks = await postgresTaskRepository.findAll(userId);
        return json({ tasks });
    } catch (error) {
        console.error('[GET /api/tasks] Error:', error);
        return json(
            { error: 'Failed to fetch tasks' },
            { status: 500 }
        );
    }
};

// POST /api/tasks
export const POST: RequestHandler = async ({ request, locals }) => {
    const userId = locals.userId ?? 'admin';

    try {
        const body = await request.json();

        // Validate required fields
        if (!body.title || !body.spaceId) {
            return json(
                { error: 'title and spaceId are required' },
                { status: 400 }
            );
        }

        const task = await postgresTaskRepository.create(body, userId);
        return json({ task }, { status: 201 });
    } catch (error) {
        console.error('[POST /api/tasks] Error:', error);
        return json(
            { error: 'Failed to create task' },
            { status: 500 }
        );
    }
};
```

## Dynamic Route Endpoint

```typescript
// src/routes/api/tasks/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

// GET /api/tasks/:id
export const GET: RequestHandler = async ({ params, locals }) => {
    const userId = locals.userId ?? 'admin';
    const { id } = params;

    try {
        const task = await postgresTaskRepository.findById(id, userId);

        if (!task) {
            return json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        return json({ task });
    } catch (error) {
        console.error(`[GET /api/tasks/${id}] Error:`, error);
        return json(
            { error: 'Failed to fetch task' },
            { status: 500 }
        );
    }
};

// PATCH /api/tasks/:id
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    const userId = locals.userId ?? 'admin';
    const { id } = params;

    try {
        const body = await request.json();
        const task = await postgresTaskRepository.update(id, body, userId);

        if (!task) {
            return json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        return json({ task });
    } catch (error) {
        console.error(`[PATCH /api/tasks/${id}] Error:`, error);
        return json(
            { error: 'Failed to update task' },
            { status: 500 }
        );
    }
};

// DELETE /api/tasks/:id
export const DELETE: RequestHandler = async ({ params, locals, url }) => {
    const userId = locals.userId ?? 'admin';
    const { id } = params;

    // Query parameters for cascade options
    const deleteConversations = url.searchParams.get('deleteConversations') === 'true';

    try {
        const deleted = await postgresTaskRepository.delete(id, userId);

        if (!deleted) {
            return json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        return json({ success: true });
    } catch (error) {
        console.error(`[DELETE /api/tasks/${id}] Error:`, error);
        return json(
            { error: 'Failed to delete task' },
            { status: 500 }
        );
    }
};
```

## Streaming Response (SSE)

For chat endpoints that stream responses:

```typescript
// src/routes/api/chat/+server.ts
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();

    // Create a readable stream
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            try {
                // Stream from LLM
                for await (const chunk of llmStream(body)) {
                    // SSE format: data: <json>\n\n
                    const data = JSON.stringify(chunk);
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }

                // Signal completion
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch (error) {
                const errorData = JSON.stringify({
                    type: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
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

## Client-Side Stream Consumption

```typescript
// In component or page
async function streamChat(messages: Message[]) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, model: 'claude-sonnet-4-20250514' })
    });

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') return;

                const chunk = JSON.parse(data);
                // Handle chunk (append to message, update UI, etc.)
            }
        }
    }
}
```

## Error Response Pattern

Consistent error format:

```typescript
// Client errors (4xx)
return json({ error: 'Validation failed: title is required' }, { status: 400 });
return json({ error: 'Unauthorized' }, { status: 401 });
return json({ error: 'Resource not found' }, { status: 404 });

// Server errors (5xx)
return json({ error: 'Failed to process request' }, { status: 500 });

// With details (for debugging)
return json({
    error: 'Validation failed',
    details: {
        field: 'title',
        message: 'Title must be at least 3 characters'
    }
}, { status: 400 });
```

## Request Validation

```typescript
interface CreateTaskBody {
    title: string;
    spaceId: string;
    priority?: 'normal' | 'high';
    dueDate?: string;
}

function validateCreateTask(body: unknown): body is CreateTaskBody {
    if (!body || typeof body !== 'object') return false;
    const b = body as Record<string, unknown>;

    if (typeof b.title !== 'string' || b.title.length < 1) return false;
    if (typeof b.spaceId !== 'string') return false;
    if (b.priority && !['normal', 'high'].includes(b.priority as string)) return false;

    return true;
}

// Usage
export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();

    if (!validateCreateTask(body)) {
        return json({ error: 'Invalid request body' }, { status: 400 });
    }

    // body is now typed as CreateTaskBody
};
```

## File Reference

- `src/routes/api/chat/+server.ts` - Streaming chat endpoint
- `src/routes/api/tasks/+server.ts` - CRUD example
- `src/routes/api/tasks/[id]/+server.ts` - Dynamic route example
- `src/routes/api/conversations/+server.ts` - Another CRUD example
