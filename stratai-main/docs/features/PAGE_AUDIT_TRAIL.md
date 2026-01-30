# Page Audit Trail & Activity Log

> **Status**: Tier 1 + 2 Implemented
> **Created**: January 2026
> **Authors**: Gabriel Roux, Claude
> **Prerequisite**: Page Lifecycle (Phases 1-4) — see `PAGE_LIFECYCLE.md`

## Overview

Every page change — creation, edit, finalize, unlock, share, delete — must be tracked with an immutable audit trail. This serves three purposes:

1. **SOC 2 Compliance**: Demonstrable evidence of data access monitoring, change tracking, and access controls
2. **User Transparency**: Page owners see who viewed, edited, and shared their work
3. **Enterprise Trust**: Organizations can prove governance over knowledge artifacts

### Goals

1. **Complete event coverage**: Every meaningful page action creates an audit event
2. **Immutable logging**: Events are append-only — cannot be modified or deleted
3. **Rich metadata**: Capture before/after state, version numbers, context changes
4. **Owner-accessible**: Page owners always see their page's activity (not just admins)
5. **Organization-scoped**: All events tied to `organization_id` for multi-tenant queries
6. **View deduplication**: One view event per user per page per day (avoid noise)

### Non-Goals (This Phase)

- Cross-resource audit dashboard (org-wide activity view) — future
- IP address / User-Agent capture — Tier 3
- Audit log export for external compliance tools — Tier 3
- Real-time activity notifications — separate feature
- Document (uploaded file) audit events — future extension
- Area/Space/Task audit events — future extension

---

## Current State

### Infrastructure

| Layer | File | Status |
|-------|------|--------|
| **Database** | `fresh-install/schema.sql` → `audit_events` table | ✅ Complete |
| **Types** | `src/lib/types/audit.ts` | ✅ 16 event types, 7 metadata interfaces, filter groups |
| **Repository** | `src/lib/server/persistence/audit-postgres.ts` | ✅ `organizationId` param, `logPageView` dedup helper |
| **API** | `src/routes/api/pages/[id]/audit/+server.ts` | ✅ Owner + admin access |
| **UI** | `src/lib/components/pages/PageAuditLog.svelte` | ✅ Lifecycle tab, all 16 event formatters + icons |

### Database Schema (Existing)

```sql
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    CHECK (event_type != '' AND resource_type != '' AND action != '')
);

CREATE INDEX idx_audit_events_user ON audit_events(user_id, created_at DESC);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_events_type ON audit_events(event_type, created_at DESC);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);
```

### Event Coverage (All 16 Types Wired)

| Event Type | Logged | Where |
|------------|--------|-------|
| `page_created` | ✅ | `POST /api/pages` |
| `page_viewed` | ✅ | SSR page load (deduplicated: 1/user/page/day) |
| `page_edited` | ✅ | `PATCH /api/pages/[id]` |
| `page_deleted` | ✅ | `DELETE /api/pages/[id]` |
| `page_finalized` | ✅ | `POST /api/pages/[id]/finalize` |
| `page_unlocked` | ✅ | `POST /api/pages/[id]/unlock` |
| `page_version_restored` | ✅ | `POST /api/pages/[id]/versions/[v]/restore` |
| `page_context_added` | ✅ | `PATCH /api/pages/[id]/context` (inContext=true) |
| `page_context_removed` | ✅ | `PATCH /api/pages/[id]/context` (inContext=false) |
| `page_exported` | ✅ | `GET /api/pages/export/[id]` |
| `page_shared_user` | ✅ | Share endpoints |
| `page_shared_group` | ✅ | Share endpoints |
| `page_unshared_user` | ✅ | Share endpoints |
| `page_unshared_group` | ✅ | Share endpoints |
| `page_permission_changed` | ✅ | Share endpoints |
| `page_visibility_changed` | ✅ | Share endpoints + pages-postgres.ts |

### Access Control: Owner + Admin ✅

Page owners always see their page's activity log. Non-owners require admin permission. Uses `access.source === 'owner'` from `canAccessPage()`.

### Organization Scoping ✅

All API-level audit calls pass `locals.session.organizationId`. Repository-level calls (visibility changes in `pages-postgres.ts`) remain `null` since they don't have session context — acceptable for now.

---

## Expanded Event Type Taxonomy

### New Types to Add

```typescript
export type AuditEventType =
    // Existing
    | 'page_created'
    | 'page_viewed'
    | 'page_edited'
    | 'page_shared_user'
    | 'page_shared_group'
    | 'page_unshared_user'
    | 'page_unshared_group'
    | 'page_permission_changed'
    | 'page_visibility_changed'
    | 'page_deleted'
    // NEW: Lifecycle events
    | 'page_finalized'
    | 'page_unlocked'
    | 'page_version_restored'
    // NEW: Context events
    | 'page_context_added'
    | 'page_context_removed'
    // NEW: Export events
    | 'page_exported';
```

### Metadata Structures for New Events

```typescript
/** Metadata for page_created event */
interface PageCreatedMetadata {
    page_type: string;          // 'blank', 'from_chat', 'guided'
    visibility: string;         // 'private', 'area', 'space'
    source_conversation_id?: string;
    area_id: string;
}

/** Metadata for page_viewed event */
interface PageViewedMetadata {
    // Minimal — just the event existing is the signal
    // One event per user per page per day
}

/** Metadata for page_edited event */
interface PageEditedMetadata {
    word_count_before: number;
    word_count_after: number;
    title_changed: boolean;
}

/** Metadata for page_finalized event */
interface PageFinalizedMetadata {
    version_number: number;
    word_count: number;
    added_to_context: boolean;
    change_summary?: string;
}

/** Metadata for page_unlocked event */
interface PageUnlockedMetadata {
    from_version: number;
    kept_in_context: boolean;     // Context-aware unlock feature
    context_version_number?: number;  // Pinned version (if kept)
}

/** Metadata for page_version_restored event */
interface PageVersionRestoredMetadata {
    restored_version: number;
    current_version_before: number;
}

/** Metadata for page_context_added event */
interface PageContextAddedMetadata {
    version_number: number;
    area_id: string;
}

/** Metadata for page_context_removed event */
interface PageContextRemovedMetadata {
    version_number: number;
    area_id: string;
}

/** Metadata for page_exported event */
interface PageExportedMetadata {
    format: string;   // 'markdown', 'html', 'pdf'
}

/** Metadata for page_deleted event */
interface PageDeletedMetadata {
    was_finalized: boolean;
    was_in_context: boolean;
    version_count: number;
}
```

---

## View Deduplication Strategy

Page views are the noisiest event. To avoid bloating the audit table:

**Rule**: One `page_viewed` event per user, per page, per calendar day.

```typescript
async function logPageView(userId: string, pageId: string): Promise<void> {
    // Upsert: only insert if no view exists today
    await sql`
        INSERT INTO audit_events (user_id, event_type, resource_type, resource_id, action, metadata, organization_id)
        SELECT ${userId}, 'page_viewed', 'page', ${pageId}, 'view', '{}'::jsonb, ${orgId}
        WHERE NOT EXISTS (
            SELECT 1 FROM audit_events
            WHERE user_id = ${userId}
                AND resource_id = ${pageId}
                AND event_type = 'page_viewed'
                AND created_at >= CURRENT_DATE
                AND created_at < CURRENT_DATE + INTERVAL '1 day'
        )
    `;
}
```

This keeps views useful for compliance ("who accessed this page?") without generating thousands of rows.

---

## Access Control Changes

### Current: Admin-Only

```typescript
// Current — too restrictive
if (!access.hasAccess || access.permission !== 'admin') {
    return json({ error: 'Access denied' }, { status: 403 });
}
```

### Proposed: Owner + Admin

```typescript
// New — page owners can see their own activity log
if (!access.hasAccess) {
    return json({ error: 'Access denied' }, { status: 403 });
}

// Owner always has access; non-owners need admin permission
const page = await postgresPageRepository.findById(pageId, userId);
const isOwner = page?.userId === userId;
if (!isOwner && access.permission !== 'admin') {
    return json({ error: 'Access denied' }, { status: 403 });
}
```

**Rationale**: Page owners have a legitimate need to see who viewed, edited, and shared their pages. This is also a user-facing feature ("who's reading my document?"), not just compliance.

---

## Implementation Tiers

### Tier 1: Complete Event Coverage (Core Compliance) ✅

**Goal**: Every page lifecycle action creates an audit event
**Status**: Implemented — January 30, 2026

#### 1a. Expand Event Types

**File**: `src/lib/types/audit.ts`

- Add 6 new event types to `AuditEventType` union
- Add typed metadata interfaces for all new events
- Add a utility to categorize events by filter group

#### 1b. Wire `logEvent()` Calls

Add `postgresAuditRepository.logEvent()` to every page endpoint:

| Endpoint | Event Type | Metadata |
|----------|------------|----------|
| `POST /api/pages` | `page_created` | page_type, visibility, area_id, source_conversation_id |
| `PATCH /api/pages/[id]` | `page_edited` | word_count_before/after, title_changed |
| `DELETE /api/pages/[id]` | `page_deleted` | was_finalized, was_in_context, version_count |
| `POST /api/pages/[id]/finalize` | `page_finalized` | version_number, word_count, added_to_context, change_summary |
| `POST /api/pages/[id]/unlock` | `page_unlocked` | from_version, kept_in_context, context_version_number |
| `POST /api/pages/[id]/versions/[v]/restore` | `page_version_restored` | restored_version, current_version_before |
| `PATCH /api/pages/[id]` (context toggle) | `page_context_added` / `page_context_removed` | version_number, area_id |
| `GET /api/pages/export/[id]` | `page_exported` | format |

**Important**: The `logEvent()` function is already fire-and-forget (catches errors silently). Adding calls has zero risk of breaking existing functionality.

#### 1c. View Deduplication

Add `logPageView()` helper with the one-per-day upsert pattern. Call from:
- `GET /api/pages/[id]` (API access)
- Page SSR load (`+page.server.ts`)

#### 1d. Populate Organization ID

Pass `organizationId` from `locals.session` through to `logEvent()`. Requires adding an optional `organizationId` parameter to the repository method.

**Repository change**:
```typescript
async function logEvent(
    userId: string,
    eventType: AuditEventType,
    resourceType: AuditResourceType,
    resourceId: string,
    action: string,
    metadata: Record<string, unknown> = {},
    organizationId?: string  // NEW
): Promise<void> {
    await sql`
        INSERT INTO audit_events (
            user_id, event_type, resource_type, resource_id,
            action, metadata, organization_id
        ) VALUES (
            ${userId}, ${eventType}, ${resourceType}, ${resourceId},
            ${action}, ${sql.json(metadata)}, ${organizationId ?? null}
        )
    `;
}
```

---

### Tier 2: Access & Visibility (Usability) ✅

**Goal**: Make the activity log useful to page owners, not just auditors
**Status**: Implemented — January 30, 2026

#### 2a. Open Access to Page Owners

**File**: `src/routes/api/pages/[id]/audit/+server.ts`

Change access check from admin-only to owner + admin (see Access Control Changes section above).

#### 2b. Add "Lifecycle" Filter Tab

**File**: `src/lib/components/pages/PageAuditLog.svelte`

Add a 5th filter tab:

| Tab | Event Types |
|-----|-------------|
| All | (all) |
| Views | `page_viewed` |
| Edits | `page_edited` |
| Lifecycle | `page_created`, `page_finalized`, `page_unlocked`, `page_version_restored`, `page_deleted` |
| Sharing | `page_shared_*`, `page_unshared_*`, `page_permission_changed`, `page_visibility_changed` |

**Note**: Context events (`page_context_added`, `page_context_removed`) and export (`page_exported`) can fall under "All" only for now — they don't warrant their own tab.

#### 2c. Format New Event Types

**File**: `src/lib/components/pages/PageAuditLog.svelte`

Update `formatEvent()` and `getEventIcon()` for all new event types:

| Event | Display Text | Icon |
|-------|-------------|------|
| `page_created` | "created this page" | `FilePlus` |
| `page_finalized` | "finalized as v{N}" | `Lock` |
| `page_unlocked` | "unlocked v{N} for editing" | `Unlock` |
| `page_version_restored` | "restored to v{N}" | `RotateCcw` |
| `page_context_added` | "added v{N} to AI context" | `BookOpen` |
| `page_context_removed` | "removed from AI context" | `BookX` |
| `page_exported` | "exported as {format}" | `Download` |
| `page_deleted` | "deleted this page" | `Trash2` |

#### 2d. Event Detail Expansion (Optional)

For events with rich metadata (edits, finalization), show expandable details:

```
  Jane Smith finalized as v3                    2h ago
  └─ 1,247 words · Added to AI context · "Updated Q2 figures"
```

This is a nice-to-have that can be deferred if it adds too much scope.

---

### Tier 3: Compliance Hardening (Future — Enterprise)

**Goal**: SOC 2 Type II certification readiness

#### 3a. Immutability

Add database-level protection against modification or deletion:

```sql
-- Prevent UPDATE on audit_events
CREATE RULE audit_events_no_update AS
    ON UPDATE TO audit_events DO INSTEAD NOTHING;

-- Prevent DELETE on audit_events (except by retention policy)
CREATE RULE audit_events_no_delete AS
    ON DELETE TO audit_events DO INSTEAD NOTHING;
```

Alternative: Use a database trigger that raises an exception on UPDATE/DELETE. The rule approach is simpler but the trigger approach provides better error messages.

#### 3b. Retention Policy

Define retention windows:
- **Active retention**: 13 months (SOC 2 standard)
- **Archive**: Move events older than 13 months to `audit_events_archive` table
- **Purge**: Delete archived events older than 7 years (legal maximum)

Implementation: Scheduled job (cron or pg_cron) that runs monthly.

#### 3c. IP / User-Agent Capture

Add `ip_address` and `user_agent` columns to `audit_events`:

```sql
ALTER TABLE audit_events ADD COLUMN ip_address INET;
ALTER TABLE audit_events ADD COLUMN user_agent TEXT;
```

Requires threading request headers through to `logEvent()`:

```typescript
logEvent(userId, eventType, resourceType, resourceId, action, metadata, {
    organizationId,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    userAgent: request.headers.get('user-agent')
});
```

#### 3d. Organization Audit Dashboard

New page: `/admin/audit` — shows all audit events across the organization.

- Filterable by resource type, event type, user, date range
- CSV/JSON export for auditors
- Summary statistics (events per day, most active pages, etc.)

#### 3e. Audit Log Export

API endpoint for bulk export:

```
GET /api/admin/audit/export?format=csv&startDate=2026-01-01&endDate=2026-01-31
```

Returns all events for the organization within the date range. Required for SOC 2 evidence collection.

---

## Files to Modify (Tier 1 + 2)

| Action | File | Changes |
|--------|------|---------|
| MODIFY | `src/lib/types/audit.ts` | Add 6 event types, metadata interfaces, filter group utility |
| MODIFY | `src/lib/server/persistence/audit-postgres.ts` | Add `organizationId` param, `logPageView()` helper |
| MODIFY | `src/routes/api/pages/+server.ts` | Log `page_created` on POST |
| MODIFY | `src/routes/api/pages/[id]/+server.ts` | Log `page_edited` on PATCH, `page_deleted` on DELETE, `page_viewed` on GET, `page_context_added/removed` on context change |
| MODIFY | `src/routes/api/pages/[id]/finalize/+server.ts` | Log `page_finalized` |
| MODIFY | `src/routes/api/pages/[id]/unlock/+server.ts` | Log `page_unlocked` |
| MODIFY | `src/routes/api/pages/[id]/versions/[versionNumber]/+server.ts` | Log `page_version_restored` |
| MODIFY | `src/routes/api/pages/export/+server.ts` (if exists) | Log `page_exported` |
| MODIFY | `src/routes/api/pages/[id]/audit/+server.ts` | Change access: owner + admin |
| MODIFY | `src/routes/spaces/[space]/[area]/pages/[pageId]/+page.server.ts` | Log `page_viewed` on SSR load |
| MODIFY | `src/lib/components/pages/PageAuditLog.svelte` | Add Lifecycle tab, format new events, new icons |

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **View own page** | Still logs a view event (owner activity is auditable) |
| **Multiple saves in one session** | Each save creates an `page_edited` event (granular tracking) |
| **Finalize + add to context** | Two events: `page_finalized` + `page_context_added` |
| **Unlock with keep-in-context** | One event: `page_unlocked` with `kept_in_context: true` |
| **Restore clears context pin** | Two events: `page_version_restored` + `page_context_removed` (if was pinned) |
| **Delete page with versions** | One event: `page_deleted` with version_count in metadata |
| **Soft delete** | Audit events survive soft delete (audit trail is independent) |
| **User views page 10 times in a day** | One `page_viewed` event (deduplication) |
| **Admin views audit log** | Not logged (viewing the audit log is not an auditable page action) |

---

## Verification Criteria

### Tier 1 ✅

- [x] All 16 event types defined in TypeScript
- [x] Every page API endpoint logs appropriate events
- [x] `organization_id` populated on all new events
- [x] View deduplication: verify only 1 event per user per page per day
- [x] Fire-and-forget: verify audit failures don't break main operations
- [x] `npm run check` — 0 errors
- [x] `npm run build` — succeeds

### Tier 2 ✅

- [x] Page owners can see Activity panel (not just admins)
- [x] Lifecycle filter tab shows finalize/unlock/restore/create/delete events
- [x] All 16 event types render with correct text and icon
- [ ] Empty states work for each filter tab (not explicitly tested)
- [ ] Pagination works with new event types (not explicitly tested)

---

## SOC 2 Compliance Mapping

| SOC 2 Requirement | How We Address It |
|--------------------|-------------------|
| **CC6.1** - Logical access controls | `page_viewed`, `page_shared_*` events track who accesses what |
| **CC6.2** - Prior to access, identity verified | Events tied to authenticated `user_id` from session |
| **CC6.3** - Access revocation | `page_unshared_*`, `page_visibility_changed` events |
| **CC7.2** - Monitor system components | Complete event coverage across all page operations |
| **CC7.3** - Evaluate security events | Filter tabs, time grouping, metadata for investigation |
| **CC8.1** - Change management | `page_edited`, `page_finalized`, `page_version_restored` track all content changes |
| **A1.2** - Recovery objectives | Version history + audit trail enables point-in-time reconstruction |

---

## Related Documents

- `docs/features/PAGE_LIFECYCLE.md` — Page lifecycle phases 1-4 (prerequisite)
- `docs/features/CONTEXT_TRANSPARENCY.md` — How context is shown to users
- `src/lib/types/audit.ts` — Current audit type definitions
- `src/lib/server/persistence/audit-postgres.ts` — Audit repository
- `src/lib/components/pages/PageAuditLog.svelte` — Activity log UI

---

*Last Updated: January 30, 2026 — Tier 1 + 2 implemented*
