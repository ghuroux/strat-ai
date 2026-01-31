# Performance & Scalability Assessment

> Findings on caching, query patterns, pagination, multi-instance readiness, and payload handling for a public-facing platform.

**Assessment Date:** 2026-01-30

---

## What's Already Optimized

| Area | Implementation | Status |
|------|----------------|--------|
| Database indexes | Composite, partial, GIN full-text, JSONB path indexes | Optimized |
| Connection pooling | postgres.js pool of 10, idle timeout, graceful shutdown | Optimized |
| SSE streaming | HTTP streaming for chat (not WebSocket), proper cleanup | Optimized |
| Static asset compression | Vite precompress (gzip/brotli) | Optimized |
| Route code splitting | SvelteKit automatic per-route bundles | Optimized |
| Memory lifecycle | Proper `onDestroy` cleanup, no leaking listeners | Clean |
| LLM prompt caching | Anthropic cache_control breakpoints (4-block limit) | Optimized |
| Tool result caching | Database-backed 1-hour TTL | Optimized |

---

## 1. Application Caching {#1-caching}

**Severity: HIGH**
**Impact: Every request hits the database for data that rarely changes**

### Current State

- No Redis, memcached, or in-memory TTL cache
- No HTTP cache headers on API responses (only `no-cache` on chat)
- No CDN for static assets
- Tool call results cached in PostgreSQL (1-hour TTL) — correct but high-latency

### Data Re-Fetched on Every Request

These queries run on every chat message, even though the data changes infrequently:

```typescript
// src/routes/api/chat/+server.ts — runs on EVERY message
const preferences = await postgresUserRepository.getPreferences(userId);     // Changes: rarely
const calendarIntegration = await postgresIntegrationsRepository             // Changes: rarely
    .findByUserAndService(userId, 'calendar');
const areaContext = await postgresAreaRepository.findById(areaId);           // Changes: rarely
const spaceDocuments = await postgresDocumentRepository.findBySpace(spaceId); // Changes: occasionally
```

### Recommended Architecture

```
Client ──→ SvelteKit ──→ Redis (L1 cache) ──→ PostgreSQL (source of truth)
                              │
                              ├── User preferences (TTL: 5 min)
                              ├── Space metadata (TTL: 5 min)
                              ├── Area context (TTL: 2 min)
                              ├── Integration status (TTL: 5 min)
                              ├── Rate limiter buckets (TTL: sliding window)
                              └── Token refresh mutex (TTL: 30s)
```

### Implementation Steps

1. Add Redis to `docker-compose.yml`
2. Create `src/lib/server/cache.ts` with get/set/invalidate
3. Wrap high-frequency queries with cache layer
4. Invalidate on mutation (space update → invalidate space cache)
5. Move rate limiter from in-memory Map to Redis

### HTTP Cache Headers

Add to read-only API responses:

```typescript
// Space metadata (changes infrequently)
return json(data, {
    headers: { 'Cache-Control': 'private, max-age=60' }
});

// User preferences (user-specific, changes infrequently)
return json(data, {
    headers: { 'Cache-Control': 'private, max-age=300' }
});

// Chat responses (never cache)
return new Response(stream, {
    headers: { 'Cache-Control': 'no-store' }
});
```

---

## 2. In-Memory State (Multi-Instance Blocker) {#2-multi-instance}

**Severity: CRITICAL for horizontal scaling**

### Problem

Three components store state in Node.js process memory. With a load balancer distributing requests across multiple server instances, this state is per-process and can't be shared:

| Component | File | State | Impact |
|-----------|------|-------|--------|
| Rate limiter | `src/lib/server/rate-limiter.ts` | `Map<string, RateLimitEntry>` | Users bypass limits by hitting different servers |
| Token refresh mutex | `src/lib/server/integrations/token-service.ts` | `Map<integrationId, Promise>` | Concurrent refreshes on different servers race |
| LLM streaming state | `src/routes/api/chat/+server.ts` | Request-scoped (safe) | No issue |

### Current Rate Limiter

```typescript
// src/lib/server/rate-limiter.ts
const buckets = new Map<string, RateLimitEntry>();
// Comment in code: "Counters reset on server restart (acceptable for single-instance)"
```

### Fix: Move to Redis

```typescript
// Rate limiter with Redis
import { redis } from '$lib/server/cache';

async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const current = await redis.incr(`ratelimit:${key}`);
    if (current === 1) {
        await redis.pexpire(`ratelimit:${key}`, windowMs);
    }
    return current <= limit;
}

// Token mutex with Redis
async function withMutex<T>(key: string, fn: () => Promise<T>, ttlMs = 30000): Promise<T> {
    const lockKey = `mutex:${key}`;
    const acquired = await redis.set(lockKey, '1', 'PX', ttlMs, 'NX');
    if (!acquired) {
        // Wait for existing operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        return withMutex(key, fn, ttlMs);
    }
    try {
        return await fn();
    } finally {
        await redis.del(lockKey);
    }
}
```

### Single-Instance Documentation

Until Redis is added, document the constraint:

```markdown
## Deployment Constraint
StratAI currently requires single-instance deployment. In-memory rate limiting
and token refresh mutexes do not synchronize across instances. Redis is required
before horizontal scaling.
```

---

## 3. Document Fetching in Chat {#3-n1-queries}

**Severity: LOW** (verified — no N+1 pattern exists)

### Verification Result

Code review confirmed that the chat endpoint does **not** exhibit N+1 query behavior. Documents are fetched upstream as part of `focusArea.contextDocuments` and `spaceInfo.contextDocuments`, then iterated in memory:

```typescript
// Actual pattern — iterates pre-fetched data, NOT per-document queries
if (focusArea?.contextDocuments) {
    allDocs.push(...focusArea.contextDocuments);
}
if (spaceInfo?.contextDocuments) {
    for (const doc of spaceInfo.contextDocuments) {
        if (!focusAreaFilenames.has(doc.filename)) {
            allDocs.push(doc);
        }
    }
}
```

### Repository Patterns (Good)

Most repositories use efficient patterns:
- Areas: Single CTE query with UNION for access control
- Tasks: Filtered composite indexes, single query with JOINs
- Pages: Version-aware queries with proper indexes
- Documents: Fetched as part of area/space context loading, not per-ID

### Recommendation

No action required. If document volumes grow significantly (hundreds per area), monitor query performance on the upstream context-loading queries and consider adding a `findByIds()` batch method as a future optimization.

---

## 4. API Pagination {#4-pagination}

**Severity: MEDIUM**

### Current State

| Endpoint | Paginated? | Risk |
|----------|-----------|------|
| `GET /api/conversations` | Yes (offset/limit, max 100) | Low |
| `GET /api/tasks` | No — returns all | High at scale |
| `GET /api/documents` | No — returns all | Medium |
| `GET /api/pages` | No — returns all | Medium |
| `GET /api/meetings` | No — returns all | Low (fewer records) |
| `GET /api/games/scores` | No — returns top N | Low |

### Impact

A power user with 1,000 tasks triggers:
1. Full table scan on `tasks` table (even with indexes, returns all rows)
2. Serialization of 1,000 JSON objects
3. Network transfer of ~500KB+ payload
4. Client-side parsing and rendering of full list
5. SvelteMap insertion of 1,000 entries

### Fix

Add pagination to all list endpoints using a consistent pattern:

```typescript
// Standard pagination parameters
const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0'));
const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));

// Standard response shape
return json({
    data: items,
    pagination: {
        offset,
        limit,
        total: totalCount,
        hasMore: offset + limit < totalCount
    }
});
```

Priority: Tasks endpoint first (highest record count per user), then documents, then pages.

---

## 5. Bundle Size {#5-bundle-size}

**Severity: LOW**

### Current Dependencies

| Package | Approx Size | Client/Server | Notes |
|---------|-------------|--------------|-------|
| TipTap (all extensions) | ~200KB | Client | Needed for editor |
| xlsx | ~500KB | Server | Export only |
| pdfkit | ~100KB | Server | Export only |
| mammoth | ~200KB | Server | DOCX parsing |
| lucide-svelte | ~200KB | Client | Tree-shakeable |
| js-tiktoken | ~30KB | Both | Token counting |
| marked | ~50KB | Both | Markdown rendering |

### Observations

- Server-only packages (xlsx, pdfkit, mammoth) don't affect client bundle — SvelteKit tree-shakes
- TipTap is the largest client dependency but essential for the page editor
- `lucide-svelte` is tree-shakeable — only imported icons are bundled
- No dynamic import splitting for TipTap extensions (all loaded together)

### Improvement

Lazy-load TipTap only on routes that use the page editor:

```typescript
// Instead of static import in component
const { Editor } = await import('@tiptap/core');
const { StarterKit } = await import('@tiptap/starter-kit');
```

This removes ~200KB from the initial bundle for non-editor routes.

---

## 6. Image Storage {#6-image-storage}

**Severity: MEDIUM (at scale)**

### Current Implementation

```typescript
// Images stored as base64 in documents.content TEXT column
const base64 = buffer.toString('base64');
// Stored in PostgreSQL: ~1.3x original file size
```

### Problems at Scale

1. **Storage inefficiency:** 5MB image becomes ~6.5MB in base64
2. **Memory pressure:** Loading image from DB loads full base64 string into Node.js heap
3. **No optimization:** No resizing, compression, or format conversion
4. **No responsive variants:** Same image served to mobile and desktop
5. **Database bloat:** Large TEXT values degrade vacuum and backup performance

### Migration Path (When Needed)

```
Phase 1 (current): Base64 in PostgreSQL — works for V1 with 5MB limit
Phase 2: S3/R2 object storage + signed URLs
Phase 3: Image CDN (Cloudflare Images, imgproxy) with responsive variants
```

The current approach is acceptable for launch with the 5MB limit. Plan migration when image upload volume exceeds ~10GB total storage.

---

## 7. Database Connection Pool {#7-connection-pool}

**Severity: LOW (single instance), MEDIUM (multi-instance)**

### Current Configuration

```typescript
// src/lib/server/persistence/db.ts
export const sql = postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: { column: { to: postgres.fromCamel, from: postgres.toCamel } }
});
```

### Analysis

- **10 connections** is fine for a single server instance handling ~100 concurrent users
- PostgreSQL default `max_connections = 100`
- With 3 server instances × 10 connections = 30 connections (still fine)
- With 10 instances × 10 = 100 connections (hits default limit)

### Scaling Path

When horizontal scaling is needed:
1. Increase PostgreSQL `max_connections` to 200-300
2. Or add PgBouncer as connection pooler (recommended for >5 instances)
3. Consider reducing per-instance pool to 5 connections with PgBouncer

---

## 8. Large Payload Handling {#8-payloads}

**Severity: LOW**

### Current Limits

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024;      // 10MB documents
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;       // 5MB images
```

### Implementation

Files are loaded entirely into memory:

```typescript
const arrayBuffer = await file.arrayBuffer();  // Full file in memory
const buffer = Buffer.from(arrayBuffer);
```

At 100 concurrent uploads × 10MB = 1GB memory. Acceptable for moderate traffic but would need streaming for high-volume scenarios.

### Future Fix

If upload volume becomes significant:

```typescript
// Stream to disk/S3 instead of buffering
const writeStream = createWriteStream(tempPath);
for await (const chunk of file.stream()) {
    writeStream.write(chunk);
}
```

---

## Summary of Recommended Actions

| Priority | Action | Effort | Scaling Impact |
|----------|--------|--------|----------------|
| **P0** | Document single-instance constraint | Small | Prevents production incidents |
| **P1** | Paginate tasks/documents/pages endpoints | Small | Prevents large payload issues |
| **P1** | HTTP cache headers on read endpoints | Small | Reduces server requests |
| **P2** | Add Redis for rate limiter + mutex | Medium | Enables horizontal scaling (defer until multi-instance is needed) |
| **P2** | Redis caching for user preferences + space metadata | Medium | Reduces DB load 50%+ |
| **P3** | Lazy-load TipTap editor | Small | ~200KB off initial bundle |
| **P3** | Image storage migration planning | Design | Needed at ~10GB stored |
| **P3** | PgBouncer for connection pooling | Medium | Needed at >5 instances |
| **P4** | Streaming file upload | Medium | Needed at high upload volume |

> **Note:** Redis was originally listed as P1 for rate limiting and mutex. For a single-instance pre-launch deployment, the in-memory approach works fine. Redis becomes necessary when horizontal scaling is required — defer until then to avoid premature operational complexity.
