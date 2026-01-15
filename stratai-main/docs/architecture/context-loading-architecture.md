# Context Loading Architecture: Just-In-Time via Tool Calling

> **Document Purpose:** Technical architecture for intelligent context loading using a hybrid upfront + on-demand approach via tool calling.
>
> **Created:** January 2026
> **Status:** Strategic Design
> **Related:** `CONTEXT_STRATEGY.md` (foundational context/memory architecture)

---

## Executive Summary

**The Problem:** As StratAI's context hierarchy grows (Org → Group → Space → Area → User), loading all potential context upfront will:
1. Consume 30%+ of the context window before conversation starts
2. Degrade model performance (research shows focused context outperforms bloated context)
3. Create "needle in haystack" problems where relevant info is buried
4. Waste tokens on context that's never needed for the query

**The Solution:** A hybrid architecture that:
- Loads **critical context upfront** (can't risk missing)
- Provides a **context catalog** (what's available to search)
- Enables **on-demand retrieval via tool calling** (AI decides when it needs more)

**Research Backing:** Anthropic's own "Tool Search Tool" pattern achieves 85% token reduction using deferred loading. The same principle applies to context.

---

## The Core Insight

**The AI needs to know WHAT context exists to ask for it.**

You don't load everything - you tell the AI what's available and give it a tool to retrieve specifics. This mirrors how humans work: we don't memorize everything, we know where to look.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONTEXT LOADING STRATEGY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  TIER 1: ALWAYS UPFRONT (Critical - can't risk missing)             │    │
│  │                                                                      │    │
│  │  • System prompt (base instructions)                                │    │
│  │  • Compliance/safety rules (GDPR, legal, brand guidelines)          │    │
│  │  • Current area notes (user explicitly chose this area)             │    │
│  │  • Active documents for this area (user activated them)             │    │
│  │  • Recent conversation history (immediate context)                  │    │
│  │                                                                      │    │
│  │  Token budget: ~15-20K (fixed, always present)                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  TIER 2: CONTEXT CATALOG (Lightweight summary of what's available)  │    │
│  │                                                                      │    │
│  │  "You have access to the following context via search_context:      │    │
│  │   • Organization (Acme): 12 policies, 8 guidelines, 5 standards     │    │
│  │   • Team (Engineering): 15 coding standards, 6 architecture docs    │    │
│  │   • Space (Stratech): 28 decisions, 12 API specs, 8 preferences     │    │
│  │   • Historical: 45 related conversations across areas"              │    │
│  │                                                                      │    │
│  │  Token budget: ~500-1K (metadata only, not content)                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  TIER 3: ON-DEMAND VIA TOOL (AI retrieves when needed)              │    │
│  │                                                                      │    │
│  │  • Specific organizational policies                                 │    │
│  │  • Team/group standards and practices                               │    │
│  │  • Historical memories from other areas                             │    │
│  │  • Related conversations and decisions                              │    │
│  │  • Deep document search results                                     │    │
│  │  • Cross-space knowledge                                            │    │
│  │                                                                      │    │
│  │  Token budget: Variable (loaded as needed, 2-8K per retrieval)      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Research Foundation

### Why Not Load Everything Upfront?

| Problem | Evidence | Impact |
|---------|----------|--------|
| **Context pollution** | Models attend to irrelevant tokens, diluting focus | Lower quality responses |
| **Needle in haystack** | Key info buried in large context | Missed critical context |
| **Token inefficiency** | Paying for unused context | Higher costs, slower responses |
| **Performance degradation** | Research shows focused context outperforms bloated | Measurably worse outputs |

### Why Tool-Based Loading Works

1. **Anthropic's Tool Search Tool** - 85% token reduction with `defer_loading: true`
2. **Selective attention** - Model only loads what it determines is relevant
3. **Natural fit** - Mirrors human cognition (we know where to look, not everything)
4. **Proven pattern** - Used in production by Anthropic, OpenAI for tool definitions

### The 80/20 Rule for Context

Research and practical experience show:
- **80% of queries** need only the immediate area context
- **15% of queries** need one additional context search
- **5% of queries** need multiple context sources

Loading everything upfront optimizes for the 5% case at the expense of the 95%.

---

## The Context Search Tool

### Tool Definition

```typescript
const contextSearchTool = {
  name: "search_context",
  description: `Search the organization's knowledge base for relevant context.

USE THIS TOOL WHEN YOU NEED:
- Company policies, compliance rules, or guidelines
- Team standards, practices, or conventions
- Project decisions, specifications, or historical context
- Information from previous conversations in other areas
- Facts or preferences that aren't in your current context

YOU HAVE ACCESS TO CONTEXT AT THESE LEVELS:
- organization: Company-wide rules, brand guidelines, compliance
- team: Department-specific standards and practices
- space: Project knowledge, decisions, specifications
- area: Domain-specific memories and facts
- historical: Past conversations and extracted insights

DO NOT USE THIS TOOL FOR:
- Information already in your current context
- General knowledge questions
- Simple factual queries that don't need organizational context`,

  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Describe what context you're looking for. Be specific."
      },
      scope: {
        type: "string",
        enum: ["organization", "team", "space", "area", "historical", "all"],
        description: "Where to search. Use 'all' for broad searches, or specific scope for targeted retrieval."
      },
      limit: {
        type: "integer",
        default: 5,
        description: "Maximum results to return (1-10). Use lower values for focused queries."
      }
    },
    required: ["query"]
  }
};
```

### Tool Implementation Pattern

```typescript
// src/lib/server/services/contextSearch.ts

interface ContextSearchOptions {
  query: string;
  scope: 'organization' | 'team' | 'space' | 'area' | 'historical' | 'all';
  limit?: number;

  // Current user context (for scoping)
  userId: string;
  organizationId?: string;
  groupIds?: string[];
  spaceId?: string;
  areaId?: string;
}

interface ContextSearchResult {
  content: string;
  source: {
    type: 'memory' | 'document' | 'conversation';
    scope: string;
    title?: string;
    contributedBy?: string;
    createdAt: Date;
  };
  relevanceScore: number;
}

export async function searchContext(
  options: ContextSearchOptions
): Promise<ContextSearchResult[]> {
  const { query, scope, limit = 5, userId, organizationId, groupIds, spaceId, areaId } = options;

  // 1. Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Build scope filter based on requested scope
  const scopeFilter = buildScopeFilter(scope, {
    organizationId,
    groupIds,
    spaceId,
    areaId
  });

  // 3. Hybrid search: semantic + keyword
  const results = await sql`
    WITH semantic_results AS (
      SELECT
        id,
        content,
        memory_type,
        visibility,
        space_id,
        area_id,
        contributed_by_user_id,
        created_at,
        1 - (embedding <=> ${queryEmbedding}::vector) as semantic_score
      FROM memories
      WHERE ${scopeFilter}
        AND approval_status = 'approved'
        AND (valid_to IS NULL OR valid_to > NOW())
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit * 2}
    ),
    keyword_results AS (
      SELECT
        id,
        content,
        memory_type,
        visibility,
        space_id,
        area_id,
        contributed_by_user_id,
        created_at,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) as keyword_score
      FROM memories
      WHERE ${scopeFilter}
        AND approval_status = 'approved'
        AND (valid_to IS NULL OR valid_to > NOW())
        AND to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      ORDER BY keyword_score DESC
      LIMIT ${limit * 2}
    )
    SELECT DISTINCT ON (id)
      id,
      content,
      memory_type,
      visibility,
      space_id,
      area_id,
      contributed_by_user_id,
      created_at,
      COALESCE(s.semantic_score, 0) * 0.6 + COALESCE(k.keyword_score, 0) * 0.4 as combined_score
    FROM semantic_results s
    FULL OUTER JOIN keyword_results k USING (id, content, memory_type, visibility, space_id, area_id, contributed_by_user_id, created_at)
    ORDER BY combined_score DESC
    LIMIT ${limit}
  `;

  // 4. Format results for LLM consumption
  return results.map(r => ({
    content: r.content,
    source: {
      type: 'memory',
      scope: getScopeName(r),
      contributedBy: r.contributed_by_user_id,
      createdAt: r.created_at
    },
    relevanceScore: r.combined_score
  }));
}
```

---

## Context Catalog Pattern

### What the AI Sees Upfront

Instead of loading full context, provide a summary of what's available:

```markdown
## Available Context

You have access to organizational knowledge via the `search_context` tool.

**Organization (Acme Corp):**
- 12 compliance policies (GDPR, data retention, security protocols)
- 8 brand guidelines (voice, messaging, visual identity)
- 5 technology standards (approved vendors, architecture patterns)

**Team (Engineering):**
- 15 coding standards and conventions
- 6 architecture decision records
- 3 deployment and infrastructure practices

**Space (Stratech Loyalty Project):**
- 28 project decisions and rationale
- 12 API specifications and constraints
- 8 stakeholder preferences and requirements
- 15 technical implementation notes

**This Area (API Design) - LOADED:**
[Full context below - 5 area notes, 3 active documents, 12 memories]

Use `search_context` to retrieve specific information from organization, team, or space levels when needed for your response.
```

### Generating the Catalog

```typescript
// src/lib/server/services/contextCatalog.ts

interface ContextCatalog {
  organization?: { name: string; counts: Record<string, number> };
  team?: { name: string; counts: Record<string, number> };
  space?: { name: string; counts: Record<string, number> };
  area: { name: string; fullContext: boolean };
}

export async function generateContextCatalog(
  userId: string,
  spaceId: string,
  areaId: string
): Promise<string> {
  // Count available context at each level
  const orgCounts = await countOrgContext(userId);
  const teamCounts = await countTeamContext(userId);
  const spaceCounts = await countSpaceContext(spaceId);

  // Format as concise summary
  return formatCatalog({
    organization: orgCounts,
    team: teamCounts,
    space: spaceCounts,
    area: { name: areaName, fullContext: true }
  });
}

function formatCatalog(catalog: ContextCatalog): string {
  let output = '## Available Context\n\n';
  output += 'Use `search_context` tool to retrieve specific information.\n\n';

  if (catalog.organization) {
    output += `**Organization (${catalog.organization.name}):**\n`;
    output += `- ${catalog.organization.counts.policies} policies\n`;
    output += `- ${catalog.organization.counts.guidelines} guidelines\n`;
    output += `- ${catalog.organization.counts.standards} standards\n\n`;
  }

  // ... similar for team, space

  output += `**This Area (${catalog.area.name}) - FULLY LOADED**\n`;

  return output;
}
```

---

## When to Use Each Tier

### Decision Matrix

| Query Type | Tier 1 (Upfront) | Tier 2 (Catalog) | Tier 3 (Tool) |
|------------|------------------|------------------|---------------|
| Simple question in current area | Sufficient | Reference only | Not needed |
| Question about area-specific fact | Sufficient | Reference only | Not needed |
| Question requiring org policy | Compliance rules only | Shows availability | **Fetch specific policy** |
| Cross-area question | Not available | Shows what exists | **Fetch from other area** |
| Question about team standards | Not available | Shows availability | **Fetch standards** |
| Complex multi-context question | Partial | Shows all sources | **Multiple fetches** |

### Example Flows

**Flow 1: Simple Query (No Tool Call)**
```
User: "What's the authentication method for our API?"
AI: [Checks upfront context - finds in area notes]
AI: "Based on the area notes, the API uses OAuth 2.0 with PKCE."
```

**Flow 2: Needs Org Context (Single Tool Call)**
```
User: "Can we store user emails in plain text?"
AI: [Checks upfront context - compliance rules mention GDPR but no specifics]
AI: [Calls search_context(query="data storage encryption requirements", scope="organization")]
Tool Result: "All PII must be encrypted at rest using AES-256..."
AI: "No, according to our data protection policy, all PII including emails must be encrypted at rest using AES-256."
```

**Flow 3: Cross-Context Query (Multiple Tool Calls)**
```
User: "How did we handle rate limiting in the Analytics API?"
AI: [Checks upfront context - this is API Design area, Analytics is different area]
AI: [Calls search_context(query="rate limiting implementation", scope="space")]
Tool Result: [Memories from Analytics area about rate limiting]
AI: "In the Analytics API, we implemented rate limiting with..."
```

---

## Implementation Phases

### Phase 1-2: Simple Upfront Loading
- Load all context upfront (context is still small)
- No tool-based loading yet
- Monitor context window usage

### Phase 3: Introduce Hybrid (Recommended Trigger Point)
When shared context causes total potential context to exceed **40K tokens**:
- Implement context catalog
- Add `search_context` tool
- Move team/space context to on-demand
- Keep critical compliance + area context upfront

### Phase 4: Full Hierarchy
When organizational context is live:
- Full catalog with all levels
- Sophisticated scope filtering
- Caching for frequently-accessed context
- Analytics on tool usage patterns

---

## Latency Considerations

### The Concern
Each tool call adds ~300-500ms latency. Won't this slow things down?

### The Reality
1. **Most queries don't need tool calls** - 80%+ have sufficient upfront context
2. **Parallel tool calls** - Can search multiple scopes simultaneously
3. **Streaming** - Start streaming response while tool calls complete
4. **Caching** - Frequently-accessed context stays warm

### Latency Budget

| Scenario | Expected Latency | Acceptable? |
|----------|------------------|-------------|
| No tool call needed | 0ms additional | Yes |
| Single tool call | +400ms | Yes |
| Two parallel tool calls | +500ms | Yes |
| Three+ sequential calls | +1200ms+ | Edge case, acceptable |

### Optimization Strategies

1. **Speculative loading** - Based on query keywords, pre-fetch likely-needed context
2. **Query classification** - Fast classifier determines if tool call likely needed
3. **Smart caching** - LRU cache for recent context retrievals
4. **Batch retrieval** - Single tool call can return multiple context types

---

## Monitoring & Analytics

### Key Metrics to Track

| Metric | Purpose | Target |
|--------|---------|--------|
| Tool call rate | How often is on-demand needed? | <20% of queries |
| Tool call latency (p95) | Performance impact | <500ms |
| Context retrieval relevance | Are we returning useful context? | >0.7 relevance score |
| Upfront context sufficiency | Is Tier 1 well-calibrated? | >80% queries |
| Token efficiency | Tokens used vs loaded | >60% utilization |

### Feedback Loop

```
Query → Response → User Feedback
          ↓
   Was tool call needed?
   Was retrieved context used?
   Did response quality improve?
          ↓
   Adjust: Tier 1 contents
           Catalog accuracy
           Tool descriptions
```

---

## Security Considerations

### Access Control
- Tool enforces same visibility rules as direct queries
- User can only search context they have permission to see
- Scope parameter is validated against user's memberships

### Audit Trail
- All tool calls logged with query, scope, results
- Enables compliance reporting on context access
- Helps debug "why didn't the AI know X?" questions

### Data Leakage Prevention
- Tool never returns context from other organizations
- Cross-space results require space membership
- Private memories only returned to owner

---

## Comparison: Upfront vs Hybrid vs Pure On-Demand

| Aspect | Upfront Only | Hybrid (Recommended) | Pure On-Demand |
|--------|--------------|----------------------|----------------|
| **Token efficiency** | Poor at scale | Good | Excellent |
| **Reliability** | High (always there) | High (critical upfront) | Medium (depends on tool use) |
| **Latency** | Lowest | Low-Medium | Variable |
| **Complexity** | Simple | Medium | High |
| **Scalability** | Poor | Good | Excellent |
| **Debugging** | Easy | Medium | Harder |
| **When to use** | Phase 1-2 | Phase 3+ | Extreme scale |

---

## Integration with CONTEXT_STRATEGY.md

This document extends the foundational architecture in `CONTEXT_STRATEGY.md`:

| CONTEXT_STRATEGY.md | This Document |
|---------------------|---------------|
| Defines memory hierarchy | Defines how to load it |
| Specifies schemas | Specifies retrieval patterns |
| Outlines phases | Details Phase 3+ implementation |
| What context exists | How context flows to LLM |

**Implementation sequence:**
1. Build memory infrastructure (CONTEXT_STRATEGY Phase 1)
2. Implement extraction pipeline (CONTEXT_STRATEGY Phase 2)
3. Add context catalog + search tool (this document)
4. Enable shared context with smart loading (CONTEXT_STRATEGY Phase 3)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01 | Hybrid over pure upfront | Scalability + performance at organizational scale |
| 2026-01 | Hybrid over pure on-demand | Critical context must always be present |
| 2026-01 | Context catalog pattern | AI needs to know what exists to ask for it |
| 2026-01 | Single search tool | Simplicity over multiple specialized tools |
| 2026-01 | Scope parameter | Allows targeted retrieval, reduces noise |
| 2026-01 | 40K token threshold | Trigger point for introducing hybrid loading |

---

## Next Steps

1. **Immediate:** Review and validate this architecture
2. **Phase 3 Prep:** Design context catalog generation
3. **Phase 3 Implementation:**
   - Add `search_context` tool to tool registry
   - Implement context search service
   - Generate catalog in context assembly
   - Monitor and tune thresholds

---

*This document should be updated as implementation progresses. The hybrid loading architecture is essential for scaling StratAI's context management to enterprise levels.*
