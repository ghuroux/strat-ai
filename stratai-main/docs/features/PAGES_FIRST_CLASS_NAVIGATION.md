# Pages as First-Class Citizens: Space-Level Navigation

> **Status:** Design Complete | **Priority:** High | **Effort:** 3-4 days

Transform Pages from buried content to discoverable first-class entities with Space-level navigation and filtering.

---

## Executive Summary

### The Problem

Pages are currently hidden three levels deep: `Space → Area → Pages`. This creates friction:

1. **Discovery problem:** Users can't see what pages exist across their Space without navigating through each area
2. **Access friction:** Want to find a page? You must remember which area contains it
3. **Second-class status:** Tasks and Documents have top-level navigation, but Pages are buried
4. **Cognitive load:** "Where did I put that page?" becomes a repeated question

### The Solution

Promote Pages to first-class navigation status:

- **Space-level Pages button** - Join Tasks, Documents, Members in the Space navigation
- **Unified Pages dashboard** - See all pages across all areas in one filterable view
- **Icon-based navigation** - Scales to mobile, consistent with Area toolbar patterns
- **Dual access model** - Space-level for discovery, Area-level for focused context
- **Race condition fix** - Optimistic updates ensure newly created pages appear immediately

### The Insight

**Pages have graduated from "area notes" to "created knowledge artifacts."**

They deserve the same discoverability as Tasks and Documents. The solution maintains the data model (pages belong to areas) while providing discovery at the Space level.

```
Current:   Space Dashboard → Area Toolbar → Pages List → Individual Page
Proposed:  Space Dashboard → Pages List → Individual Page (any area)
```

Both paths remain valid; we're adding discovery, not removing context.

### Value Proposition

| Benefit | Description |
|---------|-------------|
| **Reduced friction** | Find pages without remembering which area contains them |
| **Better discovery** | "What pages exist?" answered at a glance |
| **Mobile support** | Icon navigation scales to all screen sizes |
| **Consistency** | Pages treated equally to Tasks and Documents |
| **Maintained context** | Area-level access still available for focused work |

---

## Table of Contents

1. [UX Specifications](#1-ux-specifications)
2. [Navigation Design](#2-navigation-design)
3. [Pages Dashboard Design](#3-pages-dashboard-design)
4. [Technical Architecture](#4-technical-architecture)
5. [Implementation Phases](#5-implementation-phases)
6. [Edge Cases & Resolutions](#6-edge-cases--resolutions)
7. [API Endpoints](#7-api-endpoints)
8. [Database Schema Changes](#8-database-schema-changes)
9. [Files to Create/Modify](#9-files-to-createmodify)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. UX Specifications

### 1.1 Navigation Pattern Change

#### Current State (Text Buttons)
```
┌─────────────────────────────────────────────┐
│ StratTech                                    │
│ Organization shared workspace                │
│                                              │
│  [Tasks]  [Documents]  [Members 5]          │
└─────────────────────────────────────────────┘
```

**Problems:**
- Takes significant horizontal space
- Doesn't scale to mobile (<640px)
- Can't add more items without cramping

#### Proposed State (Icon Navigation)

**Desktop (>768px):**
```
┌─────────────────────────────────────────────┐
│ StratTech                                    │
│ Organization shared workspace                │
│                                              │
│   ✓      📄      📝      👥                 │
│  Tasks   Docs   Pages   Members              │
│   3             12      5                    │
└─────────────────────────────────────────────┘
```

**Tablet/Mobile (<768px):**
```
┌─────────────────────────────────┐
│ StratTech                        │
│ Organization shared workspace    │
│                                  │
│  [✓3]  [📄]  [📝12]  [👥5]     │
└─────────────────────────────────┘
```

**Behavior:**
- **Desktop:** Icons + labels below + count badges
- **Mobile:** Icons only + count badges (no labels)
- **All sizes:** Tooltips on hover/long-press

### 1.2 Icon Specifications

| Item | Icon | Badge | Tooltip |
|------|------|-------|---------|
| Tasks | CheckCircle (lucide-svelte) | Active task count | "Tasks (3)" |
| Documents | File (lucide-svelte) | No count | "Documents" |
| Pages | FileEdit (lucide-svelte) | Page count across areas | "Pages (12)" |
| Members | Users (lucide-svelte) | Member count | "Members (5)" |

**Icon properties:**
- Source: `lucide-svelte` components
- Size: 16px (1rem)
- Stroke width: 1.5
- Color: Inherits from parent (supports dark/light mode)
- Interactive: Hover scales to 1.1x

### 1.3 User Journeys

#### Journey A: Discovery ("What pages exist?")
1. User on Space dashboard (`/spaces/stratech`)
2. Clicks **Pages icon** (📝 12)
3. Lands on `/spaces/stratech/pages`
4. Sees grid of all pages across all accessible areas
5. Filters by area, ownership, or type
6. Searches by title
7. Clicks page card → Opens editor

**Mental model:** "Show me everything I can access"

#### Journey B: Focused Context ("I'm working in this area")
1. User in Area view (`/spaces/stratech/marketing`)
2. Clicks **Pages icon in area toolbar**
3. Lands on `/spaces/stratech/marketing/pages`
4. Sees only pages in Marketing area
5. Creates new page in this context

**Mental model:** "Show me what's relevant here"

**Key insight:** Both journeys are valid; they serve different needs. Space-level = breadth, Area-level = depth.

---

## 2. Navigation Design

### 2.1 Component Structure

```svelte
<!-- Space dashboard navigation -->
<nav class="space-nav">
  <button class="nav-item" onclick={goToTasks}>
    <CheckCircle size={16} />
    <span class="label">Tasks</span>
    {#if taskCount > 0}
      <span class="badge">{taskCount}</span>
    {/if}
  </button>

  <button class="nav-item" onclick={goToDocuments}>
    <File size={16} />
    <span class="label">Docs</span>
  </button>

  <button class="nav-item" onclick={goToPages}>
    <FileEdit size={16} />
    <span class="label">Pages</span>
    {#if pageCount > 0}
      <span class="badge">{pageCount}</span>
    {/if}
  </button>

  <button class="nav-item" onclick={openMembersModal}>
    <Users size={16} />
    <span class="label">Members</span>
    {#if memberCount > 0}
      <span class="badge">{memberCount}</span>
    {/if}
  </button>
</nav>
```

### 2.2 Responsive CSS

```css
.space-nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  padding: 1rem 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: none;
  cursor: pointer;
  position: relative;
  transition: transform 150ms ease;
}

.nav-item:hover {
  transform: scale(1.1);
}

.nav-item .label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.nav-item .badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: var(--accent-500);
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

/* Mobile: Hide labels, keep icons + badges */
@media (max-width: 768px) {
  .space-nav {
    gap: 1rem;
  }

  .nav-item .label {
    display: none;
  }
}
```

### 2.3 Accessibility Requirements

- [ ] All buttons have `aria-label` attributes
- [ ] Tooltips visible on focus (not just hover)
- [ ] Keyboard navigation: Tab through nav items, Enter to activate
- [ ] Screen reader announces count: "Pages, 12 items"
- [ ] Focus indicators meet WCAG AA standards (visible outline)

---

## 3. Pages Dashboard Design

### 3.1 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ ← StratTech / Pages                         [+ New Page]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ━━ Recently Edited by You ━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                          │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│ │ 📝      │  │ 📄      │  │ ⚖️      │                │
│ │ Meeting │  │ Product │  │ Q4      │                │
│ │ Notes   │  │ Roadmap │  │ Decision│                │
│ │ 5m ago  │  │ 2h ago  │  │ 1d ago  │                │
│ └─────────┘  └─────────┘  └─────────┘                │
│                                                          │
│ ━━ All Pages ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                          │
│ [🔍 Search...] [Owned: All ▼] [Area: All ▼] [Type: All ▼]│
│                                                          │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│ │ 📄 🔒   │  │ 📝      │  │ 📄      │  │ ⚖️      │   │
│ │ Strategy│  │ Weekly  │  │ Design  │  │ Pricing │   │
│ │ 2024    │  │ Update  │  │ Sprint  │  │ Model   │   │
│ │         │  │         │  │         │  │         │   │
│ │ Private │  │ General │  │ Product │  │ Strategy│   │
│ │ 2.4k w  │  │ 856 w   │  │ 1.2k w  │  │ 3.1k w  │   │
│ │ 3d ago  │  │ 1w ago  │  │ 2w ago  │  │ 1mo ago │   │
│ │ Shared  │  │ You     │  │ You     │  │ Alice   │   │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Recently Edited by You Section

**Purpose:** Quick access to pages actively being worked on

**Display Rules:**
- Shows last 3 pages you edited (regardless of ownership)
- Sorted by most recent `updatedAt` timestamp
- Only shows if you have edited pages in last 30 days
- Hidden if empty (no section header shown)
- Horizontal scroll on mobile if >3 cards

**Data Query:**
```typescript
// Get recently edited pages for user
async getRecentlyEditedPages(userId: string, spaceId: string): Promise<Page[]> {
  const pages = await sql<PageRow[]>`
    SELECT p.*, a.name as area_name, a.slug as area_slug
    FROM pages p
    JOIN areas a ON p.area_id = a.id
    WHERE p.space_id = ${spaceId}
      AND p.updated_by = ${userId}
      AND p.updated_at > NOW() - INTERVAL '30 days'
      AND p.deleted_at IS NULL
    ORDER BY p.updated_at DESC
    LIMIT 3
  `;
  return pages.map(rowToPage);
}
```

### 3.3 All Pages Section

**Purpose:** Comprehensive, filterable list of all accessible pages

#### 3.3.1 Filter Bar

| Filter | Type | Options | Default | Behavior |
|--------|------|---------|---------|----------|
| **Search** | Text input | - | Empty | Real-time filter by title (case-insensitive) |
| **Ownership** | Dropdown | All, Owned by me, Shared with me | All | Filters by `createdBy` field |
| **Area** | Dropdown | All areas, [Area list] | All areas | Shows only pages from selected area |
| **Type** | Dropdown | All types, General, Meeting Notes, Decision Record | All types | Filters by `pageType` field |

**Filter Combinations:**
- All filters apply simultaneously (AND logic)
- Empty result shows: "No pages match your filters"
- Clear all button resets to defaults

#### 3.3.2 Page Card Design

```
┌────────────────────────────────┐
│ 📝 🔒                         │  ← Type icon + privacy indicator
│ Product Roadmap 2024           │  ← Title (truncated at 50 chars)
│                                │
│ [Marketing]                    │  ← Area badge (pill)
│ 1,286 words                    │  ← Word count
│ Updated 3d ago                 │  ← Relative timestamp
│ Shared by Alice Thompson       │  ← Ownership indicator (if not yours)
│                             ⋮  │  ← 3-dot menu (kebab)
└────────────────────────────────┘
```

**Card States:**

| State | Visual Treatment |
|-------|------------------|
| Normal | Border: `var(--surface-300)`, Background: `var(--surface-100)` |
| Hover | Border: `var(--accent-500)`, Transform: `translateY(-2px)` |
| New (just created) | Green pulse border animation for 2 seconds |
| Private | Lock icon in top-right, subtle "Private" badge |

**3-Dot Menu Options:**
- View (navigates to editor)
- Share (opens share modal if you own it)
- Delete (if you own it, shows confirmation)

#### 3.3.3 Grid Layout

```css
.pages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
}

/* Tablet: 2 columns */
@media (max-width: 1024px) {
  .pages-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile: 1 column */
@media (max-width: 640px) {
  .pages-grid {
    grid-template-columns: 1fr;
  }
}
```

#### 3.3.4 Empty States

**No pages in Space:**
```
┌─────────────────────────────────────────────┐
│                                              │
│           📝                                 │
│                                              │
│      No pages yet                            │
│                                              │
│  Pages are created in areas. Visit an       │
│  area and start a new page to get started.  │
│                                              │
│          [Browse Areas]                      │
│                                              │
└─────────────────────────────────────────────┘
```

**No pages match filters:**
```
┌─────────────────────────────────────────────┐
│                                              │
│           🔍                                 │
│                                              │
│      No pages match your filters             │
│                                              │
│  Try adjusting your search or filters        │
│                                              │
│          [Clear Filters]                     │
│                                              │
└─────────────────────────────────────────────┘
```

### 3.4 Page Creation Flow

**Trigger:** User clicks [+ New Page] button

**Modal Flow:**
```
┌──────────────────────────────────┐
│  Create New Page                  │
├──────────────────────────────────┤
│                                   │
│  Pages belong to an area.        │
│  Which area should this page     │
│  be created in?                  │
│                                   │
│  [ Select Area ▼          ]      │
│    • General                      │
│    • Marketing                    │
│    • Product                      │
│    • Strategy                     │
│                                   │
│         [Cancel]  [Continue]      │
└──────────────────────────────────┘
```

**After area selection:**
- Navigates to: `/spaces/{spaceSlug}/{areaSlug}/pages/new`
- Opens standard page editor in selected area context
- Breadcrumb shows: `{Space} / {Area} / New Page`

**Why this pattern:**
- Makes data model explicit (pages belong to areas)
- Prevents "orphan page" confusion
- Follows existing patterns (conversation creation from Arena)
- Educational moment for users

---

## 4. Technical Architecture

### 4.1 Component Hierarchy

```
SpaceDashboard.svelte
├── SpaceHeader.svelte
│   └── SpaceNavigation.svelte (MODIFIED)
│       ├── TasksNavButton.svelte (NEW)
│       ├── DocumentsNavButton.svelte (NEW)
│       ├── PagesNavButton.svelte (NEW - adds pages count)
│       └── MembersNavButton.svelte (NEW)
│
└── Routes:
    └── /spaces/[space]/pages/+page.svelte (NEW)
        ├── RecentlyEditedSection.svelte (NEW)
        │   └── PageCard.svelte (REUSED)
        ├── AllPagesSection.svelte (NEW)
        │   ├── PageFilterBar.svelte (NEW)
        │   ├── PagesGrid.svelte (NEW)
        │   │   └── PageCard.svelte (REUSED)
        │   └── EmptyState.svelte (NEW)
        └── SelectAreaModal.svelte (NEW)
```

### 4.2 Store Extensions

#### pageStore Additions

```typescript
// src/lib/stores/pages.svelte.ts

class PageStore {
  // Existing methods...

  /**
   * Get all pages for a Space (across all accessible areas)
   */
  getPagesForSpace(spaceId: string): Page[] {
    const accessibleAreas = areaStore.getAreasForSpace(spaceId);
    const areaIds = accessibleAreas.map(a => a.id);

    return Array.from(this.pages.values())
      .filter(page =>
        areaIds.includes(page.areaId) &&
        !page.deletedAt
      )
      .sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }

  /**
   * Get count of pages for a Space
   */
  getPageCountForSpace(spaceId: string): number {
    return this.getPagesForSpace(spaceId).length;
  }

  /**
   * Get recently edited pages by user in a Space
   */
  getRecentlyEditedByUser(userId: string, spaceId: string, limit: number = 3): Page[] {
    return this.getPagesForSpace(spaceId)
      .filter(page => page.updatedBy === userId)
      .sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Add page optimistically (for race condition fix)
   */
  addPage(page: Page): void {
    this.pages.set(page.id, page);
    this._version++; // Trigger reactivity
  }

  /**
   * Refresh pages for a Space from server
   */
  async refreshPagesForSpace(spaceId: string): Promise<void> {
    const response = await fetch(`/api/spaces/${spaceId}/pages`);
    if (!response.ok) throw new Error('Failed to refresh pages');

    const pages: Page[] = await response.json();
    pages.forEach(page => this.pages.set(page.id, page));
    this._version++;
  }
}
```

### 4.3 API Design

#### GET /api/spaces/:spaceSlug/pages

**Purpose:** Fetch all pages for a Space

**Query Parameters:**
- `area` (optional) - Filter by area slug
- `type` (optional) - Filter by page type
- `owned` (optional) - `me` | `shared` - Filter by ownership

**Response:**
```typescript
interface PagesListResponse {
  pages: PageWithMetadata[];
  counts: {
    total: number;
    byArea: Record<string, number>;
    byType: Record<PageType, number>;
    ownedByMe: number;
    sharedWithMe: number;
  };
}

interface PageWithMetadata extends Page {
  areaName: string;
  areaSlug: string;
  creatorName: string;
  wordCount: number;
  isOwnedByUser: boolean;
}
```

**SQL Query:**
```sql
WITH accessible_areas AS (
  -- Areas user can access in this Space
  SELECT a.id, a.name, a.slug
  FROM areas a
  WHERE a.space_id = :spaceId
    AND a.deleted_at IS NULL
    AND (
      -- Open area (all Space members can see)
      a.is_restricted = false
      OR
      -- Restricted area with explicit membership
      EXISTS (
        SELECT 1 FROM area_memberships am
        WHERE am.area_id = a.id
          AND am.user_id = :userId
      )
    )
)
SELECT
  p.*,
  a.name as area_name,
  a.slug as area_slug,
  u.name as creator_name,
  LENGTH(p.content::text) / 5 as word_count,
  CASE WHEN p.created_by = :userId THEN true ELSE false END as is_owned_by_user
FROM pages p
JOIN accessible_areas a ON p.area_id = a.id
LEFT JOIN users u ON p.created_by = u.id
WHERE p.deleted_at IS NULL
  AND (:areaFilter IS NULL OR a.slug = :areaFilter)
  AND (:typeFilter IS NULL OR p.page_type = :typeFilter)
  AND (
    :ownershipFilter IS NULL
    OR (:ownershipFilter = 'me' AND p.created_by = :userId)
    OR (:ownershipFilter = 'shared' AND p.created_by != :userId)
  )
ORDER BY p.updated_at DESC
```

### 4.4 Race Condition Prevention

**Problem:** User creates page → navigates to pages dashboard → page not visible yet

**Solution: 4-Layer Defense**

#### Layer 1: Optimistic Store Update (Primary)
```typescript
// In page creation handler
async function createPageFromConversation(data: CreatePageData) {
  const response = await fetch('/api/pages', {
    method: 'POST',
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error('Failed to create page');

  const newPage: Page = await response.json();

  // ✅ CRITICAL: Add to store immediately before navigation
  pageStore.addPage(newPage);

  // Now navigate - page will be in store
  goto(`/spaces/${spaceSlug}/pages?created=${newPage.id}`);
}
```

#### Layer 2: Highlight Newly Created Page
```typescript
// In pages dashboard +page.svelte
let createdPageId = $derived($page.url.searchParams.get('created'));

// Apply highlight class to newly created card
<div class="page-card" class:newly-created={page.id === createdPageId}>
```

```css
.page-card.newly-created {
  animation: highlight-pulse 2s ease-out;
}

@keyframes highlight-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
    border-color: rgb(34, 197, 94);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
    border-color: rgb(34, 197, 94);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    border-color: transparent;
  }
}
```

#### Layer 3: Force Refresh on Mount (Fallback)
```svelte
<!-- In /spaces/[space]/pages/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { pageStore } from '$lib/stores/pages.svelte';

  let { data } = $props();

  onMount(() => {
    // Always refresh when this view loads
    // Ensures we have latest data even if store is stale
    pageStore.refreshPagesForSpace(data.space.id);
  });
</script>
```

#### Layer 4: Success Toast (User Feedback)
```typescript
// After page creation
import { toast } from '$lib/components/ui/toast';

toast.success('Page created successfully', {
  action: {
    label: 'View',
    onClick: () => goto(`/spaces/${spaceSlug}/pages?created=${newPage.id}`)
  }
});
```

**Result:** User ALWAYS sees their new page, with clear visual feedback

---

## 5. Implementation Phases

### Phase 1: Icon-Based Navigation (1 day)

**Objective:** Replace text buttons with icon navigation in Space header

**Files to Create:**
```
src/lib/components/spaces/SpaceNavigation.svelte
src/lib/components/spaces/nav/TasksNavButton.svelte
src/lib/components/spaces/nav/DocumentsNavButton.svelte
src/lib/components/spaces/nav/PagesNavButton.svelte
src/lib/components/spaces/nav/MembersNavButton.svelte
```

**Files to Modify:**
```
src/lib/components/spaces/SpaceDashboard.svelte (import SpaceNavigation)
```

**Implementation:**

1. Extract navigation from SpaceDashboard into SpaceNavigation component
2. Create individual nav button components (Tasks, Documents, Pages, Members)
3. Each button shows: icon, label (desktop), count badge
4. Add responsive CSS (hide labels on mobile)
5. Wire up click handlers (goto or modal triggers)

**Acceptance Tests:**

```typescript
describe('SpaceNavigation', () => {
  test('renders all 4 nav buttons', () => {
    // Mount SpaceNavigation
    // Verify Tasks, Documents, Pages, Members buttons visible
  });

  test('shows count badges for Tasks, Pages, Members', () => {
    const props = { taskCount: 5, pageCount: 12, memberCount: 8 };
    // Mount with props
    // Verify badges show correct counts
  });

  test('on desktop: shows icon + label', () => {
    // Set viewport width > 768px
    // Verify .label elements visible
  });

  test('on mobile: hides labels, keeps icons', () => {
    // Set viewport width < 768px
    // Verify .label elements hidden (CSS)
  });

  test('clicking Pages button navigates to pages route', () => {
    // Mount, click Pages button
    // Verify navigation to /spaces/{slug}/pages
  });

  test('hovering shows tooltips', () => {
    // Mount, hover over Pages button
    // Verify tooltip "Pages (12)" appears
  });
});
```

---

### Phase 2: Page Count Badge (0.5 day)

**Objective:** Add page count aggregation and display in navigation badge

**Files to Modify:**
```
src/lib/stores/pages.svelte.ts (add getPagesForSpace, getPageCountForSpace)
src/lib/components/spaces/nav/PagesNavButton.svelte (wire count)
```

**Implementation:**

1. Add `getPagesForSpace(spaceId)` method to pageStore
2. Add `getPageCountForSpace(spaceId)` method (returns length)
3. In PagesNavButton, derive count: `let count = $derived(pageStore.getPageCountForSpace(spaceId))`
4. Display badge if count > 0

**Acceptance Tests:**

```typescript
describe('Page Count', () => {
  test('getPagesForSpace returns pages from all accessible areas', () => {
    // Setup: Space with 3 areas, 2 pages each
    const pages = pageStore.getPagesForSpace('space-123');
    expect(pages).toHaveLength(6);
  });

  test('getPagesForSpace respects area access control', () => {
    // Setup: 2 open areas, 1 restricted (no access)
    // User can see 4 pages total (2 + 2, not restricted)
    const pages = pageStore.getPagesForSpace('space-123');
    expect(pages).toHaveLength(4);
  });

  test('getPageCountForSpace returns correct count', () => {
    const count = pageStore.getPageCountForSpace('space-123');
    expect(count).toBe(6);
  });

  test('PagesNavButton shows count badge', () => {
    // Mock store to return 12 pages
    // Mount button
    // Verify badge shows "12"
  });

  test('PagesNavButton hides badge when count is 0', () => {
    // Mock store to return 0 pages
    // Mount button
    // Verify no badge rendered
  });
});
```

---

### Phase 3: Space Pages Route & Dashboard (2 days)

**Objective:** Create Space-level Pages view with filters and sections

**Files to Create:**
```
src/routes/spaces/[space]/pages/+page.svelte
src/routes/spaces/[space]/pages/+page.ts (load function)
src/lib/components/pages/RecentlyEditedSection.svelte
src/lib/components/pages/AllPagesSection.svelte
src/lib/components/pages/PageFilterBar.svelte
src/lib/components/pages/PagesGrid.svelte
src/lib/components/pages/PageEmptyState.svelte
```

**Files to Modify:**
```
src/lib/components/pages/PageCard.svelte (add ownership indicators)
```

**Implementation:**

**3.1: Route and Load Function**

```typescript
// src/routes/spaces/[space]/pages/+page.ts
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch, url }) => {
  const { space: spaceSlug } = params;

  // Build query params from URL
  const searchParams = new URLSearchParams();
  const area = url.searchParams.get('area');
  const type = url.searchParams.get('type');
  const owned = url.searchParams.get('owned');

  if (area) searchParams.set('area', area);
  if (type) searchParams.set('type', type);
  if (owned) searchParams.set('owned', owned);

  // Fetch pages data
  const response = await fetch(`/api/spaces/${spaceSlug}/pages?${searchParams}`);
  if (!response.ok) throw error(response.status, 'Failed to load pages');

  const data = await response.json();

  return {
    pages: data.pages,
    counts: data.counts,
    filters: { area, type, owned }
  };
};
```

**3.2: Main Dashboard Component**

```svelte
<!-- src/routes/spaces/[space]/pages/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { pageStore } from '$lib/stores/pages.svelte';
  import RecentlyEditedSection from '$lib/components/pages/RecentlyEditedSection.svelte';
  import AllPagesSection from '$lib/components/pages/AllPagesSection.svelte';
  import SelectAreaModal from '$lib/components/pages/SelectAreaModal.svelte';

  let { data } = $props();

  let showAreaSelectModal = $state(false);
  let createdPageId = $derived($page.url.searchParams.get('created'));

  // Refresh pages on mount (Layer 3: fallback)
  onMount(() => {
    pageStore.refreshPagesForSpace(data.space.id);
  });

  function handleNewPage() {
    showAreaSelectModal = true;
  }

  function handleAreaSelected(areaSlug: string) {
    goto(`/spaces/${data.space.slug}/${areaSlug}/pages/new`);
  }
</script>

<div class="pages-dashboard">
  <header class="dashboard-header">
    <h1>Pages</h1>
    <button class="btn-primary" onclick={handleNewPage}>
      + New Page
    </button>
  </header>

  <RecentlyEditedSection
    pages={data.recentlyEdited}
    {createdPageId}
  />

  <AllPagesSection
    pages={data.pages}
    counts={data.counts}
    filters={data.filters}
    {createdPageId}
  />

  <SelectAreaModal
    isOpen={showAreaSelectModal}
    areas={data.areas}
    onSelect={handleAreaSelected}
    onClose={() => showAreaSelectModal = false}
  />
</div>
```

**3.3: Recently Edited Section**

```svelte
<!-- src/lib/components/pages/RecentlyEditedSection.svelte -->
<script lang="ts">
  import type { Page } from '$lib/types/page';
  import PageCard from './PageCard.svelte';

  interface Props {
    pages: Page[];
    createdPageId: string | null;
  }

  let { pages, createdPageId }: Props = $props();
</script>

{#if pages.length > 0}
  <section class="recently-edited">
    <h2 class="section-title">Recently Edited by You</h2>
    <div class="cards-horizontal">
      {#each pages as page}
        <PageCard
          {page}
          highlight={page.id === createdPageId}
        />
      {/each}
    </div>
  </section>
{/if}

<style>
  .cards-horizontal {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    padding: 0.5rem 0;
  }

  @media (max-width: 768px) {
    .cards-horizontal {
      scroll-snap-type: x mandatory;
    }
  }
</style>
```

**3.4: Filter Bar**

```svelte
<!-- src/lib/components/pages/PageFilterBar.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  interface Props {
    counts: {
      byArea: Record<string, number>;
      byType: Record<string, number>;
      ownedByMe: number;
      sharedWithMe: number;
    };
    currentFilters: {
      area: string | null;
      type: string | null;
      owned: string | null;
    };
  }

  let { counts, currentFilters }: Props = $props();

  let searchTerm = $state('');

  function updateFilter(key: string, value: string | null) {
    const url = new URL($page.url);
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    goto(url.toString(), { keepFocus: true });
  }
</script>

<div class="filter-bar">
  <input
    type="text"
    placeholder="🔍 Search pages..."
    bind:value={searchTerm}
    class="search-input"
  />

  <select
    value={currentFilters.owned ?? 'all'}
    onchange={(e) => updateFilter('owned', e.currentTarget.value === 'all' ? null : e.currentTarget.value)}
    class="filter-select"
  >
    <option value="all">All pages</option>
    <option value="me">Owned by me ({counts.ownedByMe})</option>
    <option value="shared">Shared with me ({counts.sharedWithMe})</option>
  </select>

  <select
    value={currentFilters.area ?? 'all'}
    onchange={(e) => updateFilter('area', e.currentTarget.value === 'all' ? null : e.currentTarget.value)}
    class="filter-select"
  >
    <option value="all">All areas</option>
    {#each Object.entries(counts.byArea) as [area, count]}
      <option value={area}>{area} ({count})</option>
    {/each}
  </select>

  <select
    value={currentFilters.type ?? 'all'}
    onchange={(e) => updateFilter('type', e.currentTarget.value === 'all' ? null : e.currentTarget.value)}
    class="filter-select"
  >
    <option value="all">All types</option>
    {#each Object.entries(counts.byType) as [type, count]}
      <option value={type}>{type.replace('_', ' ')} ({count})</option>
    {/each}
  </select>
</div>
```

**Acceptance Tests:**

```typescript
describe('Space Pages Route', () => {
  test('loads pages for Space', async () => {
    // Navigate to /spaces/test-space/pages
    // Verify pages fetched and displayed
  });

  test('applies area filter from URL', async () => {
    // Navigate to /spaces/test-space/pages?area=marketing
    // Verify only marketing area pages shown
  });

  test('shows recently edited section if user has edits', () => {
    // Mock user with 2 recently edited pages
    // Verify section appears with 2 cards
  });

  test('hides recently edited section if empty', () => {
    // Mock user with no recent edits
    // Verify section not rendered
  });
});

describe('PageFilterBar', () => {
  test('changing ownership filter updates URL', () => {
    // Select "Owned by me"
    // Verify URL changes to ?owned=me
    // Verify page re-renders with filtered data
  });

  test('changing area filter updates URL', () => {
    // Select "Marketing"
    // Verify URL changes to ?area=marketing
  });

  test('search input filters pages client-side', () => {
    // Type "roadmap" in search
    // Verify only pages with "roadmap" in title shown
  });

  test('clear filters button resets to defaults', () => {
    // Set filters: owned=me, area=marketing
    // Click Clear Filters
    // Verify URL params cleared, all pages shown
  });
});

describe('SelectAreaModal', () => {
  test('opens when New Page clicked', () => {
    // Click + New Page button
    // Verify modal appears
  });

  test('shows list of areas in Space', () => {
    // Open modal
    // Verify all accessible areas listed
  });

  test('selecting area navigates to page editor', () => {
    // Open modal, select "Marketing"
    // Verify navigation to /spaces/{space}/marketing/pages/new
  });

  test('cancel closes modal without navigation', () => {
    // Open modal, click Cancel
    // Verify modal closes, no navigation
  });
});
```

---

### Phase 4: Race Condition Prevention (0.5 day)

**Objective:** Implement 4-layer defense to ensure newly created pages appear immediately

**Files to Modify:**
```
src/lib/stores/pages.svelte.ts (add addPage, refreshPagesForSpace)
src/routes/api/pages/+server.ts (page creation endpoint)
src/lib/components/pages/PageCard.svelte (add highlight state)
All page creation flows (conversation export, area page creation)
```

**Implementation:**

Already detailed in Section 4.4. Key files:

**4.1: Store Methods**
```typescript
// In pageStore
addPage(page: Page): void {
  this.pages.set(page.id, page);
  this._version++;
}

async refreshPagesForSpace(spaceId: string): Promise<void> {
  const response = await fetch(`/api/spaces/${spaceId}/pages`);
  const pages: Page[] = await response.json();
  pages.forEach(page => this.pages.set(page.id, page));
  this._version++;
}
```

**4.2: Page Creation Handler**
```typescript
// In any page creation flow
const newPage = await createPage(data);

// ✅ Add to store immediately
pageStore.addPage(newPage);

// ✅ Show toast
toast.success('Page created successfully');

// ✅ Navigate with created param
goto(`/spaces/${spaceSlug}/pages?created=${newPage.id}`);
```

**4.3: Highlight Animation**
```svelte
<!-- In PageCard.svelte -->
<script lang="ts">
  let { page, highlight = false } = $props();
</script>

<div class="page-card" class:newly-created={highlight}>
  <!-- card content -->
</div>

<style>
  .newly-created {
    animation: highlight-pulse 2s ease-out;
  }

  @keyframes highlight-pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
      border-color: rgb(34, 197, 94);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
      border-color: transparent;
    }
  }
</style>
```

**Acceptance Tests:**

```typescript
describe('Race Condition Prevention', () => {
  test('Layer 1: addPage adds to store immediately', () => {
    const page = { id: 'page-123', title: 'Test' };
    pageStore.addPage(page);

    expect(pageStore.pages.get('page-123')).toEqual(page);
  });

  test('Layer 2: created param highlights card', () => {
    // Navigate to /spaces/test/pages?created=page-123
    // Find card with id page-123
    // Verify .newly-created class applied
  });

  test('Layer 3: onMount refreshes pages', async () => {
    const refreshSpy = vi.spyOn(pageStore, 'refreshPagesForSpace');
    // Mount pages dashboard
    await waitFor(() => expect(refreshSpy).toHaveBeenCalled());
  });

  test('Layer 4: toast shows success message', async () => {
    // Create page
    // Verify toast appears with "Page created successfully"
  });

  test('End-to-end: page visible immediately after creation', async () => {
    // 1. Create page from conversation
    // 2. Immediately navigate to pages dashboard
    // 3. Verify new page appears in list (not "No pages")
    // 4. Verify highlight animation plays
  });
});
```

---

### Phase 5: Polish & Testing (0.5 day)

**Objective:** Loading states, empty states, accessibility, mobile testing

**Implementation:**

1. **Loading States:**
   - Skeleton cards while pages fetch
   - Spinner in filter dropdowns during navigation
   - Disabled state for buttons during operations

2. **Empty States:**
   - No pages in Space
   - No pages match filters
   - No recently edited pages

3. **Accessibility:**
   - All interactive elements keyboard accessible
   - ARIA labels on all buttons
   - Focus management (modal traps focus)
   - Screen reader announcements for page count

4. **Mobile Testing:**
   - Icon navigation works without labels
   - Cards stack properly on narrow screens
   - Filters dropdown is usable on mobile
   - Touch interactions smooth (no hover dependencies)

5. **Dark/Light Mode:**
   - All components support both themes
   - Badges readable in both modes
   - Hover states visible in both modes

**Acceptance Tests:**

```typescript
describe('Loading States', () => {
  test('shows skeleton cards while loading', () => {
    // Mock slow API response
    // Verify skeleton cards render
  });

  test('spinner appears during filter navigation', () => {
    // Click area filter
    // Verify loading indicator while refetching
  });
});

describe('Empty States', () => {
  test('no pages: shows empty state with Browse Areas button', () => {
    // Mock empty pages array
    // Verify empty state message and button
  });

  test('no matches: shows no results empty state', () => {
    // Set filter that matches nothing
    // Verify "No pages match your filters" message
  });
});

describe('Accessibility', () => {
  test('all nav buttons have aria-labels', () => {
    // Verify Tasks, Documents, Pages, Members have aria-label
  });

  test('page count announced to screen readers', () => {
    // Verify aria-live region announces "12 pages found"
  });

  test('modal traps focus', () => {
    // Open SelectAreaModal
    // Tab through elements
    // Verify focus stays within modal
  });

  test('keyboard navigation works', () => {
    // Tab to Pages button, press Enter
    // Verify navigation occurs
  });
});

describe('Mobile Responsiveness', () => {
  test('navigation icons visible without labels', () => {
    // Set viewport < 768px
    // Verify icons render, labels hidden
  });

  test('cards stack vertically on mobile', () => {
    // Set viewport < 640px
    // Verify single-column grid
  });

  test('filter dropdowns usable on mobile', () => {
    // Set mobile viewport
    // Open area filter dropdown
    // Verify native select works properly
  });
});

describe('Theme Support', () => {
  test('components render correctly in dark mode', () => {
    // Set dark mode
    // Verify badges, borders, text readable
  });

  test('components render correctly in light mode', () => {
    // Set light mode
    // Verify no elements invisible
  });
});
```

---

## 6. Edge Cases & Resolutions

### Edge Case 1: No Areas in Space

**Scenario:** Brand new Space with no areas created yet

**Resolution:**
- Space Pages view shows: "No pages yet. Create an area first."
- [+ New Page] button disabled with tooltip: "Create an area first"
- Provide [Create Area] button in empty state

### Edge Case 2: All Areas Restricted (User has no access)

**Scenario:** User is Space member but has no access to any areas

**Resolution:**
- Page count badge shows 0
- Pages view shows: "No pages available. Ask a Space admin to share an area with you."
- [+ New Page] button disabled

### Edge Case 3: Deleting an Area with Pages

**Scenario:** Area is deleted, contains 10 pages

**Resolution:**
- Pages soft-deleted with area (cascade)
- Removed from page count
- Removed from all pages list
- If recently edited pages include deleted ones, they disappear after refresh

### Edge Case 4: Page Ownership Transfer

**Scenario:** Page creator leaves Space, ownership needs transfer

**Resolution:**
- Page ownership automatically transfers to Area creator
- "Shared by [Name]" updates to new owner
- Audit log records the transfer

### Edge Case 5: Extremely Long Page Titles

**Scenario:** Page title is 200 characters

**Resolution:**
- Card title truncates at 50 characters
- Full title visible on hover (tooltip)
- Full title visible in breadcrumb when viewing page

### Edge Case 6: Page Created While Dashboard Open

**Scenario:** User has pages dashboard open, someone else creates page in shared area

**Resolution:**
- Real-time update not implemented in V1 (acceptable)
- Refresh button in header allows manual refresh
- Page appears on next navigation to dashboard

### Edge Case 7: Search with Special Characters

**Scenario:** User searches for "Q&A" or "Meeting #5"

**Resolution:**
- Search is literal string match (case-insensitive)
- Special characters handled correctly
- No regex injection vulnerability

### Edge Case 8: Slow Network During Page Creation

**Scenario:** API takes 5 seconds to respond

**Resolution:**
- Loading state shows during creation
- Optimistic update still adds to store when response arrives
- Toast appears after successful response
- Navigation happens after store update

### Edge Case 9: User Opens Multiple Tabs

**Scenario:** Pages dashboard open in 2 tabs, create page in tab 1

**Resolution:**
- Tab 1: Shows new page immediately (optimistic update)
- Tab 2: Shows new page on next manual refresh or navigation
- Future: Consider shared worker for cross-tab sync

### Edge Case 10: Filter URL Manipulation

**Scenario:** User manually edits URL to invalid filter: `?area=nonexistent`

**Resolution:**
- API ignores invalid filters (returns all pages)
- UI shows "No pages match" if genuinely no results
- No error thrown

---

## 7. API Endpoints

### GET /api/spaces/:spaceSlug/pages

**Purpose:** Fetch pages for a Space with optional filters

**Parameters:**
- `:spaceSlug` (path) - Space identifier
- `area` (query, optional) - Area slug filter
- `type` (query, optional) - Page type filter
- `owned` (query, optional) - Ownership filter (`me` | `shared`)

**Response:**
```typescript
{
  pages: PageWithMetadata[],
  recentlyEdited: Page[],
  counts: {
    total: number,
    byArea: Record<string, number>,
    byType: Record<PageType, number>,
    ownedByMe: number,
    sharedWithMe: number
  }
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized (not logged in)
- 403: Forbidden (not a Space member)
- 404: Space not found

### POST /api/pages

**Purpose:** Create a new page (existing endpoint, no changes needed)

**Body:**
```typescript
{
  title: string,
  pageType: PageType,
  content: TipTapContent,
  areaId: string,
  spaceId: string,
  isPrivate?: boolean
}
```

**Response:**
```typescript
{
  page: Page
}
```

**Status Codes:**
- 201: Created
- 400: Invalid data
- 401: Unauthorized
- 403: Forbidden (no area access)

---

## 8. Database Schema Changes

**No schema changes required.** All necessary tables exist:

- `pages` table - Already has `area_id`, `space_id`, `page_type`, `is_private`
- `areas` table - Already has `is_restricted`
- `area_memberships` table - Already tracks area access
- `space_memberships` table - Already tracks Space access (from SPACE_MEMBERSHIPS.md)

**Queries leverage existing schema:**
- Page count: `SELECT COUNT(*) FROM pages WHERE space_id = ? AND deleted_at IS NULL`
- Accessible pages: Join `pages` → `areas` → `area_memberships`
- Recently edited: `WHERE updated_by = ? ORDER BY updated_at DESC LIMIT 3`

---

## 9. Files to Create/Modify

### New Files (12 files)

| File | Purpose |
|------|---------|
| `src/lib/components/spaces/SpaceNavigation.svelte` | Icon-based navigation component |
| `src/lib/components/spaces/nav/TasksNavButton.svelte` | Tasks nav button with badge |
| `src/lib/components/spaces/nav/DocumentsNavButton.svelte` | Documents nav button |
| `src/lib/components/spaces/nav/PagesNavButton.svelte` | Pages nav button with count |
| `src/lib/components/spaces/nav/MembersNavButton.svelte` | Members nav button with count |
| `src/routes/spaces/[space]/pages/+page.svelte` | Pages dashboard view |
| `src/routes/spaces/[space]/pages/+page.ts` | Load function for pages data |
| `src/routes/api/spaces/[space]/pages/+server.ts` | API endpoint for Space pages |
| `src/lib/components/pages/RecentlyEditedSection.svelte` | Recently edited cards section |
| `src/lib/components/pages/AllPagesSection.svelte` | All pages grid section |
| `src/lib/components/pages/PageFilterBar.svelte` | Filter controls |
| `src/lib/components/pages/SelectAreaModal.svelte` | Area picker for new pages |

### Modified Files (4 files)

| File | Changes |
|------|---------|
| `src/lib/components/spaces/SpaceDashboard.svelte` | Replace text nav with `<SpaceNavigation>` component |
| `src/lib/stores/pages.svelte.ts` | Add `getPagesForSpace`, `getPageCountForSpace`, `getRecentlyEditedByUser`, `addPage`, `refreshPagesForSpace` |
| `src/lib/components/pages/PageCard.svelte` | Add ownership indicator ("Shared by X"), highlight prop for new pages |
| All page creation flows | Add optimistic `pageStore.addPage()` + navigate with `?created=` param |

---

## 10. Acceptance Criteria

### End-to-End User Flows

#### Flow 1: Discover Pages in a Space

**Steps:**
1. [ ] User logs in, navigates to Organization Space dashboard
2. [ ] User sees icon navigation: Tasks, Docs, Pages (📝 12), Members
3. [ ] User clicks Pages button
4. [ ] Lands on `/spaces/stratech/pages`
5. [ ] "Recently Edited by You" section shows 2 pages edited today
6. [ ] "All Pages" section shows 12 pages in grid layout
7. [ ] Page cards show: type icon, title, area badge, word count, timestamp
8. [ ] User clicks a page card → Opens page editor

**Expected:** Page discovery works without knowing which area contains pages

#### Flow 2: Filter Pages by Area

**Steps:**
1. [ ] User on pages dashboard (`/spaces/stratech/pages`)
2. [ ] User opens "Area" filter dropdown
3. [ ] Sees: All areas, General (3), Marketing (5), Product (4)
4. [ ] Selects "Marketing"
5. [ ] URL updates to `/spaces/stratech/pages?area=marketing`
6. [ ] Grid shows only 5 pages from Marketing area
7. [ ] User clicks "Clear Filters" → All 12 pages return

**Expected:** Filtering works, URL updates, results accurate

#### Flow 3: Create New Page from Space Dashboard

**Steps:**
1. [ ] User on pages dashboard
2. [ ] Clicks [+ New Page] button
3. [ ] Modal appears: "Which area should this page be created in?"
4. [ ] Sees list of accessible areas: General, Marketing, Product
5. [ ] Selects "Marketing"
6. [ ] Navigates to `/spaces/stratech/marketing/pages/new`
7. [ ] Page editor opens with Marketing area context
8. [ ] User creates page, saves
9. [ ] Redirects to `/spaces/stratech/pages?created={pageId}`
10. [ ] New page visible in grid with green pulse border
11. [ ] Toast shows: "Page created successfully"

**Expected:** No race condition; page appears immediately with highlight

#### Flow 4: Mobile Navigation

**Steps:**
1. [ ] User opens Space dashboard on mobile (320px width)
2. [ ] Nav shows icons only: ✓ 📄 📝 👥 (no labels)
3. [ ] Badges visible: 3, 12, 5
4. [ ] User taps Pages icon
5. [ ] Pages dashboard loads
6. [ ] Cards stack vertically (single column)
7. [ ] Filter bar dropdowns usable with touch
8. [ ] All interactions smooth (no hover dependencies)

**Expected:** Mobile experience fully functional

#### Flow 5: Guest User Limitations

**Steps:**
1. [ ] Guest user logs in (invited to 1 shared area)
2. [ ] Navigates to Space dashboard
3. [ ] Sees Pages icon with badge: 2 (only shared area pages)
4. [ ] Clicks Pages
5. [ ] Sees only 2 pages from the shared area
6. [ ] [+ New Page] button is disabled (Guest cannot create areas)
7. [ ] Guest can click and view existing pages

**Expected:** Guests see only what they have access to

### Component-Level Acceptance

#### SpaceNavigation Component

- [ ] Renders 4 buttons: Tasks, Documents, Pages, Members
- [ ] Shows count badges for Tasks, Pages, Members
- [ ] Icons from lucide-svelte render correctly
- [ ] Desktop: Icons + labels visible
- [ ] Mobile: Labels hidden, icons visible
- [ ] Hover tooltips work
- [ ] Click handlers navigate correctly
- [ ] Supports dark + light mode

#### Pages Dashboard

- [ ] Loads pages data on mount
- [ ] "Recently Edited" section visible if user has edits
- [ ] "Recently Edited" hidden if no edits
- [ ] Filter bar allows area/type/ownership filtering
- [ ] Search input filters titles client-side
- [ ] URL updates when filters change
- [ ] Grid responsive: 3 cols → 2 cols → 1 col
- [ ] Empty states render correctly

#### PageCard Component

- [ ] Shows type icon (FileEdit, Scale, Users)
- [ ] Shows lock icon if private
- [ ] Truncates long titles at 50 chars
- [ ] Displays area badge
- [ ] Shows word count (estimated)
- [ ] Shows relative timestamp ("3d ago")
- [ ] Shows "Shared by [Name]" if not owned by user
- [ ] Highlight animation plays for newly created pages
- [ ] 3-dot menu offers View/Share/Delete

#### SelectAreaModal

- [ ] Opens when [+ New Page] clicked
- [ ] Lists all accessible areas in Space
- [ ] Selecting area navigates to page editor
- [ ] Cancel closes modal without action
- [ ] Keyboard accessible (Tab, Enter, Escape)

### Performance Acceptance

- [ ] Page count badge loads in <200ms
- [ ] Pages dashboard initial load <1s (for <100 pages)
- [ ] Filter changes reflect in <500ms
- [ ] Search is instant (client-side, no debounce lag)
- [ ] Page creation + navigation + highlight <2s total
- [ ] Mobile 60fps scrolling (no jank)

### Accessibility Acceptance

- [ ] All buttons have aria-labels
- [ ] Tooltips appear on focus (not just hover)
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Screen readers announce counts
- [ ] Focus indicators visible (WCAG AA)
- [ ] Modal focus trapping works
- [ ] Color contrast meets WCAG AA

---

## Related Documents

- `DOCUMENT_SYSTEM.md` - Pages system architecture (data model unchanged)
- `DESIGN-SYSTEM.md` - UI patterns (buttons, badges, cards, modals)
- `SPACE_MEMBERSHIPS.md` - Access control (Space → Area → Page permissions)
- `stratai-conventions/SKILL.md` - Coding patterns (Svelte 5, postgres.js, icons)

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Icon navigation over text buttons | Scales to mobile, consistent with Area toolbar, modern aesthetic |
| Show count badge on Pages | Gives users sense of content volume, matches Tasks pattern |
| "Recently Edited by You" section | Quick access to active work, reduces "where was that page?" friction |
| Space-level = discovery, Area-level = context | Both access paths serve different needs; maintain both |
| Modal for area selection on new page | Makes data model explicit (pages belong to areas), prevents orphan confusion |
| 4-layer race condition defense | Critical UX; multiple redundant safeguards ensure reliability |
| No real-time updates (V1) | Adds complexity; manual refresh acceptable for initial release |
| Client-side search filtering | Fast for <100 pages; can move to server-side if performance degrades |
| 3 recently edited pages | Balance between usefulness and visual noise |
| Green pulse animation for new pages | Clear feedback that creation succeeded, draws eye to new content |

---

*Document Version: 1.0*
*Created: 2026-01-20*
*Author: Co-PM & Lead Developer*
*Status: Ready for PRD Creation & Ralph Loop*
