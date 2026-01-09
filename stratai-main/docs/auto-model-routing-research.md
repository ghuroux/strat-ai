# Auto Model Routing Research & Strategy

> **Status**: Research Complete, Planning Phase
> **Last Updated**: 2026-01-09
> **Next Steps**: Finalize approach, begin implementation planning

---

## Executive Summary

This document captures research findings on intelligent LLM model routing - automatically selecting the optimal model based on conversation context rather than forcing users to choose manually.

**Key Insight**: No single LLM is universally optimal. Research consistently shows that intelligent routing to specialized models beats any single model, with potential **cost savings of 2-5x without quality degradation**.

**Recommended Approach**: Hybrid system combining:
1. **Explicit rule-based routing** for context-rich environments (Spaces, Areas, task types)
2. **Embedding-based classification** for general queries
3. **User preference learning** for personalization over time

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

### Phase 1: Foundation (MVP)
**Goal**: Basic Auto routing with explicit rules

1. Create `model-routing.ts` with model capabilities matrix
2. Implement Tier 1 (Space/Area context rules)
3. Implement Tier 2 (fast signal detection)
4. Add "Auto" option to model picker
5. Show selected model after routing

**Deliverables**:
- Model picker defaults to "Auto"
- Coding spaces get coding models
- Simple queries get fast/cheap models
- User sees which model was selected

### Phase 2: Embedding Intelligence
**Goal**: Smarter routing for ambiguous queries

1. Define task clusters with example prompts
2. Integrate embedding model (OpenAI or local BERT)
3. Pre-compute cluster centroids
4. Implement Tier 3 embedding classification
5. Add confidence thresholds

**Deliverables**:
- Ambiguous queries correctly routed
- Confidence scores for decisions
- Fallback when low confidence

### Phase 3: Learning & Personalization
**Goal**: Routing improves over time

1. Track routing decisions in database
2. Track user overrides and behavior
3. Implement Tier 4 preference learning
4. Add A/B testing framework
5. Create routing analytics dashboard

**Deliverables**:
- Per-user model preferences
- Routing effectiveness metrics
- Continuous improvement loop

### Phase 4: Advanced Features
**Goal**: Enterprise-grade routing

1. Organization-level routing policies
2. Cost budgets and limits
3. Cascade/escalation for quality assurance
4. Model fallback on errors/outages
5. Detailed routing explanations

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

1. **Embedding model choice**: OpenAI API ($) vs. local BERT (latency)?
2. **Cluster count**: Start with 6-8 clusters or more granular?
3. **Confidence thresholds**: What confidence triggers escalation?
4. **UI transparency level**: Subtle badge vs. explicit explanation?
5. **Learning rate**: How quickly should preferences adapt?
6. **Organization override**: Can admins force specific routing policies?

---

## References

### Research Papers
- RouteLLM: Learning to Route LLMs with Preference Data (ICLR 2025) - arXiv:2406.18665
- OptiRoute: Dynamic LLM Routing based on User Preferences - arXiv:2502.16696

### Industry Resources
- [OpenRouter Auto Router](https://openrouter.ai/docs/guides/features/routers/auto-router)
- [Martian Model Router](https://withmartian.com/)
- [Not Diamond AI](https://www.notdiamond.ai/)
- [RouteLLM GitHub](https://github.com/lm-sys/RouteLLM)
- [Red Hat Semantic Router](https://developers.redhat.com/articles/2025/05/20/llm-semantic-router-intelligent-request-routing)
- [AWS Multi-LLM Routing](https://aws.amazon.com/blogs/machine-learning/multi-llm-routing-strategies-for-generative-ai-applications-on-aws/)

### Benchmarks & Comparisons
- [2025 LLM Review](https://mgx.dev/blog/2025-llm-review-gpt-5-2-gemini-3-pro-claude-4-5)
- [LLM API Pricing 2025](https://intuitionlabs.ai/articles/llm-api-pricing-comparison-2025)
- [LLM Leaderboard](https://klu.ai/llm-leaderboard)

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
