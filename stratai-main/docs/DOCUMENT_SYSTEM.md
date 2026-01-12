# Pages System - Implementation Specification

> **Status:** Approved for V1 Implementation
> **Created:** 2026-01-11
> **Last Updated:** 2026-01-12
>
> **Terminology Note:** This document covers **Pages** - rich-text content **created within** StratAI (meeting notes, proposals, etc.) that live at **Area-level**. For **uploaded documents** (PDFs, specs) that live at **Space-level** with Area-granular sharing, see `DOCUMENT_SHARING.md`.

---

## Executive Summary

StratAI's Pages System transforms the platform from "chat with AI" to "AI-powered workspace where knowledge lives." Users can create, edit, and manage pages that are deeply integrated with AI - not as a bolt-on feature, but as a native experience.

**Three Entry Points:**
1. **From Chat** - Conversation outcomes become documents (AI suggests when appropriate)
2. **Guided Creation** - AI guides user through creating specific document types
3. **Direct Create** - User opens editor directly, AI assists inline

**Key Differentiator:** Documents and conversations are peers. Content flows bidirectionally - chat becomes docs, docs can be discussed in chat, AI assists throughout.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [API Specification](#3-api-specification)
4. [Component Specifications](#4-component-specifications)
5. [UX Specifications](#5-ux-specifications)
6. [Implementation Phases](#6-implementation-phases)
7. [Test Cases](#7-test-cases)
8. [Acceptance Criteria](#8-acceptance-criteria)
9. [Future Considerations](#9-future-considerations)

---

## 1. Architecture Overview

### 1.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENTRY POINTS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │   FROM CHAT    │  │    GUIDED      │  │     DIRECT     │         │
│  │                │  │   CREATION     │  │     CREATE     │         │
│  │ "Save as doc?" │  │ AI asks what   │  │ New Document   │         │
│  │ button/suggest │  │ it needs       │  │ button         │         │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘         │
│          │                   │                   │                   │
│          └───────────────────┼───────────────────┘                   │
│                              ↓                                       │
│              ┌───────────────────────────┐                          │
│              │     DOCUMENT EDITOR       │                          │
│              │                           │                          │
│              │  ┌─────────────────────┐  │                          │
│              │  │      TipTap         │  │                          │
│              │  │   Rich Text Editor  │  │                          │
│              │  └─────────────────────┘  │                          │
│              │                           │                          │
│              │  ┌─────────────────────┐  │                          │
│              │  │   Chat Panel (↔)    │  │                          │
│              │  │   Collapsible       │  │                          │
│              │  └─────────────────────┘  │                          │
│              │                           │                          │
│              └─────────────┬─────────────┘                          │
│                            ↓                                        │
│              ┌───────────────────────────┐                          │
│              │      SAVE / EXPORT        │                          │
│              │                           │                          │
│              │  • Save to Area           │                          │
│              │  • Private / Shared       │                          │
│              │  • Download (MD/DOCX)     │                          │
│              └───────────────────────────┘                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Principles

1. **AI-Native** - AI is woven into the experience, not bolted on
2. **Bidirectional** - Documents ↔ Chat, content flows both ways
3. **Context-Aware** - Documents know their Space/Area/Task context
4. **Clean/Clear/Premium** - Word-doc quality feel, not a toy editor
5. **Light/Dark Mode** - First-class support for both themes

### 1.3 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Editor | TipTap (ProseMirror) | Rich text, extensible, Y.js compatible for future collab |
| Storage | PostgreSQL | Existing stack, JSON content storage |
| Export | `docx` library | Word export, pure JS |
| Styling | Tailwind CSS | Existing stack, CSS variables for theming |

### 1.4 File Structure

```
src/
├── lib/
│   ├── components/
│   │   └── documents/
│   │       ├── DocumentEditor.svelte       # Main editor wrapper
│   │       ├── EditorToolbar.svelte         # Formatting toolbar
│   │       ├── EditorChatPanel.svelte       # Collapsible chat
│   │       ├── DocumentList.svelte          # List view in Area
│   │       ├── DocumentCard.svelte          # Card in list
│   │       ├── CreateDocumentModal.svelte   # From-chat creation
│   │       ├── NewDocumentModal.svelte      # Direct create
│   │       ├── TemplateSelector.svelte      # Template picker
│   │       ├── DocumentHeader.svelte        # Title, metadata, actions
│   │       └── ExportMenu.svelte            # Download options
│   │
│   ├── stores/
│   │   └── documents.svelte.ts              # Document state
│   │
│   ├── types/
│   │   └── document.ts                      # Document types
│   │
│   └── server/
│       └── persistence/
│           ├── documents-postgres.ts        # CRUD operations
│           └── migrations/
│               └── 023-documents-system.sql # Schema
│
├── routes/
│   ├── spaces/[space]/[area]/
│   │   ├── documents/
│   │   │   ├── +page.svelte                 # Document list
│   │   │   ├── +page.server.ts
│   │   │   ├── [documentId]/
│   │   │   │   ├── +page.svelte             # Editor page
│   │   │   │   └── +page.server.ts
│   │   │   └── new/
│   │   │       ├── +page.svelte             # New document
│   │   │       └── +page.server.ts
│   │
│   └── api/
│       └── documents/
│           ├── +server.ts                   # List, create
│           ├── [id]/
│           │   └── +server.ts               # Get, update, delete
│           └── export/
│               └── [id]/
│                   └── +server.ts           # Export endpoints
```

---

## 2. Database Schema

### 2.1 Documents Table

```sql
-- Migration: 023-documents-system.sql

-- Document types enum
CREATE TYPE document_type AS ENUM (
    'general',
    'meeting_notes',
    'decision_record',
    'proposal',
    'project_brief',
    'weekly_update',
    'technical_spec'
);

-- Document visibility enum
CREATE TYPE document_visibility AS ENUM (
    'private',    -- Only creator can see
    'shared'      -- All Area members can see
);

-- Main documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership & Location
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- Optional task association
    created_by UUID NOT NULL REFERENCES users(id),

    -- Content
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',  -- TipTap JSON format
    content_text TEXT,  -- Plain text extraction for search
    document_type document_type NOT NULL DEFAULT 'general',

    -- Metadata
    visibility document_visibility NOT NULL DEFAULT 'private',
    source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    word_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_edited_at TIMESTAMPTZ,  -- User edit timestamp (vs system updates)

    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Document versions (for history)
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    content JSONB NOT NULL,
    content_text TEXT,
    title TEXT NOT NULL,
    word_count INTEGER DEFAULT 0,

    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Version metadata
    version_number INTEGER NOT NULL,
    change_summary TEXT  -- Optional description of changes
);

-- Document-conversation links (for bidirectional reference)
CREATE TABLE document_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Relationship type
    relationship TEXT NOT NULL CHECK (relationship IN ('source', 'discussion', 'reference')),
    -- 'source': conversation that created the document
    -- 'discussion': chat panel conversation about the document
    -- 'reference': document mentioned in conversation

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(document_id, conversation_id, relationship)
);

-- Indexes
CREATE INDEX idx_documents_space_id ON documents(space_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_area_id ON documents(area_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_task_id ON documents(task_id) WHERE deleted_at IS NULL AND task_id IS NOT NULL;
CREATE INDEX idx_documents_created_by ON documents(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_visibility ON documents(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_type ON documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_documents_search ON documents
    USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, '')))
    WHERE deleted_at IS NULL;

-- Version indexes
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);

-- Conversation link indexes
CREATE INDEX idx_document_conversations_document ON document_conversations(document_id);
CREATE INDEX idx_document_conversations_conversation ON document_conversations(conversation_id);

-- Updated_at trigger
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 Type Definitions

```typescript
// src/lib/types/document.ts

export type DocumentType =
    | 'general'
    | 'meeting_notes'
    | 'decision_record'
    | 'proposal'
    | 'project_brief'
    | 'weekly_update'
    | 'technical_spec';

export type DocumentVisibility = 'private' | 'shared';

export type DocumentConversationRelationship = 'source' | 'discussion' | 'reference';

export interface Document {
    id: string;
    spaceId: string;
    areaId: string;
    taskId: string | null;
    createdBy: string;

    title: string;
    content: TipTapContent;  // JSON structure
    contentText: string | null;
    documentType: DocumentType;

    visibility: DocumentVisibility;
    sourceConversationId: string | null;
    wordCount: number;

    createdAt: Date;
    updatedAt: Date;
    lastEditedAt: Date | null;
}

export interface DocumentVersion {
    id: string;
    documentId: string;
    content: TipTapContent;
    contentText: string | null;
    title: string;
    wordCount: number;
    createdBy: string;
    createdAt: Date;
    versionNumber: number;
    changeSummary: string | null;
}

export interface DocumentConversation {
    id: string;
    documentId: string;
    conversationId: string;
    relationship: DocumentConversationRelationship;
    createdAt: Date;
}

// TipTap content structure
export interface TipTapContent {
    type: 'doc';
    content: TipTapNode[];
}

export interface TipTapNode {
    type: string;
    attrs?: Record<string, unknown>;
    content?: TipTapNode[];
    marks?: TipTapMark[];
    text?: string;
}

export interface TipTapMark {
    type: string;
    attrs?: Record<string, unknown>;
}

// Document creation payloads
export interface CreateDocumentPayload {
    spaceId: string;
    areaId: string;
    taskId?: string;
    title: string;
    content?: TipTapContent;
    documentType: DocumentType;
    visibility?: DocumentVisibility;
    sourceConversationId?: string;
}

export interface UpdateDocumentPayload {
    title?: string;
    content?: TipTapContent;
    visibility?: DocumentVisibility;
    documentType?: DocumentType;
}

// Document list item (lighter weight for lists)
export interface DocumentListItem {
    id: string;
    title: string;
    documentType: DocumentType;
    visibility: DocumentVisibility;
    wordCount: number;
    createdBy: string;
    createdByName: string;  // Joined from users
    updatedAt: Date;
    lastEditedAt: Date | null;
}

// Document type metadata
export interface DocumentTypeInfo {
    type: DocumentType;
    label: string;
    description: string;
    icon: string;  // Lucide icon name
    template: TipTapContent | null;
    guidedQuestions?: GuidedQuestion[];
}

export interface GuidedQuestion {
    id: string;
    question: string;
    placeholder: string;
    required: boolean;
    multiline: boolean;
}
```

---

## 3. API Specification

### 3.1 Documents API

#### List Documents

```
GET /api/documents?areaId={areaId}&visibility={visibility}&type={type}
```

**Query Parameters:**
- `areaId` (required): Filter by area
- `visibility` (optional): 'private' | 'shared' | 'all' (default: 'all' for own + shared)
- `type` (optional): Filter by document type
- `search` (optional): Full-text search query
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
    "documents": [
        {
            "id": "uuid",
            "title": "Q1 Planning Meeting",
            "documentType": "meeting_notes",
            "visibility": "shared",
            "wordCount": 450,
            "createdBy": "uuid",
            "createdByName": "John Doe",
            "updatedAt": "2026-01-11T10:00:00Z",
            "lastEditedAt": "2026-01-11T09:45:00Z"
        }
    ],
    "total": 23,
    "hasMore": true
}
```

#### Create Document

```
POST /api/documents
```

**Request Body:**
```json
{
    "spaceId": "uuid",
    "areaId": "uuid",
    "taskId": "uuid",  // optional
    "title": "Document Title",
    "content": { /* TipTap JSON */ },
    "documentType": "meeting_notes",
    "visibility": "private",
    "sourceConversationId": "uuid"  // optional
}
```

**Response:** Created document object

#### Get Document

```
GET /api/documents/{id}
```

**Response:** Full document object including content

#### Update Document

```
PATCH /api/documents/{id}
```

**Request Body:**
```json
{
    "title": "Updated Title",
    "content": { /* TipTap JSON */ },
    "visibility": "shared"
}
```

**Response:** Updated document object

#### Delete Document

```
DELETE /api/documents/{id}
```

**Response:** `{ "success": true }`

### 3.2 Export API

#### Export as Markdown

```
GET /api/documents/export/{id}?format=markdown
```

**Response:**
```
Content-Type: text/markdown
Content-Disposition: attachment; filename="document-title.md"
```

#### Export as DOCX

```
GET /api/documents/export/{id}?format=docx
```

**Response:**
```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="document-title.docx"
```

### 3.3 Document Chat API

#### Create/Get Document Discussion

```
POST /api/documents/{id}/discussion
```

Creates or retrieves the discussion conversation for a document.

**Response:**
```json
{
    "conversationId": "uuid",
    "isNew": false
}
```

---

## 4. Component Specifications

### 4.1 DocumentEditor.svelte

The main editor wrapper component.

**Props:**
```typescript
interface DocumentEditorProps {
    document: Document | null;  // null for new document
    spaceId: string;
    areaId: string;
    taskId?: string;
    initialContent?: TipTapContent;
    initialType?: DocumentType;
    sourceConversationId?: string;
    onSave: (doc: Document) => void;
    onClose: () => void;
}
```

**Structure:**
```svelte
<div class="document-editor">
    <!-- Header: Title, type badge, actions -->
    <DocumentHeader
        bind:title
        documentType={type}
        onSave={handleSave}
        onExport={handleExport}
        isSaving={saving}
        hasUnsavedChanges={dirty}
    />

    <!-- Main content area -->
    <div class="editor-content">
        <!-- Editor -->
        <div class="editor-main" class:chat-open={chatPanelOpen}>
            <EditorToolbar editor={editor} />
            <div class="editor-body">
                <!-- TipTap editor instance -->
            </div>
        </div>

        <!-- Collapsible chat panel -->
        <EditorChatPanel
            bind:open={chatPanelOpen}
            documentId={document?.id}
            documentContent={content}
            onApplyChanges={handleApplyChanges}
        />
    </div>

    <!-- Footer: Word count, last saved, etc. -->
    <div class="editor-footer">
        <span>{wordCount} words</span>
        <span>{lastSaved}</span>
    </div>
</div>
```

**Key Behaviors:**
- Auto-save every 30 seconds if dirty
- Save on Cmd+S / Ctrl+S
- Warn on navigation if unsaved changes
- Create version snapshot on manual save

### 4.2 EditorToolbar.svelte

Formatting toolbar with clean, Word-like appearance.

**Features:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [B] [I] [U] [S] │ [H1] [H2] [H3] │ [•] [1.] [☐] │ ["] [</>] │ [🔗] [—] │
└─────────────────────────────────────────────────────────────────────────┘
  Bold Italic     Headings         Lists          Quote    Link  Divider
  Underline                        Bullet         Code
  Strike                           Number
                                   Checklist
```

**Toolbar Groups:**
1. **Text Formatting:** Bold, Italic, Underline, Strikethrough
2. **Headings:** H1, H2, H3
3. **Lists:** Bullet, Numbered, Checklist
4. **Blocks:** Quote, Code Block
5. **Insert:** Link, Horizontal Rule

**Keyboard Shortcuts (displayed in tooltips):**
- Bold: Cmd+B
- Italic: Cmd+I
- Underline: Cmd+U
- H1: Cmd+Alt+1
- H2: Cmd+Alt+2
- H3: Cmd+Alt+3
- Bullet List: Cmd+Shift+8
- Numbered List: Cmd+Shift+7
- Quote: Cmd+Shift+B
- Code Block: Cmd+Alt+C
- Link: Cmd+K

### 4.3 EditorChatPanel.svelte

Collapsible chat panel for document discussions.

**Props:**
```typescript
interface EditorChatPanelProps {
    open: boolean;
    documentId: string | null;
    documentContent: TipTapContent;
    onApplyChanges: (changes: DocumentChanges) => void;
}
```

**Structure:**
```svelte
<!-- Collapsed state: Just a button -->
{#if !open}
    <button class="chat-toggle" on:click={() => open = true}>
        <MessageSquare />
        <span>Chat about this document</span>
    </button>
{:else}
    <div class="chat-panel">
        <div class="chat-header">
            <h3>Document Chat</h3>
            <button on:click={() => open = false}>
                <X />
            </button>
        </div>

        <div class="chat-messages">
            <!-- Message list -->
        </div>

        <div class="chat-input">
            <ChatInput
                placeholder="Ask about this document..."
                onSend={handleSend}
            />
        </div>
    </div>
{/if}
```

**Chat Context:**
The chat automatically includes document context:
```
System: You are helping the user with a document titled "{title}"
of type "{type}". The current content is:

{content as markdown}

Help the user review, edit, or improve this document. When suggesting
changes, be specific about what to change and where.
```

**Apply Changes Flow:**
When AI suggests changes:
```svelte
{#if suggestion.hasChanges}
    <div class="suggestion-actions">
        <button on:click={() => applyChanges(suggestion)}>
            Apply Changes
        </button>
        <button on:click={() => showDiff(suggestion)}>
            Show Diff
        </button>
    </div>
{/if}
```

### 4.4 CreateDocumentModal.svelte

Modal for creating document from chat conversation.

**Props:**
```typescript
interface CreateDocumentModalProps {
    open: boolean;
    conversationId: string;
    conversationMessages: Message[];
    spaceId: string;
    areaId: string;
    onClose: () => void;
    onCreated: (document: Document) => void;
}
```

**UI Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│ Create Document                                        [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ What to capture:                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○ Summary & key points (Recommended)                    │ │
│ │ ○ Last AI response only                                 │ │
│ │ ○ Full conversation                                     │ │
│ │ ○ Let me specify...                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Document type:                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Decision Record ▾]  AI suggested based on conversation │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Title:                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Q1 Budget Allocation Decision                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Preview:                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ## Context                                              │ │
│ │ The team discussed Q1 budget allocation...              │ │
│ │                                                         │ │
│ │ ## Decision                                             │ │
│ │ We decided to allocate 60% to engineering...            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [Cancel]  [Create Document]    │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 NewDocumentModal.svelte

Modal for direct document creation.

**UI Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│ New Document                                           [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Choose a template:                                          │
│                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │     📄       │ │     📋       │ │     ⚖️       │         │
│ │   Blank      │ │   Meeting    │ │   Decision   │         │
│ │  Document    │ │    Notes     │ │    Record    │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │     📝       │ │     📊       │ │     🔧       │         │
│ │   Proposal   │ │   Project    │ │   Technical  │         │
│ │              │ │    Brief     │ │     Spec     │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                             │
│ Title:                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Untitled Document                                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                [Cancel]  [Create]           │
└─────────────────────────────────────────────────────────────┘
```

### 4.6 DocumentList.svelte

List view of documents in an Area.

**Props:**
```typescript
interface DocumentListProps {
    documents: DocumentListItem[];
    loading: boolean;
    onSelect: (doc: DocumentListItem) => void;
    onNewDocument: () => void;
}
```

**Structure:**
```svelte
<div class="document-list">
    <!-- Header -->
    <div class="list-header">
        <h2>Documents</h2>
        <button on:click={onNewDocument}>
            <Plus /> New Document
        </button>
    </div>

    <!-- Filters -->
    <div class="list-filters">
        <input type="search" placeholder="Search documents..." />
        <select bind:value={typeFilter}>
            <option value="">All types</option>
            {#each documentTypes as type}
                <option value={type.type}>{type.label}</option>
            {/each}
        </select>
    </div>

    <!-- Document grid/list -->
    <div class="documents-grid">
        {#each documents as doc}
            <DocumentCard {doc} on:click={() => onSelect(doc)} />
        {/each}
    </div>

    <!-- Empty state -->
    {#if documents.length === 0 && !loading}
        <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Create your first document to capture knowledge"
            action={{ label: "New Document", onClick: onNewDocument }}
        />
    {/if}
</div>
```

### 4.7 DocumentCard.svelte

Card component for document list.

**Structure:**
```svelte
<div class="document-card" on:click>
    <div class="card-icon">
        <svelte:component this={getIconForType(doc.documentType)} />
    </div>

    <div class="card-content">
        <h3 class="card-title">{doc.title}</h3>
        <div class="card-meta">
            <span class="doc-type">{getTypeLabel(doc.documentType)}</span>
            <span class="separator">•</span>
            <span class="word-count">{doc.wordCount} words</span>
        </div>
    </div>

    <div class="card-footer">
        <span class="updated">
            {formatRelativeTime(doc.lastEditedAt || doc.updatedAt)}
        </span>
        {#if doc.visibility === 'private'}
            <Lock size={14} />
        {/if}
    </div>
</div>
```

---

## 5. UX Specifications

### 5.1 Design System

#### Color Tokens (CSS Variables)

```css
/* Light Mode */
:root {
    /* Editor Background */
    --editor-bg: #ffffff;
    --editor-bg-secondary: #f8fafc;

    /* Text */
    --editor-text: #1e293b;
    --editor-text-secondary: #64748b;
    --editor-text-muted: #94a3b8;

    /* Borders */
    --editor-border: #e2e8f0;
    --editor-border-focus: #3b82f6;

    /* Toolbar */
    --toolbar-bg: #ffffff;
    --toolbar-border: #e2e8f0;
    --toolbar-button-hover: #f1f5f9;
    --toolbar-button-active: #e2e8f0;

    /* Chat Panel */
    --chat-panel-bg: #f8fafc;
    --chat-panel-border: #e2e8f0;

    /* Selection */
    --editor-selection: #dbeafe;

    /* Document Cards */
    --card-bg: #ffffff;
    --card-bg-hover: #f8fafc;
    --card-border: #e2e8f0;
}

/* Dark Mode */
:root.dark {
    /* Editor Background */
    --editor-bg: #1e1e1e;
    --editor-bg-secondary: #252526;

    /* Text */
    --editor-text: #e4e4e7;
    --editor-text-secondary: #a1a1aa;
    --editor-text-muted: #71717a;

    /* Borders */
    --editor-border: #3f3f46;
    --editor-border-focus: #3b82f6;

    /* Toolbar */
    --toolbar-bg: #252526;
    --toolbar-border: #3f3f46;
    --toolbar-button-hover: #3f3f46;
    --toolbar-button-active: #52525b;

    /* Chat Panel */
    --chat-panel-bg: #252526;
    --chat-panel-border: #3f3f46;

    /* Selection */
    --editor-selection: #1e3a5f;

    /* Document Cards */
    --card-bg: #252526;
    --card-bg-hover: #2d2d30;
    --card-border: #3f3f46;
}
```

#### Typography

```css
.editor-body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: var(--editor-text);
}

.editor-body h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-top: 2rem;
    margin-bottom: 1rem;
    line-height: 1.3;
}

.editor-body h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.75rem;
    margin-bottom: 0.75rem;
    line-height: 1.35;
}

.editor-body h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    line-height: 1.4;
}

.editor-body p {
    margin-bottom: 1rem;
}

.editor-body code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.9em;
    background: var(--editor-bg-secondary);
    padding: 0.2em 0.4em;
    border-radius: 4px;
}

.editor-body pre {
    background: var(--editor-bg-secondary);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
}

.editor-body blockquote {
    border-left: 4px solid var(--editor-border-focus);
    padding-left: 1rem;
    margin-left: 0;
    color: var(--editor-text-secondary);
    font-style: italic;
}
```

### 5.2 Editor Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Documents    │  Document Title Here                    [Save] │
├─────────────────────────────────────────────────────────────────────────┤
│ [B] [I] [U] │ [H1] [H2] [H3] │ [•] [1.] │ ["] [</>] │ [🔗]    [...] ↓  │
├─────────────────────────────────────────────────────────────┬───────────┤
│                                                             │           │
│                                                             │   Chat    │
│                                                             │   Panel   │
│                     EDITOR CONTENT                          │           │
│                                                             │  [    ]   │
│                     Lorem ipsum dolor sit amet,             │           │
│                     consectetur adipiscing elit.            │           │
│                                                             │           │
│                     ## Heading                              │           │
│                                                             │           │
│                     More content here...                    │           │
│                                                             │           │
│                                                             │           │
├─────────────────────────────────────────────────────────────┴───────────┤
│ 245 words  •  Last saved 2 minutes ago  •  Private          [Download ▾]│
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Responsive Behavior

**Desktop (>1024px):**
- Editor: Full layout with optional chat panel
- Chat panel: 350px width when open
- Toolbar: Full horizontal layout

**Tablet (768px - 1024px):**
- Editor: Full width
- Chat panel: Overlay from right (80% width)
- Toolbar: Condensed, overflow menu

**Mobile (<768px):**
- Editor: Full width, simplified toolbar
- Chat panel: Full-screen overlay
- Toolbar: Essential buttons only, expandable menu

### 5.4 Animations & Transitions

```css
/* Panel transitions */
.chat-panel {
    transition: width 200ms ease-out, opacity 150ms ease-out;
}

/* Toolbar button hover */
.toolbar-button {
    transition: background-color 100ms ease;
}

/* Card hover */
.document-card {
    transition: transform 150ms ease, box-shadow 150ms ease;
}

.document-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Save indicator */
.save-indicator {
    animation: pulse 1s ease infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
```

### 5.5 Loading States

**Document List Loading:**
```svelte
<div class="documents-grid">
    {#each Array(6) as _}
        <div class="document-card skeleton">
            <div class="skeleton-icon"></div>
            <div class="skeleton-content">
                <div class="skeleton-title"></div>
                <div class="skeleton-meta"></div>
            </div>
        </div>
    {/each}
</div>
```

**Editor Loading:**
```svelte
<div class="editor-loading">
    <Loader class="animate-spin" />
    <span>Loading document...</span>
</div>
```

**Save States:**
- Idle: "Saved" (subtle, gray)
- Saving: "Saving..." with spinner
- Saved: "Saved ✓" (brief green flash)
- Error: "Failed to save" (red, with retry)

### 5.6 Empty States

**No Documents:**
```svelte
<div class="empty-state">
    <FileText size={48} class="text-muted" />
    <h3>No documents yet</h3>
    <p>Create your first document to start capturing knowledge</p>
    <button class="btn-primary">
        <Plus /> New Document
    </button>
</div>
```

**New Document (Blank):**
```svelte
<div class="editor-placeholder">
    <p>Start typing, or use a slash command...</p>
    <div class="quick-actions">
        <button>/meeting-notes</button>
        <button>/decision</button>
        <button>/heading</button>
    </div>
</div>
```

---

## 6. Implementation Phases

### Phase 1: Foundation (1 context window)

**Objective:** Database schema, types, basic API, store skeleton

**Deliverables:**
1. Migration file `023-documents-system.sql`
2. Type definitions in `src/lib/types/document.ts`
3. Persistence layer `src/lib/server/persistence/documents-postgres.ts`
4. Basic API routes (CRUD)
5. Store skeleton `src/lib/stores/documents.svelte.ts`

**Implementation Notes for Agent:**

```markdown
## Phase 1 Instructions

### Step 1: Create Migration
File: `src/lib/server/persistence/migrations/023-documents-system.sql`
- Copy schema exactly from Section 2.1
- Ensure proper enum types
- Include all indexes

### Step 2: Create Types
File: `src/lib/types/document.ts`
- Copy types exactly from Section 2.2
- Export all types

### Step 3: Create Persistence Layer
File: `src/lib/server/persistence/documents-postgres.ts`

Required functions:
- `createDocument(payload: CreateDocumentPayload): Promise<Document>`
- `getDocument(id: string): Promise<Document | null>`
- `getDocumentsByArea(areaId: string, options: ListOptions): Promise<DocumentListItem[]>`
- `updateDocument(id: string, payload: UpdateDocumentPayload): Promise<Document>`
- `deleteDocument(id: string): Promise<void>` (soft delete)
- `createVersion(documentId: string, content: TipTapContent): Promise<DocumentVersion>`

Use existing patterns from `tasks-postgres.ts` for reference.

### Step 4: Create API Routes
Files:
- `src/routes/api/documents/+server.ts` (GET list, POST create)
- `src/routes/api/documents/[id]/+server.ts` (GET, PATCH, DELETE)

Follow existing API patterns:
- Use `getRequiredUser()` for auth
- Return proper error responses
- Validate payloads

### Step 5: Create Store
File: `src/lib/stores/documents.svelte.ts`

Using Svelte 5 runes pattern (see `chat.svelte.ts` for reference):
- `documents` state (Map<areaId, DocumentListItem[]>)
- `loadDocuments(areaId)` method
- `createDocument(payload)` method
- `updateDocument(id, payload)` method
- `deleteDocument(id)` method

### Verification
- [ ] Migration runs without errors
- [ ] Types compile without errors
- [ ] API routes return expected responses
- [ ] Store methods work correctly
```

**Test Cases (Phase 1):**
```typescript
// API Tests
describe('Documents API', () => {
    test('POST /api/documents creates document', async () => {
        const response = await fetch('/api/documents', {
            method: 'POST',
            body: JSON.stringify({
                spaceId: testSpaceId,
                areaId: testAreaId,
                title: 'Test Document',
                documentType: 'general',
                content: { type: 'doc', content: [] }
            })
        });
        expect(response.status).toBe(201);
        const doc = await response.json();
        expect(doc.id).toBeDefined();
        expect(doc.title).toBe('Test Document');
    });

    test('GET /api/documents returns area documents', async () => {
        const response = await fetch(`/api/documents?areaId=${testAreaId}`);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(Array.isArray(data.documents)).toBe(true);
    });

    test('PATCH /api/documents/[id] updates document', async () => {
        const response = await fetch(`/api/documents/${testDocId}`, {
            method: 'PATCH',
            body: JSON.stringify({ title: 'Updated Title' })
        });
        expect(response.status).toBe(200);
        const doc = await response.json();
        expect(doc.title).toBe('Updated Title');
    });

    test('DELETE /api/documents/[id] soft deletes', async () => {
        const response = await fetch(`/api/documents/${testDocId}`, {
            method: 'DELETE'
        });
        expect(response.status).toBe(200);

        // Verify not returned in list
        const listResponse = await fetch(`/api/documents?areaId=${testAreaId}`);
        const data = await listResponse.json();
        expect(data.documents.find(d => d.id === testDocId)).toBeUndefined();
    });

    test('Private documents only visible to creator', async () => {
        // Create private doc as user A
        // Try to fetch as user B - should not appear
    });
});
```

---

### Phase 2: TipTap Editor Core (1-2 context windows)

**Objective:** Set up TipTap, create editor component with full toolbar

**Deliverables:**
1. TipTap installation and configuration
2. `DocumentEditor.svelte` component
3. `EditorToolbar.svelte` component
4. `DocumentHeader.svelte` component
5. CSS styling for editor (light/dark mode)

**Implementation Notes for Agent:**

```markdown
## Phase 2 Instructions

### Step 1: Install TipTap
Run: `npm install @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-code-block-lowlight`

Also: `npm install lowlight`

### Step 2: Create Editor Component
File: `src/lib/components/documents/DocumentEditor.svelte`

Key implementation details:
- Use `onMount` to initialize TipTap editor
- Use `onDestroy` to clean up editor
- Bind content changes to update state
- Implement auto-save with debounce (30 seconds)
- Handle Cmd+S / Ctrl+S for manual save

TipTap setup:
```typescript
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';

const editor = new Editor({
    element: editorElement,
    extensions: [
        StarterKit.configure({
            codeBlock: false,  // Use CodeBlockLowlight instead
        }),
        Placeholder.configure({
            placeholder: 'Start typing...',
        }),
        Underline,
        Link.configure({
            openOnClick: false,
        }),
        TaskList,
        TaskItem.configure({
            nested: true,
        }),
        CodeBlockLowlight.configure({
            lowlight,
        }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
        content = editor.getJSON();
        dirty = true;
    },
});
```

### Step 3: Create Toolbar Component
File: `src/lib/components/documents/EditorToolbar.svelte`

Props: `{ editor: Editor }`

Implement toolbar groups as specified in Section 4.2.
Use Lucide icons for buttons.
Show keyboard shortcuts in tooltips.

Button implementation pattern:
```svelte
<button
    class="toolbar-btn"
    class:active={editor.isActive('bold')}
    on:click={() => editor.chain().focus().toggleBold().run()}
    title="Bold (Cmd+B)"
>
    <Bold size={18} />
</button>
```

### Step 4: Create Header Component
File: `src/lib/components/documents/DocumentHeader.svelte`

Features:
- Editable title (contenteditable or input)
- Document type badge
- Save button with state
- Export dropdown
- Back navigation

### Step 5: Add CSS Styles
File: Add to `src/app.css`

Copy CSS variables from Section 5.1.
Add editor-specific styles from Section 5.2.

CRITICAL: Ensure both light and dark mode work correctly.
Test by toggling theme and verifying all colors adapt.

### Verification
- [ ] Editor renders and accepts input
- [ ] All toolbar buttons work
- [ ] Keyboard shortcuts work
- [ ] Light mode looks correct
- [ ] Dark mode looks correct
- [ ] Content serializes to JSON correctly
```

**Test Cases (Phase 2):**
```typescript
describe('DocumentEditor', () => {
    test('renders with initial content', () => {
        render(DocumentEditor, {
            props: {
                initialContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] }
            }
        });
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    test('toolbar bold button toggles bold', async () => {
        // Select text, click bold, verify formatting
    });

    test('Cmd+S triggers save', async () => {
        const onSave = vi.fn();
        render(DocumentEditor, { props: { onSave } });
        await userEvent.keyboard('{Meta>}s{/Meta}');
        expect(onSave).toHaveBeenCalled();
    });

    test('auto-saves after 30 seconds of inactivity', async () => {
        vi.useFakeTimers();
        const onSave = vi.fn();
        render(DocumentEditor, { props: { onSave } });
        await userEvent.type(screen.getByRole('textbox'), 'New content');
        vi.advanceTimersByTime(30000);
        expect(onSave).toHaveBeenCalled();
    });

    test('dark mode applies correct styles', () => {
        document.documentElement.classList.add('dark');
        render(DocumentEditor);
        // Verify dark mode styles applied
    });
});
```

---

### Phase 3: Document Pages & Routing (1 context window)

**Objective:** Create document routes, list view, basic navigation

**Deliverables:**
1. Document list page (`/spaces/[space]/[area]/documents`)
2. Document edit page (`/spaces/[space]/[area]/documents/[documentId]`)
3. `DocumentList.svelte` component
4. `DocumentCard.svelte` component
5. Navigation integration

**Implementation Notes for Agent:**

```markdown
## Phase 3 Instructions

### Step 1: Create List Page
Files:
- `src/routes/spaces/[space]/[area]/documents/+page.svelte`
- `src/routes/spaces/[space]/[area]/documents/+page.server.ts`

Server load function:
```typescript
export const load: PageServerLoad = async ({ params, locals }) => {
    const user = await getRequiredUser(locals);
    const documents = await getDocumentsByArea(params.area, {
        userId: user.id,
        visibility: 'all'  // own private + all shared
    });
    return { documents };
};
```

Page component uses DocumentList component.

### Step 2: Create Document Edit Page
Files:
- `src/routes/spaces/[space]/[area]/documents/[documentId]/+page.svelte`
- `src/routes/spaces/[space]/[area]/documents/[documentId]/+page.server.ts`

Server load function fetches document by ID.
Page renders DocumentEditor with document data.

Handle "new" as special documentId for creating new documents:
```typescript
if (params.documentId === 'new') {
    return { document: null, isNew: true };
}
```

### Step 3: Create DocumentList Component
File: `src/lib/components/documents/DocumentList.svelte`

Implement as specified in Section 4.6.
Include:
- Search input (client-side filter for now)
- Type filter dropdown
- Document grid
- Empty state

### Step 4: Create DocumentCard Component
File: `src/lib/components/documents/DocumentCard.svelte`

Implement as specified in Section 4.7.
Include hover states, icons, metadata display.

### Step 5: Add Navigation
Update Area page to include Documents link in navigation/tabs.
Add "Documents" to area sidebar or tab bar.

### Verification
- [ ] Document list page loads correctly
- [ ] Documents display in grid
- [ ] Clicking document navigates to editor
- [ ] New document route works
- [ ] Search/filter works
- [ ] Empty state displays when no documents
```

**Test Cases (Phase 3):**
```typescript
describe('Document List Page', () => {
    test('displays documents for area', async () => {
        // Load page with mock documents
        // Verify documents render in grid
    });

    test('search filters documents', async () => {
        // Enter search query
        // Verify filtered results
    });

    test('type filter works', async () => {
        // Select type from dropdown
        // Verify only matching documents shown
    });

    test('clicking card navigates to document', async () => {
        // Click document card
        // Verify navigation to /documents/[id]
    });

    test('empty state shows when no documents', async () => {
        // Load page with empty documents
        // Verify empty state UI
    });
});

describe('Document Edit Page', () => {
    test('loads and displays document', async () => {
        // Navigate to document page
        // Verify content renders in editor
    });

    test('saving updates document', async () => {
        // Make changes
        // Save
        // Verify API called with correct data
    });

    test('new document route creates blank editor', async () => {
        // Navigate to /documents/new
        // Verify blank editor
    });
});
```

---

### Phase 4: Templates & Document Types (1 context window)

**Objective:** Template system, type-specific templates, selection UI

**Deliverables:**
1. Document type configuration with templates
2. `TemplateSelector.svelte` component
3. `NewDocumentModal.svelte` component
4. Template content for each document type

**Implementation Notes for Agent:**

```markdown
## Phase 4 Instructions

### Step 1: Create Template Configuration
File: `src/lib/config/document-templates.ts`

```typescript
import type { DocumentType, DocumentTypeInfo, TipTapContent } from '$lib/types/document';

export const documentTypes: Record<DocumentType, DocumentTypeInfo> = {
    general: {
        type: 'general',
        label: 'Blank Document',
        description: 'Start with a blank page',
        icon: 'FileText',
        template: null
    },
    meeting_notes: {
        type: 'meeting_notes',
        label: 'Meeting Notes',
        description: 'Capture meeting discussions and action items',
        icon: 'Users',
        template: {
            type: 'doc',
            content: [
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Meeting Notes' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Date: ' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Attendees: ' }] },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
                { type: 'bulletList', content: [
                    { type: 'listItem', content: [{ type: 'paragraph' }] }
                ]},
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Discussion' }] },
                { type: 'paragraph' },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Items' }] },
                { type: 'taskList', content: [
                    { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] }
                ]},
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Decisions' }] },
                { type: 'bulletList', content: [
                    { type: 'listItem', content: [{ type: 'paragraph' }] }
                ]}
            ]
        },
        guidedQuestions: [
            { id: 'date', question: 'When is/was this meeting?', placeholder: 'January 11, 2026', required: true, multiline: false },
            { id: 'attendees', question: 'Who attended?', placeholder: 'John, Sarah, Mike...', required: false, multiline: false },
            { id: 'purpose', question: 'What was the purpose of this meeting?', placeholder: 'Weekly sync, project kickoff...', required: true, multiline: false }
        ]
    },
    decision_record: {
        type: 'decision_record',
        label: 'Decision Record',
        description: 'Document a decision with context and rationale',
        icon: 'Scale',
        template: {
            type: 'doc',
            content: [
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Decision: [Title]' }] },
                { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'Status: [Proposed/Accepted/Deprecated]' }] },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Context' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'What is the issue that we\'re seeing that is motivating this decision?' }] },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Options Considered' }] },
                { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Option 1: [Name]' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Description, pros, cons...' }] },
                { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Option 2: [Name]' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Description, pros, cons...' }] },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Decision' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'What is the decision that was made?' }] },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Rationale' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Why did we make this decision?' }] },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Consequences' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'What are the resulting context and consequences?' }] }
            ]
        }
    },
    // ... continue for proposal, project_brief, weekly_update, technical_spec
};
```

### Step 2: Create TemplateSelector Component
File: `src/lib/components/documents/TemplateSelector.svelte`

Grid of template cards with icons.
Clicking selects template.
Show selected state.

### Step 3: Create NewDocumentModal Component
File: `src/lib/components/documents/NewDocumentModal.svelte`

Implement as specified in Section 4.5.
Two-step flow:
1. Select template
2. Enter title

On create, navigate to editor with template content.

### Step 4: Wire Up Modal
Add "New Document" button to document list that opens modal.
Handle creation and navigation.

### Verification
- [ ] All template types defined
- [ ] TemplateSelector shows all types
- [ ] Selecting template updates state
- [ ] Modal creates document with template content
- [ ] Navigation works after creation
```

**Test Cases (Phase 4):**
```typescript
describe('TemplateSelector', () => {
    test('displays all document types', () => {
        render(TemplateSelector);
        expect(screen.getByText('Blank Document')).toBeInTheDocument();
        expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
        expect(screen.getByText('Decision Record')).toBeInTheDocument();
    });

    test('clicking template selects it', async () => {
        const onSelect = vi.fn();
        render(TemplateSelector, { props: { onSelect } });
        await userEvent.click(screen.getByText('Meeting Notes'));
        expect(onSelect).toHaveBeenCalledWith('meeting_notes');
    });
});

describe('NewDocumentModal', () => {
    test('creates document with selected template', async () => {
        // Open modal
        // Select template
        // Enter title
        // Click create
        // Verify API call with template content
    });
});
```

---

### Phase 5: Chat → Document Flow (1 context window)

**Objective:** Create document from chat conversation

**Deliverables:**
1. "Create Document" button in chat
2. `CreateDocumentModal.svelte` component
3. Content extraction logic
4. Document type detection

**Implementation Notes for Agent:**

```markdown
## Phase 5 Instructions

### Step 1: Add Create Document Button
Modify chat message component to show "Create Document" action.
Location: After AI response, in message actions area.

```svelte
{#if message.role === 'assistant'}
    <button class="message-action" on:click={() => openCreateDocModal()}>
        <FileText size={16} />
        Create Document
    </button>
{/if}
```

Also add to chat header/menu as "Create document from conversation".

### Step 2: Create CreateDocumentModal Component
File: `src/lib/components/documents/CreateDocumentModal.svelte`

Implement as specified in Section 4.4.

Content extraction options:
- Summary & key points (default) - Send to AI for summarization
- Last AI response only - Take last assistant message
- Full conversation - Convert all messages to doc
- Let me specify - Text input for custom instructions

Type detection logic:
```typescript
function detectDocumentType(messages: Message[]): DocumentType {
    const text = messages.map(m => m.content).join(' ').toLowerCase();

    if (text.includes('decision') || text.includes('decided') || text.includes('option')) {
        return 'decision_record';
    }
    if (text.includes('meeting') || text.includes('attendees') || text.includes('agenda')) {
        return 'meeting_notes';
    }
    if (text.includes('proposal') || text.includes('propose') || text.includes('budget')) {
        return 'proposal';
    }
    // ... more heuristics

    return 'general';
}
```

### Step 3: Implement Content Extraction
For "Summary & key points", call AI endpoint:

```typescript
async function extractSummary(messages: Message[]): Promise<TipTapContent> {
    const response = await fetch('/api/documents/extract', {
        method: 'POST',
        body: JSON.stringify({
            messages,
            extractionType: 'summary',
            documentType: selectedType
        })
    });
    return response.json();
}
```

API endpoint uses AI to create structured content.

### Step 4: Create Extraction API Endpoint
File: `src/routes/api/documents/extract/+server.ts`

Uses LLM to:
1. Analyze conversation
2. Extract key information
3. Structure as document (based on type)
4. Return TipTap JSON format

System prompt for extraction:
```
You are a document extraction assistant. Given a conversation,
extract the key information and structure it as a {documentType}.

Output must be valid TipTap JSON format.
Include appropriate headings, bullet points, and formatting.
Focus on decisions, action items, and key conclusions.
```

### Step 5: Wire Up Flow
Modal creates document via API, then navigates to editor.
Pass `sourceConversationId` to link document to conversation.

### Verification
- [ ] "Create Document" button appears on AI messages
- [ ] Modal opens with conversation context
- [ ] Type detection suggests appropriate type
- [ ] Content extraction generates structured content
- [ ] Document created and linked to conversation
- [ ] Navigation to editor works
```

**Test Cases (Phase 5):**
```typescript
describe('CreateDocumentModal', () => {
    test('detects decision record from conversation', () => {
        const messages = [
            { role: 'user', content: 'What should we decide about the database?' },
            { role: 'assistant', content: 'I recommend Option A because...' }
        ];
        render(CreateDocumentModal, { props: { messages } });
        expect(screen.getByText('Decision Record')).toHaveAttribute('selected');
    });

    test('extracts summary from conversation', async () => {
        // Select summary option
        // Click create
        // Verify AI extraction called
        // Verify structured content returned
    });

    test('links document to source conversation', async () => {
        // Create document
        // Verify sourceConversationId set
    });
});
```

---

### Phase 6: AI Inline Suggestion (1 context window)

**Objective:** AI suggests document creation at appropriate moments

**Deliverables:**
1. Detection logic for document-worthy responses
2. Inline suggestion UI in chat
3. Connection to creation flow

**Implementation Notes for Agent:**

```markdown
## Phase 6 Instructions

### Step 1: Implement Detection Logic
File: `src/lib/utils/document-detection.ts`

```typescript
interface DocumentSuggestion {
    shouldSuggest: boolean;
    documentType: DocumentType;
    confidence: number;
    reason: string;
}

export function shouldSuggestDocument(
    message: Message,
    conversationHistory: Message[]
): DocumentSuggestion {
    // Only suggest for assistant messages
    if (message.role !== 'assistant') {
        return { shouldSuggest: false, documentType: 'general', confidence: 0, reason: '' };
    }

    const content = message.content.toLowerCase();
    const wordCount = message.content.split(/\s+/).length;

    // Minimum length threshold
    if (wordCount < 100) {
        return { shouldSuggest: false, documentType: 'general', confidence: 0, reason: 'too_short' };
    }

    // Decision indicators
    if (hasDecisionIndicators(content)) {
        return {
            shouldSuggest: true,
            documentType: 'decision_record',
            confidence: 0.8,
            reason: 'decision_detected'
        };
    }

    // Summary/conclusion indicators
    if (hasConclusionIndicators(content)) {
        return {
            shouldSuggest: true,
            documentType: 'general',
            confidence: 0.7,
            reason: 'conclusion_detected'
        };
    }

    // Action items
    if (hasActionItems(content)) {
        return {
            shouldSuggest: true,
            documentType: 'meeting_notes',
            confidence: 0.75,
            reason: 'action_items_detected'
        };
    }

    return { shouldSuggest: false, documentType: 'general', confidence: 0, reason: '' };
}

function hasDecisionIndicators(text: string): boolean {
    const indicators = [
        'i recommend', 'the decision is', 'we should go with',
        'based on this analysis', 'in conclusion', 'the best option',
        'my recommendation', 'therefore'
    ];
    return indicators.some(i => text.includes(i));
}

function hasConclusionIndicators(text: string): boolean {
    const indicators = [
        'in summary', 'to summarize', 'in conclusion',
        'the key points are', 'to recap', 'overall'
    ];
    return indicators.some(i => text.includes(i));
}

function hasActionItems(text: string): boolean {
    const indicators = [
        'action items', 'next steps', 'to do',
        'you should', 'tasks:', 'follow up'
    ];
    return indicators.some(i => text.includes(i));
}
```

### Step 2: Create Inline Suggestion Component
File: `src/lib/components/chat/DocumentSuggestion.svelte`

```svelte
<script lang="ts">
    import { FileText } from 'lucide-svelte';
    import type { DocumentType } from '$lib/types/document';

    export let documentType: DocumentType;
    export let onAccept: () => void;
    export let onDismiss: () => void;
</script>

<div class="document-suggestion">
    <FileText size={16} />
    <span>This looks like something worth keeping.</span>
    <button class="suggestion-action" on:click={onAccept}>
        Save as Document
    </button>
    <button class="suggestion-dismiss" on:click={onDismiss}>
        <X size={14} />
    </button>
</div>

<style>
    .document-suggestion {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--suggestion-bg);
        border-radius: 8px;
        font-size: 14px;
        color: var(--editor-text-secondary);
        margin-top: 12px;
    }

    .suggestion-action {
        color: var(--primary);
        font-weight: 500;
    }
</style>
```

### Step 3: Integrate into Chat Message
In the chat message component, after rendering assistant response:

```svelte
{#if message.role === 'assistant'}
    {#if documentSuggestion?.shouldSuggest && !dismissed}
        <DocumentSuggestion
            documentType={documentSuggestion.documentType}
            onAccept={() => openCreateDocModal(documentSuggestion.documentType)}
            onDismiss={() => dismissed = true}
        />
    {/if}
{/if}
```

### Step 4: Style for Light/Dark Mode
Add appropriate CSS variables for suggestion component.
Ensure it doesn't feel intrusive - subtle background, quiet colors.

### Verification
- [ ] Detection logic identifies appropriate messages
- [ ] Suggestion appears for document-worthy content
- [ ] Clicking "Save as Document" opens modal with correct type
- [ ] Dismiss button hides suggestion
- [ ] Styling works in light and dark mode
```

**Test Cases (Phase 6):**
```typescript
describe('Document Detection', () => {
    test('suggests decision record for decision content', () => {
        const message = {
            role: 'assistant',
            content: 'Based on this analysis, I recommend Option A. The key factors are cost savings and reduced complexity...'
        };
        const result = shouldSuggestDocument(message, []);
        expect(result.shouldSuggest).toBe(true);
        expect(result.documentType).toBe('decision_record');
    });

    test('does not suggest for short responses', () => {
        const message = {
            role: 'assistant',
            content: 'Sure, I can help with that.'
        };
        const result = shouldSuggestDocument(message, []);
        expect(result.shouldSuggest).toBe(false);
    });

    test('does not suggest for user messages', () => {
        const message = {
            role: 'user',
            content: 'Here is my detailed analysis...'
        };
        const result = shouldSuggestDocument(message, []);
        expect(result.shouldSuggest).toBe(false);
    });
});

describe('DocumentSuggestion Component', () => {
    test('renders suggestion with correct type', () => {
        render(DocumentSuggestion, { props: { documentType: 'decision_record' } });
        expect(screen.getByText('Save as Document')).toBeInTheDocument();
    });

    test('calls onAccept when clicked', async () => {
        const onAccept = vi.fn();
        render(DocumentSuggestion, { props: { onAccept } });
        await userEvent.click(screen.getByText('Save as Document'));
        expect(onAccept).toHaveBeenCalled();
    });
});
```

---

### Phase 7: Editor Chat Panel (1 context window)

**Objective:** Collapsible chat panel for document discussions

**Deliverables:**
1. `EditorChatPanel.svelte` component
2. Document context integration
3. Apply changes flow
4. Chat persistence (document_conversations link)

**Implementation Notes for Agent:**

```markdown
## Phase 7 Instructions

### Step 1: Create EditorChatPanel Component
File: `src/lib/components/documents/EditorChatPanel.svelte`

Structure as specified in Section 4.3.

Key features:
- Collapsed by default (toggle button visible)
- Opens as side panel (350px width)
- Has its own conversation context
- Can reference document content

### Step 2: Implement Document Context
When chat panel opens, create/get discussion conversation:

```typescript
async function getOrCreateDiscussion() {
    const response = await fetch(`/api/documents/${documentId}/discussion`, {
        method: 'POST'
    });
    const { conversationId } = await response.json();
    return conversationId;
}
```

System prompt for document chat:
```
You are helping the user work on a document titled "{title}".
Document type: {documentType}

Current content:
---
{contentAsMarkdown}
---

Help the user review, edit, or improve this document.
When suggesting changes, be specific:
- Quote the text to change
- Provide the new text
- Explain why

For spelling/grammar checks, list all issues found with corrections.
```

### Step 3: Implement Apply Changes Flow
When AI suggests changes, detect and offer to apply:

```typescript
interface SuggestedChange {
    original: string;
    replacement: string;
    reason: string;
}

function parseChangesFromResponse(response: string): SuggestedChange[] {
    // Parse AI response for change suggestions
    // Look for patterns like:
    // - "Change X to Y"
    // - Original: "..." → New: "..."
    // - Find and replace patterns
}
```

UI for applying changes:
```svelte
{#if suggestedChanges.length > 0}
    <div class="change-suggestions">
        <h4>Suggested Changes</h4>
        {#each suggestedChanges as change}
            <div class="change-item">
                <div class="original">{change.original}</div>
                <div class="arrow">→</div>
                <div class="replacement">{change.replacement}</div>
                <button on:click={() => applyChange(change)}>Apply</button>
            </div>
        {/each}
        <button on:click={applyAllChanges}>Apply All</button>
    </div>
{/if}
```

### Step 4: Wire Up to Editor
In DocumentEditor, include chat panel:

```svelte
<EditorChatPanel
    bind:open={chatPanelOpen}
    documentId={document?.id}
    documentTitle={title}
    documentType={type}
    documentContent={content}
    onApplyChanges={handleApplyChanges}
/>
```

`handleApplyChanges` updates editor content:
```typescript
function handleApplyChanges(changes: SuggestedChange[]) {
    // Apply changes to TipTap editor content
    // This is complex - may need to search and replace in JSON structure
    // Or convert to markdown, apply, convert back
}
```

### Step 5: Handle Panel Layout
CSS for panel layout:

```css
.editor-content {
    display: flex;
    height: 100%;
}

.editor-main {
    flex: 1;
    transition: margin-right 200ms ease;
}

.editor-main.chat-open {
    margin-right: 350px;
}

.chat-panel {
    position: fixed;
    right: 0;
    top: var(--header-height);
    bottom: 0;
    width: 350px;
    background: var(--chat-panel-bg);
    border-left: 1px solid var(--chat-panel-border);
}
```

### Verification
- [ ] Chat panel toggles open/closed
- [ ] Conversation persists between sessions
- [ ] AI has document context
- [ ] Suggested changes can be applied
- [ ] Layout works correctly
- [ ] Dark mode styling correct
```

**Test Cases (Phase 7):**
```typescript
describe('EditorChatPanel', () => {
    test('opens and closes correctly', async () => {
        render(EditorChatPanel, { props: { documentId: 'test' } });
        await userEvent.click(screen.getByText('Chat about this document'));
        expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    test('creates discussion conversation on first open', async () => {
        // Mock API
        // Open panel
        // Verify POST to /discussion endpoint
    });

    test('AI has document context', async () => {
        // Open panel
        // Send message
        // Verify system prompt includes document content
    });

    test('parses change suggestions from AI response', () => {
        const response = 'Change "recieve" to "receive" on line 5.';
        const changes = parseChangesFromResponse(response);
        expect(changes).toHaveLength(1);
        expect(changes[0].original).toBe('recieve');
        expect(changes[0].replacement).toBe('receive');
    });
});
```

---

### Phase 8: Guided Creation (1-2 context windows)

**Objective:** AI-guided document creation from intent

**Deliverables:**
1. Intent detection in chat
2. Guided Q&A flow
3. Draft generation
4. Integration with editor

**Implementation Notes for Agent:**

```markdown
## Phase 8 Instructions

### Step 1: Implement Intent Detection
File: `src/lib/utils/document-intent.ts`

```typescript
interface DocumentIntent {
    detected: boolean;
    documentType: DocumentType;
    confidence: number;
    topic: string;
}

export function detectDocumentIntent(userMessage: string): DocumentIntent {
    const lower = userMessage.toLowerCase();

    // Check for explicit intent
    const patterns = [
        { regex: /(?:write|create|draft|prepare)\s+(?:a|the)?\s*(proposal|brief|spec|notes|document)/i, type: null },
        { regex: /(?:meeting|notes|minutes)\s+for/i, type: 'meeting_notes' },
        { regex: /(?:proposal|rfp|pitch)\s+for/i, type: 'proposal' },
        { regex: /(?:decision|decide)\s+(?:about|on|whether)/i, type: 'decision_record' },
        { regex: /(?:project|product)\s+brief/i, type: 'project_brief' },
        { regex: /(?:technical|tech)\s+spec/i, type: 'technical_spec' },
    ];

    for (const pattern of patterns) {
        const match = lower.match(pattern.regex);
        if (match) {
            return {
                detected: true,
                documentType: pattern.type || detectTypeFromTopic(match[1]),
                confidence: 0.9,
                topic: extractTopic(userMessage)
            };
        }
    }

    return { detected: false, documentType: 'general', confidence: 0, topic: '' };
}
```

### Step 2: Modify Chat Handler for Guided Mode
When intent detected, AI enters guided mode:

In chat API handler:
```typescript
if (documentIntent.detected) {
    const guidedPrompt = buildGuidedPrompt(documentIntent);
    // Prepend guided system prompt
    // AI will ask questions to gather information
}
```

Guided system prompt:
```
The user wants to create a {documentType} about "{topic}".
Your job is to help them create an excellent document by gathering the right information.

For a {documentType}, you need:
{requiredFields based on documentType}

Ask questions conversationally, one or two at a time.
When you have enough information, say "I have everything I need. Ready to create your document?"
Then wait for confirmation before generating.
```

### Step 3: Create GuidedCreationBanner Component
File: `src/lib/components/documents/GuidedCreationBanner.svelte`

Shows at top of chat when in guided mode:
```svelte
<div class="guided-banner">
    <FileText />
    <span>Creating: {documentType} - "{topic}"</span>
    <button on:click={exitGuidedMode}>Cancel</button>
</div>
```

### Step 4: Handle Draft Generation
When AI says "Ready to create", detect and show action:

```svelte
{#if readyToGenerate}
    <div class="generate-action">
        <button on:click={generateDocument}>
            Generate Document
        </button>
    </div>
{/if}
```

Generate endpoint creates document from conversation:
```typescript
// POST /api/documents/generate
// Uses conversation history to create structured document
```

### Step 5: Navigate to Editor
After generation, navigate to editor with new document.
Document should link to source conversation.

### Verification
- [ ] Intent detected from user messages
- [ ] AI enters guided mode
- [ ] Questions gather required info
- [ ] "Ready to create" detected
- [ ] Document generated from conversation
- [ ] Navigation to editor works
```

**Test Cases (Phase 8):**
```typescript
describe('Document Intent Detection', () => {
    test('detects proposal intent', () => {
        const result = detectDocumentIntent('I need to write a proposal for the new client');
        expect(result.detected).toBe(true);
        expect(result.documentType).toBe('proposal');
    });

    test('detects meeting notes intent', () => {
        const result = detectDocumentIntent('Can you help me with meeting notes for the standup?');
        expect(result.detected).toBe(true);
        expect(result.documentType).toBe('meeting_notes');
    });

    test('no intent for general questions', () => {
        const result = detectDocumentIntent('What is the capital of France?');
        expect(result.detected).toBe(false);
    });
});

describe('Guided Creation Flow', () => {
    test('AI asks relevant questions for document type', async () => {
        // Send intent message
        // Verify AI asks type-specific questions
    });

    test('generates document when ready', async () => {
        // Complete Q&A
        // Click generate
        // Verify document created
    });
});
```

---

### Phase 9: Export & Polish (1 context window)

**Objective:** Export functionality, sharing, final polish

**Deliverables:**
1. Export as Markdown
2. Export as DOCX
3. Visibility toggle (private/shared)
4. Final UX polish

**Implementation Notes for Agent:**

```markdown
## Phase 9 Instructions

### Step 1: Create Export API Endpoints
File: `src/routes/api/documents/export/[id]/+server.ts`

```typescript
import { GET } from './+server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function GET({ params, url }) {
    const format = url.searchParams.get('format') || 'markdown';
    const document = await getDocument(params.id);

    if (format === 'markdown') {
        const markdown = convertToMarkdown(document.content);
        return new Response(markdown, {
            headers: {
                'Content-Type': 'text/markdown',
                'Content-Disposition': `attachment; filename="${slugify(document.title)}.md"`
            }
        });
    }

    if (format === 'docx') {
        const doc = convertToDocx(document);
        const buffer = await Packer.toBuffer(doc);
        return new Response(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${slugify(document.title)}.docx"`
            }
        });
    }
}

function convertToMarkdown(content: TipTapContent): string {
    // Convert TipTap JSON to Markdown
    // Handle headings, lists, code blocks, etc.
}

function convertToDocx(document: Document): Document {
    // Convert to docx format
    // Use docx library
}
```

### Step 2: Create ExportMenu Component
File: `src/lib/components/documents/ExportMenu.svelte`

```svelte
<script>
    export let documentId: string;

    let open = false;

    async function exportAs(format: string) {
        window.location.href = `/api/documents/export/${documentId}?format=${format}`;
        open = false;
    }
</script>

<div class="export-menu">
    <button on:click={() => open = !open}>
        Download <ChevronDown size={16} />
    </button>

    {#if open}
        <div class="dropdown">
            <button on:click={() => exportAs('markdown')}>
                <FileText size={16} /> Markdown (.md)
            </button>
            <button on:click={() => exportAs('docx')}>
                <FileIcon size={16} /> Word (.docx)
            </button>
        </div>
    {/if}
</div>
```

### Step 3: Implement Visibility Toggle
In DocumentHeader:

```svelte
<div class="visibility-toggle">
    <button
        class:active={visibility === 'private'}
        on:click={() => updateVisibility('private')}
    >
        <Lock size={16} /> Private
    </button>
    <button
        class:active={visibility === 'shared'}
        on:click={() => updateVisibility('shared')}
    >
        <Users size={16} /> Shared
    </button>
</div>
```

### Step 4: Final Polish Checklist
- [ ] Loading states for all async operations
- [ ] Error states with retry options
- [ ] Empty states with helpful actions
- [ ] Keyboard shortcuts working
- [ ] Focus management (modals, panels)
- [ ] Mobile responsive adjustments
- [ ] Light/dark mode verification
- [ ] Toast notifications for actions
- [ ] Unsaved changes warning

### Step 5: Add to Command Palette
Register document commands:
```typescript
// In commands.ts
{
    id: 'new-document',
    label: 'New Document',
    keywords: ['create', 'doc', 'write'],
    action: () => openNewDocumentModal()
},
{
    id: 'search-documents',
    label: 'Search Documents',
    keywords: ['find', 'doc'],
    action: () => focusDocumentSearch()
}
```

### Verification
- [ ] Markdown export downloads correctly
- [ ] DOCX export opens in Word
- [ ] Visibility toggle works
- [ ] All polish items checked
- [ ] Command palette integration works
```

**Test Cases (Phase 9):**
```typescript
describe('Export', () => {
    test('exports as markdown', async () => {
        const response = await fetch(`/api/documents/export/${testDocId}?format=markdown`);
        expect(response.headers.get('Content-Type')).toBe('text/markdown');
        const content = await response.text();
        expect(content).toContain('# '); // Has heading
    });

    test('exports as docx', async () => {
        const response = await fetch(`/api/documents/export/${testDocId}?format=docx`);
        expect(response.headers.get('Content-Type')).toContain('wordprocessingml');
    });
});

describe('Visibility', () => {
    test('toggles between private and shared', async () => {
        // Click shared
        // Verify API call
        // Verify UI updates
    });

    test('shared documents visible to area members', async () => {
        // Set shared
        // Login as different user
        // Verify document visible
    });
});
```

---

## 7. Test Cases Summary

### Unit Tests
| Area | Test Count | Priority |
|------|------------|----------|
| API CRUD | 10 | High |
| Document Detection | 8 | High |
| Intent Detection | 6 | Medium |
| Content Extraction | 6 | High |
| Export Conversion | 8 | Medium |
| Visibility Logic | 4 | High |

### Integration Tests
| Flow | Test Count | Priority |
|------|------------|----------|
| Create from Chat | 5 | High |
| Guided Creation | 6 | Medium |
| Editor Save/Load | 4 | High |
| Chat Panel | 5 | Medium |
| Export Download | 3 | Medium |

### E2E Tests
| Scenario | Priority |
|----------|----------|
| Full chat → document flow | High |
| Create, edit, save, reload | High |
| Export and verify content | Medium |
| Guided creation complete flow | Medium |
| Dark mode visual verification | Medium |

---

## 8. Acceptance Criteria

This section provides **clear, testable acceptance criteria** for each phase. The implementing agent MUST verify all criteria are met before considering a phase complete.

### 8.1 Phase 1: Foundation - Acceptance Criteria

#### Database Schema
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P1-DB-01 | Migration `023-documents-system.sql` runs without errors | Run migration, check for SQL errors |
| P1-DB-02 | `document_type` enum has all 7 types | Query: `SELECT enum_range(NULL::document_type)` |
| P1-DB-03 | `document_visibility` enum has 'private' and 'shared' | Query: `SELECT enum_range(NULL::document_visibility)` |
| P1-DB-04 | `documents` table created with all columns | `\d documents` in psql |
| P1-DB-05 | `document_versions` table created | `\d document_versions` in psql |
| P1-DB-06 | `document_conversations` table created | `\d document_conversations` in psql |
| P1-DB-07 | All indexes created | `\di` shows expected indexes |
| P1-DB-08 | Foreign keys enforce referential integrity | Try inserting invalid space_id - should fail |

#### Types
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P1-TY-01 | `Document` interface exported | `import { Document } from '$lib/types/document'` compiles |
| P1-TY-02 | `DocumentListItem` interface exported | Import and use in component without TS errors |
| P1-TY-03 | `CreateDocumentPayload` interface matches API needs | Matches POST body structure |
| P1-TY-04 | `TipTapContent` interface defined | Can type TipTap JSON without errors |
| P1-TY-05 | All enums have type safety | `documentType: 'invalid'` causes TS error |

#### API Endpoints
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P1-API-01 | `POST /api/documents` creates document | Returns 201 with document object |
| P1-API-02 | `GET /api/documents?areaId=X` returns documents | Returns array of documents for area |
| P1-API-03 | `GET /api/documents/[id]` returns single document | Returns document with content |
| P1-API-04 | `PATCH /api/documents/[id]` updates document | Returns updated document |
| P1-API-05 | `DELETE /api/documents/[id]` soft deletes | Document no longer appears in list |
| P1-API-06 | Unauthorized requests return 401 | Request without session returns 401 |
| P1-API-07 | Private documents not returned for other users | Create private doc as User A, query as User B - not visible |
| P1-API-08 | Shared documents visible to area members | Create shared doc, other area member can see it |

#### Store
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P1-ST-01 | `documentsStore` exports correctly | Import works without errors |
| P1-ST-02 | `loadDocuments(areaId)` fetches and caches | Call twice, second doesn't hit API |
| P1-ST-03 | `createDocument()` adds to store | New doc appears in state immediately |
| P1-ST-04 | `updateDocument()` updates cache | Changes reflected without re-fetch |
| P1-ST-05 | `deleteDocument()` removes from cache | Doc removed from state immediately |

**Phase 1 Complete When:** All P1-* criteria pass

---

### 8.2 Phase 2: TipTap Editor - Acceptance Criteria

#### Editor Setup
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P2-ED-01 | TipTap packages installed | `npm ls @tiptap/core` shows version |
| P2-ED-02 | Editor renders without errors | Component mounts, no console errors |
| P2-ED-03 | Editor accepts keyboard input | Type text, it appears |
| P2-ED-04 | Initial content loads | Pass content prop, renders correctly |
| P2-ED-05 | Content changes emit updates | `onUpdate` callback fires on edit |
| P2-ED-06 | Editor cleanup on unmount | No memory leaks, editor destroyed |

#### Toolbar Functionality
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P2-TB-01 | Bold button works | Select text → click Bold → text is bold |
| P2-TB-02 | Italic button works | Select text → click Italic → text is italic |
| P2-TB-03 | Underline button works | Select text → click Underline → text is underlined |
| P2-TB-04 | Strikethrough button works | Select text → click Strike → text has strikethrough |
| P2-TB-05 | H1 button creates heading | Click H1 → paragraph becomes heading 1 |
| P2-TB-06 | H2 button creates heading | Click H2 → paragraph becomes heading 2 |
| P2-TB-07 | H3 button creates heading | Click H3 → paragraph becomes heading 3 |
| P2-TB-08 | Bullet list button works | Click → creates bullet list |
| P2-TB-09 | Numbered list button works | Click → creates numbered list |
| P2-TB-10 | Checklist button works | Click → creates checkbox list |
| P2-TB-11 | Quote button works | Click → creates blockquote |
| P2-TB-12 | Code block button works | Click → creates code block |
| P2-TB-13 | Link button works | Opens link input, creates link |
| P2-TB-14 | Horizontal rule button works | Click → inserts horizontal line |
| P2-TB-15 | Active state shows on buttons | Bold text selected → Bold button highlighted |

#### Keyboard Shortcuts
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P2-KB-01 | Cmd+B toggles bold | Press shortcut with selection → toggles |
| P2-KB-02 | Cmd+I toggles italic | Press shortcut with selection → toggles |
| P2-KB-03 | Cmd+U toggles underline | Press shortcut with selection → toggles |
| P2-KB-04 | Cmd+S triggers save | Press shortcut → save callback fires |
| P2-KB-05 | Cmd+Alt+1 creates H1 | Press shortcut → creates heading |
| P2-KB-06 | Cmd+Alt+2 creates H2 | Press shortcut → creates heading |
| P2-KB-07 | Cmd+Alt+3 creates H3 | Press shortcut → creates heading |

#### Styling
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P2-ST-01 | Light mode colors correct | Visual inspection - matches spec |
| P2-ST-02 | Dark mode colors correct | Toggle theme, visual inspection |
| P2-ST-03 | Toolbar looks professional | No visual glitches, proper spacing |
| P2-ST-04 | Editor typography readable | Font size, line height match spec |
| P2-ST-05 | Code blocks styled correctly | Monospace font, background color |
| P2-ST-06 | Blockquotes styled correctly | Left border, italic text |
| P2-ST-07 | Lists properly indented | Bullet/number alignment correct |
| P2-ST-08 | Selection highlight visible | Selected text has visible highlight |

#### Auto-save
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P2-AS-01 | Auto-save triggers after 30s idle | Make change, wait 30s, verify save called |
| P2-AS-02 | Typing resets auto-save timer | Type continuously, save doesn't fire mid-typing |
| P2-AS-03 | Save indicator shows status | "Saving..." during save, "Saved" after |
| P2-AS-04 | Failed save shows error | Mock API failure, verify error message |

**Phase 2 Complete When:** All P2-* criteria pass

---

### 8.3 Phase 3: Document Pages - Acceptance Criteria

#### Document List Page
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P3-LP-01 | Page loads at `/spaces/[space]/[area]/documents` | Navigate to URL, page renders |
| P3-LP-02 | Documents displayed in grid | Multiple docs show in grid layout |
| P3-LP-03 | Document cards show correct info | Title, type, word count, date visible |
| P3-LP-04 | Search filters documents | Type query, only matching docs shown |
| P3-LP-05 | Type filter works | Select type, only that type shown |
| P3-LP-06 | Empty state when no documents | No docs → empty state UI appears |
| P3-LP-07 | Loading state while fetching | Brief loading indicator on load |
| P3-LP-08 | "New Document" button visible | Button present in header |
| P3-LP-09 | Clicking card navigates to document | Click → goes to `/documents/[id]` |
| P3-LP-10 | Private docs show lock icon | Private doc has lock indicator |

#### Document Edit Page
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P3-EP-01 | Page loads at `/spaces/[space]/[area]/documents/[id]` | Navigate to URL, page renders |
| P3-EP-02 | Document content loads in editor | Existing content appears |
| P3-EP-03 | Title is editable | Click title, can modify |
| P3-EP-04 | Save button works | Click save, API called |
| P3-EP-05 | Back navigation works | Click back, returns to list |
| P3-EP-06 | New document route works | `/documents/new` shows blank editor |
| P3-EP-07 | Unsaved changes warning | Try to navigate with changes → warning |
| P3-EP-08 | 404 for non-existent document | Invalid ID → 404 page |

#### Navigation Integration
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P3-NV-01 | Documents link in Area navigation | Tab or link visible in Area page |
| P3-NV-02 | Document count badge (optional) | Shows number of documents |
| P3-NV-03 | Breadcrumb shows correct path | Space > Area > Documents > Title |

**Phase 3 Complete When:** All P3-* criteria pass

---

### 8.4 Phase 4: Templates - Acceptance Criteria

#### Template Configuration
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P4-TC-01 | All 7 document types configured | `documentTypes` object has 7 entries |
| P4-TC-02 | Each type has label and description | No undefined labels |
| P4-TC-03 | Each type has icon | Icons render without errors |
| P4-TC-04 | Meeting Notes template has correct structure | Agenda, Discussion, Action Items, Decisions sections |
| P4-TC-05 | Decision Record template has correct structure | Context, Options, Decision, Rationale sections |
| P4-TC-06 | Blank document has no template | `template: null` |

#### Template Selector
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P4-TS-01 | Shows all template options | 7 cards visible |
| P4-TS-02 | Clicking selects template | Visual selected state |
| P4-TS-03 | Selected template passed to parent | `onSelect` callback with type |
| P4-TS-04 | Icons display correctly | Each card has correct icon |
| P4-TS-05 | Light/dark mode styling | Correct in both themes |

#### New Document Modal
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P4-NM-01 | Modal opens on "New Document" click | Button triggers modal |
| P4-NM-02 | Template selector visible | Can select template |
| P4-NM-03 | Title input visible | Can enter title |
| P4-NM-04 | Cancel closes modal | Modal disappears |
| P4-NM-05 | Create navigates to editor | Goes to new doc with template |
| P4-NM-06 | Template content pre-filled | Editor has template structure |
| P4-NM-07 | Escape key closes modal | Press Escape → modal closes |
| P4-NM-08 | Click outside closes modal | Click backdrop → modal closes |

**Phase 4 Complete When:** All P4-* criteria pass

---

### 8.5 Phase 5: Chat → Document - Acceptance Criteria

#### Create Document Button
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P5-CB-01 | Button appears on AI messages | Assistant messages have button |
| P5-CB-02 | Button not on user messages | User messages don't have button |
| P5-CB-03 | Clicking opens modal | Modal appears with context |
| P5-CB-04 | Also available in chat menu | Menu item "Create document from conversation" |

#### Create Document Modal
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P5-CM-01 | "What to capture" options visible | 4 radio options present |
| P5-CM-02 | Default is "Summary & key points" | First option selected |
| P5-CM-03 | Document type dropdown present | Can select type |
| P5-CM-04 | AI suggests type based on content | Type pre-selected intelligently |
| P5-CM-05 | Title input present | Can enter custom title |
| P5-CM-06 | AI suggests title | Title pre-filled based on content |
| P5-CM-07 | Preview shows extracted content | Preview panel visible |
| P5-CM-08 | Cancel closes modal | Modal disappears |
| P5-CM-09 | Create generates document | API called, document created |

#### Content Extraction
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P5-CE-01 | "Summary" calls AI extraction | API endpoint hit with messages |
| P5-CE-02 | "Last response" takes last message | Only assistant's last message used |
| P5-CE-03 | "Full conversation" converts all | All messages become doc content |
| P5-CE-04 | Custom instruction works | User text sent to extraction |
| P5-CE-05 | Extraction returns TipTap format | Valid JSON structure returned |
| P5-CE-06 | Loading state during extraction | Spinner while AI processes |

#### Document Creation
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P5-DC-01 | Document saved to database | Appears in list after creation |
| P5-DC-02 | Source conversation linked | `sourceConversationId` set |
| P5-DC-03 | Navigates to editor | Redirects to document edit page |
| P5-DC-04 | Correct Space/Area association | Document in current Area |

**Phase 5 Complete When:** All P5-* criteria pass

---

### 8.6 Phase 6: AI Inline Suggestion - Acceptance Criteria

#### Detection Logic
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P6-DL-01 | Detects decision content | Message with "I recommend" triggers |
| P6-DL-02 | Detects conclusion content | Message with "in summary" triggers |
| P6-DL-03 | Detects action items | Message with "next steps" triggers |
| P6-DL-04 | Ignores short responses | <100 words doesn't trigger |
| P6-DL-05 | Ignores user messages | Only assistant messages considered |
| P6-DL-06 | Returns correct document type | Decision → decision_record |
| P6-DL-07 | Returns confidence score | Number between 0-1 |

#### Suggestion UI
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P6-UI-01 | Suggestion appears after qualifying message | Visual element below message |
| P6-UI-02 | Suggestion has icon | FileText icon visible |
| P6-UI-03 | Text is clear | "This looks like something worth keeping" |
| P6-UI-04 | "Save as Document" button visible | Button present |
| P6-UI-05 | Dismiss button visible | X button present |
| P6-UI-06 | Clicking "Save" opens modal | CreateDocumentModal appears |
| P6-UI-07 | Clicking dismiss hides suggestion | Suggestion disappears |
| P6-UI-08 | Light mode styling correct | Matches design system |
| P6-UI-09 | Dark mode styling correct | Matches design system |
| P6-UI-10 | Suggestion not intrusive | Subtle, doesn't distract |

#### Integration
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P6-IN-01 | Modal receives correct document type | Pre-selected from detection |
| P6-IN-02 | Suggestion state persists in session | Dismissed stays dismissed |
| P6-IN-03 | Only one suggestion per message | Multiple detections don't stack |

**Phase 6 Complete When:** All P6-* criteria pass

---

### 8.7 Phase 7: Editor Chat Panel - Acceptance Criteria

#### Panel Toggle
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P7-PT-01 | Toggle button visible when closed | "Chat about this document" button |
| P7-PT-02 | Clicking toggle opens panel | Panel slides in from right |
| P7-PT-03 | Close button visible when open | X button in panel header |
| P7-PT-04 | Clicking close hides panel | Panel slides out |
| P7-PT-05 | Panel width is 350px | Measure in devtools |
| P7-PT-06 | Editor content adjusts | Main content shrinks to fit |
| P7-PT-07 | Animation is smooth | 200ms transition |

#### Chat Functionality
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P7-CF-01 | Input field present | Can type message |
| P7-CF-02 | Send button works | Message sent on click |
| P7-CF-03 | Enter key sends message | Press Enter → sends |
| P7-CF-04 | Messages appear in panel | Sent/received messages visible |
| P7-CF-05 | AI has document context | AI knows document content |
| P7-CF-06 | Conversation persists | Re-open panel, history remains |
| P7-CF-07 | Loading state while AI responds | Indicator during response |

#### Document Context
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P7-DC-01 | Discussion conversation created | document_conversations entry exists |
| P7-DC-02 | Relationship is 'discussion' | Correct relationship type |
| P7-DC-03 | AI can quote document content | AI references specific text |
| P7-DC-04 | "Review spelling" works | AI lists spelling errors |
| P7-DC-05 | "Make more formal" works | AI suggests formal revisions |

#### Apply Changes
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P7-AC-01 | Changes detected in AI response | Suggestions identified |
| P7-AC-02 | "Apply Changes" button appears | Button visible when changes suggested |
| P7-AC-03 | Clicking apply updates document | Editor content changes |
| P7-AC-04 | "Apply All" applies all changes | Multiple changes applied at once |
| P7-AC-05 | Changes can be previewed | Diff or preview available |

**Phase 7 Complete When:** All P7-* criteria pass

---

### 8.8 Phase 8: Guided Creation - Acceptance Criteria

#### Intent Detection
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P8-ID-01 | Proposal intent detected | "Write a proposal" triggers |
| P8-ID-02 | Meeting notes intent detected | "Meeting notes for..." triggers |
| P8-ID-03 | Decision intent detected | "Document this decision" triggers |
| P8-ID-04 | Topic extracted | Relevant topic identified |
| P8-ID-05 | Non-document queries ignored | "What is X?" doesn't trigger |

#### Guided Flow
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P8-GF-01 | Banner appears in guided mode | "Creating: [type]" banner visible |
| P8-GF-02 | AI asks relevant questions | Questions match document type |
| P8-GF-03 | Questions are conversational | Not a form, natural dialogue |
| P8-GF-04 | AI confirms when ready | "I have everything I need" message |
| P8-GF-05 | Generate button appears | Button visible after confirmation |
| P8-GF-06 | Cancel exits guided mode | Returns to normal chat |

#### Document Generation
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P8-DG-01 | Document generated from Q&A | Content reflects conversation |
| P8-DG-02 | Correct document type | Type matches intent |
| P8-DG-03 | Structure matches template | Appropriate sections present |
| P8-DG-04 | Navigates to editor | Redirects after generation |
| P8-DG-05 | Source conversation linked | Can trace back to chat |

**Phase 8 Complete When:** All P8-* criteria pass

---

### 8.9 Phase 9: Export & Polish - Acceptance Criteria

#### Markdown Export
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P9-MD-01 | Export endpoint works | GET returns 200 |
| P9-MD-02 | Content-Type is text/markdown | Check response header |
| P9-MD-03 | Filename includes doc title | Content-Disposition header |
| P9-MD-04 | Headings converted correctly | # for H1, ## for H2, etc. |
| P9-MD-05 | Lists converted correctly | - for bullets, 1. for numbered |
| P9-MD-06 | Code blocks preserved | ``` formatting intact |
| P9-MD-07 | Links preserved | [text](url) format |
| P9-MD-08 | File downloads | Browser downloads file |

#### DOCX Export
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P9-DX-01 | Export endpoint works | GET returns 200 |
| P9-DX-02 | Content-Type is correct | wordprocessingml MIME type |
| P9-DX-03 | File opens in Word | Can open in MS Word |
| P9-DX-04 | Headings styled correctly | Word heading styles applied |
| P9-DX-05 | Lists rendered correctly | Proper list formatting |
| P9-DX-06 | Basic formatting preserved | Bold, italic work |

#### Export Menu
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P9-EM-01 | Download button visible | Button in document header |
| P9-EM-02 | Dropdown shows options | Markdown and Word options |
| P9-EM-03 | Clicking option downloads | File downloads immediately |
| P9-EM-04 | Menu closes after selection | Dropdown closes |

#### Visibility Toggle
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P9-VT-01 | Toggle visible in header | Private/Shared buttons |
| P9-VT-02 | Current state highlighted | Active state visible |
| P9-VT-03 | Clicking updates visibility | API called, state changes |
| P9-VT-04 | Private docs hidden from others | Other users can't see |
| P9-VT-05 | Shared docs visible to Area | Area members can see |

#### Final Polish
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P9-FP-01 | All loading states present | No blank screens during load |
| P9-FP-02 | All error states present | Errors show helpful messages |
| P9-FP-03 | All empty states present | Empty lists have guidance |
| P9-FP-04 | Toast notifications work | Success/error toasts appear |
| P9-FP-05 | Focus management correct | Modals trap focus |
| P9-FP-06 | Keyboard navigation works | Tab order logical |
| P9-FP-07 | Light mode complete | All components styled |
| P9-FP-08 | Dark mode complete | All components styled |
| P9-FP-09 | No console errors | Clean console in production |
| P9-FP-10 | No TypeScript errors | `npm run check` passes |

#### Command Palette Integration
| ID | Criterion | How to Verify |
|----|-----------|---------------|
| P9-CP-01 | "New Document" command exists | Cmd+K → type "new doc" |
| P9-CP-02 | Command opens modal | Selecting executes correctly |
| P9-CP-03 | Documents searchable | Search finds documents |

**Phase 9 Complete When:** All P9-* criteria pass, ALL previous phases still pass

---

### 8.10 Final Acceptance Criteria

Before the feature is considered **complete and ready for release**, the following must be true:

#### Functional Completeness
| ID | Criterion |
|----|-----------|
| FA-01 | All three entry points work (From Chat, Guided, Direct) |
| FA-02 | Documents can be created, edited, saved, deleted |
| FA-03 | Editor supports all specified formatting options |
| FA-04 | Chat panel enables document discussions |
| FA-05 | Export produces valid MD and DOCX files |
| FA-06 | Privacy (private/shared) works correctly |
| FA-07 | AI suggestions appear at appropriate times |

#### Quality
| ID | Criterion |
|----|-----------|
| QA-01 | No TypeScript errors (`npm run check` passes) |
| QA-02 | No console errors in normal usage |
| QA-03 | Light mode visually complete and polished |
| QA-04 | Dark mode visually complete and polished |
| QA-05 | All user actions have appropriate feedback |
| QA-06 | Error states are helpful, not cryptic |

#### Performance
| ID | Criterion |
|----|-----------|
| PF-01 | Document list loads in <500ms |
| PF-02 | Editor initializes in <300ms |
| PF-03 | Save completes in <1s |
| PF-04 | No UI jank during typing |

#### User Experience
| ID | Criterion |
|----|-----------|
| UX-01 | Flows feel intuitive, no confusion |
| UX-02 | Editor feels like a "real" document editor |
| UX-03 | AI integration feels native, not bolted on |
| UX-04 | Consistent with rest of StratAI design |

---

## 9. Future Considerations

### V2 Features (Not in Scope)
- Real-time collaboration (Y.js)
- Comments and annotations
- Version history UI
- PDF export
- Document templates marketplace
- Cross-area sharing
- Public document links
- Document analytics

### Technical Debt to Monitor
- TipTap JSON schema versioning
- Large document performance
- Search indexing strategy
- Mobile editor experience

### Integration Points
- Confluence import (V2)
- Google Docs sync (V2)
- Notion import (V2)
- Calendar integration for meeting notes (V2)

---

## Appendix A: TipTap Extensions List

```typescript
// Required extensions for V1
const extensions = [
    StarterKit,           // Basic formatting
    Placeholder,          // Placeholder text
    Underline,            // Underline support
    Link,                 // Links
    TaskList,             // Checkboxes
    TaskItem,             // Checkbox items
    CodeBlockLowlight,    // Syntax highlighting
];

// Optional for V1, recommended
const optionalExtensions = [
    CharacterCount,       // Word/char count
    Typography,           // Smart quotes
    TextAlign,            // Text alignment
];

// Future (V2)
const futureExtensions = [
    Collaboration,        // Y.js real-time
    CollaborationCursor,  // User cursors
    Comments,             // Annotations
    Image,                // Image support
    Table,                // Tables
];
```

---

## Appendix B: CSS Class Reference

```css
/* Document Editor */
.document-editor { }
.editor-content { }
.editor-main { }
.editor-body { }
.editor-footer { }

/* Toolbar */
.editor-toolbar { }
.toolbar-group { }
.toolbar-btn { }
.toolbar-btn.active { }
.toolbar-divider { }

/* Chat Panel */
.chat-panel { }
.chat-panel-toggle { }
.chat-header { }
.chat-messages { }
.chat-input { }

/* Document List */
.document-list { }
.list-header { }
.list-filters { }
.documents-grid { }

/* Document Card */
.document-card { }
.card-icon { }
.card-content { }
.card-title { }
.card-meta { }
.card-footer { }

/* Modals */
.create-document-modal { }
.new-document-modal { }
.template-selector { }
.template-card { }

/* States */
.skeleton { }
.empty-state { }
.loading { }
.error { }
```

---

*Document Version: 1.0*
*Implementation Target: V1 Release*
