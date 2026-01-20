# Phase C: Navigation Redesign with Space Pinning

## Overview

As users accumulate spaces (their own + invited), the top navigation overflows. Users need a way to pin frequently-used spaces to the nav bar while accessing others via a dropdown.

**Goal:** Pinned spaces (max 6) in nav bar + "All Spaces" dropdown for full access.

---

## Current State

### Completed Prerequisites
- ✅ Phase 0: User schema has `first_name`/`last_name` columns
- ✅ Phase A: Space member management UI complete
- ⏳ Phase B: Name collision fix (shows invited spaces as "Name (Owner)")

### What's Missing
- No `is_pinned` column on spaces or space_memberships
- No "All Spaces" dropdown component
- No pinning/unpinning UI or API
- Nav shows ALL spaces in tabs (overflows with many spaces)

---

## Problem Statement

```
User with 13 spaces - Current Navigation:
[Work] [Research] [Personal] [Client A] [Client B] [Project X] [Project Y] [Team] [Archive] [Sandbox] [Test] [Demo] [Shared]
                                                                                          ↑ OVERFLOW! 😱
```

## Solution

```
User with 13 spaces - After Fix:
[Work] [Research] [Client A] [Project X] [Team] [⋯ All]
  ↑ pinned (max 6)                              ↑ dropdown with all spaces
```

---

## Visual Design

### Nav Bar (Pinned Spaces)
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏠  [Work] [StraTech] [Client X] [⋯]                    🔍  👤     │
│       ↑ pinned  ↑ pinned   ↑ pinned  ↑ "All" dropdown              │
└─────────────────────────────────────────────────────────────────────┘
```

### "All Spaces" Dropdown
```
┌─────────────────────────────────────────┐
│ PINNED TO NAV                           │
│ ┌─────────────────────────────────────┐ │
│ │ ⭐ Work                          ✕  │ │  ← ✕ unpins
│ │ ⭐ StraTech Group                ✕  │ │
│ │ ⭐ Client X (Sarah)              ✕  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ YOUR SPACES                             │
│   Research                         📌  │  ← 📌 pins
│   Personal                         📌  │
│   Random                           📌  │
│                                         │
│ SHARED WITH YOU                         │
│   SPUR (Sarah)                     📌  │
│   Golf Day (Mike)                  📌  │
│                                         │
│ ──────────────────────────────────────  │
│ Maximum 6 pinned • 3 remaining          │
└─────────────────────────────────────────┘
```

---

## Technical Requirements

### 1. Database Migration

**File:** `src/lib/server/persistence/migrations/032-space-pinning.sql`

```sql
-- For owned spaces: pin status stored on spaces table
ALTER TABLE spaces ADD COLUMN is_pinned BOOLEAN DEFAULT true;

-- For invited spaces: pin status stored on space_memberships
ALTER TABLE space_memberships ADD COLUMN is_pinned BOOLEAN DEFAULT false;

-- Optional: custom display name override for power users
ALTER TABLE space_memberships ADD COLUMN display_alias VARCHAR(100);

-- Index for efficient pinned space queries
CREATE INDEX idx_spaces_pinned ON spaces(user_id, is_pinned) 
    WHERE deleted_at IS NULL AND is_pinned = true;

CREATE INDEX idx_space_memberships_pinned ON space_memberships(user_id, is_pinned)
    WHERE is_pinned = true;
```

### 2. Type Updates

**File:** `src/lib/types/spaces.ts`

```typescript
export interface Space {
  // ... existing fields ...
  
  // Pinning (added in migration 032)
  isPinned?: boolean;
}

export interface SpaceRow {
  // ... existing fields ...
  isPinned: boolean | null;
}
```

**File:** `src/lib/types/space-memberships.ts`

```typescript
export interface SpaceMembership {
  // ... existing fields ...
  
  // Pinning for invited spaces
  isPinned?: boolean;
  displayAlias?: string | null;
}
```

### 3. API Endpoints

**File:** `src/routes/api/spaces/[id]/pin/+server.ts`

```typescript
// POST /api/spaces/{id}/pin
// Pins a space to nav (respects max 6 limit)
export const POST: RequestHandler = async ({ params, locals }) => {
  // Check current pinned count
  // If < 6, pin the space
  // Return updated space or error
};
```

**File:** `src/routes/api/spaces/[id]/unpin/+server.ts`

```typescript
// POST /api/spaces/{id}/unpin
// Unpins a space from nav
export const POST: RequestHandler = async ({ params, locals }) => {
  // Unpin the space
  // Return updated space
};
```

### 4. Repository Updates

**File:** `src/lib/server/persistence/spaces-postgres.ts`

Add pin/unpin methods:

```typescript
async pinSpace(spaceId: string, userId: string): Promise<Space | null> {
  // For owned spaces: UPDATE spaces SET is_pinned = true
  // For invited spaces: UPDATE space_memberships SET is_pinned = true
}

async unpinSpace(spaceId: string, userId: string): Promise<Space | null> {
  // For owned spaces: UPDATE spaces SET is_pinned = false
  // For invited spaces: UPDATE space_memberships SET is_pinned = false
}

async getPinnedCount(userId: string): Promise<number> {
  // Count pinned owned spaces + pinned memberships
}
```

### 5. Store Updates

**File:** `src/lib/stores/spaces.svelte.ts`

```typescript
// State
let pinnedSpaces = $derived(
  allSpaces.filter(s => s.isPinned).slice(0, 6)
);
let unpinnedOwnedSpaces = $derived(
  allSpaces.filter(s => !s.isPinned && s.userId === currentUserId)
);
let unpinnedSharedSpaces = $derived(
  allSpaces.filter(s => !s.isPinned && s.userId !== currentUserId)
);

// Actions
async function pinSpace(spaceId: string): Promise<boolean> {
  if (pinnedSpaces.length >= 6) {
    lastError = 'Maximum 6 pinned spaces. Unpin one first.';
    return false;
  }
  // Call API, update local state
}

async function unpinSpace(spaceId: string): Promise<boolean> {
  // Call API, update local state
}
```

### 6. New Components

**File:** `src/lib/components/spaces/AllSpacesDropdown.svelte`

```svelte
<script lang="ts">
  import { spacesStore } from '$lib/stores/spaces.svelte';
  import { Pin, X, ChevronDown } from 'lucide-svelte';
  
  let open = $state(false);
  
  const { pinnedSpaces, unpinnedOwnedSpaces, unpinnedSharedSpaces } = spacesStore;
  const maxPinned = 6;
  const canPinMore = $derived(pinnedSpaces.length < maxPinned);
</script>

<div class="dropdown">
  <button onclick={() => open = !open}>
    <ChevronDown size={16} />
    All
  </button>
  
  {#if open}
    <div class="dropdown-content">
      <!-- PINNED SECTION -->
      <section>
        <h4>PINNED TO NAV</h4>
        {#each pinnedSpaces as space}
          <div class="space-row pinned">
            <span>⭐ {getSpaceDisplayName(space, currentUserId)}</span>
            <button onclick={() => spacesStore.unpinSpace(space.id)}>
              <X size={14} />
            </button>
          </div>
        {/each}
      </section>
      
      <!-- YOUR SPACES SECTION -->
      {#if unpinnedOwnedSpaces.length > 0}
        <section>
          <h4>YOUR SPACES</h4>
          {#each unpinnedOwnedSpaces as space}
            <div class="space-row">
              <span>{space.name}</span>
              <button 
                onclick={() => spacesStore.pinSpace(space.id)}
                disabled={!canPinMore}
                title={canPinMore ? 'Pin to nav' : 'Unpin a space first'}
              >
                <Pin size={14} />
              </button>
            </div>
          {/each}
        </section>
      {/if}
      
      <!-- SHARED WITH YOU SECTION -->
      {#if unpinnedSharedSpaces.length > 0}
        <section>
          <h4>SHARED WITH YOU</h4>
          {#each unpinnedSharedSpaces as space}
            <div class="space-row">
              <span>{getSpaceDisplayName(space, currentUserId)}</span>
              <button 
                onclick={() => spacesStore.pinSpace(space.id)}
                disabled={!canPinMore}
              >
                <Pin size={14} />
              </button>
            </div>
          {/each}
        </section>
      {/if}
      
      <!-- FOOTER -->
      <footer>
        Maximum {maxPinned} pinned • {maxPinned - pinnedSpaces.length} remaining
      </footer>
    </div>
  {/if}
</div>
```

**File:** `src/lib/components/spaces/SpaceNavTabs.svelte`

```svelte
<script lang="ts">
  import { spacesStore } from '$lib/stores/spaces.svelte';
  import AllSpacesDropdown from './AllSpacesDropdown.svelte';
  
  const { pinnedSpaces } = spacesStore;
</script>

<nav class="space-tabs">
  {#each pinnedSpaces as space}
    <a 
      href="/spaces/{space.slug}"
      class="tab"
      class:active={currentSpaceId === space.id}
      oncontextmenu={(e) => showUnpinMenu(e, space)}
    >
      {getSpaceDisplayName(space, currentUserId)}
    </a>
  {/each}
  
  <AllSpacesDropdown />
</nav>
```

### 7. Header Integration

**File:** `src/lib/components/layout/Header.svelte`

Replace current space tabs with new components:

```svelte
<!-- Before -->
{#each spaces as space}
  <TabItem>{space.name}</TabItem>
{/each}

<!-- After -->
<SpaceNavTabs {currentSpaceId} {currentUserId} />
```

---

## Auto-Pin Rules

| Event | Action |
|-------|--------|
| User creates a new space | `spaces.is_pinned = true` |
| User joins an organization | Org space membership `is_pinned = true` |
| User invited to a space | `space_memberships.is_pinned = false` |
| Pinned count reaches 6 | Block further pins with error message |

### Cold Start Scenario
```
New user joins StraTech org:
  → Personal "Work" space created: AUTO-PINNED ✓
  → Org "StraTech Group" space: AUTO-PINNED ✓
  → Gets invited to "Client Project": starts UNPINNED

Nav shows: [Work] [StraTech Group] [⋯ All]
```

---

## Files to Create

| File | Description | Est. Lines |
|------|-------------|------------|
| `migrations/032-space-pinning.sql` | DB schema changes | ~25 |
| `src/routes/api/spaces/[id]/pin/+server.ts` | Pin endpoint | ~50 |
| `src/routes/api/spaces/[id]/unpin/+server.ts` | Unpin endpoint | ~40 |
| `src/lib/components/spaces/AllSpacesDropdown.svelte` | Dropdown UI | ~250 |
| `src/lib/components/spaces/SpaceNavTabs.svelte` | Nav tabs | ~100 |

## Files to Modify

| File | Changes | Est. Effort |
|------|---------|-------------|
| `src/lib/types/spaces.ts` | Add isPinned | Small |
| `src/lib/types/space-memberships.ts` | Add isPinned, displayAlias | Small |
| `src/lib/server/persistence/spaces-postgres.ts` | Add pin/unpin methods, update queries | Medium |
| `src/lib/stores/spaces.svelte.ts` | Add pin/unpin actions, derived states | Medium |
| `src/lib/components/layout/Header.svelte` | Replace tabs with SpaceNavTabs | Medium |

---

## Acceptance Criteria

### Core Pinning Functionality
- [ ] Pinned spaces appear as tabs in nav bar
- [ ] Maximum 6 pinned spaces enforced
- [ ] "All" button opens dropdown with all spaces
- [ ] Dropdown shows PINNED section at top with ✕ (unpin) buttons
- [ ] Dropdown shows unpinned spaces organized by YOUR SPACES / SHARED WITH YOU
- [ ] Unpinned spaces have 📌 (pin) buttons
- [ ] Footer shows "Maximum 6 pinned • N remaining"

### Pin/Unpin Actions
- [ ] Click 📌 pins the space (appears in nav immediately)
- [ ] Click ✕ unpins the space (removed from nav immediately)
- [ ] When at max, 📌 buttons disabled with tooltip "Unpin a space first"
- [ ] Toast notification on pin/unpin success

### Auto-Pin Rules
- [ ] New personal spaces auto-pin on creation
- [ ] Org space auto-pins when user joins org
- [ ] Invited spaces start unpinned
- [ ] Auto-pin respects the max 6 limit (oldest unpins if needed? or skip auto-pin?)

### Right-Click Unpin (Power User)
- [ ] Right-click on pinned tab shows context menu with "Unpin from navigation"
- [ ] Mobile long-press triggers same context menu

### Edge Cases
- [ ] User with 0 spaces sees empty dropdown (with helpful message)
- [ ] User with 1-6 spaces: all auto-pinned, dropdown still accessible
- [ ] User with 7+ spaces: first 6 pinned, rest in dropdown
- [ ] Deleting a pinned space removes it from nav
- [ ] Leaving a shared space removes it from nav (if pinned)

### Database
- [ ] Migration adds is_pinned columns with correct defaults
- [ ] Owned spaces use `spaces.is_pinned`
- [ ] Invited spaces use `space_memberships.is_pinned`
- [ ] Indexes created for efficient pinned queries

### Quality Gates
- [ ] `npm run check` passes (TypeScript)
- [ ] `npm run lint` passes (ESLint)
- [ ] `npm run audit-db-access` shows 0 new violations

---

## Styling Notes

### Dropdown Styling
- Match existing dropdown patterns in codebase
- Use CSS variables for colors
- Smooth open/close animation
- Click outside to close
- Escape key to close

### Section Headers
- Uppercase, smaller font, muted color
- Similar to category headers elsewhere in UI

### Pin/Unpin Buttons
- Icon-only buttons
- Hover state with background
- Disabled state with reduced opacity
- Tooltip on hover

### Footer
- Muted text, smaller font
- Sticky at bottom of dropdown

---

## Testing Notes

### Manual Test Scenarios

1. **Basic pinning flow**
   - Create 8 spaces
   - Verify first 6 are auto-pinned
   - Verify 7th and 8th are in dropdown unpinned
   - Pin 7th → fails (at max)
   - Unpin 6th → verify removed from nav
   - Pin 7th → succeeds, appears in nav

2. **Invited spaces**
   - User A invites User B to a space
   - B sees it in "SHARED WITH YOU" section, unpinned
   - B can pin it (uses space_memberships.is_pinned)

3. **Org spaces**
   - User joins org
   - Org space auto-pins
   - Shows in PINNED section, no owner suffix

4. **Right-click unpin**
   - Right-click on pinned tab
   - Context menu appears
   - Click "Unpin" → space moves to dropdown

---

## Dependencies

- **Phase 0** (User Schema) - Required for owner info
- **Phase B** (Name Collision) - Required for `getSpaceDisplayName()` in dropdown

## Estimated Effort

**2-3 days** (as per master plan)

- Migration + types: 2-3 hours
- API endpoints: 3-4 hours
- Repository methods: 2-3 hours
- Store updates: 2-3 hours
- AllSpacesDropdown component: 4-5 hours
- SpaceNavTabs component: 2-3 hours
- Header integration: 2-3 hours
- Testing & polish: 3-4 hours

---

## Related Documentation

- `docs/features/space-member-management-ui.md` - Master plan
- `docs/features/phase-b-name-collision-fix.md` - Prerequisite (getSpaceDisplayName)
- `docs/database/SCHEMA_REFERENCE.md` - spaces table, space_memberships table
- `src/lib/components/layout/Header.svelte` - Current nav implementation

