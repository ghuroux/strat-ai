# Page Lifecycle & Context Integration

> **Status**: Specification
> **Created**: January 2026
> **Authors**: Gabriel Roux, Claude

## Overview

Pages evolve from rough drafts to finalized reference documents that become part of an Area's AI context. This specification defines the complete lifecycle, including status transitions, context integration, versioning, and access control.

### Goals

1. **Clear lifecycle progression**: Draft → Shared → Finalized
2. **Intentional context inclusion**: Only finalized pages can be added to AI context
3. **Version safety**: Edits to finalized pages create new versions
4. **Separation of concerns**: Status (editability) and context (AI knowledge) are independent
5. **Sound access control**: Clear rules for who can view, edit, and finalize

### Non-Goals

- Real-time collaborative editing (future consideration)
- Complex approval workflows (enterprise future)
- Cross-Area page linking (separate feature)

---

## Current State

### Existing Page Model

```typescript
interface Page {
  id: string;
  userId: string;          // Owner
  areaId: string;
  taskId?: string;

  title: string;
  content: TipTapContent;
  pageType: PageType;

  visibility: PageVisibility;  // 'private' | 'area' | 'space'
  sourceConversationId?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Version support exists in types but not fully implemented
interface PageVersion {
  id: string;
  pageId: string;
  content: TipTapContent;
  title: string;
  versionNumber: number;
  changeSummary?: string;
  createdBy: string;
  createdAt: Date;
}
```

### Current Context Mechanism

Areas have `contextDocumentIds: string[]` for uploaded documents. Pages are NOT currently included in AI context.

### Gaps

| Need | Current State |
|------|---------------|
| Page status | None (all pages are implicitly "draft") |
| Finalization/locking | None |
| Pages in context | Not supported |
| Version creation on edit | Types exist, not implemented |

---

## New Model

### Core Principle: Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWO INDEPENDENT ATTRIBUTES                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   STATUS (Lifecycle)              CONTEXT (AI Knowledge)        │
│   ──────────────────              ──────────────────────        │
│   • draft                         • inContext: boolean          │
│   • shared                          (independent toggle)        │
│   • finalized                                                   │
│                                                                 │
│   Controls: Editability           Controls: AI inclusion        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Updated Page Interface

```typescript
type PageStatus = 'draft' | 'shared' | 'finalized';

interface Page {
  // ... existing fields ...

  // NEW: Lifecycle status
  status: PageStatus;           // Default: 'draft'

  // NEW: Context integration
  inContext: boolean;           // Default: false

  // NEW: Finalization metadata
  finalizedAt?: Date;           // When status changed to 'finalized'
  finalizedBy?: string;         // User who finalized
  currentVersion?: number;      // Current version number (1, 2, 3...)

  // Existing (unchanged)
  visibility: PageVisibility;   // 'private' | 'area' | 'space'
}
```

### Database Changes

```sql
-- Add new columns to pages table
ALTER TABLE pages ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft';
ALTER TABLE pages ADD COLUMN in_context BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pages ADD COLUMN finalized_at TIMESTAMPTZ;
ALTER TABLE pages ADD COLUMN finalized_by UUID REFERENCES users(id);
ALTER TABLE pages ADD COLUMN current_version INTEGER DEFAULT 1;

-- Add constraint: only finalized pages can be in context
ALTER TABLE pages ADD CONSTRAINT chk_context_requires_finalized
  CHECK (in_context = false OR status = 'finalized');

-- Index for context queries
CREATE INDEX idx_pages_in_context ON pages(area_id, in_context)
  WHERE in_context = true AND deleted_at IS NULL;
```

### Area Context Update

```typescript
interface Area {
  // ... existing fields ...

  // Existing: uploaded documents
  contextDocumentIds?: string[];

  // NEW: finalized pages (computed or stored)
  // Option A: Query pages where areaId = X AND inContext = true
  // Option B: Store contextPageIds?: string[] (denormalized)
}
```

**Recommendation**: Use Option A (query-based) to avoid sync issues. The `idx_pages_in_context` index makes this efficient.

---

## Status Lifecycle

### State Machine

```
                         share()
         ┌─────────────────────────────────────┐
         │                                     │
         ▼                                     │
    ┌─────────┐    share()    ┌─────────┐    │    finalize()   ┌────────────┐
    │  DRAFT  │──────────────▶│ SHARED  │────┼────────────────▶│ FINALIZED  │
    └─────────┘               └─────────┘    │                 └────────────┘
         ▲                         │         │                       │
         │                         │         │                       │
         │         unshare()       │         │      unlock()         │
         └─────────────────────────┘         └───────────────────────┘
```

### Status Definitions

| Status | Editable | Can Share | Can Finalize | Can Add to Context |
|--------|----------|-----------|--------------|-------------------|
| `draft` | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| `shared` | ✅ Yes (owner) | ✅ Already shared | ✅ Yes | ❌ No |
| `finalized` | ❌ No (locked) | N/A | N/A | ✅ Yes |

### Transition Rules

```typescript
// Valid transitions
const VALID_TRANSITIONS: Record<PageStatus, PageStatus[]> = {
  'draft': ['shared', 'finalized'],
  'shared': ['draft', 'finalized'],
  'finalized': ['shared']  // Unlock goes to 'shared' to allow collaboration
};

function canTransition(from: PageStatus, to: PageStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
```

### Transition: Finalize

When a page is finalized:

1. Set `status = 'finalized'`
2. Set `finalizedAt = now()`
3. Set `finalizedBy = currentUserId`
4. Create a `PageVersion` snapshot
5. Set `currentVersion = versionNumber`
6. Optionally set `inContext = true` (user choice)

```typescript
async function finalizePage(
  pageId: string,
  userId: string,
  addToContext: boolean = true
): Promise<Page> {
  const page = await getPage(pageId);

  if (page.status === 'finalized') {
    throw new Error('Page is already finalized');
  }

  // Create version snapshot
  const version = await createPageVersion(page, userId);

  // Update page
  return await updatePage(pageId, {
    status: 'finalized',
    finalizedAt: new Date(),
    finalizedBy: userId,
    currentVersion: version.versionNumber,
    inContext: addToContext
  });
}
```

### Transition: Unlock (Edit Finalized Page)

When a user wants to edit a finalized page:

1. Set `status = 'shared'` (allows collaboration on changes)
2. Keep `inContext = true` (previous version stays in context)
3. Page becomes editable
4. On re-finalize: new version created, context updated

```typescript
async function unlockPage(pageId: string, userId: string): Promise<Page> {
  const page = await getPage(pageId);

  if (page.status !== 'finalized') {
    throw new Error('Only finalized pages can be unlocked');
  }

  if (page.userId !== userId) {
    throw new Error('Only the owner can unlock a page');
  }

  // Note: inContext stays true - AI still sees the last finalized version
  return await updatePage(pageId, {
    status: 'shared'
  });
}
```

---

## Context Integration

### Rule: Only Finalized Pages Can Be In Context

```typescript
function canAddToContext(page: Page): boolean {
  return page.status === 'finalized';
}

async function setPageInContext(
  pageId: string,
  inContext: boolean
): Promise<Page> {
  const page = await getPage(pageId);

  if (inContext && page.status !== 'finalized') {
    throw new Error('Only finalized pages can be added to context');
  }

  return await updatePage(pageId, { inContext });
}
```

### Context Loading for AI

```typescript
async function getAreaContext(areaId: string): Promise<AreaContext> {
  const area = await getArea(areaId);

  // Get uploaded documents (existing)
  const documents = await getDocumentsByIds(area.contextDocumentIds ?? []);

  // Get finalized pages in context (NEW)
  const pages = await getPagesInContext(areaId);

  return {
    notes: area.context,
    documents,
    pages  // NEW
  };
}

async function getPagesInContext(areaId: string): Promise<Page[]> {
  return await sql`
    SELECT * FROM pages
    WHERE area_id = ${areaId}
      AND in_context = true
      AND status = 'finalized'
      AND deleted_at IS NULL
    ORDER BY finalized_at DESC
  `;
}
```

### Context Removal

Removing a page from context has NO impact on the page itself:

```typescript
async function removePageFromContext(pageId: string): Promise<Page> {
  // Simply flip the flag - page remains finalized
  return await updatePage(pageId, { inContext: false });
}
```

The page:
- Stays `finalized` (locked)
- Keeps its version history
- Can be re-added to context at any time

---

## Versioning

### When Versions Are Created

| Action | Creates Version? |
|--------|-----------------|
| Finalize (draft/shared → finalized) | ✅ Yes |
| Re-finalize after editing | ✅ Yes (increments version) |
| Edit while in draft/shared | ❌ No (auto-save) |
| Restore previous version | ❌ No (sets content, then finalize creates version) |

### Version Storage

```typescript
interface PageVersion {
  id: string;
  pageId: string;
  versionNumber: number;      // 1, 2, 3, ...

  // Snapshot
  title: string;
  content: TipTapContent;
  contentText?: string;       // For search
  wordCount: number;

  // Metadata
  createdBy: string;
  createdAt: Date;
  changeSummary?: string;     // Optional description
}
```

### Version Operations

```typescript
// Create version (called during finalize)
async function createPageVersion(
  page: Page,
  userId: string,
  changeSummary?: string
): Promise<PageVersion> {
  const nextVersion = (page.currentVersion ?? 0) + 1;

  return await sql`
    INSERT INTO page_versions (
      id, page_id, version_number,
      title, content, content_text, word_count,
      created_by, change_summary
    ) VALUES (
      ${generateId('pv')}, ${page.id}, ${nextVersion},
      ${page.title}, ${page.content}, ${extractText(page.content)}, ${countWords(page.content)},
      ${userId}, ${changeSummary}
    )
    RETURNING *
  `;
}

// Get version history
async function getPageVersions(pageId: string): Promise<PageVersion[]> {
  return await sql`
    SELECT * FROM page_versions
    WHERE page_id = ${pageId}
    ORDER BY version_number DESC
  `;
}

// Restore version (copies content to page, user must re-finalize)
async function restoreVersion(
  pageId: string,
  versionNumber: number,
  userId: string
): Promise<Page> {
  const version = await getPageVersion(pageId, versionNumber);
  const page = await getPage(pageId);

  if (page.userId !== userId) {
    throw new Error('Only the owner can restore versions');
  }

  // Unlock if finalized
  const newStatus = page.status === 'finalized' ? 'shared' : page.status;

  return await updatePage(pageId, {
    title: version.title,
    content: version.content,
    status: newStatus
  });
}
```

---

## Access Control

### Permission Matrix

| Page Status | Visibility | Who Can View | Who Can Edit | Who Can Finalize/Unlock |
|-------------|------------|--------------|--------------|-------------------------|
| draft | private | Owner | Owner | Owner |
| draft | area | Area members | Owner | Owner |
| draft | space | Space members | Owner | Owner |
| shared | area | Area members | Owner | Owner |
| shared | space | Space members | Owner | Owner |
| finalized | area | Area members | — (locked) | Owner |
| finalized | space | Space members | — (locked) | Owner |

### Permission Checks

```typescript
interface PagePermissions {
  canView: boolean;
  canEdit: boolean;
  canFinalize: boolean;
  canUnlock: boolean;
  canAddToContext: boolean;
  canRemoveFromContext: boolean;
}

function getPagePermissions(
  page: Page,
  userId: string,
  userAreaRole: AreaRole,
  userSpaceRole: SpaceRole
): PagePermissions {
  const isOwner = page.userId === userId;

  // View permission
  const canView =
    isOwner ||
    (page.visibility === 'area' && userAreaRole !== null) ||
    (page.visibility === 'space' && userSpaceRole !== null);

  // Edit permission (only owner, only if not finalized)
  const canEdit = isOwner && page.status !== 'finalized';

  // Finalize/unlock (only owner)
  const canFinalize = isOwner && page.status !== 'finalized';
  const canUnlock = isOwner && page.status === 'finalized';

  // Context management (only owner, only if finalized)
  const canAddToContext = isOwner && page.status === 'finalized' && !page.inContext;
  const canRemoveFromContext = isOwner && page.inContext;

  return {
    canView,
    canEdit,
    canFinalize,
    canUnlock,
    canAddToContext,
    canRemoveFromContext
  };
}
```

### Future: Collaborative Editing

For V2, we may add per-page permissions:

```typescript
interface PageShare {
  pageId: string;
  userId: string;
  permission: 'viewer' | 'editor' | 'admin';
}
```

This would allow non-owners to edit shared pages. Not in scope for V1.

---

## User Experience

### Page Status Indicator

The page header shows current status with available actions:

**Draft:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📝 My Document                                  [Draft ▼] 💾   │
│  Status: Draft · Private · Auto-saving                          │
└─────────────────────────────────────────────────────────────────┘
```

**Shared:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📝 My Document                                 [Shared ▼] 💾   │
│  Status: Shared · Visible to Area · Auto-saving                 │
└─────────────────────────────────────────────────────────────────┘
```

**Finalized (In Context):**
```
┌─────────────────────────────────────────────────────────────────┐
│  📝 My Document                            [Finalized 🔒 ▼] 📋  │
├─────────────────────────────────────────────────────────────────┤
│  🔒 Finalized · v2 · 📚 In AI Context                           │
│  [Edit]  [Version History]  [Remove from Context]               │
└─────────────────────────────────────────────────────────────────┘
```

**Finalized (Not in Context):**
```
┌─────────────────────────────────────────────────────────────────┐
│  📝 My Document                            [Finalized 🔒 ▼] 📋  │
├─────────────────────────────────────────────────────────────────┤
│  🔒 Finalized · v1                                              │
│  [Edit]  [Version History]  [Add to Context]                    │
└─────────────────────────────────────────────────────────────────┘
```

### Status Dropdown Menu

```
┌──────────────────────────┐
│  Draft              ○    │
├──────────────────────────┤
│  Shared             ○    │
├──────────────────────────┤
│  Finalized          ●    │
│  └─ ☑️ Add to Context    │
└──────────────────────────┘
```

### Finalize Confirmation Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Finalize "Budget Allocation Strategy"?                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔒 This will lock the page. Edits will create a new version.   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑️  Add to Area AI context                               │   │
│  │     AI will reference this document in conversations     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancel]                              [Finalize]               │
└─────────────────────────────────────────────────────────────────┘
```

### Unlock Confirmation Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit Finalized Page?                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This page is currently finalized (v2) and in AI context.       │
│                                                                 │
│  Editing will:                                                  │
│  • Unlock the page for editing                                  │
│  • Keep v2 in AI context until you re-finalize                  │
│  • Save your changes as v3 when you finalize again              │
│                                                                 │
│  [Cancel]                              [Unlock & Edit]          │
└─────────────────────────────────────────────────────────────────┘
```

### Version History Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  Version History                                         [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  v2 (current) · Mar 15, 2026 · You                     [View]  │
│  └─ "Updated Q2 allocation percentages"                         │
│                                                                 │
│  v1 · Jan 26, 2026 · You                      [View] [Restore] │
│  └─ "Initial budget allocation"                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Context Bar Integration

The existing ContextBar should show pages in context:

```
┌─────────────────────────────────────────────────────────────────┐
│  📎 2 docs  │  📝 Notes  │  📄 3 pages  │  ✓ 5 tasks           │
└─────────────────────────────────────────────────────────────────┘
```

Clicking "3 pages" expands to show finalized pages in context.

---

## API Endpoints

### Page Status Operations

```typescript
// Finalize a page
POST /api/pages/{id}/finalize
Body: { addToContext?: boolean, changeSummary?: string }
Response: Page

// Unlock a page (for editing)
POST /api/pages/{id}/unlock
Response: Page

// Update context inclusion
PATCH /api/pages/{id}/context
Body: { inContext: boolean }
Response: Page
```

### Version Operations

```typescript
// Get version history
GET /api/pages/{id}/versions
Response: PageVersion[]

// Get specific version
GET /api/pages/{id}/versions/{versionNumber}
Response: PageVersion

// Restore version (unlocks page, sets content)
POST /api/pages/{id}/versions/{versionNumber}/restore
Response: Page
```

---

## Implementation Phases

### Phase 1: Foundation (MVP)

**Goal**: Basic status lifecycle and finalization

- [ ] Add `status`, `finalized_at`, `finalized_by`, `current_version` columns
- [ ] Update Page types and repository
- [ ] Implement status transitions (draft ↔ shared ↔ finalized)
- [ ] Implement `finalizePage()` and `unlockPage()`
- [ ] Add status indicator to PageHeader
- [ ] Add finalize/unlock confirmation modals
- [ ] Implement basic version creation on finalize

### Phase 2: Context Integration

**Goal**: Pages can be part of Area AI context

- [ ] Add `in_context` column with constraint
- [ ] Update context loading to include pages
- [ ] Add "Add to Context" / "Remove from Context" actions
- [ ] Update ContextBar to show pages
- [ ] Update prompt builder to include page content

### Phase 3: Version Management

**Goal**: Full version history with restore

- [ ] Implement `page_versions` table
- [ ] Version history panel in PageEditor
- [ ] View historical versions (read-only)
- [ ] Restore version functionality
- [ ] Change summary on finalize

### Phase 4: Polish

**Goal**: Refined UX and edge cases

- [ ] Status dropdown with visual states
- [ ] "Editing v1" indicator while unlocked
- [ ] Discard changes option (revert to last finalized)
- [ ] Bulk context management in ContextPanel
- [ ] Search across finalized pages

---

## Open Questions

1. **Should shared (non-finalized) pages ever be in context?**
   - Current answer: No - ensures quality/intentionality
   - Could reconsider for "working documents" use case

2. **Maximum pages in context per Area?**
   - Token budget consideration
   - May need limits or warnings

3. **What happens to context when page is deleted?**
   - Soft delete: keep in context until hard delete?
   - Or: automatically remove from context on any delete?

4. **Version retention policy?**
   - Keep all versions forever?
   - Limit to N versions?
   - Enterprise compliance considerations

---

## Related Documents

- `docs/features/CONTEXT_TRANSPARENCY.md` - How context is shown to users
- `docs/CONTEXT_STRATEGY.md` - Overall context architecture
- `src/lib/types/page.ts` - Page type definitions
- `src/lib/server/persistence/pages-postgres.ts` - Page repository

---

*Last Updated: January 2026*
