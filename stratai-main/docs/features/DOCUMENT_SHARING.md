# Document Sharing System - Implementation Specification

> **Status:** Approved for Implementation
> **Created:** 2026-01-12
> **Last Updated:** 2026-01-12
> **Related Documents:**
> - `ENTITY_MODEL.md` Section 7.5 - Schema definitions
> - `DOCUMENT_SYSTEM.md` - Pages system (different from Documents)
> - `CONTEXT_STRATEGY.md` - How documents feed AI context

---

## Executive Summary

### The Problem

Without a proper sharing model:
- Users upload same document multiple times across Areas (duplication)
- Documents shared via Slack/Teams get uploaded separately (version drift)
- Sharing to entire Space creates noise for irrelevant Areas
- No way to work privately on a document before sharing

### The Solution

**Documents are stored at Space-level (deduplication) but shared at Area-level (precision).**

```
Document: api-spec.pdf
├── Storage: Space (single copy, canonical location)
├── Visibility: 'areas'
├── Shared with: [API Design, Mobile App]
│
├── API Design members: ✅ See it, can activate
├── Mobile App members: ✅ See it, can activate
├── Marketing members: ❌ Don't see it (no noise)
```

### Key Distinction: Documents vs Pages

| Aspect | Documents | Pages |
|--------|-----------|-------|
| What | Uploaded files (PDFs, specs) | Created content (meeting notes) |
| Storage | Space-level | Area-level |
| Sharing | Area-granular (this spec) | Within Area (private/shared) |
| Purpose | External context brought IN | Internal content created WITHIN |

---

## Table of Contents

1. [Mental Model](#1-mental-model)
2. [Database Schema](#2-database-schema)
3. [Access Control Rules](#3-access-control-rules)
4. [UX Flows](#4-ux-flows)
5. [Implementation Phases](#5-implementation-phases)
6. [V2: Cross-Space References](#6-v2-cross-space-references)
7. [Test Summary](#7-test-summary)

---

## 1. Mental Model

### Storage vs Sharing vs Activation

Three distinct concepts that work together:

```
┌─────────────────────────────────────────────────────────────────┐
│                         DOCUMENT LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. STORAGE (Where it lives)                                    │
│     └── Always Space-level                                      │
│     └── Single copy, no duplication                             │
│     └── Canonical location for updates                          │
│                                                                  │
│  2. SHARING (Who can see it)                                    │
│     └── Private: Only uploader                                  │
│     └── Areas: Specific Areas (granular)                        │
│     └── Space: Everyone in Space (rare)                         │
│                                                                  │
│  3. ACTIVATION (AI context)                                     │
│     └── Per-Area configuration                                  │
│     └── contextDocumentIds array on Area                        │
│     └── Only shared documents can be activated                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Visibility Escalation Path

```
PRIVATE (only me)
    │
    ├─► Share with Area A
    ├─► Share with Area B
    │
    ▼
AREAS (specific Areas)
    │
    ├─► Add more Areas
    ├─► Remove Areas
    │
    ▼
SPACE (everyone)
    │
    ▼
Can de-escalate back down
```

### Upload Context Defaults

| Upload From | Default Visibility | UX Behavior |
|-------------|-------------------|-------------|
| Space view | `private` | No prompt, user shares later |
| Area view | `private` | Prompt: "Share with [Area] members?" |

---

## 2. Database Schema

> **Important:** This section shows changes to the **current** schema (`documents-schema.sql`), not the target enterprise schema in ENTITY_MODEL.md. A future migration will reconcile these.

### 2.0 Current Schema Reference

The existing documents table has these key fields that must be preserved:

```sql
-- EXISTING fields (do not modify)
id TEXT PRIMARY KEY,              -- Current ID format
user_id TEXT NOT NULL,            -- Owner
space_id TEXT,                    -- Space location
filename TEXT NOT NULL,           -- Original filename
mime_type TEXT NOT NULL,          -- MIME type
file_size INTEGER NOT NULL,
char_count INTEGER NOT NULL,
content TEXT NOT NULL,            -- Extracted text for AI
content_hash TEXT NOT NULL,       -- SHA256 for deduplication
summary TEXT,                     -- AI-generated summary (CRITICAL for context)
truncated BOOLEAN DEFAULT FALSE,
```

### 2.0.1 Summarization Pipeline (MUST PRESERVE)

The summarization flow is **critical infrastructure** for AI context:

```
Upload → Extract Text → Store Document → generateSummaryBackground()
                                                    ↓
                                         Haiku generates ~200 token summary
                                                    ↓
                                         postgresDocumentRepository.update()
                                                    ↓
                                    summary field populated, ready for context
```

**Key files:**
- `src/lib/server/summarization.ts` - Background and on-demand summarization
- `src/lib/server/litellm.ts` - `generateDocumentSummary()` function
- `src/lib/server/persistence/documents-postgres.ts` - Repository with update()

**The document sharing changes MUST NOT break this flow:**
- Upload still triggers `generateSummaryBackground()`
- `summary` field remains accessible
- Visibility changes don't affect stored content/summary

### 2.1 Documents Table (Add Visibility Column)

The migration adds ONE new column to the existing table:

```sql
-- Add visibility column to existing documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS
    visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'areas', 'space'));

-- Index for visibility filtering
CREATE INDEX IF NOT EXISTS idx_documents_visibility
    ON documents(visibility)
    WHERE deleted_at IS NULL;

-- Index for duplicate detection by filename within space
CREATE INDEX IF NOT EXISTS idx_documents_filename_space
    ON documents(space_id, filename)
    WHERE deleted_at IS NULL;
```

**Note:** All existing documents will default to `visibility = 'private'` (safe default).

### 2.2 Document Area Shares Table (New)

```sql
-- Area-level document sharing
-- Note: Uses TEXT IDs to match current schema (not UUID)
CREATE TABLE IF NOT EXISTS document_area_shares (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    area_id TEXT NOT NULL REFERENCES focus_areas(id) ON DELETE CASCADE,

    -- Attribution
    shared_by TEXT NOT NULL,  -- User ID who shared
    shared_at TIMESTAMPTZ DEFAULT NOW(),

    -- Notification tracking
    notifications_sent BOOLEAN DEFAULT FALSE,

    UNIQUE(document_id, area_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_shares_document ON document_area_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_shares_area ON document_area_shares(area_id);
CREATE INDEX IF NOT EXISTS idx_doc_shares_shared_by ON document_area_shares(shared_by);
```

**Note:** The table references `focus_areas` (current table name) not `areas`.

### 2.3 Document References Table (V2 - Cross-Space)

```sql
-- Cross-Space document references (V2 feature)
CREATE TABLE document_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,

    -- Attribution
    added_by UUID NOT NULL REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(document_id, target_space_id)
);

-- Indexes
CREATE INDEX idx_doc_refs_document ON document_references(document_id);
CREATE INDEX idx_doc_refs_target_space ON document_references(target_space_id);
```

### 2.4 Chunks JSONB Structure

```json
[
  {
    "index": 0,
    "content": "chunk text content...",
    "embedding": [0.1, 0.2, ...],
    "token_count": 512,
    "start_char": 0,
    "end_char": 2048
  }
]
```

---

## 3. Access Control Rules

### 3.1 CanSeeDocument

```typescript
/**
 * Determines if a user can see a document in lists and search results.
 *
 * @returns true if user can see the document
 */
function CanSeeDocument(userId: string, document: Document): boolean {
    // Owner always sees their documents
    if (document.uploadedBy === userId) {
        return true;
    }

    // Check visibility level
    switch (document.visibility) {
        case 'private':
            // Only owner (handled above)
            return false;

        case 'space':
            // Anyone with Space access
            return CanAccessSpace(userId, document.spaceId);

        case 'areas':
            // Must have access to at least one shared Area
            const sharedAreaIds = getDocumentSharedAreaIds(document.id);
            const userAreaIds = getUserAccessibleAreaIds(userId, document.spaceId);
            return sharedAreaIds.some(areaId => userAreaIds.includes(areaId));

        default:
            return false;
    }
}
```

### 3.2 CanShareDocument

```typescript
/**
 * Determines if a user can modify sharing settings for a document.
 *
 * @returns true if user can share/unshare the document
 */
function CanShareDocument(userId: string, document: Document): boolean {
    // Owner can always share
    if (document.uploadedBy === userId) {
        return true;
    }

    // Space admins/owners can share any document in their Space
    const spaceRole = getUserSpaceRole(userId, document.spaceId);
    return spaceRole === 'admin' || spaceRole === 'owner';
}
```

### 3.3 CanActivateDocumentForArea

```typescript
/**
 * Determines if a user can activate a document for a specific Area's AI context.
 *
 * @returns true if user can add document to Area's contextDocumentIds
 */
function CanActivateDocumentForArea(
    userId: string,
    document: Document,
    areaId: string
): boolean {
    // Must be able to see the document
    if (!CanSeeDocument(userId, document)) {
        return false;
    }

    // Must have access to the Area
    if (!CanAccessArea(userId, areaId)) {
        return false;
    }

    // Document must be shared with this Area (or Space-wide)
    if (document.visibility === 'space') {
        return true;
    }

    if (document.visibility === 'areas') {
        const sharedAreaIds = getDocumentSharedAreaIds(document.id);
        return sharedAreaIds.includes(areaId);
    }

    // Private documents can only be activated by owner in their own Areas
    if (document.visibility === 'private') {
        return document.uploadedBy === userId;
    }

    return false;
}
```

### 3.4 CanDeleteDocument

```typescript
/**
 * Determines if a user can delete a document.
 *
 * @returns true if user can delete the document
 */
function CanDeleteDocument(userId: string, document: Document): boolean {
    // Owner can always delete
    if (document.uploadedBy === userId) {
        return true;
    }

    // Space admins/owners can delete any document
    const spaceRole = getUserSpaceRole(userId, document.spaceId);
    return spaceRole === 'admin' || spaceRole === 'owner';
}
```

### 3.5 Access Resolution Summary

| Action | Who Can Do It |
|--------|--------------|
| **See document** | Owner, OR (visibility=space AND Space access), OR (visibility=areas AND access to shared Area) |
| **Download** | Anyone who can see it |
| **Share/Unshare** | Owner OR Space admin/owner |
| **Delete** | Owner OR Space admin/owner |
| **Activate for Area** | Can see AND Area access AND (doc shared with Area OR owner) |
| **Update content** | Owner OR Space admin/owner |

---

## 4. UX Flows

### 4.1 Upload Flow

#### From Space View

```
┌─────────────────────────────────────────────────────────────────┐
│  Space: Stratech Loyalty                                         │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  [+ Upload Document]                                             │
│                                                                  │
│  Click → File picker → Upload                                    │
│  → Document created with visibility = 'private'                  │
│  → Appears in "My Documents" section                             │
│  → Toast: "Document uploaded. Share it when ready."              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### From Area View

```
┌─────────────────────────────────────────────────────────────────┐
│  Area: API Design                                                │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  [+ Upload Document]                                             │
│                                                                  │
│  Click → File picker → Upload → Prompt appears:                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Share with API Design?                                  │    │
│  │                                                          │    │
│  │  "api-spec.pdf" will be visible to all 5 members        │    │
│  │  of this Area.                                           │    │
│  │                                                          │    │
│  │  [Keep Private]  [Share with Area]                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  "Keep Private" → visibility = 'private'                         │
│  "Share with Area" → visibility = 'areas', share entry created   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Share Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Share "api-spec.pdf"                                       [×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Currently: Private (only you)                                   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  Share with:                                                     │
│                                                                  │
│  ☐ Entire Space (all 28 members)                                │
│                                                                  │
│  ─── Or select specific Areas ───                               │
│                                                                  │
│  ☑ API Design (5 members)                     ← already shared  │
│  ☑ Mobile App (4 members)                     ← checking now    │
│  ☐ Marketing (8 members)                                        │
│  ☐ Legal Review (3 members)                                     │
│  ☐ Backend Services (6 members)                                 │
│  ☐ QA Testing (2 members)                                       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ☑ Notify members when shared                                   │
│                                                                  │
│                              [Cancel]  [Save Changes]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Checking "Entire Space" unchecks all individual Areas, sets visibility='space'
- Checking any Area unchecks "Entire Space", sets visibility='areas'
- Unchecking all Areas sets visibility='private'
- "Notify members" sends notification to newly added Areas only

### 4.3 Document List Views

#### Space-Level Document View

```
┌─────────────────────────────────────────────────────────────────┐
│  Space: Stratech Loyalty > Documents                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [+ Upload]  [Filter ▾]  [Search...]                            │
│                                                                  │
│  ─── My Documents (3) ──────────────────────────────────────    │
│                                                                  │
│  📄 api-spec-draft.pdf                              Private 🔒  │
│     Uploaded Jan 12 • 2.4 MB                         [Share]    │
│                                                                  │
│  📄 auth-flow-diagram.pdf            Shared: API Design, Mobile │
│     Uploaded Jan 10 • 1.1 MB                   [Manage Sharing] │
│                                                                  │
│  📄 brand-assets.zip                           Shared: Space ✓  │
│     Uploaded Jan 8 • 15.2 MB                   [Manage Sharing] │
│                                                                  │
│  ─── Shared with Me (5) ────────────────────────────────────    │
│                                                                  │
│  📄 competitor-analysis.pdf                     from Sarah Chen  │
│     Shared with: API Design, Marketing             [Download]   │
│                                                                  │
│  📄 q1-roadmap.pdf                              from Mike Jones  │
│     Shared with: Entire Space                      [Download]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Area-Level Document View

```
┌─────────────────────────────────────────────────────────────────┐
│  Area: API Design > Documents                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [+ Upload]  [Search...]                                        │
│                                                                  │
│  ─── Available for Context ─────────────────────────────────    │
│                                                                  │
│  Documents shared with this Area that can be activated for AI   │
│                                                                  │
│  ☑ api-spec.pdf                                    ← Activated  │
│     2.4 MB • Uploaded by you                                    │
│                                                                  │
│  ☐ competitor-analysis.pdf                         ← Available  │
│     1.8 MB • Shared by Sarah Chen                               │
│                                                                  │
│  ☑ brand-guidelines.pdf                            ← Activated  │
│     5.1 MB • Shared by Mike Jones (Space-wide)                  │
│                                                                  │
│  ─── My Private Documents ──────────────────────────────────    │
│                                                                  │
│  📄 api-spec-draft-v2.pdf                          Private 🔒   │
│     Working draft, not shared yet                    [Share]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Unshare Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Unshare from API Design?                                   [×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  "api-spec.pdf" will no longer be visible to API Design         │
│  members (except you).                                           │
│                                                                  │
│  ⚠️  This document is currently activated for AI context in     │
│     API Design. It will be automatically deactivated.           │
│                                                                  │
│  Affected users: 4 members                                       │
│                                                                  │
│                              [Cancel]  [Unshare]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Warns about activation status
- Auto-deactivates document from Area's contextDocumentIds
- Does NOT notify affected users (silent removal to avoid noise)

### 4.5 Duplicate Detection

```
┌─────────────────────────────────────────────────────────────────┐
│  Document already exists                                    [×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  A document named "api-spec.pdf" already exists in this Space.  │
│                                                                  │
│  📄 api-spec.pdf                                                │
│     Uploaded by Sarah Chen on Jan 10                            │
│     Shared with: API Design, Mobile App                         │
│                                                                  │
│  Would you like to:                                              │
│                                                                  │
│  [Use Existing]     Request access or activate the existing doc │
│  [Upload Anyway]    Upload as "api-spec (2).pdf"                │
│  [Cancel]                                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Phases

### Phase 1: Schema Migration

**Scope:** Database schema changes only

**Files to Create/Modify:**
```
src/lib/server/persistence/migrations/
└── 024-document-sharing.sql
```

**Migration SQL:**
```sql
-- 024-document-sharing.sql
-- Document Sharing: Add visibility and area-level sharing

-- ============================================================
-- ADD VISIBILITY TO DOCUMENTS
-- ============================================================

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

-- Add check constraint separately (safer for existing data)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documents_visibility_check'
    ) THEN
        ALTER TABLE documents
        ADD CONSTRAINT documents_visibility_check
        CHECK (visibility IN ('private', 'areas', 'space'));
    END IF;
END $$;

-- ============================================================
-- CREATE DOCUMENT_AREA_SHARES TABLE
-- Note: Uses TEXT IDs to match current schema
-- ============================================================

CREATE TABLE IF NOT EXISTS document_area_shares (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    area_id TEXT NOT NULL REFERENCES focus_areas(id) ON DELETE CASCADE,
    shared_by TEXT NOT NULL,
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    notifications_sent BOOLEAN DEFAULT FALSE,
    UNIQUE(document_id, area_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_doc_shares_document ON document_area_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_shares_area ON document_area_shares(area_id);
CREATE INDEX IF NOT EXISTS idx_doc_shares_shared_by ON document_area_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_filename_space ON documents(space_id, filename) WHERE deleted_at IS NULL;

-- ============================================================
-- MIGRATE EXISTING DATA
-- Documents already activated somewhere become 'space' visibility
-- (Preserves existing behavior - users can refine later)
-- ============================================================

-- Note: This checks if any focus_area has this document in context_document_ids
-- Using TEXT array comparison since IDs are TEXT
UPDATE documents d SET visibility = 'space'
WHERE d.visibility = 'private'
AND d.deleted_at IS NULL
AND EXISTS (
    SELECT 1 FROM focus_areas fa
    WHERE fa.space_id = d.space_id
    AND fa.deleted_at IS NULL
    AND d.id = ANY(fa.context_document_ids)
);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON COLUMN documents.visibility IS 'Access scope: private (owner only), areas (specific areas), space (all space members)';
COMMENT ON TABLE document_area_shares IS 'Junction table for area-level document sharing when visibility=areas';
```

**Acceptance Tests:**
```
[ ] Migration runs without errors on fresh database
[ ] Migration runs without errors on database with existing documents
[ ] documents.visibility column exists with correct CHECK constraint
[ ] document_area_shares table exists with correct schema
[ ] All indexes are created
[ ] Existing documents default to visibility='private'
[ ] Documents with existing activations migrate to visibility='space'
[ ] CRITICAL: Existing document summaries are preserved (check summary column)
[ ] CRITICAL: Upload + summarization flow still works after migration
[ ] New documents created after migration default to visibility='private'
```

**Summarization Verification (CRITICAL):**
```bash
# After migration, verify summarization still works:
# 1. Upload a document > 500 chars
# 2. Check logs for "[Summarization] Starting background summary..."
# 3. Verify summary field is populated in database
# 4. Verify document appears in context when activated
```

---

### Phase 2: Repository Layer

**Scope:** Data access functions for document sharing

**Files to Create:**
```
src/lib/server/persistence/
└── document-sharing-postgres.ts
```

**Files to Modify:**
```
src/lib/server/persistence/
└── documents-postgres.ts (add visibility filtering)
```

**document-sharing-postgres.ts:**
```typescript
// Key functions to implement:

// Share document with an Area
export async function shareDocumentWithArea(
    documentId: string,
    areaId: string,
    sharedBy: string
): Promise<DocumentAreaShare>

// Unshare document from an Area
export async function unshareDocumentFromArea(
    documentId: string,
    areaId: string
): Promise<void>

// Get all Areas a document is shared with
export async function getDocumentSharedAreas(
    documentId: string
): Promise<Area[]>

// Get all documents shared with an Area
export async function getDocumentsSharedWithArea(
    areaId: string
): Promise<Document[]>

// Update document visibility
export async function updateDocumentVisibility(
    documentId: string,
    visibility: 'private' | 'areas' | 'space'
): Promise<Document>

// Bulk share with multiple Areas
export async function shareDocumentWithAreas(
    documentId: string,
    areaIds: string[],
    sharedBy: string
): Promise<DocumentAreaShare[]>

// Get documents visible to user in Space
export async function getVisibleDocuments(
    userId: string,
    spaceId: string,
    options?: {
        areaId?: string;      // Filter to specific Area
        uploadedBy?: string;  // Filter to specific uploader
        visibility?: string;  // Filter by visibility
    }
): Promise<Document[]>
```

**Acceptance Tests:**
```
[ ] shareDocumentWithArea creates entry correctly
[ ] shareDocumentWithArea is idempotent (no duplicate entries)
[ ] unshareDocumentFromArea removes entry
[ ] unshareDocumentFromArea handles non-existent share gracefully
[ ] getDocumentSharedAreas returns correct Areas
[ ] getDocumentsSharedWithArea returns correct documents
[ ] updateDocumentVisibility updates correctly
[ ] updateDocumentVisibility clears shares when set to 'private' or 'space'
[ ] getVisibleDocuments returns owner's documents regardless of visibility
[ ] getVisibleDocuments returns 'space' visibility docs for Space members
[ ] getVisibleDocuments returns 'areas' visibility docs only for shared Area members
[ ] getVisibleDocuments filters correctly by areaId, uploadedBy, visibility
```

---

### Phase 3: API Endpoints

**Scope:** REST API for document sharing operations

**Files to Create:**
```
src/routes/api/documents/[id]/share/
└── +server.ts
```

**Files to Modify:**
```
src/routes/api/documents/
├── +server.ts (add visibility filtering to list)
└── [id]/+server.ts (add visibility to response)
```

**Endpoints:**

```typescript
// GET /api/documents?spaceId=X&areaId=Y
// Returns documents visible to current user
// Filters by Space, optionally by Area

// GET /api/documents/[id]
// Returns document with sharing info (sharedAreas, visibility)

// POST /api/documents/[id]/share
// Body: { areaIds: string[], visibility: 'private' | 'areas' | 'space', notify: boolean }
// Updates sharing settings

// DELETE /api/documents/[id]/share/[areaId]
// Unshares document from specific Area
```

**Acceptance Tests:**
```
[ ] GET /api/documents returns only visible documents
[ ] GET /api/documents with areaId filters to Area-shared docs
[ ] GET /api/documents includes visibility and sharedAreas in response
[ ] POST /api/documents/[id]/share requires owner or Space admin
[ ] POST /api/documents/[id]/share with areaIds sets visibility='areas'
[ ] POST /api/documents/[id]/share with empty areaIds sets visibility='private'
[ ] POST /api/documents/[id]/share with visibility='space' clears areaIds
[ ] DELETE /api/documents/[id]/share/[areaId] removes share entry
[ ] DELETE /api/documents/[id]/share/[areaId] returns 403 for non-owner/non-admin
[ ] All endpoints return 404 for documents user cannot see
```

---

### Phase 4: Upload UX

**Scope:** Context-aware upload with sharing prompt

**Files to Modify:**
```
src/lib/components/documents/
├── DocumentUpload.svelte (or create new)
└── UploadSharePrompt.svelte (create new)

src/routes/spaces/[space]/
└── +page.svelte (Space-level upload button)

src/routes/spaces/[space]/[area]/
└── +page.svelte (Area-level upload button)
```

**Components:**

```svelte
<!-- UploadSharePrompt.svelte -->
<!-- Modal shown after upload in Area context -->
<script>
    export let document: Document;
    export let area: Area;
    export let onKeepPrivate: () => void;
    export let onShareWithArea: () => void;
</script>

<!-- UI as specified in Section 4.1 -->
```

**Acceptance Tests:**
```
[ ] Upload from Space view creates document with visibility='private'
[ ] Upload from Space view shows success toast without share prompt
[ ] Upload from Area view creates document with visibility='private' initially
[ ] Upload from Area view shows share prompt modal
[ ] "Keep Private" in prompt leaves visibility='private'
[ ] "Share with Area" in prompt sets visibility='areas' and creates share entry
[ ] Upload detects existing document with same name (case-insensitive)
[ ] Duplicate detection modal shows existing document info
[ ] "Use Existing" option navigates to existing document
[ ] "Upload Anyway" creates document with "(2)" suffix
```

---

### Phase 5: Share Modal

**Scope:** Full sharing management UI

**Files to Create:**
```
src/lib/components/documents/
└── ShareDocumentModal.svelte
```

**Files to Modify:**
```
src/lib/components/documents/
└── DocumentCard.svelte (add Share button)
└── DocumentList.svelte (integrate modal)
```

**Component Props:**
```typescript
interface ShareDocumentModalProps {
    document: Document;
    areas: Area[];  // All Areas in Space
    sharedAreaIds: string[];  // Currently shared
    onSave: (settings: ShareSettings) => Promise<void>;
    onClose: () => void;
}

interface ShareSettings {
    visibility: 'private' | 'areas' | 'space';
    areaIds: string[];
    notify: boolean;
}
```

**Acceptance Tests:**
```
[ ] Modal shows current visibility state
[ ] Modal lists all Areas in Space with member counts
[ ] Already-shared Areas are pre-checked
[ ] Checking "Entire Space" unchecks all Area checkboxes
[ ] Checking any Area unchecks "Entire Space"
[ ] Unchecking all Areas shows "Will become private" warning
[ ] Save with Areas checked sets visibility='areas'
[ ] Save with "Entire Space" checked sets visibility='space'
[ ] Save with nothing checked sets visibility='private'
[ ] "Notify members" checkbox is checked by default
[ ] Notifications only sent for newly added Areas (not already-shared)
[ ] Cancel closes modal without changes
[ ] Modal shows loading state during save
[ ] Error handling shows toast on failure
```

---

### Phase 6: Document List Views

**Scope:** Space-level and Area-level document browsing

**Files to Modify:**
```
src/routes/spaces/[space]/documents/
├── +page.svelte (Space document list)
└── +page.server.ts

src/routes/spaces/[space]/[area]/
├── +page.svelte (Area view with documents section)
└── +page.server.ts
```

**Space Document List Features:**
- "My Documents" section (uploaded by current user)
- "Shared with Me" section (shared with any of my Areas)
- Visibility badges (Private, Shared: X Areas, Space)
- Filter by visibility, search by name
- Share button on owned documents

**Area Document List Features:**
- "Available for Context" section (can be activated)
- Activation checkboxes (toggle contextDocumentIds)
- "My Private Documents" section (owned, not yet shared)
- Share button to quickly share with current Area

**Acceptance Tests:**
```
[ ] Space view shows "My Documents" section with owned docs
[ ] Space view shows "Shared with Me" section with visible docs
[ ] Space view shows correct visibility badges
[ ] Space view Share button opens ShareDocumentModal
[ ] Space view filters work (visibility, search)
[ ] Area view shows "Available for Context" with activatable docs
[ ] Area view activation checkbox toggles contextDocumentIds
[ ] Area view shows activation state correctly
[ ] Area view shows "My Private Documents" section
[ ] Area view Quick Share button shares with current Area
[ ] Both views handle empty states gracefully
[ ] Both views show loading states
```

---

### Phase 7: Activation Integration

**Scope:** Connect document visibility to activation logic

**Files to Modify:**
```
src/lib/server/persistence/
└── areas-postgres.ts (activation validation)

src/routes/api/areas/[id]/context/
└── +server.ts (validate activation requests)
```

**Logic Changes:**
- When activating a document, verify it's shared with that Area (or visibility='space')
- When unsharing from an Area, auto-deactivate if currently in contextDocumentIds
- When setting visibility='private', deactivate from all Areas

**Acceptance Tests:**
```
[ ] Cannot activate private document (not owned) for any Area
[ ] Can activate private document (owned) for own Areas
[ ] Can activate 'areas' visibility document only for shared Areas
[ ] Can activate 'space' visibility document for any Area in Space
[ ] Unsharing auto-removes document from Area's contextDocumentIds
[ ] Setting visibility='private' removes from all contextDocumentIds
[ ] Setting visibility='space' doesn't affect existing activations
[ ] API returns 400 when trying to activate non-visible document
```

---

### Phase 8: Polish & Edge Cases

**Scope:** Final polish, edge cases, notifications

**Features:**
- Notification when document shared with your Area
- Ownership transfer (when owner leaves org)
- "Copy to My Space" action (V1 version)
- Bulk operations (share/unshare multiple docs)

**Files to Create:**
```
src/lib/components/documents/
└── CopyToSpaceModal.svelte
```

**Acceptance Tests:**
```
[ ] Notification appears when document shared with your Area
[ ] Notifications are batched (not one per document)
[ ] Notification links to document
[ ] Owner can transfer ownership to another Space member
[ ] Space admin can transfer ownership of any document
[ ] "Copy to My Space" creates duplicate in personal Space
[ ] Copied document is independent (no sync)
[ ] Bulk share works for multiple documents
[ ] Bulk unshare works for multiple documents
[ ] All error states handled gracefully
[ ] Loading states throughout
```

---

## 6. V2: Cross-Space References

> **Note:** This section is for future implementation. V1 uses "Copy to My Space" which creates a duplicate.

### 6.1 Reference Model

Instead of copying, create a reference:

```
Document: api-spec.pdf
├── Canonical location: Space A
├── References from: Space B, Space C
│
├── Update in Space A → Space B and C see update
├── Delete in Space A → References become orphaned (handled gracefully)
```

### 6.2 Schema (Already Defined Above)

```sql
CREATE TABLE document_references (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    target_space_id UUID REFERENCES spaces(id),
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ
);
```

### 6.3 UX: "Add to My Space"

```
┌─────────────────────────────────────────────────────────────────┐
│  Add to Space                                               [×] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Add "api-spec.pdf" to another Space as a reference.            │
│                                                                  │
│  The document will stay in "Stratech Loyalty" but appear        │
│  in your selected Space. Updates sync automatically.            │
│                                                                  │
│  Select Space:                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ▼ My Personal Space                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                              [Cancel]  [Add Reference]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 V2 Acceptance Tests

```
[ ] "Add to My Space" creates reference, not copy
[ ] Referenced document appears in target Space document list
[ ] Referenced document shows "Referenced from: [Source Space]" badge
[ ] Updates to original reflect in all references
[ ] Deleting original marks references as orphaned
[ ] Orphaned references show "Source deleted" state
[ ] Can remove reference without affecting original
[ ] Cannot edit referenced document from target Space
[ ] Can activate referenced document in target Space Areas
```

---

## 7. Test Summary

### Unit Tests

| Component | Test Count | Coverage |
|-----------|------------|----------|
| document-sharing-postgres.ts | 12 | CRUD, visibility filtering |
| Access control functions | 8 | CanSee, CanShare, CanActivate, CanDelete |
| API endpoints | 10 | All endpoints with auth |

### Integration Tests

| Flow | Test Count |
|------|------------|
| Upload → Share → Activate | 3 |
| Share → Unshare → Auto-deactivate | 2 |
| Visibility changes | 4 |
| Duplicate detection | 2 |

### E2E Scenarios

```
Scenario 1: New Document Workflow
  Given I am in Area "API Design"
  When I upload "api-spec.pdf"
  Then I see the share prompt
  When I click "Share with Area"
  Then the document is visible to Area members
  And I can activate it for AI context

Scenario 2: Gradual Sharing
  Given I have a private document
  When I share it with "API Design"
  Then only API Design members see it
  When I add "Mobile App" to sharing
  Then both Areas see it
  When I select "Entire Space"
  Then all Space members see it

Scenario 3: Unshare with Active Document
  Given a document is shared with "API Design"
  And it is activated for AI context
  When I unshare from "API Design"
  Then I see the deactivation warning
  When I confirm
  Then the document is removed from contextDocumentIds
  And Area members no longer see it

Scenario 4: Cross-User Collaboration
  Given Sarah uploads "competitor-analysis.pdf"
  And shares it with "Marketing" and "API Design"
  When I (member of API Design) view Area documents
  Then I see Sarah's document
  And I can activate it for AI context
  But I cannot modify sharing settings
```

---

## Appendix: File Index

### Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `migrations/024-document-sharing.sql` | 1 | Schema migration |
| `document-sharing-postgres.ts` | 2 | Repository layer |
| `api/documents/[id]/share/+server.ts` | 3 | Share API endpoint |
| `UploadSharePrompt.svelte` | 4 | Upload context prompt |
| `ShareDocumentModal.svelte` | 5 | Full share management |
| `CopyToSpaceModal.svelte` | 8 | V1 cross-space copy |

### Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `documents-postgres.ts` | 2 | Add visibility filtering |
| `api/documents/+server.ts` | 3 | Visibility in list response |
| `api/documents/[id]/+server.ts` | 3 | Sharing info in response |
| `DocumentCard.svelte` | 5 | Share button |
| `DocumentList.svelte` | 5, 6 | Integrate modal, sections |
| `spaces/[space]/documents/+page.svelte` | 6 | Space document view |
| `spaces/[space]/[area]/+page.svelte` | 6 | Area document section |
| `areas-postgres.ts` | 7 | Activation validation |

---

*This document should be the single source of truth for Document Sharing implementation. Update it as implementation progresses and learnings emerge.*
