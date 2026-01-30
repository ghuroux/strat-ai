---
name: creating-endpoints
description: |
  Use when creating or modifying ANY API endpoint (+server.ts files) in src/routes/api/.
  MANDATORY for: REST endpoints, streaming (SSE) endpoints, WebSocket handlers.
  READ THIS SKILL before writing API code.
  Covers: Request handling, authentication, error responses, streaming patterns, database transactions.
globs:
  - "src/routes/api/**/*+server.ts"
  - "src/routes/**/+server.ts"
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

## Authentication Pattern

⚠️ **SECURITY: ALL endpoints MUST authenticate using this exact pattern**

```typescript
// ✅ CORRECT - Fail-fast authentication check
if (!locals.session) {
    return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
}

const userId = locals.session.userId;
```

**Why this pattern?**
- `locals.session` is set by `hooks.server.ts` after validating the session token
- `locals.userId` does NOT exist - it's nested in `locals.session.userId`
- Always fail fast - check auth before any processing
- Return 401 with structured error for consistent client handling

**For admin endpoints, also extract organizationId:**
```typescript
if (!locals.session) {
    return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
}

const { userId, organizationId } = locals.session;
```

❌ **NEVER use these insecure patterns:**
```typescript
// WRONG: locals.userId doesn't exist
const userId = locals.userId;

// WRONG: Fallback bypasses authentication entirely
const userId = locals.userId ?? 'admin';

// WRONG: No early return allows processing to continue
const userId = locals.session?.userId || 'anonymous';
```

## JSDoc Documentation Pattern

**ALWAYS document endpoints with JSDoc.** This helps with code navigation, maintenance, and AI-assisted development.

```typescript
/**
 * API Endpoint Name
 *
 * GET /api/resource - Brief description of what this endpoint does
 * POST /api/resource - Brief description
 *
 * Constraints:
 * - List any business rules or limitations
 * - Maximum values, required roles, etc.
 */
```

**For methods with parameters:**
```typescript
/**
 * GET /api/items/:id
 * Returns a single item with its related data
 * 
 * Path params:
 * - id: Item UUID
 * 
 * Requires: Item owner or space member access
 */
export const GET: RequestHandler = async ({ params, locals }) => {
    // ...
};

/**
 * PATCH /api/items/:id
 * Update an item
 * 
 * Path params:
 * - id: Item UUID
 * 
 * Body: { title?, status?, priority? }
 * 
 * Requires: Item owner or space admin access
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    // ...
};
```

**For endpoints with query parameters:**
```typescript
/**
 * GET /api/items
 * List items with optional filtering
 * 
 * Query params:
 * - spaceId: Filter by space ID or slug (optional)
 * - status: Filter by status (active, completed) - comma-separated (optional)
 * - includeDeleted: Include soft-deleted items (default: false)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
    // ...
};
```

## CRUD Endpoint Template

### Collection Endpoint (`+server.ts`)

```typescript
/**
 * Items API - Collection Operations
 *
 * GET /api/items - List all items for the current user
 * POST /api/items - Create a new item
 *
 * Constraints:
 * - Users can only access their own items or items in spaces they belong to
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresItemRepository } from '$lib/server/persistence/items-postgres';

/**
 * GET /api/items
 * List all items with optional filtering
 * 
 * Query params:
 * - spaceId: Filter by space (optional)
 * - status: Filter by status (optional)
 */
export const GET: RequestHandler = async ({ locals, url }) => {
    // ⚠️ SECURITY: Always check authentication first
    if (!locals.session) {
        return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
    }

    const userId = locals.session.userId;

    try {
        // Parse query parameters
        const spaceId = url.searchParams.get('spaceId');
        const status = url.searchParams.get('status');

        const filter = {
            ...(spaceId && { spaceId }),
            ...(status && { status })
        };

        const items = await postgresItemRepository.findAll(userId, filter);
        return json({ items });
    } catch (error) {
        console.error('Failed to fetch items:', error);
        return json(
            { error: 'Failed to fetch items', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
};

/**
 * POST /api/items
 * Create a new item
 * 
 * Body: { title: string, spaceId: string, priority?: string, metadata?: object }
 */
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
        console.error('Failed to create item:', error);
        return json(
            { error: 'Failed to create item', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
};
```

### Individual Resource Endpoint (`[id]/+server.ts`)

```typescript
/**
 * Items API - Individual Operations
 *
 * GET /api/items/[id] - Get a specific item
 * PATCH /api/items/[id] - Update an item
 * DELETE /api/items/[id] - Delete an item
 *
 * Constraints:
 * - User must have access to the item's space
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresItemRepository } from '$lib/server/persistence/items-postgres';

/**
 * GET /api/items/:id
 * Returns a single item with its metadata
 * 
 * Path params:
 * - id: Item UUID
 */
export const GET: RequestHandler = async ({ params, locals }) => {
    // ⚠️ SECURITY: Always check authentication first
    if (!locals.session) {
        return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
    }

    const userId = locals.session.userId;

    try {
        const item = await postgresItemRepository.findById(params.id, userId);

        if (!item) {
            return json({ error: 'Item not found' }, { status: 404 });
        }

        return json({ item });
    } catch (error) {
        console.error('Failed to fetch item:', error);
        return json(
            { error: 'Failed to fetch item', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
};

/**
 * PATCH /api/items/:id
 * Update an item's properties
 * 
 * Path params:
 * - id: Item UUID
 * 
 * Body: { title?, status?, priority? }
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    // ⚠️ SECURITY: Always check authentication first
    if (!locals.session) {
        return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
    }

    const userId = locals.session.userId;

    try {
        const body = await request.json();

        // Build updates object from provided fields only
        const updates: Record<string, unknown> = {};
        if (body.title !== undefined) updates.title = body.title.trim();
        if (body.status !== undefined) updates.status = body.status;
        if (body.priority !== undefined) updates.priority = body.priority;

        if (Object.keys(updates).length === 0) {
            return json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const item = await postgresItemRepository.update(params.id, updates, userId);

        if (!item) {
            return json({ error: 'Item not found' }, { status: 404 });
        }

        return json({ item });
    } catch (error) {
        console.error('Failed to update item:', error);
        return json(
            { error: 'Failed to update item', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
};

/**
 * DELETE /api/items/:id
 * Soft delete an item
 * 
 * Path params:
 * - id: Item UUID
 * 
 * Query params:
 * - cascade: If true, also delete related entities (default: false)
 */
export const DELETE: RequestHandler = async ({ params, locals, url }) => {
    // ⚠️ SECURITY: Always check authentication first
    if (!locals.session) {
        return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
    }

    const userId = locals.session.userId;
    const cascade = url.searchParams.get('cascade') === 'true';

    try {
        if (cascade) {
            // Delete related entities first
            await postgresItemRepository.deleteRelated(params.id, userId);
        }

        const deleted = await postgresItemRepository.delete(params.id, userId);

        if (!deleted) {
            return json({ error: 'Item not found' }, { status: 404 });
        }

        return json({ success: true });
    } catch (error) {
        console.error('Failed to delete item:', error);
        return json(
            { error: 'Failed to delete item', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
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

## Access Control (Authorization)

**Authentication vs Authorization:**
- **Authentication** (401): Is the user logged in? → Check `locals.session`
- **Authorization** (403): Is the user allowed to do this? → Check roles and permissions

### Role-Based Access Control

```typescript
/**
 * PATCH /api/areas/:id
 * Requires owner or admin role
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    // Step 1: Authentication
    if (!locals.session) {
        return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
    }

    const userId = locals.session.userId;

    // Step 2: Check if user has access
    const access = await postgresAreaMembershipsRepository.canAccessArea(userId, params.id);
    if (!access.hasAccess) {
        return json({ error: 'Access denied' }, { status: 403 });
    }

    // Step 3: Check if user has required role
    if (!['owner', 'admin'].includes(access.role)) {
        return json({ error: 'Insufficient permissions. Owner or admin access required.' }, { status: 403 });
    }

    // Proceed with update...
};
```

### Admin-Only Endpoints

For organization admin endpoints:

```typescript
/**
 * Admin Groups API
 * Requires organization owner or admin role
 */
export const GET: RequestHandler = async ({ locals }) => {
    // Step 1: Authentication
    if (!locals.session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, organizationId } = locals.session;

    // Step 2: Check organization role
    const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
    const membership = memberships.find(m => m.organizationId === organizationId);

    if (!membership || membership.role === 'member') {
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    // Proceed with admin operation...
};
```

### Common Authorization Patterns

```typescript
// Space owner check
const space = await postgresSpaceRepository.findById(spaceId, userId);
if (space.userId !== userId) {
    return json({ error: 'Only space owner can perform this action' }, { status: 403 });
}

// Area access check (returns role and access source)
const access = await postgresAreaMembershipsRepository.canAccessArea(userId, areaId);
if (!access.hasAccess) {
    return json({ error: 'Access denied' }, { status: 403 });
}

// Document activation check (can user activate doc in this area?)
const canActivate = await postgresDocumentSharingRepository.canActivateDocument(
    userId,
    documentId,
    areaId,
    spaceId
);
if (!canActivate) {
    return json({ error: 'Cannot activate document not visible to this area' }, { status: 400 });
}
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

**Use appropriate status codes and structured error messages:**

```typescript
// 400 Bad Request - Client error (validation, missing required fields)
return json({ error: 'title is required' }, { status: 400 });

// 401 Unauthorized - Not authenticated (no session)
return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });

// 403 Forbidden - Authenticated but not authorized (insufficient permissions)
return json({ error: 'Insufficient permissions. Owner access required.' }, { status: 403 });
return json({ error: 'Access denied' }, { status: 403 });

// 404 Not Found - Resource doesn't exist or user can't access it
return json({ error: 'Item not found' }, { status: 404 });

// 409 Conflict - Resource already exists or state conflict
return json({ error: 'An item with this name already exists in this space' }, { status: 409 });

// 500 Internal Server Error - Server error (catch block)
return json(
    { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
);
```

**Security considerations:**
- Don't leak sensitive information in error messages
- For 404, don't reveal if resource exists but user lacks access
- Keep 500 error details minimal in production
- Use structured errors for client parsing (especially 401)

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

### Security (MANDATORY)
- [ ] ⚠️ Authentication check first: `if (!locals.session) return 401`
- [ ] Extract userId: `const userId = locals.session.userId`
- [ ] Authorization check if needed (roles, ownership, access)
- [ ] Return 403 for insufficient permissions

### Documentation
- [ ] Add JSDoc comment at top of file describing the endpoint
- [ ] Document each handler method (GET, POST, PATCH, DELETE)
- [ ] Document path params, query params, and request body
- [ ] Document any constraints or business rules

### Implementation
- [ ] Create file at correct path (`src/routes/api/...`)
- [ ] Import types from `./$types`
- [ ] Import repository from persistence layer
- [ ] Validate request body for POST/PATCH
- [ ] Handle 404 for non-existent resources
- [ ] Wrap in try/catch with console.error logging
- [ ] Return proper status codes:
  - 200 for successful GET/PATCH/DELETE
  - 201 for successful POST (create)
  - 400 for validation errors
  - 401 for authentication failures
  - 403 for authorization failures
  - 404 for not found
  - 500 for server errors

### Testing
- [ ] Test unauthenticated access (should return 401)
- [ ] Test unauthorized access (should return 403)
- [ ] Test with valid credentials
- [ ] Test error cases (missing fields, invalid IDs)

## Debugging Endpoints

### Common Issues & Quick Fixes

**🔴 Getting 401 when you expect 200**
```typescript
// Check: Is locals.session being set?
console.log('Session:', locals.session);  // Should not be null

// Check: Are you in the right context?
// → If testing in browser, ensure you're logged in
// → If testing with curl, include session cookie
```

**🔴 Getting 403 when you have access**
```typescript
// Check: Access control logic
const access = await postgresAreaMembershipsRepository.canAccessArea(userId, areaId);
console.log('Access result:', access);  // { hasAccess: true/false, role: '...', source: '...' }

// Check: Role requirements
console.log('User role:', access.role);  // Should be 'owner', 'admin', or 'member'
console.log('Required roles:', ['owner', 'admin']);  // Does user role match?
```

**🔴 Getting 404 when resource exists**
```typescript
// Check 1: Is resource soft-deleted?
const item = await sql`SELECT * FROM items WHERE id = ${id}`;  // Remove deleted_at filter temporarily
console.log('Found (including deleted):', item);

// Check 2: Access control preventing visibility?
console.log('User ID:', userId);
console.log('Resource user_id:', item.userId);
// If they don't match, check if user should have access via other means (space membership, etc.)

// Check 3: Is userId being extracted correctly?
console.log('locals.session:', locals.session);
console.log('userId:', userId);  // Should be a valid UUID
```

**🔴 Repository method returns null unexpectedly**
```typescript
// Debug: Check the SQL query result
const rows = await sql`SELECT * FROM items WHERE id = ${id} AND user_id = ${userId}`;
console.log('Raw query result:', rows);  // Empty array? Check user_id match
console.log('Row count:', rows.length);

// Common issue: camelCase mismatch
console.log('Row userId:', rows[0]?.userId);  // Should use camelCase, not snake_case
```

**🔴 TypeScript error: Property doesn't exist on locals**
```typescript
// Fix: Check type definition in src/app.d.ts
// Should have:
declare namespace App {
  interface Locals {
    session: {
      userId: string;
      organizationId: string;
      // ... other fields
    } | null;
  }
}

// Not:
interface Locals {
  userId?: string;  // ❌ Wrong structure
}
```

**🔴 Request body is undefined**
```typescript
// Check: Did you parse the JSON?
const body = await request.json();  // Required!
console.log('Parsed body:', body);

// Check: Content-Type header in request
// Should be: 'Content-Type': 'application/json'
```

**🔴 Query parameters are null**
```typescript
// Check: Using correct API
const spaceId = url.searchParams.get('spaceId');  // From URL object
console.log('Query params:', Object.fromEntries(url.searchParams));  // All params

// Not:
const spaceId = params.spaceId;  // ❌ This is for path params like [id]
```

**🔴 CORS errors in development**
```typescript
// Check: Are you hitting the right port?
// SvelteKit dev server: http://localhost:5173
// API routes: http://localhost:5173/api/...

// Not: http://localhost:4000 (that's LiteLLM proxy)
```

### Debug Helper Function

Add this to your endpoint during development:

```typescript
function debugEndpoint(label: string, data: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${label}]`, JSON.stringify(data, null, 2));
  }
}

// Usage in endpoint
export const GET: RequestHandler = async ({ params, locals, url }) => {
  debugEndpoint('GET /api/items/:id - Start', {
    params,
    session: locals.session,
    query: Object.fromEntries(url.searchParams)
  });
  
  // ... your logic ...
  
  debugEndpoint('GET /api/items/:id - Result', { item, found: !!item });
  
  return json({ item });
};
```

### Testing Endpoints

**With curl:**
```bash
# GET request
curl http://localhost:5173/api/items

# POST request
curl -X POST http://localhost:5173/api/items \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Item","spaceId":"space-123"}'

# With session cookie (copy from browser dev tools)
curl http://localhost:5173/api/items \
  -H "Cookie: session=your-session-token-here"
```

**In browser console:**
```javascript
// Authenticated request (uses existing session)
const response = await fetch('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Test', spaceId: 'space-123' })
});
const data = await response.json();
console.log(data);
```

## OAuth Token Management Pattern

When endpoints need OAuth-protected external API access (e.g., Microsoft Graph), **never refresh tokens inline**. Use the centralized token service pattern:

```typescript
// ✅ CORRECT - Use centralized token service
import { ensureValidToken } from '$lib/server/integrations/providers/calendar/token-service';

const tokenResult = await ensureValidToken(integration.id);
if (!tokenResult.success) {
    // tokenResult.requiresReconnect tells you if user must manually reconnect
    return json({ error: tokenResult.error }, { status: 502 });
}
const accessToken = tokenResult.accessToken;
```

```typescript
// ❌ WRONG - Inline token refresh (race conditions, no retry, no error parsing)
const refreshToken = await getRefreshToken(integrationId);
const newTokens = await refreshAccessToken(refreshToken.value); // No retry!
```

**Why the centralized service matters:**
- **Mutex**: Azure AD rotates refresh tokens on use — concurrent refreshes invalidate each other
- **Retry**: Transient Azure errors shouldn't force user to reconnect
- **Proactive refresh**: 5-minute buffer refreshes tokens before they expire
- **Error parsing**: Azure AADSTS codes distinguish "retry" from "reconnect required"

**Reference implementation:** `src/lib/server/integrations/providers/calendar/token-service.ts`

**Health check pattern:** For proactive refresh, create a lightweight health endpoint:
- `src/routes/api/integrations/calendar/health/+server.ts` — called by frontend on page load

## File Reference

**Excellent examples to learn from:**
- `src/routes/api/spaces/[id]/pin/+server.ts` - Clean auth, great JSDoc
- `src/routes/api/areas/[id]/+server.ts` - Role-based access control, multi-method JSDoc
- `src/routes/api/tasks/+server.ts` - Query parameter handling, bulk operations
- `src/routes/api/admin/groups/+server.ts` - Organization admin checks
- `src/routes/api/chat/+server.ts` - Streaming endpoint patterns
- `src/routes/api/integrations/calendar/health/+server.ts` - OAuth health check pattern
- `src/lib/server/integrations/providers/calendar/token-service.ts` - Centralized token refresh

**Authentication source:**
- `src/hooks.server.ts` - Where `locals.session` is set
