# AI Retrieval Architecture

> **How AI Accesses Organizational Knowledge**

This document explains the mechanics of how StratAI's AI assistant retrieves and uses organizational context. Understanding this architecture is essential for designing features that leverage AI intelligence effectively.

**Key Insight**: AI doesn't "know" your organization—it retrieves context through structured queries, then reasons over the results.

---

## Table of Contents

1. [The Retrieval Mental Model](#1-the-retrieval-mental-model)
2. [The Three-Layer Architecture](#2-the-three-layer-architecture)
3. [Retrieval Patterns](#3-retrieval-patterns)
4. [The Intelligence Triangle](#4-the-intelligence-triangle)
5. [Tool Definitions](#5-tool-definitions)
6. [Query Composition](#6-query-composition)
7. [Privacy and Permissions](#7-privacy-and-permissions)
8. [Performance Considerations](#8-performance-considerations)
9. [Related Documents](#9-related-documents)

---

## 1. The Retrieval Mental Model

### AI Has No Inherent Organizational Knowledge

When a user asks "Who should I talk to about payments?", the AI doesn't have a database of your employees and their expertise. There must be a **retrieval step**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    HOW AI "KNOWS" ORGANIZATIONAL CONTEXT                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   USER                        AI (LLM)                      YOUR DATA            │
│                                                                                  │
│   "Who should I talk         ┌──────────────┐              ┌──────────────┐     │
│    to about payments?"       │              │   tool call  │              │     │
│          │                   │  Recognizes  │─────────────▶│  Database    │     │
│          │                   │  intent:     │              │  Graph       │     │
│          ▼                   │  "expertise  │◀─────────────│  Vectors     │     │
│   ┌──────────────┐           │   lookup"    │   results    │              │     │
│   │ Sent to LLM  │──────────▶│              │              └──────────────┘     │
│   └──────────────┘           │  Synthesizes │                                    │
│                              │  response    │                                    │
│          ┌───────────────────│  with data   │                                    │
│          │                   └──────────────┘                                    │
│          ▼                                                                       │
│   "Sarah and James have                                                          │
│    the most experience.                                                          │
│    Sarah led the Stripe                                                          │
│    integration..."                                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### The Retrieval Equation

```
User Question + Tool Execution + LLM Reasoning = Intelligent Response
     │                │                │
     │                │                └─ Synthesize natural language from data
     │                └─ Query databases, traverse relationships
     └─ Understand intent, extract parameters
```

---

## 2. The Three-Layer Architecture

### Layer 1: Intent Recognition (LLM)

The AI understands what the user is asking and determines what data is needed.

```
User: "Who should I include in the payment migration meeting?"

LLM Analysis:
├─ Intent: Expertise lookup
├─ Topic: "payment migration"
├─ Context: Meeting planning
└─ Required: People with payment experience
```

### Layer 2: Data Retrieval (Software/Tools)

Software executes queries against structured data stores.

```typescript
// AI calls this tool with extracted parameters
async function findExperts({
  topic: string,
  scope?: string
}): Promise<Expert[]> {

  // Step 1: Semantic search - what entities relate to this topic?
  const topicEmbedding = await embed(topic);
  const relatedEntities = await db.query(`
    SELECT id, type, title
    FROM entities
    WHERE embedding <-> $1 < 0.3
  `, [topicEmbedding]);

  // Step 2: Relationship traversal - who is connected to these entities?
  const experts = await db.query(`
    SELECT
      u.id,
      u.display_name,
      COUNT(*) as involvement_score,
      array_agg(DISTINCT er.relationship) as relationship_types,
      array_agg(DISTINCT e.title) as related_work
    FROM entity_relationships er
    JOIN users u ON er.source_id = u.id AND er.source_type = 'user'
    JOIN entities e ON er.target_id = e.id
    WHERE er.target_id = ANY($1)
      AND er.relationship IN ('authored', 'owns', 'decided', 'completed', 'attended')
    GROUP BY u.id, u.display_name
    ORDER BY involvement_score DESC
    LIMIT 5
  `, [relatedEntities.map(e => e.id)]);

  return experts;
}
```

### Layer 3: Synthesis (LLM)

The AI interprets results and formulates a natural language response.

```
Tool returned:
[
  { name: "Sarah Chen", score: 12, relationships: ["decided", "authored"],
    work: ["Use Stripe", "Payment Flow Design"] },
  { name: "James Wu", score: 8, relationships: ["attended", "reviewed"],
    work: ["Payment architecture review"] }
]

LLM synthesizes:
"Based on their involvement in payment-related work, I'd recommend:

1. **Sarah Chen** - She led the Stripe integration decision and authored
   the payment flow design. She has the deepest expertise.

2. **James Wu** - He's been involved in architecture reviews for payments
   and attended key planning meetings. Good for architectural questions."
```

---

## 3. Retrieval Patterns

### Pattern A: Tool Calling in Chat (AI-Initiated)

The AI recognizes the need for data and calls tools explicitly.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AI-INITIATED RETRIEVAL                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. User message received                                                        │
│     "Who should I include in the payment meeting?"                               │
│                                                                                  │
│  2. AI recognizes intent                                                         │
│     Intent: expertise_lookup                                                     │
│     Topic: "payment"                                                             │
│     Context: "meeting planning"                                                  │
│                                                                                  │
│  3. AI calls tool                                                                │
│     find_experts({ topic: "payment", context: "meeting" })                       │
│                                                                                  │
│  4. Tool executes                                                                │
│     - Semantic search for "payment" entities                                     │
│     - Traverse relationships to find connected users                             │
│     - Score by involvement depth                                                 │
│     - Filter by permissions                                                      │
│                                                                                  │
│  5. Results returned to AI                                                       │
│     [{ user: "Sarah", score: 0.94, ... }, ...]                                   │
│                                                                                  │
│  6. AI synthesizes response                                                      │
│     "I'd recommend including Sarah Chen and James Wu..."                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Pattern B: Proactive Suggestions (System-Initiated)

The system anticipates needs and provides suggestions without explicit AI reasoning.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       SYSTEM-INITIATED RETRIEVAL                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. User action triggers context                                                 │
│     User enters meeting purpose: "Payment gateway migration"                     │
│                                                                                  │
│  2. System detects opportunity                                                   │
│     Context: Meeting creation, Step 3 (Attendees)                                │
│                                                                                  │
│  3. Backend directly queries                                                     │
│     findRelevantPeople({ context: meeting.purpose, area_id: area.id })           │
│                                                                                  │
│  4. Results rendered as suggestions                                              │
│     ┌─────────────────────────────────────────┐                                  │
│     │ 💡 Suggested attendees based on topic:  │                                  │
│     │                                         │                                  │
│     │ ★ Sarah Chen         [Add]              │                                  │
│     │   Led Stripe integration                │                                  │
│     │                                         │                                  │
│     │ ★ James Wu           [Add]              │                                  │
│     │   Payment architecture reviews          │                                  │
│     └─────────────────────────────────────────┘                                  │
│                                                                                  │
│  5. No LLM needed                                                                │
│     Structured data → Structured UI (no synthesis required)                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### When to Use Each Pattern

| Pattern | Use When | Example |
|---------|----------|---------|
| AI-Initiated | Open-ended questions in chat | "Who knows about X?" |
| AI-Initiated | Complex reasoning needed | "What decisions led to this?" |
| System-Initiated | Predictable UI contexts | Meeting attendee suggestions |
| System-Initiated | Structured output needed | Dashboard recommendations |
| Hybrid | Both structured + reasoning | "Why these people?" on suggestions |

---

## 4. The Intelligence Triangle

StratAI's context retrieval combines three complementary query types:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         THE INTELLIGENCE TRIANGLE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                              SEMANTIC                                            │
│                            (pgvector)                                            │
│                                △                                                 │
│                               ╱ ╲                                                │
│                              ╱   ╲                                               │
│                             ╱     ╲                                              │
│              "Similar"    ╱       ╲    "Scoped"                                  │
│              content     ╱         ╲   by context                                │
│                         ╱           ╲                                            │
│                        ╱             ╲                                           │
│                       ▽───────────────▽                                          │
│                 RELATIONAL          HIERARCHICAL                                 │
│                  (graph)            (tree/scope)                                 │
│                                                                                  │
│           "Connected by              "Contained within                           │
│            relationship"              Space/Area/Task"                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Query Type Comparison

| Query Type | Question Answered | Data Source | Example |
|------------|-------------------|-------------|---------|
| **Semantic** | "What is similar to X?" | pgvector embeddings | Find docs about "payments" |
| **Hierarchical** | "What belongs to Y?" | Foreign keys, containment | All tasks in this Area |
| **Relational** | "Who/what is related to Z?" | entity_relationships | Who attended this meeting? |

### Combined Queries (Most Powerful)

```sql
-- "Find experts on payments in the Engineering space"

WITH
-- 1. SEMANTIC: Find entities related to "payments"
topic_entities AS (
    SELECT id, type, title
    FROM entities
    WHERE embedding <-> $topic_embedding < 0.3
),
-- 2. HIERARCHICAL: Filter to Engineering space
scoped_entities AS (
    SELECT te.*
    FROM topic_entities te
    JOIN focus_areas a ON te.area_id = a.id
    JOIN spaces s ON a.space_id = s.id
    WHERE s.name = 'Engineering'
),
-- 3. RELATIONAL: Find connected users
user_involvement AS (
    SELECT er.source_id as user_id, COUNT(*) as score
    FROM entity_relationships er
    JOIN scoped_entities se ON er.target_id = se.id
    WHERE er.source_type = 'user'
    GROUP BY er.source_id
)
SELECT u.display_name, ui.score
FROM user_involvement ui
JOIN users u ON u.id = ui.user_id
ORDER BY ui.score DESC;
```

---

## 5. Tool Definitions

Tools exposed to the AI for context retrieval:

### Core Tools

```typescript
interface ContextTools {
  // Area/Space context
  load_area_context(area_id: string): AreaContext;
  load_space_context(space_id: string): SpaceContext;

  // Search
  search_documents(query: string, scope?: string): Document[];
  search_pages(query: string, scope?: string): Page[];
  search_memories(query: string, scope?: string): Memory[];

  // Relationship queries
  find_experts(topic: string, scope?: string): Expert[];
  find_related_entities(entity_id: string, relationship?: string): Entity[];
  get_decision_provenance(decision_id: string): ProvenanceChain;

  // Task context
  find_related_tasks(task_id: string): Task[];
  get_task_context(task_id: string): TaskContext;
}
```

### Tool Definition Format

```typescript
const findExpertsTool = {
  name: "find_experts",
  description: `Find people with expertise in a topic based on their work history.
                Uses relationship graph to score involvement depth.
                Returns top 5 experts with reasons.`,
  parameters: {
    topic: {
      type: "string",
      description: "The topic or domain to find experts for",
      required: true
    },
    scope: {
      type: "string",
      description: "Optional: Limit to specific Space or Area ID",
      required: false
    },
    include_external: {
      type: "boolean",
      description: "Include users from other organizations (if shared areas)",
      required: false,
      default: false
    }
  }
};
```

---

## 6. Query Composition

### How AI Composes Queries

The AI may need to chain multiple tool calls for complex questions:

```
User: "What led to the decision to use microservices?"

AI thinks:
1. First, find the decision about microservices
   → search_decisions({ query: "microservices architecture" })

2. Then, trace its provenance
   → get_decision_provenance({ decision_id: "abc123" })

3. Load context from related meetings
   → load_meeting_context({ meeting_id: "def456" })
```

### Query Optimization Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| Scoped first | Filter by hierarchy before semantic | Known scope, broad topic |
| Semantic first | Find similar, then traverse | Unknown scope, specific topic |
| Relationship first | Start from known entity | "What came from X?" questions |
| Parallel queries | Multiple tools simultaneously | Independent sub-questions |

---

## 7. Privacy and Permissions

### Permission-Aware Retrieval

All queries are filtered by user permissions:

```typescript
async function findExperts(
  topic: string,
  requestingUserId: string
): Promise<Expert[]> {

  // Get user's accessible entities
  const accessibleEntities = await getAccessibleEntities(requestingUserId);

  // Query only within accessible scope
  const experts = await db.query(`
    SELECT ...
    FROM entity_relationships er
    WHERE er.target_id = ANY($1)  -- Only accessible entities
      AND er.source_type = 'user'
      AND er.source_id IN (
        SELECT user_id FROM accessible_users($2)  -- Only visible users
      )
  `, [accessibleEntities, requestingUserId]);

  return experts;
}
```

### Information Minimization

When returning results, minimize sensitive details:

```typescript
// Full data (internal)
{
  user_id: "abc123",
  display_name: "Sarah Chen",
  email: "sarah@company.com",
  involvement_score: 0.94,
  related_work: ["Q4 Payment Strategy", "Stripe Migration Plan"]
}

// Returned to AI (filtered)
{
  display_name: "Sarah Chen",
  expertise_summary: "Led payment infrastructure decisions",
  relevance: "high"
}
```

### Audit Trail

All AI-initiated queries are logged:

```sql
INSERT INTO ai_query_log (
    user_id,
    query_type,
    tool_name,
    parameters,
    result_count,
    created_at
) VALUES (
    $user_id,
    'expertise_lookup',
    'find_experts',
    '{"topic": "payments"}',
    5,
    NOW()
);
```

---

## 8. Performance Considerations

### Latency Budgets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Semantic search | <100ms | Precomputed embeddings, HNSW index |
| Relationship traversal | <50ms | Indexed entity_relationships table |
| Full expert lookup | <200ms | Cached user profiles |
| AI reasoning | 500-2000ms | Streaming response |

### Caching Strategy

```typescript
// Cache frequently accessed context
const areaContextCache = new LRUCache<string, AreaContext>({
  max: 1000,
  ttl: 5 * 60 * 1000  // 5 minutes
});

// Cache user permissions
const permissionCache = new LRUCache<string, Permission[]>({
  max: 5000,
  ttl: 60 * 1000  // 1 minute (security-sensitive)
});
```

### Query Limits

```typescript
const QUERY_LIMITS = {
  maxSemanticResults: 50,
  maxRelationshipHops: 3,
  maxExpertsReturned: 10,
  maxDocumentsReturned: 20
};
```

---

## 9. Related Documents

| Document | Relationship |
|----------|--------------|
| [ENTITY_MODEL.md](../ENTITY_MODEL.md) | Section 9: Relationship Modeling - Schema for entity_relationships |
| [CONTEXT_STRATEGY.md](./CONTEXT_STRATEGY.md) | What context to capture (this doc covers how to retrieve it) |
| [context-loading-architecture.md](./context-loading-architecture.md) | Tool definitions for context loading |
| [MEETING_LIFECYCLE.md](./MEETING_LIFECYCLE.md) | Example of relationship capture during meeting workflow |

---

## Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         THE RETRIEVAL ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  LLM PROVIDES:                          SOFTWARE PROVIDES:                       │
│  ├─ Understanding natural language      ├─ Access to YOUR data                  │
│  ├─ Recognizing "this needs a lookup"   ├─ Query execution (SQL, vector, graph) │
│  ├─ Formulating tool parameters         ├─ Permission filtering                 │
│  ├─ Interpreting structured results     ├─ Relationship traversal               │
│  └─ Generating natural response         └─ Aggregation and scoring              │
│                                                                                  │
│  WITHOUT TOOLS:                         WITHOUT LLM:                             │
│  "I don't have access to your           Raw data that users must                 │
│   organization's data"                  interpret themselves                     │
│                                                                                  │
│  ──────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  TOGETHER: Organizational intelligence that feels like magic                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

The AI is intelligent because it can reason. The retrieval system is powerful because it can access your data. Together, they create the illusion of an AI that "knows" your organization.
