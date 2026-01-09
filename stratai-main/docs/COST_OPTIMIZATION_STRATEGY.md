# StratAI Cost Optimization Strategy

> **Document Purpose:** Comprehensive guide to reducing LLM costs across StratAI while maintaining quality. Based on January 2026 industry research combined with StratAI codebase analysis.
>
> **Created:** January 2026
> **Status:** Strategic Planning
> **Estimated Impact:** 50-85% cost reduction achievable

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Industry Research Findings](#industry-research-findings)
4. [StratAI-Specific Opportunities](#stratai-specific-opportunities)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Technical Specifications](#technical-specifications)
7. [Success Metrics](#success-metrics)
8. [Appendix: Research Sources](#appendix-research-sources)

---

## Executive Summary

### The Opportunity

LLM costs are the single largest variable expense for AI applications. Industry research (January 2026) shows that organizations implementing comprehensive optimization achieve **50-85% cost reduction** without quality degradation.

### Key Insight

The most impactful optimizations aren't exotic techniques - they're fundamental:

| Strategy | Savings | Implementation Effort |
|----------|---------|----------------------|
| **Prompt Caching** | 50-90% on cached content | Low |
| **Model Routing** | 40-70% via smart selection | Medium |
| **Batch APIs** | 50% automatic discount | Low |
| **Semantic Caching** | 40%+ on repeated queries | Medium |
| **Output Optimization** | 14-70% token reduction | Low |

### StratAI Advantage

StratAI's architecture is **naturally suited** for optimization:
- **Spaces/Areas** provide stable system prompts (ideal for caching)
- **Task Planning** is non-real-time (ideal for batch APIs)
- **Model Arena** generates preference data (ideal for training custom routers)
- **LiteLLM** already provides routing infrastructure

### Target Outcomes

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Cost per conversation | ~$0.15-0.50 | ~$0.03-0.10 | 3 months |
| Cache hit rate | ~10% (system only) | 60-80% | 1 month |
| Cheap model usage | 0% | 40-60% | 2 months |
| Output token efficiency | Baseline | +30% | 1 month |

---

## Current State Analysis

### What We Have (Already Implemented)

#### 1. Anthropic Prompt Caching
**Location:** `src/routes/api/chat/+server.ts` (lines 76-168)

```typescript
function shouldUseCacheControl(model: string): boolean {
    const lowerModel = model.toLowerCase();
    return lowerModel.includes('claude') || lowerModel.includes('anthropic');
}
```

**Current Strategy:**
- System message always cached
- Last 3 conversation messages cached
- Maximum 4 cache breakpoints (Anthropic limit)

**Gap:** Only enabled for Claude models. OpenAI has automatic caching but we're not optimizing for it.

#### 2. Tool Result Caching
**Location:** `src/lib/server/persistence/tool-cache-postgres.ts`

- Caches `read_document` tool results
- TTL: 1 hour
- Scope: Per-conversation

**Gap:** Cache scope is conversation-level, not task-level. Same document read across multiple planning conversations wastes tokens.

#### 3. Usage Tracking
**Location:** `src/lib/server/persistence/usage-postgres.ts`

- Tracks all token usage with costs
- Includes cache metrics (creation, read tokens)
- Per-model, per-user, per-conversation analytics

**Gap:** No alerting, no budget enforcement, no optimization recommendations.

#### 4. Model Pricing
**Location:** `src/lib/config/model-pricing.ts`

Comprehensive pricing with cache read costs at 10% of input:
```typescript
'claude-opus-4-5': { input: 1500, output: 7500, cacheRead: 150 },
'claude-sonnet-4': { input: 300, output: 1500, cacheRead: 30 },
'claude-haiku-4-5': { input: 80, output: 400, cacheRead: 8 },
'gpt-4o-mini': { input: 15, output: 60 },
'gemini-2.5-flash': { input: 8, output: 30 },
```

**Observation:** Haiku is 19x cheaper than Opus. GPT-4o-mini is 100x cheaper than Opus. Flash is 188x cheaper.

### What We're Missing

| Capability | Impact | Status |
|------------|--------|--------|
| GPT/Gemini cache optimization | 10-15% | Not implemented |
| Model routing/cascading | 40-70% | Not implemented |
| Batch API usage | 50% | Not implemented |
| Semantic caching | 40%+ | Not implemented |
| Prompt compression | 20-80% | Not implemented |
| Output token control | 14-70% | Partially (no enforcement) |

---

## Industry Research Findings

### 1. Prompt Caching (90% savings on cache reads)

#### Provider Comparison (January 2026)

| Provider | Activation | Min Tokens | Cache TTL | Write Cost | Read Cost |
|----------|-----------|------------|-----------|------------|-----------|
| **Anthropic** | Explicit (`cache_control`) | 1,024 | 5 min (default) | +25% | **90% off** |
| **OpenAI** | Automatic | 1,024 | 5-10 min | Free | **50% off** |
| **Google** | Implicit + Explicit | 2,048 | Configurable | Variable | **75-90% off** |
| **AWS Bedrock** | Explicit | 1,024 (Claude) | 5 min | +25% | **90% off** |

**Key Finding:** Anthropic's explicit caching with 90% read discount is the most impactful when properly structured.

**Best Practices:**
1. Place stable content FIRST (system prompts, space context)
2. Place dynamic content LAST (user query)
3. Break-even: 2 cache hits covers write premium
4. Structure prompts consistently for cache reuse

### 2. Model Routing & Cascading (40-85% savings)

#### The Data

| Approach | Savings | Quality Retention |
|----------|---------|-------------------|
| RouteLLM (matrix factorization) | 85% | 95% GPT-4 quality |
| Simple query routing | 40-60% | 98%+ |
| Cascade with fallback | 60-85% | 95-99% |

**Key Finding:** 60-70% of queries can be handled by cheap models (Haiku, GPT-4o-mini, Flash) with no quality loss.

**Routing Signals:**
- Query length (short = simple)
- Task type (summarization, Q&A = cheap; reasoning, creative = expensive)
- Keyword patterns (code, legal, medical = upgrade)
- User feedback history

### 3. Batch APIs (50% automatic discount)

#### When to Use

| Provider | Discount | SLA | Best For |
|----------|----------|-----|----------|
| OpenAI Batch | 50% | 24 hours | Evaluations, classification, synthetic data |
| Anthropic Message Batches | 50% | 24 hours | Document processing, bulk analysis |

**StratAI Applications:**
- Task planning (non-real-time phases)
- Document summarization
- Arena battle judging (bulk)
- Background analysis

### 4. Semantic Caching (40%+ on hits)

**Key Finding:** Over 30% of LLM queries are semantically similar. Semantic caching returns cached responses for similar (not identical) queries.

**Tools:**
- GPTCache (open source, integrates with LangChain)
- Redis Semantic Cache (enterprise)

**StratAI Applications:**
- Quick start suggestions
- Common planning questions
- Repeated task patterns across users

### 5. Prompt Compression (80-95% savings on long contexts)

#### LLMLingua-2 (State of the Art)

- **Compression:** Up to 20x with 1.5% performance loss
- **Speed:** 3-6x faster than original
- **Use Case:** Long document context

#### Chain-of-Draft (CoD)

- **Savings:** 68-92% token reduction vs Chain-of-Thought
- **Approach:** Limit reasoning steps to ~5 words each
- **Use Case:** Reasoning tasks where CoT is needed

### 6. Output Token Optimization (14-70% savings)

#### Token-Efficient Tools (Claude)

```python
# Enable for Claude 3.7+
anthropic.beta.messages.create(
    extra_headers={"anthropic-beta": "token-efficient-tools-2025-02-19"},
    ...
)
```

**Savings:** 14-70% reduction in output tokens for tool use.

#### Max Tokens by Task Type

| Use Case | Recommended max_tokens |
|----------|----------------------|
| Simple Q&A | 150-300 |
| Code snippets | 500-1000 |
| Document summary | 300-800 |
| Task planning | 1000-2000 |
| Full document generation | 2000-4000 |

**Key Insight:** Output tokens cost 3-10x more than input. Controlling output length has outsized impact.

---

## StratAI-Specific Opportunities

### Opportunity Matrix

| Opportunity | Location | Savings | Effort | Priority |
|-------------|----------|---------|--------|----------|
| System prompt caching structure | `system-prompts.ts` | 25-30% | Low | **CRITICAL** |
| Enable GPT/Gemini caching | `chat/+server.ts:76-79` | 10-15% | Low | **CRITICAL** |
| Model cascading | New routing layer | 40-60% | Medium | **HIGH** |
| Task-level doc caching | `tool-cache-postgres.ts` | 15-25% | Low | **HIGH** |
| Token-efficient tools header | `litellm.ts` | 14-70% | Low | **HIGH** |
| Batch API for planning | `chat/+server.ts` | 50% | Medium | **MEDIUM** |
| Semantic caching layer | New infrastructure | 40%+ | High | **MEDIUM** |
| Prompt compression | New pipeline | 20-80% | High | **FUTURE** |

### Detailed Analysis

#### 1. System Prompt Caching Structure (25-30% savings)

**Current State:**
```
src/lib/config/system-prompts.ts

CLAUDE_4_PROMPT: ~180 tokens (stable)
GPT_5_PROMPT: ~200 tokens (stable)
Space context: ~100-150 tokens (stable per space)
Focus area context: ~500-5000 tokens (variable)
Plan mode context: ~1200-2000 tokens (stable per phase)
```

**Problem:** These prompts are regenerated per request. Even though we cache them in Anthropic's infrastructure, we're not structuring them optimally.

**Solution:** Pre-compose prompt variants, mark stable sections, ensure consistent ordering.

**Implementation:**
```typescript
// Create cacheable prompt template
const CACHED_SYSTEM_PROMPT_TEMPLATE = {
    platform: CLAUDE_4_PROMPT,  // Always first, always stable
    // Space context injected here (stable per space)
    // Area context injected here (stable per area)
    // Dynamic user context LAST
};
```

#### 2. Enable GPT/Gemini Cache Optimization (10-15% savings)

**Current State (line 76-79):**
```typescript
function shouldUseCacheControl(model: string): boolean {
    const lowerModel = model.toLowerCase();
    return lowerModel.includes('claude') || lowerModel.includes('anthropic');
}
```

**Problem:** OpenAI has automatic caching for prompts >1024 tokens, but we're not structuring prompts to maximize hits.

**Solution:** Structure all prompts with stable content first, regardless of provider.

#### 3. Model Cascading (40-60% savings)

**Current State:** User selects model, no optimization.

**Opportunity:**
```
Query Classifier
    ↓
┌─────────────┬─────────────┬─────────────┐
│   Simple    │   Medium    │   Complex   │
│   (Haiku)   │  (Sonnet)   │   (Opus)    │
│   $0.80/M   │   $3/M      │   $15/M     │
└─────────────┴─────────────┴─────────────┘
```

**Routing Heuristics:**
- **Simple (→ Haiku/Flash):** Short queries (<50 tokens), simple Q&A, formatting requests
- **Medium (→ Sonnet):** Code generation, document analysis, most task planning
- **Complex (→ Opus):** Multi-step reasoning, creative writing, complex code review

**StratAI-Specific Signals:**
- Space type: Work → Medium, Research → Complex, Random → Simple
- Task planning phase: Eliciting → Simple, Proposing → Medium, Confirming → Simple
- Quick start type: Can inform expected complexity

#### 4. Task-Level Document Caching (15-25% savings)

**Current State (`tool-cache-postgres.ts`):**
```typescript
// Cache key is per-conversation
const cacheKey = hashParams('read_document', { conversationId, documentId });
```

**Problem:** Same document read multiple times across planning conversations for the same task.

**Solution:** Change cache scope to task-level:
```typescript
const cacheKey = hashParams('read_document', { taskId, documentId });
```

**Impact:** 5-10 document reads per planning session × 500-2000 tokens = 2,500-20,000 tokens saved per task.

#### 5. Token-Efficient Tools Header (14-70% savings)

**Current State:** Not enabled.

**Solution:** Add header for Claude requests with tool use:
```typescript
// In litellm.ts
if (model.includes('claude') && tools?.length > 0) {
    headers['anthropic-beta'] = 'token-efficient-tools-2025-02-19';
}
```

#### 6. Batch API for Non-Interactive Work (50% savings)

**Candidates for Batch Processing:**
- Task planning "Help me plan this" initial analysis
- Document summarization
- Arena battle judging (bulk)
- Background context refresh

**Implementation:** Queue eligible requests, process in batches.

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1-2)

**Estimated Savings: 25-40%**

| Task | File | Change |
|------|------|--------|
| Add token-efficient tools header | `litellm.ts` | Add header for Claude tool requests |
| Restructure prompts for caching | `system-prompts.ts` | Stable content first, consistent ordering |
| Task-level doc caching | `tool-cache-postgres.ts` | Change cache key from conversationId to taskId |
| Add max_tokens by endpoint | `chat/+server.ts` | Set appropriate limits per request type |

**Token-Efficient Tools Implementation:**
```typescript
// src/lib/server/litellm.ts
export async function createChatCompletionWithTools(
    options: ChatCompletionRequest & { tools: ToolDefinition[] }
) {
    const headers: Record<string, string> = {};

    if (options.model.toLowerCase().includes('claude')) {
        headers['anthropic-beta'] = 'token-efficient-tools-2025-02-19';
    }

    // ... rest of implementation
}
```

### Phase 2: Model Routing (Week 3-4)

**Estimated Savings: Additional 30-50%**

| Task | Approach |
|------|----------|
| Query classifier | Simple heuristics first (length, keywords) |
| Routing integration | Hook into LiteLLM routing |
| User override | Allow explicit model selection to bypass routing |
| Monitoring | Track routing decisions and outcomes |

**Simple Routing Heuristics:**
```typescript
function selectModel(query: string, context: RoutingContext): string {
    const queryTokens = estimateTokens(query);

    // Very short queries → cheapest model
    if (queryTokens < 50 && !context.requiresReasoning) {
        return 'claude-haiku-4-5';
    }

    // Code-related → mid-tier
    if (containsCodePatterns(query)) {
        return 'claude-sonnet-4';
    }

    // Complex reasoning keywords → top-tier
    if (containsComplexitySignals(query)) {
        return context.preferredModel || 'claude-opus-4-5';
    }

    // Default to mid-tier
    return 'claude-sonnet-4';
}
```

### Phase 3: Batch & Semantic Caching (Week 5-8)

**Estimated Savings: Additional 20-30%**

| Task | Approach |
|------|----------|
| Batch API queue | Queue non-urgent requests for batch processing |
| Semantic cache | Implement GPTCache or Redis vector store |
| Cache warming | Pre-cache common quick start responses |

### Phase 4: Advanced Optimization (Month 3+)

| Task | Approach |
|------|----------|
| Custom router training | Train on Arena preference data |
| Prompt compression | Implement LLMLingua for long documents |
| Predictive pre-computation | Pre-generate likely responses |

---

## Technical Specifications

### Prompt Structure for Optimal Caching

```
┌─────────────────────────────────────────────────────────┐
│ CACHE BLOCK 1: Platform Prompt (stable, ~200 tokens)    │
│ - Model-specific guidelines                              │
│ - Response format instructions                           │
├─────────────────────────────────────────────────────────┤
│ CACHE BLOCK 2: Space Context (stable per space)         │
│ - Space description                                      │
│ - Space-level documents (summarized)                     │
├─────────────────────────────────────────────────────────┤
│ CACHE BLOCK 3: Area Context (stable per area)           │
│ - Area description                                       │
│ - Area notes                                             │
├─────────────────────────────────────────────────────────┤
│ CACHE BLOCK 4: Conversation History (up to limit)       │
│ - Recent messages                                        │
├─────────────────────────────────────────────────────────┤
│ DYNAMIC: Current User Message (never cached)            │
└─────────────────────────────────────────────────────────┘
```

### Model Routing Decision Tree

```
                    ┌──────────────────┐
                    │  Incoming Query  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ User Override?   │
                    │ (explicit model) │
                    └────────┬─────────┘
                             │ No
                    ┌────────▼─────────┐
                    │ Query Length     │
                    │ < 50 tokens?     │
                    └────────┬─────────┘
                        Yes  │  No
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐           ┌────────▼────────┐
     │ HAIKU/FLASH     │           │ Code Patterns?  │
     │ ($0.08-0.80/M)  │           └────────┬────────┘
     └─────────────────┘               Yes  │  No
                                 ┌──────────┴──────────┐
                                 │                     │
                        ┌────────▼────────┐   ┌────────▼────────┐
                        │ SONNET          │   │ Complexity      │
                        │ ($3/M)          │   │ Signals?        │
                        └─────────────────┘   └────────┬────────┘
                                                  Yes  │  No
                                           ┌───────────┴───────────┐
                                           │                       │
                                  ┌────────▼────────┐     ┌────────▼────────┐
                                  │ OPUS            │     │ SONNET          │
                                  │ ($15/M)         │     │ ($3/M)          │
                                  └─────────────────┘     └─────────────────┘
```

### Batch API Integration

```typescript
interface BatchRequest {
    id: string;
    type: 'planning' | 'summary' | 'analysis';
    payload: ChatCompletionRequest;
    callback: (response: ChatCompletionResponse) => void;
    priority: 'normal' | 'low';
    createdAt: Date;
}

class BatchQueue {
    private queue: BatchRequest[] = [];
    private readonly MAX_BATCH_SIZE = 100;
    private readonly MAX_WAIT_MS = 60000; // 1 minute

    async add(request: BatchRequest): Promise<void> {
        this.queue.push(request);

        if (this.queue.length >= this.MAX_BATCH_SIZE) {
            await this.flush();
        }
    }

    async flush(): Promise<void> {
        const batch = this.queue.splice(0, this.MAX_BATCH_SIZE);
        // Submit to Anthropic/OpenAI Batch API
        // Process responses when ready
    }
}
```

### Semantic Cache Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Query                          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Embed Query (text-embedding-3-small)       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Vector Similarity Search (pgvector)           │
│           Threshold: 0.85 cosine similarity             │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         Hit (>0.85)           Miss (<0.85)
              │                     │
              ▼                     ▼
┌─────────────────────┐   ┌─────────────────────┐
│ Return Cached       │   │ Call LLM            │
│ Response            │   │ Cache Response      │
│ (0ms latency)       │   │ (normal latency)    │
└─────────────────────┘   └─────────────────────┘
```

---

## Success Metrics

### Primary Metrics

| Metric | Current | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|---------|----------------|----------------|----------------|
| **Cost per 1K messages** | $150-500 | $100-350 | $50-150 | $30-100 |
| **Cache hit rate** | ~10% | 40% | 60% | 75% |
| **Cheap model usage** | 0% | 20% | 40% | 50% |
| **Avg output tokens** | Baseline | -15% | -25% | -30% |
| **P95 latency** | Baseline | Maintained | Maintained | Maintained |

### Tracking Dashboard

```sql
-- Daily cost optimization metrics
SELECT
    DATE(created_at) as date,
    SUM(estimated_cost_millicents) / 100.0 as total_cost_cents,
    SUM(cache_read_tokens)::float / NULLIF(SUM(prompt_tokens), 0) as cache_hit_rate,
    AVG(completion_tokens) as avg_output_tokens,
    COUNT(CASE WHEN model LIKE '%haiku%' OR model LIKE '%mini%' OR model LIKE '%flash%' THEN 1 END)::float
        / COUNT(*) as cheap_model_rate
FROM usage_records
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Alerting Thresholds

| Alert | Threshold | Action |
|-------|-----------|--------|
| Daily cost spike | >150% of 7-day avg | Investigate |
| Cache hit rate drop | <30% | Check prompt structure |
| Output token spike | >50% increase | Review responses |
| Expensive model overuse | >40% Opus | Adjust routing |

---

## Appendix: Research Sources

### Prompt Caching
- [Anthropic Prompt Caching Documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [OpenAI Prompt Caching Guide](https://platform.openai.com/docs/guides/prompt-caching)
- [Prompt Caching: From $720 to $72 Monthly](https://medium.com/@labeveryday)

### Model Routing
- [RouteLLM: Open-Source Cost-Effective LLM Routing](https://lmsys.org/blog/2024-07-01-routellm/)
- [RouteLLM GitHub](https://github.com/lm-sys/RouteLLM)
- [Martian Model Routing](https://withmartian.com/)
- [Not Diamond Automatic Routing](https://www.notdiamond.ai/)

### Prompt Compression
- [LLMLingua GitHub](https://github.com/microsoft/LLMLingua)
- [Chain of Draft Paper](https://arxiv.org/abs/2502.18600)
- [LLMLingua-2 Paper](https://arxiv.org/abs/2403.12968)

### Caching Strategies
- [GPTCache GitHub](https://github.com/zilliztech/GPTCache)
- [Redis Semantic Caching](https://redis.io/blog/what-is-semantic-caching/)
- [Semantic Caching Cut Costs by 40%](https://dev.to/kuldeep_paul/semantic-caching-cut-our-llm-costs-by-40-4383)

### Provider Economics
- [LLM API Pricing Comparison 2026](https://www.cloudidr.com/llm-pricing)
- [LLM Inference Price Trends](https://epoch.ai/data-insights/llm-inference-price-trends)
- [OpenAI Batch API Pricing](https://platform.openai.com/docs/guides/batch)

### Output Optimization
- [Token-Efficient Tools - Anthropic](https://claude.com/blog/token-saving-updates)
- [TOON vs JSON Token Optimization](https://www.tensorlake.ai/blog/toon-vs-json)
- [Structured Outputs Guide](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

### Inference Optimization
- [vLLM Documentation](https://docs.vllm.ai/)
- [SGLang GitHub](https://github.com/sgl-project/sglang)
- [Speculative Decoding - NVIDIA](https://developer.nvidia.com/blog/an-introduction-to-speculative-decoding-for-reducing-latency-in-ai-inference/)

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Phase approach | Quick wins first build momentum, defer complex work | Jan 2026 |
| Haiku/Flash for simple queries | 19-188x cheaper, sufficient quality for short queries | Jan 2026 |
| Task-level doc caching | Documents don't change within task lifetime | Jan 2026 |
| Semantic cache threshold 0.85 | Balance between hit rate and false positives | Jan 2026 |
| GPTCache over custom | Mature solution, LangChain integration | Jan 2026 |

---

## Summary

StratAI can achieve **50-85% cost reduction** through systematic optimization:

1. **Phase 1 (Quick Wins):** Token-efficient tools, prompt restructuring, task-level caching → 25-40% savings
2. **Phase 2 (Model Routing):** Smart model selection based on query complexity → Additional 30-50% savings
3. **Phase 3 (Batch & Semantic):** Batch APIs, semantic caching → Additional 20-30% savings

The compound effect of these optimizations transforms StratAI's unit economics from ~$0.15-0.50 per conversation to ~$0.03-0.10 per conversation.

---

*This document should be reviewed monthly and updated as provider capabilities and pricing evolve.*
