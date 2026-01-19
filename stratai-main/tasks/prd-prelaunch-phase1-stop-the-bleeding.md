# PRD: Pre-Launch Phase 1 - Stop the Bleeding

## Introduction

Critical fixes required before internal user testing. These issues cause silent failures, user confusion, and broken experiences that would immediately erode trust with our first real users.

**Priority:** CRITICAL - Must complete before any internal testing
**Estimated Scope:** 4 user stories, ~2-3 hours implementation
**Branch:** feature/prelaunch-phase1-stop-the-bleeding

## Research Findings

**Similar patterns found:**
- `src/lib/stores/toast.svelte.ts` - Toast store with error/success/warning methods
- `src/lib/stores/spaces.svelte.ts` - Store pattern with error catching (no toasts)
- `src/lib/stores/areas.svelte.ts` - Store pattern with error catching (no toasts)
- `src/lib/stores/chat.svelte.ts` - Streaming state management with abort controller
- `src/lib/stores/settings.svelte.ts` - Settings persistence with setSelectedModel()
- `src/lib/components/chat/WelcomeScreen.svelte` - Conditional rendering based on hasModel

**Key discoveries:**
- No error pages exist in the codebase (confirmed via glob search)
- `chatStore.stopStreaming()` exists and can be used for timeout handling
- `AUTO_MODEL_ID = 'auto'` defined in ModelSelector.svelte
- Toast API: `toastStore.success()`, `toastStore.error()`, `toastStore.warning()`

## Goals

- Prevent blank screens on component crashes
- Provide clear feedback when streaming fails or times out
- Guide first-time users through model selection
- Surface success/error feedback for all user actions

## User Stories

### US-001: Add Root Error Boundary

**Description:** As a user, I need graceful error handling when something crashes so that I can understand what went wrong and recover.

**What to do:**
- Create `src/routes/+error.svelte` with full-screen error display
- Use SvelteKit's `$page.error` and `$page.status` for error info
- Implement "Go Home" and "Try Again" recovery actions

**Files:**
- `src/routes/+error.svelte` (CREATE)

**Acceptance Criteria:**
- [ ] src/routes/+error.svelte exists with full-screen centered layout
- [ ] Uses AlertTriangle icon from lucide-svelte (not inline SVG)
- [ ] Shows user-friendly error message from $page.error?.message (not stack trace)
- [ ] Displays error status code when available (e.g., "Error 404")
- [ ] Has "Go Home" button with Home icon that navigates to / via goto('/')
- [ ] Has "Try Again" button with RefreshCw icon that calls location.reload()
- [ ] Matches app styling: zinc-950 background, zinc text colors
- [ ] Primary button uses bg-primary-500 hover:bg-primary-600
- [ ] Secondary button uses bg-zinc-800 hover:bg-zinc-700 border-zinc-700
- [ ] npm run check passes
- [ ] npm run lint passes

**Notes:**
- Reference `src/lib/components/spaces/DeleteConfirmModal.svelte` for icon container pattern
- Reference `src/lib/components/Toast.svelte` for styling consistency

---

### US-002: Add Streaming Timeout with User Feedback

**Description:** As a user, I need feedback when AI response takes too long or fails so that I'm not left wondering if the app is broken.

**What to do:**
- Add timeout state management with 15s warning and 60s hard timeout
- Show inline amber warning after 15s of streaming
- Show error card with retry option after 60s timeout
- Store last message content for retry functionality

**Files:**
- `src/routes/+page.svelte` (MODIFY)
- `src/routes/spaces/[space]/[area]/+page.svelte` (MODIFY)

**Acceptance Criteria:**
- [ ] After 15s of streaming, inline amber warning appears below streaming indicator
- [ ] Warning uses Clock icon from lucide-svelte with animate-pulse class
- [ ] Warning text: "Taking longer than expected..."
- [ ] After 60s timeout, streaming stops via chatStore.stopStreaming()
- [ ] Error card replaces streaming indicator with AlertCircle icon in red container
- [ ] Error toast fires: "Response timed out. Please try again."
- [ ] "Retry" button with RotateCcw icon appears in error card
- [ ] Clicking retry resends exact same message content (store lastMessageContent)
- [ ] Timeouts cleared when streaming completes normally
- [ ] Timeouts cleared when user sends a new message
- [ ] Works in both main chat (/) and area chat (/spaces/[space]/[area])
- [ ] npm run check passes
- [ ] npm run lint passes

**Notes:**
- Pattern: Use $state for timeout IDs and warning/error states
- Consider extracting timeout logic to a shared utility for DRY

---

### US-003: Add Model Selection Guidance for First-Time Users

**Description:** As a first-time user, I need clear guidance on how to start chatting so that I don't get stuck on a disabled input field.

**What to do:**
- Modify WelcomeScreen.svelte to show model selection guidance when no model selected
- Add "Select AUTO Mode" CTA button
- Show recommendation box explaining AUTO mode benefits

**Files:**
- `src/lib/components/chat/WelcomeScreen.svelte` (MODIFY)

**Acceptance Criteria:**
- [ ] When no model selected, model selection guidance shows instead of normal welcome content
- [ ] Uses Sparkles icon in gradient icon container (from-primary-500/20 to-cyan-500/20)
- [ ] Heading: "Welcome to StratAI"
- [ ] Subheading: "To get started, select an AI model"
- [ ] Recommendation box explains AUTO mode benefit with Zap icon
- [ ] "Select AUTO Mode" button is full-width with primary styling and shadow glow
- [ ] Clicking button sets settingsStore.selectedModel to 'auto'
- [ ] After model selection, component re-renders to show normal welcome content
- [ ] Secondary text mentions "dropdown above" to guide eye to header
- [ ] Works for both new users and users who cleared their settings
- [ ] npm run check passes
- [ ] npm run lint passes

**Notes:**
- Import settingsStore from '$lib/stores/settings.svelte'
- Define AUTO_MODEL_ID = 'auto' locally (matches ModelSelector.svelte)
- Check selectedModel via settingsStore.selectedModel or passed hasModel prop

---

### US-004: Wire Toast Notifications to Store Operations

**Description:** As a user, I need feedback when my actions succeed or fail so that I know the app is responding to my input.

**What to do:**
- Import toastStore in spaces.svelte.ts, areas.svelte.ts, chat.svelte.ts
- Add toastStore.success() after successful operations
- Add toastStore.error() in catch blocks (error toast shows actual message)

**Files:**
- `src/lib/stores/spaces.svelte.ts` (MODIFY)
- `src/lib/stores/areas.svelte.ts` (MODIFY)
- `src/lib/stores/chat.svelte.ts` (MODIFY)

**Acceptance Criteria:**
- [ ] toastStore imported in src/lib/stores/spaces.svelte.ts
- [ ] toastStore imported in src/lib/stores/areas.svelte.ts
- [ ] toastStore imported in src/lib/stores/chat.svelte.ts
- [ ] spaces.svelte.ts createSpace(): success "Space created", error with message
- [ ] spaces.svelte.ts updateSpace(): success "Space updated", error with message
- [ ] spaces.svelte.ts deleteSpace(): success "Space deleted", error with message
- [ ] spaces.svelte.ts addMember(): success "Member added", error with message
- [ ] spaces.svelte.ts removeMember(): success "Member removed", error with message
- [ ] spaces.svelte.ts pinSpace()/unpinSpace(): error toast only
- [ ] areas.svelte.ts createArea(): success "Area created", error with message
- [ ] areas.svelte.ts updateArea(): success "Area updated", error with message
- [ ] areas.svelte.ts deleteArea(): success "Area deleted", error with message
- [ ] chat.svelte.ts syncFromApi(): error toast "Failed to sync conversations" only
- [ ] chat.svelte.ts deleteConversation(): success "Conversation deleted", error with message
- [ ] No duplicate toasts
- [ ] npm run check passes
- [ ] npm run lint passes

**Notes:**
- Pattern: `toastStore.success('Space created');` after `return space;`
- Pattern: `toastStore.error(this.error);` after `this.error = message;` in catch

---

## Non-Goals

- Loading skeletons (Phase 2)
- Empty state improvements (Phase 2)
- Console.log cleanup (Phase 2)
- Mobile responsiveness (Phase 3)
- Advanced error recovery (undo, retry queues)
- Error analytics/logging
- Offline support

## Technical Considerations

- All changes are frontend-only, no database changes
- Uses existing toast store API
- Uses existing chatStore.stopStreaming() method
- Uses existing settingsStore.setSelectedModel() method
- Svelte 5 runes ($state, $derived, $effect) for reactivity

## Risks & Mitigations

- **Risk:** Timeout values (15s/60s) may need tuning
  - **Mitigation:** Values can be adjusted post-implementation based on real usage

- **Risk:** US-002 requires modifying two chat pages with similar logic
  - **Mitigation:** Spec provides exact code snippets; consider extracting to shared utility

## Testing Strategy

1. **Error Boundary:** Temporarily add `throw new Error('test')` in a component
2. **Streaming Timeout:** Use slow network simulation or disconnect mid-stream
3. **Model Selection:** Clear localStorage or use incognito
4. **Toast Notifications:** Test create/update/delete operations for each entity type
