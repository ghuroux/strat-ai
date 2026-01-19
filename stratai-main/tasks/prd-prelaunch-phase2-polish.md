# PRD: Pre-Launch Phase 2 - Polish the Experience

## Overview

Experience improvements that reduce friction and confusion for internal testers. These issues won't break the app, but they create a rough, unpolished feel that makes users question the product quality.

**Priority:** HIGH - Complete before wider internal testing
**Estimated Scope:** 8 user stories, ~3-4 hours implementation
**Dependencies:** Phase 1 must be completed first

## Research Findings

**Similar patterns found:**
- `src/lib/components/areas/EmptyMemberState.svelte` - Existing empty state pattern (uses scoped CSS)
- `src/lib/stores/spaces.svelte.ts` - Has `isLoading` state pattern
- `src/lib/components/spaces/DeleteConfirmModal.svelte` - Task deletion modal pattern
- `src/lib/components/layout/Sidebar.svelte` - Inline empty state (lines 259-293)

**Codebase findings:**
- Console log count: 265 occurrences across 23 files (lower than spec estimate)
- No skeleton components exist yet
- No debug utility exists yet
- Space delete has no cascade logic currently

## Goals

- Clean console output in production (no routine logs)
- Smooth loading transitions with skeleton placeholders
- Helpful empty states that guide users to create content
- Proper data cleanup when spaces are deleted

---

## User Stories

### US-001: Create debug utility for environment-gated logging

**Description:** As a developer, I need a debug utility that gates console output by environment so that production builds have clean console output while development retains useful debugging information.

**What to do:**
- Create `src/lib/utils/debug.ts` file
- Implement `debugLog(category, ...args)` function
- Implement `debugWarn(category, ...args)` function
- Use `dev` from `$app/environment` to gate output
- Format output as `[category] ...args`

**Files:**
- `src/lib/utils/debug.ts` (create)

**Acceptance Criteria:**
- [ ] Create src/lib/utils/debug.ts with debugLog and debugWarn functions
- [ ] Functions use $app/environment dev boolean to gate output
- [ ] debugLog accepts category string and spread args
- [ ] debugWarn accepts category string and spread args
- [ ] Output format is [category] followed by args
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-002: Clean up console.log in high-density files

**Description:** As a developer, I need to remove or gate console.log statements in the highest-density files so that production console output is clean and internal logic is not exposed.

**What to do:**
- Import debugLog from the new utility
- Replace routine console.log calls with debugLog
- Remove Plan Mode debug blocks or gate them
- Preserve console.error for actual errors

**Files:**
- `src/routes/api/chat/+server.ts`
- `src/routes/api/assist/+server.ts`
- `src/lib/stores/chat.svelte.ts`
- `src/lib/stores/spaces.svelte.ts`
- `src/lib/stores/areas.svelte.ts`

**Acceptance Criteria:**
- [ ] src/routes/api/chat/+server.ts - Plan Mode debug blocks removed or gated with debugLog
- [ ] src/routes/api/assist/+server.ts - routine logs removed or gated
- [ ] src/lib/stores/chat.svelte.ts - sync/operation logs gated or removed
- [ ] src/lib/stores/spaces.svelte.ts - CRUD logs gated or removed
- [ ] src/lib/stores/areas.svelte.ts - CRUD logs gated or removed
- [ ] console.error calls preserved for actual errors
- [ ] npm run check passes
- [ ] npm run lint passes
- [ ] npm run build produces clean build

---

### US-003: Create skeleton loading components

**Description:** As a user, I need visual feedback while content loads so that I know the app is working, not frozen.

**What to do:**
- Create `src/lib/components/skeletons/` directory
- Create SkeletonCard.svelte with card-like placeholder
- Create SkeletonConversation.svelte for sidebar items
- Create SkeletonList.svelte to render multiple skeletons
- Create index.ts barrel export

**Files:**
- `src/lib/components/skeletons/SkeletonCard.svelte` (create)
- `src/lib/components/skeletons/SkeletonConversation.svelte` (create)
- `src/lib/components/skeletons/SkeletonList.svelte` (create)
- `src/lib/components/skeletons/index.ts` (create)

**Acceptance Criteria:**
- [ ] Create src/lib/components/skeletons/SkeletonCard.svelte with animate-pulse animation
- [ ] SkeletonCard has icon placeholder (w-10 h-10), title placeholder, and 2-line description placeholder
- [ ] Create src/lib/components/skeletons/SkeletonConversation.svelte for sidebar items
- [ ] SkeletonConversation has message icon placeholder (w-4 h-4), title, and preview line
- [ ] Create src/lib/components/skeletons/SkeletonList.svelte with count and variant props
- [ ] SkeletonList accepts variant='card' or variant='conversation'
- [ ] SkeletonList accepts gap='sm'|'md'|'lg' prop
- [ ] Create src/lib/components/skeletons/index.ts barrel export
- [ ] Skeleton colors use bg-zinc-700/70 for primary, bg-zinc-700/50 for secondary
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-004: Integrate skeleton loaders into list views

**Description:** As a user, I need to see skeleton placeholders while spaces, areas, and conversations load so that page transitions feel smooth.

**What to do:**
- Import skeleton components into target files
- Add conditional rendering based on isLoading states
- Match skeleton grid layout to real content layout

**Files:**
- `src/routes/spaces/+page.svelte`
- `src/lib/components/spaces/SpaceDashboard.svelte`
- `src/lib/components/layout/Sidebar.svelte`

**Acceptance Criteria:**
- [ ] src/routes/spaces/+page.svelte shows 6 SkeletonCard items in grid while spacesStore.isLoading is true
- [ ] src/lib/components/spaces/SpaceDashboard.svelte shows 3 SkeletonCard items while areas load
- [ ] src/lib/components/layout/Sidebar.svelte shows 5 SkeletonConversation items while conversations load
- [ ] Skeleton grid matches real content grid layout (no layout shift)
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-005: Create reusable EmptyState component

**Description:** As a new user, I need guidance when I have no content so that I know what to do next.

**What to do:**
- Create `src/lib/components/EmptyState.svelte`
- Implement size variants (sm, md, lg)
- Support customizable icon, colors, heading, description
- Optional CTA button with Plus icon

**Files:**
- `src/lib/components/EmptyState.svelte` (create)

**Acceptance Criteria:**
- [ ] Create src/lib/components/EmptyState.svelte with props: icon, iconColor, heading, description, ctaLabel, onCtaClick, size
- [ ] Component accepts size prop with 'sm'|'md'|'lg' variants
- [ ] sm variant uses py-6, w-10 icon, text-base heading, text-xs description
- [ ] md variant uses py-10, w-12 icon, text-lg heading, text-sm description
- [ ] lg variant uses py-16, w-14 icon, text-xl heading, text-sm description
- [ ] Icon container uses bg-zinc-800/50 border-zinc-700/50 rounded-2xl
- [ ] CTA button shows Plus icon from lucide-svelte and uses bg-primary-500 hover:bg-primary-600
- [ ] CTA button and onCtaClick are optional (component works without them)
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-006: Add empty states to spaces and areas views

**Description:** As a new user, I need helpful empty states with CTAs in the spaces page, space dashboard, and sidebar so I understand how to get started.

**What to do:**
- Import EmptyState component into target files
- Add conditional rendering when lists are empty
- Wire up CTA buttons to appropriate actions

**Files:**
- `src/routes/spaces/+page.svelte`
- `src/lib/components/spaces/SpaceDashboard.svelte`
- `src/lib/components/layout/Sidebar.svelte`

**Acceptance Criteria:**
- [ ] src/routes/spaces/+page.svelte shows EmptyState with Layers icon when no custom spaces (size=lg)
- [ ] Spaces empty state heading is 'Create Your First Space'
- [ ] Spaces empty state CTA opens create space modal
- [ ] src/lib/components/spaces/SpaceDashboard.svelte shows EmptyState with LayoutGrid icon when no areas (size=md)
- [ ] Areas empty state heading is 'Create Your First Area'
- [ ] Areas empty state CTA triggers onCreateArea callback
- [ ] src/lib/components/layout/Sidebar.svelte shows EmptyState with MessageSquare icon when no conversations (size=sm)
- [ ] Sidebar empty state heading is 'No conversations yet'
- [ ] Sidebar empty state CTA triggers onNewChat callback
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-007: Implement space deletion cascade in repository

**Description:** As a user, I need space deletion to clean up related data so that I don't have orphaned areas, tasks, and conversations polluting my database.

**What to do:**
- Modify `spaces-postgres.ts` delete method
- Add transaction with sql.begin
- Cascade soft-deletes in correct order
- Hard delete space_memberships
- Return deletion counts

**Files:**
- `src/lib/server/persistence/spaces-postgres.ts`

**Acceptance Criteria:**
- [ ] src/lib/server/persistence/spaces-postgres.ts delete method updated to cascade
- [ ] Deletion uses sql.begin transaction for atomicity
- [ ] Within transaction: get all area IDs for the space
- [ ] Soft delete all conversations where area_id is in the area IDs list
- [ ] Soft delete all tasks where area_id is in the area IDs list
- [ ] Soft delete all areas where space_id matches
- [ ] Hard delete all space_memberships where space_id matches
- [ ] Soft delete the space itself
- [ ] Method returns counts: { areasDeleted, tasksDeleted, conversationsDeleted }
- [ ] System spaces still cannot be deleted (existing check preserved)
- [ ] Only space owner can delete (existing authorization preserved)
- [ ] npm run check passes
- [ ] npm run lint passes

---

### US-008: Update space delete API and frontend to show cascade info

**Description:** As a user, I need to see what will be deleted with my space and get confirmation so that I understand the impact of my action.

**What to do:**
- Update DELETE API to return cascade counts
- Create DeleteSpaceModal.svelte component
- Update spaces store to handle new response
- Show toast with deletion summary

**Files:**
- `src/routes/api/spaces/[id]/+server.ts`
- `src/lib/components/spaces/DeleteSpaceModal.svelte` (create)
- `src/lib/stores/spaces.svelte.ts`

**Acceptance Criteria:**
- [ ] src/routes/api/spaces/[id]/+server.ts DELETE returns { success: true, deleted: { areas, tasks, conversations } }
- [ ] Create src/lib/components/spaces/DeleteSpaceModal.svelte (new component for space deletion)
- [ ] Modal shows space name being deleted
- [ ] Modal shows cascade warning box with bg-red-500/8 border-red-500/20 styling
- [ ] Warning lists: all areas and their context, all tasks and subtasks, all conversations
- [ ] Delete button uses bg-red-600 hover:bg-red-700 destructive styling
- [ ] Delete button shows spinner with 'Deleting...' text during operation
- [ ] Cancel button uses secondary styling bg-zinc-800 hover:bg-zinc-700
- [ ] Modal backdrop uses bg-black/60 backdrop-blur-sm
- [ ] src/lib/stores/spaces.svelte.ts deleteSpace shows toast with cascade counts
- [ ] Toast format: 'Space deleted along with X areas, Y tasks, Z conversations.' or 'Space deleted.' if no children
- [ ] npm run check passes
- [ ] npm run lint passes

---

## Non-Goals

This phase explicitly does NOT include:
- Document deletion cascade (Phase 3)
- Mobile responsiveness (Phase 3)
- Chat error recovery UI (Phase 3)
- Optimistic locking (future)
- Undo for deletions (future)
- Bulk operations (future)

---

## Technical Considerations

- Uses Tailwind CSS for consistent styling
- Follows postgres.js camelCase conventions (see DATABASE_STANDARDIZATION_PROJECT.md)
- Loading states already exist in stores (isLoading property)
- Existing DeleteConfirmModal is for tasks, need separate one for spaces
- sql.begin for transaction atomicity in cascade delete

---

## Dependency Graph

```
US-001 (debug utility) ─────────────┐
                                    ├─> US-002 (clean up logs)
                                    │
US-003 (skeleton components) ───────┼─> US-004 (integrate skeletons)
                                    │
US-005 (EmptyState component) ──────┼─> US-006 (add empty states)
                                    │
US-007 (cascade delete logic) ──────┴─> US-008 (API + frontend)
```

Parallel execution possible for: US-001, US-003, US-005, US-007
