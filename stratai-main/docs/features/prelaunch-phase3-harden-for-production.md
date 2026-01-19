# Pre-Launch Phase 3: Harden for Production

## Overview

Production hardening to ensure data integrity and usability across devices. These issues could cause problems at scale or limit how users can access the application.

**Priority:** MEDIUM - Complete before production launch (can ship to internal testers without)
**Estimated Scope:** 4 user stories, ~4-5 hours implementation
**Dependencies:** Phase 1 and Phase 2 should be completed first

## Problem Statement

After Phases 1 and 2, the app is usable and polished, but has underlying issues that will cause problems at scale or limit accessibility:

1. **Document deletion orphans data** - Similar to space deletion, document deletion doesn't clean up area shares or task links.

2. **Chat has no error recovery** - Network failures lose the user's message with no retry option beyond the timeout added in Phase 1.

3. **Mobile responsiveness broken** - App layout breaks on screens < 768px. Sidebar overflows, chat input squished.

4. **No request deduplication** - Rapid clicks can fire duplicate API requests, causing race conditions.

## User Impact

- **Data integrity:** Orphaned document references accumulate over time
- **Lost work:** Users lose typed messages on network hiccups
- **Accessibility:** Mobile users can't use the app effectively
- **Race conditions:** Duplicate submissions create unexpected states

---

## User Stories

### US-001: Implement Document Deletion Cascade

**As a** user
**I need** document deletion to clean up shares and links
**So that** I don't have dead references throughout the app

**Technical Context:**
- Current: Document soft-delete only marks document as deleted
- Orphaned: `document_area_shares` records, `task_documents` links, area `context_document_ids` arrays
- Repository: `src/lib/server/persistence/documents-postgres.ts`
- Related: `document-sharing-postgres.ts`, `areas-postgres.ts`

**Files to Modify:**
- `src/lib/server/persistence/documents-postgres.ts` - Add cascade logic to `delete()` method

**Files to Reference:**
- `src/lib/server/persistence/document-sharing-postgres.ts` - Share record structure
- `src/lib/server/persistence/areas-postgres.ts` - contextDocumentIds handling

**Cascade Order:**
1. Remove document ID from all areas' `context_document_ids` arrays
2. Delete all `document_area_shares` records for this document
3. Delete all `task_documents` links for this document
4. Soft delete the document itself

**Implementation Pattern:**
```typescript
async delete(id: string, userId: string): Promise<void> {
  const document = await this.findById(id, userId);
  if (!document) throw new Error('Document not found');

  await sql.begin(async (tx) => {
    // 1. Remove from all areas' contextDocumentIds arrays
    await tx`
      UPDATE areas
      SET context_document_ids = array_remove(context_document_ids, ${id}::uuid)
      WHERE ${id}::uuid = ANY(context_document_ids)
    `;

    // 2. Delete area share records
    await tx`
      DELETE FROM document_area_shares
      WHERE document_id = ${id}
    `;

    // 3. Delete task-document links
    await tx`
      DELETE FROM task_documents
      WHERE document_id = ${id}
    `;

    // 4. Soft delete document
    await tx`
      UPDATE documents SET deleted_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `;
  });
}
```

**Acceptance Criteria:**
- [ ] Document deletion removes document from all areas' `context_document_ids`
- [ ] Document deletion deletes all `document_area_shares` records
- [ ] Document deletion deletes all `task_documents` links
- [ ] Deletion is atomic (transaction)
- [ ] Only document owner can delete (existing check preserved)
- [ ] API returns cleanup counts
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-002: Add Chat Message Retry on Failure

**As a** user
**I need** to retry failed messages without retyping
**So that** network issues don't lose my work

**Technical Context:**
- Phase 1 added timeout detection and toast notification
- This story adds the actual retry mechanism with inline UI
- Need to preserve the failed message content
- Main chat: `src/routes/+page.svelte`
- Area chat: `src/routes/spaces/[space]/[area]/+page.svelte`

**Files to Modify:**
- `src/routes/+page.svelte` - Add failed message state and UI
- `src/routes/spaces/[space]/[area]/+page.svelte` - Add failed message state and UI

**Files to Reference:**
- `src/lib/components/chat/ChatMessage.svelte` - For message styling patterns

**UX Specification:**

**Failed Message Card:**
Shows inline where the user's message would appear, styled as an error state.

```svelte
<!-- Failed message inline display -->
{#if failedMessage}
  <div class="flex justify-end px-4 py-2">
    <div class="max-w-[85%] md:max-w-[70%]">
      <!-- Failed message bubble - user message style with error state -->
      <div class="rounded-2xl rounded-br-md px-4 py-3
                  bg-red-500/10 border border-red-500/30">
        <!-- Message content preview -->
        <p class="text-sm text-zinc-200 whitespace-pre-wrap break-words">
          {failedMessage.content.length > 200
            ? failedMessage.content.slice(0, 200) + '...'
            : failedMessage.content}
        </p>

        <!-- Attachments indicator (if any) -->
        {#if failedMessage.attachments?.length}
          <div class="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
            <Paperclip class="w-3 h-3" />
            <span>{failedMessage.attachments.length} attachment{failedMessage.attachments.length > 1 ? 's' : ''}</span>
          </div>
        {/if}
      </div>

      <!-- Error indicator + actions -->
      <div class="flex items-center justify-end gap-2 mt-2">
        <!-- Error indicator -->
        <div class="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle class="w-3.5 h-3.5" />
          <span>Failed to send</span>
        </div>

        <!-- Divider dot -->
        <span class="w-1 h-1 rounded-full bg-zinc-600"></span>

        <!-- Retry button -->
        <button
          onclick={retryFailedMessage}
          class="inline-flex items-center gap-1 px-2 py-1 rounded-md
                 text-xs font-medium text-primary-400
                 hover:bg-primary-500/10 transition-colors"
        >
          <RotateCcw class="w-3 h-3" />
          Retry
        </button>

        <!-- Dismiss button -->
        <button
          onclick={dismissFailedMessage}
          class="inline-flex items-center gap-1 px-2 py-1 rounded-md
                 text-xs font-medium text-zinc-400
                 hover:bg-zinc-700/50 transition-colors"
        >
          <X class="w-3 h-3" />
          Dismiss
        </button>
      </div>
    </div>
  </div>
{/if}
```

**State Management:**
```typescript
import { RotateCcw, X, AlertCircle, Paperclip } from 'lucide-svelte';

// Track failed message for retry
let failedMessage = $state<{
  content: string;
  attachments?: Attachment[];
  timestamp: number;
} | null>(null);

// On send failure (in catch block or timeout):
function handleSendFailure(content: string, attachments?: Attachment[]) {
  failedMessage = {
    content,
    attachments,
    timestamp: Date.now()
  };
}

// On retry:
function retryFailedMessage() {
  if (failedMessage) {
    const { content, attachments } = failedMessage;
    failedMessage = null; // Clear first to prevent double-retry
    handleSendMessage(content, attachments);
  }
}

// On dismiss:
function dismissFailedMessage() {
  failedMessage = null;
}

// Clear failed message when user sends a new message
function handleSendMessage(content: string, attachments?: Attachment[]) {
  failedMessage = null; // Clear any previous failure
  // ... existing send logic
}
```

**Design Tokens Used:**
- Failed message bubble: `bg-red-500/10 border-red-500/30 rounded-2xl rounded-br-md`
- Error indicator: `text-red-400` with `AlertCircle` icon
- Retry button: `text-primary-400 hover:bg-primary-500/10`
- Dismiss button: `text-zinc-400 hover:bg-zinc-700/50`
- Action buttons: `text-xs font-medium px-2 py-1 rounded-md`
- Icons: `RotateCcw`, `X`, `AlertCircle`, `Paperclip` from lucide-svelte (w-3 h-3)
- Message preview max: 200 characters with ellipsis

**Acceptance Criteria:**
- [ ] Failed message displays with exact styling above (red tinted bubble)
- [ ] Error indicator shows "Failed to send" with `AlertCircle` icon
- [ ] "Retry" button uses `RotateCcw` icon and primary color
- [ ] "Dismiss" button uses `X` icon and muted color
- [ ] Message content truncated to 200 chars with ellipsis
- [ ] Attachments count shown if present
- [ ] Retry sends exact same content (including attachments)
- [ ] Dismiss clears the failed state
- [ ] Sending new message clears any previous failure
- [ ] Works in both main chat and area chat
- [ ] Only one failed message tracked at a time (latest)
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-003: Fix Mobile Responsiveness - Core Layout

**As a** mobile user
**I need** the app to work on small screens
**So that** I can use StratAI on my phone

**Technical Context:**
- Current: Layout breaks below 768px
- Issues: Sidebar overflows, chat input squished, modals overflow viewport
- Tailwind responsive prefixes: `sm:`, `md:`, `lg:`
- Target: Support screens down to 375px (iPhone SE)
- Breakpoint: 768px (`md:`) is the mobile/desktop boundary

**Files to Modify:**
- `src/routes/+layout.svelte` - Main layout responsive behavior
- `src/lib/components/Sidebar.svelte` - Collapsible on mobile
- `src/lib/components/Header.svelte` - Mobile header with hamburger menu
- `src/lib/components/ChatInput.svelte` - Full width on mobile
- `src/lib/components/spaces/SpaceModal.svelte` - Responsive modal
- `src/lib/components/areas/AreaModal.svelte` - Responsive modal

**UX Specification:**

**Mobile Header (< 768px):**
```svelte
<!-- Header.svelte mobile additions -->
<header class="flex items-center h-14 px-3 md:px-4 border-b border-zinc-800 bg-zinc-900">
  <!-- Hamburger menu - mobile only -->
  <button
    onclick={toggleSidebar}
    class="md:hidden flex-shrink-0 w-10 h-10 -ml-1 mr-2
           flex items-center justify-center rounded-lg
           text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
           transition-colors"
  >
    {#if sidebarOpen}
      <X class="w-5 h-5" />
    {:else}
      <Menu class="w-5 h-5" />
    {/if}
  </button>

  <!-- Logo/Title - truncate on mobile -->
  <div class="flex-1 min-w-0 truncate">
    <!-- ... existing content ... -->
  </div>

  <!-- Model selector - compact on mobile -->
  <div class="flex-shrink-0 ml-2">
    <!-- On mobile: icon only, on desktop: full selector -->
    <div class="md:hidden">
      <ModelSelectorCompact />
    </div>
    <div class="hidden md:block">
      <ModelSelector />
    </div>
  </div>
</header>
```

**Mobile Sidebar Overlay:**
```svelte
<!-- Layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Menu, X } from 'lucide-svelte';

  let sidebarOpen = $state(false);
  let isMobile = $state(false);

  onMount(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      isMobile = e.matches;
      // Auto-close sidebar when switching to mobile
      if (isMobile) sidebarOpen = false;
      // Auto-open sidebar when switching to desktop
      if (!isMobile) sidebarOpen = true;
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  });

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    if (isMobile) sidebarOpen = false;
  }
</script>

<div class="flex h-screen bg-zinc-950">
  <!-- Mobile backdrop - closes sidebar on tap -->
  {#if isMobile && sidebarOpen}
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40
             transition-opacity duration-200"
      onclick={closeSidebar}
      transition:fade={{ duration: 150 }}
    />
  {/if}

  <!-- Sidebar -->
  <aside
    class="flex-shrink-0 bg-zinc-900 border-r border-zinc-800
           transition-transform duration-200 ease-out
           {isMobile
             ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl'
             : 'relative w-64'}
           {isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}"
  >
    <Sidebar onNavigate={closeSidebar} />
  </aside>

  <!-- Main content area -->
  <div class="flex-1 flex flex-col min-w-0">
    <Header {isMobile} {sidebarOpen} {toggleSidebar} />
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</div>
```

**Responsive Modal Pattern:**
```svelte
<!-- SpaceModal.svelte / AreaModal.svelte -->
<div
  class="fixed inset-0 z-50 flex items-end md:items-center justify-center
         p-0 md:p-4 bg-black/60 backdrop-blur-sm"
>
  <div
    class="w-full md:max-w-lg
           max-h-[90vh] md:max-h-[85vh]
           bg-zinc-900 border-t md:border border-zinc-700/50
           rounded-t-2xl md:rounded-xl
           overflow-hidden flex flex-col
           shadow-2xl"
  >
    <!-- Modal content with safe area padding for iOS -->
    <div class="flex-1 overflow-y-auto overscroll-contain
                pb-[env(safe-area-inset-bottom)]">
      <!-- ... modal content ... -->
    </div>
  </div>
</div>
```

**Responsive Chat Input:**
```svelte
<!-- ChatInput.svelte responsive adjustments -->
<div class="border-t border-zinc-800 bg-zinc-900
            px-3 md:px-4 py-3
            pb-[max(0.75rem,env(safe-area-inset-bottom))]">
  <div class="max-w-4xl mx-auto">
    <!-- Input row -->
    <div class="flex items-end gap-2">
      <!-- Attachment button - always visible but smaller on mobile -->
      <button class="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 ...">
        <Paperclip class="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <!-- Text input - grows to fill -->
      <div class="flex-1 min-w-0">
        <textarea
          class="w-full resize-none bg-zinc-800 border border-zinc-700
                 rounded-xl px-3 py-2 md:px-4 md:py-2.5
                 text-sm md:text-base ..."
        />
      </div>

      <!-- Send button - touch-friendly size -->
      <button class="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 ...">
        <Send class="w-4 h-4 md:w-5 md:h-5" />
      </button>
    </div>
  </div>
</div>
```

**Design Tokens Used:**
- Breakpoint: `md:` (768px) for mobile/desktop switch
- Mobile sidebar: `w-72 shadow-2xl` fixed position
- Backdrop: `bg-black/60 backdrop-blur-sm`
- Sidebar transition: `transition-transform duration-200 ease-out`
- Touch targets: Minimum `w-9 h-9` (36px), preferred `w-10 h-10` (40px)
- Safe area: `pb-[env(safe-area-inset-bottom)]` for iOS home indicator
- Modal mobile: `rounded-t-2xl` bottom sheet style
- Modal desktop: `rounded-xl max-w-lg` centered

**Key Responsive Classes:**
- `md:hidden` - Hide on desktop (show on mobile)
- `hidden md:block` - Hide on mobile (show on desktop)
- `px-3 md:px-4` - Tighter padding on mobile
- `text-sm md:text-base` - Smaller text on mobile
- `items-end md:items-center` - Bottom sheet on mobile, centered on desktop

**Acceptance Criteria:**
- [ ] Hamburger menu button shows on mobile (`md:hidden`)
- [ ] Sidebar slides in from left on mobile with backdrop
- [ ] Tapping backdrop closes sidebar
- [ ] Sidebar navigation closes sidebar on mobile (via `onNavigate` callback)
- [ ] Header uses `Menu`/`X` icons from lucide-svelte
- [ ] Modals use bottom sheet pattern on mobile (rounded top, full width)
- [ ] Modals respect iOS safe area (`pb-[env(safe-area-inset-bottom)]`)
- [ ] Chat input respects iOS safe area
- [ ] All touch targets minimum 36px (preferably 40px+)
- [ ] App usable on 375px wide viewport (iPhone SE)
- [ ] No horizontal scrolling on any viewport size
- [ ] Sidebar state persists during resize (auto-closes on mobile, auto-opens on desktop)
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-004: Add Request Deduplication for Critical Actions

**As a** user
**I need** rapid clicks to not create duplicate items
**So that** I don't accidentally create multiple spaces/areas

**Technical Context:**
- Current: Rapid double-click on "Create" can fire two API requests
- Affected: Space creation, area creation, message sending
- Pattern: Disable button during operation + store-level guard

**Files to Modify:**
- `src/lib/components/spaces/SpaceModal.svelte` - Disable during submit
- `src/lib/components/areas/AreaModal.svelte` - Disable during submit
- `src/lib/components/ChatInput.svelte` - Disable during send
- `src/lib/stores/spaces.svelte.ts` - Add operation tracking
- `src/lib/stores/areas.svelte.ts` - Add operation tracking

**UX Specification:**

**Loading Button Pattern:**
All submit buttons should show a spinner and updated text when submitting.

```svelte
<!-- Reusable pattern for loading buttons -->
<script lang="ts">
  interface Props {
    isLoading?: boolean;
    loadingText?: string;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    onclick?: () => void;
    children: Snippet;
  }

  let {
    isLoading = false,
    loadingText,
    disabled = false,
    variant = 'primary',
    onclick,
    children
  }: Props = $props();

  const baseClasses = `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                       text-sm font-medium transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed`;

  const variantClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };
</script>

<button
  {onclick}
  disabled={disabled || isLoading}
  class="{baseClasses} {variantClasses[variant]}"
>
  {#if isLoading}
    <!-- Spinner -->
    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    {loadingText || 'Loading...'}
  {:else}
    {@render children()}
  {/if}
</button>
```

**Space Modal Submit Button:**
```svelte
<script>
  let isSubmitting = $state(false);

  async function handleCreate() {
    if (isSubmitting) return; // Guard clause
    isSubmitting = true;

    try {
      const result = await spacesStore.createSpace({ name, context, color, icon });
      if (result) {
        closeModal();
      }
    } finally {
      isSubmitting = false;
    }
  }
</script>

<!-- In modal footer -->
<div class="flex items-center justify-end gap-3 p-4 border-t border-zinc-700/30">
  <button
    onclick={closeModal}
    disabled={isSubmitting}
    class="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700
           border border-zinc-600 text-sm font-medium text-zinc-200
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-all duration-150"
  >
    Cancel
  </button>

  <button
    onclick={handleCreate}
    disabled={isSubmitting || !name.trim()}
    class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
           bg-primary-500 hover:bg-primary-600 text-sm font-medium text-white
           disabled:opacity-50 disabled:cursor-not-allowed
           transition-all duration-150"
  >
    {#if isSubmitting}
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      Creating...
    {:else}
      <Plus class="w-4 h-4" />
      Create Space
    {/if}
  </button>
</div>
```

**Chat Send Button:**
```svelte
<script>
  // Already has isStreaming state from chat store
  const isSending = $derived(chatStore.isStreaming || localSending);
  let localSending = $state(false);

  async function handleSend() {
    if (isSending || !message.trim()) return;
    localSending = true;

    try {
      await sendMessage(message);
    } finally {
      localSending = false;
    }
  }
</script>

<button
  onclick={handleSend}
  disabled={isSending || !message.trim()}
  class="flex-shrink-0 w-10 h-10 rounded-lg
         bg-primary-500 hover:bg-primary-600
         disabled:bg-zinc-700 disabled:cursor-not-allowed
         flex items-center justify-center
         transition-all duration-150"
>
  {#if isSending}
    <svg class="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10"
              stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  {:else}
    <Send class="w-5 h-5 text-white" />
  {/if}
</button>
```

**Store-Level Guard (Defense in Depth):**
```typescript
// In SpacesStore
private _creatingSpace = $state(false);

async createSpace(input: CreateSpaceInput): Promise<Space | null> {
  // Guard: Reject if already creating
  if (this._creatingSpace) {
    console.warn('Space creation already in progress');
    return null;
  }

  this._creatingSpace = true;
  this.isLoading = true;
  this.error = null;

  try {
    // ... existing logic
  } finally {
    this._creatingSpace = false;
    this.isLoading = false;
  }
}

// Expose read-only state if needed
get isCreatingSpace(): boolean {
  return this._creatingSpace;
}
```

**Design Tokens Used:**
- Spinner: Inline SVG with `animate-spin` (matches DeleteTaskModal pattern)
- Spinner size: `w-4 h-4` in buttons, `w-5 h-5` in icon-only buttons
- Disabled state: `disabled:opacity-50 disabled:cursor-not-allowed`
- Button disabled bg: `disabled:bg-zinc-700` for send button
- Loading text: Same font weight, replaces icon + label

**Loading Text Mapping:**
| Button | Default Text | Loading Text |
|--------|--------------|--------------|
| Create Space | "Create Space" | "Creating..." |
| Create Area | "Create Area" | "Creating..." |
| Save Changes | "Save" | "Saving..." |
| Delete | "Delete" | "Deleting..." |
| Send (icon) | Send icon | Spinner only |

**Acceptance Criteria:**
- [ ] All submit buttons show spinner when loading (inline SVG with `animate-spin`)
- [ ] All submit buttons are disabled during submission
- [ ] Cancel buttons also disabled during submission (prevent close mid-operation)
- [ ] Loading text shown: "Creating...", "Saving...", "Deleting..."
- [ ] Send button shows spinner only (no text, icon-only button)
- [ ] Store methods have private guard flags to reject concurrent calls
- [ ] Guard flags log warning when rejecting duplicate call
- [ ] Double-click cannot create duplicate items
- [ ] Form inputs remain disabled during submission
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

## Technical Architecture

### Document Deletion Cascade Flow

```
User clicks "Delete Document"
        ↓
API: DELETE /api/documents/:id
        ↓
Repository: Transaction starts
        ↓
1. Remove from areas' contextDocumentIds arrays
2. Delete document_area_shares records
3. Delete task_documents links
4. Soft delete document
        ↓
Repository: Transaction commits
        ↓
API: Returns success + cleanup counts
        ↓
Frontend: Shows toast, removes from UI
```

### Mobile Layout Architecture

```
Viewport Width:
│
├─ < 768px (Mobile) ──────────────────────────────┐
│   ┌─────────────────────────────────────────┐   │
│   │ Header [☰] [Logo] [Model ▼]             │   │
│   ├─────────────────────────────────────────┤   │
│   │                                         │   │
│   │           Chat Content                  │   │
│   │           (full width)                  │   │
│   │                                         │   │
│   ├─────────────────────────────────────────┤   │
│   │ [Input field...              ] [Send]   │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│   Sidebar (hidden, slides in from left)         │
└─────────────────────────────────────────────────┘

├─ >= 768px (Desktop) ────────────────────────────┐
│   ┌──────────┬──────────────────────────────┐   │
│   │          │ Header [Logo] [Model ▼]      │   │
│   │ Sidebar  ├──────────────────────────────┤   │
│   │          │                              │   │
│   │ [Convos] │       Chat Content           │   │
│   │          │                              │   │
│   │          ├──────────────────────────────┤   │
│   │          │ [Input field...    ] [Send]  │   │
│   └──────────┴──────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Request Deduplication Strategy

```
Layer 1: UI Button Disable
├── Immediate visual feedback
├── Prevents accidental double-clicks
└── Shows loading state

Layer 2: Store Operation Lock
├── Rejects concurrent calls
├── Defense against programmatic duplicates
└── Returns null/false for rejected calls
```

---

## Non-Goals

This phase explicitly does NOT include:

- **Offline support** - Future enhancement, requires service worker
- **PWA capabilities** - Future enhancement
- **Tablet-specific layouts** - Current responsive approach handles tablets
- **Advanced error recovery** (retry queues, optimistic updates) - Future enhancement
- **Request batching** - Future optimization
- **Virtualized lists** - Future performance optimization

---

## Testing Strategy

### Manual Testing Checklist

1. **Document Deletion Cascade:**
   - Create document, share to area, link to task
   - Delete document
   - Query DB: Verify no orphaned shares or links
   - Verify areas' contextDocumentIds cleaned

2. **Chat Message Retry:**
   - Enable offline mode in dev tools
   - Send message, wait for failure
   - Verify retry button appears
   - Re-enable network, click retry
   - Verify message sends successfully

3. **Mobile Responsiveness:**
   - Use Chrome DevTools device mode
   - Test on: iPhone SE (375px), iPhone 12 (390px), iPad (768px)
   - Verify: Sidebar toggle, chat input, modals
   - Test actual device if available

4. **Request Deduplication:**
   - Rapidly click "Create Space" button multiple times
   - Verify only one space created
   - Check network tab: only one request sent

### Automated Tests (Optional Enhancement)

```typescript
// Example: Deduplication test
test('double-click creates only one space', async () => {
  const createBtn = screen.getByText('Create Space');

  // Rapid fire clicks
  await userEvent.click(createBtn);
  await userEvent.click(createBtn);
  await userEvent.click(createBtn);

  // Wait for any pending operations
  await waitFor(() => {
    expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
  });

  // Verify only one space created
  expect(mockCreateSpace).toHaveBeenCalledTimes(1);
});
```

---

## Dependencies

- Phase 1 and Phase 2 should be completed first
- Mobile testing requires device or emulator
- No external dependencies
- No database schema changes

---

## Rollback Plan

All changes are isolated:
- Document cascade: Revert to simple delete (orphan risk, recoverable)
- Retry mechanism: Remove state and UI elements
- Mobile responsive: Revert CSS changes (existing layout returns)
- Deduplication: Remove checks (race condition risk, but functional)

No migrations to reverse.

---

## Future Considerations

After Phase 3, consider these enhancements for production scale:

1. **Offline-first architecture** - Service worker, local-first data
2. **Optimistic updates** - Update UI before server confirmation
3. **Request queuing** - Queue failed requests for automatic retry
4. **Virtualized lists** - For users with many conversations/spaces
5. **Proper tablet layouts** - Optimized for iPad/tablet landscape
6. **PWA installation** - Add to home screen capability
