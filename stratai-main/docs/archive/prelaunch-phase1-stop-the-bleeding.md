# Pre-Launch Phase 1: Stop the Bleeding

## Overview

Critical fixes required before internal user testing. These issues cause silent failures, user confusion, and broken experiences that would immediately erode trust with our first real users.

**Priority:** CRITICAL - Must complete before any internal testing
**Estimated Scope:** 4 user stories, ~2-3 hours implementation

## Problem Statement

Our internal testers will encounter these issues within their first 5 minutes:

1. **App crashes show blank pages** - No error boundaries exist. A component crash leaves users staring at nothing with no explanation or recovery path.

2. **Chat hangs forever on errors** - If streaming fails mid-response, users see "AI is responding..." indefinitely. No timeout, no retry option.

3. **First-time users stuck on model selection** - Chat input is disabled until a model is selected, but there's no guidance. Users don't know what to do.

4. **Actions silently succeed/fail** - Store operations (create space, delete area, etc.) catch errors but never notify users. The toast system exists but isn't wired up.

## User Impact

- **Trust erosion:** Silent failures make the app feel broken
- **Support burden:** Users will ask "is it working?" constantly
- **Lost work:** Without error recovery, users lose context and have to refresh
- **Onboarding failure:** First-time users abandon before sending their first message

---

## User Stories

### US-001: Add Root Error Boundary

**As a** user
**I need** graceful error handling when something crashes
**So that** I can understand what went wrong and recover

**Technical Context:**
- SvelteKit uses `+error.svelte` files at route levels
- Currently: 0 error pages exist (confirmed via codebase search)
- Pattern: Create root-level error page that catches all unhandled errors

**Files to Create:**
- `src/routes/+error.svelte` - Root error boundary

**Files to Reference:**
- `src/lib/components/Toast.svelte` - For styling consistency
- `src/lib/components/spaces/DeleteConfirmModal.svelte` - For icon container pattern
- `src/app.css` - For CSS variables and design tokens

**UX Specification:**

```svelte
<!-- EXACT IMPLEMENTATION - src/routes/+error.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { AlertTriangle, Home, RefreshCw } from 'lucide-svelte';
</script>

<!-- Full-screen centered layout matching app dark theme -->
<div class="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
  <div class="max-w-md w-full text-center">

    <!-- Error Icon Container - matches modal warning icon pattern -->
    <div class="mx-auto w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30
                flex items-center justify-center mb-6">
      <AlertTriangle class="w-8 h-8 text-red-500" />
    </div>

    <!-- Error Status Code (if available) -->
    {#if $page.status}
      <p class="text-sm font-medium text-zinc-500 mb-2">Error {$page.status}</p>
    {/if}

    <!-- Heading -->
    <h1 class="text-2xl font-bold text-zinc-100 mb-3">Something went wrong</h1>

    <!-- User-friendly message (never show stack traces) -->
    <p class="text-sm text-zinc-400 mb-8 leading-relaxed">
      {$page.error?.message || "We couldn't complete that action. Please try again or return home."}
    </p>

    <!-- Action Buttons - horizontal layout with gap -->
    <div class="flex items-center justify-center gap-3">
      <!-- Secondary: Go Home -->
      <button
        onclick={() => goto('/')}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
               bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
               text-sm font-medium text-zinc-200
               transition-all duration-150"
      >
        <Home class="w-4 h-4" />
        Go Home
      </button>

      <!-- Primary: Try Again -->
      <button
        onclick={() => location.reload()}
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
               bg-primary-500 hover:bg-primary-600
               text-sm font-medium text-white
               transition-all duration-150"
      >
        <RefreshCw class="w-4 h-4" />
        Try Again
      </button>
    </div>

  </div>
</div>
```

**Design Tokens Used:**
- Background: `bg-zinc-950` (app background)
- Icon container: `bg-red-500/15 border-red-500/30` (error semantic color)
- Icon: `text-red-500` with `AlertTriangle` from lucide-svelte
- Heading: `text-2xl font-bold text-zinc-100`
- Body text: `text-sm text-zinc-400`
- Status code: `text-sm font-medium text-zinc-500`
- Primary button: `bg-primary-500 hover:bg-primary-600 text-white`
- Secondary button: `bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200`
- Button padding: `px-4 py-2.5`
- Border radius: `rounded-lg` (0.5rem)
- Transition: `transition-all duration-150`

**Acceptance Criteria:**
- [ ] `src/routes/+error.svelte` exists with exact structure above
- [ ] Uses `AlertTriangle` icon from lucide-svelte (not inline SVG)
- [ ] Shows user-friendly error message (not stack trace)
- [ ] Displays error status code when available (e.g., "Error 404")
- [ ] Has "Go Home" button with `Home` icon that navigates to `/`
- [ ] Has "Try Again" button with `RefreshCw` icon that calls `location.reload()`
- [ ] Matches app styling exactly (zinc-950 background, zinc text colors)
- [ ] Primary button uses `bg-primary-500` (brand blue)
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-002: Add Streaming Timeout with User Feedback

**As a** user
**I need** feedback when AI response takes too long or fails
**So that** I'm not left wondering if the app is broken

**Technical Context:**
- Chat streaming uses SSE (Server-Sent Events)
- Current behavior: No timeout - hangs indefinitely on network failure
- Streaming state tracked in `chatStore.isStreaming`
- Main chat page: `src/routes/+page.svelte`
- Area chat page: `src/routes/spaces/[space]/[area]/+page.svelte`

**Files to Modify:**
- `src/routes/+page.svelte` - Main chat interface
- `src/routes/spaces/[space]/[area]/+page.svelte` - Area chat interface

**Files to Reference:**
- `src/lib/stores/chat.svelte.ts` - Chat store with streaming state
- `src/lib/stores/toast.svelte.ts` - Toast notifications
- `src/lib/components/LoadingDots.svelte` - Existing loading pattern

**UX Specification:**

**Slow Warning Message (appears after 15s):**
Position inline below the streaming message indicator, NOT as a toast.

```svelte
<!-- Slow warning - subtle amber styling -->
{#if showSlowWarning && chatStore.isStreaming}
  <div class="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg
              bg-amber-500/10 border border-amber-500/20">
    <Clock class="w-4 h-4 text-amber-400 animate-pulse" />
    <span class="text-sm text-amber-300">Taking longer than expected...</span>
  </div>
{/if}
```

**Timeout Error State (appears after 60s):**
Replace the streaming indicator with an error state that includes retry.

```svelte
<!-- Timeout error with retry - replaces streaming indicator -->
{#if streamingTimedOut}
  <div class="flex items-center gap-3 px-4 py-3 rounded-xl
              bg-red-500/10 border border-red-500/20">
    <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/15
                flex items-center justify-center">
      <AlertCircle class="w-4 h-4 text-red-400" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-zinc-200">Response timed out</p>
      <p class="text-xs text-zinc-400 mt-0.5">The AI took too long to respond.</p>
    </div>
    <button
      onclick={retryLastMessage}
      class="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
             bg-zinc-700 hover:bg-zinc-600 border border-zinc-600
             text-sm font-medium text-zinc-200
             transition-all duration-150"
    >
      <RotateCcw class="w-3.5 h-3.5" />
      Retry
    </button>
  </div>
{/if}
```

**Design Tokens Used:**
- Slow warning background: `bg-amber-500/10 border-amber-500/20`
- Slow warning text: `text-amber-300` (icon `text-amber-400`)
- Timeout error background: `bg-red-500/10 border-red-500/20`
- Timeout error icon: `text-red-400` in `bg-red-500/15` container
- Retry button: `bg-zinc-700 hover:bg-zinc-600 border-zinc-600`
- Border radius: `rounded-lg` for warning, `rounded-xl` for error card
- Icons: `Clock` for slow, `AlertCircle` for error, `RotateCcw` for retry (lucide-svelte)

**State Management:**
```typescript
// Add to chat page component
let showSlowWarning = $state(false);
let streamingTimedOut = $state(false);
let lastMessageContent = $state<string | null>(null);
let slowWarningTimeout: ReturnType<typeof setTimeout> | null = null;
let hardTimeout: ReturnType<typeof setTimeout> | null = null;

function startStreamingTimeouts() {
  // Clear any existing timeouts
  clearStreamingTimeouts();

  // Warning after 15s
  slowWarningTimeout = setTimeout(() => {
    showSlowWarning = true;
  }, 15000);

  // Hard timeout after 60s
  hardTimeout = setTimeout(() => {
    if (chatStore.isStreaming) {
      chatStore.stopStreaming();
      streamingTimedOut = true;
      showSlowWarning = false;
      toastStore.error('Response timed out. Please try again.');
    }
  }, 60000);
}

function clearStreamingTimeouts() {
  if (slowWarningTimeout) clearTimeout(slowWarningTimeout);
  if (hardTimeout) clearTimeout(hardTimeout);
  showSlowWarning = false;
  streamingTimedOut = false;
}

function retryLastMessage() {
  if (lastMessageContent) {
    streamingTimedOut = false;
    // Re-send the last message through existing send flow
    handleSendMessage(lastMessageContent);
  }
}

// Call startStreamingTimeouts() when streaming begins
// Call clearStreamingTimeouts() when streaming completes or user sends new message
// Store lastMessageContent when user sends a message
```

**Acceptance Criteria:**
- [ ] After 15s of streaming, inline amber warning appears below streaming indicator
- [ ] Warning uses `Clock` icon from lucide-svelte with `animate-pulse`
- [ ] After 60s timeout, streaming stops and error card replaces streaming indicator
- [ ] Error card shows `AlertCircle` icon in red icon container
- [ ] "Retry" button with `RotateCcw` icon appears in error card
- [ ] Clicking retry resends exact same message content
- [ ] Error toast also fires: "Response timed out. Please try again."
- [ ] Timeouts cleared when streaming completes normally
- [ ] Timeouts cleared when user sends a new message
- [ ] Works in both main chat (`/`) and area chat (`/spaces/[space]/[area]`)
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-003: Add Model Selection Guidance for First-Time Users

**As a** first-time user
**I need** clear guidance on how to start chatting
**So that** I don't get stuck on a disabled input field

**Technical Context:**
- Chat input is disabled when `!selectedModel` (see `ChatInput.svelte`)
- `AUTO` mode exists and should be the default recommendation
- `WelcomeScreen.svelte` shows for new users but doesn't guide model selection
- Settings store: `src/lib/stores/settings.svelte.ts`
- Model selector: `src/lib/components/ModelSelector.svelte`
- AUTO_MODEL_ID constant exists in ModelSelector.svelte

**Files to Modify:**
- `src/lib/components/chat/WelcomeScreen.svelte` - Add model selection prompt

**Files to Reference:**
- `src/lib/components/ModelSelector.svelte` - Model selector component, AUTO_MODEL_ID
- `src/lib/stores/settings.svelte.ts` - Settings with selectedModel
- `src/lib/components/chat/AreaWelcomeScreen.svelte` - For layout pattern reference

**UX Specification:**

**Model Selection Card (shows when no model selected):**
This replaces the normal welcome content when `!selectedModel`.

```svelte
<!-- Model selection guidance - centered card layout -->
{#if !selectedModel}
  <div class="h-full flex items-center justify-center min-h-[60vh]">
    <div class="max-w-md w-full px-4 text-center">

      <!-- Icon Container - uses primary gradient tint -->
      <div class="mx-auto w-20 h-20 rounded-2xl mb-6
                  bg-gradient-to-br from-primary-500/20 to-cyan-500/20
                  border border-primary-500/30
                  flex items-center justify-center">
        <Sparkles class="w-10 h-10 text-primary-400" />
      </div>

      <!-- Heading -->
      <h1 class="text-2xl font-bold text-zinc-100 mb-3">
        Welcome to StratAI
      </h1>

      <!-- Subheading -->
      <p class="text-base text-zinc-400 mb-6">
        To get started, select an AI model
      </p>

      <!-- Recommendation Box -->
      <div class="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 mb-6 text-left">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/15
                      flex items-center justify-center mt-0.5">
            <Zap class="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <p class="text-sm font-medium text-zinc-200 mb-1">
              We recommend AUTO mode
            </p>
            <p class="text-sm text-zinc-400 leading-relaxed">
              StratAI will automatically choose the best model for each conversation based on complexity.
            </p>
          </div>
        </div>
      </div>

      <!-- Primary CTA Button -->
      <button
        onclick={selectAutoMode}
        class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
               bg-primary-500 hover:bg-primary-600
               text-base font-semibold text-white
               transition-all duration-150
               shadow-lg shadow-primary-500/25"
      >
        <Sparkles class="w-5 h-5" />
        Select AUTO Mode
      </button>

      <!-- Secondary Option -->
      <p class="mt-4 text-sm text-zinc-500">
        Or select a specific model from the dropdown above
      </p>

    </div>
  </div>
{:else}
  <!-- Normal welcome content (existing WelcomeScreen content) -->
  ...
{/if}
```

**Script Addition:**
```typescript
import { Sparkles, Zap } from 'lucide-svelte';
import { settingsStore } from '$lib/stores/settings.svelte';

// AUTO_MODEL_ID should be imported from ModelSelector or defined as constant
const AUTO_MODEL_ID = 'auto';

function selectAutoMode() {
  settingsStore.setSelectedModel(AUTO_MODEL_ID);
}

// Get reactive selectedModel
const selectedModel = $derived(settingsStore.selectedModel);
```

**Design Tokens Used:**
- Container: `min-h-[60vh] flex items-center justify-center`
- Card width: `max-w-md w-full`
- Icon container: Gradient `from-primary-500/20 to-cyan-500/20` with `border-primary-500/30`
- Icon: `Sparkles` from lucide-svelte, `text-primary-400`
- Heading: `text-2xl font-bold text-zinc-100`
- Subheading: `text-base text-zinc-400`
- Recommendation box: `bg-zinc-800/50 border-zinc-700/50 rounded-xl`
- Recommendation icon: `Zap` in `bg-primary-500/15` container
- Primary button: `bg-primary-500 hover:bg-primary-600 text-white font-semibold`
- Button shadow: `shadow-lg shadow-primary-500/25` (glow effect)
- Button padding: `px-6 py-3` (larger for primary CTA)
- Secondary text: `text-sm text-zinc-500`

**Acceptance Criteria:**
- [ ] When no model selected, model selection guidance shows instead of normal welcome
- [ ] Uses `Sparkles` icon in gradient icon container
- [ ] Recommendation box explains AUTO mode benefit
- [ ] "Select AUTO Mode" button is full-width with primary styling and shadow glow
- [ ] Clicking button sets `settingsStore.selectedModel` to `'auto'`
- [ ] After model selection, component re-renders to show normal welcome content
- [ ] Secondary text mentions "dropdown above" to guide eye to header
- [ ] Works for both new users and users who cleared their settings
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-004: Wire Toast Notifications to Store Operations

**As a** user
**I need** feedback when my actions succeed or fail
**So that** I know the app is responding to my input

**Technical Context:**
- Toast system exists and works: `src/lib/stores/toast.svelte.ts`
- Stores catch errors but never call toast:
  - `spacesStore` - catches errors, sets `this.error`, never toasts
  - `areaStore` - same pattern
  - `chatStore` - same pattern
- Pattern to add: After catch block sets error, also call `toastStore.error()`
- Pattern to add: After successful operations, call `toastStore.success()`

**Files to Modify:**
- `src/lib/stores/spaces.svelte.ts` - Add toast calls
- `src/lib/stores/areas.svelte.ts` - Add toast calls
- `src/lib/stores/chat.svelte.ts` - Add toast calls (for sync errors only, not message sends)

**Files to Reference:**
- `src/lib/stores/toast.svelte.ts` - Toast store API

**Implementation Notes:**

For `spaces.svelte.ts`, add toasts to:
- `createSpace()` - success: "Space created", error: show error message
- `updateSpace()` - success: "Space updated", error: show error message
- `deleteSpace()` - success: "Space deleted", error: show error message
- `addMember()` - success: "Member added", error: show error message
- `removeMember()` - success: "Member removed", error: show error message
- `pinSpace()` / `unpinSpace()` - error only (success is visually obvious)

For `areas.svelte.ts`, add toasts to:
- `createArea()` - success: "Area created", error: show error message
- `updateArea()` - success: "Area updated", error: show error message
- `deleteArea()` - success: "Area deleted", error: show error message

For `chat.svelte.ts`, add toasts to:
- `syncFromApi()` - error only: "Failed to sync conversations"
- `deleteConversation()` - success: "Conversation deleted", error: show error message

**Pattern Example:**
```typescript
// In createSpace(), after successful creation:
import { toastStore } from './toast.svelte';

// Success case (after setting local state):
toastStore.success('Space created');
return space;

// Error case (in catch block):
catch (e) {
  console.error('Failed to create space:', e);
  this.error = e instanceof Error ? e.message : 'Failed to create space';
  toastStore.error(this.error);
  return null;
}
```

**Acceptance Criteria:**
- [ ] `toastStore` imported in all three store files
- [ ] All create/update/delete operations show success toast
- [ ] All error catches show error toast with message
- [ ] Pin/unpin only show error toasts (success is visually obvious)
- [ ] Chat sync failures show error toast
- [ ] No duplicate toasts (don't toast if UI already shows error inline)
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

## Technical Architecture

### Error Boundary Strategy

```
src/routes/
├── +error.svelte     ← NEW: Catches all unhandled errors
├── +layout.svelte    ← Existing: App shell
└── +page.svelte      ← Existing: Main chat
```

The root `+error.svelte` will catch:
- Component render errors
- Unhandled promise rejections in load functions
- Navigation errors

### Toast Integration Pattern

```typescript
// Pattern for all store methods:
async someOperation(): Promise<T | null> {
  try {
    // ... operation logic ...
    toastStore.success('Operation completed');
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Operation failed';
    this.error = message;
    toastStore.error(message);
    return null;
  }
}
```

### Streaming Timeout Architecture

```typescript
// In chat page component:
let streamingTimeout: ReturnType<typeof setTimeout> | null = null;
let showSlowWarning = $state(false);

function startStreamingTimeout() {
  // Warning after 15s
  streamingTimeout = setTimeout(() => {
    showSlowWarning = true;
  }, 15000);

  // Hard timeout after 60s
  setTimeout(() => {
    if (chatStore.isStreaming) {
      chatStore.stopStreaming();
      toastStore.error('Response timed out. Please try again.');
    }
  }, 60000);
}

function clearStreamingTimeout() {
  if (streamingTimeout) clearTimeout(streamingTimeout);
  showSlowWarning = false;
}
```

---

## Non-Goals

This phase explicitly does NOT include:

- **Loading skeletons** - Addressed in Phase 2
- **Empty state improvements** - Addressed in Phase 2
- **Console.log cleanup** - Addressed in Phase 2
- **Mobile responsiveness** - Addressed in Phase 3
- **Advanced error recovery** (undo, retry queues) - Future enhancement
- **Error analytics/logging** - Future enhancement
- **Offline support** - Future enhancement

---

## Testing Strategy

### Manual Testing Checklist

1. **Error Boundary:**
   - Temporarily add `throw new Error('test')` in a component
   - Verify error page shows, not blank screen
   - Verify "Go Home" and "Try Again" buttons work

2. **Streaming Timeout:**
   - Disconnect network mid-stream (or use slow network simulation)
   - Verify 15s warning appears
   - Verify 60s timeout triggers error toast
   - Verify retry button resends message

3. **Model Selection:**
   - Clear localStorage (or use incognito)
   - Navigate to app, verify guidance shows
   - Click "Select AUTO Mode", verify it works
   - Verify normal welcome shows after selection

4. **Toast Notifications:**
   - Create a space → verify success toast
   - Try to create space with duplicate name → verify error toast
   - Delete a space → verify success toast
   - Repeat for areas and conversations

---

## Dependencies

- No external dependencies
- All changes are additive or modifications to existing files
- No database changes required
- No API changes required

---

## Rollback Plan

All changes are isolated to frontend components and stores. Rollback by reverting the commits. No data migration or API changes to worry about.
