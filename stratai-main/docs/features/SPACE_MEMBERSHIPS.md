# Space Memberships & Organization Spaces

## Overview

This document defines the implementation of **Space-level memberships** and **Organization Spaces**, completing the collaboration model for StratAI.

**Core Principle:**
> "All actions by users have access to the context available to them at the point of operation"

Context flows hierarchically: **Organization → Space → Area → Conversation**

Space membership is the gateway; Area restriction is the filter.

---

## Mental Model

### The Hierarchy

```
Organization (StratTech Group)
    │
    ├── Organization Space ("StratTech Group" - editable name)
    │   ├── Members: All org users (auto-invited)
    │   ├── Guests: External collaborators (explicitly invited)
    │   └── Areas:
    │       ├── General (open) ← All members see
    │       ├── Finance (restricted) ← Explicit members only
    │       └── Marketing (restricted) ← Explicit members only
    │
    └── Project Spaces (created by users)
        ├── "SPUR Loyalty" (Owner: User A)
        │   ├── Members: Invited collaborators
        │   └── Areas: ...
        │
        └── "Client Project X" (Owner: User B)
            ├── Members: Team + client guests
            └── Areas: ...

Personal (outside org)
    └── Personal Spaces (Work, Life, custom)
        └── Owner only, no sharing
```

### Key Rules

| Rule | Description |
|------|-------------|
| **Space membership is required** | You must be a Space member to see ANY areas in that Space |
| **Area restriction is the filter** | Within a Space, areas can be open (all members) or restricted (explicit only) |
| **Context always flows down** | Area inherits Space context, conversation inherits Area context |
| **No orphan content** | Every area belongs to a Space the user can access |

---

## Space Types

### 1. Organization Space

The primary shared workspace for an organization.

| Property | Value |
|----------|-------|
| Type | `organization` |
| Default Name | Organization name (e.g., "StratTech Group") |
| Editable | Yes, by Owner in admin settings |
| Auto-membership | All org users become Members automatically |
| Deletable | No (one org Space per organization) |

### 2. Project Space

User-created spaces for specific projects or initiatives.

| Property | Value |
|----------|-------|
| Type | `project` |
| Default Name | User-defined |
| Creator | Becomes Owner |
| Membership | Explicit invitation only |
| Deletable | Yes, by Owner |

### 3. Personal Space (Existing)

Individual user's private workspace.

| Property | Value |
|----------|-------|
| Type | `personal` |
| Examples | Work, Life, custom |
| Membership | Owner only (no sharing) |
| Unchanged | Yes, works as currently implemented |

---

## Space Membership Roles

| Role | See Open Areas | See Restricted Areas | Manage Members | Manage Space | Delete Space |
|------|----------------|---------------------|----------------|--------------|--------------|
| **Owner** | ✓ | ✓ (all) | ✓ | ✓ | ✓ |
| **Admin** | ✓ | ✓ (all) | ✓ | ✓ | ✗ |
| **Member** | ✓ | Only if shared | ✗ | ✗ | ✗ |
| **Guest** | ✗ | Only if shared | ✗ | ✗ | ✗ |

### Role Descriptions

- **Owner**: Full control. Can delete Space, transfer ownership, manage all settings.
- **Admin**: Can manage members and Space settings, but cannot delete.
- **Member**: Standard access. Sees open areas, can be shared restricted areas.
- **Guest**: Limited access. Only sees areas explicitly shared with them. For external collaborators.

---

## "Shared with Me" Section

A convenience view showing areas explicitly shared with the user across all their Spaces.

### Location

Appears as a section in the **Organization Space dashboard** (not a separate container).

```
StratTech Group (Org Space)
├── Your Areas
│   ├── Marketing (you're a member)
│   └── Product (you're a member)
│
├── Shared with Me
│   ├── [SPUR Loyalty] Design Sprint → User A shared this
│   └── [Client X] Requirements → User B shared this
│
└── Open Areas
    └── General (all members)
```

### Behavior

| Action | Result |
|--------|--------|
| Click on shared area | Navigate to `/spaces/{space-slug}/{area-slug}` |
| View area | Full area context (inherits from its actual Space) |
| Create conversation | Conversation belongs to that Area/Space |

### Query Logic

```sql
-- Areas where user has explicit membership
-- but is NOT the area creator (avoids duplicates)
SELECT a.*, s.name as space_name, s.slug as space_slug
FROM areas a
JOIN spaces s ON a.space_id = s.id
JOIN area_memberships am ON a.id = am.area_id
WHERE am.user_id = :userId
  AND a.created_by != :userId
  AND a.deleted_at IS NULL
```

---

## Implementation Phases

### Phase 1: Database Schema (space_memberships)

**Migration: `031-space-memberships.sql`**

```sql
-- Space memberships table (mirrors area_memberships pattern)
CREATE TABLE space_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id VARCHAR(50) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- XOR constraint: user OR group, not both
    CONSTRAINT space_membership_target CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    ),

    -- Role validation
    CONSTRAINT space_membership_role CHECK (
        role IN ('owner', 'admin', 'member', 'guest')
    )
);

-- Indexes
CREATE UNIQUE INDEX idx_space_memberships_user
    ON space_memberships(space_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_space_memberships_group
    ON space_memberships(space_id, group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_space_memberships_space ON space_memberships(space_id);

-- Add space_type to spaces table
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS space_type VARCHAR(20)
    DEFAULT 'personal' CHECK (space_type IN ('personal', 'organization', 'project'));

-- Add org_id to spaces for organization spaces
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
```

**Acceptance Tests:**
- [ ] Migration runs without errors
- [ ] Unique constraints prevent duplicate memberships
- [ ] XOR constraint enforced (user OR group)
- [ ] Role validation works

---

### Phase 2: Space Membership Repository

**File: `src/lib/server/persistence/space-memberships-postgres.ts`**

```typescript
interface SpaceMembershipRepository {
  // Access control
  canAccessSpace(userId: string, spaceId: string): Promise<SpaceRole | null>;

  // Member management
  addMember(spaceId: string, userId: string, role: SpaceRole, invitedBy: string): Promise<SpaceMembership>;
  removeMember(spaceId: string, userId: string): Promise<void>;
  updateRole(spaceId: string, userId: string, role: SpaceRole): Promise<SpaceMembership>;

  // Queries
  findMembersBySpace(spaceId: string): Promise<SpaceMembershipWithUser[]>;
  findSpacesByUser(userId: string): Promise<SpaceWithRole[]>;

  // Group operations
  addGroup(spaceId: string, groupId: string, role: SpaceRole, invitedBy: string): Promise<SpaceMembership>;
  removeGroup(spaceId: string, groupId: string): Promise<void>;
}
```

**Access Control Algorithm:**

```typescript
async canAccessSpace(userId: string, spaceId: string): Promise<SpaceRole | null> {
  // 1. Check if user owns the space (legacy personal spaces)
  const space = await findSpaceById(spaceId);
  if (space?.user_id === userId) return 'owner';

  // 2. Check direct user membership
  const userMembership = await findMembership(spaceId, userId);
  if (userMembership) return userMembership.role;

  // 3. Check group memberships (take best role)
  const groupRole = await findBestGroupRole(spaceId, userId);
  if (groupRole) return groupRole;

  // 4. No access
  return null;
}
```

**Acceptance Tests:**
- [ ] Owner always has access
- [ ] Direct membership grants role
- [ ] Group membership grants role
- [ ] Non-members get null
- [ ] Best role wins for multiple group memberships

---

### Phase 3: Space Discovery Update

**File: `src/lib/server/persistence/spaces-postgres.ts`**

Update `findAll` to include membership spaces:

```typescript
async findAll(userId: string): Promise<Space[]> {
  // Ensure system spaces exist for personal use
  await this.ensureSystemSpaces(userId);

  const rows = await sql<SpaceRow[]>`
    WITH accessible_spaces AS (
      -- Spaces user owns (personal spaces)
      SELECT DISTINCT s.id, 'owner' as access_role
      FROM spaces s
      WHERE s.user_id = ${userId}
        AND s.deleted_at IS NULL

      UNION

      -- Spaces with direct user membership
      SELECT DISTINCT s.id, sm.role as access_role
      FROM spaces s
      JOIN space_memberships sm ON s.id = sm.space_id
      WHERE sm.user_id = ${userId}
        AND s.deleted_at IS NULL

      UNION

      -- Spaces with group membership
      SELECT DISTINCT s.id, sm.role as access_role
      FROM spaces s
      JOIN space_memberships sm ON s.id = sm.space_id
      JOIN group_memberships gm ON sm.group_id = gm.group_id
      WHERE gm.user_id = ${userId}::uuid
        AND s.deleted_at IS NULL
    )
    SELECT s.*,
           COALESCE(
             (SELECT access_role FROM accessible_spaces WHERE id = s.id LIMIT 1),
             'owner'
           ) as user_role
    FROM spaces s
    JOIN accessible_spaces a ON s.id = a.id
    ORDER BY
      s.space_type ASC,  -- org first, then project, then personal
      s.order_index ASC,
      s.created_at ASC
  `;
  return rows.map(rowToSpace);
}
```

**Acceptance Tests:**
- [ ] User sees owned spaces
- [ ] User sees membership spaces
- [ ] User sees group membership spaces
- [ ] Org spaces appear first in list
- [ ] Role is correctly attached

---

### Phase 4: Organization Space Creation

**Admin Settings Integration**

| Setting | Default | Editable By |
|---------|---------|-------------|
| Org Space Name | Organization name | Owner, Admin |
| Auto-invite new members | true | Owner |
| Default member role | member | Owner, Admin |

**API Endpoint: `PUT /api/admin/organization/space`**

```typescript
// Update org space settings
{
  name: "StratTech Group",      // Display name
  slug: "stratech-group",       // URL slug
  autoInviteMembers: true,      // New org members auto-join
  defaultMemberRole: "member"   // Role for auto-invited members
}
```

**Auto-invite Logic:**

When a user joins the organization:
1. Find the org's Organization Space
2. If `autoInviteMembers` is true, create membership with `defaultMemberRole`
3. User immediately sees the Space in their list

**Acceptance Tests:**
- [ ] Org space name is editable
- [ ] New org members auto-invited when enabled
- [ ] Default role applied correctly
- [ ] Slug is unique and URL-safe

---

### Phase 5: Area Sharing Prerequisites

**Update Area Sharing Flow:**

Before allowing area share:

```typescript
async shareAreaWithUser(areaId: string, targetUserId: string, role: AreaRole): Promise<void> {
  const area = await findAreaById(areaId);
  const spaceId = area.space_id;

  // Check if target user is a Space member
  const spaceRole = await canAccessSpace(targetUserId, spaceId);

  if (!spaceRole) {
    throw new Error(
      `User must be invited to the Space first. ` +
      `Add them as a Guest to "${spaceName}" to share this area.`
    );
  }

  // Proceed with area sharing
  await addAreaMember(areaId, targetUserId, role);
}
```

**UI Flow:**

```
Owner clicks "Share Area" → Searches for user → User not in Space?
    ↓
Modal: "User X is not a member of this Space.
        Add them as a Guest to share this area?"
        [Add as Guest & Share] [Cancel]
```

**Acceptance Tests:**
- [ ] Cannot share area with non-Space member
- [ ] Clear error message explains the requirement
- [ ] Option to add as Guest + share in one action
- [ ] Existing Space members can be shared directly

---

### Phase 6: "Shared with Me" UI

**Component: `SharedWithMeSection.svelte`**

```svelte
<script lang="ts">
  let { sharedAreas } = $props<{ sharedAreas: SharedAreaInfo[] }>();
</script>

{#if sharedAreas.length > 0}
  <section class="shared-with-me">
    <h3 class="section-title">Shared with Me</h3>
    <div class="shared-areas-list">
      {#each sharedAreas as area}
        <a
          href="/spaces/{area.spaceSlug}/{area.slug}"
          class="shared-area-card"
        >
          <div class="area-info">
            <span class="area-name">{area.name}</span>
            <span class="space-badge">{area.spaceName}</span>
          </div>
          <div class="shared-by">
            Shared by {area.sharedBy.name}
          </div>
        </a>
      {/each}
    </div>
  </section>
{/if}
```

**API Endpoint: `GET /api/areas/shared-with-me`**

Returns areas where user has explicit membership but is not the creator.

**Acceptance Tests:**
- [ ] Shows areas from all accessible Spaces
- [ ] Excludes areas user created
- [ ] Click navigates to correct Space/Area URL
- [ ] Shows who shared the area
- [ ] Empty state when nothing shared

---

### Phase 7: Guest Role Refinements

**Guest Limitations:**

| Action | Guest Can? |
|--------|------------|
| See Space in list | ✓ |
| See open areas | ✗ |
| See shared areas | ✓ |
| Create areas | ✗ |
| Create conversations in shared areas | ✓ |
| Invite others | ✗ |
| See member list | Limited (only shared area members) |

**Implementation:**

Update `findAllAccessible` for areas:

```sql
-- For guests: only show explicitly shared areas
CASE WHEN space_role = 'guest' THEN
  -- Only areas with direct membership
  SELECT a.id FROM areas a
  JOIN area_memberships am ON a.id = am.area_id
  WHERE am.user_id = :userId
ELSE
  -- Normal logic (open + shared)
  ...
END
```

**Acceptance Tests:**
- [ ] Guests see only shared areas
- [ ] Guests cannot see open areas
- [ ] Guests cannot create new areas
- [ ] Guests can converse in shared areas
- [ ] Guests cannot invite others

---

## Edge Cases & Resolutions

### Edge Case 1: User in Multiple Organizations

**Scenario:** User belongs to Org A and Org B, each with their own Org Space.

**Resolution:**
- User sees both Org Spaces in their Space list
- "Shared with Me" aggregates across both
- Each Space has its own context (no cross-contamination)

### Edge Case 2: Leaving an Organization

**Scenario:** User leaves Org A.

**Resolution:**
- Space membership is revoked automatically
- User loses access to Org Space and all areas
- User's conversations remain (owned by them) but become inaccessible
- Future: Export option before leaving?

### Edge Case 3: Promoting Guest to Member

**Scenario:** Guest has been shared 5 areas, should probably be a Member.

**Resolution:**
- Admin can upgrade role at any time
- No automatic upgrade (intentional admin decision)
- UI hint: "This guest has access to 5 areas. Consider upgrading to Member."

### Edge Case 4: Personal Area in Org Space

**Scenario:** User wants a private area within the Org Space.

**Resolution:**
- Create restricted area, add only themselves as member
- Area exists in Org Space but only they can see it
- Admin consideration: Org admins may need visibility for compliance (future feature)

### Edge Case 5: Deleting a Project Space

**Scenario:** Owner deletes a Project Space with shared areas.

**Resolution:**
- Soft delete with 30-day recovery period
- All members notified (future: email)
- After 30 days, hard delete
- Conversations and documents permanently removed

### Edge Case 6: Circular Group Memberships

**Scenario:** Group A is in Space, User is in Group A and also direct member.

**Resolution:**
- Take highest role (direct membership wins if higher)
- No duplicate access entries
- Removing from group doesn't affect direct membership

### Edge Case 7: Space Name Collision

**Scenario:** User has personal "Work" space, joins org with "Work" org space.

**Resolution:**
- Different space types, can coexist
- Slugs scoped: `/spaces/work` (personal) vs `/spaces/org-work` (org)
- UI clearly distinguishes with badges/icons

### Edge Case 8: External Guest with No Org Account

**Scenario:** Invite external consultant who doesn't have StratAI account.

**Resolution:**
- Send invite email with signup link
- On signup, auto-add as Guest to the Space
- Token in invite URL tracks the pending membership

### Edge Case 9: Transfer Space Ownership

**Scenario:** Original owner leaves, needs to transfer ownership.

**Resolution:**
- Owner can transfer to any Admin
- Must have at least one Owner at all times
- Transfer is explicit action, not automatic

### Edge Case 10: Area Creator Leaves Space

**Scenario:** User creates area, then loses Space membership.

**Resolution:**
- Area ownership transfers to Space owner
- Creator's conversations remain but become inaccessible to them
- Future: Migration wizard for handoff

---

## Database Schema Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         spaces                                   │
├─────────────────────────────────────────────────────────────────┤
│ id              VARCHAR(50) PK                                   │
│ user_id         UUID FK (owner for personal spaces)              │
│ organization_id UUID FK (for org spaces)                         │
│ space_type      VARCHAR(20) [personal|organization|project]      │
│ name            VARCHAR(255)                                     │
│ slug            VARCHAR(100)                                     │
│ ...existing fields...                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    space_memberships                             │
├─────────────────────────────────────────────────────────────────┤
│ id              UUID PK                                          │
│ space_id        VARCHAR(50) FK                                   │
│ user_id         UUID FK (XOR with group_id)                      │
│ group_id        UUID FK (XOR with user_id)                       │
│ role            VARCHAR(20) [owner|admin|member|guest]           │
│ invited_by      UUID FK                                          │
│ created_at      TIMESTAMPTZ                                      │
│ updated_at      TIMESTAMPTZ                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Space contains Areas
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         areas                                    │
├─────────────────────────────────────────────────────────────────┤
│ ...existing fields...                                            │
│ is_restricted   BOOLEAN (true = explicit members only)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    area_memberships                              │
├─────────────────────────────────────────────────────────────────┤
│ ...existing fields (already implemented)...                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/spaces` | GET | List accessible spaces (owned + membership) |
| `/api/spaces/:id/members` | GET | List space members |
| `/api/spaces/:id/members` | POST | Add member to space |
| `/api/spaces/:id/members/:userId` | PATCH | Update member role |
| `/api/spaces/:id/members/:userId` | DELETE | Remove member |
| `/api/areas/shared-with-me` | GET | List areas shared with current user |
| `/api/admin/organization/space` | PUT | Update org space settings |

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `migrations/031-space-memberships.sql` | Database schema |
| `src/lib/types/space-memberships.ts` | TypeScript types |
| `src/lib/server/persistence/space-memberships-postgres.ts` | Repository |
| `src/routes/api/spaces/[id]/members/+server.ts` | Member management API |
| `src/routes/api/areas/shared-with-me/+server.ts` | Shared areas query |
| `src/lib/components/spaces/SpaceMemberList.svelte` | Member list UI |
| `src/lib/components/spaces/ShareSpaceModal.svelte` | Invite members UI |
| `src/lib/components/spaces/SharedWithMeSection.svelte` | Shared areas UI |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/server/persistence/spaces-postgres.ts` | Update `findAll` query |
| `src/lib/server/persistence/areas-postgres.ts` | Update for guest role |
| `src/lib/stores/spaces.svelte.ts` | Add member management |
| `src/lib/components/spaces/SpaceDashboard.svelte` | Add "Shared with Me" |
| `src/lib/components/areas/ShareAreaModal.svelte` | Add Space membership check |
| `src/routes/admin/+page.svelte` | Add org space settings |

---

## Implementation Order

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| 1. Database Schema | 0.5 day | None |
| 2. Space Membership Repository | 1 day | Phase 1 |
| 3. Space Discovery Update | 0.5 day | Phase 2 |
| 4. Organization Space Creation | 1 day | Phase 3 |
| 5. Area Sharing Prerequisites | 0.5 day | Phase 2 |
| 6. "Shared with Me" UI | 1 day | Phase 3 |
| 7. Guest Role Refinements | 0.5 day | Phase 2 |

**Total Estimated Effort:** ~5 days

---

## Acceptance Criteria (End-to-End)

### Happy Path: Organization Collaboration

1. [ ] Admin creates organization in StratAI
2. [ ] Organization Space is auto-created with org name
3. [ ] Admin invites team members → they become Space Members
4. [ ] Members see the Org Space in their Space list
5. [ ] Members see open areas in the Space
6. [ ] Admin creates restricted area, shares with specific members
7. [ ] Shared members see the area; others don't
8. [ ] "Shared with Me" shows areas from Project Spaces they're invited to

### Happy Path: External Collaboration

1. [ ] User creates Project Space "Client X"
2. [ ] User invites client contact as Guest
3. [ ] Guest sees only "Client X" Space (not org content)
4. [ ] User shares specific area with Guest
5. [ ] Guest sees only that area within the Space
6. [ ] Guest can create conversations in the shared area

### Access Control Verification

1. [ ] Guest cannot see open areas (only explicit shares)
2. [ ] Member cannot manage other members
3. [ ] Admin can manage members but not delete Space
4. [ ] Owner can do everything including delete

---

## Related Documents

- `ENTITY_MODEL.md` - Data architecture (will need updates)
- `area-sharing-ux.md` - Area-level sharing (already implemented)
- `CONTEXT_STRATEGY.md` - Context hierarchy (validates this model)
- `page-sharing-permissions-audit.md` - Page sharing (follows same patterns)

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Space membership required for area access | Maintains context chain; no orphan content |
| Guest role for external collaborators | Enables sharing without full org access |
| "Shared with Me" in Org Space dashboard | Keeps context clear; not a separate container |
| Auto-invite org members to Org Space | Reduces friction; expected behavior |
| Editable Org Space name | Organizations have different naming conventions |
| No cross-Space area visibility | Would break context hierarchy |
| Soft delete for Spaces | Data recovery important for enterprises |
