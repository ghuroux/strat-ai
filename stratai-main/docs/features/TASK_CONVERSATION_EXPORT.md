# Feature Specification: Export Task Conversations

## Overview

Enable users to export task conversation history in multiple formats (Markdown, JSON, Plain Text) for archival, sharing, and external analysis purposes.

## User Value

**As a user**, I want to export my task conversations so that I can:
- Archive important AI conversations outside the platform
- Share conversation history with team members or stakeholders
- Analyze conversation patterns and AI responses
- Maintain records for compliance or documentation
- Transfer knowledge to other tools/systems

**Business Value:**
- Reduces lock-in concerns (users control their data)
- Improves user trust and transparency
- Enables workflows that extend beyond the platform
- Differentiator for enterprise customers (data portability)

## Technical Context

This feature leverages the existing pages export infrastructure (`ExportMenu.svelte`, conversion utilities) and adapts it for conversation data.

**Key Difference:**
- Pages: Complex TipTap JSON tree (nested nodes, marks)
- Conversations: Flat message array (role, content, timestamp) - **SIMPLER**

**Existing Resources to Reuse:**
- `src/lib/components/pages/ExportMenu.svelte` - Export dropdown UI pattern
- `src/routes/api/pages/export/[id]/+server.ts` - API endpoint pattern
- Authentication/authorization patterns (locals.session)
- File download handling (Content-Disposition headers)

## User Stories

---

### US-001: Create Conversation Export API Endpoint

**As a developer**, I need a robust API endpoint that converts conversation data into exportable formats so that the UI can trigger downloads.

**Description:**
Create a new API endpoint at `/api/conversations/export/[id]` that accepts a conversation ID and format parameter, retrieves the conversation data, converts it to the requested format, and returns it as a downloadable file.

**Acceptance Criteria:**

1. **API Endpoint Structure**
   - Endpoint: GET `/api/conversations/export/[id]?format=markdown|json|plaintext`
   - Accepts conversation ID as route parameter
   - Accepts format as query parameter (default: markdown)
   - Returns appropriate Content-Type header for format
   - Returns Content-Disposition header with filename: `{conversation-title}-{timestamp}.{ext}`

2. **Authentication & Authorization**
   - Requires valid session (locals.session)
   - Returns 401 if not authenticated
   - Returns 403 if user doesn't have access to the conversation
   - Validates conversation belongs to accessible space/task

3. **Markdown Format Conversion**
   - Title as H1 header with task context
   - Each message formatted with role label (User/Assistant/System)
   - Timestamps in readable format (YYYY-MM-DD HH:MM)
   - Code blocks preserved with proper markdown syntax
   - Links rendered as markdown links
   - Attachments listed with metadata (filename, size, type)
   - Extended thinking sections marked clearly (if present)
   - Search sources formatted as reference list (if present)

4. **JSON Format Conversion**
   - Full structured export of conversation data
   - Includes: id, title, created_at, updated_at, messages array
   - Each message includes: id, role, content, timestamp, model
   - Preserves all metadata (attachments, thinking, sources, tokens)
   - Pretty-printed JSON (indented, readable)

5. **Plain Text Format Conversion**
   - Simple text format: `[Timestamp] Role: Message`
   - No formatting, just content and metadata
   - One message per line (or multi-line for long messages)
   - Suitable for grep/text analysis

6. **Error Handling**
   - Returns 404 if conversation not found
   - Returns 400 if invalid format parameter
   - Returns 500 with error message for conversion failures
   - Logs errors for debugging

7. **Edge Cases**
   - Handles empty conversations (no messages yet)
   - Handles very long conversations (1000+ messages)
   - Handles messages with null/undefined fields gracefully
   - Handles special characters in content (escaping)

8. **Quality Gates**
   - npm run check passes (0 TypeScript errors)
   - npm run lint passes (0 new ESLint errors)
   - npm run audit-db-access passes (correct camelCase usage)

**Dependencies:** None (first story)

**Technical Notes:**
- Follow pattern from `/api/pages/export/[id]/+server.ts`
- Use postgres.js with camelCase access for conversation retrieval
- Create conversion utilities in `/src/lib/services/conversationExport.ts`
- Use existing `Conversation` and `Message` types from `/src/lib/types/chat.ts`

---

### US-002: Add Export Button to Task Conversation UI

**As a user**, I need an export button in the task conversation interface so that I can easily download my conversation history.

**Description:**
Integrate the export functionality into the task conversation UI by adding an export button/menu to the conversation header, similar to how pages have export functionality.

**Acceptance Criteria:**

1. **UI Component**
   - Export button appears in task conversation header (near title/actions)
   - Uses dropdown menu pattern from ExportMenu (or create ConversationExportMenu)
   - Button icon: download icon (lucide-svelte Download)
   - Dropdown shows three format options: Markdown, JSON, Plain Text
   - Each option shows icon + label + description

2. **Visual Design**
   - Matches existing page export menu styling
   - Dropdown positioned correctly (doesn't overflow screen)
   - Hover states work properly
   - Loading state during export (button disabled, spinner shown)
   - Dropdown closes after selection

3. **Functionality**
   - Clicking format option triggers API call to `/api/conversations/export/[id]?format=X`
   - Browser downloads file automatically
   - Filename format: `{task-title}-conversation-{YYYYMMDD-HHMMSS}.{ext}`
   - Works for all three formats (markdown, json, plaintext)
   - Error toast shown if export fails

4. **Permissions**
   - Button only visible if user has read access to conversation
   - Disabled state if conversation has no messages
   - Tooltip explains why disabled ("No messages to export")

5. **Integration Points**
   - Component located in task conversation page: `/spaces/[space]/task/[taskId]`
   - Positioned in conversation header (similar to page export in PageHeader)
   - Uses existing conversation ID from page context
   - Uses existing toastStore for error messages

6. **Responsive Design**
   - Works on desktop (full dropdown)
   - Works on tablet/mobile (adapted layout if needed)
   - Touch-friendly tap targets

7. **Quality Gates**
   - npm run check passes (0 TypeScript errors)
   - npm run lint passes (0 new ESLint errors)
   - Manual testing: Export triggered, file downloads correctly

**Dependencies:** US-001 (API endpoint must exist)

**Technical Notes:**
- Option 1: Reuse `ExportMenu.svelte` with new prop `conversationId?: string`
- Option 2: Create `ConversationExportMenu.svelte` adapted from ExportMenu
- Use `fetch()` to call export API
- Use `window.URL.createObjectURL()` for blob download if needed (or rely on Content-Disposition)
- Follow Svelte 5 patterns (runes, not Svelte 4 stores)

---

### US-003: Polish Export Quality & Edge Cases

**As a user**, I need exported conversation files to be clean, readable, and handle all edge cases so that exports are reliable and professional.

**Description:**
Refine the export functionality to handle edge cases, improve formatting quality, and ensure a polished user experience across different conversation types and sizes.

**Acceptance Criteria:**

1. **Filename Quality**
   - Task title in filename is sanitized (no special chars: `/\:*?"<>|`)
   - Long task titles truncated to 50 chars with ellipsis
   - Timestamp always present and unique (prevents overwrites)
   - Extension matches format (.md, .json, .txt)
   - Example: `implement-user-auth-conversation-20260118-143022.md`

2. **Markdown Export Quality**
   - Headers properly nested (H1 for title, H2 for sections, H3 for messages)
   - Code blocks use proper language hints (```python, ```typescript)
   - Tables in messages preserved (if present)
   - Lists (bullet/numbered) formatted correctly
   - Blockquotes preserved with `>` prefix
   - Horizontal rules (`---`) separate major sections
   - Table of contents generated for long conversations (100+ messages)

3. **Attachment Handling**
   - Attachments listed with:
     - Filename
     - File size (human-readable: 1.2 MB)
     - MIME type
     - Upload timestamp
   - Note indicates "File not included in export, available in platform"
   - Links to attachment location (if publicly accessible)

4. **Extended Thinking Display**
   - Thinking blocks clearly marked (e.g., "💭 Extended Thinking")
   - Collapsed by default in markdown (use details/summary if supported)
   - Optionally excluded based on export preference (future: add checkbox)

5. **Search Sources Formatting**
   - Sources section at end of message (if present)
   - Each source: title, URL, snippet
   - Markdown links to original sources

6. **Edge Case: Empty Conversations**
   - Export shows: "No messages yet" with conversation metadata
   - Includes created date, last updated, participant info
   - Still downloads successfully (not an error)

7. **Edge Case: Very Long Conversations**
   - Handles 1000+ messages without performance issues
   - Pagination or chunking if needed (consider file size limits)
   - Markdown: Add page breaks every 100 messages (for printing)
   - JSON: Ensure valid JSON structure (no truncation)

8. **Edge Case: Special Characters**
   - Handles emoji in messages ✅
   - Handles code with backticks properly escaped
   - Handles markdown-like text (e.g., `# not a header` in message)
   - Handles URLs with special characters

9. **Edge Case: Subtask Conversations**
   - If conversation is linked to subtask, include subtask context
   - Header shows: "Task: [Parent Task] → Subtask: [Subtask Name]"
   - Breadcrumb-style context for clarity

10. **Export Metadata Section**
    - Footer in markdown exports:
      - Exported by: [User Name]
      - Exported at: [Timestamp]
      - Platform: StratAI
      - Conversation ID: [id] (for reference)
      - Total messages: [count]
      - Date range: [first message] to [last message]

11. **Quality Gates**
    - npm run check passes (0 TypeScript errors)
    - npm run lint passes (0 new ESLint errors)
    - Manual testing with:
      - Short conversation (3 messages)
      - Long conversation (100+ messages)
      - Conversation with attachments
      - Conversation with code blocks
      - Conversation with thinking blocks
      - Conversation with search sources
      - Empty conversation
      - Subtask conversation

**Dependencies:** US-001, US-002 (builds on both)

**Technical Notes:**
- Refine conversion utilities in `/src/lib/services/conversationExport.ts`
- Add sanitization utility for filenames
- Consider markdown-escape library for special characters
- Test with real conversation data (not just mocked)
- May need to add export preferences to user settings (future: Phase 2)

---

## Out of Scope (Future Enhancements)

The following are explicitly **NOT** included in this initial implementation but could be added later:

- **Export preferences** (include/exclude thinking, sources, timestamps)
- **Word (.docx) format** (pages have this, but adds complexity)
- **Batch export** (export multiple conversations at once)
- **Scheduled exports** (automatic backups)
- **Export to external services** (Google Drive, Dropbox)
- **Conversation annotations** (highlighting, comments before export)
- **Export history** (track what was exported when)

---

## Success Metrics

After implementation, we can measure success by:

1. **Adoption Rate:**
   - % of users who export at least one conversation in first 30 days
   - Target: 15-20% (pages export is ~12% currently)

2. **Format Preferences:**
   - Which format is most popular? (hypothesis: Markdown 60%, JSON 30%, Plain 10%)

3. **Error Rate:**
   - Export failures < 1%
   - User-reported issues < 5 per month

4. **Qualitative Feedback:**
   - User satisfaction with export quality
   - Feature requests related to export (guides future enhancements)

---

## Technical Architecture

```
User Click
    ↓
ConversationExportMenu.svelte (UI)
    ↓
GET /api/conversations/export/[id]?format=markdown
    ↓
+server.ts (API)
    ├─ Authenticate (locals.session)
    ├─ Authorize (user has access to conversation)
    ├─ Fetch conversation from DB (postgres.js)
    ├─ Convert to format (conversationExport.ts)
    └─ Return file with Content-Disposition header
    ↓
Browser downloads file
```

**New Files:**
- `/src/routes/api/conversations/export/[id]/+server.ts` (~300 lines)
- `/src/lib/services/conversationExport.ts` (~400 lines)
- `/src/lib/components/conversations/ConversationExportMenu.svelte` (~150 lines, or reuse ExportMenu)

**Modified Files:**
- `/src/routes/spaces/[space]/task/[taskId]/+page.svelte` (add export menu to header)

**Total LOC Estimate:** ~850-900 lines (including tests and polish)

---

## Testing Strategy

**Unit Tests (Optional for MVP, Recommended):**
- Conversion utilities (markdown, json, plaintext)
- Filename sanitization
- Edge case handling (empty, long, special chars)

**Integration Tests:**
- API endpoint returns correct formats
- Authentication/authorization enforced
- Database queries use correct camelCase access

**Manual Testing Checklist:**
1. Export short conversation (all formats)
2. Export long conversation (100+ messages)
3. Export with attachments
4. Export with code blocks
5. Export with thinking blocks
6. Export empty conversation
7. Export subtask conversation
8. Test unauthorized access (403)
9. Test non-existent conversation (404)
10. Verify filenames are clean and timestamped

---

## Timeline Estimate

**Development:**
- US-001 (API): ~3-4 hours
- US-002 (UI): ~2-3 hours
- US-003 (Polish): ~2-3 hours
- **Total:** 7-10 hours

**Testing & QA:**
- Manual testing: ~1-2 hours
- Bug fixes: ~1-2 hours
- **Total:** 2-4 hours

**Grand Total:** 9-14 hours (1-2 days of focused work)

---

## Implementation Order

1. **US-001 first** (API endpoint) - Most independent, can be tested via curl/Postman
2. **US-002 next** (UI integration) - Depends on US-001, visible progress
3. **US-003 last** (Polish) - Refines both US-001 and US-002

This order allows the orchestrator to work sequentially with clear validation gates after each story.

---

## Notes for PRD Creator Agent

**Codebase Research Needed:**
- Existing pages export implementation (ExportMenu.svelte, /api/pages/export/)
- Conversation data structure (Conversation type, Message type)
- Task conversation UI location and structure
- Authentication patterns (locals.session usage)
- File download patterns (Content-Disposition headers)

**Key Patterns to Apply:**
- postgres.js camelCase access (CRITICAL - check AGENTS.md)
- Svelte 5 runes (not Svelte 4 stores)
- Existing ExportMenu component pattern
- API endpoint structure from pages export

**Strategic Documents to Reference:**
- CLAUDE.md (development principles, quality gates)
- docs/database/SCHEMA_REFERENCE.md (conversations table)
- docs/database/POSTGRES_JS_GUIDE.md (camelCase transformation)
- ENTITY_MODEL.md (conversation entity relationships)

---

**Feature Specification Version:** 1.0
**Created:** 2026-01-18
**Status:** Ready for PRD Conversion
**Estimated Complexity:** Medium (reuses proven patterns, well-scoped)
