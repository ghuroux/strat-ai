# Space Member Management UI

## Overview

Add UI for managing Space members, following the exact patterns established in Area sharing. The backend APIs already exist - this is primarily a frontend implementation.

**Goal:** Allow Space owners/admins to invite users/groups to a Space so they can then be shared Areas within that Space.

---

## Current State

### Backend (Already Complete)
| Component | Status |
|-----------|--------|
| `space_memberships` table | Done |
| `space-memberships-postgres.ts` repository | Done |
| `space-memberships.ts` types | Done |
| `GET /api/spaces/[id]/members` | Done |
| `POST /api/spaces/[id]/members` | Done |
| `GET /api/spaces/[id]/members/search` | Done |
| `PATCH /api/spaces/[id]/members/[memberId]` | Done |
| `DELETE /api/spaces/[id]/members/[memberId]` | Done |

### Frontend (Needed)
| Component | Status |
|-----------|----------|
| `ShareSpaceModal.svelte` | **TODO** |
| `SpaceMemberSearchInput.svelte` | **TODO** |
| `SpaceMemberList.svelte` | **TODO** |
| `SpaceRoleBadge.svelte` | **TODO** |
| `SpaceRoleSelector.svelte` | **TODO** |
| Entry point in Space header | **TODO** |
| `spaces.svelte.ts` store updates | **TODO** |

---

## Design Principles

1. **Mirror Area Sharing UI** - Exact same patterns, components, and styling
2. **Consistent role colors** - Use same CSS variables from app.css
3. **Mobile-first** - Full-screen modal on mobile
4. **Keyboard accessible** - Escape to close, arrow navigation in search

---

## Master Implementation Plan

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: User Schema (first_name, last_name)    [0.5 day]   │
│   → Foundation for name collision fix                       │
├─────────────────────────────────────────────────────────────┤
│ Phase A: Space Member Management UI             [4-5 days]  │
│   → Core sharing functionality (this document)              │
├─────────────────────────────────────────────────────────────┤
│ Phase B: Name Collision Fix                     [1 day]     │
│   → Display "Space (FirstName)" for invited spaces          │
├─────────────────────────────────────────────────────────────┤
│ Phase C: Nav Redesign with Pinning              [2-3 days]  │
│   → Pinned spaces + "All" dropdown                          │
│   → Auto-pin logic                                          │
└─────────────────────────────────────────────────────────────┘
```

---

# Phase 0: User Schema Migration

## Problem
Current schema has `display_name` but no `first_name`/`last_name`. We need first names for the "Space (FirstName)" display pattern.

## Database Migration

**File:** `migrations/030-user-first-last-name.sql`

```sql
-- Add first_name and last_name columns
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Migrate existing display_name data
-- Split "Gabriel Roux" → first: "Gabriel", last: "Roux"
UPDATE users
SET
  first_name = SPLIT_PART(display_name, ' ', 1),
  last_name = CASE
    WHEN POSITION(' ' IN display_name) > 0
    THEN SUBSTRING(display_name FROM POSITION(' ' IN display_name) + 1)
    ELSE NULL
  END
WHERE display_name IS NOT NULL;

-- Create index for name lookups
CREATE INDEX idx_users_first_name ON users(first_name);
```

## Code Updates

1. **User type** (`src/lib/types/user.ts`):
   - Add `firstName: string`
   - Add `lastName: string`
   - Keep `displayName` as computed: `${firstName} ${lastName}`

2. **Registration form**: Add first/last name fields
3. **Profile settings**: Add first/last name editing
4. **User repository**: Update to handle new columns

## Decision
- `display_name` becomes **computed** from first+last (auto-generated)
- Simplifies the model, avoids divergence

---

# Phase A: Space Member Management UI

## A.1: Store Layer (0.5 day)

**File:** `src/lib/stores/spaces.svelte.ts`

Add member management functions:

```typescript
// State
let membersBySpaceId = $state<Map<string, SpaceMembershipWithUser[]>>(new Map());
let memberLoadingStates = $state<Map<string, boolean>>(new Map());
let lastError = $state<string | null>(null);
let lastErrorData = $state<{ code: string; [key: string]: any } | null>(null);

// Actions
async function loadMembers(spaceId: string): Promise<void>;
async function addMember(spaceId: string, input: AddMemberInput): Promise<boolean>;
async function removeMember(spaceId: string, memberId: string): Promise<boolean>;
async function updateMemberRole(spaceId: string, memberId: string, role: SpaceRole): Promise<boolean>;

// Getters
function getMembersForSpace(spaceId: string): SpaceMembershipWithUser[];
function isMemberLoading(spaceId: string): boolean;
```

**Acceptance Tests:**
- [ ] loadMembers fetches from API and stores in map
- [ ] addMember calls POST API, refreshes member list
- [ ] removeMember calls DELETE API, removes from local state
- [ ] updateMemberRole calls PATCH API, updates local state
- [ ] Error states are captured in lastError/lastErrorData

---

## A.2: Basic Components (1 day)

### SpaceRoleBadge.svelte

**File:** `src/lib/components/spaces/SpaceRoleBadge.svelte`

Copy pattern from `AreaRoleBadge.svelte`:

```svelte
<script lang="ts">
  import { Crown, Shield, User, Eye } from 'lucide-svelte';
  import type { SpaceRole } from '$lib/types/space-memberships';
  import { SPACE_ROLE_LABELS } from '$lib/types/space-memberships';

  interface Props {
    role: SpaceRole;
    size?: 'sm' | 'md';
  }

  let { role, size = 'md' }: Props = $props();

  const icons = { owner: Crown, admin: Shield, member: User, guest: Eye };
</script>

<span class="role-badge {role} {size}">
  <svelte:component this={icons[role]} size={size === 'sm' ? 12 : 14} />
  {SPACE_ROLE_LABELS[role]}
</span>
```

### SpaceRoleSelector.svelte

**File:** `src/lib/components/spaces/SpaceRoleSelector.svelte`

Dropdown for changing member roles. Copy pattern from `AreaRoleSelector.svelte`.

Roles available for selection: `admin`, `member`, `guest` (owner is immutable).

---

## A.3: Search Component (0.5 day)

**File:** `src/lib/components/spaces/SpaceMemberSearchInput.svelte`

Copy pattern from `AreaMemberSearchInput.svelte`:

```svelte
<script lang="ts">
  interface Props {
    spaceId: string;
    onSelect: (entity: User | Group, role: SpaceRole) => void;
  }
</script>
```

Key differences from Area search:
- Endpoint: `/api/spaces/${spaceId}/members/search?q=${query}`
- Default role: `member`
- No Space membership prerequisite check needed (they're adding TO the Space)

---

## A.4: Member List Component (0.5 day)

**File:** `src/lib/components/spaces/SpaceMemberList.svelte`

Copy pattern from `AreaMemberList.svelte`:

```svelte
<script lang="ts">
  interface Props {
    members: SpaceMembershipWithUser[];
    currentUserId: string | null;
    canManage: boolean;
    spaceId: string;
    onRemove?: (memberId: string, memberName: string) => void;
    onRoleChange?: (memberId: string, newRole: SpaceRole, memberName: string) => Promise<void>;
    removingMemberId?: string | null;
  }
</script>
```

Features:
- Sort: Owners first, then alphabetically
- Lock icon on owners (immutable)
- Role selector for non-owners (if canManage)
- Remove button (if canManage, except owners and self)
- Current user highlighted with "(You)" badge
- Staggered fade-in animation

---

## A.5: Main Modal (1 day)

**File:** `src/lib/components/spaces/ShareSpaceModal.svelte`

Copy structure from `ShareAreaModal.svelte`:

```svelte
<script lang="ts">
  interface Props {
    open: boolean;
    space: Space | null;
    onClose: () => void;
  }
</script>
```

Sections:
1. **Header:** "Manage [Space Name] Members" + close button
2. **Add Members Section:** SpaceMemberSearchInput (if canManage)
3. **Current Members Section:** SpaceMemberList
4. **Footer:** Close button

Key differences from ShareAreaModal:
- No "Access Control" section (Spaces don't have is_restricted)
- No "Space membership required" prompt (we're adding TO the Space)
- Title: "Manage Members" not "Share"

---

## A.6: Entry Point Integration (0.5 day)

Add "Members" button to Space dashboard header:

**File:** `src/lib/components/spaces/SpaceDashboard.svelte`

```svelte
<!-- In header section, near space name -->
{#if canManageMembers}
  <button class="members-btn" onclick={() => showMembersModal = true}>
    <Users size={16} />
    <span class="member-count">{memberCount}</span>
  </button>
{/if}

<!-- Modal -->
<ShareSpaceModal
  open={showMembersModal}
  space={space}
  onClose={() => showMembersModal = false}
/>
```

---

## A.7: Visual Polish (0.5 day)

1. **Member count badge** on Space header button
2. **Loading skeleton** while fetching members
3. **Empty state** for spaces with no additional members
4. **Toast notifications** for add/remove/update actions
5. **Mobile optimization** - full-screen modal

---

# Phase B: Name Collision Fix

## Problem
User B has "Work" space. User A invites B to their "Work" space. Now B has TWO "Work" in their nav.

## Solution
Display invited spaces as `{Name} ({OwnerFirstName})`:

```
[Work] [StraTech Group] [Work (Sarah)] [⋯ All]
  ↑ yours    ↑ org space    ↑ Sarah's space you're invited to
```

## Implementation

### B.1: API Changes

**Update space response** to include owner info for invited spaces:

```typescript
// In spaces-postgres.ts findAll()
interface SpaceWithOwner extends Space {
  ownerFirstName?: string;  // Only set for spaces user doesn't own
  ownerDisplayName?: string;
}
```

### B.2: Display Logic

```typescript
// In nav component or spaces store
function getSpaceDisplayName(space: Space, currentUserId: string): string {
  // Owned space: just the name
  if (space.userId === currentUserId) {
    return space.name;
  }

  // Invited space: "Name (OwnerFirstName)"
  if (space.ownerFirstName) {
    return `${space.name} (${space.ownerFirstName})`;
  }

  return space.name;
}
```

### B.3: Optional Enhancement

Add `display_alias` to `space_memberships` for power users who want custom names:

```sql
ALTER TABLE space_memberships ADD COLUMN display_alias VARCHAR(100);
```

If set, use alias instead of auto-generated "Name (Owner)".

---

# Phase C: Nav Redesign with Pinning

## Problem
User could have 13+ spaces. Top nav overflows.

## Solution
Pinned spaces (max 6) in nav + "All Spaces" dropdown.

## Visual Design

### Nav Bar
```
[Work] [StraTech] [Client X] [⋯]
  ↑ pinned    ↑ pinned    ↑ pinned  ↑ "All" dropdown
```

### "All Spaces" Dropdown
```
┌─────────────────────────────────────────┐
│ PINNED TO NAV                           │
│ ┌─────────────────────────────────────┐ │
│ │ ⭐ Work                          ✕  │ │  ← ✕ removes pin
│ │ ⭐ StraTech Group                ✕  │ │
│ │ ⭐ Client X (Sarah)              ✕  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ YOUR SPACES                             │
│   Research                         📌  │  ← 📌 adds pin
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

## Pin/Unpin UX

### In Dropdown (Primary)
- **PINNED section** at top shows currently pinned spaces with ✕ button
- **Other sections** show unpinned spaces with 📌 button
- Click ✕ → immediately unpins
- Click 📌 → immediately pins (if under max)
- **Footer** shows "Maximum 6 pinned • N remaining"
- When max reached, 📌 buttons disabled with tooltip "Unpin a space first"

### On Nav Tabs (Secondary - Power Users)
- **Right-click** on pinned tab → context menu with "Unpin from navigation"
- **Mobile long-press** → same context menu
- This is a shortcut; dropdown is the primary method

## Database Schema

```sql
-- For owned spaces
ALTER TABLE spaces ADD COLUMN is_pinned BOOLEAN DEFAULT true;

-- For invited spaces (membership-level setting)
ALTER TABLE space_memberships ADD COLUMN is_pinned BOOLEAN DEFAULT false;
```

## Auto-Pin Rules

1. **User creates a space** → `spaces.is_pinned = true`
2. **User joins org** → org space membership `is_pinned = true`
3. **User invited to space** → `space_memberships.is_pinned = false`
4. **Max 6 pinned** enforced in UI (show error toast if exceeded)

### Cold Start Scenario
```
New user joins StraTech org:
  → Personal "Work" space: AUTO-PINNED ✓
  → Org "StraTech Group" space: AUTO-PINNED ✓
  → Gets invited to "Client Project": starts unpinned

Nav shows: [Work] [StraTech Group] [⋯ All]
```

## Implementation

### C.1: Database Migration

```sql
-- migrations/031-space-pinning.sql
ALTER TABLE spaces ADD COLUMN is_pinned BOOLEAN DEFAULT true;
ALTER TABLE space_memberships ADD COLUMN is_pinned BOOLEAN DEFAULT false;
ALTER TABLE space_memberships ADD COLUMN display_alias VARCHAR(100);
```

### C.2: Store Updates

```typescript
// spaces.svelte.ts
async function pinSpace(spaceId: string): Promise<boolean>;
async function unpinSpace(spaceId: string): Promise<boolean>;

// Derived
let pinnedSpaces = $derived(spaces.filter(s => s.isPinned).slice(0, 6));
let unpinnedSpaces = $derived(spaces.filter(s => !s.isPinned));
```

### C.3: Nav Components

**New components:**
- `AllSpacesDropdown.svelte` - The dropdown with sections
- `SpaceNavTabs.svelte` - Refactored nav tabs (pinned only)

**Update:**
- `Header.svelte` - Replace current space tabs with new components

---

# Component Structure Summary

```
src/lib/components/spaces/
├── ShareSpaceModal.svelte        # Main modal (Phase A)
├── SpaceMemberSearchInput.svelte # Autocomplete search (Phase A)
├── SpaceMemberList.svelte        # Member list with actions (Phase A)
├── SpaceRoleBadge.svelte         # Role badge (Phase A)
├── SpaceRoleSelector.svelte      # Role dropdown (Phase A)
├── AllSpacesDropdown.svelte      # "All" dropdown (Phase C)
└── SpaceNavTabs.svelte           # Pinned tabs (Phase C)
```

---

# API Integration Summary

| Action | Endpoint | Method | Body |
|--------|----------|--------|------|
| List members | `/api/spaces/{id}/members` | GET | - |
| Search users/groups | `/api/spaces/{id}/members/search?q=` | GET | - |
| Add member | `/api/spaces/{id}/members` | POST | `{ targetUserId?, groupId?, role }` |
| Update role | `/api/spaces/{id}/members/{memberId}` | PATCH | `{ role }` |
| Remove member | `/api/spaces/{id}/members/{memberId}` | DELETE | - |
| Pin space | `/api/spaces/{id}/pin` | POST | - |
| Unpin space | `/api/spaces/{id}/unpin` | POST | - |

---

# Files Summary

## To Create

| File | Phase | Lines (Est.) |
|------|-------|-------------|
| `migrations/030-user-first-last-name.sql` | 0 | ~20 |
| `SpaceRoleBadge.svelte` | A | ~100 |
| `SpaceRoleSelector.svelte` | A | ~200 |
| `SpaceMemberSearchInput.svelte` | A | ~500 |
| `SpaceMemberList.svelte` | A | ~350 |
| `ShareSpaceModal.svelte` | A | ~600 |
| `migrations/031-space-pinning.sql` | C | ~10 |
| `AllSpacesDropdown.svelte` | C | ~400 |
| `SpaceNavTabs.svelte` | C | ~200 |

## To Modify

| File | Phase | Changes |
|------|-------|---------|
| User type + repository | 0 | Add firstName, lastName |
| Registration/profile forms | 0 | Add name fields |
| `spaces.svelte.ts` | A, C | Member management + pinning |
| `SpaceDashboard.svelte` | A | Members button + modal |
| `spaces-postgres.ts` | B | Return owner info |
| `Header.svelte` | C | Nav redesign |

---

# Acceptance Criteria

## Phase A: Member Management

### Happy Path
1. [ ] User clicks "Members" button on Space dashboard header
2. [ ] Modal opens showing current Space members
3. [ ] Admin searches for user by name/email
4. [ ] User appears in dropdown (if not already a member)
5. [ ] Admin selects user → user added as "member" by default
6. [ ] New member appears in list immediately
7. [ ] Admin can change role via dropdown (admin/member/guest)
8. [ ] Admin can remove non-owner members via X button
9. [ ] Owner row shows lock icon (cannot be changed)
10. [ ] Current user row highlighted with "(You)"

### Permission Checks
1. [ ] Only owner/admin sees "Members" button
2. [ ] Regular members see read-only member list
3. [ ] Guests cannot see member list at all
4. [ ] Cannot change own role
5. [ ] Cannot remove self
6. [ ] Cannot remove/change owner

## Phase B: Name Collision

1. [ ] Owned spaces show as "Name"
2. [ ] Invited spaces show as "Name (OwnerFirstName)"
3. [ ] Org spaces show as just "Name" (special case - no owner suffix)

## Phase C: Nav Pinning

1. [ ] Pinned spaces appear as tabs in nav
2. [ ] "All" button opens dropdown with all spaces
3. [ ] Dropdown shows PINNED section at top with ✕ buttons
4. [ ] Dropdown shows unpinned spaces with 📌 buttons
5. [ ] Click 📌 pins the space (appears in nav)
6. [ ] Click ✕ unpins the space (removed from nav)
7. [ ] Max 6 pinned enforced with error message
8. [ ] Right-click on tab shows "Unpin" option
9. [ ] New personal spaces auto-pin
10. [ ] Org space auto-pins when user joins
11. [ ] Invited spaces start unpinned

---

# Estimated Timeline

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 0: User Schema | 0.5 day | None |
| Phase A: Member Management | 4-5 days | Phase 0 |
| Phase B: Name Collision | 1 day | Phase 0 |
| Phase C: Nav Redesign | 2-3 days | Phase B |

**Total: ~8-10 days**

---

# Notes

- Backend for Phase A is 100% complete - purely UI work
- All components should mirror Area sharing for consistency
- Reuse CSS variables from app.css for role colors
- Follow same accessibility patterns (keyboard nav, ARIA)
- Phase 0 is foundational - do first since no production users yet
