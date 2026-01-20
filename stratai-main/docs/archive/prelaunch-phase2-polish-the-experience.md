# Pre-Launch Phase 2: Polish the Experience

## Overview

Experience improvements that reduce friction and confusion for internal testers. These issues won't break the app, but they create a rough, unpolished feel that makes users question the product quality.

**Priority:** HIGH - Complete before wider internal testing
**Estimated Scope:** 5 user stories, ~3-4 hours implementation
**Dependencies:** Phase 1 must be completed first

## Problem Statement

After Phase 1 fixes, users can use the app without crashes, but they'll still encounter:

1. **Console noise** - 1,476+ `console.log` statements pollute browser console, expose internal logic, and impact performance.

2. **Jarring load transitions** - When spaces, areas, or conversations load, content goes blank then suddenly appears. No skeleton loaders.

3. **Confusing empty states** - New users see blank areas with no guidance. "Create your first area" CTAs are missing.

4. **Space deletion leaves orphans** - Deleting a space doesn't clean up areas, tasks, conversations. Database pollution and ghost references.

## User Impact

- **Unprofessional impression:** Console spam visible in dev tools
- **Perceived slowness:** Blank → content transitions feel slower than they are
- **User confusion:** Empty states provide no guidance on what to do next
- **Data integrity issues:** Orphaned records cause unexpected behavior over time

---

## User Stories

### US-001: Remove or Gate Console Logs

**As a** developer and user
**I need** clean console output in production
**So that** debugging is easier and internal logic isn't exposed

**Technical Context:**
- 1,476+ console.log statements found across codebase
- Heavy logging in: `/api/chat/+server.ts` (Plan Mode debug), model routing, stores
- SvelteKit has `$app/environment` with `dev` boolean for environment checks

**Files to Modify:**
Primary targets (highest log density):
- `src/routes/api/chat/+server.ts` - ~150+ logs (Plan Mode blocks, routing decisions)
- `src/routes/api/assist/+server.ts` - Assist request logging
- `src/lib/stores/chat.svelte.ts` - Sync and operation logging
- `src/lib/stores/spaces.svelte.ts` - CRUD operation logging
- `src/lib/stores/areas.svelte.ts` - CRUD operation logging

**Implementation Strategy:**

**Option A (Recommended): Create debug utility**
```typescript
// src/lib/utils/debug.ts
import { dev } from '$app/environment';

export function debugLog(category: string, ...args: unknown[]): void {
  if (dev) {
    console.log(`[${category}]`, ...args);
  }
}

export function debugWarn(category: string, ...args: unknown[]): void {
  if (dev) {
    console.warn(`[${category}]`, ...args);
  }
}

// Usage: debugLog('chat', 'Streaming started', conversationId);
```

**Option B: Remove non-essential logs entirely**
- Keep: `console.error()` for actual errors
- Remove: `console.log()` for routine operations
- Remove: Debug blocks like `========== PLAN MODE ACTIVE ==========`

**Acceptance Criteria:**
- [ ] Create `src/lib/utils/debug.ts` with `debugLog` and `debugWarn` functions
- [ ] Production builds have no routine console.log output
- [ ] `console.error()` calls preserved for actual errors
- [ ] At minimum, clean up the top 5 highest-density files listed above
- [ ] Plan Mode debug blocks removed or gated
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` produces clean build (verify with `NODE_ENV=production`)

---

### US-002: Add Loading Skeletons for Lists

**As a** user
**I need** visual feedback while content loads
**So that** I know the app is working, not frozen

**Technical Context:**
- Currently: Lists go blank during load, then content appears
- Affected: Spaces list, areas list, conversation sidebar
- Loading states exist in stores (`isLoading`) but aren't rendered
- Tailwind has animation utilities for skeleton pulse effect

**Files to Create:**
- `src/lib/components/skeletons/SkeletonCard.svelte` - Reusable skeleton card
- `src/lib/components/skeletons/SkeletonList.svelte` - List of skeleton items
- `src/lib/components/skeletons/SkeletonConversation.svelte` - Sidebar conversation skeleton
- `src/lib/components/skeletons/index.ts` - Barrel export

**Files to Modify:**
- `src/routes/spaces/+page.svelte` - Add skeleton while spaces load
- `src/lib/components/spaces/SpaceDashboard.svelte` - Add skeleton while areas load
- `src/lib/components/Sidebar.svelte` - Add skeleton while conversations load

**UX Specification:**

**SkeletonCard.svelte (for spaces/areas):**
```svelte
<!-- Mimics a card with icon, title, and description -->
<script lang="ts">
  interface Props {
    variant?: 'space' | 'area' | 'default';
  }
  let { variant = 'default' }: Props = $props();
</script>

<div class="animate-pulse p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
  <div class="flex items-start gap-3">
    <!-- Icon placeholder -->
    <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-700/70"></div>

    <div class="flex-1 min-w-0 space-y-2">
      <!-- Title placeholder -->
      <div class="h-4 bg-zinc-700/70 rounded-md w-3/4"></div>

      <!-- Description placeholder (2 lines) -->
      <div class="space-y-1.5">
        <div class="h-3 bg-zinc-700/50 rounded w-full"></div>
        <div class="h-3 bg-zinc-700/50 rounded w-2/3"></div>
      </div>
    </div>
  </div>
</div>
```

**SkeletonConversation.svelte (for sidebar):**
```svelte
<!-- Mimics a conversation item in sidebar -->
<div class="animate-pulse px-3 py-2">
  <div class="flex items-center gap-2">
    <!-- Message icon placeholder -->
    <div class="flex-shrink-0 w-4 h-4 rounded bg-zinc-700/50"></div>

    <!-- Title and preview -->
    <div class="flex-1 min-w-0 space-y-1.5">
      <div class="h-3.5 bg-zinc-700/70 rounded w-4/5"></div>
      <div class="h-2.5 bg-zinc-700/40 rounded w-3/5"></div>
    </div>
  </div>
</div>
```

**SkeletonList.svelte:**
```svelte
<script lang="ts">
  import SkeletonCard from './SkeletonCard.svelte';
  import SkeletonConversation from './SkeletonConversation.svelte';

  interface Props {
    count?: number;
    variant?: 'card' | 'conversation';
    gap?: 'sm' | 'md' | 'lg';
  }
  let { count = 3, variant = 'card', gap = 'md' }: Props = $props();

  const gapClass = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  }[gap];
</script>

<div class="flex flex-col {gapClass}">
  {#each Array(count) as _, i}
    {#if variant === 'conversation'}
      <SkeletonConversation />
    {:else}
      <SkeletonCard />
    {/if}
  {/each}
</div>
```

**Design Tokens Used:**
- Container: `bg-zinc-800/50 border-zinc-700/50 rounded-xl` (matches card style)
- Skeleton bars: `bg-zinc-700/70` for primary, `bg-zinc-700/50` for secondary
- Animation: `animate-pulse` (Tailwind built-in, subtle opacity pulse)
- Border radius: `rounded-md` for bars, `rounded-lg` for icon placeholder
- Spacing: `gap-3` between items, `space-y-2` for content

**Integration Pattern:**
```svelte
<!-- In spaces page -->
{#if spacesStore.isLoading}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each Array(6) as _}
      <SkeletonCard variant="space" />
    {/each}
  </div>
{:else if customSpaces.length === 0}
  <EmptyState ... />
{:else}
  {#each customSpaces as space}
    <SpaceCard {space} />
  {/each}
{/if}

<!-- In sidebar -->
{#if isLoadingConversations}
  <SkeletonList count={5} variant="conversation" gap="sm" />
{:else if conversations.length === 0}
  <EmptyState ... />
{:else}
  {#each conversations as conv}
    <ConversationItem {conv} />
  {/each}
{/if}
```

**Acceptance Criteria:**
- [ ] `SkeletonCard.svelte` created with exact structure above
- [ ] `SkeletonConversation.svelte` created for sidebar items
- [ ] `SkeletonList.svelte` created with variant prop
- [ ] `index.ts` exports all skeleton components
- [ ] Skeletons use `animate-pulse` for subtle loading effect
- [ ] Skeleton colors are `bg-zinc-700/70` and `bg-zinc-700/50`
- [ ] Spaces page shows 6 skeleton cards in grid while loading
- [ ] Space dashboard shows 3 skeleton cards while areas load
- [ ] Sidebar shows 5 skeleton conversations while loading
- [ ] No layout shift when real content replaces skeletons
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-003: Add Helpful Empty States with CTAs

**As a** new user
**I need** guidance when I have no content
**So that** I know what to do next

**Technical Context:**
- Empty states exist for some views (Tasks has "All clear!") but not consistently
- Missing: Spaces page with no custom spaces, areas in a space, conversations in an area
- `WelcomeScreen.svelte` partially handles empty chat state
- Reference pattern: `src/lib/components/chat/AreaWelcomeScreen.svelte`

**Files to Create:**
- `src/lib/components/EmptyState.svelte` - Reusable empty state component

**Files to Modify:**
- `src/routes/spaces/+page.svelte` - Empty state for no custom spaces
- `src/lib/components/spaces/SpaceDashboard.svelte` - Empty state for no areas
- `src/lib/components/Sidebar.svelte` - Empty state for no conversations

**UX Specification:**

**EmptyState.svelte (Reusable Component):**
```svelte
<script lang="ts">
  import type { ComponentType } from 'svelte';
  import { Plus } from 'lucide-svelte';

  interface Props {
    icon: ComponentType;
    iconColor?: string;  // Tailwind color class, e.g., 'text-primary-400'
    heading: string;
    description: string;
    ctaLabel?: string;
    onCtaClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
  }

  let {
    icon: Icon,
    iconColor = 'text-zinc-400',
    heading,
    description,
    ctaLabel,
    onCtaClick,
    size = 'md'
  }: Props = $props();

  const sizeClasses = {
    sm: { container: 'py-6 px-4', icon: 'w-10 h-10', iconBox: 'w-12 h-12', heading: 'text-base', desc: 'text-xs' },
    md: { container: 'py-10 px-6', icon: 'w-12 h-12', iconBox: 'w-16 h-16', heading: 'text-lg', desc: 'text-sm' },
    lg: { container: 'py-16 px-8', icon: 'w-14 h-14', iconBox: 'w-20 h-20', heading: 'text-xl', desc: 'text-sm' }
  };

  const s = sizeClasses[size];
</script>

<div class="flex flex-col items-center justify-center text-center {s.container}">
  <!-- Icon Container with subtle background -->
  <div class="{s.iconBox} rounded-2xl bg-zinc-800/50 border border-zinc-700/50
              flex items-center justify-center mb-4">
    <Icon class="{s.icon} {iconColor}" />
  </div>

  <!-- Heading -->
  <h3 class="{s.heading} font-semibold text-zinc-200 mb-2">
    {heading}
  </h3>

  <!-- Description -->
  <p class="{s.desc} text-zinc-400 max-w-xs leading-relaxed mb-5">
    {description}
  </p>

  <!-- CTA Button (optional) -->
  {#if ctaLabel && onCtaClick}
    <button
      onclick={onCtaClick}
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
             bg-primary-500 hover:bg-primary-600
             text-sm font-medium text-white
             transition-all duration-150"
    >
      <Plus class="w-4 h-4" />
      {ctaLabel}
    </button>
  {/if}
</div>
```

**Usage Examples:**

**No Custom Spaces (spaces page):**
```svelte
<script>
  import { Layers } from 'lucide-svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  let showSpaceModal = $state(false);
</script>

{#if customSpaces.length === 0}
  <EmptyState
    icon={Layers}
    iconColor="text-primary-400"
    heading="Create Your First Space"
    description="Spaces help you organize conversations by project or topic. Get started by creating one."
    ctaLabel="Create Space"
    onCtaClick={() => showSpaceModal = true}
    size="lg"
  />
{/if}
```

**No Areas in Space (space dashboard):**
```svelte
<script>
  import { LayoutGrid } from 'lucide-svelte';
</script>

{#if areas.length === 0}
  <EmptyState
    icon={LayoutGrid}
    iconColor="text-cyan-400"
    heading="Create Your First Area"
    description="Areas are focused contexts within your space. Each area maintains its own AI memory."
    ctaLabel="Create Area"
    onCtaClick={() => showAreaModal = true}
    size="md"
  />
{/if}
```

**No Conversations (sidebar - compact):**
```svelte
<script>
  import { MessageSquare } from 'lucide-svelte';
</script>

{#if conversations.length === 0}
  <EmptyState
    icon={MessageSquare}
    iconColor="text-zinc-500"
    heading="No conversations yet"
    description="Start a new chat to begin."
    ctaLabel="New Chat"
    onCtaClick={handleNewChat}
    size="sm"
  />
{/if}
```

**Design Tokens Used:**
- Icon container: `bg-zinc-800/50 border-zinc-700/50 rounded-2xl`
- Icon colors: `text-primary-400` (spaces), `text-cyan-400` (areas), `text-zinc-500` (sidebar)
- Heading: `font-semibold text-zinc-200`
- Description: `text-zinc-400 leading-relaxed`
- CTA button: `bg-primary-500 hover:bg-primary-600 text-white`
- Button icon: `Plus` from lucide-svelte
- Size variants for different contexts (sm for sidebar, lg for full pages)

**Icons to Use:**
- Spaces empty: `Layers` from lucide-svelte
- Areas empty: `LayoutGrid` from lucide-svelte
- Conversations empty: `MessageSquare` from lucide-svelte

**Acceptance Criteria:**
- [ ] `EmptyState.svelte` component created with exact structure above
- [ ] Component accepts `size` prop with 'sm', 'md', 'lg' variants
- [ ] Component accepts `iconColor` for contextual tinting
- [ ] Empty state shows on spaces page when no custom spaces exist (size="lg")
- [ ] Empty state shows in space dashboard when no areas exist (size="md")
- [ ] Empty state shows in sidebar when no conversations (size="sm")
- [ ] Each empty state uses appropriate icon from lucide-svelte
- [ ] CTAs are functional (open modals, trigger actions)
- [ ] CTA button uses `Plus` icon prefix
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-004: Implement Space Deletion Cascade

**As a** user
**I need** space deletion to clean up related data
**So that** I don't have orphaned areas and conversations

**Technical Context:**
- Current: Space soft-delete only marks space as deleted
- Orphaned: Areas, tasks, conversations, documents, space memberships remain
- Repository: `src/lib/server/persistence/spaces-postgres.ts`
- Related repos: `areas-postgres.ts`, `tasks-postgres.ts`, `conversations-postgres.ts`

**Files to Modify:**
- `src/lib/server/persistence/spaces-postgres.ts` - Add cascade logic to `delete()` method

**Files to Reference:**
- `src/lib/server/persistence/areas-postgres.ts` - Area deletion pattern
- `src/lib/server/persistence/tasks-postgres.ts` - Task deletion pattern

**Cascade Order (important for referential integrity):**
1. Soft delete all conversations in space's areas
2. Soft delete all tasks in space's areas
3. Soft delete all areas in space
4. Delete space memberships (hard delete - these are just access records)
5. Soft delete the space itself

**Implementation Pattern:**
```typescript
async delete(id: string, userId: string): Promise<void> {
  const space = await this.findById(id, userId);
  if (!space) throw new Error('Space not found');
  if (space.type === 'system') throw new Error('Cannot delete system spaces');

  // Start transaction for atomicity
  await sql.begin(async (tx) => {
    // 1. Get all areas in this space
    const areas = await tx`
      SELECT id FROM areas
      WHERE space_id = ${id} AND deleted_at IS NULL
    `;

    const areaIds = areas.map(a => a.id);

    if (areaIds.length > 0) {
      // 2. Soft delete conversations in these areas
      await tx`
        UPDATE conversations SET deleted_at = NOW()
        WHERE area_id = ANY(${areaIds}::uuid[]) AND deleted_at IS NULL
      `;

      // 3. Soft delete tasks in these areas
      await tx`
        UPDATE tasks SET deleted_at = NOW()
        WHERE area_id = ANY(${areaIds}::uuid[]) AND deleted_at IS NULL
      `;

      // 4. Soft delete areas
      await tx`
        UPDATE areas SET deleted_at = NOW()
        WHERE space_id = ${id} AND deleted_at IS NULL
      `;
    }

    // 5. Delete space memberships (hard delete)
    await tx`
      DELETE FROM space_memberships WHERE space_id = ${id}
    `;

    // 6. Soft delete space
    await tx`
      UPDATE spaces SET deleted_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `;
  });
}
```

**Acceptance Criteria:**
- [ ] Space deletion soft-deletes all areas in the space
- [ ] Space deletion soft-deletes all tasks in those areas
- [ ] Space deletion soft-deletes all conversations in those areas
- [ ] Space deletion hard-deletes space memberships
- [ ] Deletion is atomic (transaction - all or nothing)
- [ ] System spaces still cannot be deleted (existing check preserved)
- [ ] Only space owner can delete (existing check preserved)
- [ ] API returns count of deleted items: `{ areasDeleted, tasksDeleted, conversationsDeleted }`
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-005: Update Space Delete API to Return Cascade Info

**As a** user
**I need** to know what was deleted with my space
**So that** I understand the impact of my action

**Technical Context:**
- Frontend should show confirmation with deletion scope
- API should return counts of deleted items
- Existing pattern: `src/lib/components/spaces/DeleteConfirmModal.svelte`

**Files to Modify:**
- `src/routes/api/spaces/[id]/+server.ts` - Return cascade counts
- `src/lib/stores/spaces.svelte.ts` - Handle cascade info, show toast with counts
- `src/lib/components/spaces/DeleteConfirmModal.svelte` - Update to show cascade warning

**API Response Enhancement:**
```typescript
// DELETE /api/spaces/:id response
{
  success: true,
  deleted: {
    areas: 3,
    tasks: 12,
    conversations: 8
  }
}
```

**UX Specification:**

**DeleteConfirmModal.svelte Update:**
The existing modal should be enhanced to show cascade warning before deletion.

```svelte
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { AlertTriangle, Trash2 } from 'lucide-svelte';

  interface Props {
    spaceName: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting?: boolean;
  }

  let { spaceName, onConfirm, onCancel, isDeleting = false }: Props = $props();
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
  transition:fade={{ duration: 150 }}
  onclick={onCancel}
>
  <!-- Modal -->
  <div
    class="w-full max-w-md bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl"
    transition:fly={{ y: 20, duration: 200 }}
    onclick|stopPropagation
  >
    <!-- Header -->
    <div class="flex items-start gap-4 p-5 border-b border-zinc-700/50">
      <!-- Warning Icon -->
      <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/30
                  flex items-center justify-center">
        <AlertTriangle class="w-5 h-5 text-red-400" />
      </div>

      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold text-zinc-100">
          Delete "{spaceName}"?
        </h3>
        <p class="text-sm text-zinc-400 mt-1">
          This action cannot be undone.
        </p>
      </div>
    </div>

    <!-- Content -->
    <div class="p-5">
      <!-- Cascade Warning Box -->
      <div class="p-4 rounded-lg bg-red-500/8 border border-red-500/20">
        <p class="text-sm text-zinc-300 leading-relaxed">
          This will <span class="font-medium text-red-300">permanently delete</span> all content in this space, including:
        </p>
        <ul class="mt-3 space-y-1.5 text-sm text-zinc-400">
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-red-400/60"></span>
            All areas and their context
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-red-400/60"></span>
            All tasks and subtasks
          </li>
          <li class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-red-400/60"></span>
            All conversations and chat history
          </li>
        </ul>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3 p-4 border-t border-zinc-700/30 bg-zinc-900/50">
      <!-- Cancel -->
      <button
        onclick={onCancel}
        disabled={isDeleting}
        class="px-4 py-2 rounded-lg
               bg-zinc-800 hover:bg-zinc-700 border border-zinc-600
               text-sm font-medium text-zinc-200
               transition-all duration-150
               disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>

      <!-- Delete (Destructive) -->
      <button
        onclick={onConfirm}
        disabled={isDeleting}
        class="inline-flex items-center gap-2 px-4 py-2 rounded-lg
               bg-red-600 hover:bg-red-700
               text-sm font-medium text-white
               transition-all duration-150
               disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isDeleting}
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Deleting...
        {:else}
          <Trash2 class="w-4 h-4" />
          Delete Space
        {/if}
      </button>
    </div>
  </div>
</div>
```

**Design Tokens Used:**
- Modal background: `bg-zinc-900 border-zinc-700/50 rounded-xl`
- Backdrop: `bg-black/60 backdrop-blur-sm`
- Warning icon container: `bg-red-500/15 border-red-500/30`
- Warning icon: `AlertTriangle` in `text-red-400`
- Cascade warning box: `bg-red-500/8 border-red-500/20`
- Highlight text: `font-medium text-red-300`
- Bullet points: `bg-red-400/60` dots
- Cancel button: `bg-zinc-800 hover:bg-zinc-700 border-zinc-600`
- Delete button: `bg-red-600 hover:bg-red-700` (destructive)
- Spinner: Inline SVG with `animate-spin`
- Transitions: `fade` for backdrop, `fly` for modal

**Toast Message After Deletion:**
```typescript
// In spaces.svelte.ts after successful delete
const { deleted } = response;
const parts = [];
if (deleted.areas > 0) parts.push(`${deleted.areas} area${deleted.areas > 1 ? 's' : ''}`);
if (deleted.tasks > 0) parts.push(`${deleted.tasks} task${deleted.tasks > 1 ? 's' : ''}`);
if (deleted.conversations > 0) parts.push(`${deleted.conversations} conversation${deleted.conversations > 1 ? 's' : ''}`);

if (parts.length > 0) {
  toastStore.success(`Space deleted along with ${parts.join(', ')}.`);
} else {
  toastStore.success('Space deleted.');
}
```

**Acceptance Criteria:**
- [ ] DELETE endpoint returns `deleted: { areas, tasks, conversations }` counts
- [ ] Confirmation modal uses exact structure above
- [ ] Modal shows cascade warning with bullet list of what will be deleted
- [ ] Warning box uses `bg-red-500/8 border-red-500/20` styling
- [ ] Delete button is `bg-red-600` (destructive red)
- [ ] Delete button shows spinner with "Deleting..." during operation
- [ ] Cancel button uses secondary styling
- [ ] Modal closes on backdrop click (unless deleting)
- [ ] Toast shows human-readable counts: "Space deleted along with 3 areas, 12 tasks, 8 conversations."
- [ ] Toast shows "Space deleted." if no child items existed
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

## Technical Architecture

### Debug Utility Pattern

```
src/lib/utils/
├── debug.ts          ← NEW: Environment-gated logging
├── uuid.ts           ← Existing
└── colorGeneration.ts ← Existing
```

### Skeleton Component Pattern

```
src/lib/components/skeletons/
├── SkeletonCard.svelte   ← Generic card skeleton
├── SkeletonList.svelte   ← Renders multiple skeletons
└── index.ts              ← Barrel export
```

### Space Deletion Cascade Flow

```
User clicks "Delete Space"
        ↓
Confirmation modal shows with warning
        ↓
User confirms
        ↓
API: DELETE /api/spaces/:id
        ↓
Repository: Transaction starts
        ↓
[Cascade soft deletes in order]
        ↓
Repository: Transaction commits
        ↓
API: Returns cascade counts
        ↓
Frontend: Shows toast with counts
        ↓
Frontend: Removes space from store
```

---

## Non-Goals

This phase explicitly does NOT include:

- **Document deletion cascade** - Addressed in Phase 3
- **Mobile responsiveness** - Addressed in Phase 3
- **Chat error recovery UI** - Addressed in Phase 3
- **Optimistic locking** - Future enhancement
- **Undo for deletions** - Future enhancement
- **Bulk operations** - Future enhancement

---

## Testing Strategy

### Manual Testing Checklist

1. **Console Cleanup:**
   - Open browser dev tools console
   - Perform various operations (create space, chat, etc.)
   - Verify no routine logs appear
   - Verify errors still logged when they occur

2. **Loading Skeletons:**
   - Use network throttling (Slow 3G) in dev tools
   - Navigate to spaces page - verify skeleton shows
   - Open a space - verify area skeleton shows
   - Verify smooth transition to real content

3. **Empty States:**
   - Create new user or clear data
   - Navigate to spaces - verify empty state with CTA
   - Create space, verify area empty state
   - Verify CTAs work (open modals, trigger actions)

4. **Space Deletion Cascade:**
   - Create space with areas, tasks, conversations
   - Delete space
   - Verify confirmation modal shows warning
   - Confirm deletion
   - Verify toast shows cascade counts
   - Query database to confirm cascaded soft deletes

---

## Dependencies

- Phase 1 must be completed (toast integration)
- No external dependencies
- Database schema unchanged (using existing soft delete pattern)

---

## Rollback Plan

All changes are isolated:
- Debug utility: Remove import, revert to console.log
- Skeletons: Remove components, remove conditionals
- Empty states: Remove components
- Cascade: Revert to simple delete (data integrity issue, but recoverable)

No migrations to reverse.
