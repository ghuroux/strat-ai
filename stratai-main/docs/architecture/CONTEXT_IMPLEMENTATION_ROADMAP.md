# Context Management Implementation Roadmap

> **Document Purpose:** Actionable implementation guide for StratAI's context management vision. This document provides concrete phases, deliverables, and success criteria for development sessions.
>
> **Created:** January 2026
> **Status:** Active Development Guide
> **Owner:** Engineering Team

---

## Quick Links

| Document | Purpose | When to Reference |
|----------|---------|-------------------|
| [CONTEXT_STRATEGY.md](./CONTEXT_STRATEGY.md) | Strategic vision, research foundations, WHAT to store | Understanding the "why", design decisions |
| [context-loading-architecture.md](./context-loading-architecture.md) | Technical architecture, HOW to load context | Implementing retrieval, tool definitions |
| [AI_RETRIEVAL_ARCHITECTURE.md](./AI_RETRIEVAL_ARCHITECTURE.md) | Retrieval mechanics, query patterns | Building search tools, graph traversal |
| [ENTITY_MODEL.md](../database/ENTITY_MODEL.md) | Data model, schema definitions | Database work, relationship modeling |
| [SCHEMA_REFERENCE.md](../database/SCHEMA_REFERENCE.md) | Current table definitions | Quick schema lookup |

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Prior Art & Learnings](#2-prior-art--learnings)
3. [Phase 1: Memory Transparency & Persistence](#3-phase-1-memory-transparency--persistence)
4. [Phase 2: Entity Extraction & Relationships](#4-phase-2-entity-extraction--relationships)
5. [Phase 3: Active Memory Management](#5-phase-3-active-memory-management)
6. [Phase 4: Organizational Intelligence](#6-phase-4-organizational-intelligence)
7. [Technical Architecture Decisions](#7-technical-architecture-decisions)
8. [Risk Mitigation](#8-risk-mitigation)
9. [Dependencies Map](#9-dependencies-map)
10. [Feature Dependencies: What Context Enables](#10-feature-dependencies-what-context-enables)

---

## 1. Current State Analysis

### What Exists Today

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Conversation Persistence** | ✅ Implemented | `conversations` table + API | PostgreSQL primary, localStorage cache |
| **Area Notes** | ✅ Implemented | `areas.notes` column | User-editable markdown context |
| **Document Activation** | ✅ Implemented | `areas.context_document_ids` | Per-area document selection |
| **Context Transparency** | ✅ Implemented | `usedContext` in messages | Shows what context was used |
| **Image Documents** | ✅ Implemented | `documents.content_type` | Vision support with AI descriptions |
| **Task Context** | ✅ Implemented | Tasks linked to conversations | Task-aware responses |

### What's Missing (Gaps)

| Gap | Impact | Priority |
|-----|--------|----------|
| **Server-side message persistence** | localStorage quota exceeded | 🔴 Critical |
| **Entity relationships table** | No graph queries possible | 🟡 High |
| **Memory/facts extraction** | Context doesn't learn from conversations | 🟡 High |
| **Confidence scoring** | All context treated equally | 🟢 Medium |
| **Memory decay** | Old context never expires | 🟢 Medium |
| **Knowledge propagation** | No org-level learning | 🔵 Future |

### Technical Debt

| Issue | Impact | Addressed In |
|-------|--------|--------------|
| localStorage quota errors | Users losing conversation data | Phase 1 |
| No conversation search | Can't find past discussions | Phase 1 |
| Context size unbounded | Token costs grow unbounded | Phase 3 |

---

## 2. Prior Art & Learnings

### Clawd.bot Analysis (January 2026)

[Clawd](https://clawd.bot) is a personal AI assistant with sophisticated context management. Key patterns worth learning from:

#### What Clawd Does Well

| Pattern | How It Works | StratAI Applicability |
|---------|--------------|----------------------|
| **Memory Classification** | W (working), B (behavioral), O (observational), S (semantic) types | Already handled by hierarchy (Area → Space → Org) |
| **Confidence Scoring** | 0-100% confidence with decay over time | Adopt: Add confidence to extracted facts |
| **User-Editable Memory** | Direct Markdown file editing | Adopt: "Memory Editor" UX in Areas |
| **Weekly Digests** | Automatic compression of old context | Adopt: Helps with token limits |
| **Entity Tagging** | @Peter, @ProjectX in content | Already planned: `entity_relationships` table |
| **MemGPT-Style Retrieval** | Small core + tools for rest | Already planned: 3-tier hybrid loading |

#### Where StratAI Goes Further

| Capability | Clawd | StratAI |
|------------|-------|---------|
| **Scope** | Personal only | Organizational (network effects) |
| **Hierarchy** | Flat | Space → Area → Task (research-backed) |
| **Temporal** | Basic timestamps | Bi-temporal (compliance-ready) |
| **Sharing** | N/A | Knowledge propagation model |
| **Graph** | Basic @mentions | Full relationship traversal |

#### Key Takeaway

> **Clawd's simplicity is a UX lesson, not an architecture lesson.** StratAI's architecture is more sophisticated (correctly so for enterprise), but we should borrow Clawd's UX simplicity where appropriate—especially the immediate feedback of "edit a file and see results."

---

## 3. Phase 1: Memory Transparency & Persistence

> **Goal:** Users can see what AI knows, all data persists reliably on server

### 3.1 Overview

| Aspect | Detail |
|--------|--------|
| **Primary Focus** | Server-side persistence, user visibility |
| **Prerequisite For** | All other phases |
| **Key Risk** | localStorage quota exceeded (currently hitting users) |
| **Estimated Effort** | 2-3 weeks |

### 3.2 Deliverables

#### D1.1: Server-Side Message Persistence

**Current State:** Messages stored in localStorage with PostgreSQL sync (but localStorage quota exceeded for heavy users)

**Target State:** Messages primarily in PostgreSQL, localStorage as read-through cache only

**Implementation:**

```typescript
// New: messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    thinking TEXT,  -- For extended thinking models
    metadata JSONB DEFAULT '{}',  -- usedContext, model, tokens, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes for common queries
    CONSTRAINT messages_conversation_created_idx UNIQUE (conversation_id, created_at)
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
```

**Acceptance Criteria:**
- [ ] Messages table created with migration
- [ ] API endpoints: `GET/POST /api/conversations/[id]/messages`
- [ ] Chat store loads from API, falls back to localStorage
- [ ] localStorage used only for offline/instant-load scenarios
- [ ] Quota exceeded errors eliminated

**Files to Modify:**
- `src/lib/server/persistence/migrations/` - New migration
- `src/lib/server/persistence/messages-postgres.ts` - New repository
- `src/routes/api/conversations/[id]/messages/+server.ts` - New endpoints
- `src/lib/stores/chat.svelte.ts` - Update to API-first

---

#### D1.2: "What AI Knows" Panel

**Current State:** Context transparency shows what was used after the fact

**Target State:** Users can preview what AI will know before sending

**Implementation:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  💡 What AI Knows (Context Panel)                              [Edit] [Refresh] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  📝 AREA NOTES                                               Last edited: 2d ago │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ "This project uses React 18 with TypeScript. We prefer functional         ││
│  │  components with hooks. Testing via Vitest."                               ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  📄 ACTIVE DOCUMENTS (3)                                         ~2,400 tokens  │
│  ├─ requirements.pdf           [Summary] [Deactivate]                           │
│  ├─ architecture-diagram.png   [Description] [Deactivate]                       │
│  └─ api-spec.md                [Summary] [Deactivate]                           │
│                                                                                  │
│  ✅ LINKED TASKS (1)                                             ~150 tokens    │
│  └─ TASK-42: Implement user auth                                                │
│                                                                                  │
│  💬 RECENT CONTEXT                                               ~800 tokens    │
│  └─ Last 3 messages from current conversation                                   │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  📊 Total Context: ~3,350 tokens | Budget: 8,000 tokens                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Panel accessible from Area chat view (toggle button)
- [ ] Shows Area notes with edit capability
- [ ] Lists active documents with summaries/descriptions
- [ ] Shows linked tasks
- [ ] Displays token estimate for total context
- [ ] Changes reflect immediately in next message

**Files to Create/Modify:**
- `src/lib/components/areas/panels/ContextPreviewPanel.svelte` - New component
- `src/routes/spaces/[space]/[area]/+page.svelte` - Add toggle

---

#### D1.3: Conversation Search

**Current State:** No way to search past conversations

**Target State:** Full-text search across user's conversations

**Implementation:**

```sql
-- Add full-text search index
ALTER TABLE messages ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);

-- Search query
SELECT DISTINCT c.id, c.title, c.updated_at,
       ts_rank(m.search_vector, query) as rank
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
CROSS JOIN to_tsquery('english', $1) query
WHERE c.user_id = $2
  AND m.search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

**Acceptance Criteria:**
- [ ] Search input in conversation list
- [ ] Results show matching conversations with snippets
- [ ] Clicking result opens conversation
- [ ] Search is fast (<200ms for typical queries)

**Files to Create/Modify:**
- `src/routes/api/conversations/search/+server.ts` - New endpoint
- `src/lib/components/chat/ConversationSearch.svelte` - New component

---

### 3.3 Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Quota Errors** | 0 per week | Error tracking |
| **Message Load Time** | <500ms for 100 messages | Performance monitoring |
| **Context Visibility** | 100% of active context visible | Manual verification |
| **Search Latency** | <200ms | API response time |

### 3.4 Technical Notes

**localStorage Migration Strategy:**
1. On app load, check localStorage for conversations not in DB
2. Background sync to migrate existing data
3. After successful sync, clear localStorage entry
4. Keep localStorage as 5-conversation LRU cache for instant loads

**Token Estimation:**
- Use `cl100k_base` tokenizer (same as Claude)
- Cache estimates per document/note (invalidate on change)
- Show "~" prefix to indicate estimation

---

## 4. Phase 2: Entity Extraction & Relationships

> **Goal:** Build the knowledge graph foundation for intelligent retrieval

### 4.1 Overview

| Aspect | Detail |
|--------|--------|
| **Primary Focus** | Extract entities, build relationship graph |
| **Prerequisite For** | Phase 3 (Active Memory), Phase 4 (Org Intelligence) |
| **Key Dependency** | Phase 1 (server-side messages) |
| **Estimated Effort** | 3-4 weeks |

### 4.2 Deliverables

#### D2.1: Entity Relationships Table

**Implementation:**

```sql
-- From ENTITY_MODEL.md Section 9
CREATE TABLE entity_relationships (
    id TEXT PRIMARY KEY DEFAULT ('er_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),

    -- Source entity (polymorphic)
    source_type TEXT NOT NULL,  -- 'user', 'task', 'meeting', 'page', 'memory'
    source_id TEXT NOT NULL,

    -- Target entity (polymorphic)
    target_type TEXT NOT NULL,  -- 'user', 'task', 'meeting', 'page', 'decision', 'topic'
    target_id TEXT NOT NULL,

    -- Relationship metadata
    relationship TEXT NOT NULL,  -- 'authored', 'attended', 'decided', 'owns', 'informed_by', 'relates_to'
    weight FLOAT DEFAULT 1.0,    -- Strength of relationship (0-1)
    context TEXT,                -- Why this relationship exists

    -- Temporal
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When relationship became true
    valid_to TIMESTAMPTZ,                           -- When relationship ended (null = current)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When we learned about it

    -- Constraints
    CONSTRAINT valid_relationship CHECK (relationship IN (
        'authored', 'attended', 'decided', 'owns', 'reviewed',
        'informed_by', 'relates_to', 'mentioned', 'completed', 'assigned'
    ))
);

-- Indexes for common traversals
CREATE INDEX idx_entity_rel_source ON entity_relationships(source_type, source_id);
CREATE INDEX idx_entity_rel_target ON entity_relationships(target_type, target_id);
CREATE INDEX idx_entity_rel_relationship ON entity_relationships(relationship);
CREATE INDEX idx_entity_rel_temporal ON entity_relationships(valid_from, valid_to);
```

**Acceptance Criteria:**
- [ ] Migration created and tested
- [ ] Repository with CRUD operations
- [ ] Type definitions in `src/lib/types/`
- [ ] Basic traversal queries working

---

#### D2.2: Entity Extraction Service

**Implementation:**

```typescript
// src/lib/server/services/entity-extractor.ts

interface ExtractedEntity {
    type: 'person' | 'project' | 'tool' | 'decision' | 'topic';
    value: string;
    confidence: number;  // 0-1
    context: string;     // Surrounding text
    position: { start: number; end: number };
}

interface ExtractionResult {
    entities: ExtractedEntity[];
    relationships: Array<{
        source: ExtractedEntity;
        target: ExtractedEntity;
        relationship: string;
        confidence: number;
    }>;
}

/**
 * Extract entities from a message using Claude
 *
 * Uses Haiku for cost efficiency (~$0.01 per extraction)
 * Batches multiple messages for efficiency
 */
export async function extractEntities(
    content: string,
    existingEntities?: string[]  // Help model recognize known entities
): Promise<ExtractionResult> {
    // Extraction prompt focuses on:
    // 1. People mentions (@name or "John said")
    // 2. Project/product names
    // 3. Tools/technologies
    // 4. Decisions made
    // 5. Topics discussed
}
```

**Trigger Points:**
1. **On message save** (background, async)
2. **On conversation close** (batch extraction)
3. **Manual "Extract insights" button**

**Acceptance Criteria:**
- [ ] Extraction service implemented with Claude Haiku
- [ ] Background extraction on message save
- [ ] Batch extraction on conversation end
- [ ] Entities stored in entity_relationships table
- [ ] UI shows extracted entities (optional)

---

#### D2.3: Relationship Query Tools

**Implementation:**

```typescript
// AI-accessible tools for relationship queries

const findRelatedEntities = {
    name: "find_related_entities",
    description: `Find entities related to a given entity.
                  Use for questions like "What's connected to X?" or
                  "Who worked on Y?"`,
    parameters: {
        entity_type: { type: "string", required: true },
        entity_id: { type: "string", required: true },
        relationship_filter: { type: "string", required: false },
        max_hops: { type: "number", default: 2 }
    }
};

const findExperts = {
    name: "find_experts",
    description: `Find people with expertise in a topic.
                  Uses relationship graph to score involvement.`,
    parameters: {
        topic: { type: "string", required: true },
        scope: { type: "string", description: "Space or Area ID" }
    }
};

const getDecisionProvenance = {
    name: "get_decision_provenance",
    description: `Trace how a decision was made.
                  Returns the chain: decision ← informed_by ← meeting/discussion`,
    parameters: {
        decision_id: { type: "string", required: true }
    }
};
```

**Acceptance Criteria:**
- [ ] Tools registered in chat handler
- [ ] `find_related_entities` returns connected entities
- [ ] `find_experts` scores users by involvement
- [ ] `get_decision_provenance` traces decision chain
- [ ] All queries filtered by user permissions

---

### 4.3 Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Extraction Accuracy** | >80% precision | Manual review of 100 extractions |
| **Extraction Latency** | <2s per message | Background job timing |
| **Relationship Coverage** | >50% of messages have entities | DB query |
| **Expert Query Relevance** | >70% useful results | User feedback |

### 4.4 Technical Notes

**Entity Resolution:**
- Normalize names ("John", "John Smith", "@john" → same entity)
- Use fuzzy matching for typos
- Store canonical form + aliases

**Graph Traversal Performance:**
- PostgreSQL recursive CTEs handle 2-4 hops efficiently
- If CTEs exceed 500ms, consider Neo4j export (see ENTITY_MODEL.md Section 9)

---

## 5. Phase 3: Active Memory Management

> **Goal:** Memory that evolves, decays, and compresses intelligently

### 5.1 Overview

| Aspect | Detail |
|--------|--------|
| **Primary Focus** | Confidence scoring, decay, compression |
| **Prerequisite For** | Phase 4 (Org Intelligence) |
| **Key Dependency** | Phase 1 + 2 |
| **Estimated Effort** | 3-4 weeks |

### 5.2 Deliverables

#### D3.1: Memories Table

**Implementation:**

```sql
CREATE TABLE memories (
    id TEXT PRIMARY KEY DEFAULT ('mem_' || EXTRACT(EPOCH FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8)),

    -- Ownership & scope
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    area_id TEXT REFERENCES areas(id) ON DELETE CASCADE,
    space_id TEXT REFERENCES spaces(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,           -- The memory itself
    memory_type TEXT NOT NULL,       -- 'fact', 'preference', 'decision', 'instruction'

    -- Confidence & decay
    confidence FLOAT NOT NULL DEFAULT 0.8,  -- 0-1, decays over time
    usage_count INTEGER DEFAULT 0,          -- Times retrieved
    last_used_at TIMESTAMPTZ,               -- Last retrieval
    decay_rate FLOAT DEFAULT 0.01,          -- Per-day confidence decay

    -- Source tracking
    source_type TEXT,                -- 'conversation', 'document', 'manual', 'extraction'
    source_id TEXT,                  -- ID of source entity
    extracted_from TEXT,             -- Original text snippet

    -- Temporal (bi-temporal)
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When this became true
    valid_to TIMESTAMPTZ,                           -- When this stopped being true
    learned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When we learned it

    -- Embedding for semantic search
    embedding vector(1536),  -- text-embedding-3-small

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_memory_type CHECK (memory_type IN ('fact', 'preference', 'decision', 'instruction')),
    CONSTRAINT valid_scope CHECK (
        (user_id IS NOT NULL AND area_id IS NULL AND space_id IS NULL AND org_id IS NULL) OR
        (area_id IS NOT NULL) OR
        (space_id IS NOT NULL AND area_id IS NULL) OR
        (org_id IS NOT NULL AND space_id IS NULL AND area_id IS NULL)
    )
);

-- Indexes
CREATE INDEX idx_memories_user ON memories(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_area ON memories(area_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_space ON memories(space_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_confidence ON memories(confidence DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);
```

**Acceptance Criteria:**
- [ ] Migration created
- [ ] Repository with CRUD + search operations
- [ ] Embedding generation on create/update
- [ ] Confidence decay job (daily cron)

---

#### D3.2: Confidence Scoring & Decay

**Implementation:**

```typescript
// src/lib/server/services/memory-manager.ts

/**
 * Confidence decay formula:
 * new_confidence = old_confidence × (1 - decay_rate)^days_since_use
 *
 * With reinforcement on use:
 * confidence = min(1.0, confidence + 0.1)
 */

interface MemoryScoring {
    // Base confidence from extraction
    extractionConfidence: number;  // 0-1 from AI extraction

    // Reinforcement signals
    usageCount: number;            // Times retrieved
    userConfirmations: number;     // Explicit "this is correct"
    contradictions: number;        // Conflicting information found

    // Decay factors
    daysSinceCreated: number;
    daysSinceUsed: number;
    decayRate: number;             // Per-day decay (default 0.01)
}

function calculateConfidence(scoring: MemoryScoring): number {
    let confidence = scoring.extractionConfidence;

    // Apply decay
    const daysSinceActivity = Math.min(scoring.daysSinceCreated, scoring.daysSinceUsed);
    confidence *= Math.pow(1 - scoring.decayRate, daysSinceActivity);

    // Apply reinforcement
    confidence += scoring.usageCount * 0.02;  // Small boost per use
    confidence += scoring.userConfirmations * 0.1;  // Bigger boost for explicit confirmation
    confidence -= scoring.contradictions * 0.2;  // Penalty for contradictions

    return Math.max(0, Math.min(1, confidence));
}

// Daily decay job
async function runConfidenceDecay(): Promise<void> {
    await sql`
        UPDATE memories
        SET confidence = confidence * (1 - decay_rate)
        WHERE deleted_at IS NULL
          AND confidence > 0.1
          AND last_used_at < NOW() - INTERVAL '1 day'
    `;

    // Mark very low confidence memories for review
    await sql`
        UPDATE memories
        SET deleted_at = NOW()
        WHERE confidence < 0.1
          AND deleted_at IS NULL
    `;
}
```

**Acceptance Criteria:**
- [ ] Confidence calculation implemented
- [ ] Daily decay cron job
- [ ] Reinforcement on retrieval
- [ ] Low-confidence cleanup (soft delete)
- [ ] UI shows confidence indicators

---

#### D3.3: Context Compression

**Implementation:**

```typescript
// src/lib/server/services/context-compressor.ts

interface CompressionStrategy {
    name: string;
    apply: (memories: Memory[]) => Promise<Memory[]>;
}

/**
 * Compression strategies (ordered by effectiveness):
 * 1. Summarization - Condense verbose content
 * 2. Consolidation - Merge related memories
 * 3. Distillation - Extract principles, discard surface details
 */

const strategies: CompressionStrategy[] = [
    {
        name: 'consolidate_similar',
        apply: async (memories) => {
            // Find memories with >0.9 cosine similarity
            // Merge into single memory with combined confidence
        }
    },
    {
        name: 'summarize_old',
        apply: async (memories) => {
            // Memories older than 30 days
            // Generate summary, replace originals
        }
    },
    {
        name: 'extract_principles',
        apply: async (memories) => {
            // Multiple memories about same topic
            // Extract underlying principle
        }
    }
];

/**
 * Weekly compression job:
 * - Run when total context > 80% of budget
 * - Apply strategies in order until under budget
 */
async function compressAreaContext(areaId: string): Promise<void> {
    const memories = await memoriesRepository.findByArea(areaId);
    const totalTokens = estimateTokens(memories);
    const budget = 8000; // Configurable

    if (totalTokens < budget * 0.8) return;

    for (const strategy of strategies) {
        const compressed = await strategy.apply(memories);
        if (estimateTokens(compressed) < budget * 0.7) {
            await memoriesRepository.replaceForArea(areaId, compressed);
            return;
        }
    }
}
```

**Acceptance Criteria:**
- [ ] Consolidation strategy implemented
- [ ] Summarization strategy implemented
- [ ] Weekly compression cron job
- [ ] Compression audit log (what was compressed, why)
- [ ] User notification when compression occurs

---

#### D3.4: Weekly Digest (from Clawd)

**Implementation:**

```typescript
// src/lib/server/services/weekly-digest.ts

interface WeeklyDigest {
    areaId: string;
    periodStart: Date;
    periodEnd: Date;

    summary: string;           // AI-generated summary
    newFacts: Memory[];        // Facts learned this week
    decisions: Memory[];       // Decisions made
    updatedFacts: Memory[];    // Facts that changed
    expiredFacts: Memory[];    // Facts that decayed to 0

    tokensBefore: number;
    tokensAfter: number;
    compressionRatio: number;
}

/**
 * Generate weekly digest for an Area
 * - Summarizes week's activity
 * - Compresses old context
 * - Notifies user of changes
 */
async function generateWeeklyDigest(areaId: string): Promise<WeeklyDigest> {
    // 1. Gather week's memories
    // 2. Generate AI summary
    // 3. Run compression
    // 4. Create digest record
    // 5. Send notification (if enabled)
}
```

**Acceptance Criteria:**
- [ ] Weekly digest generation
- [ ] Digest stored and viewable
- [ ] Email notification (optional, user preference)
- [ ] Digest shows before/after token counts

---

### 5.3 Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Memory Accuracy** | >85% still relevant after 30 days | Manual review |
| **Compression Ratio** | >50% reduction for old context | DB metrics |
| **Confidence Correlation** | High confidence = high usefulness | User feedback |
| **Digest Usefulness** | >70% of users find valuable | Survey |

### 5.4 Technical Notes

**Embedding Model:**
- Use `text-embedding-3-small` ($0.02/1M tokens)
- 1536 dimensions
- Cosine similarity for retrieval

**Decay Tuning:**
- Default: 1% per day (half-life ~70 days)
- Adjustable per memory type (decisions decay slower)
- User can "pin" memories to prevent decay

---

## 6. Phase 4: Organizational Intelligence

> **Goal:** Network effects - AI gets smarter for everyone as organization learns

### 6.1 Overview

| Aspect | Detail |
|--------|--------|
| **Primary Focus** | Knowledge propagation, cross-user learning |
| **Prerequisite For** | N/A (final phase) |
| **Key Dependency** | Phases 1-3 complete |
| **Estimated Effort** | 4-6 weeks |

### 6.2 Deliverables

#### D4.1: Knowledge Propagation Model

**Implementation:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE PROPAGATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  USER DISCOVERS FACT                                                             │
│  "The API uses OAuth 2.0 with PKCE"                                             │
│         │                                                                        │
│         ├────────────────────────────────────────────────────┐                  │
│         │                                                    │                  │
│         ▼                                                    ▼                  │
│  ┌──────────────────┐                           ┌──────────────────┐            │
│  │  EXPLICIT SHARE  │                           │  AUTO-DETECTED   │            │
│  │                  │                           │                  │            │
│  │  User clicks     │                           │  System detects: │            │
│  │  "Share to       │                           │  • High confidence│            │
│  │   Space/Org"     │                           │  • Multiple users │            │
│  │                  │                           │    discovered     │            │
│  └────────┬─────────┘                           │  • Frequently     │            │
│           │                                     │    referenced     │            │
│           │                                     └────────┬─────────┘            │
│           │                                              │                      │
│           └──────────────────┬───────────────────────────┘                      │
│                              │                                                   │
│                              ▼                                                   │
│              ┌───────────────────────────────────┐                              │
│              │        PROPOSED MEMORIES          │                              │
│              │        (Pending Review)           │                              │
│              │                                   │                              │
│              │  Memory: "API uses OAuth 2.0..."  │                              │
│              │  Proposed scope: Space            │                              │
│              │  Confidence: 0.92                 │                              │
│              │  Source: @developer_alex          │                              │
│              │                                   │                              │
│              │  [✓ Approve] [✗ Reject] [✎ Edit] │                              │
│              └───────────────────────────────────┘                              │
│                              │                                                   │
│                    [Owner/Admin approves]                                        │
│                              │                                                   │
│                              ▼                                                   │
│              ┌───────────────────────────────────┐                              │
│              │        SHARED CONTEXT             │                              │
│              │                                   │                              │
│              │  ✓ Visible to all Space members  │                              │
│              │  ✓ Attribution preserved          │                              │
│              │  ✓ Editable by owners             │                              │
│              │  ✓ Version history tracked        │                              │
│              └───────────────────────────────────┘                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] "Share to Space/Org" button on memories
- [ ] Auto-detection of shareable facts
- [ ] Pending review queue for Space/Org owners
- [ ] Approval workflow with edit capability
- [ ] Attribution tracking (who contributed)

---

#### D4.2: Org-Level Context

**Implementation:**

```sql
-- Org-level memories (admin-approved)
-- Uses same memories table with org_id scope

-- Org context retrieval
SELECT m.*
FROM memories m
WHERE m.org_id = $org_id
  AND m.deleted_at IS NULL
  AND m.confidence > 0.5
ORDER BY m.confidence DESC;
```

**Content Types:**
- Company-wide facts ("We use Azure, not AWS")
- Brand guidelines
- Compliance rules ("GDPR applies to EU data")
- Strategic positioning
- Universal terminology

**Acceptance Criteria:**
- [ ] Org-level memory scope
- [ ] Admin-only approval for org memories
- [ ] Org context included in all conversations
- [ ] Org context visible in "What AI Knows" panel

---

#### D4.3: Context Inheritance at Query Time

**Implementation:**

```typescript
// src/lib/server/services/context-assembler.ts

interface AssembledContext {
    org: Memory[];      // Org-level (always included)
    space: Memory[];    // Space-level
    area: Memory[];     // Area-level
    user: Memory[];     // Personal

    totalTokens: number;
    truncated: boolean;
}

/**
 * Assemble context for a query in a specific Area
 *
 * Priority order (highest to lowest):
 * 1. Org context (compliance, brand - always included)
 * 2. Space context (project-specific)
 * 3. Area context (domain-specific)
 * 4. User context (personal preferences)
 *
 * If over budget, truncate lowest priority first
 */
async function assembleContext(
    userId: string,
    areaId: string,
    tokenBudget: number
): Promise<AssembledContext> {
    // 1. Get org context (required)
    // 2. Get space context
    // 3. Get area context
    // 4. Get user context
    // 5. Truncate if over budget (user first, then area, etc.)
}
```

**Acceptance Criteria:**
- [ ] Context assembled from all levels
- [ ] Priority-based truncation
- [ ] Token budget respected
- [ ] Audit trail of what was included

---

#### D4.4: New Hire Onboarding

**Implementation:**

The culmination of organizational intelligence - new team members get productive immediately:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    NEW HIRE EXPERIENCE (Day 1)                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Jamie joins the Stratech Loyalty Project team                                  │
│                                                                                  │
│  JAMIE'S AI ALREADY KNOWS:                                                      │
│                                                                                  │
│  📋 FROM ORG CONTEXT:                                                           │
│  ├─ Company uses Azure (not AWS)                                                │
│  ├─ GDPR compliance required for EU data                                        │
│  └─ Brand voice: professional but approachable                                  │
│                                                                                  │
│  📁 FROM SPACE CONTEXT (Stratech Loyalty):                                      │
│  ├─ API uses OAuth 2.0 with PKCE                                               │
│  ├─ Rate limits: 100 req/min per client                                        │
│  ├─ CEO sensitive about churn metrics                                           │
│  └─ Launch target: Q2 (soft deadline)                                           │
│                                                                                  │
│  🎯 FROM AREA CONTEXT (API Design):                                             │
│  ├─ REST preferred over GraphQL                                                 │
│  ├─ Pagination uses cursor-based approach                                       │
│  └─ Error format follows RFC 7807                                               │
│                                                                                  │
│  ✨ RESULT: Jamie is productive from DAY ONE                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] New Space member sees inherited context
- [ ] "What AI Knows" shows inherited knowledge
- [ ] Attribution shows who contributed each fact
- [ ] Can "ask about" any inherited memory

---

### 6.3 Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Knowledge Contribution Rate** | >10% of users contribute | DB metrics |
| **Approval Rate** | >70% of proposed memories approved | Workflow metrics |
| **New Hire Ramp Time** | 50% reduction vs control | User survey |
| **Cross-Team Learning** | Facts from Team A used by Team B | Attribution tracking |

### 6.4 Technical Notes

**Privacy Considerations:**
- User memories never auto-promoted without consent
- Org-level requires admin approval
- Attribution always preserved (who said this)
- Ability to withdraw contributions

**Conflict Resolution:**
- Later information can supersede earlier
- Higher-scope (org) overrides lower (user)
- Contradictions flagged for human review

---

## 7. Technical Architecture Decisions

### 7.1 Storage Architecture

| Component | Storage | Rationale |
|-----------|---------|-----------|
| Messages | PostgreSQL | Reliability, search, joins |
| Memories | PostgreSQL + pgvector | Semantic search, existing stack |
| Relationships | PostgreSQL | CTEs sufficient for 2-4 hops |
| Embeddings | pgvector | No separate vector DB needed |

**Future Consideration:** If CTE performance degrades (>500ms), export to Neo4j/Neptune.

### 7.2 Token Budget Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         TOKEN BUDGET ALLOCATION                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  TOTAL CONTEXT BUDGET: ~30,000 tokens (for 200K context models)                 │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 1: Always Included (~5,000 tokens)                    [UPFRONT]   │   │
│  │ ├─ System prompt                                                        │   │
│  │ ├─ Org context (compliance, brand)                                      │   │
│  │ ├─ Area notes                                                           │   │
│  │ └─ Active task context                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 2: Metadata Catalog (~2,000 tokens)                   [CATALOG]   │   │
│  │ ├─ Document summaries (not full content)                                │   │
│  │ ├─ Memory titles + confidence scores                                    │   │
│  │ └─ Relationship graph summary                                           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ TIER 3: On-Demand (~remaining budget)                      [TOOLS]     │   │
│  │ ├─ Full document content (via read_document)                            │   │
│  │ ├─ Detailed memories (via search_memories)                              │   │
│  │ └─ Relationship details (via find_related)                              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 AI Model Selection

| Use Case | Model | Cost | Rationale |
|----------|-------|------|-----------|
| **Entity Extraction** | Claude Haiku 4.5 | ~$0.01/msg | Cost efficient, good accuracy |
| **Memory Summarization** | Claude Haiku 4.5 | ~$0.005/summary | Already proven for doc summaries |
| **Context Compression** | Claude Haiku 4.5 | ~$0.02/compression | Batch operation, cost matters |
| **Embeddings** | text-embedding-3-small | $0.02/1M tokens | Good quality/cost balance |
| **Primary Chat** | User's chosen model | Varies | User preference |

---

## 8. Risk Mitigation

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Extraction accuracy too low** | Medium | High | Start with high-confidence only; human review for low confidence |
| **Graph queries too slow** | Low | Medium | Monitor CTE performance; Neo4j fallback planned |
| **Token budget exceeded** | Medium | Medium | Compression strategies; truncation with priority |
| **Embedding costs high** | Low | Medium | Batch embeddings; cache aggressively |

### 8.2 UX Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Users don't understand confidence** | Medium | Medium | Simple visual indicators (not raw numbers) |
| **Approval workflow too heavy** | Medium | High | Batch approvals; auto-approve high-confidence |
| **Context feels like magic (untrusted)** | Medium | High | Always show attribution; "Why does AI know this?" |

### 8.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Privacy concerns** | Medium | High | User never auto-promoted; clear consent |
| **Knowledge leaves with employee** | Low | High | Org-level memories persist; attribution preserved |
| **Incorrect facts propagate** | Medium | High | Confidence decay; contradiction detection; human review |

---

## 9. Dependencies Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           IMPLEMENTATION DEPENDENCIES                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PHASE 1: Memory Transparency & Persistence                                      │
│  ├─ D1.1: Server-side messages ◀── BLOCKS ALL OTHERS                            │
│  ├─ D1.2: "What AI Knows" panel                                                 │
│  └─ D1.3: Conversation search                                                   │
│           │                                                                      │
│           ▼                                                                      │
│  PHASE 2: Entity Extraction & Relationships                                      │
│  ├─ D2.1: Entity relationships table                                            │
│  ├─ D2.2: Entity extraction service ◀── Needs D1.1 (messages)                   │
│  └─ D2.3: Relationship query tools                                              │
│           │                                                                      │
│           ▼                                                                      │
│  PHASE 3: Active Memory Management                                               │
│  ├─ D3.1: Memories table                                                        │
│  ├─ D3.2: Confidence scoring & decay ◀── Needs D2.2 (extraction)               │
│  ├─ D3.3: Context compression                                                   │
│  └─ D3.4: Weekly digest                                                         │
│           │                                                                      │
│           ▼                                                                      │
│  PHASE 4: Organizational Intelligence                                            │
│  ├─ D4.1: Knowledge propagation model ◀── Needs D3.1 (memories)                 │
│  ├─ D4.2: Org-level context                                                     │
│  ├─ D4.3: Context inheritance                                                   │
│  └─ D4.4: New hire onboarding                                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Critical Path

```
D1.1 (Messages) → D2.2 (Extraction) → D3.1 (Memories) → D4.1 (Propagation)
```

**This is the minimum path to organizational intelligence.** All other deliverables enhance but don't block.

---

## 10. Feature Dependencies: What Context Enables

The context management infrastructure isn't just about "memory" - it's the foundation that makes other features valuable. Without it, features work in isolation. With it, features compound into organizational intelligence.

### Meeting Lifecycle → Context Integration

The [Meeting Lifecycle System](../features/MEETING_LIFECYCLE.md) has a critical Phase 7: **Context Integration** that assumes this infrastructure exists:

```
MEETING FINALIZED
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│  "Propagate decisions to Area context"                          │
│                                                                 │
│  WHERE does this go?                                            │
│                                                                 │
│  WITHOUT Context Infrastructure:                                │
│  └─ area.notes (unstructured markdown) ← Not ideal              │
│                                                                 │
│  WITH Context Infrastructure:                                   │
│  ├─ entity_relationships: meeting → produced → decision         │
│  ├─ memories table: decision stored with confidence, decay      │
│  └─ AI tools: searchable, retrievable, attributable             │
└─────────────────────────────────────────────────────────────────┘
```

**Impact on user experience:**

| Scenario | Without Context Infra | With Context Infra |
|----------|----------------------|-------------------|
| "What did we decide about rate limiting?" | "I don't have that information" | "In Q1 Planning (Jan 15), you decided exponential backoff with jitter. Sarah owns implementation." |
| New team member asks about project history | Must read old meeting notes manually | AI synthesizes decisions across all meetings |
| Preparing for follow-up meeting | No automatic context | AI surfaces relevant past decisions |

### Dependency Matrix

| Feature | Phase 1 (Messages) | Phase 2 (Relationships) | Phase 3 (Memories) | Phase 4 (Org Intel) |
|---------|-------------------|------------------------|-------------------|-------------------|
| **Meeting Lifecycle** | Helpful | Required | Required | Enhances |
| **Task Deep Work** | Helpful | Helpful | Enhances | - |
| **Document Intelligence** | - | Helpful | Required | Enhances |
| **New Hire Onboarding** | - | Helpful | Required | Required |

- **Required**: Feature's core value proposition depends on this
- **Helpful**: Feature works without it but is better with it
- **Enhances**: Adds additional capabilities
- **-**: No direct dependency

### Strategic Implication

Building Context Infrastructure first means every subsequent feature ships with the flywheel already turning. Building features first means retrofitting the flywheel later - possible, but the compounding starts later.

The recommended approach is **interleaved development**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    INTERLEAVED DEVELOPMENT PATH                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CONTEXT                              MEETINGS                                   │
│  ───────                              ────────                                   │
│                                                                                  │
│  Phase 1: Messages, Search ─────────► Meeting Phase 1-2: Schema, OAuth          │
│           (2-3 weeks)                 (3-4 weeks)                                │
│                 │                           │                                    │
│                 ▼                           ▼                                    │
│  Phase 2: entity_relationships ────► Meeting Phase 3-5: Scheduling, Capture     │
│           (2-3 weeks)                 (6-8 weeks)                                │
│                 │                           │                                    │
│                 ▼                           ▼                                    │
│  Phase 3: memories table ──────────► Meeting Phase 6-7: AI Extraction,          │
│           (2-3 weeks)                 Finalization + FULL CONTEXT PROPAGATION   │
│                                       (4-6 weeks)                                │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════    │
│  RESULT: Flywheel turns from day one. Meetings feed memory immediately.         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

This delivers user value incrementally while ensuring the infrastructure is ready when features need it.

---

## Appendix A: Quick Reference

### Phase Summary

| Phase | Focus | Key Deliverable | Est. Effort |
|-------|-------|-----------------|-------------|
| **1** | Persistence & Visibility | Server-side messages | 2-3 weeks |
| **2** | Knowledge Graph | Entity relationships | 3-4 weeks |
| **3** | Active Memory | Confidence & decay | 3-4 weeks |
| **4** | Org Intelligence | Knowledge propagation | 4-6 weeks |

### New Tables Required

| Table | Phase | Purpose |
|-------|-------|---------|
| `messages` | 1 | Server-side message storage |
| `entity_relationships` | 2 | Graph edges |
| `memories` | 3 | Extracted facts with confidence |
| `memory_proposals` | 4 | Pending approvals for sharing |

### New API Endpoints

| Endpoint | Phase | Purpose |
|----------|-------|---------|
| `GET/POST /api/conversations/[id]/messages` | 1 | Message CRUD |
| `GET /api/conversations/search` | 1 | Full-text search |
| `GET /api/areas/[id]/context-preview` | 1 | What AI knows |
| `POST /api/extract-entities` | 2 | Entity extraction |
| `GET /api/entities/[id]/related` | 2 | Relationship traversal |
| `GET /api/memories` | 3 | Memory CRUD |
| `POST /api/memories/[id]/share` | 4 | Propose for sharing |
| `GET/POST /api/memory-proposals` | 4 | Approval workflow |

---

## Appendix B: Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-26 | 1.0 | Initial document created |
| 2026-01-27 | 1.1 | Added Section 10: Feature Dependencies (Meeting Lifecycle integration, dependency matrix, interleaved development recommendation) |

---

*This document is the authoritative implementation guide for context management. For strategic vision, see [CONTEXT_STRATEGY.md](./CONTEXT_STRATEGY.md). For technical architecture details, see [context-loading-architecture.md](./context-loading-architecture.md) and [AI_RETRIEVAL_ARCHITECTURE.md](./AI_RETRIEVAL_ARCHITECTURE.md).*
