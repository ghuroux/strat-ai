# Page Sharing with Permissions & Audit Logging

> **Status:** Architecture Complete - Ready for Implementation
> **Created:** 2026-01-13
> **Timeline:** ~3 weeks (can span multiple sessions)
> **Strategic Context:** "Context remains current through collaboration"

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Strategic Value](#strategic-value)
3. [Current State Analysis](#current-state-analysis)
4. [Target Architecture](#target-architecture)
5. [Database Schema Design](#database-schema-design)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Audit Logging Implementation](#audit-logging-implementation)
9. [Testing Strategy](#testing-strategy)
10. [Migration & Deployment](#migration--deployment)

---

## Executive Summary

Transform page sharing from binary (private/area-wide) to enterprise-grade collaboration:

### What We're Building

**Granular Sharing:**
- Share with specific users and groups
- Permission levels: Viewer (read), Editor (edit), Admin (manage sharing)
- Smart access model: Private pages can invite anyone; area-wide pages auto-include area members

**Audit Logging:**
- Track views (sampled), edits, shares, permission changes
- Complete attribution (who did what, when)
- 1-year retention with automatic purging
- Enterprise compliance ready

**Read-Only Enforcement:**
- Viewer permission grays out editor
- Clear "Read-only" indicator
- Prevents accidental edits

### Timeline

| Week | Focus | Deliverable |
|------|-------|-------------|
| **1** | Backend | Database + API + Access Control |
| **2** | Frontend | SharePageModal + Permission UI |
| **3** | Audit UI | Activity Log + Read-Only Mode |

### Success Metrics

- Users can collaborate on strategic documents
- Clear who can view vs edit
- Full audit trail for compliance
- Familiar UX (reuses area sharing patterns)
- < 500ms to load sharing UI

---

## Strategic Value

### Problem Statement

**Current Limitations:**
- Pages are binary: private (only me) or shared (everyone in area)
- No way to get pre-release feedback from specific people
- No permission levels (can't share for review without edit access)
- No audit trail (who viewed, edited, shared?)
- No attribution for changes

**Business Impact:**
- Can't collaborate on strategy documents before releasing to team
- No accountability for document changes
- Can't satisfy compliance requirements (SOC 2, GDPR require audit logs)
- Context gets stale because only owner updates it

### Solution

**"Context remains current through collaboration"**

Enable multiple people to:
1. **View** strategy documents for alignment
2. **Edit** documents to keep information current
3. **Share** selectively for feedback before team-wide release
4. **Track** all activity for accountability and compliance

**Use Cases:**
- Draft proposal privately, share with 2-3 stakeholders for feedback, then publish to area
- Meeting notes: owner edits live, team has view access, can promote note-taker to editor
- Project brief: PM has admin, team leads have editor, stakeholders have viewer
- Decision records: Track who viewed, who contributed, when decisions were made

### Enterprise Value

**Compliance:**
- SOC 2 Type II requires access logs (who accessed what data)
- GDPR Article 30 requires processing records
- Audit log satisfies regulatory requirements

**Security:**
- Principle of least privilege (viewer vs editor vs admin)
- Attribution trail (who shared with whom)
- Revocation audit (know when access removed)

**Productivity:**
- Clear ownership and permissions
- No confusion about who can edit
- Pre-release review workflow
- Team-wide publishing when ready

---

## Current State Analysis

### Pages - Existing Implementation

**Database:** `023-pages-system.sql`
```sql
CREATE TABLE pages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    area_id TEXT NOT NULL REFERENCES areas(id),
    task_id TEXT REFERENCES tasks(id),
    title TEXT NOT NULL,
    content JSONB NOT NULL,            -- TipTap JSON
    content_text TEXT,                 -- Extracted for search
    page_type TEXT DEFAULT 'general',
    visibility TEXT DEFAULT 'private'   -- CURRENT: 'private' | 'shared'
        CHECK (visibility IN ('private', 'shared')),
    source_conversation_id TEXT,
    versions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

**Current Sharing Model:**
- **Binary visibility:** Private (owner only) OR Shared (all area members)
- **No granularity:** Can't share with specific people
- **No permissions:** Everyone with access can edit
- **No audit:** No tracking of access or changes (beyond versions array)

**UI:** `PageHeader.svelte`
- Simple visibility toggle (Private ↔ Shared)
- Confirmation when making private → shared
- No sharing management (can't see who has access)

**Problems:**
1. Can't get feedback before sharing with whole area
2. No read-only access (everyone can edit or no one can see)
3. No way to delegate sharing responsibility
4. No visibility into who viewed or edited
5. Area members are all-or-nothing

### Documents - More Advanced (Reference)

**Database:** `024-document-sharing.sql`
```sql
CREATE TABLE documents (
    visibility TEXT DEFAULT 'private'
        CHECK (visibility IN ('private', 'areas', 'space'))
);

CREATE TABLE document_area_shares (
    id TEXT PRIMARY KEY,
    document_id TEXT REFERENCES documents(id),
    area_id TEXT REFERENCES areas(id),
    shared_by TEXT,
    shared_at TIMESTAMPTZ,
    notifications_sent BOOLEAN
);
```

**Capabilities:**
- Three-level visibility (private/areas/space)
- Granular area-level sharing
- Attribution (shared_by, shared_at)
- Notification tracking

**Still Missing:**
- No user/group level sharing (only area-level)
- No permission levels (binary access)
- No audit logging

### Area Sharing - Recently Implemented (Pattern Reference)

**Database:** `027-area-sharing.sql`
```sql
CREATE TABLE area_memberships (
    id TEXT,
    area_id TEXT,
    user_id TEXT OR group_id UUID (XOR),
    role TEXT ('owner', 'admin', 'member', 'viewer'),
    invited_by TEXT,
    created_at TIMESTAMPTZ
);
```

**UI Components:**
- ShareAreaModal - Search, invite, manage members
- AreaRoleSelector - Dropdown with role options
- AreaRoleBadge - Color-coded role display
- Optimistic updates, toast notifications
- Mobile-optimized

**This is our template for page sharing!**

---

## Target Architecture

### Permission Model (3-Tier)

```typescript
type PagePermission = 'viewer' | 'editor' | 'admin';

const PERMISSIONS = {
  viewer: {
    label: 'Viewer',
    description: 'Can view page content',
    capabilities: ['read'],
    icon: 'Eye',
    color: '#6b7280' // Gray
  },
  editor: {
    label: 'Editor',
    description: 'Can view and edit page content',
    capabilities: ['read', 'edit'],
    icon: 'Edit',
    color: '#10b981' // Green
  },
  admin: {
    label: 'Admin',
    description: 'Can view, edit, and manage sharing',
    capabilities: ['read', 'edit', 'share', 'delete'],
    icon: 'Shield',
    color: '#3b82f6' // Blue
  }
};
```

**Future Expansion (with comment system):**
```typescript
commenter: {
  label: 'Commenter',
  description: 'Can view and add comments',
  capabilities: ['read', 'comment'],
  icon: 'MessageSquare',
  color: '#f59e0b' // Amber
}
```

### Visibility Model

Adopt document visibility model, enhance for pages:

| Visibility | Access Scope | Sharing Behavior | Use Case |
|-----------|--------------|------------------|----------|
| **`private`** | Owner + specific invites (users/groups) | Can invite ANYONE (even outside area/space) | Draft, pre-release review, confidential |
| **`area`** | All area members (via area_memberships) | CANNOT add specific users (area access controls who's in) | Team documents, area context |
| **`space`** | All space members | CANNOT add specific users (space ownership controls access) | Space-wide resources |

**Key Behavior:** Changing from `private` → `area/space` **removes all specific shares** (area/space access takes over).

**User's Insight:** This creates clean workflow:
1. Draft privately
2. Share with 2-3 people for feedback (even if they're not in area)
3. Iterate
4. Publish to area (specific shares automatically removed)

**Prevents:** Confusing hybrid state (area-wide + external specific users)

### Permission Inheritance

When page visibility is `area` or `space`, permissions inherit from membership:

| Area/Space Role | Default Page Permission | Reason |
|----------------|------------------------|--------|
| Owner | Editor | Strategic control |
| Admin | Editor | Team leadership |
| Member | Editor | Active participation |
| Viewer | Viewer | Read-only, as expected |

**Override Capability:** Page owner can demote specific area members from Editor → Viewer (future enhancement).

### Access Resolution Algorithm

**Precedence Order:**
1. Page owner → Admin (always)
2. If visibility = 'private':
   - Check page_user_shares → return permission
   - Check page_group_shares (via user's groups) → return permission
   - Else deny
3. If visibility = 'area':
   - Check area_memberships → map role to permission
   - Else deny
4. If visibility = 'space':
   - Check space ownership → Editor permission
   - Else deny

**Implementation:**
```typescript
async function canAccessPage(userId: string, pageId: string): Promise<PageAccessResult> {
  const page = await sql`SELECT * FROM pages WHERE id = ${pageId} AND deleted_at IS NULL`;
  if (!page) return { hasAccess: false, permission: null, source: null };

  // 1. Owner always has admin
  if (page.userId === userId) {
    return { hasAccess: true, permission: 'admin', source: 'owner' };
  }

  // 2. Private: Check explicit shares
  if (page.visibility === 'private') {
    // User share
    const userShare = await sql`
      SELECT permission FROM page_user_shares
      WHERE page_id = ${pageId} AND user_id = ${userId}
    `;
    if (userShare.length > 0) {
      return { hasAccess: true, permission: userShare[0].permission, source: 'user_share' };
    }

    // Group share (user is member of group)
    const groupShare = await sql`
      SELECT pgs.permission
      FROM page_group_shares pgs
      JOIN group_memberships gm ON pgs.group_id = gm.group_id
      WHERE pgs.page_id = ${pageId} AND gm.user_id = ${userId}::uuid
      ORDER BY
        CASE pgs.permission
          WHEN 'admin' THEN 1
          WHEN 'editor' THEN 2
          WHEN 'viewer' THEN 3
        END
      LIMIT 1
    `;
    if (groupShare.length > 0) {
      return { hasAccess: true, permission: groupShare[0].permission, source: 'group_share' };
    }

    return { hasAccess: false, permission: null, source: null };
  }

  // 3. Area: Check area membership
  if (page.visibility === 'area') {
    const areaAccess = await postgresAreaMembershipsRepository.canAccessArea(userId, page.areaId);
    if (!areaAccess.hasAccess) {
      return { hasAccess: false, permission: null, source: null };
    }

    // Map area role to page permission
    const permission = areaAccess.role === 'viewer' ? 'viewer' : 'editor';
    return { hasAccess: true, permission, source: 'area' };
  }

  // 4. Space: Check space ownership
  if (page.visibility === 'space') {
    const space = await sql`
      SELECT id FROM spaces
      WHERE id = ${page.spaceId} AND user_id = ${userId} AND deleted_at IS NULL
    `;
    if (space.length > 0) {
      return { hasAccess: true, permission: 'editor', source: 'space' };
    }

    return { hasAccess: false, permission: null, source: null };
  }

  return { hasAccess: false, permission: null, source: null };
}
```

---

## Database Schema Design

### Migration 028: Page Sharing & Audit Logging

**File:** `src/lib/server/persistence/migrations/028-page-sharing-audit.sql`

```sql
-- =================================================================
-- STEP 1: Update pages table visibility column
-- =================================================================

-- Drop old constraint
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_visibility_check;

-- Update visibility column to support new values
ALTER TABLE pages
ALTER COLUMN visibility TYPE TEXT,
ALTER COLUMN visibility SET DEFAULT 'private';

-- Migrate existing data: 'shared' → 'area'
UPDATE pages
SET visibility = 'area'
WHERE visibility = 'shared';

-- Add new constraint with three levels
ALTER TABLE pages
ADD CONSTRAINT pages_visibility_check CHECK (visibility IN ('private', 'area', 'space'));

-- =================================================================
-- STEP 2: Create page_user_shares table
-- =================================================================

CREATE TABLE IF NOT EXISTS page_user_shares (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,              -- TEXT to match pages.user_id pattern
    permission TEXT NOT NULL DEFAULT 'viewer'
        CHECK (permission IN ('viewer', 'editor', 'admin')),
    shared_by TEXT NOT NULL,             -- User who granted access
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(page_id, user_id)             -- Prevent duplicate shares
);

-- Indexes for access checks
CREATE INDEX idx_page_user_shares_page ON page_user_shares(page_id);
CREATE INDEX idx_page_user_shares_user ON page_user_shares(user_id);
CREATE INDEX idx_page_user_shares_lookup ON page_user_shares(page_id, user_id);

-- =================================================================
-- STEP 3: Create page_group_shares table
-- =================================================================

CREATE TABLE IF NOT EXISTS page_group_shares (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'viewer'
        CHECK (permission IN ('viewer', 'editor', 'admin')),
    shared_by TEXT NOT NULL,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(page_id, group_id)
);

-- Indexes
CREATE INDEX idx_page_group_shares_page ON page_group_shares(page_id);
CREATE INDEX idx_page_group_shares_group ON page_group_shares(group_id);
CREATE INDEX idx_page_group_shares_lookup ON page_group_shares(page_id, group_id);

-- =================================================================
-- STEP 4: Create audit_events table
-- =================================================================

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,                -- For multi-tenancy (future)
    user_id TEXT NOT NULL,                -- Who performed the action
    event_type TEXT NOT NULL,             -- 'page_viewed', 'page_edited', etc.
    resource_type TEXT NOT NULL,          -- 'page' | 'document' | 'area'
    resource_id TEXT NOT NULL,            -- ID of the resource
    action TEXT NOT NULL,                 -- 'view', 'edit', 'share', etc.
    metadata JSONB,                       -- Event-specific data
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT audit_events_valid CHECK (
        event_type != '' AND
        resource_type != '' AND
        action != ''
    )
);

-- Indexes for common queries
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_events_user ON audit_events(user_id, created_at DESC);
CREATE INDEX idx_audit_events_type ON audit_events(event_type, created_at DESC);
CREATE INDEX idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_composite ON audit_events(resource_type, resource_id, user_id, created_at DESC);

-- =================================================================
-- STEP 5: Create view sampling table (deduplication)
-- =================================================================

-- Track last view per user per resource per day to prevent log spam
CREATE TABLE IF NOT EXISTS audit_view_tracking (
    user_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    last_view_date DATE NOT NULL,       -- Just the date, not timestamp
    view_count INT DEFAULT 1,            -- How many views this day

    PRIMARY KEY (user_id, resource_type, resource_id, last_view_date)
);

CREATE INDEX idx_audit_view_tracking_resource ON audit_view_tracking(resource_type, resource_id, last_view_date DESC);

-- =================================================================
-- STEP 6: Documentation
-- =================================================================

COMMENT ON TABLE page_user_shares IS 'Granular page sharing with specific users. Supports viewer, editor, admin permissions.';
COMMENT ON TABLE page_group_shares IS 'Granular page sharing with groups. All group members inherit the specified permission.';
COMMENT ON TABLE audit_events IS 'Comprehensive audit log for compliance and activity tracking.';
COMMENT ON TABLE audit_view_tracking IS 'Deduplication table for view events. Logs first view per day per user to prevent spam.';

COMMENT ON COLUMN pages.visibility IS 'Access scope: private (owner + shares), area (area members), space (space members)';
COMMENT ON COLUMN audit_events.metadata IS 'Event-specific JSON data: shared_with, old/new permissions, change details, etc.';
```

---

## Backend Implementation

### Phase 1.1: Repository - page-sharing-postgres.ts

**File:** `src/lib/server/persistence/page-sharing-postgres.ts`

**Purpose:** Repository for granular page sharing operations

**Types:**
```typescript
export type PagePermission = 'viewer' | 'editor' | 'admin';

export interface PageUserShare {
  id: string;
  pageId: string;
  userId: string;
  permission: PagePermission;
  sharedBy: string;
  sharedAt: Date;
  createdAt: Date;
}

export interface PageUserShareWithDetails extends PageUserShare {
  userName: string | null;
  userEmail: string | null;
}

export interface PageGroupShare {
  id: string;
  pageId: string;
  groupId: string;
  permission: PagePermission;
  sharedBy: string;
  sharedAt: Date;
  createdAt: Date;
}

export interface PageGroupShareWithDetails extends PageGroupShare {
  groupName: string;
  groupMemberCount: number;
}

export interface PageAccessResult {
  hasAccess: boolean;
  permission: PagePermission | null;
  source: 'owner' | 'user_share' | 'group_share' | 'area' | 'space' | null;
}
```

**Key Methods:**
```typescript
export const postgresPageSharingRepository = {
  // ====== Access Control ======
  async canAccessPage(userId: string, pageId: string): Promise<PageAccessResult> {
    // Implementation shown above in Access Resolution Algorithm
  },

  async getUserPermission(userId: string, pageId: string): Promise<PagePermission | null> {
    const access = await this.canAccessPage(userId, pageId);
    return access.hasAccess ? access.permission : null;
  },

  // ====== Get Shares ======
  async getPageShares(pageId: string): Promise<{
    users: PageUserShareWithDetails[];
    groups: PageGroupShareWithDetails[];
  }> {
    const [users, groups] = await Promise.all([
      sql`
        SELECT
          pus.id, pus.page_id, pus.user_id, pus.permission,
          pus.shared_by, pus.shared_at, pus.created_at,
          u.display_name as user_name,
          u.email as user_email
        FROM page_user_shares pus
        LEFT JOIN users u ON pus.user_id = u.id::text
        WHERE pus.page_id = ${pageId}
        ORDER BY pus.created_at ASC
      `,
      sql`
        SELECT
          pgs.id, pgs.page_id, pgs.group_id, pgs.permission,
          pgs.shared_by, pgs.shared_at, pgs.created_at,
          g.name as group_name,
          COUNT(gm.user_id) as group_member_count
        FROM page_group_shares pgs
        LEFT JOIN groups g ON pgs.group_id = g.id
        LEFT JOIN group_memberships gm ON g.id = gm.group_id
        WHERE pgs.page_id = ${pageId}
        GROUP BY pgs.id, pgs.page_id, pgs.group_id, pgs.permission,
                 pgs.shared_by, pgs.shared_at, pgs.created_at, g.name
        ORDER BY pgs.created_at ASC
      `
    ]);

    return { users, groups };
  },

  // ====== Share with User ======
  async sharePageWithUser(
    pageId: string,
    userId: string,
    permission: PagePermission,
    sharedBy: string
  ): Promise<PageUserShare> {
    const id = `pus_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const result = await sql`
      INSERT INTO page_user_shares (id, page_id, user_id, permission, shared_by)
      VALUES (${id}, ${pageId}, ${userId}, ${permission}, ${sharedBy})
      ON CONFLICT (page_id, user_id)
      DO UPDATE SET permission = ${permission}, shared_at = NOW()
      RETURNING *
    `;

    return result[0];
  },

  // ====== Share with Group ======
  async sharePageWithGroup(
    pageId: string,
    groupId: string,
    permission: PagePermission,
    sharedBy: string
  ): Promise<PageGroupShare> {
    const id = `pgs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const result = await sql`
      INSERT INTO page_group_shares (id, page_id, group_id, permission, shared_by)
      VALUES (${id}, ${pageId}, ${groupId}::uuid, ${permission}, ${sharedBy})
      ON CONFLICT (page_id, group_id)
      DO UPDATE SET permission = ${permission}, shared_at = NOW()
      RETURNING *
    `;

    return result[0];
  },

  // ====== Update Permissions ======
  async updateUserPermission(
    pageId: string,
    userId: string,
    newPermission: PagePermission
  ): Promise<boolean> {
    const result = await sql`
      UPDATE page_user_shares
      SET permission = ${newPermission}, shared_at = NOW()
      WHERE page_id = ${pageId} AND user_id = ${userId}
    `;

    return result.count > 0;
  },

  async updateGroupPermission(
    pageId: string,
    groupId: string,
    newPermission: PagePermission
  ): Promise<boolean> {
    const result = await sql`
      UPDATE page_group_shares
      SET permission = ${newPermission}, shared_at = NOW()
      WHERE page_id = ${pageId} AND group_id = ${groupId}::uuid
    `;

    return result.count > 0;
  },

  // ====== Remove Shares ======
  async removeUserShare(pageId: string, userId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM page_user_shares
      WHERE page_id = ${pageId} AND user_id = ${userId}
    `;

    return result.count > 0;
  },

  async removeGroupShare(pageId: string, groupId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM page_group_shares
      WHERE page_id = ${pageId} AND group_id = ${groupId}::uuid
    `;

    return result.count > 0;
  },

  // ====== Clear All Shares (when changing visibility) ======
  async clearAllShares(pageId: string): Promise<{ usersRemoved: number; groupsRemoved: number }> {
    const [userResult, groupResult] = await Promise.all([
      sql`DELETE FROM page_user_shares WHERE page_id = ${pageId}`,
      sql`DELETE FROM page_group_shares WHERE page_id = ${pageId}`
    ]);

    return {
      usersRemoved: userResult.count,
      groupsRemoved: groupResult.count
    };
  }
};
```

---

### Phase 1.2: Repository - audit-postgres.ts

**File:** `src/lib/server/persistence/audit-postgres.ts`

**Purpose:** Audit logging abstraction with view sampling

**Types:**
```typescript
export type AuditEventType =
  | 'page_created'
  | 'page_viewed'
  | 'page_edited'
  | 'page_shared_user'
  | 'page_shared_group'
  | 'page_unshared_user'
  | 'page_unshared_group'
  | 'page_permission_changed'
  | 'page_visibility_changed'
  | 'page_deleted';

export interface AuditEvent {
  id: string;
  organizationId: string | null;
  userId: string;
  eventType: AuditEventType;
  resourceType: 'page' | 'document' | 'area';
  resourceId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditEventWithUser extends AuditEvent {
  userName: string | null;
  userEmail: string | null;
}
```

**Key Methods:**
```typescript
export const postgresAuditRepository = {
  // ====== Log Event ======
  async logEvent(
    userId: string,
    eventType: AuditEventType,
    resourceType: 'page' | 'document' | 'area',
    resourceId: string,
    action: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO audit_events (user_id, event_type, resource_type, resource_id, action, metadata)
        VALUES (${userId}, ${eventType}, ${resourceType}, ${resourceId}, ${action}, ${sql.json(metadata ?? {})})
      `;
    } catch (error) {
      // Don't fail operations if audit logging fails
      console.error('[Audit] Failed to log event:', error);
    }
  },

  // ====== Log View (Sampled) ======
  async logPageView(userId: string, pageId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // Check if already logged today
      const existing = await sql`
        SELECT view_count FROM audit_view_tracking
        WHERE user_id = ${userId}
          AND resource_type = 'page'
          AND resource_id = ${pageId}
          AND last_view_date = ${today}::date
      `;

      if (existing.length > 0) {
        // Increment count but don't log new event
        await sql`
          UPDATE audit_view_tracking
          SET view_count = view_count + 1
          WHERE user_id = ${userId}
            AND resource_type = 'page'
            AND resource_id = ${pageId}
            AND last_view_date = ${today}::date
        `;
        return; // Don't log duplicate view event
      }

      // First view today - log it
      await sql`
        INSERT INTO audit_view_tracking (user_id, resource_type, resource_id, last_view_date, view_count)
        VALUES (${userId}, 'page', ${pageId}, ${today}::date, 1)
        ON CONFLICT (user_id, resource_type, resource_id, last_view_date)
        DO UPDATE SET view_count = audit_view_tracking.view_count + 1
      `;

      // Log the view event
      await this.logEvent(userId, 'page_viewed', 'page', pageId, 'view', {
        sampled: true,
        date: today
      });
    } catch (error) {
      console.error('[Audit] Failed to log view:', error);
    }
  },

  // ====== Query Audit Log ======
  async getPageAudit(
    pageId: string,
    options: {
      eventTypes?: AuditEventType[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AuditEventWithUser[]> {
    const { eventTypes, limit = 50, offset = 0 } = options;

    const query = sql`
      SELECT
        ae.id, ae.organization_id, ae.user_id, ae.event_type,
        ae.resource_type, ae.resource_id, ae.action, ae.metadata, ae.created_at,
        u.display_name as user_name,
        u.email as user_email
      FROM audit_events ae
      LEFT JOIN users u ON ae.user_id = u.id::text
      WHERE ae.resource_type = 'page'
        AND ae.resource_id = ${pageId}
        ${eventTypes && eventTypes.length > 0 ? sql`AND ae.event_type = ANY(${eventTypes})` : sql``}
      ORDER BY ae.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return query;
  },

  // ====== Purge Old Events (1 year retention) ======
  async purgeOldEvents(): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await sql`
      DELETE FROM audit_events
      WHERE created_at < ${oneYearAgo}
    `;

    console.log(`[Audit] Purged ${result.count} events older than 1 year`);
    return result.count;
  }
};
```

---

### Phase 1.3: Update pages-postgres.ts

**File:** `src/lib/server/persistence/pages-postgres.ts`

**Add Permission Checking:**

```typescript
// Update findById to include permission check
async findById(id: string, userId: string): Promise<Page | null> {
  // Check access first
  const access = await postgresPageSharingRepository.canAccessPage(userId, id);
  if (!access.hasAccess) return null;

  const rows = await sql<PageRow[]>`
    SELECT * FROM pages
    WHERE id = ${id}
      AND deleted_at IS NULL
  `;

  if (rows.length === 0) return null;

  const page = rowToPage(rows[0]);

  // Attach user's permission level
  (page as any).userPermission = access.permission;

  return page;
}

// Update findAll to only return pages user can access
async findAll(userId: string, areaId?: string): Promise<Page[]> {
  // Get all pages user owns
  const ownedPages = await sql<PageRow[]>`
    SELECT * FROM pages
    WHERE user_id = ${userId}
      ${areaId ? sql`AND area_id = ${areaId}` : sql``}
      AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `;

  // Get pages shared with user
  const sharedPages = await sql<PageRow[]>`
    SELECT DISTINCT p.*
    FROM pages p
    WHERE p.user_id != ${userId}
      ${areaId ? sql`AND p.area_id = ${areaId}` : sql``}
      AND p.deleted_at IS NULL
      AND (
        -- Private: Check explicit shares
        (p.visibility = 'private' AND (
          EXISTS (SELECT 1 FROM page_user_shares WHERE page_id = p.id AND user_id = ${userId})
          OR EXISTS (
            SELECT 1 FROM page_group_shares pgs
            JOIN group_memberships gm ON pgs.group_id = gm.group_id
            WHERE pgs.page_id = p.id AND gm.user_id = ${userId}::uuid
          )
        ))
        -- Area: Check area access
        OR (p.visibility = 'area' AND EXISTS (
          SELECT 1 FROM areas a
          WHERE a.id = p.area_id
            -- Simplified: check if user has area access (need full canAccessArea logic)
        ))
        -- Space: Check space ownership
        OR (p.visibility = 'space' AND EXISTS (
          SELECT 1 FROM spaces s
          WHERE s.id = (SELECT space_id FROM areas WHERE id = p.area_id)
            AND s.user_id = ${userId}
        ))
      )
    ORDER BY p.updated_at DESC
  `;

  return [...ownedPages, ...sharedPages].map(rowToPage);
}

// Update update() to check edit permission
async update(id: string, updates: UpdatePageInput, userId: string): Promise<Page | null> {
  const access = await postgresPageSharingRepository.canAccessPage(userId, id);

  if (!access.hasAccess) return null;
  if (access.permission === 'viewer') {
    throw new Error('Insufficient permissions. Editor or Admin access required.');
  }

  // ... rest of update logic
}

// Update delete() to check admin permission
async delete(id: string, userId: string): Promise<boolean> {
  const access = await postgresPageSharingRepository.canAccessPage(userId, id);

  if (!access.hasAccess) return false;
  if (access.permission !== 'admin') {
    throw new Error('Insufficient permissions. Admin access required.');
  }

  // ... rest of delete logic
}
```

---

### Phase 1.4: API Endpoints

**File:** `src/routes/api/pages/[id]/share/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageSharingRepository } from '$lib/server/persistence/page-sharing-postgres';
import { postgresAuditRepository } from '$lib/server/persistence/audit-postgres';

/**
 * GET /api/pages/[id]/share
 * Get current shares for a page
 * Returns: { users: [], groups: [], visibility, userPermission }
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = locals.session.userId;
  const pageId = params.id;

  // Check access (at least viewer)
  const access = await postgresPageSharingRepository.canAccessPage(userId, pageId);
  if (!access.hasAccess) {
    return json({ error: 'Access denied' }, { status: 403 });
  }

  // Get shares (only if admin)
  if (access.permission !== 'admin') {
    return json({ error: 'Only admins can view sharing settings' }, { status: 403 });
  }

  const shares = await postgresPageSharingRepository.getPageShares(pageId);
  const page = await postgresPageRepository.findById(pageId, userId);

  return json({
    users: shares.users,
    groups: shares.groups,
    visibility: page?.visibility,
    userPermission: access.permission
  });
};

/**
 * POST /api/pages/[id]/share
 * Add user or group share
 * Body: { userId?, groupId?, permission }
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.session) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = locals.session.userId;
  const pageId = params.id;

  // Check admin permission
  const access = await postgresPageSharingRepository.canAccessPage(userId, pageId);
  if (!access.hasAccess || access.permission !== 'admin') {
    return json({ error: 'Admin permission required to share' }, { status: 403 });
  }

  const body = await request.json();
  const { userId: targetUserId, groupId, permission = 'viewer' } = body;

  // Validate XOR
  if ((!targetUserId && !groupId) || (targetUserId && groupId)) {
    return json({ error: 'Must provide either userId or groupId, not both' }, { status: 400 });
  }

  // Validate permission
  if (!['viewer', 'editor', 'admin'].includes(permission)) {
    return json({ error: 'Invalid permission' }, { status: 400 });
  }

  try {
    let share;
    if (targetUserId) {
      share = await postgresPageSharingRepository.sharePageWithUser(pageId, targetUserId, permission, userId);

      // Log audit event
      await postgresAuditRepository.logEvent(
        userId,
        'page_shared_user',
        'page',
        pageId,
        'share',
        { target_user_id: targetUserId, permission }
      );
    } else {
      share = await postgresPageSharingRepository.sharePageWithGroup(pageId, groupId, permission, userId);

      // Log audit event
      await postgresAuditRepository.logEvent(
        userId,
        'page_shared_group',
        'page',
        pageId,
        'share',
        { target_group_id: groupId, permission }
      );
    }

    return json({ share }, { status: 201 });
  } catch (error) {
    console.error('Failed to share page:', error);
    return json({ error: 'Failed to share page' }, { status: 500 });
  }
};
```

**File:** `src/routes/api/pages/[id]/share/users/[userId]/+server.ts`

```typescript
/**
 * PATCH /api/pages/[id]/share/users/[userId]
 * Update user's permission
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
  // Auth check
  // Admin permission check
  // Update permission
  // Log audit event (page_permission_changed with old/new)
  // Return success
};

/**
 * DELETE /api/pages/[id]/share/users/[userId]
 * Remove user share
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
  // Auth check
  // Admin permission check
  // Remove share
  // Log audit event (page_unshared_user)
  // Return success
};
```

**Similar for groups:** `src/routes/api/pages/[id]/share/groups/[groupId]/+server.ts`

**File:** `src/routes/api/pages/[id]/audit/+server.ts`

```typescript
/**
 * GET /api/pages/[id]/audit
 * Query audit log for a page
 * Query params: eventTypes[], limit, offset
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
  // Auth check
  // Admin permission check (only admins can see audit log)
  // Query audit_events table
  // Return events with user details
};
```

---

## Frontend Implementation

### Phase 2.1: Component - SharePageModal.svelte

**File:** `src/lib/components/pages/SharePageModal.svelte`

**Purpose:** Main modal for page sharing (adapts ShareAreaModal pattern)

**Props:**
```typescript
interface Props {
  open: boolean;
  page: Page | null;
  onClose: () => void;
}
```

**Sections:**
1. **Visibility Toggle** (Private/Area/Space radio cards)
2. **Search & Invite** (if visibility = private)
3. **Current Shares List** (if visibility = private)
4. **Info Box** (explains current visibility)

**Layout:**
```svelte
<div class="modal-backdrop" transition:fade>
  <div class="modal" transition:fly>
    <header>
      <h2>Share "{page.title}"</h2>
      <button onclick={onClose}>×</button>
    </header>

    <div class="content">
      <!-- Visibility Section -->
      <section class="visibility-section">
        <h3>Who can access</h3>
        <div class="visibility-options">
          <button class="visibility-option" class:selected={visibility === 'private'}>
            <div class="radio-circle">...</div>
            <div class="option-content">
              <h4>Private</h4>
              <p>Only you and people you invite</p>
            </div>
          </button>

          <button class="visibility-option" class:selected={visibility === 'area'}>
            <div class="radio-circle">...</div>
            <div class="option-content">
              <h4>Shared with Area</h4>
              <p>All members of "{areaName}"</p>
            </div>
          </button>

          <button class="visibility-option" class:selected={visibility === 'space'}>
            <div class="radio-circle">...</div>
            <div class="option-content">
              <h4>Shared with Space</h4>
              <p>All members of "{spaceName}"</p>
            </div>
          </button>
        </div>
      </section>

      <!-- Invite Section (only for private) -->
      {#if visibility === 'private'}
        <section class="invite-section">
          <label>Invite people or groups</label>
          <PageMemberSearchInput {pageId} onSelect={handleAddShare} />
        </section>

        <!-- Shares List -->
        <section class="shares-section">
          <h3>People with Access ({shares.users.length + shares.groups.length})</h3>
          <PageShareList
            users={shares.users}
            groups={shares.groups}
            currentUserId={userId}
            onPermissionChange={handlePermissionChange}
            onRemove={handleRemoveShare}
          />
        </section>
      {/if}

      <!-- Info Box -->
      <div class="info-box">
        {#if visibility === 'area'}
          <Info size={16} />
          <p>All members of {areaName} can access this page based on their area role.</p>
        {:else if visibility === 'space'}
          <Info size={16} />
          <p>All members of {spaceName} can access this page.</p>
        {:else}
          <Info size={16} />
          <p>Only you and people you invite can access this page.</p>
        {/if}
      </div>
    </div>

    <footer>
      <button class="btn-secondary" onclick={onClose}>Close</button>
    </footer>
  </div>
</div>
```

---

### Phase 2.2: Component - PagePermissionBadge.svelte

**File:** `src/lib/components/pages/PagePermissionBadge.svelte`

**Purpose:** Display permission level with color-coding and icon

**Props:**
```typescript
interface Props {
  permission: PagePermission;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}
```

**Icons:**
- Viewer: Eye icon
- Editor: Edit/Pencil icon
- Admin: Shield icon

**Colors:**
```css
--permission-viewer: #6b7280
--permission-viewer-bg: rgba(107, 114, 128, 0.15)

--permission-editor: #10b981
--permission-editor-bg: rgba(16, 185, 129, 0.15)

--permission-admin: #3b82f6
--permission-admin-bg: rgba(59, 130, 246, 0.15)
```

**Tooltip Content:**
- Viewer: "Can view page content"
- Editor: "Can view and edit page content"
- Admin: "Can view, edit, and manage sharing"

---

### Phase 2.3: Component - PagePermissionSelector.svelte

**File:** `src/lib/components/pages/PagePermissionSelector.svelte`

**Purpose:** Dropdown to change permission level

**Props:**
```typescript
interface Props {
  currentPermission: PagePermission;
  shareId: string;
  shareName: string; // User or group name
  pageId: string;
  disabled?: boolean;
  onChange: (newPermission: PagePermission) => Promise<void>;
}
```

**Dropdown Options:**
- Viewer (Eye icon, gray)
- Editor (Edit icon, green)
- Admin (Shield icon, blue)

**Behavior:**
- Click to open dropdown
- Select new permission → auto-save
- Show loading spinner during save
- Checkmark on current permission
- Escape/click-outside to close

---

### Phase 2.4: Update PageHeader.svelte

**File:** `src/lib/components/pages/PageHeader.svelte`

**Current (from screenshot):**
- Title input
- Visibility button showing "Private" or "Shared"
- Save button
- Close button
- Simple modal asking "Share this page?"

**New Design:**

**Replace visibility button with:**
```svelte
<div class="page-sharing-controls">
  <!-- Permission badge (what I can do) -->
  <PagePermissionBadge permission={userPermission} size="sm" />

  <!-- Share button (if admin) -->
  {#if userPermission === 'admin'}
    <button class="share-button" onclick={() => (showShareModal = true)}>
      <Users size={16} />
      <span>Share</span>
    </button>
  {/if}

  <!-- Shared indicator (if page has shares) -->
  {#if shareCount > 0}
    <PageSharedIndicator {shareCount} {visibility} />
  {/if}
</div>
```

**Add SharePageModal:**
```svelte
<SharePageModal
  open={showShareModal}
  {page}
  onClose={() => (showShareModal = false)}
/>
```

---

### Phase 3.1: Component - PageAuditLog.svelte

**File:** `src/lib/components/pages/PageAuditLog.svelte`

**Purpose:** Timeline showing page activity

**Props:**
```typescript
interface Props {
  pageId: string;
  userPermission: PagePermission;
}
```

**Features:**
- Timeline of events (today, yesterday, this week, earlier)
- Event filtering (all, views, edits, sharing)
- User avatars + names
- Relative timestamps
- Event icons
- Pagination (50 per page)
- Load more button

**Layout:**
```svelte
<div class="audit-log">
  <header class="audit-header">
    <h3>Activity</h3>
    <div class="filter-buttons">
      <button class:active={filter === 'all'}>All</button>
      <button class:active={filter === 'views'}>Views</button>
      <button class:active={filter === 'edits'}>Edits</button>
      <button class:active={filter === 'sharing'}>Sharing</button>
    </div>
  </header>

  <div class="timeline">
    {#each groupedEvents as group}
      <div class="timeline-group">
        <h4 class="group-header">{group.label}</h4>
        {#each group.events as event}
          <AuditEventItem {event} />
        {/each}
      </div>
    {/each}
  </div>

  {#if hasMore}
    <button class="load-more" onclick={loadMore}>
      Load More
    </button>
  {/if}
</div>
```

**Event Grouping:**
```typescript
function groupEventsByTime(events: AuditEvent[]): TimelineGroup[] {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = startOfDay(subDays(now, 1));
  const thisWeek = startOfWeek(now);

  return [
    { label: 'Today', events: events.filter(e => isAfter(e.createdAt, today)) },
    { label: 'Yesterday', events: events.filter(e => isAfter(e.createdAt, yesterday) && isBefore(e.createdAt, today)) },
    { label: 'This Week', events: events.filter(e => isAfter(e.createdAt, thisWeek) && isBefore(e.createdAt, yesterday)) },
    { label: 'Earlier', events: events.filter(e => isBefore(e.createdAt, thisWeek)) }
  ].filter(g => g.events.length > 0);
}
```

---

### Phase 3.2: Component - AuditEventItem.svelte

**File:** `src/lib/components/pages/AuditEventItem.svelte`

**Purpose:** Single event display in timeline

**Props:**
```typescript
interface Props {
  event: AuditEventWithUser;
}
```

**Layout:**
```svelte
<div class="event-item">
  <div class="event-avatar">
    <!-- User initials or icon -->
  </div>
  <div class="event-content">
    <div class="event-header">
      <span class="event-user">{event.userName || 'Unknown'}</span>
      <span class="event-action">{formatAction(event)}</span>
      <span class="event-time">{formatRelativeTime(event.createdAt)}</span>
    </div>
    {#if event.metadata && hasMetadata(event)}
      <div class="event-metadata">
        {formatMetadata(event)}
      </div>
    {/if}
  </div>
  <div class="event-icon">
    <svelte:component this={getEventIcon(event.eventType)} size={16} />
  </div>
</div>
```

**Event Formatting:**
```typescript
function formatAction(event: AuditEvent): string {
  switch (event.eventType) {
    case 'page_viewed': return 'viewed';
    case 'page_edited': return 'edited';
    case 'page_shared_user': return `shared with ${event.metadata.target_user_name}`;
    case 'page_shared_group': return `shared with ${event.metadata.target_group_name}`;
    case 'page_permission_changed': return `changed ${event.metadata.target_user_name} from ${event.metadata.old_permission} to ${event.metadata.new_permission}`;
    case 'page_visibility_changed': return `changed visibility from ${event.metadata.old_visibility} to ${event.metadata.new_visibility}`;
    case 'page_created': return 'created page';
    case 'page_deleted': return 'deleted page';
    default: return event.action;
  }
}

function getEventIcon(eventType: AuditEventType): typeof SvelteComponent {
  switch (eventType) {
    case 'page_viewed': return Eye;
    case 'page_edited': return Edit;
    case 'page_shared_user':
    case 'page_shared_group': return UserPlus;
    case 'page_permission_changed': return Key;
    case 'page_visibility_changed': return Globe;
    case 'page_created': return Plus;
    case 'page_deleted': return Trash;
    default: return Info;
  }
}
```

---

### Phase 3.3: Read-Only Editor Enforcement

**File:** `src/lib/components/pages/PageEditor.svelte`

**Current:** TipTap editor always editable

**Enhanced:** Detect viewer permission and make read-only

**Props Update:**
```typescript
interface Props {
  page?: Page | null;
  areaId: string;
  taskId?: string;
  initialContent?: TipTapContent;
  initialTitle?: string;
  initialType?: PageType;
  sourceConversationId?: string;
  userPermission?: PagePermission; // NEW - Phase 3
  onSave: (content: TipTapContent, title: string, visibility: PageVisibility) => Promise<void>;
  onClose: () => void;
}
```

**Editor Configuration:**
```typescript
editor = new Editor({
  element: editorElement,
  extensions: [...extensions],
  content: content,
  editable: userPermission !== 'viewer', // NEW - Disable for viewers
  onUpdate: ({ editor: ed }) => {
    if (userPermission === 'viewer') return; // Prevent updates
    content = ed.getJSON();
    isDirty = true;
    scheduleAutoSave();
  }
});
```

**Read-Only Indicator:**
```svelte
{#if userPermission === 'viewer'}
  <div class="read-only-banner">
    <Lock size={16} />
    <span>Read-only - You have viewer permission</span>
  </div>
{/if}
```

**Gray Out Save Button:**
```svelte
<button
  class="save-button"
  onclick={handleSave}
  disabled={!isDirty || isSaving || userPermission === 'viewer'}
>
  {#if userPermission === 'viewer'}
    <Lock size={16} />
    Read-only
  {:else if isSaving}
    Saving...
  {:else}
    Save
  {/if}
</button>
```

**Styling:**
```css
.read-only-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(107, 114, 128, 0.1);
  border: 1px solid rgba(107, 114, 128, 0.2);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.editor-body-wrapper.read-only {
  cursor: default;
  user-select: text; /* Allow text selection for copying */
}

.editor-body-wrapper.read-only :global(.ProseMirror) {
  opacity: 0.9;
  background: rgba(0, 0, 0, 0.02);
}
```

---

## Phase-by-Phase Acceptance Criteria

### Phase 1: Backend Infrastructure - Acceptance Criteria

#### Database Migration
- [ ] Migration 028 runs without errors on clean database
- [ ] Migration 028 runs without errors on database with existing pages
- [ ] `page_user_shares` table exists with correct schema
- [ ] `page_group_shares` table exists with correct schema
- [ ] `audit_events` table exists with correct schema
- [ ] `audit_view_tracking` table exists with correct schema
- [ ] All indexes created successfully
- [ ] Constraint `pages_visibility_check` allows 'private', 'area', 'space'
- [ ] Existing pages with visibility='shared' migrated to 'area'
- [ ] No pages have invalid visibility values after migration
- [ ] Foreign key constraints work (cascade deletes)
- [ ] Unique constraints prevent duplicate shares

#### Access Control - canAccessPage()
- [ ] Page owner returns `{ hasAccess: true, permission: 'admin', source: 'owner' }`
- [ ] User with viewer share returns `{ hasAccess: true, permission: 'viewer', source: 'user_share' }`
- [ ] User with editor share returns `{ hasAccess: true, permission: 'editor', source: 'user_share' }`
- [ ] User with admin share returns `{ hasAccess: true, permission: 'admin', source: 'user_share' }`
- [ ] Group member with group share returns correct permission from `group_share`
- [ ] User in multiple groups gets highest permission (admin > editor > viewer)
- [ ] Area member (private page) returns `{ hasAccess: false }` (not shared)
- [ ] Area member (area-visible page, area role=member) returns `{ hasAccess: true, permission: 'editor', source: 'area' }`
- [ ] Area member (area-visible page, area role=viewer) returns `{ hasAccess: true, permission: 'viewer', source: 'area' }`
- [ ] Space owner (space-visible page) returns `{ hasAccess: true, permission: 'editor', source: 'space' }`
- [ ] Non-owner, no share, no area access returns `{ hasAccess: false }`

#### Sharing Operations - User Shares
- [ ] `sharePageWithUser()` creates new share successfully
- [ ] `sharePageWithUser()` with duplicate user updates permission (ON CONFLICT)
- [ ] `sharePageWithUser()` logs audit event (page_shared_user)
- [ ] `updateUserPermission()` changes permission successfully
- [ ] `updateUserPermission()` logs audit event (page_permission_changed) with old/new
- [ ] `removeUserShare()` deletes share successfully
- [ ] `removeUserShare()` logs audit event (page_unshared_user)
- [ ] `removeUserShare()` returns false if share doesn't exist

#### Sharing Operations - Group Shares
- [ ] `sharePageWithGroup()` creates new share successfully
- [ ] `sharePageWithGroup()` with duplicate group updates permission (ON CONFLICT)
- [ ] `sharePageWithGroup()` logs audit event (page_shared_group)
- [ ] `updateGroupPermission()` changes permission successfully
- [ ] `updateGroupPermission()` logs audit event
- [ ] `removeGroupShare()` deletes share successfully
- [ ] `removeGroupShare()` logs audit event (page_unshared_group)

#### Sharing Operations - Visibility Changes
- [ ] Changing visibility private → area clears all specific shares
- [ ] Changing visibility private → space clears all specific shares
- [ ] Changing visibility area → private preserves shares (no auto-clear)
- [ ] Clearing shares logs count in visibility_changed event metadata
- [ ] `clearAllShares()` returns accurate count of shares removed

#### Audit Logging - Basic Events
- [ ] `logEvent()` creates audit_events record successfully
- [ ] `logEvent()` failure doesn't break main operation (try/catch)
- [ ] Event includes all required fields (user_id, event_type, resource_type, resource_id, action)
- [ ] Metadata stored as JSONB correctly
- [ ] Timestamps auto-populate (created_at)

#### Audit Logging - View Sampling
- [ ] First view of day creates audit_event and audit_view_tracking record
- [ ] Second view same day increments view_count, no new audit_event
- [ ] First view next day creates new audit_event
- [ ] `logPageView()` failure doesn't break page viewing
- [ ] View tracking uses date (not timestamp) for deduplication

#### Audit Logging - Queries
- [ ] `getPageAudit()` returns events for specified page
- [ ] `getPageAudit()` filters by event types correctly
- [ ] `getPageAudit()` paginates with limit/offset
- [ ] `getPageAudit()` returns events with user details (JOIN)
- [ ] `getPageAudit()` orders by created_at DESC (most recent first)
- [ ] `purgeOldEvents()` deletes events > 1 year old
- [ ] `purgeOldEvents()` returns count of deleted events
- [ ] `purgeOldEvents()` doesn't delete recent events

#### API Endpoints - Share Management
- [ ] `GET /api/pages/[id]/share` returns shares (requires admin)
- [ ] `GET /api/pages/[id]/share` returns 403 if not admin
- [ ] `POST /api/pages/[id]/share` adds user share (requires admin)
- [ ] `POST /api/pages/[id]/share` adds group share (requires admin)
- [ ] `POST /api/pages/[id]/share` validates XOR (userId OR groupId)
- [ ] `POST /api/pages/[id]/share` validates permission enum
- [ ] `POST /api/pages/[id]/share` returns 403 if not admin
- [ ] `PATCH /api/pages/[id]/share/users/[userId]` updates permission
- [ ] `DELETE /api/pages/[id]/share/users/[userId]` removes share
- [ ] Similar for groups endpoints

#### API Endpoints - Audit
- [ ] `GET /api/pages/[id]/audit` returns audit events
- [ ] `GET /api/pages/[id]/audit` requires admin permission
- [ ] `GET /api/pages/[id]/audit` filters by eventTypes query param
- [ ] `GET /api/pages/[id]/audit` paginates correctly

#### Integration with Pages API
- [ ] `GET /api/pages/[id]` checks access with canAccessPage()
- [ ] `GET /api/pages/[id]` returns 403 if no access
- [ ] `GET /api/pages/[id]` includes userPermission in response
- [ ] `PATCH /api/pages/[id]` checks edit permission (editor or admin)
- [ ] `PATCH /api/pages/[id]` returns 403 if viewer
- [ ] `PATCH /api/pages/[id]` logs page_edited event
- [ ] `DELETE /api/pages/[id]` checks admin permission
- [ ] `DELETE /api/pages/[id]` returns 403 if not admin

#### TypeScript
- [ ] `npm run check` passes with 0 errors
- [ ] All new types exported correctly
- [ ] No any types used (strict typing)

---

### Phase 2: Frontend Sharing UI - Acceptance Criteria

#### SharePageModal Component
- [ ] Modal opens from PageHeader "Share" button
- [ ] Modal shows current visibility (private/area/space)
- [ ] Modal title shows page name
- [ ] Modal loads current shares on open
- [ ] Loading state shown while fetching shares
- [ ] Error state shown if fetch fails
- [ ] Close button works (Escape key, backdrop click, X button)

#### Visibility Toggle
- [ ] Three radio options displayed: Private, Area, Space
- [ ] Current visibility option selected
- [ ] Private option shows "Only you and people you invite"
- [ ] Area option shows "All members of {area name}"
- [ ] Space option shows "All members of {space name}"
- [ ] Clicking option updates selection immediately
- [ ] Changing from private to area shows confirmation
- [ ] Changing from private to space shows confirmation
- [ ] Confirmation explains specific shares will be removed
- [ ] Confirmation shows count of shares that will be removed
- [ ] Changing from area to private doesn't require confirmation
- [ ] After visibility change, info box updates

#### Search & Invite (Private Pages Only)
- [ ] Search section only visible when visibility = private
- [ ] Search input has placeholder "Search by name or email..."
- [ ] Search triggers after 2+ characters
- [ ] Search debounced at 300ms
- [ ] Search shows loading spinner
- [ ] Search results show users and groups
- [ ] User results show: avatar, name, email
- [ ] Group results show: icon, name, member count
- [ ] Results exclude current page owner
- [ ] Results exclude users/groups already shared with
- [ ] Clicking result adds share with default permission (viewer)
- [ ] Can select permission before adding (dropdown or radio)
- [ ] Arrow keys navigate results
- [ ] Enter selects highlighted result
- [ ] Escape closes results
- [ ] Click outside closes results

#### Current Shares List (Private Pages Only)
- [ ] Shares section only visible when visibility = private
- [ ] Section header shows count: "People with Access ({count})"
- [ ] Owner shown with "You" badge and Admin permission
- [ ] Owner has lock icon (can't change own permission)
- [ ] User shares show: avatar, name, email, permission badge
- [ ] Group shares show: icon, name, member count, permission badge
- [ ] Shares sorted: owner first, then by name
- [ ] Current user highlighted if they're in list
- [ ] Empty state shown if no shares: "No one else has access"

#### Permission Management
- [ ] Permission selector shown for each share (except owner)
- [ ] Clicking permission badge opens dropdown
- [ ] Dropdown shows 3 options: Viewer, Editor, Admin
- [ ] Each option has icon, label, description
- [ ] Current permission has checkmark
- [ ] Selecting new permission closes dropdown
- [ ] Permission updates immediately (optimistic)
- [ ] Loading spinner shown during API call
- [ ] Success toast: "Changed {name} to {permission}"
- [ ] Error toast if API fails
- [ ] Permission reverts if API fails (rollback)
- [ ] Cannot change own permission (dropdown disabled)

#### Remove Share
- [ ] X button shown next to each share (except owner)
- [ ] X button turns red on hover
- [ ] Clicking X shows confirmation modal
- [ ] Confirmation shows user/group name
- [ ] Confirmation has Cancel and Remove buttons
- [ ] Clicking Remove removes share immediately (optimistic)
- [ ] Success toast: "Removed {name}"
- [ ] Share reappears if API fails (rollback)
- [ ] Cannot remove owner (no X button)

#### Info Box
- [ ] Info box shown at bottom of modal
- [ ] Info icon displayed
- [ ] Text explains current visibility mode
- [ ] Private: "Only you and people you invite can access this page"
- [ ] Area: "All members of {area} can access based on their area role"
- [ ] Space: "All members of {space} can access this page"
- [ ] Updates when visibility changes

#### Integration with PageHeader
- [ ] "Share" button visible in page header
- [ ] Share button only visible if user has admin permission
- [ ] Share button opens SharePageModal
- [ ] Shared indicator badge shown if shareCount > 0 or visibility != private
- [ ] Shared indicator shows visibility level
- [ ] User permission badge shown (Viewer/Editor/Admin)
- [ ] Old visibility toggle removed (replaced with Share button)

#### Toast Notifications
- [ ] Add user: "Added {name} as {permission}"
- [ ] Remove user: "Removed {name}"
- [ ] Change permission: "Changed {name} to {permission}"
- [ ] Change visibility: "Page is now {visibility}"
- [ ] Error: Shows specific error message
- [ ] All toasts appear bottom-right
- [ ] Toasts auto-dismiss after 5 seconds
- [ ] Toasts have dismiss button

#### Optimistic Updates
- [ ] Add share: Appears immediately, removed if fails
- [ ] Remove share: Disappears immediately, reappears if fails
- [ ] Permission change: Updates immediately, reverts if fails
- [ ] Visibility change: Updates immediately, reverts if fails
- [ ] UI remains responsive during operations
- [ ] Loading indicators subtle (no modal blocking)

#### Accessibility
- [ ] Share button has aria-label
- [ ] Modal has role="dialog" and aria-modal="true"
- [ ] Visibility options have role="radio"
- [ ] Search input has aria-label
- [ ] Permission dropdown has role="listbox"
- [ ] All interactive elements keyboard accessible
- [ ] Focus trap works in modal
- [ ] Screen reader announces changes

#### Visual Polish
- [ ] Modal styling consistent with area sharing modal
- [ ] Permission badges use same colors as area role badges
- [ ] Hover states on all interactive elements
- [ ] Transitions smooth (150-200ms)
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] Mobile-responsive (full-screen on <768px)

#### TypeScript
- [ ] `npm run check` passes with 0 errors
- [ ] All components properly typed
- [ ] Store methods have correct return types

---

### Phase 3: Audit Logging UI - Acceptance Criteria

#### PageAuditLog Component
- [ ] Component renders without errors
- [ ] Loads events when mounted
- [ ] Shows loading spinner while fetching
- [ ] Displays events in timeline format
- [ ] Groups events by time: Today, Yesterday, This Week, Earlier
- [ ] Each group has header with date label
- [ ] Empty state shown if no events: "No activity yet"

#### Event Display
- [ ] Each event shows user avatar (initials)
- [ ] Each event shows user name
- [ ] Each event shows action (formatted: "edited", "shared with Jane")
- [ ] Each event shows relative timestamp ("2h ago", "Yesterday")
- [ ] Each event shows appropriate icon (Eye, Edit, Share, etc.)
- [ ] Events with metadata show expanded details
- [ ] Share events show: "shared with {name}" with permission
- [ ] Permission change events show: "changed {name} from {old} to {new}"
- [ ] Visibility change events show: "changed from {old} to {new}, removed {count} shares"
- [ ] Edit events show: "edited" (and word count change if available)

#### Event Filtering
- [ ] Filter buttons shown: All, Views, Edits, Sharing
- [ ] Clicking filter updates displayed events
- [ ] "All" shows all event types
- [ ] "Views" shows only page_viewed events
- [ ] "Edits" shows only page_edited events
- [ ] "Sharing" shows share/unshare/permission events
- [ ] Active filter visually highlighted
- [ ] Filter persists during pagination

#### Pagination
- [ ] Initially loads 50 events
- [ ] "Load More" button shown if more events exist
- [ ] "Load More" hidden if all events loaded
- [ ] Clicking "Load More" loads next 50 events
- [ ] New events append to existing (don't replace)
- [ ] Loading spinner on "Load More" button during fetch
- [ ] Maintains scroll position after load

#### Permission Enforcement
- [ ] Audit log only accessible to users with admin permission
- [ ] Viewers cannot see audit log (hidden or shows permission error)
- [ ] Editors cannot see audit log (hidden or shows permission error)
- [ ] Admins see full audit log
- [ ] Owner sees full audit log (always admin)
- [ ] API returns 403 if non-admin tries to access

#### Integration in PageHeader
- [ ] "Activity" button shown in page header (if admin)
- [ ] Clicking "Activity" opens audit log panel or modal
- [ ] Activity indicator shows count of recent events (optional)
- [ ] Audit log opens in right panel (similar to EditorChatPanel)
- [ ] Panel can be toggled open/close
- [ ] Panel state persists during page editing

#### Read-Only Editor Enforcement
- [ ] Viewer permission disables editor (`editable: false`)
- [ ] Read-only banner shown at top of editor
- [ ] Banner shows lock icon + "Read-only - You have viewer permission"
- [ ] Save button disabled for viewers
- [ ] Save button shows lock icon + "Read-only" text
- [ ] Auto-save disabled for viewers
- [ ] Cmd+S shortcut disabled for viewers
- [ ] Title input disabled for viewers (or read-only)
- [ ] Visibility toggle hidden for viewers
- [ ] Editor has subtle visual indicator (slight gray background)
- [ ] User can still select and copy text (user-select: text)

#### Editor Permission Levels
- [ ] Editor permission enables editing (editable: true)
- [ ] Editor can change title
- [ ] Editor can edit content
- [ ] Editor can save changes
- [ ] Editor can use auto-save
- [ ] Editor cannot access Share button (not admin)
- [ ] Editor cannot access Activity log (not admin)

#### Admin Permission Levels
- [ ] Admin has all editor capabilities
- [ ] Admin sees Share button
- [ ] Admin can open share modal
- [ ] Admin can add/remove shares
- [ ] Admin can change permissions
- [ ] Admin can change visibility
- [ ] Admin sees Activity button
- [ ] Admin can view audit log

#### Real-Time Updates (Optional)
- [ ] Audit log polls every 30 seconds for new events
- [ ] New events appear at top of timeline
- [ ] Scroll position maintained during updates
- [ ] No duplicate events after update
- [ ] Polling stops when component unmounted

#### Error Handling
- [ ] Failed to load audit log: Shows error message
- [ ] Network error: Shows retry button
- [ ] Permission error: Shows "Access denied" message
- [ ] Empty audit log: Shows friendly message
- [ ] Malformed event: Skips event, logs warning

#### Visual Polish
- [ ] Timeline has clear visual hierarchy
- [ ] Event items have hover state
- [ ] Icons color-coded by event type
- [ ] Timestamps use muted color
- [ ] User names use primary text color
- [ ] Metadata uses secondary text color
- [ ] Smooth transitions for events appearing
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] Mobile-responsive (<768px)

#### Performance
- [ ] Audit log loads in < 300ms (50 events)
- [ ] Pagination doesn't cause jank
- [ ] Filter changes instant (client-side)
- [ ] No memory leaks from polling
- [ ] Smooth 60fps scroll

#### Accessibility
- [ ] Timeline has proper ARIA structure
- [ ] Event items have role="listitem"
- [ ] Filter buttons have aria-pressed
- [ ] Load More has aria-busy during load
- [ ] Screen reader announces new events
- [ ] Keyboard navigation works throughout

#### TypeScript
- [ ] `npm run check` passes with 0 errors
- [ ] All audit components properly typed
- [ ] Event metadata types defined

---

## Testing Strategy

### Unit Tests (Backend)

**Access Control Logic:**
```typescript
describe('postgresPageSharingRepository.canAccessPage()', () => {
  it('should grant admin to page owner', async () => {
    const access = await canAccessPage(ownerId, pageId);
    expect(access).toEqual({ hasAccess: true, permission: 'admin', source: 'owner' });
  });

  it('should grant viewer to user with viewer share', async () => {
    await sharePageWithUser(pageId, viewerId, 'viewer', ownerId);
    const access = await canAccessPage(viewerId, pageId);
    expect(access.permission).toBe('viewer');
  });

  it('should map area member role to page permission', async () => {
    // Area member with 'member' role → page 'editor' permission
    const access = await canAccessPage(areaMemberId, pageId);
    expect(access.permission).toBe('editor');
  });

  it('should deny access to user without share or area membership', async () => {
    const access = await canAccessPage(randomUserId, pageId);
    expect(access.hasAccess).toBe(false);
  });
});
```

**Audit Logging:**
```typescript
describe('postgresAuditRepository', () => {
  it('should log page view only once per day per user', async () => {
    await logPageView(userId, pageId);
    await logPageView(userId, pageId); // Same day

    const events = await getPageAudit(pageId, { eventTypes: ['page_viewed'] });
    expect(events.length).toBe(1); // Only one event logged
  });

  it('should increment view_count on subsequent views', async () => {
    await logPageView(userId, pageId);
    await logPageView(userId, pageId);

    const tracking = await sql`
      SELECT view_count FROM audit_view_tracking
      WHERE user_id = ${userId} AND resource_id = ${pageId}
    `;
    expect(tracking[0].viewCount).toBe(2);
  });
});
```

### Integration Tests

**Sharing Workflow:**
```typescript
describe('Page Sharing Flow', () => {
  it('should allow sharing private page with specific user', async () => {
    // 1. Create private page
    const page = await createPage({ visibility: 'private' });

    // 2. Share with user as editor
    await POST(`/api/pages/${page.id}/share`, { userId: 'user_2', permission: 'editor' });

    // 3. Verify user can access
    const access = await canAccessPage('user_2', page.id);
    expect(access.hasAccess).toBe(true);
    expect(access.permission).toBe('editor');

    // 4. Verify audit log
    const audit = await GET(`/api/pages/${page.id}/audit`);
    expect(audit).toContainEqual(expect.objectContaining({ eventType: 'page_shared_user' }));
  });

  it('should remove specific shares when changing to area visibility', async () => {
    // 1. Private page with 2 user shares
    const page = await createPage({ visibility: 'private' });
    await shareWithUser(page.id, 'user_2', 'viewer');
    await shareWithUser(page.id, 'user_3', 'editor');

    // 2. Change to area visibility
    await PATCH(`/api/pages/${page.id}`, { visibility: 'area' });

    // 3. Verify specific shares cleared
    const shares = await GET(`/api/pages/${page.id}/share`);
    expect(shares.users.length).toBe(0);

    // 4. Verify audit log shows visibility change
    const audit = await GET(`/api/pages/${page.id}/audit`);
    expect(audit).toContainEqual(expect.objectContaining({
      eventType: 'page_visibility_changed',
      metadata: expect.objectContaining({ specific_shares_removed: 2 })
    }));
  });
});
```

### Manual Testing Checklist

**Week 1 (Backend):**
- [ ] Migration 028 runs without errors
- [ ] Create private page → Can share with user → User can access
- [ ] Share with user → Audit event logged
- [ ] Update permission → Permission changes → Audit event logged
- [ ] Remove share → User loses access → Audit event logged
- [ ] Change visibility private → area → Specific shares cleared
- [ ] View page twice same day → Only 1 audit event

**Week 2 (Frontend):**
- [ ] Open share modal → See visibility options
- [ ] Toggle visibility → Confirmation if has shares
- [ ] Search for user → Add with permission → Appears in list
- [ ] Change permission via dropdown → Updates immediately
- [ ] Remove share → Confirmation → Disappears from list
- [ ] Share with group → Group appears with member count
- [ ] Toast notifications for all actions

**Week 3 (Audit UI):**
- [ ] Open audit log → See timeline of events
- [ ] Filter by event type → Shows filtered events
- [ ] See user names and timestamps
- [ ] Load more → Pagination works
- [ ] Only admin can see audit log
- [ ] Viewer sees read-only editor
- [ ] Read-only banner appears for viewers
- [ ] Save button disabled for viewers

---

## Migration & Deployment

### Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify existing pages migrated correctly (`shared` → `area`)
- [ ] Confirm no pages lost or inaccessible after migration
- [ ] Performance test: page access check < 50ms
- [ ] Load test: 1000 concurrent page views → audit log handles
- [ ] Purge job scheduled (monthly cron: delete events > 1 year)

### Rollback Plan

If critical issues arise:
1. Keep new tables (page_user_shares, audit_events) - data safe
2. Revert pages.visibility constraint to old ('private', 'shared')
3. Update pages SET visibility = 'shared' WHERE visibility = 'area'
4. Disable new sharing UI (comment out SharePageModal)
5. Re-enable simple visibility toggle
6. Fix issues, re-deploy

### Performance Monitoring

**Metrics to Track:**
- Page access check duration (target: < 50ms)
- Audit log write duration (target: < 10ms async)
- Share modal open time (target: < 200ms)
- Audit log query time (target: < 300ms for 50 events)
- View tracking table size (should stay small with sampling)

**Alerts:**
- audit_events table > 10M rows → review retention policy
- Page access check > 100ms → investigate query performance
- audit_view_tracking > 1M rows → purge old tracking data

---

## Success Criteria

**Feature Complete When:**
1. ✅ Can share page with specific user with permission
2. ✅ Can share page with group with permission
3. ✅ Can change user/group permission
4. ✅ Can remove user/group share
5. ✅ Can toggle visibility (private/area/space)
6. ✅ Changing to area/space clears specific shares
7. ✅ Access control enforces permissions correctly
8. ✅ Viewer permission makes editor read-only
9. ✅ All events logged to audit_events table
10. ✅ View events sampled (first per day per user)
11. ✅ Can query audit log with filters
12. ✅ Only admins can see audit log
13. ✅ Events purged after 1 year
14. ✅ UI matches area sharing patterns
15. ✅ Mobile-optimized
16. ✅ Accessibility compliant
17. ✅ Performance targets met
18. ✅ No regressions in existing page functionality

---

## Future Enhancements (Post-MVP)

### Priority 1: Comment System
- Thread-based comments on page content
- Resolve/unresolve workflow
- @mentions and notifications
- Commenter permission level
- Comment audit trail

### Priority 2: Advanced Audit
- Version comparison UI (text diff)
- Rollback to previous version
- Export audit log (CSV/PDF)
- Advanced filtering (date range, user, action)

### Priority 3: Real-Time Collaboration
- Operational Transform or CRDT
- Conflict detection on save
- Live cursors (see who's editing)
- Auto-merge non-conflicting edits

### Priority 4: Document Upgrade
- Apply same permission model to Documents
- Unify sharing UI (one modal for both)
- Cross-reference audit (page cites document)

---

## Appendix

### References

**Existing Implementations:**
- Area Sharing: `docs/area-sharing-ux.md` - UI patterns
- Document Sharing: `document-sharing-postgres.ts` - Visibility model
- Area Memberships: `area-memberships-postgres.ts` - Junction table pattern
- LLM Usage: `017-llm-usage.sql` - Event logging pattern

**Standards:**
- Google Docs Permissions - Industry standard UX
- SOC 2 Type II - Audit log requirements
- GDPR Article 30 - Processing records
- WCAG 2.1 AA - Accessibility compliance

### Document History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-13 | 1.0 | Initial architecture and implementation guide |

---

**This document provides complete specifications for implementing granular page sharing with permissions and audit logging. It can be implemented across multiple sessions while maintaining consistency and completeness.**
