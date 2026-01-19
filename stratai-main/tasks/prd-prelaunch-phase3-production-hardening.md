# PRD: Pre-Launch Phase 3 - Harden for Production

## Introduction

Production hardening to ensure data integrity and usability across devices. These issues could cause problems at scale or limit how users can access the application.

**Priority:** MEDIUM - Complete before production launch (can ship to internal testers without)
**Estimated Scope:** 4 user stories, ~4-5 hours implementation
**Dependencies:** Phase 1 and Phase 2 should be completed first

## Problem Statement

After Phases 1 and 2, the app is usable and polished, but has underlying issues that will cause problems at scale or limit accessibility:

1. **Document deletion orphans data** - Document deletion doesn't clean up area shares or task links
2. **Chat has no error recovery** - Network failures lose the user's message with no retry option
3. **Mobile responsiveness broken** - App layout breaks on screens < 768px
4. **No request deduplication** - Rapid clicks can fire duplicate API requests

## Research Findings

**Similar patterns found:**
- `src/lib/server/persistence/documents-postgres.ts` - Existing delete() method needs cascade logic
- `src/lib/server/persistence/document-sharing-postgres.ts` - Share record structure and area deactivation pattern
- `src/lib/stores/spaces.svelte.ts` - Store pattern (no guard flags currently)
- `src/routes/+page.svelte` - Main chat with existing timeout detection

**Relevant prior implementations:**
- Commit `a080ceb` - Space delete modal with cascade info (similar cascade pattern)

**Applicable codebase patterns:**
- Document sharing uses `sql.begin()` for transactions
- postgres.js camelCase transformation for column access
- Svelte 5 runes ($state, $derived) for reactivity
- Tailwind responsive classes: md: prefix for 768px breakpoint

## Goals

- Prevent orphaned data when documents are deleted
- Enable message retry on network failures
- Support mobile users with responsive layout
- Prevent duplicate submissions from rapid clicks

---

## User Stories

### US-001: Implement Document Deletion Cascade

**Description:** As a user, I need document deletion to clean up shares and links so that I don't have dead references throughout the app.

**What to do:**
- Modify the `delete()` method in `documents-postgres.ts`
- Add transaction wrapper using `sql.begin()`
- Remove document ID from all areas' `contextDocumentIds` arrays
- Delete all `document_area_shares` records
- Delete all `task_documents` links
- Return cleanup counts

**Files to Modify:**
- `src/lib/server/persistence/documents-postgres.ts`

**Files to Reference:**
- `src/lib/server/persistence/document-sharing-postgres.ts`
- `src/lib/server/persistence/areas-postgres.ts`

**Cascade Order:**
1. Remove from areas' `contextDocumentIds` arrays
2. Delete `document_area_shares` records
3. Delete `task_documents` links
4. Soft delete document

**Acceptance Criteria:**
- [ ] Document deletion removes document ID from all areas' `contextDocumentIds` arrays using `array_remove()`
- [ ] Document deletion deletes all `document_area_shares` records for the document
- [ ] Document deletion deletes all `task_documents` links for the document
- [ ] All cascade operations are wrapped in `sql.begin()` transaction for atomicity
- [ ] Only document owner can delete (existing check preserved)
- [ ] Delete method returns cleanup counts: `{ areasUpdated, sharesDeleted, taskLinksDeleted }`
- [ ] Cascade order is: areas -> shares -> task_documents -> soft delete document
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-002: Add Chat Message Retry on Failure

**Description:** As a user, I need to retry failed messages without retyping so that network issues don't lose my work.

**What to do:**
- Add `failedMessage` state to track failed send attempts
- Create inline failed message display with retry/dismiss buttons
- Wire up error handling in send function
- Implement retry and dismiss handlers

**Files to Modify:**
- `src/routes/+page.svelte`
- `src/routes/spaces/[space]/[area]/+page.svelte`

**Files to Reference:**
- `src/lib/components/chat/ChatMessage.svelte`

**UX Specification:**
- Failed message shows in red-tinted bubble (`bg-red-500/10 border-red-500/30`)
- Error indicator: "Failed to send" with `AlertCircle` icon
- Retry button: `RotateCcw` icon, primary color
- Dismiss button: `X` icon, muted color
- Message truncated at 200 chars with ellipsis

**Acceptance Criteria:**
- [ ] Failed message displays with red-tinted bubble styling (`bg-red-500/10 border-red-500/30`)
- [ ] Error indicator shows "Failed to send" text with `AlertCircle` icon from lucide-svelte
- [ ] Retry button uses `RotateCcw` icon and primary color (`text-primary-400`)
- [ ] Dismiss button uses `X` icon and muted color (`text-zinc-400`)
- [ ] Message content truncated to 200 characters with ellipsis when longer
- [ ] Attachments count shown if present with `Paperclip` icon
- [ ] Retry sends exact same content including any attachments
- [ ] Dismiss clears the failed state
- [ ] Sending a new message clears any previous failure
- [ ] Only one failed message tracked at a time (latest failure)
- [ ] Works in both main chat and area chat
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-003: Fix Mobile Responsiveness - Core Layout

**Description:** As a mobile user, I need the app to work on small screens so that I can use StratAI on my phone.

**What to do:**
- Add mobile state detection via `matchMedia`
- Add hamburger menu to Header
- Convert Sidebar to overlay on mobile
- Add backdrop for sidebar close
- Make modals responsive (bottom sheet on mobile)
- Add iOS safe area support

**Files to Modify:**
- `src/routes/+layout.svelte`
- `src/lib/components/layout/Sidebar.svelte`
- `src/lib/components/layout/Header.svelte`
- `src/lib/components/ChatInput.svelte`
- `src/lib/components/spaces/SpaceModal.svelte`
- `src/lib/components/areas/AreaModal.svelte`

**Key Responsive Classes:**
- `md:hidden` - Hide on desktop (show on mobile)
- `hidden md:block` - Hide on mobile (show on desktop)
- `items-end md:items-center` - Bottom sheet on mobile, centered on desktop

**Acceptance Criteria:**
- [ ] Hamburger menu button (`Menu` icon) shows on mobile via `md:hidden` class
- [ ] Sidebar slides in from left on mobile with fixed positioning (`w-72 shadow-2xl`)
- [ ] Mobile backdrop appears when sidebar open (`bg-black/60 backdrop-blur-sm`)
- [ ] Tapping backdrop closes sidebar
- [ ] Sidebar navigation triggers `onNavigate` callback to close sidebar on mobile
- [ ] Header shows `X` icon when sidebar open, `Menu` icon when closed
- [ ] Modals use bottom sheet pattern on mobile (`items-end`, `rounded-t-2xl`, full width)
- [ ] Modals respect iOS safe area with `pb-[env(safe-area-inset-bottom)]`
- [ ] Chat input respects iOS safe area padding
- [ ] All touch targets minimum 36px (`w-9 h-9`), preferred 40px (`w-10 h-10`)
- [ ] App is usable on 375px wide viewport (iPhone SE minimum)
- [ ] No horizontal scrolling appears on any viewport size
- [ ] Sidebar state managed via matchMedia: auto-close on mobile resize, auto-open on desktop
- [ ] Transition duration for sidebar is 200ms with ease-out
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

---

### US-004: Add Request Deduplication for Critical Actions

**Description:** As a user, I need rapid clicks to not create duplicate items so that I don't accidentally create multiple spaces/areas.

**What to do:**
- Add `isSubmitting` state to modal components
- Add loading spinner to submit buttons
- Add private guard flags to store methods
- Disable all form controls during submission

**Files to Modify:**
- `src/lib/components/spaces/SpaceModal.svelte`
- `src/lib/components/areas/AreaModal.svelte`
- `src/lib/components/ChatInput.svelte`
- `src/lib/stores/spaces.svelte.ts`
- `src/lib/stores/areas.svelte.ts`

**Loading Text Mapping:**
| Button | Default Text | Loading Text |
|--------|--------------|--------------|
| Create Space | "Create Space" | "Creating..." |
| Create Area | "Create Area" | "Creating..." |
| Save Changes | "Save" | "Saving..." |
| Delete | "Delete" | "Deleting..." |
| Send (icon) | Send icon | Spinner only |

**Acceptance Criteria:**
- [ ] All submit buttons show inline SVG spinner with `animate-spin` class when loading
- [ ] All submit buttons are disabled during submission via `disabled` prop
- [ ] Cancel buttons also disabled during submission to prevent close mid-operation
- [ ] Loading text shown: "Creating..." for create, "Saving..." for save, "Deleting..." for delete
- [ ] Send button in ChatInput shows spinner only (no text, icon-only button style)
- [ ] SpaceModal has local `isSubmitting` state that guards `handleCreate` function
- [ ] AreaModal has local `isSubmitting` state that guards `handleCreate` function
- [ ] `SpacesStore.createSpace()` has private `_creatingSpace` guard flag that rejects concurrent calls
- [ ] `AreasStore.createArea()` has private `_creatingArea` guard flag that rejects concurrent calls
- [ ] Guard flags log `console.warn` when rejecting duplicate calls
- [ ] Double-click cannot create duplicate items (verify with rapid clicking)
- [ ] Form inputs remain disabled during submission
- [ ] Spinner size is `w-4 h-4` in buttons, `w-5 h-5` in icon-only buttons
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

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

## Technical Considerations

- **Transaction safety:** Document deletion cascade must be atomic (US-001)
- **State management:** Use Svelte 5 runes for reactive state
- **Responsive design:** Use Tailwind `md:` prefix for 768px breakpoint
- **Touch targets:** iOS HIG recommends 44px minimum, we target 36-40px
- **Safe areas:** iOS notch/home indicator needs `env(safe-area-inset-bottom)`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Transaction failures leave partial state | Use `sql.begin()` transaction wrapper |
| Mobile Safari quirks | Test on actual iOS device, use standard Tailwind patterns |
| Race conditions in stores | Add private guard flags as defense in depth |
| Breaking existing desktop layout | Mobile-first responsive additions only |

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
