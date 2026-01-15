# Area Sharing UX Implementation Guide

> **Status:** Implementation Ready
> **Created:** 2026-01-12
> **Backend:** Complete (migration 027, API endpoints, repositories)
> **Frontend:** To Be Implemented (4 phases)
> **Email Notifications:** Separate implementation (not included in phases 1-4)

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Specifications](#component-specifications)
4. [User Flows](#user-flows)
5. [Implementation Phases](#implementation-phases)
6. [Design System Integration](#design-system-integration)
7. [Testing Strategy](#testing-strategy)

---

## Overview

### Goals

Enable granular collaboration on areas through:
- **User & Group Invites** - Add individuals or teams to specific areas
- **4-Tier Role System** - owner → admin → member → viewer hierarchy
- **Access Control** - Toggle between open (space-inherited) and restricted modes
- **Transparent Permissions** - Clear visual indicators of who has access and what they can do

### Success Metrics

- Users can share an area in < 30 seconds
- Role system is intuitive without documentation
- Zero confusion about access levels
- Mobile-optimized experience

### Implementation Scope

**INCLUDED in Phases 1-4 (4 weeks):**
- ✅ Share modal UI with member management
- ✅ Add/remove users and groups
- ✅ Role management (owner/admin/member/viewer)
- ✅ Access control toggle (open/restricted)
- ✅ Visual indicators throughout app
- ✅ Mobile optimization

**EXCLUDED from Phases 1-4 (separate implementation):**
- ❌ Email notifications when users are added
- ❌ Email preferences system
- ❌ SendGrid integration
- ❌ Email templates

**User Discovery Without Email:**
- Area appears in their area list automatically
- Manual notification (Slack, verbal) for beta users
- Future: In-app notification system (bell icon)
- Future: Activity feed showing "Added to area"

### Prior Art

- **Document Sharing** (`DocumentSharingModal.svelte`) - Similar modal pattern, autocomplete search
- **Group Management** (`/admin/groups/[id]`) - Member list with role management
- **Context Menu Pattern** - Existing pattern for area cards
- **Toast Notifications** - Feedback for async operations

---

## Architecture

### Backend (Already Complete)

**Database Schema:**
```sql
-- areas table additions
is_restricted BOOLEAN DEFAULT false  -- Access control toggle
created_by TEXT                      -- Original creator

-- area_memberships table
id TEXT PRIMARY KEY
area_id TEXT → areas(id)
user_id TEXT (XOR with group_id)
group_id UUID → groups(id)
role TEXT (owner|admin|member|viewer)
invited_by TEXT
created_at TIMESTAMPTZ
```

**API Endpoints:**
- `GET /api/areas/[id]/members` - List members with details
- `POST /api/areas/[id]/members` - Add user or group
- `PATCH /api/areas/[id]/members/[memberId]` - Update role
- `DELETE /api/areas/[id]/members/[memberId]` - Remove member
- `PATCH /api/areas/[id]` - Update area (including `is_restricted`)

**Store Methods (areas.svelte.ts):**
- `loadMembers(areaId)` - Fetch member list
- `addMember(areaId, input)` - Add user/group with role
- `removeMember(areaId, memberId)` - Remove member
- `updateMemberRole(areaId, memberId, role)` - Change role
- `getMembersForArea(areaId)` - Reactive member list getter
- `getAccessInfo(areaId)` - Get user's role & access source

### Frontend Architecture

**Component Hierarchy:**
```
ShareAreaModal (root)
├── AreaMemberSearchInput (autocomplete)
├── AreaMemberList (member management)
│   ├── AreaMemberListItem (individual member)
│   │   ├── AreaRoleSelector (role dropdown)
│   │   └── RemoveMemberButton (X with confirmation)
│   └── AreaGroupMemberItem (group with expansion)
├── AreaAccessToggle (open vs restricted)
└── EmptyMemberState (no members yet)

AreaAvatarStack (header widget)
AreaSharedIndicator (card badge)
AreaRoleBadge (reusable badge)
```

**State Management:**
```typescript
// areas.svelte.ts already has:
membersByArea: Map<areaId, AreaMemberWithDetails[]>
accessByArea: Map<areaId, { userRole, accessSource }>

// Component-local state:
interface ShareAreaModalState {
  searchQuery: string;
  searchResults: (User | Group)[];
  isSearching: boolean;
  selectedRole: AreaMemberRole;
  isAddingMember: boolean;
  error: string | null;
}
```

**Integration Points:**
1. **Area View Header** - Primary "Share" button
2. **Area Card** - Context menu → "Share" option
3. **Area Header** - Avatar stack showing members
4. **Area Card Badge** - Shared indicator with count

---

## Component Specifications

### 1. ShareAreaModal.svelte

**Purpose:** Main modal for area sharing - add/remove members, change roles, toggle access

**Props:**
```typescript
interface Props {
  areaId: string;
  onClose: () => void;
  initialTab?: 'members' | 'settings'; // Future: tabs
}
```

**State:**
```typescript
let members = $state<AreaMemberWithDetails[]>([]);
let searchQuery = $state('');
let searchResults = $state<(User | Group)[]>([]);
let isSearching = $state(false);
let selectedRole = $state<AreaMemberRole>('member');
let isAddingMember = $state(false);
let error = $state<string | null>(null);
let area = $derived(areaStore.getAreaById(areaId));
let userAccessInfo = $derived(areaStore.getAccessInfo(areaId));
let canManage = $derived(
  userAccessInfo?.userRole === 'owner' ||
  userAccessInfo?.userRole === 'admin'
);
```

**Layout:**
```svelte
<Modal size="medium" {onClose}>
  <ModalHeader>
    <h2>Share "{area?.name}"</h2>
    {#if area?.isRestricted}
      <Badge variant="restricted">Restricted</Badge>
    {/if}
  </ModalHeader>

  <ModalBody>
    <!-- Search Section -->
    <section class="add-member-section">
      <label>Add people or groups</label>
      <AreaMemberSearchInput
        bind:query={searchQuery}
        bind:results={searchResults}
        bind:isSearching
        {excludeIds}
        onSelect={handleAddMember}
      />
    </section>

    <!-- Member List Section -->
    <section class="member-list-section">
      <h3>Current Members ({members.length})</h3>
      {#if members.length > 0}
        <AreaMemberList
          {members}
          {canManage}
          currentUserId={$user.id}
          onChangeRole={handleChangeRole}
          onRemove={handleRemoveMember}
        />
      {:else}
        <EmptyMemberState />
      {/if}
    </section>

    <!-- Access Control Section -->
    {#if canManage}
      <section class="access-control-section">
        <h3>Access Control</h3>
        <AreaAccessToggle
          isRestricted={area?.isRestricted ?? false}
          onChange={handleToggleAccess}
        />
      </section>
    {/if}

    <!-- Error Display -->
    {#if error}
      <ErrorMessage>{error}</ErrorMessage>
    {/if}
  </ModalBody>

  <ModalFooter>
    <Button variant="secondary" onclick={onClose}>Close</Button>
  </ModalFooter>
</Modal>
```

**Methods:**
```typescript
async function handleAddMember(entity: User | Group) {
  isAddingMember = true;
  error = null;

  const input: AddMemberInput = {
    userId: 'id' in entity && !('members' in entity) ? entity.id : undefined,
    groupId: 'members' in entity ? entity.id : undefined,
    role: selectedRole
  };

  const success = await areaStore.addMember(areaId, input);

  if (success) {
    searchQuery = '';
    searchResults = [];
    showToast(`Added ${entity.name} as ${selectedRole}`, 'success');
  } else {
    error = areaStore.error ?? 'Failed to add member';
  }

  isAddingMember = false;
}

async function handleChangeRole(memberId: string, newRole: AreaMemberRole) {
  const member = members.find(m => m.id === memberId);
  if (!member) return;

  // Confirm if demoting owner
  if (member.role === 'owner' && newRole !== 'owner') {
    const confirmed = await confirmDialog(
      'Demote Owner',
      `Are you sure you want to change ${memberName} from Owner to ${newRole}?`
    );
    if (!confirmed) return;
  }

  const success = await areaStore.updateMemberRole(areaId, memberId, newRole);

  if (success) {
    showToast(`Changed ${memberName} to ${newRole}`, 'success');
  } else {
    error = areaStore.error;
  }
}

async function handleRemoveMember(memberId: string) {
  const member = members.find(m => m.id === memberId);
  if (!member) return;

  const memberName = member.userName ?? member.groupName ?? 'Member';

  // Confirm removal
  const confirmed = await confirmDialog(
    'Remove Member',
    `Remove ${memberName} from this area?`
  );
  if (!confirmed) return;

  const success = await areaStore.removeMember(areaId, memberId);

  if (success) {
    showToast(`Removed ${memberName}`, 'success');
  } else {
    error = areaStore.error;
  }
}

async function handleToggleAccess(isRestricted: boolean) {
  // Show warning when restricting
  if (isRestricted && !area?.isRestricted) {
    const confirmed = await confirmDialog(
      'Restrict Access',
      'Only invited members will have access. Space members will need explicit invites.',
      { confirmText: 'Restrict Access', cancelText: 'Cancel' }
    );
    if (!confirmed) return;
  }

  const success = await areaStore.updateArea(areaId, { isRestricted });

  if (success) {
    const message = isRestricted
      ? 'Area is now restricted to invited members'
      : 'Area is now open to space members';
    showToast(message, 'success');
  } else {
    error = areaStore.error;
  }
}

onMount(async () => {
  await areaStore.loadMembers(areaId);
  members = areaStore.getMembersForArea(areaId);
});
```

**Styling:**
```css
.add-member-section {
  margin-bottom: 2rem;
}

.member-list-section {
  margin-bottom: 2rem;
}

.member-list-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

.access-control-section {
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
}
```

---

### 2. AreaMemberSearchInput.svelte

**Purpose:** Autocomplete search for users and groups

**Props:**
```typescript
interface Props {
  query: string;
  results: (User | Group)[];
  isSearching: boolean;
  excludeIds: string[]; // Already-member IDs to hide from results
  onSelect: (entity: User | Group) => void;
}
```

**State:**
```typescript
let inputElement = $state<HTMLInputElement | null>(null);
let showDropdown = $state(false);
let selectedIndex = $state(0);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
```

**Layout:**
```svelte
<div class="search-container">
  <div class="search-input-wrapper">
    <SearchIcon />
    <input
      bind:this={inputElement}
      type="text"
      placeholder="Search by name or email..."
      bind:value={query}
      oninput={handleInput}
      onfocus={() => showDropdown = true}
      onkeydown={handleKeydown}
      aria-label="Search for users or groups"
      aria-autocomplete="list"
      aria-controls="search-results"
      aria-expanded={showDropdown}
    />
    {#if isSearching}
      <LoadingSpinner size="sm" />
    {/if}
  </div>

  {#if showDropdown && results.length > 0}
    <div
      class="search-results"
      role="listbox"
      id="search-results"
    >
      {#each results as entity, i}
        <button
          class="search-result-item"
          class:selected={i === selectedIndex}
          role="option"
          aria-selected={i === selectedIndex}
          onclick={() => handleSelect(entity)}
          onmouseenter={() => selectedIndex = i}
        >
          {#if 'email' in entity}
            <!-- User result -->
            <UserAvatar user={entity} size="sm" />
            <div class="entity-info">
              <span class="entity-name">{entity.displayName}</span>
              <span class="entity-detail">{entity.email}</span>
            </div>
          {:else}
            <!-- Group result -->
            <GroupIcon />
            <div class="entity-info">
              <span class="entity-name">{entity.name}</span>
              <span class="entity-detail">{entity.memberCount} members</span>
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  {#if showDropdown && query.length >= 2 && !isSearching && results.length === 0}
    <div class="search-empty">
      No users or groups found
    </div>
  {/if}
</div>
```

**Methods:**
```typescript
function handleInput() {
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    if (query.length < 2) {
      results = [];
      return;
    }

    isSearching = true;

    try {
      // Search users
      const usersRes = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const usersData = await usersRes.json();
      const users: User[] = usersData.users ?? [];

      // Search groups
      const groupsRes = await fetch(`/api/groups/search?q=${encodeURIComponent(query)}`);
      const groupsData = await groupsRes.json();
      const groups: Group[] = groupsData.groups ?? [];

      // Filter out already-members and combine
      results = [
        ...users.filter(u => !excludeIds.includes(u.id)),
        ...groups.filter(g => !excludeIds.includes(g.id))
      ];

      selectedIndex = 0;
    } catch (error) {
      console.error('Search failed:', error);
      results = [];
    } finally {
      isSearching = false;
    }
  }, 300); // 300ms debounce
}

function handleKeydown(e: KeyboardEvent) {
  if (!showDropdown || results.length === 0) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % results.length;
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + results.length) % results.length;
      break;
    case 'Enter':
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
      break;
    case 'Escape':
      e.preventDefault();
      showDropdown = false;
      break;
  }
}

function handleSelect(entity: User | Group) {
  onSelect(entity);
  query = '';
  results = [];
  showDropdown = false;
  selectedIndex = 0;
}

onMount(() => {
  // Click outside to close
  const handleClickOutside = (e: MouseEvent) => {
    if (!inputElement?.contains(e.target as Node)) {
      showDropdown = false;
    }
  };
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
});
```

---

### 3. AreaMemberList.svelte

**Purpose:** Display and manage current members

**Props:**
```typescript
interface Props {
  members: AreaMemberWithDetails[];
  canManage: boolean;
  currentUserId: string;
  onChangeRole: (memberId: string, newRole: AreaMemberRole) => void;
  onRemove: (memberId: string) => void;
}
```

**Layout:**
```svelte
<ul class="member-list" role="list">
  {#each members as member (member.id)}
    <li class="member-item">
      <!-- Avatar/Icon -->
      <div class="member-avatar">
        {#if member.userId}
          <UserAvatar
            userId={member.userId}
            name={member.userName}
            size="md"
          />
        {:else}
          <GroupIcon size="md" />
        {/if}
      </div>

      <!-- Info -->
      <div class="member-info">
        <span class="member-name">
          {member.userName ?? member.groupName}
          {#if member.userId === currentUserId}
            <span class="you-badge">(You)</span>
          {/if}
        </span>
        {#if member.userEmail}
          <span class="member-email">{member.userEmail}</span>
        {:else if member.groupName}
          <span class="member-detail">Group</span>
        {/if}
      </div>

      <!-- Role Badge/Selector -->
      <div class="member-role">
        {#if canManage && member.role !== 'owner' && member.userId !== currentUserId}
          <AreaRoleSelector
            currentRole={member.role}
            onChange={(newRole) => onChangeRole(member.id, newRole)}
          />
        {:else}
          <AreaRoleBadge role={member.role} />
          {#if member.role === 'owner'}
            <LockIcon size="sm" title="Owners cannot be changed" />
          {/if}
        {/if}
      </div>

      <!-- Remove Button -->
      {#if canManage && member.role !== 'owner' && member.userId !== currentUserId}
        <button
          class="remove-button"
          onclick={() => onRemove(member.id)}
          aria-label="Remove {member.userName ?? member.groupName}"
        >
          <XIcon />
        </button>
      {/if}
    </li>
  {/each}
</ul>
```

**Styling:**
```css
.member-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  transition: background-color 0.2s;
}

.member-item:hover {
  background-color: var(--bg-secondary);
}

.member-avatar {
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.member-name {
  font-weight: 500;
  color: var(--text-primary);
}

.you-badge {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-tertiary);
}

.member-email,
.member-detail {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.member-role {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.remove-button {
  flex-shrink: 0;
  padding: 0.5rem;
  color: var(--text-tertiary);
  transition: color 0.2s;
}

.remove-button:hover {
  color: var(--danger);
}
```

---

### 4. AreaRoleSelector.svelte

**Purpose:** Dropdown to change member role

**Props:**
```typescript
interface Props {
  currentRole: AreaMemberRole;
  onChange: (newRole: AreaMemberRole) => void;
  disabled?: boolean;
}
```

**State:**
```typescript
import { ASSIGNABLE_ROLES, getRoleLabel, getRoleDescription } from '$lib/types/area-memberships';

let isOpen = $state(false);
let selectedRole = $state(currentRole);
```

**Layout:**
```svelte
<div class="role-selector" class:disabled>
  <button
    class="role-selector-trigger"
    onclick={() => !disabled && (isOpen = !isOpen)}
    aria-label="Change role"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    disabled={disabled}
  >
    <AreaRoleBadge role={selectedRole} />
    {#if !disabled}
      <ChevronDownIcon size="sm" />
    {/if}
  </button>

  {#if isOpen}
    <div
      class="role-selector-dropdown"
      role="listbox"
    >
      {#each ASSIGNABLE_ROLES as role}
        <button
          class="role-option"
          class:selected={role === selectedRole}
          role="option"
          aria-selected={role === selectedRole}
          onclick={() => handleSelect(role)}
        >
          <AreaRoleBadge {role} />
          <div class="role-details">
            <span class="role-label">{getRoleLabel(role)}</span>
            <span class="role-description">{getRoleDescription(role)}</span>
          </div>
          {#if role === selectedRole}
            <CheckIcon size="sm" />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
```

**Methods:**
```typescript
function handleSelect(role: AreaMemberRole) {
  selectedRole = role;
  onChange(role);
  isOpen = false;
}

onMount(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (!(e.target as Element).closest('.role-selector')) {
      isOpen = false;
    }
  };
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
});
```

---

### 5. AreaAccessToggle.svelte

**Purpose:** Toggle between open and restricted access modes

**Props:**
```typescript
interface Props {
  isRestricted: boolean;
  onChange: (isRestricted: boolean) => void;
}
```

**Layout:**
```svelte
<div class="access-toggle">
  <label class="access-option">
    <input
      type="radio"
      name="access-mode"
      value="open"
      checked={!isRestricted}
      onchange={() => onChange(false)}
    />
    <div class="option-content">
      <div class="option-header">
        <UnlockIcon />
        <span class="option-title">Open to Space</span>
      </div>
      <p class="option-description">
        Anyone with space access can view and participate
      </p>
    </div>
  </label>

  <label class="access-option">
    <input
      type="radio"
      name="access-mode"
      value="restricted"
      checked={isRestricted}
      onchange={() => onChange(true)}
    />
    <div class="option-content">
      <div class="option-header">
        <LockIcon />
        <span class="option-title">Restricted</span>
      </div>
      <p class="option-description">
        Only invited members have access. Requires explicit invites.
      </p>
    </div>
  </label>
</div>

<!-- Info box -->
<div class="access-info">
  <InfoIcon />
  <p>
    {#if isRestricted}
      This area is private. Only invited members can access it.
    {:else}
      All space members can access this area by default.
    {/if}
  </p>
</div>
```

**Styling:**
```css
.access-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.access-option {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.access-option:has(input:checked) {
  border-color: var(--primary);
  background-color: var(--primary-bg);
}

.access-option:hover {
  border-color: var(--primary-hover);
}

.option-content {
  flex: 1;
}

.option-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.option-title {
  font-weight: 600;
  color: var(--text-primary);
}

.option-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.access-info {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-info);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
```

---

### 6. AreaRoleBadge.svelte

**Purpose:** Reusable role badge with icon and label

**Props:**
```typescript
interface Props {
  role: AreaMemberRole | 'inherited';
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}
```

**Layout:**
```svelte
<span
  class="role-badge"
  class:size-sm={size === 'sm'}
  class:size-md={size === 'md' || !size}
  data-role={role}
  title={showTooltip ? getTooltip() : undefined}
>
  <svelte:component this={getRoleIcon(role)} size="xs" />
  <span class="role-label">{getRoleLabel(role)}</span>
</span>
```

**Methods:**
```typescript
function getRoleIcon(role: AreaMemberRole | 'inherited') {
  switch (role) {
    case 'owner': return CrownIcon;
    case 'admin': return SettingsIcon;
    case 'member': return EditIcon;
    case 'viewer': return EyeIcon;
    case 'inherited': return LinkIcon;
  }
}

function getTooltip() {
  return getRoleDescription(role);
}
```

**Styling:**
```css
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.role-badge.size-sm {
  padding: 0.125rem 0.375rem;
  font-size: 0.6875rem;
}

.role-badge[data-role="owner"] {
  background: var(--role-owner-bg);
  color: var(--role-owner);
}

.role-badge[data-role="admin"] {
  background: var(--role-admin-bg);
  color: var(--role-admin);
}

.role-badge[data-role="member"] {
  background: var(--role-member-bg);
  color: var(--role-member);
}

.role-badge[data-role="viewer"] {
  background: var(--role-viewer-bg);
  color: var(--role-viewer);
}

.role-badge[data-role="inherited"] {
  background: var(--role-inherited-bg);
  color: var(--role-inherited);
}
```

---

### 7. AreaAvatarStack.svelte

**Purpose:** Show member avatars in area header

**Props:**
```typescript
interface Props {
  areaId: string;
  maxDisplay?: number; // Default 3
  onClick?: () => void;
}
```

**State:**
```typescript
let members = $derived(areaStore.getMembersForArea(areaId));
let displayMembers = $derived(members.slice(0, maxDisplay ?? 3));
let remainingCount = $derived(Math.max(0, members.length - (maxDisplay ?? 3)));
```

**Layout:**
```svelte
<button
  class="avatar-stack"
  onclick={onClick}
  aria-label="View {members.length} members"
>
  <div class="avatars">
    {#each displayMembers as member}
      {#if member.userId}
        <UserAvatar
          userId={member.userId}
          name={member.userName}
          size="sm"
        />
      {:else}
        <div class="group-avatar">
          <GroupIcon size="xs" />
        </div>
      {/if}
    {/each}
  </div>

  {#if remainingCount > 0}
    <span class="remaining-count">+{remainingCount}</span>
  {/if}
</button>
```

**Styling:**
```css
.avatar-stack {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 20px;
  transition: background-color 0.2s;
}

.avatar-stack:hover {
  background-color: var(--bg-secondary);
}

.avatars {
  display: flex;
  margin-left: -0.25rem;
}

.avatars > * {
  margin-left: -0.5rem;
  border: 2px solid var(--bg-primary);
  border-radius: 50%;
}

.avatars > *:first-child {
  margin-left: 0;
}

.group-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--role-admin-bg);
  color: var(--role-admin);
  display: flex;
  align-items: center;
  justify-content: center;
}

.remaining-count {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}
```

---

### 8. AreaSharedIndicator.svelte

**Purpose:** Badge on area cards showing shared status

**Props:**
```typescript
interface Props {
  memberCount: number;
  isRestricted: boolean;
}
```

**Layout:**
```svelte
<div
  class="shared-indicator"
  class:restricted={isRestricted}
  title={getTooltip()}
>
  {#if isRestricted}
    <LockIcon size="xs" />
  {/if}
  <UsersIcon size="xs" />
  <span class="count">{memberCount}</span>
</div>
```

**Methods:**
```typescript
function getTooltip() {
  const base = `${memberCount} member${memberCount === 1 ? '' : 's'}`;
  return isRestricted ? `${base} (Restricted)` : base;
}
```

**Styling:**
```css
.shared-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.shared-indicator.restricted {
  background: var(--danger-bg);
  color: var(--danger);
}

.count {
  font-weight: 500;
}
```

---

## User Flows

### Flow 1: Share an Area (Happy Path)

**Scenario:** Owner wants to add a colleague to their project area

**Steps:**
1. User navigates to area view
2. Clicks "Share" button in header
3. Modal opens, search input auto-focused
4. Types "jane" → sees "Jane Smith (jane@company.com)"
5. Clicks Jane's result
6. Role selector shows, defaults to "Member"
7. Confirms by clicking "Add" or pressing Enter
8. Jane appears in member list immediately
9. Toast shows: "Added Jane Smith as Member"
10. Jane can now access the area

**Edge Cases:**
- **User already member:** Search excludes them, or shows "Already a member"
- **Network error:** Shows error toast, allows retry
- **Insufficient permissions:** Share button hidden/disabled

---

### Flow 2: Change Member Role

**Scenario:** Owner wants to promote member to admin

**Steps:**
1. Open share modal (area already shared)
2. Member list shows current members
3. Click role dropdown next to member
4. Dropdown shows: Admin, Member, Viewer with descriptions
5. Select "Admin"
6. Dropdown closes, badge updates immediately
7. Toast shows: "Changed Jane Smith to Admin"
8. Backend sync happens (optimistic update)

**Edge Cases:**
- **Demoting last owner:** Blocked with error message
- **Demoting self as owner:** Confirmation dialog first
- **Network error:** Rolls back UI, shows error toast

---

### Flow 3: Make Area Restricted

**Scenario:** Team wants to hide sensitive project from rest of space

**Steps:**
1. Open share modal
2. Scroll to "Access Control" section
3. Currently shows "Open to Space" selected
4. Click "Restricted" radio button
5. Confirmation dialog appears:
   - "This will restrict access to invited members only"
   - "Space members will need explicit invites"
   - Shows: "~12 users will lose access"
6. Click "Restrict Access"
7. Dialog closes, toggle updates
8. Toast: "Area is now restricted to invited members"
9. Lock icon appears on area card

**Edge Cases:**
- **No explicit members:** Warning that only creator has access
- **Going back to open:** Simple toggle, no confirmation needed
- **Network error:** Rolls back toggle, shows error

---

### Flow 4: Remove Member

**Scenario:** Admin wants to remove someone who left the project

**Steps:**
1. Open share modal
2. Find member in list
3. Click X button next to their name
4. Confirmation dialog:
   - "Remove Jane Smith from this area?"
   - If they have content: Shows task/conversation count
5. Click "Remove"
6. Member disappears from list immediately
7. Toast: "Removed Jane Smith"
8. Their access revoked instantly

**Edge Cases:**
- **Last owner:** X button hidden, shows lock icon instead
- **Removing self:** Allowed for non-owners, confirmation dialog
- **Member has tasks:** Info shown in confirmation, content remains

---

### Flow 5: Add Group

**Scenario:** Owner wants to give entire team access

**Steps:**
1. Open share modal
2. Type "engineering" in search
3. Sees "👥 Engineering Team (8 members)"
4. Clicks group result
5. Role selector appears, select "Member"
6. Group added to list with group icon
7. Toast: "Added Engineering Team as Member"
8. All 8 team members now have member-level access
9. Expandable item shows "8 members" count

**Edge Cases:**
- **Empty group:** Allowed, shows "(0 members)" count
- **Group already added:** Excluded from search
- **Mixed roles:** Group role applies to all members

---

## Implementation Phases

### Phase 1: Core Modal & Member Display (Week 1)

**Goal:** Users can see who has access to an area

**Tasks:**
1. Create `ShareAreaModal.svelte` skeleton
2. Implement modal trigger button in area header
3. Create `AreaMemberList.svelte` component
4. Create `AreaRoleBadge.svelte` component
5. Wire up `areaStore.loadMembers()` on modal open
6. Display member list (read-only)
7. Show "You" badge for current user
8. Show lock icon for owners (can't be changed)
9. Handle loading/error states
10. Add "Close" button to dismiss modal

**Files to Create:**
- `src/lib/components/areas/ShareAreaModal.svelte`
- `src/lib/components/areas/AreaMemberList.svelte`
- `src/lib/components/areas/AreaRoleBadge.svelte`
- `src/lib/components/areas/EmptyMemberState.svelte`

**Files to Update:**
- `src/routes/spaces/[space]/[area]/+page.svelte` - Add share button

**Acceptance Criteria:**

- [ ] **Modal Opens**
  - [ ] "Share" button visible in area header for owner/admin
  - [ ] "Share" button hidden for member/viewer roles
  - [ ] Clicking button opens modal
  - [ ] Modal has proper title: "Share {area name}"
  - [ ] Modal shows area restriction status if restricted

- [ ] **Member List Loads**
  - [ ] Calls `areaStore.loadMembers(areaId)` on modal open
  - [ ] Shows loading spinner while fetching
  - [ ] Displays all members after load
  - [ ] Each member shows avatar/icon, name, email/type, role badge

- [ ] **Member Display Accuracy**
  - [ ] User members show user avatar + display name + email
  - [ ] Group members show group icon + group name + "Group" label
  - [ ] Current user has "(You)" badge next to name
  - [ ] Owner role shows lock icon (can't be changed)
  - [ ] Members sorted: owners first, then by name

- [ ] **Role Badges**
  - [ ] Owner badge: purple with crown icon
  - [ ] Admin badge: blue with settings icon
  - [ ] Member badge: green with edit icon
  - [ ] Viewer badge: gray with eye icon
  - [ ] Inherited badge: sky blue with link icon (future)
  - [ ] Badges show tooltip with permission description on hover

- [ ] **Empty States**
  - [ ] Shows "No additional members yet" when only creator
  - [ ] Shows invitation message
  - [ ] Empty state has appropriate icon and styling

- [ ] **Error Handling**
  - [ ] Network error shows error message in modal
  - [ ] 403 error shows "Access denied" message
  - [ ] Error has retry option (re-opening modal retries)

- [ ] **Modal Behavior**
  - [ ] Escape key closes modal
  - [ ] Click outside modal closes it
  - [ ] "Close" button in footer works
  - [ ] Modal traps focus (can't tab outside)
  - [ ] First focusable element focused on open

- [ ] **Accessibility**
  - [ ] Modal has `role="dialog"`
  - [ ] Modal has `aria-labelledby` pointing to title
  - [ ] Share button has clear `aria-label`
  - [ ] Member list has `role="list"`
  - [ ] Each member item has `role="listitem"`
  - [ ] Screen reader announces modal open/close

- [ ] **Visual Polish**
  - [ ] Modal uses consistent spacing (1.5rem padding)
  - [ ] Section headers use uppercase styling
  - [ ] Member items have hover state
  - [ ] Color scheme matches app theme
  - [ ] Works in both light and dark mode

---

### Phase 2: Add & Remove Members (Week 2)

**Goal:** Users can invite others and remove access

**Tasks:**
1. Create `AreaMemberSearchInput.svelte` with autocomplete
2. Implement user search API endpoint or use existing
3. Implement group search API endpoint or use existing
4. Wire up `areaStore.addMember()` method
5. Wire up `areaStore.removeMember()` method
6. Add remove (X) buttons to member list items
7. Implement confirmation dialog for removal
8. Add optimistic updates for add/remove
9. Show toast notifications for success/error
10. Handle edge cases (last owner, removing self)

**Files to Create:**
- `src/lib/components/areas/AreaMemberSearchInput.svelte`
- `src/lib/components/areas/RemoveMemberButton.svelte` (or inline)

**Files to Update:**
- `ShareAreaModal.svelte` - Add search section
- `AreaMemberList.svelte` - Add remove buttons
- May need: `/api/users/search`, `/api/groups/search` endpoints

**Acceptance Criteria:**

- [ ] **Search Input**
  - [ ] Search input visible at top of modal
  - [ ] Placeholder: "Search by name or email..."
  - [ ] Search icon shown in input
  - [ ] Auto-focused when modal opens

- [ ] **Search Functionality**
  - [ ] Typing 2+ characters triggers search
  - [ ] Debounced 300ms (doesn't search on every keystroke)
  - [ ] Shows loading spinner during search
  - [ ] Searches both users and groups simultaneously
  - [ ] Results appear in dropdown below input

- [ ] **Search Results Display**
  - [ ] User results show: avatar, display name, email
  - [ ] Group results show: group icon, name, member count
  - [ ] Results limited to non-members (excludes current members)
  - [ ] Empty state shown if no results: "No users or groups found"
  - [ ] Results hidden if query < 2 characters

- [ ] **Search Interaction**
  - [ ] Clicking result selects it
  - [ ] Arrow up/down navigates results
  - [ ] Enter key selects highlighted result
  - [ ] Escape key closes dropdown
  - [ ] Click outside closes dropdown
  - [ ] Selected result cleared from input after selection

- [ ] **Add Member Flow**
  - [ ] Selecting user/group shows role selector or adds with default
  - [ ] Default role is "Member"
  - [ ] Calls `areaStore.addMember(areaId, { userId/groupId, role })`
  - [ ] Member appears in list immediately (optimistic)
  - [ ] Loading state shown during API call (button disabled or spinner)
  - [ ] Success toast: "Added {name} as {role}"

- [ ] **Add Member Validation**
  - [ ] Cannot add user/group already in list
  - [ ] Cannot add self (already owner/member)
  - [ ] Cannot assign "owner" role via add (reserved for ownership transfer)
  - [ ] Shows error if user/group not found
  - [ ] Shows error if insufficient permissions

- [ ] **Remove Member UI**
  - [ ] X button visible next to each member (except owners and self if owner)
  - [ ] X button turns red on hover
  - [ ] Owner entries show lock icon instead of X button
  - [ ] Current user cannot remove themselves if they're the last owner

- [ ] **Remove Member Confirmation**
  - [ ] Clicking X shows confirmation dialog
  - [ ] Dialog title: "Remove Member"
  - [ ] Dialog body: "Remove {name} from this area?"
  - [ ] If member has content, shows count: "{name} has 3 tasks and 5 conversations"
  - [ ] Dialog has [Cancel] and [Remove] buttons

- [ ] **Remove Member Flow**
  - [ ] Clicking Remove calls `areaStore.removeMember(areaId, memberId)`
  - [ ] Member disappears from list immediately (optimistic)
  - [ ] Loading state shown during API call
  - [ ] Success toast: "Removed {name}"
  - [ ] Error rolls back (member reappears) with error toast

- [ ] **Remove Member Validation**
  - [ ] Cannot remove last owner (X button hidden)
  - [ ] Cannot remove self if last owner (X button hidden)
  - [ ] Warning if member has active content
  - [ ] Shows error if insufficient permissions

- [ ] **Error Handling**
  - [ ] Search error: "Failed to search users/groups"
  - [ ] Add error: "Failed to add member: {reason}"
  - [ ] Remove error: "Failed to remove member: {reason}"
  - [ ] Network error: Shows retry option in toast
  - [ ] Validation error: Shows specific message

- [ ] **Optimistic Updates**
  - [ ] Add: Member appears immediately, removed if API fails
  - [ ] Remove: Member disappears immediately, reappears if API fails
  - [ ] Loading indicators subtle (no modal blocking)
  - [ ] UI remains responsive during operations

- [ ] **Accessibility**
  - [ ] Search input has `aria-label="Search for users or groups"`
  - [ ] Search results have `role="listbox"`
  - [ ] Each result has `role="option"`
  - [ ] Selected result has `aria-selected="true"`
  - [ ] Remove button has `aria-label="Remove {name}"`
  - [ ] Confirmation dialog is modal with proper focus trap

- [ ] **Keyboard Navigation**
  - [ ] Tab moves between input and results
  - [ ] Arrow keys navigate search results
  - [ ] Enter selects current result
  - [ ] Escape closes dropdown/dialog
  - [ ] Delete key on member focuses remove button (optional)

---

### Phase 3: Role Management & Access Control (Week 3)

**Goal:** Users can change roles and toggle area restriction

**Tasks:**
1. Create `AreaRoleSelector.svelte` dropdown component
2. Wire up `areaStore.updateMemberRole()` method
3. Add role selector to each member list item
4. Implement confirmation for owner demotion
5. Create `AreaAccessToggle.svelte` component
6. Add access control section to modal
7. Wire up area `is_restricted` update
8. Implement confirmation for restricting access
9. Show affected user count when restricting
10. Add optimistic updates for role changes

**Files to Create:**
- `src/lib/components/areas/AreaRoleSelector.svelte`
- `src/lib/components/areas/AreaAccessToggle.svelte`

**Files to Update:**
- `ShareAreaModal.svelte` - Add access control section
- `AreaMemberList.svelte` - Use role selector instead of static badge

**Acceptance Criteria:**

- [ ] **Role Selector UI**
  - [ ] Appears in member list for all non-owner members
  - [ ] Shows current role as trigger button
  - [ ] Clicking opens dropdown with available roles
  - [ ] Dropdown shows: Admin, Member, Viewer (not Owner)
  - [ ] Each role has icon, label, and short description
  - [ ] Current role has checkmark indicator

- [ ] **Role Selector Behavior**
  - [ ] Only shown for members you can manage (not owners, not if viewer)
  - [ ] Disabled for owners (shows static badge + lock icon instead)
  - [ ] Current user cannot change their own role
  - [ ] Clicking outside dropdown closes it
  - [ ] Escape key closes dropdown

- [ ] **Change Role Flow**
  - [ ] Selecting new role closes dropdown immediately
  - [ ] Calls `areaStore.updateMemberRole(areaId, memberId, newRole)`
  - [ ] Badge updates immediately (optimistic)
  - [ ] Loading indicator shown briefly
  - [ ] Success toast: "Changed {name} to {role}"

- [ ] **Demote Owner Confirmation**
  - [ ] If changing owner to non-owner, shows confirmation dialog
  - [ ] Dialog title: "Demote Owner"
  - [ ] Dialog body: "Are you sure you want to change {name} from Owner to {role}?"
  - [ ] Warning if they're the last owner: "Cannot demote the last owner"
  - [ ] Dialog has [Cancel] and [Demote] buttons

- [ ] **Change Role Validation**
  - [ ] Cannot demote last owner (selector disabled or grayed)
  - [ ] Cannot promote to owner via selector (owner not in list)
  - [ ] Viewer cannot change any roles (selector hidden)
  - [ ] Member cannot change roles (selector hidden)

- [ ] **Access Control Section**
  - [ ] Section visible below member list
  - [ ] Section header: "Access Control"
  - [ ] Only visible to owner/admin
  - [ ] Shows current mode (Open or Restricted)

- [ ] **Access Toggle UI**
  - [ ] Two radio options: "Open to Space" and "Restricted"
  - [ ] Open option shows unlock icon + description
  - [ ] Restricted option shows lock icon + description
  - [ ] Current mode is selected (radio checked)
  - [ ] Clicking option highlights card with primary color

- [ ] **Toggle to Restricted**
  - [ ] Shows confirmation dialog before applying
  - [ ] Dialog title: "Restrict Access"
  - [ ] Dialog body: "Only invited members will have access. Space members will need explicit invites."
  - [ ] Shows affected user count if available: "This affects ~12 users"
  - [ ] Dialog has [Cancel] and [Restrict Access] buttons

- [ ] **Toggle to Open**
  - [ ] No confirmation needed (less destructive)
  - [ ] Applies immediately
  - [ ] Updates optimistically

- [ ] **Access Toggle Flow**
  - [ ] Calls `areaStore.updateArea(areaId, { isRestricted })`
  - [ ] Toggle updates immediately (optimistic)
  - [ ] Success toast: "Area is now {restricted/open}"
  - [ ] Lock icon appears/disappears on area card

- [ ] **Access Toggle Validation**
  - [ ] Only owner can change access mode (admin sees read-only)
  - [ ] Restricting with zero members warns creator will be only one
  - [ ] Cannot toggle if user doesn't have manage permissions

- [ ] **Info Messages**
  - [ ] Info box below toggle explains current mode
  - [ ] If restricted: "This area is private. Only invited members can access it."
  - [ ] If open: "All space members can access this area by default."
  - [ ] Info icon with subtle background color

- [ ] **Error Handling**
  - [ ] Role change error: "Failed to update role: {reason}"
  - [ ] Access toggle error: "Failed to update access mode: {reason}"
  - [ ] Rolls back optimistic update on error
  - [ ] Shows retry option in error toast

- [ ] **Optimistic Updates**
  - [ ] Role change: Badge updates immediately
  - [ ] Access toggle: Toggle reflects change immediately
  - [ ] Rollback on error with visual feedback
  - [ ] No modal blocking during operations

- [ ] **Visual Feedback**
  - [ ] Role badge animates when changed (subtle fade/scale)
  - [ ] Access toggle card highlights when selected
  - [ ] Success states use green color scheme
  - [ ] Error states use red color scheme
  - [ ] Loading states show subtle spinner

- [ ] **Accessibility**
  - [ ] Role selector has `aria-label="Change role for {name}"`
  - [ ] Dropdown has `role="listbox"`
  - [ ] Each role option has `role="option"`
  - [ ] Access toggle radios have proper labels
  - [ ] Confirmation dialogs trap focus
  - [ ] Screen reader announces role changes

- [ ] **Keyboard Navigation**
  - [ ] Tab moves between role selectors
  - [ ] Enter/Space opens role dropdown
  - [ ] Arrow keys navigate role options
  - [ ] Enter selects role
  - [ ] Tab moves between access radio buttons
  - [ ] Space selects radio option

---

### Phase 4: Visual Integration & Polish (Week 4)

**Goal:** Sharing UI integrated throughout app with polish

**Tasks:**
1. Create `AreaAvatarStack.svelte` for headers
2. Create `AreaSharedIndicator.svelte` for cards
3. Add avatar stack to area view header
4. Add shared indicator badge to area cards
5. Add "Share" to area card context menu
6. Update area sidebar to show shared indicator
7. Add permission tooltips to role badges
8. Implement mobile-optimized modal
9. Add animations and transitions
10. Comprehensive testing and bug fixes

**Files to Create:**
- `src/lib/components/areas/AreaAvatarStack.svelte`
- `src/lib/components/areas/AreaSharedIndicator.svelte`

**Files to Update:**
- `src/lib/components/areas/AreaCard.svelte` - Add shared indicator
- `src/routes/spaces/[space]/[area]/+page.svelte` - Add avatar stack
- `src/lib/components/layout/Sidebar.svelte` - Show shared indicators
- All sharing components - Add animations and mobile optimization

**Acceptance Criteria:**

- [ ] **Avatar Stack Component**
  - [ ] Shows first 3 member avatars in overlapping stack
  - [ ] User avatars show profile pictures (fallback to initials)
  - [ ] Group memberships show group icon
  - [ ] Avatars have white border for separation
  - [ ] "+N more" indicator shown if > 3 members
  - [ ] Clicking stack opens share modal

- [ ] **Avatar Stack in Area Header**
  - [ ] Visible in area view next to area name
  - [ ] Positioned between name and action buttons
  - [ ] Only shown if area has > 1 member (excluding creator if no explicit membership)
  - [ ] Tooltip on hover shows: "{count} members"
  - [ ] Updates reactively when members change

- [ ] **Shared Indicator Component**
  - [ ] Shows people icon + member count
  - [ ] If restricted, shows lock icon before people icon
  - [ ] Badge has subtle background color
  - [ ] Tooltip shows: "{count} member(s)" or "{count} member(s) (Restricted)"
  - [ ] Compact design fits on area cards

- [ ] **Shared Indicator on Cards**
  - [ ] Appears in area card header near name
  - [ ] Only shown if area has > 1 member
  - [ ] Restricted areas show red/orange variant
  - [ ] Non-restricted areas show neutral/blue variant
  - [ ] Clicking indicator opens share modal (if has permission)

- [ ] **Context Menu Integration**
  - [ ] "Share" option added to area card context menu
  - [ ] Positioned after "Edit" and before "Delete"
  - [ ] Shows share icon (users/people icon)
  - [ ] Disabled if user doesn't have manage permission
  - [ ] Clicking opens share modal

- [ ] **Sidebar Integration**
  - [ ] Shared areas show indicator in sidebar area list
  - [ ] Subtle icon (people icon) shown after area name
  - [ ] Restricted areas show lock icon
  - [ ] Tooltip on hover: "Shared with {count} members"
  - [ ] Doesn't clutter UI (subtle, small)

- [ ] **Permission Tooltips**
  - [ ] Role badges show tooltip on hover
  - [ ] Tooltip lists permissions for that role
  - [ ] Owner tooltip: "Full control including deletion and settings"
  - [ ] Admin tooltip: "Can manage settings and members"
  - [ ] Member tooltip: "Can create and edit content"
  - [ ] Viewer tooltip: "Read-only access"
  - [ ] Tooltip has max-width and wraps text nicely

- [ ] **Mobile Optimization**
  - [ ] Modal becomes full-screen sheet on mobile (<768px)
  - [ ] Search input fixed at top while scrolling
  - [ ] Member list scrollable with momentum
  - [ ] Role selector uses native select on mobile
  - [ ] Large tap targets (minimum 44x44px)
  - [ ] Share button in header replaced with icon on mobile
  - [ ] Avatar stack shows "+N" only on small screens

- [ ] **Animations & Transitions**
  - [ ] Modal fades in (200ms ease-out)
  - [ ] Modal backdrop fades in separately
  - [ ] Member list items fade in on load (staggered 50ms)
  - [ ] Adding member: slide in animation
  - [ ] Removing member: fade out + slide up
  - [ ] Role badge change: subtle scale pulse
  - [ ] Toast notifications slide in from top
  - [ ] All animations respect `prefers-reduced-motion`

- [ ] **Loading States**
  - [ ] Initial member load shows skeleton UI
  - [ ] Search shows inline spinner
  - [ ] Add/remove operations show subtle spinner on button
  - [ ] Role change shows brief loading state
  - [ ] Access toggle shows loading during update
  - [ ] No full-screen blocking loaders

- [ ] **Empty States**
  - [ ] "No members yet" with illustration/icon
  - [ ] Invitation message with clear CTA
  - [ ] "No search results" with helpful message
  - [ ] Empty group indicator: "This group has no members"

- [ ] **Error States**
  - [ ] Inline errors in modal (below search/member list)
  - [ ] Error toasts for async operations
  - [ ] Retry buttons where appropriate
  - [ ] Clear error messages (not technical jargon)
  - [ ] Network errors suggest checking connection

- [ ] **Polish Details**
  - [ ] All text properly capitalized
  - [ ] Consistent spacing throughout (8px grid)
  - [ ] Proper color contrast (WCAG AA minimum)
  - [ ] Icons consistently sized (16px or 20px)
  - [ ] Hover states on all interactive elements
  - [ ] Focus indicators visible and clear

- [ ] **Theme Support**
  - [ ] Works correctly in light mode
  - [ ] Works correctly in dark mode
  - [ ] Colors defined using CSS variables
  - [ ] Proper contrast in both themes
  - [ ] Icons have proper fill/stroke colors

- [ ] **Accessibility Audit**
  - [ ] All interactive elements keyboard accessible
  - [ ] Proper heading hierarchy (h1 → h2 → h3)
  - [ ] All images/icons have alt text or aria-labels
  - [ ] Color not the only indicator (icons + text)
  - [ ] Focus management works correctly
  - [ ] Screen reader tested (VoiceOver/NVDA)

- [ ] **Performance**
  - [ ] Member list virtualizes if > 100 members
  - [ ] Search debounced (300ms)
  - [ ] Images lazy-loaded where appropriate
  - [ ] No unnecessary re-renders
  - [ ] Smooth 60fps animations
  - [ ] Modal opens in < 100ms

- [ ] **Cross-Browser Testing**
  - [ ] Works in Chrome/Edge (Chromium)
  - [ ] Works in Safari (WebKit)
  - [ ] Works in Firefox (Gecko)
  - [ ] Mobile Safari tested
  - [ ] Chrome Android tested

- [ ] **Edge Cases Handled**
  - [ ] Area with 0 members (only creator)
  - [ ] Area with 100+ members (pagination or virtual scroll)
  - [ ] Empty group added to area
  - [ ] User removed while modal open
  - [ ] Area deleted while modal open
  - [ ] Network disconnects mid-operation
  - [ ] Concurrent edits by multiple users

- [ ] **Documentation**
  - [ ] Component README with props documented
  - [ ] Inline code comments for complex logic
  - [ ] Storybook stories for components (optional)
  - [ ] User-facing help text where needed

---

## Design System Integration

### Color Palette

Add to `app.css`:

```css
:root {
  /* Role colors */
  --role-owner: #9333ea;
  --role-owner-bg: rgba(147, 51, 234, 0.1);

  --role-admin: #3b82f6;
  --role-admin-bg: rgba(59, 130, 246, 0.1);

  --role-member: #10b981;
  --role-member-bg: rgba(16, 185, 129, 0.1);

  --role-viewer: #6b7280;
  --role-viewer-bg: rgba(107, 114, 128, 0.1);

  --role-inherited: #0ea5e9;
  --role-inherited-bg: rgba(14, 165, 233, 0.1);

  /* Access control colors */
  --access-open: #10b981;
  --access-restricted: #ef4444;
  --access-info-bg: rgba(59, 130, 246, 0.05);
}

[data-theme="dark"] {
  /* Darker variants for dark mode */
  --role-owner-bg: rgba(147, 51, 234, 0.15);
  --role-admin-bg: rgba(59, 130, 246, 0.15);
  --role-member-bg: rgba(16, 185, 129, 0.15);
  --role-viewer-bg: rgba(107, 114, 128, 0.15);
  --role-inherited-bg: rgba(14, 165, 233, 0.15);
  --access-info-bg: rgba(59, 130, 246, 0.1);
}
```

### Typography

Follow existing patterns:
- **Modal Title:** `font-size: 1.25rem; font-weight: 600;`
- **Section Headers:** `font-size: 0.875rem; font-weight: 600; text-transform: uppercase;`
- **Body Text:** `font-size: 1rem; font-weight: 400;`
- **Helper Text:** `font-size: 0.875rem; color: var(--text-secondary);`
- **Badges:** `font-size: 0.75rem; font-weight: 500;`

### Spacing

Use 8px grid system:
- **Modal padding:** `1.5rem` (24px)
- **Section gaps:** `2rem` (32px)
- **Item gaps:** `0.5rem` (8px) to `0.75rem` (12px)
- **Button padding:** `0.5rem 1rem` (8px 16px)
- **Badge padding:** `0.25rem 0.5rem` (4px 8px)

### Iconography

Use existing icon library (lucide-svelte):
- **Share:** `<Share2>` or `<Users>`
- **Lock:** `<Lock>` (restricted)
- **Unlock:** `<Unlock>` or `<LockOpen>` (open)
- **Owner:** `<Crown>`
- **Admin:** `<Settings>` or `<Shield>`
- **Member:** `<Edit>` or `<User>`
- **Viewer:** `<Eye>`
- **Group:** `<Users>` or `<UsersRound>`
- **Add:** `<UserPlus>` or `<Plus>`
- **Remove:** `<X>` or `<UserMinus>`
- **Search:** `<Search>`

### Component Patterns

Follow existing component structure:
- Props interface at top with `interface Props`
- State using `$state()` runes
- Derived state using `$derived()` runes
- Event handlers with `on:` directive
- Reactive statements with `$effect()` when needed
- CSS in `<style>` block at bottom
- BEM-style class naming or utility classes

---

## Testing Strategy

### Unit Tests (Optional for V1)

Focus on store methods:
```typescript
describe('areaStore.addMember()', () => {
  it('should add user member with role', async () => {
    const result = await areaStore.addMember('area_123', {
      userId: 'user_456',
      role: 'member'
    });
    expect(result).toBe(true);
    expect(areaStore.getMembersForArea('area_123')).toContain(...);
  });

  it('should handle API errors gracefully', async () => {
    // Mock fetch to fail
    const result = await areaStore.addMember('area_123', { userId: 'bad' });
    expect(result).toBe(false);
    expect(areaStore.error).toBeTruthy();
  });
});
```

### Integration Tests

Focus on user flows:
```typescript
describe('Area Sharing Flow', () => {
  it('should allow owner to add member and change role', async () => {
    // 1. Open share modal
    // 2. Search for user
    // 3. Add user as member
    // 4. Verify member appears in list
    // 5. Change role to admin
    // 6. Verify role updated
  });

  it('should prevent non-owner from removing last owner', async () => {
    // 1. Login as admin
    // 2. Open share modal
    // 3. Verify owner has no remove button
    // 4. Verify lock icon shown
  });
});
```

### Manual Testing Checklist

**Phase 1:**
- [ ] Modal opens from share button
- [ ] Member list loads and displays correctly
- [ ] Owner/admin see appropriate controls
- [ ] Member/viewer have read-only view
- [ ] Role badges render correctly
- [ ] Empty state shows when no members

**Phase 2:**
- [ ] Search finds users and groups
- [ ] Adding user works and shows in list
- [ ] Adding group works and shows in list
- [ ] Removing user works and updates list
- [ ] Cannot remove last owner
- [ ] Confirmation dialogs appear and work

**Phase 3:**
- [ ] Changing role works and updates badge
- [ ] Cannot demote last owner
- [ ] Access toggle shows current state
- [ ] Restricting area shows confirmation
- [ ] Lock icon appears when restricted

**Phase 4:**
- [ ] Avatar stack shows in header
- [ ] Shared indicator appears on cards
- [ ] Context menu share option works
- [ ] Mobile layout works correctly
- [ ] Animations are smooth
- [ ] Works in light and dark mode

### Accessibility Testing

- [ ] Tab through all interactive elements
- [ ] Screen reader announces all changes
- [ ] Keyboard shortcuts work (Escape, Enter, Arrows)
- [ ] Focus visible on all elements
- [ ] Color contrast meets WCAG AA
- [ ] No keyboard traps

### Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Android

### Performance Testing

- [ ] Modal opens in < 100ms
- [ ] Search responds in < 500ms
- [ ] Member list renders 100 items smoothly
- [ ] Animations run at 60fps
- [ ] No memory leaks on repeated open/close

---

## Success Metrics

### Quantitative

- **Adoption:** % of areas shared with 2+ people within 2 weeks of feature launch
- **Speed:** Time to add first member (target: < 30 seconds)
- **Errors:** < 5% error rate on member operations
- **Performance:** Modal open time < 100ms, search results < 500ms

### Qualitative

- **Usability:** Users understand role system without documentation
- **Clarity:** No confusion about access levels or permissions
- **Confidence:** Users feel in control of who has access
- **Feedback:** Positive sentiment in user feedback/surveys

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend API failure | High | Optimistic updates with rollback |
| Search performance slow | Medium | Debouncing + caching + pagination |
| Mobile UX cramped | Medium | Full-screen sheet + larger tap targets |
| Permission confusion | High | Clear labels + tooltips + info boxes |
| Last owner edge case | Medium | Prevent removal + clear error messages |
| Network latency | Medium | Loading states + optimistic updates |

---

## Future Enhancements (Post-MVP)

### Priority 1 (Separate Implementation - Next)
1. **Email Notifications** - Notify users via email when added to areas
   - SendGrid integration
   - HTML email templates
   - Email preferences system (opt-in/opt-out)
   - Unsubscribe links (CAN-SPAM compliance)
   - Queue system with retry
   - Estimated: 1-2 weeks

### Priority 2 (After Email)
2. **In-App Notifications** - Bell icon system showing area invitations
3. **Activity Feed** - Stream showing "Added to area" events
4. **Bulk Operations** - Add/remove multiple members at once
5. **Member Activity** - Show last active time for members

### Priority 3 (Long-term)
6. **Access Requests** - Allow members to request access to restricted areas
7. **Ownership Transfer** - Formal flow to change area owner
8. **Expiring Access** - Time-limited member access
9. **Audit Log** - Track who added/removed members and when
10. **External Email Invites** - Invite users not yet in organization
11. **Templates** - Save member lists as templates for new areas
12. **Group Expansion** - Expand group members inline in list

---

## References

### Design Patterns
- **Document Sharing Modal** - `DocumentSharingModal.svelte`
- **Group Management** - `/admin/groups/[id]/+page.svelte`
- **Context Menus** - `AreaCard.svelte`, `ConversationItem.svelte`
- **Role Badges** - Similar to document permission badges

### Backend
- **ENTITY_MODEL.md** - Section 6.5 (area_memberships schema)
- **Migration 027** - `027-area-sharing.sql`
- **Repository** - `area-memberships-postgres.ts`
- **API Endpoints** - `/api/areas/[id]/members/*`

### Types
- **area-memberships.ts** - `AreaMemberRole`, `AreaMembership`, `AreaMemberWithDetails`
- **areas.ts** - `Area` with `isRestricted` and `createdBy`

### Related Docs
- **CONTEXT_STRATEGY.md** - Phase 3 (Shared Context)
- **enterprise-roadmap.md** - Multi-tenancy and collaboration features

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-12 | 1.0 | Initial implementation guide created |
