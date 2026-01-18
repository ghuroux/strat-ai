# PRD: Task Conversation Export

## Overview

Enable users to export task conversation history in multiple formats (Markdown, JSON, Plain Text) for archival, sharing, and external analysis purposes.

**Parent Task ID:** `task-conversation-export`
**Created:** 2026-01-18
**Estimated Effort:** 7-10 hours (1-2 days)

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

## Research Findings

### Similar Patterns Found

| Pattern | Location | Notes |
|---------|----------|-------|
| ExportMenu UI | `src/lib/components/pages/ExportMenu.svelte` | Dropdown with format options, uses Svelte 5 runes |
| Export API | `src/routes/api/pages/export/[id]/+server.ts` | Content-Disposition headers, conversion utilities |
| Conversation API | `src/routes/api/conversations/[id]/+server.ts` | Auth pattern, findById with userId |

### Database Schema

From `docs/database/SCHEMA_REFERENCE.md`:

| Column (SQL) | Property (JS) | Type | Notes |
|--------------|---------------|------|-------|
| `id` | `id` | TEXT | Primary key |
| `title` | `title` | TEXT | Conversation title |
| `messages` | `messages` | JSONB | Array of message objects |
| `task_id` | `taskId` | TEXT | FK to tasks table |
| `created_at` | `createdAt` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | Last update |

### Applicable Patterns

- **postgres.js camelCase transformation**: MUST use `row.taskId` not `row.task_id`
- **Authentication**: Check `locals.session`, use `locals.session.userId`
- **File download**: Use `Content-Disposition` header with filename
- **Svelte 5**: Use `$state`, `$derived`, `$effect` (NOT Svelte 4 stores)

---

## User Stories

### US-001: Create Conversation Export API Endpoint

**Description:** As a developer, I need a robust API endpoint that converts conversation data into exportable formats so that the UI can trigger downloads.

**What to do:**
- Create new API endpoint at `/api/conversations/export/[id]/+server.ts`
- Implement format conversion utilities in `/src/lib/services/conversationExport.ts`
- Support three formats: markdown, json, plaintext
- Return files with appropriate Content-Type and Content-Disposition headers

**Files:**
- `src/routes/api/conversations/export/[id]/+server.ts` (new)
- `src/lib/services/conversationExport.ts` (new)

**Schema Context:**

| Column (SQL) | Property (JS) | Type | Nullable |
|--------------|---------------|------|----------|
| `id` | `id` | TEXT | NO |
| `title` | `title` | TEXT | NO |
| `messages` | `messages` | JSONB | NO |
| `task_id` | `taskId` | TEXT | YES |
| `created_at` | `createdAt` | TIMESTAMPTZ | NO |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | NO |

**Acceptance Criteria:**
- [ ] GET `/api/conversations/export/[id]?format=markdown|json|plaintext` endpoint exists
- [ ] Returns 401 if not authenticated (no locals.session)
- [ ] Returns 404 if conversation not found
- [ ] Returns 400 for invalid format parameter
- [ ] Markdown format includes: title as H1, role labels, timestamps, preserved code blocks
- [ ] JSON format includes: id, title, createdAt, updatedAt, messages array with all metadata
- [ ] Plain text format: `[Timestamp] Role: Message` - suitable for grep/analysis
- [ ] Content-Type header matches format
- [ ] Content-Disposition header with filename: `{task-title}-conversation-{timestamp}.{ext}`
- [ ] Handles empty conversations gracefully
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm run audit-db-access` passes

**Notes:**
- Follow pattern from `/api/pages/export/[id]/+server.ts`
- Use `postgresConversationRepository.findById(id, userId)` for data retrieval
- Reference `Conversation` and `Message` types from `$lib/types/chat`

---

### US-002: Add Export Button to Task Conversation UI

**Description:** As a user, I need an export button in the task conversation interface so that I can easily download my conversation history.

**What to do:**
- Add export dropdown to task conversation header
- Position in `header-right` section after Create Page button
- Implement download trigger via API call
- Handle errors with toast notifications

**Files:**
- `src/routes/spaces/[space]/task/[taskId]/+page.svelte` (modify header-right section)
- Optionally: `src/lib/components/conversations/ConversationExportMenu.svelte` (new)

**Acceptance Criteria:**
- [ ] Export button appears in task conversation header (`header-right` section)
- [ ] Uses dropdown menu pattern similar to ExportMenu.svelte
- [ ] Button icon: download icon (lucide-svelte or inline SVG)
- [ ] Dropdown shows three format options: Markdown, JSON, Plain Text
- [ ] Clicking format option triggers API call to `/api/conversations/export/[id]?format=X`
- [ ] Browser downloads file automatically via `window.location.href`
- [ ] Button disabled with tooltip when conversation has no messages
- [ ] Error toast shown if export fails (uses `toastStore`)
- [ ] Dropdown closes after selection
- [ ] Uses Svelte 5 runes (`$state`, `$effect`) - NOT Svelte 4 stores
- [ ] `npm run check` passes
- [ ] `npm run lint` passes

**Notes:**
- Option 1: Inline the dropdown in +page.svelte (simpler, less reusable)
- Option 2: Create ConversationExportMenu.svelte component (more reusable)
- Integration point: line ~1317 in +page.svelte, after Create Page button

---

### US-003: Polish Export Quality and Edge Cases

**Description:** As a user, I need exported conversation files to be clean, readable, and handle all edge cases so that exports are reliable and professional.

**What to do:**
- Refine filename sanitization
- Improve markdown formatting (code hints, attachments, thinking blocks)
- Add export metadata footer
- Handle edge cases (empty, long, special characters)

**Files:**
- `src/lib/services/conversationExport.ts` (enhance)
- `src/routes/api/conversations/export/[id]/+server.ts` (enhance)

**Acceptance Criteria:**
- [ ] Filenames sanitized: no special chars (`/\:*?"<>|`), truncated to 50 chars
- [ ] Markdown: code blocks have language hints (` ```typescript `, ` ```python `)
- [ ] Markdown: attachments listed with filename, size (human-readable), MIME type
- [ ] Markdown: extended thinking sections marked clearly (e.g., "Extended Thinking")
- [ ] Markdown: search sources formatted as reference list at end of message
- [ ] Markdown: export metadata footer (exported by, timestamp, platform, message count)
- [ ] Empty conversations export successfully with metadata only
- [ ] Very long conversations (1000+ messages) handled without performance issues
- [ ] Special characters (emoji, backticks, markdown-like text) handled correctly
- [ ] Subtask conversations include parent task context in header
- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] Manual testing with: short/long conversations, attachments, code blocks, thinking blocks

**Notes:**
- Consider markdown-escape for special characters
- Test with real conversation data, not just mocked

---

## Non-Goals (Out of Scope)

The following are explicitly **NOT** included in this implementation:

- Export preferences (include/exclude thinking, sources, timestamps)
- Word (.docx) format for conversations
- Batch export (export multiple conversations at once)
- Scheduled exports (automatic backups)
- Export to external services (Google Drive, Dropbox)
- Conversation annotations (highlighting, comments before export)
- Export history (track what was exported when)

---

## Technical Architecture

```
User Click
    |
ConversationExportMenu (UI)
    |
GET /api/conversations/export/[id]?format=markdown
    |
+server.ts (API)
    |-- Authenticate (locals.session)
    |-- Authorize (user has access to conversation)
    |-- Fetch conversation from DB (postgresConversationRepository)
    |-- Convert to format (conversationExport.ts)
    |-- Return file with Content-Disposition header
    |
Browser downloads file
```

**New Files:**
- `/src/routes/api/conversations/export/[id]/+server.ts` (~300 lines)
- `/src/lib/services/conversationExport.ts` (~400 lines)

**Modified Files:**
- `/src/routes/spaces/[space]/task/[taskId]/+page.svelte` (add export menu to header)

---

## Quality Gates

| Gate | Command | Pass Criteria |
|------|---------|---------------|
| TypeScript | `npm run check` | 0 errors |
| Lint | `npm run lint` | 0 new errors |
| DB Access | `npm run audit-db-access` | 0 snake_case violations |
| Build | `npm run build` | Successful |

---

## Testing Checklist

**Manual Testing:**
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

## Implementation Order

1. **US-001 first** (API endpoint) - Most independent, can be tested via curl
2. **US-002 next** (UI integration) - Depends on US-001, visible progress
3. **US-003 last** (Polish) - Refines both US-001 and US-002
