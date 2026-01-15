# Auto Model Routing Research & Strategy

> **Status**: ✅ Implementation Complete (Phases 1-4)
> **Last Updated**: 2026-01-11
> **Implementation**: See [Implementation Details](#implementation-details-complete) section below

---

## Executive Summary

This document captures research findings on intelligent LLM model routing - automatically selecting the optimal model based on conversation context rather than forcing users to choose manually.

**Key Insight**: No single LLM is universally optimal. Research consistently shows that intelligent routing to specialized models beats any single model, with potential **cost savings of 2-5x without quality degradation**.

**Implemented Approach**: Hybrid system combining:
1. **Context-aware routing** for Spaces, Areas, and task types
2. **Query complexity analysis** with weighted signal detection
3. **Cache coherence** to prevent model downgrades in ongoing conversations
4. **Analytics tracking** for routing decisions and cost optimization

---

## Problem Statement

### Current State
- Users must manually select models or accept a default
- Users often don't know which model is best for their task
- Defaulting to cheapest model leaves quality on the table
- Defaulting to best model wastes money on simple queries

### Desired State
- "Auto" model option that intelligently routes based on context
- Transparent reasoning (user understands why a model was chosen)
- Override capability (user can force a different model)
- Cost optimization without sacrificing quality

### Business Value
- **Cost reduction**: 2-5x savings on LLM spend
- **Quality improvement**: Right model for each task
- **UX improvement**: Users don't need to understand model differences
- **Enterprise differentiator**: Intelligent governance at work

---

## Industry Research (January 2026)

### Leading Approaches

#### 1. Rule-Based Routing
**How it works**: Keyword matching, task type detection, explicit signals

| Pros | Cons |
|------|------|
| Zero latency overhead | Brittle, misses nuance |
| Predictable behavior | Maintenance burden |
| Easy to debug | Doesn't handle ambiguity |
| No additional cost | Limited accuracy |

**Best for**: Clear-cut cases, enterprise policy enforcement, context-rich environments

#### 2. Embedding-Based Semantic Routing
**How it works**: Convert prompt to vector embedding, compare to pre-computed task cluster centroids using cosine similarity

| Pros | Cons |
|------|------|
| Fast (~50ms) | Requires embedding model |
| Scalable to many categories | Need to build/maintain clusters |
| Handles nuance well | Initial setup complexity |
| No LLM call required | Cold start problem |

**Best for**: General queries, ambiguous inputs, scaling to many task types

**Implementation pattern** (from Red Hat):
```
1. Extract user prompt
2. Convert to embeddings (BERT/ada-002)
3. Compare to task vector centroids
4. Route based on similarity score + confidence
```

#### 3. Classifier Model Routing
**How it works**: Small model (BERT, Haiku) classifies the task type

| Pros | Cons |
|------|------|
| More intelligent than rules | Adds ~100-200ms latency |
| Handles complex queries | Additional cost per request |
| Can explain decisions | Training data required |

**Best for**: Complex classification needs, when embedding clusters aren't sufficient

#### 4. Meta-Model / LLM-as-Router
**How it works**: Use an LLM to analyze the prompt and decide routing

| Pros | Cons |
|------|------|
| Most intelligent | Highest latency (500ms+) |
| Can reason about edge cases | Additional cost |
| Natural language explanations | Overkill for most cases |

**Best for**: Very high-stakes decisions, edge cases, when cost is not a concern

#### 5. Cascading / Escalation
**How it works**: Start with cheap model, escalate if quality metrics not met

| Pros | Cons |
|------|------|
| Cost-effective for simple queries | Slower for complex queries |
| Self-correcting | Needs quality detection |
| Simple to implement | May frustrate users on complex tasks |

**Best for**: High-volume, mixed-complexity workloads

### Industry Players

#### OpenRouter Auto
- **Approach**: Meta-model analyzes prompt, routes to optimal model
- **Features**: `:floor` (cheapest), `:nitro` (fastest) shortcuts
- **Customization**: Wildcard patterns to restrict model pool (e.g., `anthropic/*`)
- **URL**: https://openrouter.ai/docs/guides/features/routers/auto-router

#### Martian
- **Approach**: Predicts model behavior by understanding model internals
- **Claims**: 98% cost savings possible
- **Techniques**: Model compression, quantization, distillation
- **Users**: 300+ companies including Amazon, Zapier
- **Investment**: $9M from NEA, General Catalyst, backed by Accenture
- **URL**: https://withmartian.com/

#### Not Diamond
- **Approach**: Custom router training on your evaluation data
- **Philosophy**: "Network of specialized models beats single all-powerful model"
- **Features**: Personalized routing, prompt adaptation between models
- **Differentiator**: Not a proxy - gives recommendations, you make the call
- **URL**: https://www.notdiamond.ai/

#### RouteLLM (LMSYS)
- **Approach**: Open-source framework, routes between strong/weak models
- **Results**: 85% cost reduction on MT Bench, 45% on MMLU at 95% quality
- **Methods**: Matrix factorization, BERT classifier, weighted Elo
- **Publication**: ICLR 2025
- **GitHub**: https://github.com/lm-sys/RouteLLM

### Key Research Papers

1. **RouteLLM** (ICLR 2025) - arXiv:2406.18665
   - Framework for learning routers from preference data
   - Transfer learning between model pairs

2. **OptiRoute** (Feb 2025) - arXiv:2502.16696
   - Dynamic routing based on user preferences
   - Balances performance, cost, and ethics
   - Hybrid kNN + hierarchical filtering

---

## Model Capabilities Matrix (2025-2026)

### Performance Benchmarks

| Model | Coding (SWE-bench) | Reasoning (ARC-AGI) | Speed (tok/s) | Context |
|-------|-------------------|---------------------|---------------|---------|
| Claude Opus 4.5 | **80.9%** | Good | 49 | 200K |
| Claude Sonnet 4 | 72% | Good | ~100 | 200K |
| Claude Haiku 4.5 | 60% | Moderate | ~200 | 200K |
| GPT-5.2 | 75% | **90%** | **187** | 128K |
| GPT-4o | 65% | Good | 150 | 128K |
| Gemini 3 Pro | 76.8% | Good | 120 | 1M |
| DeepSeek V3 | 73.1% | Good | 100 | 64K |

### Cost Per 1M Tokens (USD)

| Model | Input | Output | Cached Input |
|-------|-------|--------|--------------|
| Claude Haiku 4.5 | $1 | $5 | $0.10 |
| Claude Sonnet 4 | $3 | $15 | $0.30 |
| Claude Opus 4.5 | $5 | $25 | $0.50 |
| GPT-4o | $2.50 | $10 | - |
| GPT-4o-mini | $0.15 | $0.60 | - |
| Gemini 3 Pro | $3.50 | $10.50 | - |
| DeepSeek V3 | $0.14 | $0.28 | - |

### Model Specializations

| Task Type | Recommended Models | Rationale |
|-----------|-------------------|-----------|
| **Code Generation** | Opus 4.5, Sonnet 4 | Best SWE-bench scores |
| **Code Review/Debug** | Sonnet 4, GPT-4o | Good balance of quality/cost |
| **Complex Reasoning** | GPT-5.2, Opus 4.5 | ARC-AGI leaders |
| **Math/Logic** | GPT-5.2, Sonnet 4 | Strong on GSM8K, MATH |
| **Creative Writing** | Opus 4.5, GPT-5 | Best prose quality |
| **Simple Q&A** | Haiku, GPT-4o-mini | Fast, cheap, sufficient |
| **Long Documents** | Gemini 3, Claude | Best context handling |
| **Real-time Chat** | GPT-5.2, Haiku | Speed priority |
| **Analysis/Research** | Sonnet 4, GPT-4o | Good reasoning, reasonable cost |
| **Translation** | GPT-4o, Gemini | Strong multilingual |

---

## Recommended StratAI Implementation

### Architecture: Hybrid Tiered Approach

```
┌─────────────────────────────────────────────────────────────┐
│                      User Query                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: Explicit Context Rules (0ms)                       │
│  ─────────────────────────────────────────────────────────  │
│  • Space context (coding space → coding models)             │
│  • Area context (specific model locked)                     │
│  • Task type (planning mode → reasoning models)             │
│  • Enterprise policy (sensitive data → approved models)     │
└─────────────────────────────────────────────────────────────┘
                              │
                    No explicit match?
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 2: Fast Signal Detection (0ms)                        │
│  ─────────────────────────────────────────────────────────  │
│  • Code patterns (```, file extensions, syntax)             │
│  • Simple query detection (greetings, short questions)      │
│  • Document presence (long context needed)                  │
│  • Keywords (analyze, create, fix, explain, etc.)           │
└─────────────────────────────────────────────────────────────┘
                              │
                    Low confidence?
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 3: Embedding Classification (~50ms)                   │
│  ─────────────────────────────────────────────────────────  │
│  • Generate embedding of user message                       │
│  • Compare to task cluster centroids                        │
│  • Select model based on cluster + confidence               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 4: User Preference Adjustment                         │
│  ─────────────────────────────────────────────────────────  │
│  • Check user's historical model preferences                │
│  • Adjust selection based on past behavior                  │
│  • Factor in organization defaults                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     Selected Model
```

### Tier 1: Explicit Context Rules

**Rationale**: StratAI's Spaces and Areas architecture provides rich context that should override generic routing. Users who configure a Space for coding expect coding-optimized models.

```typescript
interface ContextRules {
  // Space-level defaults
  spaceModelPreferences: {
    spaceType: 'coding' | 'writing' | 'research' | 'general';
    preferredModels: string[];
    avoidModels: string[];
  };

  // Area-level overrides (most specific wins)
  areaModelLock?: string;  // Explicit model lock
  areaTaskType?: TaskType; // Inferred from area purpose

  // Task mode overrides
  planningMode: boolean;   // Planning needs reasoning models
  assistMode: boolean;     // Assist context affects choice

  // Enterprise policy
  sensitiveDataDetected: boolean;
  approvedModelsOnly: string[];
}
```

**Space Type → Model Mapping**:

| Space Type | Primary Model | Fallback | Rationale |
|------------|--------------|----------|-----------|
| Coding | Sonnet 4 | Opus 4.5 | Best coding benchmarks |
| Writing | Opus 4.5 | Sonnet 4 | Best prose quality |
| Research | Sonnet 4 | GPT-4o | Good analysis, reasonable cost |
| General | Sonnet 4 | Haiku | Balanced default |

### Tier 2: Fast Signal Detection

**Rationale**: Many queries have obvious signals that don't need embedding analysis. Catching these early saves latency.

```typescript
interface SignalDetection {
  // Code detection
  hasCodeBlocks: boolean;        // ``` patterns
  hasFileExtensions: boolean;    // .ts, .py, .js, etc.
  hasSyntaxKeywords: boolean;    // function, class, import, etc.

  // Simple query detection
  isGreeting: boolean;           // hi, hello, hey
  isShortQuestion: boolean;      // < 20 words, ends with ?
  isFollowUp: boolean;           // references previous message

  // Complexity signals
  hasDocuments: boolean;         // Long context needed
  conversationLength: number;    // Long conversations need good context
  estimatedTokens: number;       // Large prompts need capable models

  // Task keywords
  detectedIntent: 'create' | 'fix' | 'explain' | 'analyze' | 'review' | null;
}
```

**Signal → Model Rules**:

| Signal | Model Selection |
|--------|-----------------|
| Code blocks + "fix" | Sonnet 4 (coding specialist) |
| Code blocks + "review" | Sonnet 4 or Opus (thorough review) |
| Greeting only | Haiku (fast, cheap) |
| Short factual question | Haiku or GPT-4o-mini |
| "analyze" + documents | Sonnet 4 (good reasoning) |
| Long conversation (20+ turns) | Claude models (best context) |
| "plan" or "strategy" | Opus 4.5 or GPT-5.2 (reasoning) |

### Tier 3: Embedding Classification

**Rationale**: For ambiguous queries, semantic understanding provides the best routing accuracy without the cost of an LLM call.

**Task Clusters**:

| Cluster | Example Prompts | Preferred Models |
|---------|-----------------|------------------|
| `coding` | "Write a function to...", "Debug this error" | Sonnet 4, Opus 4.5 |
| `analysis` | "Analyze the trends in...", "What does this data show" | Sonnet 4, GPT-4o |
| `creative` | "Write a story about...", "Create marketing copy" | Opus 4.5, GPT-5 |
| `simple_qa` | "What is the capital of...", "Define..." | Haiku, GPT-4o-mini |
| `research` | "Compare the pros and cons...", "Summarize..." | Sonnet 4, GPT-4o |
| `math_logic` | "Solve this equation...", "Prove that..." | GPT-5.2, Sonnet 4 |
| `translation` | "Translate to...", text in foreign language | GPT-4o, Gemini |

**Implementation Options**:

1. **OpenAI text-embedding-3-small** ($0.02/1M tokens, fast)
2. **Local BERT model** (free, ~50ms, self-hosted)
3. **Sentence-transformers** (free, open-source)

**Cluster Centroid Storage**:
- Pre-compute embeddings for 50-100 example prompts per cluster
- Store centroid (average) for each cluster
- Runtime: embed query → cosine similarity to each centroid → highest match

### Tier 4: User Preference Learning

**Rationale**: Users develop preferences over time. Learning from their behavior improves satisfaction.

**Signals to Track**:
- Manual model selections (explicit preference)
- Conversation length after routing (engagement)
- Regeneration requests (dissatisfaction signal)
- Rating feedback if implemented

**Personalization Logic**:
```typescript
// If user frequently overrides to a specific model, prefer it
if (userOverrideFrequency[model] > 0.3) {
  boostScore(model, 0.2);
}

// If user has long conversations with a model, they like it
if (avgConversationLength[model] > 10) {
  boostScore(model, 0.1);
}
```

---

## UI/UX Considerations

### Model Picker Integration

Current model picker shows explicit models. Add "Auto" as the **default** option:

```
┌─────────────────────────────────┐
│ Model: Auto (recommended)    ▼  │
├─────────────────────────────────┤
│ ✓ Auto (recommended)            │
│   ├─ Picks best model for task  │
│   └─ Balances quality & cost    │
│ ─────────────────────────────── │
│   Claude Opus 4.5               │
│   Claude Sonnet 4               │
│   Claude Haiku 4.5              │
│   GPT-5.2                       │
│   GPT-4o                        │
│   ...                           │
└─────────────────────────────────┘
```

### Transparency: Show Selected Model

After routing, show which model was selected and why:

```
┌─────────────────────────────────────────────────┐
│ 🤖 Using Claude Sonnet 4                        │
│    Detected: Code generation task               │
│    [Change model]                               │
└─────────────────────────────────────────────────┘
```

Or more subtle in the message header:
```
Claude Sonnet 4 (auto-selected for coding)
```

### Override Capability

Users should always be able to:
1. Change model mid-conversation
2. Set preferences per Space/Area
3. Disable Auto and always use specific model

---

## Data Structures

### Model Capabilities Config

```typescript
// src/lib/config/model-routing.ts

interface ModelCapability {
  id: string;                    // e.g., 'claude-sonnet-4-20250514'
  displayName: string;           // e.g., 'Claude Sonnet 4'
  provider: 'anthropic' | 'openai' | 'google' | 'other';

  // Capability scores (0-100)
  capabilities: {
    coding: number;              // SWE-bench aligned
    reasoning: number;           // ARC-AGI aligned
    creative: number;            // Human eval aligned
    speed: number;               // Inverse of latency
    contextHandling: number;     // Long context quality
    instruction: number;         // Instruction following
  };

  // Cost info
  costPer1kTokens: {
    input: number;
    output: number;
    cachedInput?: number;
  };

  // Constraints
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;

  // Routing hints
  bestFor: TaskType[];
  avoidFor: TaskType[];
}

type TaskType =
  | 'coding'
  | 'code_review'
  | 'debugging'
  | 'analysis'
  | 'creative_writing'
  | 'simple_qa'
  | 'research'
  | 'math'
  | 'translation'
  | 'summarization'
  | 'planning';
```

### Task Cluster Definition

```typescript
interface TaskCluster {
  name: TaskType;
  description: string;

  // For embedding-based matching
  examplePrompts: string[];      // 50-100 examples
  centroidEmbedding?: number[];  // Pre-computed average

  // For keyword-based fast matching
  keywords: string[];
  patterns: RegExp[];

  // Model preferences for this cluster
  preferredModels: string[];     // Ordered by preference
  costTier: 'economy' | 'standard' | 'premium';
}
```

### Routing Decision Record

```typescript
interface RoutingDecision {
  // Input context
  conversationId: string;
  userId: string;
  spaceId?: string;
  areaId?: string;

  // Decision factors
  tier: 1 | 2 | 3 | 4;          // Which tier made decision
  signals: SignalDetection;
  clusterMatch?: {
    cluster: TaskType;
    confidence: number;
  };

  // Output
  selectedModel: string;
  reason: string;                // Human-readable explanation
  alternativeModels: string[];   // What else was considered

  // For learning
  timestamp: Date;
  userOverride?: string;         // If user changed model
  conversationLength?: number;   // Updated later
}
```

---

## Implementation Phases

### Phase 1: Foundation (MVP) ✅ COMPLETE
**Goal**: Basic Auto routing with explicit rules

1. ✅ Created `model-router/` service with types, config, router
2. ✅ Implemented context analyzer (Space/Area context rules)
3. ✅ Implemented query analyzer (fast signal detection)
4. ✅ Added "Auto" option to model picker
5. ✅ Show selected model after routing ("Auto → Claude Sonnet 4")

**Deliverables**:
- ✅ Model picker defaults to "Auto"
- ✅ Context-aware routing based on Space/Area
- ✅ Simple queries get fast/cheap models (Haiku)
- ✅ User sees which model was selected

### Phase 2: Cache Coherence ✅ COMPLETE
**Goal**: Prevent jarring model downgrades in conversations

1. ✅ Track conversation turn in routing context
2. ✅ Implement cache coherence logic in router
3. ✅ Add recent complexity scores tracking
4. ✅ Prevent downgrade unless high confidence

**Deliverables**:
- ✅ Ongoing conversations maintain model tier
- ✅ Short follow-ups don't trigger Haiku downgrade
- ✅ Complex trajectory detection via recent scores

### Phase 3: Analytics & Logging ✅ COMPLETE
**Goal**: Track routing decisions for optimization

1. ✅ Created `routing_decisions` PostgreSQL table
2. ✅ Implemented `postgresRoutingDecisionsRepository`
3. ✅ Log every AUTO routing decision
4. ✅ Track outcome (success, tokens, cost)
5. ✅ Admin API for routing statistics

**Deliverables**:
- ✅ Every routing decision logged to database
- ✅ Admin can view routing stats
- ✅ Cost savings estimation
- ✅ Tier distribution analytics

### Phase 4: Extended Thinking & Recent Scores ✅ COMPLETE
**Goal**: Full feature integration and cache coherence persistence

1. ✅ Extended thinking works with AUTO mode
2. ✅ Recent complexity scores fetched from DB
3. ✅ Scores passed to router for cache coherence
4. ✅ Settings store respects AUTO mode for capabilities

**Deliverables**:
- ✅ Extended thinking toggle works in AUTO
- ✅ Cache coherence uses persisted recent scores
- ✅ Router receives full context for decisions

---

## Phase 5: Embedding Intelligence (Planned)

> **Status**: Research Complete, Awaiting Acceptance Criteria
> **Estimated Effort**: 6 days
> **Prerequisites**: Phases 1-4 complete, metrics tracking in place

### Acceptance Criteria (Triggers for Implementation)

Phase 5 should be implemented when **ANY** of these conditions are met:

| Criterion | Threshold | How to Measure | Current |
|-----------|-----------|----------------|---------|
| **User Override Rate** | >10% sustained for 2 weeks | `SELECT COUNT(*) FILTER (WHERE array_length(overrides, 1) > 0) / COUNT(*) FROM routing_decisions WHERE created_at > NOW() - INTERVAL '2 weeks'` | TBD |
| **Low Confidence Queries** | >30% of queries with confidence < 0.70 | `SELECT COUNT(*) FILTER (WHERE confidence < 0.70) / COUNT(*) FROM routing_decisions` | TBD |
| **Task Cluster Expansion** | Need for >10 distinct routing categories | Product decision to specialize beyond simple/medium/complex | No |
| **Semantic Caching Needed** | >20% repeated similar queries | Requires embedding infrastructure first | N/A |

**Dashboard Query for Monitoring:**
```sql
-- Add to admin routing dashboard
SELECT
  COUNT(*) as total_decisions,
  COUNT(*) FILTER (WHERE confidence < 0.70) as low_confidence,
  COUNT(*) FILTER (WHERE array_length(overrides, 1) > 0) as overridden,
  ROUND(100.0 * COUNT(*) FILTER (WHERE confidence < 0.70) / COUNT(*), 1) as low_confidence_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE array_length(overrides, 1) > 0) / COUNT(*), 1) as override_rate_pct
FROM routing_decisions
WHERE created_at > NOW() - INTERVAL '2 weeks';
```

### Why Embedding Intelligence?

**Problem with Rule-Based Only:**
1. **Keyword brittleness**: "Help me architect a solution" won't trigger "design" signal
2. **No semantic understanding**: Can't distinguish "What is strategy?" (simple Q&A) from "Create a strategy for..." (complex planning)
3. **Paraphrase blindness**: "Debug my code" vs "Find the bug" vs "Why isn't this working?" are semantically identical but may route differently
4. **Language variations**: Non-native English speakers phrase queries differently

**What Embeddings Add:**
1. **Semantic similarity**: "architect a solution" ≈ "design a system" (cosine similarity ~0.85)
2. **Intent clustering**: Group queries by meaning, not keywords
3. **Confidence calibration**: Embedding similarity provides natural confidence score
4. **Multilingual support**: Embeddings capture meaning across languages
5. **Foundation for semantic caching**: Same embedding infrastructure enables 40%+ cache hit rates

### Architecture: Hybrid Routing

```
┌─────────────────────────────────────────────────────────────┐
│                      User Query                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  EXISTING: Rule-Based Analysis (Tiers 1-2)                  │
│  ─────────────────────────────────────────────────────────  │
│  • Context rules (Space/Area preferences)                   │
│  • Query signals (keywords, patterns, length)               │
│  • Cache coherence (conversation continuity)                │
│                                                             │
│  Output: tier, score, confidence                            │
└─────────────────────────────────────────────────────────────┘
                              │
                    confidence >= 0.70?
                      ┌───────┴───────┐
                     YES              NO
                      │               │
                      ▼               ▼
              Use rule-based    ┌─────────────────────────────┐
              decision          │  NEW: Embedding Fallback    │
                               │  ─────────────────────────  │
                               │  1. Generate query embedding │
                               │     (text-embedding-3-small) │
                               │  2. Compare to 10 cluster    │
                               │     centroids                │
                               │  3. Select highest match     │
                               │  4. Map cluster → model tier │
                               └─────────────────────────────┘
                                              │
                                              ▼
                                   Final routing decision
```

**Key Design Decision**: Hybrid approach keeps the fast rule-based path (0-1ms) for clear-cut cases (~70% of queries) and only invokes embeddings (~50ms) for ambiguous cases.

### Embedding Model Selection

| Model | Latency | Cost/1M tokens | Dimensions | Recommendation |
|-------|---------|----------------|------------|----------------|
| **OpenAI text-embedding-3-small** | 30-50ms | $0.02 | 1536 | **Start here** - best cost/performance, existing API |
| OpenAI text-embedding-3-large | 50-70ms | $0.13 | 3072 | If accuracy insufficient |
| Voyage AI voyage-3.5-lite | 11ms | $0.02 | 512 | If latency critical |
| Local BGE-M3 (GPU) | 11ms | Compute only | 1024 | Future migration for cost/latency |
| Local BGE-M3 (CPU) | 50-80ms | Compute only | 1024 | Self-hosted option |

**Cost Projection:**
- 10,000 queries/day × 30% ambiguous × 200 tokens = 600K tokens/day
- At $0.02/1M tokens = **$0.012/day** (negligible)

### Task Cluster Definitions

Start with **10 clusters** covering the spectrum of LLM use cases:

| Cluster | Model Preference | Example Queries (20+ needed each) |
|---------|------------------|-----------------------------------|
| `simple_qa` | Haiku | "What is X?", "Define Y", "Who invented Z?", "When did X happen?" |
| `greeting` | Haiku | "Hi", "Hello", "Hey there", "Good morning", "Thanks" |
| `coding` | Sonnet/Opus | "Write a function that...", "Implement X in Python", "Create a class for..." |
| `debugging` | Sonnet | "Why doesn't this work?", "Find the bug in...", "This code throws an error" |
| `code_review` | Sonnet | "Review this code", "What could be improved?", "Is this approach correct?" |
| `analysis` | Sonnet | "Analyze this data", "What patterns do you see?", "Compare X and Y" |
| `creative` | Opus | "Write a story about...", "Create marketing copy", "Draft an email that..." |
| `research` | Sonnet | "Summarize this article", "Find information about...", "What are the pros and cons?" |
| `planning` | Opus | "Create a plan for...", "Help me strategize", "Design an architecture for..." |
| `explanation` | Sonnet | "Explain how X works", "Why does Y happen?", "Help me understand Z" |

**Cluster → Tier Mapping:**
```typescript
const CLUSTER_TIER_MAP: Record<string, 'simple' | 'medium' | 'complex'> = {
  simple_qa: 'simple',
  greeting: 'simple',
  coding: 'medium',      // Sonnet handles most coding well
  debugging: 'medium',
  code_review: 'medium',
  analysis: 'medium',
  creative: 'complex',   // Opus for best prose quality
  research: 'medium',
  planning: 'complex',   // Opus for strategic reasoning
  explanation: 'medium',
};
```

### Cold Start: Building Cluster Centroids

**Step 1: Seed Examples (Manual)**
- Create 20 hand-crafted examples per cluster
- Focus on diversity: different phrasings, lengths, tones
- Include edge cases that keywords would miss

**Step 2: Expand via LLM (Automated)**
```typescript
// Generate paraphrases for each seed example
const prompt = `Generate 10 diverse paraphrases of this query that a user might type:
"${seedExample}"

Requirements:
- Vary the length (short/medium/long)
- Vary the formality (casual/professional)
- Keep the same intent
- Include common typos or informal phrasing`;
```

**Step 3: Compute Centroids**
```typescript
// For each cluster, compute the centroid (average) embedding
async function computeCentroid(examples: string[]): Promise<number[]> {
  const embeddings = await Promise.all(
    examples.map(ex => getEmbedding(ex))
  );

  // Average all embeddings
  const centroid = new Array(embeddings[0].length).fill(0);
  for (const emb of embeddings) {
    for (let i = 0; i < emb.length; i++) {
      centroid[i] += emb[i] / embeddings.length;
    }
  }

  return centroid;
}
```

**Step 4: Store and Version**
- Store centroids in `src/lib/services/model-router/embeddings/centroids.json`
- Version control allows rollback if quality degrades
- Re-compute monthly or when adding new examples

### File Structure

```
src/lib/services/model-router/
├── router.ts                    # Existing - add embedding fallback
├── config.ts                    # Existing - add cluster config
├── types.ts                     # Existing - add embedding types
├── analyzers/
│   ├── query-analyzer.ts        # Existing
│   └── context-analyzer.ts      # Existing
└── embeddings/                  # NEW
    ├── index.ts                 # Public exports
    ├── embedding-service.ts     # OpenAI API wrapper with caching
    ├── semantic-router.ts       # Similarity matching logic
    ├── cluster-store.ts         # Load/manage centroids
    └── data/
        ├── cluster-definitions.ts  # Cluster metadata
        ├── seed-examples.ts        # Initial training examples
        └── centroids.json          # Pre-computed centroid vectors
```

### Implementation Code

**embedding-service.ts**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI();

// In-memory cache for session (consider Redis for production)
const embeddingCache = new Map<string, number[]>();

export async function getEmbedding(text: string): Promise<number[]> {
  // Normalize text for cache key
  const cacheKey = text.toLowerCase().trim().slice(0, 500);

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536, // Can reduce to 512 for speed if needed
  });

  const embedding = response.data[0].embedding;
  embeddingCache.set(cacheKey, embedding);

  return embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**semantic-router.ts**
```typescript
import { getEmbedding, cosineSimilarity } from './embedding-service';
import { CLUSTER_CENTROIDS } from './cluster-store';
import { CLUSTER_TIER_MAP } from './cluster-definitions';

export interface SemanticClassification {
  cluster: string;
  confidence: number;
  tier: 'simple' | 'medium' | 'complex';
  allMatches: Array<{ cluster: string; similarity: number }>;
}

export async function classifyQuerySemantically(
  query: string
): Promise<SemanticClassification> {
  const queryEmbedding = await getEmbedding(query);

  const matches: Array<{ cluster: string; similarity: number }> = [];

  for (const [cluster, centroid] of Object.entries(CLUSTER_CENTROIDS)) {
    const similarity = cosineSimilarity(queryEmbedding, centroid);
    matches.push({ cluster, similarity });
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  const bestMatch = matches[0];

  return {
    cluster: bestMatch.cluster,
    confidence: bestMatch.similarity,
    tier: CLUSTER_TIER_MAP[bestMatch.cluster] || 'medium',
    allMatches: matches.slice(0, 3), // Top 3 for debugging
  };
}
```

**Integration with router.ts**
```typescript
// Add to existing router.ts

import { classifyQuerySemantically } from './embeddings';

export async function routeQuery(
  query: string,
  context: RoutingContext
): Promise<RoutingDecision> {
  const startTime = performance.now();

  // Existing rule-based analysis
  const ruleBasedResult = analyzeQuery(query, context);

  // If high confidence, use rule-based result (fast path)
  if (ruleBasedResult.confidence >= 0.70) {
    return {
      ...ruleBasedResult,
      routingPath: 'rule-based',
      routingTimeMs: performance.now() - startTime,
    };
  }

  // Low confidence: fall back to embedding classification
  try {
    const semanticResult = await classifyQuerySemantically(query);

    // Use semantic result if it has higher confidence
    if (semanticResult.confidence > ruleBasedResult.confidence) {
      return {
        selectedModel: getModelForTier(semanticResult.tier),
        tier: semanticResult.tier,
        score: ruleBasedResult.score, // Keep original score for logging
        confidence: semanticResult.confidence,
        reasoning: `Semantic classification: ${semanticResult.cluster}`,
        detectedPatterns: [...ruleBasedResult.detectedPatterns, `semantic:${semanticResult.cluster}`],
        routingPath: 'embedding-fallback',
        routingTimeMs: performance.now() - startTime,
      };
    }
  } catch (error) {
    console.warn('[Router] Embedding fallback failed:', error);
    // Continue with rule-based result
  }

  return {
    ...ruleBasedResult,
    routingPath: 'rule-based-low-confidence',
    routingTimeMs: performance.now() - startTime,
  };
}
```

### Database Schema Updates

```sql
-- Add to routing_decisions table
ALTER TABLE routing_decisions
ADD COLUMN routing_path VARCHAR(50),
ADD COLUMN semantic_cluster VARCHAR(50),
ADD COLUMN semantic_confidence DECIMAL(3,2);

-- Index for analyzing embedding effectiveness
CREATE INDEX idx_routing_decisions_path
ON routing_decisions(routing_path, created_at DESC);
```

### Implementation Steps

| Step | Task | Effort | Dependencies |
|------|------|--------|--------------|
| 1 | Create `embeddings/` directory structure | 0.5 days | None |
| 2 | Implement `embedding-service.ts` with OpenAI integration | 0.5 days | OpenAI API key |
| 3 | Define 10 clusters with 20 seed examples each | 1 day | Product input |
| 4 | Generate expanded examples via LLM (100+ per cluster) | 0.5 days | Step 3 |
| 5 | Compute and store cluster centroids | 0.5 days | Steps 3-4 |
| 6 | Implement `semantic-router.ts` | 0.5 days | Steps 1-2, 5 |
| 7 | Integrate with `router.ts` (hybrid path) | 1 day | Step 6 |
| 8 | Update database schema | 0.5 days | Step 7 |
| 9 | Add admin dashboard metrics for embedding path | 0.5 days | Step 8 |
| 10 | Testing and threshold tuning | 0.5 days | All above |
| **Total** | | **6 days** | |

### Testing & Validation

**Unit Tests:**
```typescript
describe('Semantic Router', () => {
  it('classifies coding queries correctly', async () => {
    const result = await classifyQuerySemantically('Write a Python function to sort a list');
    expect(result.cluster).toBe('coding');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('classifies paraphrased queries consistently', async () => {
    const queries = [
      'Debug this code',
      'Find the bug',
      'Why is this not working',
      'Help me fix this error',
    ];
    const results = await Promise.all(queries.map(classifyQuerySemantically));
    const clusters = results.map(r => r.cluster);
    expect(new Set(clusters).size).toBeLessThanOrEqual(2); // All should be debugging or coding
  });

  it('falls back to embeddings only when confidence is low', async () => {
    // Ambiguous query that keywords can't classify
    const result = await routeQuery('Help me with this', mockContext);
    expect(result.routingPath).toBe('embedding-fallback');
  });
});
```

**A/B Testing Plan:**
1. Route 10% of traffic through embedding path regardless of confidence
2. Compare override rates: rule-based vs embedding-assisted
3. Measure latency distribution for both paths
4. Run for 2 weeks before full rollout

**Success Metrics:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Override rate reduction | -30% relative | Compare pre/post implementation |
| Ambiguous query accuracy | >85% correct cluster | Manual review of 100 samples |
| Latency overhead | <60ms p95 | `routing_time_ms` for embedding path |
| Cost increase | <$1/day | OpenAI billing dashboard |

### Future Extensions (Phase 5.5)

**Semantic Caching:**
Once embedding infrastructure exists, enable semantic caching:
```typescript
// Before calling LLM, check if similar query was recently answered
const similarCached = await findSimilarCachedResponse(queryEmbedding, threshold: 0.95);
if (similarCached) {
  return { ...similarCached, source: 'semantic-cache' };
}
```
Expected benefit: 40%+ cache hit rate on repeated similar queries.

**Query Rewriting:**
Use embeddings to detect when queries should be rewritten for better results:
```typescript
// If query is very short but matches complex cluster, expand it
if (query.length < 20 && semanticResult.cluster === 'planning') {
  const expandedQuery = await expandQuery(query, conversationHistory);
}
```

---

## Phase 6: Learning & Personalization (Planned)

> **Status**: Conceptual
> **Prerequisites**: Phase 5 (Embedding Intelligence) complete
> **Estimated Effort**: 8-10 days

### Acceptance Criteria

Implement when:
- Phase 5 is stable in production for 4+ weeks
- Have 10,000+ routing decisions with outcome data
- User feedback/override data is meaningful

### Scope

1. **User Override Learning**
   - Track when users change the auto-selected model
   - Learn per-user model preferences by task type
   - Adjust routing weights based on historical behavior

2. **Personalized Cluster Weights**
   - Some users always want Opus for coding (quality preference)
   - Some users prefer Haiku for speed
   - Learn and apply individual preferences

3. **A/B Testing Framework**
   - Test new routing strategies on subset of users
   - Measure impact on override rate, conversation length, regeneration rate

4. **Organization Defaults**
   - Allow org admins to set routing preferences
   - "Always use Opus for legal documents"
   - "Prefer speed over quality for internal chat"

---

## Phase 7: Enterprise Features (Planned)

> **Status**: Conceptual
> **Prerequisites**: Phases 1-6 complete, enterprise customers onboarded
> **Estimated Effort**: 10-15 days

### Scope

1. **Organization-Level Routing Policies**
   - Admin console to configure routing rules
   - "All queries mentioning 'confidential' must use approved models"
   - Model allowlists/blocklists per organization

2. **Cost Budgets and Limits**
   - Per-user, per-team, per-org spending limits
   - Automatic downgrade when approaching budget
   - Alerts and notifications

3. **Model Fallback on Errors**
   - Automatic retry with different model if primary fails
   - Provider outage detection and routing around issues
   - Graceful degradation

4. **Compliance and Audit**
   - Detailed routing explanations for compliance review
   - Why was this model selected? (audit trail)
   - Data residency routing (EU data → EU models)

---

## Success Metrics

### Cost Efficiency
- **Target**: 40% reduction in LLM costs vs. single-model baseline
- **Measurement**: Compare Auto users vs. manual selection users

### Quality Maintenance
- **Target**: No degradation in user satisfaction scores
- **Measurement**: Conversation length, regeneration rate, explicit feedback

### Routing Accuracy
- **Target**: <10% user override rate
- **Measurement**: How often users change the auto-selected model

### Latency Impact
- **Target**: <100ms added latency for routing decision
- **Measurement**: Time from request to model selection

---

## Open Questions

| Question | Status | Answer |
|----------|--------|--------|
| **Embedding model choice** | ✅ Answered | Start with OpenAI `text-embedding-3-small` ($0.02/1M tokens, 30-50ms). Migrate to local BGE-M3 if latency becomes critical. |
| **Cluster count** | ✅ Answered | Start with 10 clusters. Research shows 8-15 is optimal for LLM routing (academic benchmarks use 20-150 for general intent classification). |
| **Confidence thresholds** | ✅ Answered | Use 0.70 as the threshold for rule-based vs embedding fallback. Track and adjust based on override rate data. |
| **UI transparency level** | Open | Need to decide: subtle badge ("Auto → Sonnet") vs explicit explanation ("Selected Sonnet for coding task"). |
| **Learning rate** | Open | Depends on Phase 6 design. Likely: exponential decay with 2-week half-life for override signals. |
| **Organization override** | ✅ Answered | Yes, planned for Phase 7. Admins can set routing policies per organization. |

---

## References

### Research Papers
- RouteLLM: Learning to Route LLMs with Preference Data (ICLR 2025) - arXiv:2406.18665
- OptiRoute: Dynamic LLM Routing based on User Preferences - arXiv:2502.16696
- LLMs Enable Few-Shot Clustering - MIT TACL 2024 - doi:10.1162/tacl_a_00648
- Dial-In LLM Intent Clustering - arXiv:2412.09049

### Embedding Models
- [OpenAI Embedding Models](https://openai.com/index/new-embedding-models-and-api-updates/)
- [Voyage AI voyage-3-large](https://blog.voyageai.com/2025/01/07/voyage-3-large/)
- [BGE-M3 on Hugging Face](https://huggingface.co/BAAI/bge-m3)
- [Open-Source Embedding Models Benchmarked](https://supermemory.ai/blog/best-open-source-embedding-models-benchmarked-and-ranked/)

### Semantic Router Implementations
- [vLLM Semantic Router v0.1 Iris](https://blog.vllm.ai/2026/01/05/vllm-sr-iris.html) - 10.2% accuracy improvement, 48.5% latency reduction
- [Aurelio Labs Semantic Router](https://github.com/aurelio-labs/semantic-router) - Python library for semantic routing
- [vLLM Semantic Router GitHub](https://github.com/vllm-project/semantic-router) - Production-ready Kubernetes deployment

### Industry Resources
- [OpenRouter Auto Router](https://openrouter.ai/docs/guides/features/routers/auto-router)
- [Martian Model Router](https://withmartian.com/)
- [Not Diamond AI](https://www.notdiamond.ai/)
- [Not Diamond RoRF](https://www.notdiamond.ai/blog/rorf) - Random Forest on embeddings
- [RouteLLM GitHub](https://github.com/lm-sys/RouteLLM)
- [Red Hat Semantic Router](https://developers.redhat.com/articles/2025/05/20/llm-semantic-router-intelligent-request-routing)
- [AWS Multi-LLM Routing](https://aws.amazon.com/blogs/machine-learning/multi-llm-routing-strategies-for-generative-ai-applications-on-aws/)

### Latency & Cost Analysis
- [Milvus Embedding API Benchmarks](https://milvus.io/blog/we-benchmarked-20-embedding-apis-with-milvus-7-insights-that-will-surprise-you.md)
- [Embedding API Latency Benchmarks](https://nixiesearch.substack.com/p/benchmarking-api-latency-of-embedding)
- [Embedding Pricing Calculator](https://invertedstone.com/calculators/embedding-pricing-calculator)

### Benchmarks & Comparisons
- [2025 LLM Review](https://mgx.dev/blog/2025-llm-review-gpt-5-2-gemini-3-pro-claude-4-5)
- [LLM API Pricing 2025](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)
- [LLM Leaderboard](https://klu.ai/llm-leaderboard)

---

## Implementation Details (Complete)

### Phase 1-4 Completed: 2026-01-11

All four phases of AUTO model routing have been implemented and are production-ready.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User Query                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Context Detection                                   │
│  ─────────────────────────────────────────────────────────  │
│  • Space/Area context (model preferences, locked models)     │
│  • Plan mode detection (prefers reasoning models)            │
│  • Task context (in-progress task signals complexity)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Query Analysis (src/lib/services/model-router/)    │
│  ─────────────────────────────────────────────────────────  │
│  • Complex signals: code blocks, analyze, design, strategy   │
│  • Medium signals: create, compare, review, help, list       │
│  • Simple signals: short query, greeting, question endings   │
│  • Base score: 50, adjusted by weighted signals              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Cache Coherence Check                               │
│  ─────────────────────────────────────────────────────────  │
│  • If conversationTurn > 1, check recent complexity scores   │
│  • Prevent downgrade if confidence < 80%                     │
│  • Prevent downgrade if any recent score > 60                │
│  • Protect ongoing complex conversations from Haiku          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Tier Selection                                      │
│  ─────────────────────────────────────────────────────────  │
│  • Score 0-25  → simple  → Claude Haiku 4.5                 │
│  • Score 26-65 → medium  → Claude Sonnet 4                  │
│  • Score 66-100 → complex → Claude Opus 4.5                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Log Decision (routing_decisions table)              │
│  ─────────────────────────────────────────────────────────  │
│  • User, org, conversation, provider                         │
│  • Selected model, tier, score, confidence                   │
│  • Detected patterns, overrides, routing time                │
│  • Request outcome (updated after completion)                │
└─────────────────────────────────────────────────────────────┘
```

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/services/model-router/router.ts` | Main router with cache coherence logic |
| `src/lib/services/model-router/types.ts` | TypeScript interfaces for routing |
| `src/lib/services/model-router/config.ts` | Model tier configuration and thresholds |
| `src/lib/services/model-router/index.ts` | Public exports |
| `src/lib/services/model-router/analyzers/query-analyzer.ts` | Query complexity scoring |
| `src/lib/services/model-router/analyzers/context-analyzer.ts` | Space/Area context detection |
| `src/lib/server/persistence/routing-decisions-postgres.ts` | Decision logging repository |
| `src/lib/server/persistence/migrations/020-routing-decisions.sql` | Database schema |
| `src/routes/api/admin/routing/+server.ts` | Admin API for routing stats |

### Query Complexity Scoring

The query analyzer uses weighted signals to calculate a complexity score (0-100):

**Complex Signals (increase score)**:
| Signal | Weight | Example |
|--------|--------|---------|
| `analyze` | +20 | "Analyze this code" |
| `design` | +20 | "Design a system" |
| `strategy` | +20 | "Create a strategy" |
| `research` | +20 | "Research options for" |
| `compare` | +15 | "Compare these approaches" |
| `explain_in_depth` | +15 | "Explain in detail" |
| `multiple_topics` | +15 | Query mentions 3+ distinct topics |
| `code_blocks` | +10 | Contains ``` code blocks |
| `long_query` | +10 | > 200 characters |

**Simple Signals (decrease score)**:
| Signal | Weight | Example |
|--------|--------|---------|
| `greeting` | -25 | "Hi", "Hello" |
| `short_query` | -20 | < 50 characters |
| `ends_with_question` | -5 | "...?" |

**Base Score**: 50

### Cache Coherence

Prevents jarring model downgrades in ongoing conversations:

```typescript
// In router.ts:117-141
if (conversationTurn > 1) {
  const shouldDowngrade =
    confidence >= 0.80 &&
    !recentComplexityScores.some(score => score > 60);

  if (!shouldDowngrade && selectedTier < currentTier) {
    // Keep current model tier
    overrides.push('cache_coherence');
  }
}
```

**Recent Scores Tracking**: The last 3 complexity scores within 1 hour are fetched from `routing_decisions` table and used to detect "complex trajectory" conversations.

### Model Tiers Configuration

```typescript
// In config.ts
export const MODEL_TIERS = {
  simple: {
    name: 'simple',
    models: ['claude-haiku-4-5-20241022'],
    maxScore: 25,
    description: 'Fast responses for simple queries'
  },
  medium: {
    name: 'medium',
    models: ['claude-sonnet-4-20250514'],
    maxScore: 65,
    description: 'Balanced capability for most tasks'
  },
  complex: {
    name: 'complex',
    models: ['claude-opus-4-5-20250124'],
    maxScore: 100,
    description: 'Maximum capability for complex reasoning'
  }
};

export const THRESHOLDS = {
  simpleMax: 25,      // Score <= 25 → simple tier
  mediumMax: 65,      // Score <= 65 → medium tier
  simpleConfidence: 0.85  // High confidence threshold for simple
};
```

### Extended Thinking Support

AUTO mode fully supports extended thinking:
- Settings store allows enabling thinking in AUTO mode
- Chat endpoint checks `isAutoMode || supportsExtendedThinking(model)`
- Router selects thinking-capable model (Sonnet/Opus) when enabled
- Thinking budget passed through to resolved model

### Database Schema

```sql
-- routing_decisions table
CREATE TABLE routing_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL,
    organization_id UUID,
    conversation_id UUID,
    provider VARCHAR(50) NOT NULL,
    conversation_turn INTEGER DEFAULT 1,
    selected_model VARCHAR(100) NOT NULL,
    tier VARCHAR(20) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    reasoning TEXT,
    routing_time_ms INTEGER,
    query_length INTEGER,
    detected_patterns TEXT[],
    overrides TEXT[],
    request_succeeded BOOLEAN,
    response_tokens INTEGER,
    estimated_cost_millicents INTEGER
);

-- Indexes for analytics queries
CREATE INDEX idx_routing_decisions_org_date
    ON routing_decisions(organization_id, created_at DESC);
CREATE INDEX idx_routing_decisions_user_recent
    ON routing_decisions(user_id, created_at DESC);
```

### Admin Analytics

The `/api/admin/routing` endpoint provides:
- Total routing decisions count
- AUTO usage percentage (vs manual selection)
- Tier distribution (simple/medium/complex)
- Model distribution
- Average score and confidence
- Override frequency (cache_coherence, etc.)
- Estimated cost savings
- Daily totals for charting

### UI Integration

**Model Picker**: "Auto" option added with sparkle icon, defaults to AUTO mode for new users.

**Message Display**: Shows "Auto → Claude Sonnet 4" format when AUTO mode selected a model.

**Settings**: Extended thinking toggle works in AUTO mode (router picks capable model).

### Tested Scenarios

1. ✅ Simple greeting → routes to Haiku
2. ✅ Code analysis → routes to Sonnet
3. ✅ Complex strategy → routes to Opus (score 66+)
4. ✅ Short follow-up after complex query → stays on Sonnet (cache coherence)
5. ✅ Extended thinking + AUTO → Sonnet/Opus selected, thinking enabled
6. ✅ Plan mode → prefers reasoning models
7. ✅ Routing decisions logged to database
8. ✅ Recent scores fetched for cache coherence

### Future Enhancements (Not Yet Implemented)

- **Tier 3: Embedding Classification** - For ambiguous queries requiring semantic understanding
- **Tier 4: User Preference Learning** - Personalized routing based on behavior
- **Organization-level policies** - Admin override of routing rules
- **Cost budgets** - Per-user/org spending limits
- **Model fallback** - Automatic retry on provider errors

---

## Appendix: StratAI Context Integration

### How Spaces/Areas Inform Routing

StratAI's unique architecture provides rich context:

```
Space: "Backend Development"
├── Area: "API Design" (prefers reasoning models)
├── Area: "Code Review" (prefers thorough models)
├── Area: "Bug Fixes" (prefers fast, capable models)
└── Area: "Documentation" (prefers writing models)
```

This context should be the **primary routing signal**, with embedding-based classification as fallback for general/unconfigured spaces.

### Integration Points

1. **Space creation**: Prompt for space type (coding, writing, research, general)
2. **Area creation**: Inherit from space, allow override
3. **Model picker**: Show "Auto" with context-aware description
4. **Chat header**: Show auto-selected model with reason
5. **Settings**: User preference for Auto behavior

---

*Document created: 2026-01-09*
*Author: Claude Code + Gabriel Roux*
*Status: Ready for implementation planning*
