# Feature Specification: Create Page from Task Conversation

## Overview

Extend the existing "Create Page from Conversation" feature (currently available in Area chats) to also work in Task conversations. Users should be able to convert a task conversation into a permanent Page document with one click.

## User Value

**As a user**, I want to create a Page from my task conversation so that I can:
- Preserve important discussions and decisions made during task work
- Create documentation from AI-assisted problem-solving sessions
- Convert brainstorming conversations into structured notes
- Build knowledge artifacts from task-related research
- Share task insights with team members as polished documents

**Business Value:**
- Encourages knowledge capture and sharing
- Reduces duplicate conversations (save insights for reuse)
- Increases Page creation (content generation)
- Demonstrates AI value (conversations → artifacts)
- Supports async collaboration (document decisions)

## Current State

**Area Conversations:**
- ✅ "Create Page from Conversation" button exists in chat interface
- ✅ Converts conversation to TipTap document
- ✅ Saves Page to the current Area
- ✅ User can edit title before creation
- ✅ Page appears in Area's Pages list

**Task Conversations:**
- ❌ No "Create Page" functionality
- ❌ Users can't preserve task conversation insights
- ❌ Knowledge from task work is ephemeral

## Technical Context

### Existing Implementation (Area Conversations)

The feature already exists for Area chats. We need to:
1. **Reuse existing conversion logic** (conversation → TipTap format)
2. **Adapt the UI component** for Task conversation context
3. **Save to the Task's Area** (tasks belong to areas, pages belong to areas)
4. **Optionally link Page to Task** (create relationship for discoverability)

### Key Difference: Task Conversations vs Area Conversations

| Aspect | Area Conversations | Task Conversations |
|--------|-------------------|-------------------|
| **Page save location** | Current Area | Task's parent Area |
| **Default title** | "Conversation - [timestamp]" | "[Task Title] - Discussion" |
| **Relationship** | Page → Area | Page → Area + optional Page → Task link |
| **Visibility** | Area visibility rules | Inherits Area visibility |

## User Stories

---

### US-001: Add "Create Page" Button to Task Conversation UI

**As a user**, I need a "Create Page from Conversation" button in the task conversation interface so that I can quickly convert the discussion into a document.

**Description:**
Add a button to the task conversation interface (similar to Area conversations) that triggers the page creation flow. The button should appear in the conversation actions area, next to other conversation controls.

**Acceptance Criteria:**

1. **Button Placement**
   - Button appears in task conversation header or action bar (same location as Area conversations)
   - Uses document/file icon (consistent with Area conversations)
   - Tooltip: "Create Page from conversation"
   - Visible when conversation has at least 2 messages (1 user + 1 assistant minimum)

2. **Button States**
   - **Enabled**: Conversation has content to convert
   - **Disabled**: Conversation is empty or has only 1 message
   - **Disabled**: User doesn't have permission to create Pages in Task's Area
   - Tooltip explains why disabled if applicable

3. **Visual Design**
   - Matches existing "Create Page" button from Area conversations
   - Same icon, styling, hover states
   - Positioned consistently with other task conversation actions

4. **Permissions Check**
   - Only show button if user has `write` or `owner` role in Task's parent Area
   - Hide button for read-only Area access
   - Hide button if Area doesn't allow Page creation (future: Area settings)

5. **Quality Gates**
   - npm run check passes (0 TypeScript errors)
   - npm run lint passes (0 new ESLint errors)
   - Button renders correctly on desktop and mobile
   - Keyboard accessible (tab navigation, Enter to activate)

**Dependencies:** None (reuses existing UI patterns)

**Technical Notes:**
- Reuse `CreatePageButton.svelte` component from Area conversations (or create `ConversationToPageButton.svelte`)
- Pass `taskId` and `conversationId` as props
- Fetch Task's `areaId` to determine save location
- Check user's Area role via existing permissions system

---

### US-002: Convert Task Conversation to Page Format

**As a developer**, I need a robust conversion function that transforms task conversation messages into TipTap-compatible Page content so that the resulting Page is properly formatted.

**Description:**
Create or adapt the existing conversation-to-page conversion logic to handle task conversations. The conversion should preserve message structure, code blocks, formatting, and metadata while creating a readable document.

**Acceptance Criteria:**

1. **Conversion Function**
   - Function signature: `convertTaskConversationToPage(conversation, task) => TipTapContent`
   - Input: Task conversation object (messages array, metadata)
   - Output: TipTap JSON content structure
   - Reuses existing Area conversation conversion logic (DRY principle)

2. **Content Structure**
   - **Title (H1)**: "[Task Title] - Discussion"
   - **Metadata section**: Task name, created date, participants
   - **Messages**: Converted to structured content:
     - User messages: Blockquote or distinct formatting
     - Assistant messages: Regular paragraphs
     - Timestamps: Subtle metadata (not intrusive)
   - **Code blocks**: Preserved with syntax highlighting hints
   - **Links**: Converted to TipTap link marks
   - **Lists**: Preserved as bullet/numbered lists

3. **Message Formatting**
   - Each message gets a section:
     - Speaker label (User/Assistant/System)
     - Timestamp (relative: "2 hours ago" or absolute)
     - Message content (formatted markdown → TipTap)
   - Attachments listed with metadata (filename, not inline)
   - Extended thinking blocks clearly marked (collapsible in TipTap)
   - Search sources formatted as reference list

4. **Metadata Preservation**
   - Page frontmatter includes:
     - `sourceType: "task_conversation"`
     - `sourceTaskId: task.id`
     - `sourceConversationId: conversation.id`
     - `createdFromConversationAt: timestamp`
   - Enables future "back to conversation" links

5. **Edge Cases**
   - Very long conversations (1000+ messages): Paginate or summarize
   - Empty messages: Skip or show placeholder
   - Malformed content: Graceful degradation
   - Special characters: Proper escaping for TipTap

6. **Quality Gates**
   - npm run check passes (0 TypeScript errors)
   - npm run lint passes (0 new ESLint errors)
   - Unit tests for conversion edge cases (optional for MVP)
   - Manual testing with various conversation types

**Dependencies:** None (can reuse existing conversion utilities)

**Technical Notes:**
- Look for existing conversion function in Area conversation code
- May be in `/src/lib/services/` or `/src/lib/utils/`
- TipTap format: JSON with `type`, `content`, `marks` structure
- Reference: TipTap documentation for proper node structures

---

### US-003: Save Page to Task's Parent Area

**As a user**, I need the created Page to be saved to the Task's parent Area so that it's discoverable and properly organized within my Space structure.

**Description:**
Implement the API endpoint and repository logic to create a new Page from a task conversation and save it to the correct Area with proper permissions and relationships.

**Acceptance Criteria:**

1. **API Endpoint**
   - Endpoint: POST `/api/tasks/[taskId]/conversations/[conversationId]/create-page`
   - Request body: `{ title?: string, includeMetadata?: boolean }`
   - Returns: `{ page: Page, areaId: string }`
   - Authentication required (locals.session)

2. **Authorization**
   - User must have access to the Task
   - User must have `write` or `owner` role in Task's parent Area
   - Returns 403 if user lacks permissions
   - Returns 404 if Task or Conversation not found

3. **Page Creation Logic**
   - Fetch Task and its parent Area
   - Fetch Conversation messages
   - Convert Conversation to TipTap content (US-002)
   - Create Page with:
     - `areaId`: Task's parent Area ID
     - `title`: User-provided or "[Task Title] - Discussion"
     - `content`: Converted TipTap JSON
     - `type`: "conversation" or "task_discussion"
     - `visibility`: Inherits Area visibility rules
     - `userId`: Current user (page creator)

4. **Optional: Link Page to Task**
   - Create `task_pages` relationship (if table exists)
   - Or store `sourceTaskId` in Page metadata
   - Enables "Pages created from this Task" feature later

5. **Response**
   - Returns created Page object
   - Includes `areaId` for client navigation
   - Includes `pageId` for linking to Page view

6. **Error Handling**
   - 400: Invalid request (missing conversationId, etc.)
   - 401: Unauthenticated
   - 403: Insufficient permissions
   - 404: Task or Conversation not found
   - 500: Database or conversion error (with details)

7. **Quality Gates**
   - npm run check passes (0 TypeScript errors)
   - npm run lint passes (0 new ESLint errors)
   - npm run audit-db-access passes (camelCase usage)
   - Manual testing: Page created in correct Area

**Dependencies:** US-002 (conversion function)

**Technical Notes:**
- Follow patterns from existing Page creation endpoint
- Use postgres.js with camelCase access
- Use existing `pagesRepository.create()` method
- May need to extend `CreatePageInput` type with metadata fields

---

### US-004: Success Feedback and Navigation

**As a user**, I need clear feedback after creating a Page from a conversation so that I know it succeeded and can access the new Page.

**Description:**
After the Page is created, show a success toast and provide options to navigate to the new Page or continue working on the Task.

**Acceptance Criteria:**

1. **Success Toast**
   - Toast appears immediately after Page creation
   - Message: "Page created: [Page Title]"
   - Duration: 5 seconds (or dismissible)
   - Includes action buttons (see below)

2. **Toast Actions**
   - **Primary button**: "View Page" - navigates to Page editor
   - **Secondary button**: "Dismiss" - closes toast
   - Optional: "Copy link" - copies Page URL to clipboard

3. **Navigation Options**
   - **View Page**: Opens Page in new tab or same tab (user preference?)
   - URL: `/spaces/[spaceId]/areas/[areaId]/pages/[pageId]`
   - Preserves current Task conversation (don't navigate away)

4. **Conversation State**
   - Conversation remains open after Page creation
   - No disruption to ongoing work
   - User can continue chatting after creating Page

5. **Error Feedback**
   - If Page creation fails: Error toast with reason
   - Message: "Failed to create Page: [error]"
   - Retry button (optional, triggers creation again)

6. **Optimistic UI (Optional)**
   - Disable "Create Page" button immediately on click
   - Show loading spinner on button
   - Re-enable button if creation fails

7. **Quality Gates**
   - npm run check passes (0 TypeScript errors)
   - npm run lint passes (0 new ESLint errors)
   - Toast dismisses properly (no stuck toasts)
   - Navigation works in all browsers

**Dependencies:** US-001, US-002, US-003

**Technical Notes:**
- Use existing `toastStore` for notifications
- Follow patterns from Area conversation Page creation
- Use SvelteKit navigation (`goto()`) for page navigation
- Consider using `target="_blank"` for "View Page" link

---

## Out of Scope (Future Enhancements)

The following are explicitly **NOT** included in this initial implementation but could be added later:

- **Batch Page creation** (create Pages from multiple conversations)
- **Automatic Page titles** (AI-generated based on conversation content)
- **Page templates** (pre-formatted structures for different conversation types)
- **Conversation → Page synchronization** (update Page when conversation continues)
- **Reverse link** ("View source conversation" from Page)
- **Page created from conversation badge** (visual indicator on Page)
- **Selective message inclusion** (choose which messages to include)
- **Conversation summarization** (AI summary at top of Page)

---

## Success Metrics

After implementation, we can measure success by:

1. **Adoption Rate:**
   - % of task conversations that result in Page creation
   - Target: 10-15% (similar to Area conversations)

2. **Page Quality:**
   - Do users edit Pages after creation? (indicates useful content)
   - Page retention rate (not deleted within 7 days)

3. **User Satisfaction:**
   - User feedback on Page formatting quality
   - Feature usage compared to Area conversation Pages

4. **Feature Parity:**
   - Task conversation Page creation usage ≥ Area conversation usage
   - Indicates feature is equally valuable in both contexts

---

## Technical Architecture

```
User Click (Task Conversation)
    ↓
CreatePageButton.svelte
    ↓
POST /api/tasks/[taskId]/conversations/[conversationId]/create-page
    ↓
API Handler (+server.ts)
    ├─ Authenticate user
    ├─ Check permissions (Task access + Area write)
    ├─ Fetch Task (get areaId)
    ├─ Fetch Conversation (get messages)
    ├─ Convert to TipTap (conversationToPage.ts)
    └─ Create Page (pagesRepository.create)
    ↓
Return { page, areaId }
    ↓
Toast + Navigation (client)
```

**New Files:**
- `/src/routes/api/tasks/[taskId]/conversations/[conversationId]/create-page/+server.ts` (~150 lines)
- `/src/lib/services/conversationToPage.ts` (~200 lines, may reuse existing)
- `/src/lib/components/conversations/ConversationToPageButton.svelte` (~100 lines, may reuse existing)

**Modified Files:**
- `/src/routes/spaces/[space]/task/[taskId]/+page.svelte` (add button to conversation UI)
- `/src/lib/types/pages.ts` (add metadata fields if needed)

**Total LOC Estimate:** ~450-500 lines (mostly reusing existing patterns)

---

## Implementation Plan

**Recommended Story Order:**

1. **US-002 first** (conversion function) - Most isolated, can be tested independently
2. **US-003 next** (API endpoint) - Depends on US-002, core functionality
3. **US-001 next** (UI button) - Depends on US-003 API, visible progress
4. **US-004 last** (feedback/navigation) - Polish, depends on all previous

This order allows incremental testing and early validation of the core logic (conversion + API) before building UI.

---

## Testing Strategy

**Unit Tests (Optional for MVP, Recommended):**
- Conversion function (various conversation formats)
- Edge cases (empty conversations, malformed content, long conversations)

**Integration Tests:**
- API endpoint returns correct Page structure
- Page saved to correct Area
- Permissions enforced (403 on unauthorized)

**Manual Testing Checklist:**
1. Create Page from short task conversation (5 messages)
2. Create Page from long task conversation (100+ messages)
3. Create Page with code blocks and formatting
4. Create Page with attachments
5. Create Page with extended thinking
6. Verify Page appears in Area Pages list
7. Verify user can edit Page after creation
8. Test unauthorized access (403)
9. Test non-existent task/conversation (404)
10. Test button disabled states

**Edge Cases:**
- Task with no parent Area (should not happen, but handle gracefully)
- Conversation with only 1 message (disable button)
- Empty conversation (disable button)
- Very long conversation (performance test)

---

## Timeline Estimate

**Development:**
- US-002 (Conversion): ~2 hours (may reuse existing function)
- US-003 (API): ~2-3 hours
- US-001 (UI button): ~1-2 hours
- US-004 (Feedback): ~1 hour
- **Total:** 6-8 hours (1 day of focused work)

**Testing & QA:**
- Manual testing: ~1-2 hours
- Bug fixes: ~1-2 hours
- **Total:** 2-4 hours

**Grand Total:** 8-12 hours (1-1.5 days)

---

## Notes for PRD Creator Agent

**Codebase Research Needed:**
- Existing "Create Page from Conversation" implementation in Area chats
  - Look for: `CreatePageButton`, `ConversationToPageButton`, or similar components
  - Look for: API endpoint that handles Area conversation → Page conversion
  - Look for: Conversion utility functions (conversation → TipTap)
- Task conversation UI structure
  - Location: `/src/routes/spaces/[space]/task/[taskId]/+page.svelte`
  - Conversation component location
- Pages creation patterns
  - `pagesRepository.create()` method signature
  - Required fields for Page creation
  - TipTap content structure

**Key Patterns to Apply:**
- Reuse existing Area conversation Page creation logic (DRY)
- postgres.js camelCase access (CRITICAL)
- Svelte 5 runes (not Svelte 4 stores)
- Existing toast notification patterns
- API endpoint structure from Area conversations

**Strategic Documents to Reference:**
- CLAUDE.md (development principles, quality gates)
- docs/DOCUMENT_SYSTEM.md (Pages system architecture)
- docs/database/SCHEMA_REFERENCE.md (tasks, conversations, pages tables)
- docs/database/POSTGRES_JS_GUIDE.md (camelCase transformation)
- ENTITY_MODEL.md (Task → Area → Page relationships)

---

**Feature Specification Version:** 1.0
**Created:** 2026-01-18
**Status:** Ready for PRD Conversion
**Estimated Complexity:** Low-Medium (reuses existing patterns, well-scoped)
**Relationship:** Feature parity with existing Area conversation functionality
