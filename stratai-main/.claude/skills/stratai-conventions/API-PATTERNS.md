# API Endpoint Patterns - Quick Reference

> **⚠️ For comprehensive API patterns, see the `creating-endpoints` skill**
>
> This document provides quick examples. The `creating-endpoints` skill has:
> - ✅ Secure authentication patterns
> - ✅ JSDoc documentation standards
> - ✅ Role-based access control
> - ✅ Comprehensive error handling
> - ✅ CRUD templates
> - ✅ Streaming patterns

---

## Basic Endpoint Structure

```typescript
// src/routes/api/items/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresItemRepository } from '$lib/server/persistence/items-postgres';

/**
 * Items API - Collection Operations
 * 
 * GET /api/items - List all items
 * POST /api/items - Create a new item
 */

// GET /api/items
export const GET: RequestHandler = async ({ locals, url }) => {
    // ⚠️ SECURITY: Always check authentication first
    if (!locals.session) {
        return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
    }

    const userId = locals.session.userId;

    try {
        // Parse query parameters
        const spaceId = url.searchParams.get('spaceId');
        const items = await postgresItemRepository.findAll(userId, { spaceId });
        
        return json({ items });
    } catch (error) {
        console.error('Failed to fetch items:', error);
        return json(
            { error: 'Failed to fetch items', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
};

// POST /api/items
export const POST: RequestHandler = async ({ request, locals }) => {
    // ⚠️ SECURITY: Always check authentication first
    if (!locals.session) {
        return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
    }

    const userId = locals.session.userId;

    try {
        const body = await request.json();

        // Validate required fields
        if (!body.title?.trim()) {
            return json({ error: 'title is required' }, { status: 400 });
        }

        const item = await postgresItemRepository.create(body, userId);
        return json({ item }, { status: 201 });
    } catch (error) {
        console.error('Failed to create item:', error);
        return json(
            { error: 'Failed to create item', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
};
```

## Streaming Response (SSE)

For chat endpoints that stream LLM responses:

```typescript
// src/routes/api/chat/+server.ts
export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            try {
                // Stream from LLM
                for await (const chunk of llmStream(body)) {
                    // SSE format: data: <json>\n\n
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
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

## Error Response Pattern

```typescript
// 400 Bad Request - Client error
return json({ error: 'title is required' }, { status: 400 });

// 401 Unauthorized - Not authenticated
return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });

// 403 Forbidden - Authenticated but not authorized
return json({ error: 'Insufficient permissions. Owner access required.' }, { status: 403 });

// 404 Not Found
return json({ error: 'Item not found' }, { status: 404 });

// 500 Internal Server Error
return json(
    { error: 'Failed to process request', details: error.message },
    { status: 500 }
);
```

## Status Codes Quick Reference

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (create) |
| 400 | Bad Request | Validation error, missing fields |
| 401 | Unauthorized | No session (not logged in) |
| 403 | Forbidden | Has session but lacks permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate, state conflict |
| 500 | Server Error | Catch block errors |

---

## For Complete Patterns, See:

**`creating-endpoints` skill** - Comprehensive guide covering:
- Authentication patterns (session checks, fail-fast)
- Authorization patterns (role-based, access control)
- JSDoc documentation standards
- Request validation
- CRUD templates (collection + individual resources)
- Streaming endpoints
- Error handling strategies
- Security best practices

## File Reference

Production examples:
- `src/routes/api/spaces/[id]/pin/+server.ts` - Clean auth, great JSDoc
- `src/routes/api/areas/[id]/+server.ts` - Role-based access control
- `src/routes/api/tasks/+server.ts` - Query parameters, bulk operations
- `src/routes/api/chat/+server.ts` - Streaming pattern
- `src/hooks.server.ts` - Where `locals.session` is set
