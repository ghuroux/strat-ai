# PRD: Create Page from Task Conversation

## Introduction

Extend the existing "Create Page from Conversation" feature (currently available in Area chats) to also work in Task conversations. Users will be able to convert a task conversation into a permanent Page document with one click.

**User Value:**
- Preserve important discussions and decisions made during task work
- Create documentation from AI-assisted problem-solving sessions
- Convert brainstorming conversations into structured notes
- Share task insights with team members as polished documents

## Research Findings

**Existing Implementation (Area Conversations):**
- `CreatePageModal.svelte` - Fully reusable modal component
- `/api/pages/extract` - Conversation-to-TipTap conversion API
- `/api/pages` (POST) - Page creation with `taskId` and `sourceConversationId` support
- Area page integration (lines 232-234, 1280-1323, 1726-1735)

**Key Finding:** The existing components and APIs are fully reusable. This feature is primarily a UI integration task - adding the button and modal to the Task conversation page.

**Applicable Patterns:**
- CreatePageModal accepts: `isOpen`, `conversationId`, `messages`, `areaId`, `suggestedPageType`, `onClose`, `onCreated`
- State management: `createPageModalOpen`, `pageSuggestionPageType`
- Handler pattern: `handlePageCreated`, `handleCreatePageModalClose`
- Toast notifications via `toastStore.success()`
- Navigation via `goto()` from `$app/navigation`

## Goals

- Allow users to create Pages from Task conversations (feature parity with Area conversations)
- Reuse existing CreatePageModal and APIs (no duplication)
- Save Pages to the Task's parent Area (consistent with data model)
- Provide clear success feedback and navigation to new Page

## User Stories

### US-001: Add Create Page Button and Modal to Task Conversation UI

**Description:** As a user working on a task conversation, I want a "Create Page" button that opens the existing CreatePageModal so that I can convert my task discussion into a permanent Page document.

**What to do:**
- Add state variables for modal: `createPageModalOpen`, `pageSuggestionPageType`
- Import `CreatePageModal` from `$lib/components/pages`
- Add button to task conversation header (match Area conversation placement)
- Wire button to open modal with correct props
- Derive `areaId` from `task.areaId` for modal prop

**Files:**
- `src/routes/spaces/[space]/task/[taskId]/+page.svelte`

**Acceptance Criteria:**
- [ ] Button appears in task conversation header/action bar area
- [ ] Button uses document icon and tooltip "Create Page from conversation"
- [ ] Button is disabled when conversation has fewer than 2 messages
- [ ] Clicking button opens CreatePageModal with correct props
- [ ] Modal receives task's parent area ID from `task.areaId`
- [ ] npm run check passes (0 TypeScript errors)
- [ ] npm run lint passes (0 new ESLint errors)
- [ ] Button renders correctly and is keyboard accessible

**Notes:**
- Follow Area page pattern exactly (lines 232-234 for state, 1726-1735 for modal)
- CreatePageModal is already designed to be reusable with these props
- Task always has areaId - no null handling needed

---

### US-002: Implement Success Feedback and Navigation

**Description:** As a user, after creating a Page from my task conversation, I want clear feedback and the ability to navigate to the new Page so that I know it succeeded and can access my document.

**What to do:**
- Implement `handlePageCreated(pageId)` handler
- Show success toast using `toastStore.success()`
- Navigate to new Page using `goto()`
- Implement `handleCreatePageModalClose()` to reset state

**Files:**
- `src/routes/spaces/[space]/task/[taskId]/+page.svelte`

**Acceptance Criteria:**
- [ ] handlePageCreated shows success toast: "Page created successfully"
- [ ] After toast, navigate to `/spaces/[spaceId]/[area]/pages/[pageId]`
- [ ] Navigation uses correct space and area slugs from task context
- [ ] handleCreatePageModalClose resets modal state variables
- [ ] npm run check passes (0 TypeScript errors)
- [ ] npm run lint passes (0 new ESLint errors)
- [ ] Manual test: Create page, verify toast, verify navigation works

**Notes:**
- Follow Area page handlers exactly (lines 1280-1292)
- May need to derive area slug from areaId (check areaStore)
- Task page already has spaceParam from route

---

## Functional Requirements

- FR-1: The system must display a "Create Page" button in task conversation UI when conversation has 2+ messages
- FR-2: Clicking the button must open the existing CreatePageModal component
- FR-3: The system must pass the task's parent area ID to the modal
- FR-4: On successful page creation, the system must show a success toast
- FR-5: On successful page creation, the system must navigate to the new page editor

## Non-Goals

- Creating a new ConversationToPageButton component (reuse CreatePageModal directly)
- Creating a new API endpoint (existing /api/pages handles everything)
- Modifying the extraction logic (existing /api/pages/extract works for any conversation)
- Adding page suggestions in task conversations (future enhancement)
- Linking Page back to Task in UI (future enhancement - data model supports it)

## Technical Considerations

- **Reuse existing components**: CreatePageModal, toastStore, goto
- **Data model**: Pages already have optional `taskId` field; Tasks have required `areaId`
- **Navigation**: Need to derive area slug from task.areaId for URL construction
- **Minimal changes**: Only modifying task page file, no backend changes needed

## Risks & Mitigations

- **Risk**: Area slug derivation might require additional store lookup
  - **Mitigation**: Check if areaStore.getArea(areaId) provides slug, or use areaParam if available

## Timeline Estimate

- US-001: ~1-2 hours (UI integration, mostly copy-paste from Area page)
- US-002: ~30 minutes (handlers, toast, navigation)
- **Total**: ~2-3 hours

---

**PRD Version:** 1.0
**Created:** 2026-01-18
**Status:** Ready for Implementation
**Estimated Complexity:** Low (reuses existing patterns, well-scoped)
