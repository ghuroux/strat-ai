# AUTO Model Routing - Implementation Specification

> **Document Purpose:** Complete specification for implementing intelligent model routing in StratAI. Designed for multi-session implementation with clear phases, success criteria, and technical details.
>
> **Created:** January 2026
> **Status:** Ready for Implementation
> **Estimated Savings:** 40-60% cost reduction

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Design Decisions](#design-decisions)
4. [Technical Specification](#technical-specification)
5. [Implementation Phases](#implementation-phases)
6. [Success Criteria](#success-criteria)
7. [Testing Strategy](#testing-strategy)
8. [Monitoring & Iteration](#monitoring--iteration)
9. [Appendix](#appendix)

---

## Executive Summary

### What We're Building

An intelligent model routing system that automatically selects the optimal LLM for each query based on complexity, context, and user preferences. Presented to users as "AUTO" - the default model selection option.

### Why It Matters

| Metric | Current State | Target State |
|--------|---------------|--------------|
| Model selection | User manual | Automatic |
| Cost per conversation | ~$0.15-0.50 | ~$0.06-0.20 |
| User cognitive load | High (which model?) | Zero |
| Quality consistency | Variable | Maintained |

### Core Principles

1. **Quality First** - Never sacrifice answer quality for cost savings
2. **Zero Friction** - Routing adds <5ms latency, invisible to users
3. **Respect Preferences** - User settings (thinking, provider) override optimization
4. **Conservative Start** - Begin safe, become aggressive with data

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Provider strategy | Route within user's chosen provider | Cache coherence, consistent personality |
| Default tier | Conservative (Sonnet default) | Protect quality, earn trust first |
| Model visibility | Hidden in messages, visible in picker | No "cheap model" anxiety |
| Thinking interaction | Thinking ON = minimum Sonnet | Respect explicit user preferences |

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Sends Message                            │
│                    (AUTO mode selected)                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MODEL ROUTER SERVICE                            │
│                         (< 5ms total)                                │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │ Query Analyzer │  │Context Analyzer│  │ Conv Analyzer  │        │
│  │                │  │                │  │                │        │
│  │ • Token count  │  │ • Space type   │  │ • Turn count   │        │
│  │ • Code detect  │  │ • Area context │  │ • Prev model   │        │
│  │ • Keywords     │  │ • Plan mode    │  │ • Complexity   │        │
│  │ • Structure    │  │ • Thinking ON  │  │   trajectory   │        │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘        │
│          │                   │                   │                  │
│          └───────────────────┼───────────────────┘                  │
│                              ▼                                       │
│                   ┌─────────────────────┐                           │
│                   │  Complexity Score   │                           │
│                   │      (0-100)        │                           │
│                   └──────────┬──────────┘                           │
│                              │                                       │
│            ┌─────────────────┼─────────────────┐                    │
│            ▼                 ▼                 ▼                    │
│     ┌───────────┐     ┌───────────┐     ┌───────────┐              │
│     │  SIMPLE   │     │  MEDIUM   │     │  COMPLEX  │              │
│     │   0-25    │     │   26-65   │     │   66-100  │              │
│     │           │     │           │     │           │              │
│     │  Haiku    │     │  Sonnet   │     │   Opus    │              │
│     │ GPT-4o-mini│    │  GPT-4o   │     │   GPT-5   │              │
│     └───────────┘     └───────────┘     └───────────┘              │
│                              │                                       │
│                              ▼                                       │
│                   ┌─────────────────────┐                           │
│                   │  Override Checks    │                           │
│                   │ • Thinking enabled? │                           │
│                   │ • Cache coherence?  │                           │
│                   │ • User preferences? │                           │
│                   └──────────┬──────────┘                           │
│                              │                                       │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Selected Model    │
                    │  + Routing Reason   │
                    │    (for logging)    │
                    └─────────────────────┘
```

### Model Tiers by Provider

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ANTHROPIC (Claude)                            │
├─────────────────────────────────────────────────────────────────────┤
│  SIMPLE          │  MEDIUM           │  COMPLEX                     │
│  Haiku 4.5       │  Sonnet 4         │  Opus 4.5                    │
│  $0.80/$4.00     │  $3.00/$15.00     │  $15.00/$75.00               │
│  Fast, capable   │  Balanced         │  Deep reasoning              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          OPENAI                                      │
├─────────────────────────────────────────────────────────────────────┤
│  SIMPLE          │  MEDIUM           │  COMPLEX                     │
│  GPT-4o-mini     │  GPT-4o           │  GPT-5 / o3                  │
│  $0.15/$0.60     │  $5.00/$15.00     │  $1.25/$10.00                │
│  Very cheap      │  Reliable         │  Latest flagship             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          GOOGLE                                      │
├─────────────────────────────────────────────────────────────────────┤
│  SIMPLE          │  MEDIUM           │  COMPLEX                     │
│  Flash 2.0 Lite  │  Flash 2.5        │  Gemini Pro                  │
│  $0.10/$0.40     │  $0.15/$0.60      │  $1.25/$5.00                 │
│  1M context      │  Thinking mode    │  Full capability             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### Decision 1: Provider Routing Strategy

**Choice:** Route within user's chosen provider (not cross-provider)

**Rationale:**
- Cache coherence: Switching providers loses all cached context
- Personality consistency: Models have different "voices"
- Simpler mental model: Users understand "I'm using Claude"
- Still captures most savings: Haiku vs Opus is 19x difference

**Implementation:**
```typescript
// User's provider preference (from settings or conversation start)
const provider = user.preferredProvider || 'anthropic';

// Route within that provider only
const availableModels = MODEL_TIERS[provider];
const selectedModel = selectModelFromTier(complexity, availableModels);
```

**Default Provider:** Anthropic (Claude)
- Best prompt caching (90% discount vs 50% for OpenAI)
- Primary integration, most tested
- Users can change in settings

---

### Decision 2: Model Visibility

**Choice:** Hidden in messages, visible in model picker dropdown

**Rationale:**
- No "cheap model" anxiety when seeing "Haiku" on simple answers
- Transparency available for those who want it
- Clean UX for majority of users
- Debugging possible via picker inspection

**Implementation:**

```
Model Picker (closed):    ⚡ AUTO

Model Picker (open):
┌─────────────────────────────────┐
│ ⚡ AUTO                         │
│    Currently using: Sonnet 4    │  ← Shows current model
├─────────────────────────────────┤
│ ── Claude ──                    │
│   Claude Opus 4.5      $$$      │
│   Claude Sonnet 4       $$      │
│   Claude Haiku 4.5       $      │
└─────────────────────────────────┘
```

**Message Display:** No model indicator (just the response)

**Logging:** Always log routing decisions internally for analytics

---

### Decision 3: Conservative Default Strategy

**Choice:** Default to Sonnet, use Haiku only for high-confidence simple queries

**Rationale:**
- Quality complaints are more expensive than API costs
- First impressions matter for product perception
- Can always become more aggressive with data
- Still captures 30-40% savings conservatively

**Thresholds (Phase 1 - Conservative):**

| Complexity Score | Model | Confidence Required |
|------------------|-------|---------------------|
| 0-25 (Simple) | Haiku | HIGH (>0.85) |
| 26-65 (Medium) | Sonnet | MEDIUM (>0.5) |
| 66-100 (Complex) | Opus | LOW (any) |

**Phase 2 Evolution:**
After collecting data (2-4 weeks), adjust thresholds:
- Lower Haiku threshold if quality maintained
- Target: 50% Haiku, 40% Sonnet, 10% Opus

---

### Decision 4: Extended Thinking Interaction

**Choice:** Thinking enabled = minimum Sonnet (never Haiku)

**Rationale:**
- Thinking is an explicit user preference, not just a signal
- Haiku has limited thinking capability
- Users expect "deep thinking" when they enable it
- Routing thinking queries to Haiku defeats the purpose

**Implementation:**
```typescript
if (context.thinkingEnabled) {
  // Minimum model is Sonnet when thinking is ON
  if (complexity.score >= 66) {
    return 'opus';   // Complex + thinking = Opus
  } else {
    return 'sonnet'; // Simple/medium + thinking = Sonnet (not Haiku)
  }
}
```

---

## Technical Specification

### File Structure

```
src/lib/services/
└── model-router/
    ├── index.ts              # Main exports (routeQuery, isAutoMode, getDefaultContext, analyzeQuery, etc.)
    ├── router.ts             # Core routing logic + isAutoMode() + getDefaultContext()
    ├── types.ts              # TypeScript interfaces
    ├── analyzers/
    │   ├── index.ts              # Re-exports
    │   ├── query-analyzer.ts     # Query text analysis (patterns inline)
    │   └── context-analyzer.ts   # StratAI context analysis
    ├── config/
    │   ├── index.ts              # Re-exports
    │   ├── model-tiers.ts        # Model definitions by provider + MODEL_TO_TIER mapping
    │   └── thresholds.ts         # Routing thresholds (tunable) + THRESHOLD_PRESETS
    └── __tests__/
        └── router.test.ts        # 23 unit tests (vitest)
```

**Note:** Signal patterns (SIMPLE_PATTERNS, COMPLEX_PATTERNS, CODE_PATTERNS) are defined inline in `query-analyzer.ts` for simplicity and maintainability.

### Module Exports

```typescript
// src/lib/services/model-router/index.ts

// Main router functions
export { routeQuery, isAutoMode, getDefaultContext } from './router';

// Analyzers (for testing/debugging)
export { analyzeQuery } from './analyzers/query-analyzer';
export { analyzeContext } from './analyzers/context-analyzer';

// Configuration
export { MODEL_TIERS, MODEL_TO_TIER, getTierForModel, DEFAULT_PROVIDER } from './config/model-tiers';
export { THRESHOLDS, THRESHOLD_PRESETS } from './config/thresholds';

// Types
export type {
  ComplexityAnalysis, Signal, RoutingContext, RoutingDecision,
  Override, ProviderTiers, ThresholdConfig
} from './types';
```

### Core Interfaces

```typescript
// src/lib/services/model-router/types.ts

/**
 * Complexity classification result
 */
export interface ComplexityAnalysis {
  score: number;           // 0-100
  tier: 'simple' | 'medium' | 'complex';
  confidence: number;      // 0-1
  signals: Signal[];       // Which signals fired
  reasoning: string;       // Human-readable explanation
}

/**
 * Individual signal that contributed to complexity score
 */
export interface Signal {
  name: string;
  weight: number;          // Contribution to score (negative = simpler, positive = complex)
  matched: boolean;
  matchedValue?: string;   // What matched (for debugging)
}

/**
 * Context from StratAI (spaces, areas, etc.)
 */
export interface RoutingContext {
  // Provider & preferences
  provider: 'anthropic' | 'openai' | 'google';
  thinkingEnabled: boolean;
  userTier: 'free' | 'pro' | 'team' | 'enterprise';

  // StratAI context
  spaceType: 'work' | 'research' | 'random' | 'personal' | null;
  spaceSlug: string | null;
  areaId: string | null;
  areaHasDocs: boolean;
  isTaskPlanMode: boolean;
  planModePhase: 'eliciting' | 'proposing' | 'confirming' | null;

  // Conversation context
  conversationTurn: number;
  currentModel: string | null;
  recentComplexityScores: number[];  // Last 3 turns
}

/**
 * Routing decision result
 */
export interface RoutingDecision {
  selectedModel: string;           // e.g., 'claude-sonnet-4'
  tier: 'simple' | 'medium' | 'complex';
  complexity: ComplexityAnalysis;
  overrides: Override[];           // Any overrides applied
  reasoning: string;               // Why this model was selected
  routingTimeMs: number;           // Performance tracking
}

/**
 * Override that affected the decision
 */
export interface Override {
  type: 'thinking' | 'cache_coherence' | 'user_preference' | 'minimum_tier';
  description: string;
  originalModel: string;
  overriddenTo: string;
}

/**
 * Model tier configuration for a provider
 */
export interface ProviderTiers {
  simple: string;
  medium: string;
  complex: string;
}

/**
 * Threshold configuration (tunable)
 */
export interface ThresholdConfig {
  simpleConfidence: number;       // Min confidence to route to simple tier
  simpleMax: number;              // Max score for simple tier
  mediumMax: number;              // Max score for medium tier
  cacheCoherenceConfidence: number;  // Min confidence to downgrade
}
```

### Query Analyzer

```typescript
// src/lib/services/model-router/analyzers/query-analyzer.ts

import { Signal, ComplexityAnalysis } from '../types';
import { SIMPLE_PATTERNS, COMPLEX_PATTERNS, CODE_PATTERNS } from '../signals';

/**
 * Analyze query text to determine complexity
 * Target: <2ms execution time
 */
export function analyzeQuery(query: string): ComplexityAnalysis {
  const signals: Signal[] = [];
  let score = 50; // Start at medium baseline

  // ============================================
  // SIMPLE SIGNALS (decrease score)
  // ============================================

  // Short queries are usually simple
  const tokenEstimate = query.split(/\s+/).length;
  if (tokenEstimate < 15) {
    score -= 20;
    signals.push({ name: 'short_query', weight: -20, matched: true, matchedValue: `${tokenEstimate} tokens` });
  } else if (tokenEstimate < 30) {
    score -= 10;
    signals.push({ name: 'medium_short_query', weight: -10, matched: true });
  }

  // Greeting patterns
  if (/^(hi|hello|hey|thanks|thank you|ok|okay)\b/i.test(query)) {
    score -= 25;
    signals.push({ name: 'greeting', weight: -25, matched: true });
  }

  // Simple question patterns
  const simplePatterns = [
    { pattern: /^what (is|are) /i, name: 'what_is', weight: -15 },
    { pattern: /^who (is|are|was) /i, name: 'who_is', weight: -15 },
    { pattern: /^when (did|was|is) /i, name: 'when', weight: -15 },
    { pattern: /^where (is|are|do) /i, name: 'where', weight: -15 },
    { pattern: /^how (do|can) I /i, name: 'how_do_i', weight: -10 },
    { pattern: /^(list|name|give me) /i, name: 'list_request', weight: -10 },
    { pattern: /^define /i, name: 'definition', weight: -15 },
    { pattern: /\?$/, name: 'ends_with_question', weight: -5 },
  ];

  for (const { pattern, name, weight } of simplePatterns) {
    if (pattern.test(query)) {
      score += weight; // weight is negative
      signals.push({ name, weight, matched: true });
    }
  }

  // ============================================
  // COMPLEX SIGNALS (increase score)
  // ============================================

  // Long queries suggest complexity
  if (tokenEstimate > 100) {
    score += 15;
    signals.push({ name: 'long_query', weight: 15, matched: true, matchedValue: `${tokenEstimate} tokens` });
  } else if (tokenEstimate > 200) {
    score += 25;
    signals.push({ name: 'very_long_query', weight: 25, matched: true });
  }

  // Complex reasoning keywords
  const complexPatterns = [
    { pattern: /\b(analyze|analyse)\b/i, name: 'analyze', weight: 20 },
    { pattern: /\b(compare|contrast)\b/i, name: 'compare', weight: 15 },
    { pattern: /\b(evaluate|assess)\b/i, name: 'evaluate', weight: 15 },
    { pattern: /\b(design|architect)\b/i, name: 'design', weight: 20 },
    { pattern: /\b(strategy|strategic)\b/i, name: 'strategy', weight: 20 },
    { pattern: /\b(research|report)\b/i, name: 'research', weight: 20 },
    { pattern: /\b(in-depth|comprehensive|thorough)\b/i, name: 'depth_request', weight: 15 },
    { pattern: /\b(trade-?offs?|pros and cons|implications)\b/i, name: 'tradeoffs', weight: 15 },
    { pattern: /\b(refactor|optimize|improve)\b/i, name: 'refactor', weight: 15 },
    { pattern: /\b(debug|troubleshoot|diagnose)\b/i, name: 'debug', weight: 10 },
    { pattern: /\b(explain why|explain how|how does .* work)\b/i, name: 'deep_explanation', weight: 10 },
  ];

  for (const { pattern, name, weight } of complexPatterns) {
    if (pattern.test(query)) {
      score += weight;
      signals.push({ name, weight, matched: true });
    }
  }

  // Multiple questions suggest complexity
  const questionCount = (query.match(/\?/g) || []).length;
  if (questionCount > 2) {
    score += 15;
    signals.push({ name: 'multiple_questions', weight: 15, matched: true, matchedValue: `${questionCount} questions` });
  }

  // Numbered lists suggest multi-step tasks
  if (/\d+\.\s/.test(query)) {
    score += 10;
    signals.push({ name: 'numbered_steps', weight: 10, matched: true });
  }

  // ============================================
  // CODE SIGNALS (increase score moderately)
  // ============================================

  // Code blocks
  if (/```/.test(query)) {
    score += 10;
    signals.push({ name: 'code_block', weight: 10, matched: true });
  }

  // Code-related keywords (but not necessarily complex)
  const codePatterns = [
    { pattern: /\b(function|class|import|export|const|let|var)\b/, name: 'code_keywords', weight: 5 },
    { pattern: /\.(ts|js|py|go|rs|java|cpp|c|rb|php)\b/, name: 'file_extension', weight: 5 },
    { pattern: /\b(API|REST|GraphQL|endpoint)\b/i, name: 'api_mention', weight: 5 },
    { pattern: /\b(error|exception|bug|issue)\b/i, name: 'error_mention', weight: 5 },
  ];

  for (const { pattern, name, weight } of codePatterns) {
    if (pattern.test(query)) {
      score += weight;
      signals.push({ name, weight, matched: true });
    }
  }

  // ============================================
  // CALCULATE FINAL RESULT
  // ============================================

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine tier
  let tier: 'simple' | 'medium' | 'complex';
  if (score <= 25) {
    tier = 'simple';
  } else if (score <= 65) {
    tier = 'medium';
  } else {
    tier = 'complex';
  }

  // Calculate confidence based on signal strength
  const totalWeight = signals.reduce((sum, s) => sum + Math.abs(s.weight), 0);
  const confidence = Math.min(1, totalWeight / 50); // Normalize

  // Generate reasoning
  const topSignals = signals
    .filter(s => s.matched)
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 3);

  const reasoning = topSignals.length > 0
    ? `${tier} (${score}/100): ${topSignals.map(s => s.name).join(', ')}`
    : `${tier} (${score}/100): baseline assessment`;

  return {
    score,
    tier,
    confidence,
    signals,
    reasoning
  };
}
```

### Context Analyzer

```typescript
// src/lib/services/model-router/analyzers/context-analyzer.ts

import { RoutingContext, Signal } from '../types';

/**
 * Analyze StratAI context to adjust complexity
 * Returns adjustment to add to query complexity score
 */
export function analyzeContext(context: RoutingContext): {
  adjustment: number;
  signals: Signal[];
} {
  const signals: Signal[] = [];
  let adjustment = 0;

  // Space type influences baseline
  switch (context.spaceType) {
    case 'research':
      adjustment += 15;
      signals.push({ name: 'research_space', weight: 15, matched: true });
      break;
    case 'work':
      adjustment += 5;
      signals.push({ name: 'work_space', weight: 5, matched: true });
      break;
    case 'random':
      adjustment -= 10;
      signals.push({ name: 'casual_space', weight: -10, matched: true });
      break;
  }

  // Plan Mode phases have different needs
  if (context.isTaskPlanMode) {
    switch (context.planModePhase) {
      case 'eliciting':
        // Gathering info - medium is fine
        signals.push({ name: 'plan_eliciting', weight: 0, matched: true });
        break;
      case 'proposing':
        // Proposing solutions - needs good reasoning
        adjustment += 15;
        signals.push({ name: 'plan_proposing', weight: 15, matched: true });
        break;
      case 'confirming':
        // Confirming details - medium is fine
        signals.push({ name: 'plan_confirming', weight: 0, matched: true });
        break;
    }
  }

  // Large document context suggests complex analysis
  if (context.areaHasDocs) {
    adjustment += 5;
    signals.push({ name: 'has_documents', weight: 5, matched: true });
  }

  // Deep conversations might need consistency
  if (context.conversationTurn > 10) {
    adjustment += 5;
    signals.push({ name: 'deep_conversation', weight: 5, matched: true });
  }

  return { adjustment, signals };
}
```

### Main Router

```typescript
// src/lib/services/model-router/router.ts

import { analyzeQuery } from './analyzers/query-analyzer';
import { analyzeContext } from './analyzers/context-analyzer';
import { MODEL_TIERS, THRESHOLDS } from './config';
import type { RoutingContext, RoutingDecision, Override, ComplexityAnalysis } from './types';

/**
 * Main routing function - selects optimal model for a query
 * Target: <5ms total execution time
 */
export function routeQuery(
  query: string,
  context: RoutingContext
): RoutingDecision {
  const startTime = performance.now();
  const overrides: Override[] = [];

  // Step 1: Analyze query complexity
  const queryAnalysis = analyzeQuery(query);

  // Step 2: Adjust for context
  const contextAnalysis = analyzeContext(context);

  // Step 3: Calculate final complexity
  const finalScore = Math.max(0, Math.min(100,
    queryAnalysis.score + contextAnalysis.adjustment
  ));

  const finalAnalysis: ComplexityAnalysis = {
    ...queryAnalysis,
    score: finalScore,
    tier: scoreToTier(finalScore),
    signals: [...queryAnalysis.signals, ...contextAnalysis.signals],
    reasoning: `${queryAnalysis.reasoning} + context adjustments`
  };

  // Step 4: Select model based on tier
  const modelTiers = MODEL_TIERS[context.provider];
  let selectedModel = modelTiers[finalAnalysis.tier];
  let selectedTier = finalAnalysis.tier;

  // Step 5: Apply overrides

  // Override: Extended thinking requires minimum Sonnet
  if (context.thinkingEnabled && selectedTier === 'simple') {
    const originalModel = selectedModel;
    selectedModel = modelTiers.medium;
    selectedTier = 'medium';
    overrides.push({
      type: 'thinking',
      description: 'Extended thinking enabled - minimum Sonnet required',
      originalModel,
      overriddenTo: selectedModel
    });
  }

  // Override: Conservative threshold for Haiku
  if (selectedTier === 'simple' && finalAnalysis.confidence < THRESHOLDS.simpleConfidence) {
    const originalModel = selectedModel;
    selectedModel = modelTiers.medium;
    selectedTier = 'medium';
    overrides.push({
      type: 'minimum_tier',
      description: `Low confidence (${finalAnalysis.confidence.toFixed(2)}) - using Sonnet`,
      originalModel,
      overriddenTo: selectedModel
    });
  }

  // Override: Cache coherence - avoid downgrade in ongoing conversation
  if (context.currentModel && context.conversationTurn > 1) {
    const currentTier = getTierForModel(context.currentModel);
    if (tierRank(selectedTier) < tierRank(currentTier)) {
      // Only downgrade if significant savings AND high confidence
      if (finalAnalysis.confidence < 0.8) {
        const originalModel = selectedModel;
        selectedModel = context.currentModel;
        selectedTier = currentTier;
        overrides.push({
          type: 'cache_coherence',
          description: 'Staying on current model for cache coherence',
          originalModel,
          overriddenTo: selectedModel
        });
      }
    }
  }

  const routingTimeMs = performance.now() - startTime;

  return {
    selectedModel,
    tier: selectedTier,
    complexity: finalAnalysis,
    overrides,
    reasoning: generateReasoning(finalAnalysis, overrides),
    routingTimeMs
  };
}

function scoreToTier(score: number): 'simple' | 'medium' | 'complex' {
  if (score <= 25) return 'simple';
  if (score <= 65) return 'medium';
  return 'complex';
}

function tierRank(tier: 'simple' | 'medium' | 'complex'): number {
  return { simple: 1, medium: 2, complex: 3 }[tier];
}

function getTierForModel(model: string): 'simple' | 'medium' | 'complex' {
  // Map model IDs to tiers
  const tierMap: Record<string, 'simple' | 'medium' | 'complex'> = {
    'claude-haiku-4-5': 'simple',
    'claude-sonnet-4': 'medium',
    'claude-opus-4-5': 'complex',
    'gpt-4o-mini': 'simple',
    'gpt-4o': 'medium',
    'gpt-5': 'complex',
    // ... add more as needed
  };
  return tierMap[model] || 'medium';
}

function generateReasoning(analysis: ComplexityAnalysis, overrides: Override[]): string {
  let reasoning = analysis.reasoning;
  if (overrides.length > 0) {
    reasoning += ` | Overrides: ${overrides.map(o => o.type).join(', ')}`;
  }
  return reasoning;
}
```

### Configuration

```typescript
// src/lib/services/model-router/config/model-tiers.ts

export const MODEL_TIERS: Record<string, Record<string, string>> = {
  anthropic: {
    simple: 'claude-haiku-4-5',
    medium: 'claude-sonnet-4',
    complex: 'claude-opus-4-5'
  },
  openai: {
    simple: 'gpt-4o-mini',
    medium: 'gpt-4o',
    complex: 'gpt-5'
  },
  google: {
    simple: 'gemini-2.0-flash-lite',
    medium: 'gemini-2.5-flash',
    complex: 'gemini-pro'
  }
};

// src/lib/services/model-router/config/thresholds.ts

export const THRESHOLDS = {
  // Minimum confidence to route to simple tier
  // Higher = more conservative (more queries go to Sonnet)
  simpleConfidence: 0.85,  // Phase 1: Conservative
  // simpleConfidence: 0.70,  // Phase 2: After validation
  // simpleConfidence: 0.50,  // Phase 3: Aggressive

  // Score thresholds
  simpleMax: 25,
  mediumMax: 65,

  // Cache coherence threshold
  // Only downgrade if confidence above this AND savings significant
  cacheCoherenceConfidence: 0.80,
};
```

---

## Implementation Phases

### Phase 1: Core Router Service (Priority: HIGH) - COMPLETE

**Duration:** 1-2 sessions
**Goal:** Working router with conservative thresholds
**Status:** COMPLETE (2026-01-11)

**Tasks:**
1. [x] Create `src/lib/services/model-router/` directory structure
2. [x] Implement `types.ts` with all interfaces
3. [x] Implement `analyzers/query-analyzer.ts`
4. [x] Implement `analyzers/context-analyzer.ts`
5. [x] Implement `router.ts` main logic
6. [x] Implement `config/model-tiers.ts`
7. [x] Implement `config/thresholds.ts`
8. [x] Add unit tests for query analyzer
9. [x] Add unit tests for router (23 tests passing)

**Success Criteria:**
- [x] `routeQuery()` returns valid model selection
- [x] Routing completes in <5ms
- [x] Unit tests pass for all signal patterns
- [x] Simple queries score 0-25
- [x] Complex queries score 66-100

---

### Phase 2: Chat Endpoint Integration (Priority: HIGH) - COMPLETE

**Duration:** 1 session
**Goal:** Router integrated into chat flow
**Status:** COMPLETE (2026-01-11)

**Tasks:**
1. [x] Add `isAutoMode` flag to chat request (detects from model === 'auto')
2. [x] Import router in `src/routes/api/chat/+server.ts`
3. [x] Call router when AUTO mode enabled
4. [x] Pass routing context (space, area, thinking, etc.)
5. [x] Use selected model for LLM call
6. [x] Log routing decision to console
7. [x] Include routing metadata in response (SSE `routing` event)

**Code Location:** `src/routes/api/chat/+server.ts`

**Implementation Summary:**
- Added `provider`, `currentModel`, `conversationTurn` to `ChatCompletionRequest` type
- Router is called after all context is loaded, before forwarding to LiteLLM
- Both code paths (streaming and tools) use the resolved model
- SSE `routing` event emitted at stream start

**SSE Event Format:**
```typescript
// Emitted as first SSE event when AUTO mode is used
{
  type: 'routing',
  selectedModel: string,    // e.g., 'claude-sonnet-4'
  tier: 'simple' | 'medium' | 'complex',
  score: number,            // 0-100 complexity score
  confidence: number,       // 0-1 confidence level
  reasoning: string,        // Human-readable explanation
  overrides: string[]       // Array of override types applied (e.g., ['thinking', 'cache_coherence'])
}
```

**Frontend Handling:**
```typescript
// In SSE parsing loop
if (parsed.type === 'routing') {
  chatStore.setRoutedModel(parsed.selectedModel);
  chatStore.setRoutingDecision({
    tier: parsed.tier,
    score: parsed.score,
    confidence: parsed.confidence,
    overrides: parsed.overrides || []
  });
}
```

**Success Criteria:**
- [x] AUTO mode routes to appropriate model
- [x] Non-AUTO mode unchanged (explicit model selection works)
- [x] Routing decision logged (detailed console output)
- [x] No perceptible latency added (<5ms routing)

---

### Phase 3: UI Integration (Priority: HIGH) - COMPLETE

**Duration:** 1 session
**Goal:** AUTO option in model picker, visible current model
**Status:** COMPLETE (2026-01-11)

**Tasks:**
1. [x] Update `ModelSelector.svelte` to show AUTO as first/default option
2. [x] Add premium gradient styling for AUTO button
3. [x] Show "using [model]" when AUTO selected and model has been routed
4. [x] Show provider preference picker in dropdown when AUTO selected
5. [x] Add `routedModel` and `autoProvider` state to chat store
6. [x] Update `+page.svelte` to pass AUTO params to API
7. [x] Handle `routing` SSE event to capture routed model
8. [x] Update settings store for AUTO mode capability checks
9. [x] Update Header to pass routedModel and onProviderChange to ModelSelector

**Files Modified:**
- `src/lib/components/ModelSelector.svelte` - AUTO option UI
- `src/lib/stores/chat.svelte.ts` - Added routing state and methods
- `src/lib/stores/settings.svelte.ts` - AUTO mode capability handling
- `src/lib/components/layout/Header.svelte` - Pass routedModel and onProviderChange
- `src/routes/+page.svelte` - Pass AUTO params to API, handle routing SSE

**ModelSelector Component:**

```svelte
<!-- ModelSelector.svelte props -->
<script lang="ts">
  let {
    selectedModel = '',
    disabled = false,
    routedModel = null,         // The model actually used when AUTO is selected
    onchange,
    onproviderchange            // Called when provider preference changes
  } = $props();

  const AUTO_MODEL_ID = 'auto';
  let autoProvider = $state<'anthropic' | 'openai' | 'google'>('anthropic');
  let isAutoMode = $derived(selectedModel.toLowerCase() === AUTO_MODEL_ID);
</script>
```

**Chat Store Additions:**

```typescript
// src/lib/stores/chat.svelte.ts

class ChatStore {
  // AUTO mode routing state (ephemeral - not persisted)
  routedModel = $state<string | null>(null);
  autoProvider = $state<'anthropic' | 'openai' | 'google'>('anthropic');
  routingDecision = $state<{
    tier: 'simple' | 'medium' | 'complex';
    score: number;
    confidence: number;
    overrides: string[];
  } | null>(null);

  // Methods
  setRoutedModel(modelId: string | null): void;
  setAutoProvider(provider: 'anthropic' | 'openai' | 'google'): void;
  setRoutingDecision(decision: RoutingDecision | null): void;
  clearRoutingState(): void;  // Called before each new request
}
```

**Settings Store Additions:**

```typescript
// src/lib/stores/settings.svelte.ts

class SettingsStore {
  // AUTO mode check
  get isAutoMode(): boolean {
    return this.settings.selectedModel.toLowerCase() === 'auto';
  }

  // Capability checks updated to work with AUTO mode
  get canUseExtendedThinking(): boolean {
    if (this.isAutoMode) return true; // Router handles model selection
    return modelSupportsThinking(this.settings.selectedModel);
  }

  get canUseVision(): boolean {
    if (this.isAutoMode) return true; // Router handles model selection
    return modelSupportsVision(this.settings.selectedModel);
  }
}
```

**API Request Format:**

```typescript
// When AUTO mode is active, additional params are sent
{
  model: 'auto',
  messages: [...],
  // AUTO mode routing params (only when model === 'auto')
  provider: 'anthropic' | 'openai' | 'google',  // User's preferred provider
  currentModel: string | null,                  // Previous model for cache coherence
  conversationTurn: number                       // Turn count in conversation
}
```

**Success Criteria:**
- [x] AUTO appears as first/default option
- [x] Current model shown in dropdown when routing has occurred
- [x] Preference persists across sessions (via settings store)
- [x] Provider preference selection works

---

### Phase 4: Logging & Analytics (Priority: MEDIUM) - COMPLETE

**Duration:** 1 session
**Goal:** Track routing decisions for analysis
**Status:** COMPLETE (2026-01-11)

**Tasks:**
1. [x] Create `routing_decisions` table in database (migration 023)
2. [x] Log each routing decision with:
   - User ID, organization ID, conversation ID
   - Complexity score, tier, confidence
   - Selected model and provider
   - Detected patterns and overrides applied
   - Query length (not content for privacy)
   - Routing time and outcome (tokens, cost)
3. [x] Create admin dashboard for routing analytics
4. [x] Track tier distribution, override frequency, and cost savings

**Files Created:**
- `src/lib/server/persistence/migrations/023-routing-decisions.sql` - Database schema
- `src/lib/server/persistence/routing-decisions-postgres.ts` - Repository with analytics queries
- `src/routes/api/admin/routing/stats/+server.ts` - Stats API endpoint
- `src/routes/api/admin/routing/decisions/+server.ts` - Recent decisions API
- `src/routes/api/admin/routing/daily/+server.ts` - Daily totals API
- `src/routes/admin/routing/+page.server.ts` - Admin page server load
- `src/routes/admin/routing/+page.svelte` - Admin analytics dashboard

**Files Modified:**
- `src/routes/api/chat/+server.ts` - Log routing decisions and update outcomes
- `src/lib/components/admin/AdminSidebar.svelte` - Added "AUTO Routing" nav item

**Schema:**
```sql
CREATE TABLE routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  conversation_id UUID,
  provider VARCHAR(50) NOT NULL,
  conversation_turn INTEGER NOT NULL DEFAULT 1,
  selected_model VARCHAR(100) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  score INTEGER NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT,
  routing_time_ms REAL,
  query_length INTEGER,
  detected_patterns TEXT[],
  overrides TEXT[],
  request_succeeded BOOLEAN,
  response_tokens INTEGER,
  estimated_cost_millicents INTEGER
);
```

**Admin Dashboard Features:**
- Key metrics: AUTO requests, avg complexity, avg confidence, est. savings
- Tier distribution with visual bars (Simple/Medium/Complex)
- Model selection breakdown
- Override frequency tracking
- Recent decisions table with full details
- Performance stats (avg routing time, success rate)
- Time period selector (7/30/90 days)

**Repository Interface:**

```typescript
// src/lib/server/persistence/routing-decisions-postgres.ts

export interface RoutingDecisionRecord {
  id: string;
  createdAt: Date;
  userId: string;
  organizationId: string | null;
  conversationId: string | null;
  provider: string;
  conversationTurn: number;
  selectedModel: string;
  tier: 'simple' | 'medium' | 'complex';
  score: number;
  confidence: number;
  reasoning: string | null;
  routingTimeMs: number | null;
  queryLength: number | null;
  detectedPatterns: string[];
  overrides: string[];
  requestSucceeded: boolean | null;
  responseTokens: number | null;
  estimatedCostMillicents: number | null;
}

export interface RoutingStats {
  totalDecisions: number;
  autoUsagePercent: number;
  avgScore: number;
  avgConfidence: number;
  avgRoutingTimeMs: number;
  tierDistribution: { simple: number; medium: number; complex: number };
  tierPercentages: { simple: number; medium: number; complex: number };
  modelDistribution: Array<{ model: string; count: number; percentage: number }>;
  overrideFrequency: Array<{ override: string; count: number; percentage: number }>;
  estimatedSavingsMillicents: number;
  successRate: number;
}

export interface RoutingDecisionsRepository {
  create(data: CreateRoutingDecisionData): Promise<RoutingDecisionRecord>;
  updateOutcome(id: string, data: UpdateRoutingOutcomeData): Promise<void>;
  getRecentDecisions(organizationId: string, limit?: number): Promise<RoutingDecisionRecord[]>;
  getStats(organizationId: string, daysBack?: number): Promise<RoutingStats>;
  getDailyTotals(organizationId: string, daysBack?: number): Promise<DailyRoutingTotals[]>;
}
```

**API Endpoints:**

```
GET /api/admin/routing/stats?period=30
  Returns: RoutingStats + formattedSavings + period
  Auth: Admin/Owner only

GET /api/admin/routing/decisions?limit=50
  Returns: { decisions: RoutingDecisionRecord[] }
  Auth: Admin/Owner only

GET /api/admin/routing/daily?period=30
  Returns: { dailyTotals: DailyRoutingTotals[], period: number }
  Auth: Admin/Owner only
```

**Chat Endpoint Integration:**

The routing decision is logged immediately after `routeQuery()` returns (non-blocking):

```typescript
// src/routes/api/chat/+server.ts (lines 1038-1060)

postgresRoutingDecisionsRepository.create({
  userId: sessionUserId,
  organizationId: locals.session.organizationId || null,
  conversationId: null,
  provider: body.provider || 'anthropic',
  conversationTurn: body.conversationTurn || Math.floor(body.messages.filter(m => m.role === 'user').length),
  selectedModel: routingDecision.selectedModel,
  tier: routingDecision.tier,
  score: routingDecision.complexity.score,
  confidence: routingDecision.complexity.confidence,
  reasoning: routingDecision.reasoning,
  routingTimeMs: routingDecision.routingTimeMs,
  queryLength: userQuery.length,
  detectedPatterns: routingDecision.complexity.signals.filter(s => s.matched).map(s => s.name),
  overrides: routingDecision.overrides.map(o => o.type)
}).then(record => {
  (routingDecision as RoutingDecision & { recordId?: string }).recordId = record.id;
}).catch(err => {
  console.error('[Router] Failed to log routing decision:', err);
});
```

Outcome is updated after streaming completes (3 locations in +server.ts):
- `streamResponse()` - direct streaming path
- `handleChatWithTools()` - tool calling path
- `streamToController()` - nested streaming helper

```typescript
// After saveUsage() in each streaming function
const recordId = (routingDecision as RoutingDecision & { recordId?: string })?.recordId;
if (recordId) {
  postgresRoutingDecisionsRepository.updateOutcome(recordId, {
    requestSucceeded: true,
    responseTokens: completionTokens,
    estimatedCostMillicents: cost
  }).catch(err => {
    console.error('[Router] Failed to update routing outcome:', err);
  });
}
```

**Cost Savings Calculation:**

The dashboard estimates savings by comparing what Haiku requests would have cost if using Sonnet:

```typescript
// Simple tier tokens × (Sonnet output price - Haiku output price) = estimated savings
const sonnetCostForSimple = (simpleTokens / 1000) * sonnetPricing.output;  // $15/M
const haikuCostForSimple = (simpleTokens / 1000) * haikuPricing.output;    // $4/M
const estimatedSavingsMillicents = sonnetCostForSimple - haikuCostForSimple;
```

**Success Criteria:**
- [x] All routing decisions logged to database
- [x] Outcome updated after request completes (tokens, cost, success)
- [x] Can query: "What % of queries went to each tier?"
- [x] Can query: "What's the override rate?"
- [x] Dashboard shows routing distribution and savings

---

### Phase 5: Threshold Tuning (Priority: MEDIUM)

**Duration:** Ongoing after Phase 4
**Goal:** Optimize thresholds based on data

**Tasks:**
1. [ ] Analyze routing logs after 1-2 weeks
2. [ ] Identify false positives (simple→Sonnet when Haiku would work)
3. [ ] Identify false negatives (complex→Haiku, bad results)
4. [ ] Adjust `THRESHOLDS.simpleConfidence` based on data
5. [ ] A/B test threshold changes
6. [ ] Document threshold changes and rationale

**Success Criteria:**
- [ ] Haiku usage increases from ~20% to ~40%
- [ ] Quality metrics maintained (no increase in regenerate rate)
- [ ] Cost per conversation decreases

---

## Success Criteria

### Functional Requirements

| Requirement | Metric | Target |
|-------------|--------|--------|
| Routing latency | p95 routing time | <5ms |
| Model selection accuracy | User override rate | <10% |
| Simple query detection | True positive rate | >90% |
| Complex query detection | True positive rate | >85% |
| AUTO as default | New conversation default | 100% |

### Business Metrics

| Metric | Baseline | Phase 1 Target | Phase 2 Target |
|--------|----------|----------------|----------------|
| Cost per conversation | $0.15-0.50 | $0.10-0.35 (-30%) | $0.06-0.20 (-50%) |
| Haiku usage | 0% | 20% | 40% |
| Sonnet usage | 80% | 65% | 50% |
| Opus usage | 20% | 15% | 10% |

### Quality Guardrails

| Metric | Threshold | Action if Breached |
|--------|-----------|-------------------|
| Regenerate rate | +5% from baseline | Increase simpleConfidence |
| Conversation length | -10% from baseline | Review routing patterns |
| User complaints | Any quality-related | Immediate review |
| Override rate | >15% | Analyze override patterns |

---

## Testing Strategy

### Unit Tests

```typescript
// src/lib/services/model-router/__tests__/query-analyzer.test.ts

describe('QueryAnalyzer', () => {
  describe('simple queries', () => {
    test('greetings score as simple', () => {
      expect(analyzeQuery('hi').tier).toBe('simple');
      expect(analyzeQuery('hello there').tier).toBe('simple');
      expect(analyzeQuery('thanks!').tier).toBe('simple');
    });

    test('short factual questions score as simple', () => {
      expect(analyzeQuery('What is TypeScript?').tier).toBe('simple');
      expect(analyzeQuery('Who is the CEO of Apple?').tier).toBe('simple');
      expect(analyzeQuery('When was Python created?').tier).toBe('simple');
    });

    test('list requests score as simple', () => {
      expect(analyzeQuery('List 5 programming languages').tier).toBe('simple');
      expect(analyzeQuery('Name some databases').tier).toBe('simple');
    });
  });

  describe('complex queries', () => {
    test('analysis requests score as complex', () => {
      expect(analyzeQuery('Analyze this codebase and suggest improvements').tier).toBe('complex');
      expect(analyzeQuery('Compare React and Vue for enterprise apps').tier).toBe('complex');
    });

    test('research requests score as complex', () => {
      expect(analyzeQuery('Research the best practices for microservices').tier).toBe('complex');
      expect(analyzeQuery('Write a comprehensive report on AI trends').tier).toBe('complex');
    });

    test('strategy requests score as complex', () => {
      expect(analyzeQuery('Design a strategy for scaling our platform').tier).toBe('complex');
      expect(analyzeQuery('What are the architectural trade-offs?').tier).toBe('complex');
    });
  });

  describe('medium queries', () => {
    test('code questions score as medium', () => {
      expect(analyzeQuery('Write a function to sort an array').tier).toBe('medium');
      expect(analyzeQuery('How do I implement authentication?').tier).toBe('medium');
    });

    test('explanations score as medium', () => {
      expect(analyzeQuery('Explain how React hooks work').tier).toBe('medium');
      expect(analyzeQuery('Help me understand async/await').tier).toBe('medium');
    });
  });
});
```

### Integration Tests

```typescript
// src/lib/services/model-router/__tests__/router.test.ts

describe('Router Integration', () => {
  test('thinking enabled forces minimum Sonnet', () => {
    const result = routeQuery('What is 2+2?', {
      ...defaultContext,
      thinkingEnabled: true
    });

    expect(result.tier).not.toBe('simple');
    expect(result.overrides).toContainEqual(
      expect.objectContaining({ type: 'thinking' })
    );
  });

  test('research space increases complexity', () => {
    const normalResult = routeQuery('Explain TypeScript', {
      ...defaultContext,
      spaceType: null
    });

    const researchResult = routeQuery('Explain TypeScript', {
      ...defaultContext,
      spaceType: 'research'
    });

    expect(researchResult.complexity.score).toBeGreaterThan(normalResult.complexity.score);
  });

  test('routing completes in <5ms', () => {
    const result = routeQuery('A moderately complex query about software architecture', defaultContext);
    expect(result.routingTimeMs).toBeLessThan(5);
  });
});
```

### Manual Test Cases

| Test Case | Query | Expected Tier | Expected Model |
|-----------|-------|---------------|----------------|
| Greeting | "Hi there!" | Simple | Haiku |
| Simple factual | "What is JavaScript?" | Simple | Haiku |
| How-to | "How do I center a div?" | Medium | Sonnet |
| Code request | "Write a sorting function" | Medium | Sonnet |
| Analysis | "Analyze this architecture" | Complex | Opus |
| Research | "Research best practices" | Complex | Opus |
| Thinking + simple | "What is 2+2?" (thinking ON) | Medium | Sonnet |

---

## Monitoring & Iteration

### Dashboards

**Routing Distribution Dashboard:**
- Pie chart: Simple / Medium / Complex distribution
- Time series: Distribution over time
- Provider breakdown

**Cost Impact Dashboard:**
- Cost per conversation (before/after)
- Projected savings
- Model usage by tier

**Quality Dashboard:**
- Regenerate rate by tier
- Override rate by tier
- Conversation length by tier

### Alerts

| Alert | Trigger | Action |
|-------|---------|--------|
| High override rate | >20% daily | Review routing patterns |
| Quality degradation | +10% regenerate rate | Increase thresholds |
| Routing latency | p95 >10ms | Performance investigation |
| Haiku quality issues | User complaints | Review simple signals |

### Iteration Cycle

```
Week 1-2: Phase 1 Launch (Conservative)
├── simpleConfidence: 0.85
├── Expected Haiku usage: ~20%
└── Monitor quality closely

Week 3-4: Analyze & Adjust
├── Review routing logs
├── Identify safe downgrade opportunities
└── Adjust thresholds if quality maintained

Week 5-6: Phase 2 (Moderate)
├── simpleConfidence: 0.70
├── Expected Haiku usage: ~35%
└── Continue monitoring

Week 7+: Phase 3 (Aggressive) - If Quality Maintained
├── simpleConfidence: 0.50
├── Expected Haiku usage: ~50%
└── Steady state
```

---

## Appendix

### A. Signal Reference

**Simple Signals (decrease score):**
| Signal | Weight | Pattern |
|--------|--------|---------|
| greeting | -25 | ^(hi\|hello\|hey\|thanks) |
| short_query | -20 | <15 tokens |
| what_is | -15 | ^what (is\|are) |
| definition | -15 | ^define |
| list_request | -10 | ^(list\|name\|give me) |
| ends_question | -5 | \?$ |

**Complex Signals (increase score):**
| Signal | Weight | Pattern |
|--------|--------|---------|
| analyze | +20 | \banalyze\b |
| design | +20 | \b(design\|architect)\b |
| strategy | +20 | \bstrateg |
| research | +20 | \b(research\|report)\b |
| compare | +15 | \b(compare\|contrast)\b |
| tradeoffs | +15 | \btrade-?offs?\b |
| long_query | +15 | >100 tokens |
| multiple_questions | +15 | >2 question marks |

### B. Model Pricing Reference (January 2026)

| Model | Input/M | Output/M | Cache Read |
|-------|---------|----------|------------|
| Claude Haiku 4.5 | $0.80 | $4.00 | $0.08 |
| Claude Sonnet 4 | $3.00 | $15.00 | $0.30 |
| Claude Opus 4.5 | $15.00 | $75.00 | $1.50 |
| GPT-4o-mini | $0.15 | $0.60 | $0.075 |
| GPT-4o | $5.00 | $15.00 | $2.50 |
| GPT-5 | $1.25 | $10.00 | - |

### C. Research References

- [RouteLLM - LMSYS](https://lmsys.org/blog/2024-07-01-routellm/) - 85% cost reduction at 95% quality
- [BEST-Route - Microsoft](https://github.com/microsoft/best-route-llm) - ICML 2025
- [Martian](https://withmartian.com) - Production routing platform
- [Not Diamond](https://www.notdiamond.ai) - Custom router training
- Enterprise case studies: 40-70% cost reduction documented

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-11 | 1.0 | Initial specification |
| 2026-01-11 | 1.1 | Phase 1 complete: Core router service with 23 tests |
| 2026-01-11 | 1.2 | Phase 2 complete: Chat endpoint integration with SSE routing event |
| 2026-01-11 | 1.3 | Phase 3 complete: UI integration with ModelSelector, Header, stores |
| 2026-01-11 | 1.4 | Phase 4 complete: Logging & Analytics with admin dashboard |
