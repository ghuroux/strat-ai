# Model Arena

> **Last Updated:** January 2026
> **Audience:** Developers, Product Managers

## Table of Contents

1. [Overview](#overview)
2. [User Personas](#user-personas)
3. [User Flow](#user-flow)
4. [Architecture](#architecture)
5. [Data Model](#data-model)
6. [Battle Phases](#battle-phases)
7. [AI Judge System](#ai-judge-system)
8. [Templates & Categories](#templates--categories)
9. [Smart Pick Algorithm](#smart-pick-algorithm)
10. [Blind Mode](#blind-mode)
11. [API Reference](#api-reference)
12. [Code Locations](#code-locations)
13. [Design Decisions](#design-decisions)
14. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Model Arena?

Model Arena is a feature that allows users to compare AI models side-by-side in real-time. Users submit a single prompt and receive parallel responses from 2-4 models, then vote on which response they prefer. An AI Judge (Claude Sonnet 4.5) provides an objective evaluation alongside the user's vote.

### Core Principles

1. **Side-by-Side Comparison** — All responses stream in parallel, enabling direct comparison.
2. **User-First Voting** — Users vote before seeing the AI Judge verdict (vote-first flow).
3. **Provider Diversity** — Smart Pick ensures models from different providers are compared.
4. **Blind Mode** — Optional mode that hides model names until after voting.
5. **Category-Aware** — Battles are tagged by category (coding, creative, analysis, reasoning, research, general) for community insights.
6. **Continuation Flow** — Winners can be continued as full conversations in Spaces.

### What Arena is NOT

- **Not a leaderboard** — While rankings are planned, Arena focuses on personal discovery.
- **Not ELO-based** — We don't use ELO ratings; scores are per-battle.
- **Not anonymous** — Model names are visible (unless Blind Mode is enabled).

---

## User Personas

### 1. Curious Novice
> "I want to learn which AI model is best for my use case."

- Uses Quick Start templates to explore
- Learns model strengths through comparison
- Discovers providers they hadn't considered

### 2. Active Tester
> "I systematically compare models for my specific workflows."

- Uses custom prompts tailored to their domain
- Tracks preferences across categories
- Makes informed decisions about which models to use

### 3. Conversation Starter
> "I want to audition models before committing to a full conversation."

- Uses Arena as a "first date" with models
- Continues winning responses as full conversations
- Saves time by finding the right model upfront

---

## User Flow

### Full Battle Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARENA BATTLE FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. SETUP PHASE                                                          │
│     └─→ User arrives at /arena                                          │
│     └─→ Choose Quick Start template OR customize battle                 │
│     └─→ Select 2-4 models (Smart Pick available)                        │
│     └─→ Optionally enable Blind Mode                                    │
│     └─→ Optionally select Space/Area context                            │
│                                                                          │
│  2. PROMPT ENTRY                                                         │
│     └─→ User enters prompt (or uses template prompt)                    │
│     └─→ Optionally set reasoning effort (low/medium/high)               │
│     └─→ Click "Start Battle"                                            │
│                                                                          │
│  3. STREAMING PHASE                                                      │
│     └─→ Battle created with status: 'streaming'                         │
│     └─→ All models receive prompt simultaneously                        │
│     └─→ Responses stream in parallel (SSE)                              │
│     └─→ Thinking content shown if model supports it                     │
│     └─→ User can click "Stop All" to abort                              │
│                                                                          │
│  4. COMPLETE PHASE                                                       │
│     └─→ All responses finished → status: 'complete'                     │
│     └─→ AI Judge request sent (status: 'judging')                       │
│     └─→ Voting prompt appears                                           │
│                                                                          │
│  5. VOTING PHASE                                                         │
│     └─→ User picks their preferred response                             │
│     └─→ OR clicks "Skip voting"                                         │
│     └─→ Vote triggers ranking update on server                          │
│                                                                          │
│  6. JUDGMENT PHASE                                                       │
│     └─→ AI Judge verdict revealed                                       │
│     └─→ Scores and analysis shown                                       │
│     └─→ User vote vs AI Judge comparison displayed                      │
│     └─→ Status: 'judged'                                                │
│                                                                          │
│  7. POST-BATTLE                                                          │
│     └─→ "Continue with [Winner]" button appears                         │
│     └─→ User can start new conversation with winning model              │
│     └─→ "New Battle" to start fresh                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Quick Start vs Custom

| Mode | Description |
|------|-------------|
| **Quick Start** | User selects a pre-defined template → category auto-set, sample prompt provided |
| **Customize** | User manually sets category, context, and writes their own prompt |

When a user selects a template, the Customize section hides. When they interact with Customize, the Quick Start section hides.

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (SvelteKit)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │   Arena Page        │    │   Arena Store       │                     │
│  │   (+page.svelte)    │◄──►│   (arena.svelte.ts) │                     │
│  │                     │    │                     │                     │
│  │  • Battle setup     │    │  • createBattle()   │                     │
│  │  • Response grid    │    │  • updateResponse() │                     │
│  │  • Voting UI        │    │  • setUserVote()    │                     │
│  │  • Judgment display │    │  • setAiJudgment()  │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│            │                          │                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ ArenaQuickStart     │    │ ArenaModelSelection │                     │
│  │ (template picker)   │    │ (model grid + Smart │                     │
│  │                     │    │  Pick)              │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ ArenaGrid           │    │ ArenaResponseCard   │                     │
│  │ (2-col layout)      │    │ (response display,  │                     │
│  │                     │    │  focus mode, copy)  │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ ArenaVotingPrompt   │    │ ArenaJudgment       │                     │
│  │ (vote-first UI)     │    │ (AI verdict display)│                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │ ArenaContinueModal  │    │ ArenaContextPicker  │                     │
│  │ (continue convo)    │    │ (Space/Area select) │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (API)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │   /api/chat         │    │   /api/arena/judge  │                     │
│  │   (+server.ts)      │    │   (+server.ts)      │                     │
│  │                     │    │                     │                     │
│  │  • Streams response │    │  • Evaluates models │                     │
│  │  • Handles thinking │    │  • Returns scores   │                     │
│  │  • Reports metrics  │    │  • Category detect  │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│                                                                          │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │   /api/arena/       │    │   /api/arena/       │                     │
│  │   battles           │    │   rankings          │                     │
│  │   (+server.ts)      │    │   (+server.ts)      │                     │
│  │                     │    │                     │                     │
│  │  • CRUD operations  │    │  • Get rankings     │                     │
│  │  • PostgreSQL sync  │    │  • By category      │                     │
│  └─────────────────────┘    └─────────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL (LiteLLM Proxy)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  • Routes requests to providers (Anthropic, OpenAI, Google, etc.)       │
│  • Handles authentication via virtual keys                              │
│  • Normalizes response formats                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Persistence Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYERS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PRIMARY: PostgreSQL                                                     │
│  ├─ arena_battles table                                                 │
│  ├─ model_rankings table                                                │
│  └─ Accessed via /api/arena/* endpoints                                 │
│                                                                          │
│  CACHE: localStorage                                                     │
│  ├─ Key: 'strathost-arena-battles'                                      │
│  ├─ Fast initial load                                                   │
│  ├─ Offline support                                                     │
│  └─ Max 50 battles cached                                               │
│                                                                          │
│  SYNC: Background                                                        │
│  ├─ On page load: Fetch from API, merge with local                      │
│  ├─ On battle complete: Push to API                                     │
│  ├─ On vote/judgment: PATCH to API                                      │
│  └─ Debounced at 500ms to batch updates                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Battle Status

```typescript
type BattleStatus = 'pending' | 'streaming' | 'complete' | 'judging' | 'judged';
```

| Status | Description |
|--------|-------------|
| `pending` | Battle created but not started (unused currently) |
| `streaming` | Responses are being streamed from models |
| `complete` | All responses finished, AI Judge request sent |
| `judging` | Waiting for AI Judge response |
| `judged` | AI Judge verdict received |

### Core Types

```typescript
interface ArenaBattle {
  id: string;                      // UUID
  prompt: string;                  // User's original prompt
  title?: string;                  // Optional custom title
  pinned?: boolean;                // Pinned to top of history
  models: ArenaModel[];            // Models in this battle
  responses: ArenaResponse[];      // Response data per model
  userVote?: string;               // Model ID user voted for
  aiJudgment?: ArenaJudgment;      // AI Judge verdict
  settings: BattleSettings;        // Battle configuration
  status: BattleStatus;            // Current phase
  createdAt: number;               // Unix timestamp
  suggestedCategory?: TemplateCategory; // AI-detected category
}

interface ArenaModel {
  id: string;                      // Model identifier (e.g., 'claude-sonnet-4-5')
  displayName: string;             // Human-readable name
  provider: string;                // Provider (anthropic, openai, google, etc.)
}

interface ArenaResponse {
  id: string;                      // UUID
  modelId: string;                 // Which model this is from
  content: string;                 // Response text
  thinking?: string;               // Extended thinking content (if supported)
  isStreaming: boolean;            // Currently receiving content
  isThinking: boolean;             // Currently in thinking phase
  error?: string;                  // Error message if failed
  sources?: SearchSource[];        // Web search sources (if enabled)
  searchStatus?: 'searching' | 'complete';
  searchQuery?: string;            // Query being searched
  startedAt: number;               // When streaming started
  completedAt?: number;            // When streaming finished
  durationMs?: number;             // Total response time
  firstTokenAt?: number;           // Time to first token
  metrics?: ResponseMetrics;       // Token usage
}

interface ArenaJudgment {
  winnerId: string | null;         // Winner model ID (null if tie)
  analysis: string;                // 2-4 sentence explanation
  scores: Record<string, number>;  // Scores per model (1-10)
  criteria: string[];              // Criteria used for evaluation
  timestamp: number;               // When judgment was made
}

interface BattleSettings {
  webSearchEnabled: boolean;       // Enable web search for models
  extendedThinkingEnabled: boolean; // Enable extended thinking
  thinkingBudgetTokens: number;    // Token budget for thinking
  temperature: number;             // Model temperature
  reasoningEffort: 'low' | 'medium' | 'high'; // Reasoning effort
  blindMode: boolean;              // Hide model names until vote
  category: TemplateCategory;      // Battle category
  contextSpaceId?: string;         // Optional Space context
  contextAreaId?: string;          // Optional Area context
}

interface ResponseMetrics {
  inputTokens?: number;            // Prompt tokens
  outputTokens?: number;           // Completion tokens
  reasoningTokens?: number;        // Reasoning tokens (OpenAI)
  estimatedCost?: number;          // Estimated USD cost
  timeToFirstToken?: number;       // TTFT in ms
}
```

### Template Category

```typescript
type TemplateCategory = 'coding' | 'creative' | 'analysis' | 'reasoning' | 'research' | 'general';
```

| Category | Description | Example Prompts |
|----------|-------------|-----------------|
| `coding` | Programming, debugging, algorithms | Code review, algorithm challenge |
| `creative` | Writing, storytelling, marketing | Story writing, ELI5 explanation |
| `analysis` | Comparisons, summaries, research | Pros & cons, tech comparison |
| `reasoning` | Logic, math, ethical dilemmas | Logic puzzles, math problems |
| `research` | Current events, fact-checking (requires tools) | Market research, fact checking |
| `general` | Catch-all for other prompts | Concept explainer, brainstorming |

---

## Battle Phases

### Phase 1: Setup

**Components:** `ArenaQuickStart`, `ArenaModelSelection`, `ArenaCategoryChips`, `ArenaContextPicker`

**User Actions:**
- Select a Quick Start template OR customize category/context
- Select 2-4 models (manually or via Smart Pick / Surprise Me)
- Optionally enable Blind Mode
- Enter prompt text

**Key State:**
```typescript
selectedModels: string[]        // Max 4
selectedCategory: TemplateCategory
selectedTemplate: BattleTemplate | null
contextSpaceId: string | null
contextAreaId: string | null
```

### Phase 2: Streaming

**Trigger:** User clicks "Start Battle"

**Process:**
1. Battle created via `arenaStore.createBattle()`
2. All models receive the same prompt via parallel `fetch('/api/chat')`
3. SSE streams parsed and content appended via `updateResponse()` / `appendToResponse()`
4. Thinking content handled separately via `appendToThinking()`
5. Token metrics captured from `usage` events

**Response Grid:**
- 2-column layout for 2-4 models (always readable)
- Cards show streaming indicator, thinking status
- Focus mode available (expand single response)

### Phase 3: Complete

**Trigger:** All responses finish streaming

**Process:**
1. `arenaStore.completeResponse()` called for each model
2. Battle status → `'complete'`
3. AI Judge request sent immediately
4. Battle synced to PostgreSQL

### Phase 4: Voting

**Trigger:** Responses complete, user hasn't voted

**UI:** `ArenaVotingPrompt` appears

**User Actions:**
- Click a model card to vote
- OR click "Skip voting" to proceed without voting

**Vote Behavior:**
- `setUserVote()` stores vote and PATCHes to API
- Triggers ranking update on server
- User vote vs AI Judge comparison tracked

### Phase 5: Judgment

**Trigger:** User votes or skips

**UI:** `ArenaJudgment` component reveals

**Display:**
- Winner badge (if not a tie)
- Score bar chart (visual comparison)
- 2-4 sentence analysis
- User vote agreement indicator ("You agreed!" or "Different take")

### Phase 6: Post-Battle

**UI:** Action buttons appear

**Options:**
1. **Continue with [Winner]** — Opens `ArenaContinueModal`, creates conversation with winning model
2. **New Battle** — Resets to setup phase

---

## AI Judge System

### Overview

The AI Judge uses Claude Sonnet 4.5 to objectively evaluate model responses. It runs automatically after all responses complete.

### Judge Model

```typescript
const JUDGE_MODEL = 'anthropic/claude-sonnet-4-20250514';
```

### Evaluation Criteria

The judge evaluates on 5 criteria:

| Criterion | Description |
|-----------|-------------|
| **Accuracy** | Is the information correct and factual? |
| **Completeness** | Does it fully address the prompt? |
| **Clarity** | Is it well-organized and easy to understand? |
| **Helpfulness** | Does it provide actionable, useful information? |
| **Conciseness** | Is it appropriately detailed without being verbose? |

### Scoring

- Scores range from 1-10 per model
- 9-10: Exceptional quality
- 7-8: Good quality
- 5-6: Adequate
- 3-4: Below average
- 1-2: Poor quality

### Category Detection

When the user selects "general" as the category, the AI Judge also detects a more specific category:

```typescript
interface JudgeResponse {
  winnerId: string | null;
  analysis: string;
  scores: Record<string, number>;
  criteria: string[];
  suggestedCategory?: TemplateCategory;  // Detected category
  categoryConfidence?: number;           // 0.0-1.0
}
```

The detected category is shown in the battle header as "AI suggests: [category]".

### System Prompt

The judge receives a detailed system prompt instructing it to:
- Be objective and unbiased
- Focus on response content, not model names
- Reflect meaningful score differences
- Declare a tie if responses are truly equal
- Return structured JSON

---

## Templates & Categories

### Template Structure

```typescript
interface BattleTemplate {
  id: string;           // Unique identifier
  name: string;         // Display name
  category: TemplateCategory;
  icon: string;         // Emoji icon
  description: string;  // Short description
  prompt: string;       // Pre-filled prompt text
}
```

### Available Templates

| Category | Templates |
|----------|-----------|
| **Coding** | Code Review, Algorithm Challenge, Debug Helper, Refactoring |
| **Creative** | Story Writing, ELI5 Explanation, Marketing Copy |
| **Analysis** | Pros & Cons Analysis, Document Summary, Tech Comparison |
| **Reasoning** | Logic Puzzle, Math Problem, Ethical Analysis |
| **Research** | Current Events, Market Research, Competitor Analysis, Fact Checker |
| **General** | Concept Explainer, Brainstorming, Debate Both Sides |

### Research Category

The Research category is special because it requires tool/web search capabilities:

```typescript
research: {
  label: 'Research',
  color: 'text-cyan-400 bg-cyan-500/20',
  requiresTools: true  // Flag for UI hints
}
```

---

## Smart Pick Algorithm

### Purpose

Smart Pick selects diverse, capable models optimized for a specific category. It ensures provider diversity (one Claude, one GPT, etc.).

### Location

`src/lib/utils/smart-pick.ts`

### Top Models by Category

```typescript
const CATEGORY_TOP_MODELS: Record<TemplateCategory, string[]> = {
  coding: ['claude-sonnet-4-5', 'gpt-5-2-pro', 'claude-opus-4-5', 'deepseek-v3-1', 'gpt-5-1-codex-max'],
  creative: ['claude-opus-4-5', 'gpt-5-2-pro', 'gemini-3-pro', 'claude-sonnet-4-5'],
  analysis: ['claude-opus-4-5', 'gpt-5-2-pro', 'gemini-3-pro', 'o3-mini'],
  reasoning: ['o3', 'claude-opus-4-5', 'deepseek-r1', 'gpt-5-2-pro', 'o3-mini'],
  research: ['claude-sonnet-4-5', 'claude-opus-4-5', 'gpt-5-2-pro', 'gemini-3-pro'],
  general: ['claude-sonnet-4-5', 'gpt-5-2-pro', 'gemini-3-pro', 'claude-opus-4-5']
};
```

### getSmartPick(category)

Returns 2 models optimized for the category with different providers:

```typescript
export function getSmartPick(category: TemplateCategory): string[] {
  // 1. Get top models for category
  // 2. Filter to available models
  // 3. Pick first model
  // 4. Pick second model from different provider
  return [firstModel, secondModel];
}
```

### getSurpriseMe(count)

Returns random models with provider diversity:

```typescript
export function getSurpriseMe(count: number = 2): string[] {
  // 1. Group models by provider
  // 2. Shuffle providers
  // 3. Pick one model from each provider
  // 4. Prefer capable models (thinking support, large context)
  return selectedModels;
}
```

---

## Blind Mode

### Purpose

Blind Mode hides model names and provider badges until after the user votes. This reduces bias and encourages objective evaluation of response quality.

### Behavior

| Phase | Model Names | Provider Badges |
|-------|-------------|-----------------|
| Setup | Visible | Visible |
| Streaming (Blind) | Hidden ("Model A", "Model B") | Hidden |
| Voting (Blind) | Hidden | Hidden |
| After Vote | Revealed with animation | Revealed |

### Animation

When revealed, model names use Svelte transitions:

```svelte
{#if !blindMode || hasVoted}
  <span transition:fly={{ y: -10, duration: 300 }}>
    {modelName}
  </span>
{:else}
  <span transition:scale={{ start: 0.8, duration: 200 }}>
    Model {letter}
  </span>
{/if}
```

---

## API Reference

### Start Battle (via Chat API)

**Endpoint:** `POST /api/chat`

**Usage:** Called per-model in parallel

**Body:**
```typescript
{
  model: string;
  messages: [{ role: 'user', content: string }];
  temperature: number;
  max_tokens: number;
  searchEnabled: boolean;
  thinkingEnabled: boolean;
  thinkingBudgetTokens: number;
  reasoningEffort: 'low' | 'medium' | 'high';
}
```

**Response:** SSE stream with events:
- `type: 'content'` — Response content
- `type: 'thinking'` — Thinking content
- `type: 'thinking_start'` / `type: 'thinking_end'`
- `type: 'status'` — Search status
- `type: 'sources'` — Web search sources
- `type: 'usage'` — Token metrics

### Get AI Judgment

**Endpoint:** `POST /api/arena/judge`

**Body:**
```typescript
{
  prompt: string;
  category?: TemplateCategory;
  responses: Array<{
    modelId: string;
    modelName: string;
    content: string;
  }>;
}
```

**Response:**
```typescript
{
  winnerId: string | null;
  analysis: string;
  scores: Record<string, number>;
  criteria: string[];
  suggestedCategory?: TemplateCategory;
  categoryConfidence?: number;
}
```

### Battle CRUD

**Get All Battles:** `GET /api/arena/battles`

**Get Single Battle:** `GET /api/arena/battles/[id]`

**Create Battle:** `POST /api/arena/battles`

**Update Battle:** `PUT /api/arena/battles/[id]`

**Partial Update:** `PATCH /api/arena/battles/[id]`
- Used for votes, judgments, pins, titles

**Delete Battle:** `DELETE /api/arena/battles/[id]`

### Rankings

**Get Rankings:** `GET /api/arena/rankings`
- Query param `?all=true` for all models (not just user's)

---

## Code Locations

### Frontend

| File | Purpose |
|------|---------|
| `src/routes/arena/+page.svelte` | Main Arena page with full battle flow |
| `src/lib/stores/arena.svelte.ts` | Arena store (battles, votes, sync) |
| `src/lib/components/arena/ArenaQuickStart.svelte` | Template picker |
| `src/lib/components/arena/ArenaModelSelection.svelte` | Model grid with Smart Pick |
| `src/lib/components/arena/ArenaCategoryChips.svelte` | Category filter chips |
| `src/lib/components/arena/ArenaContextPicker.svelte` | Space/Area context picker |
| `src/lib/components/arena/ArenaInput.svelte` | Prompt input with settings |
| `src/lib/components/arena/ArenaGrid.svelte` | 2-column response layout |
| `src/lib/components/arena/ArenaResponseCard.svelte` | Response display with focus/copy |
| `src/lib/components/arena/ArenaVotingPrompt.svelte` | Vote-first prompt |
| `src/lib/components/arena/ArenaJudgment.svelte` | AI Judge verdict display |
| `src/lib/components/arena/ArenaContinueModal.svelte` | Continue conversation modal |
| `src/lib/components/arena/ArenaTabs.svelte` | Battle/Results/Rankings tabs |
| `src/lib/utils/smart-pick.ts` | Smart Pick algorithm |
| `src/lib/config/battle-templates.ts` | Template definitions |

### Backend

| File | Purpose |
|------|---------|
| `src/routes/api/chat/+server.ts` | Chat API (streaming responses) |
| `src/routes/api/arena/judge/+server.ts` | AI Judge endpoint |
| `src/routes/api/arena/battles/+server.ts` | Battle list API |
| `src/routes/api/arena/battles/[id]/+server.ts` | Single battle API |
| `src/routes/api/arena/rankings/+server.ts` | Rankings API |
| `src/lib/server/persistence/arena-postgres.ts` | PostgreSQL repository |
| `src/lib/server/persistence/arena-schema.sql` | Database schema |

### Configuration

| File | Purpose |
|------|---------|
| `src/lib/config/battle-templates.ts` | Template definitions, categories |
| `src/lib/config/model-capabilities.ts` | Model metadata (provider, features) |

---

## Design Decisions

### Why 2-Column Layout?

**Decision:** Always use 2-column grid for 3-4 models.

**Rationale:**
- 4 narrow columns are unreadable on most screens
- Reading long responses requires adequate width
- Scrolling vertically is acceptable; horizontal cramping is not
- Consistent layout regardless of model count

### Why Vote-First Flow?

**Decision:** Show voting prompt before AI Judge verdict.

**Rationale:**
- Reduces anchoring bias (users form own opinion first)
- Encourages engagement (users feel their vote matters)
- Enables user vs AI comparison ("You agreed!")
- Better data for future rankings

### Why Hide Sidebar on Arena?

**Decision:** Arena page has no sidebar.

**Rationale:**
- Maximizes horizontal space for responses
- Focused, distraction-free comparison experience
- Arena is a dedicated tool, not part of normal chat workflow

### Why Smart Pick Ensures Provider Diversity?

**Decision:** Always pick models from different providers.

**Rationale:**
- Prevents comparing Claude vs Claude (uninteresting)
- Exposes users to providers they might not try
- More valuable comparison data
- Fair representation across ecosystem

### Why AI Judge Uses Claude Sonnet 4.5?

**Decision:** Fixed judge model, not configurable.

**Rationale:**
- Consistent evaluation across all battles
- Sonnet 4.5 balances quality and cost
- Avoids "judge shopping" bias
- Simpler UX (one less decision for user)

### Why localStorage + PostgreSQL?

**Decision:** Dual persistence with sync.

**Rationale:**
- Fast initial load from localStorage
- Offline support for browsing history
- PostgreSQL as source of truth for rankings
- Background sync avoids blocking UX

### Why Blind Mode is Optional?

**Decision:** Blind Mode is opt-in, not default.

**Rationale:**
- Some users want to learn specific model behaviors
- Blind mode adds cognitive overhead
- Power users may have model preferences to validate
- Default should be most intuitive

---

## Troubleshooting

### Battle Stuck in Streaming

**Symptom:** Battle shows spinning indicators but no content arriving.

**Cause:** Network error or model timeout.

**Fix:**
- Click "Stop All" to abort
- Check browser console for errors
- Retry with fewer models

### AI Judge Returns Null Winner

**Symptom:** No winner highlighted, verdict says "tie".

**Cause:** Responses were genuinely equivalent in quality.

**Behavior:** This is expected when responses are similar. The judge is instructed to declare ties honestly.

### Model Not Appearing in Selection

**Symptom:** Expected model missing from grid.

**Cause:** Model not configured in `model-capabilities.ts` or LiteLLM.

**Fix:**
```typescript
// In src/lib/config/model-capabilities.ts
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  'your-model-id': {
    provider: 'provider-name',
    contextWindow: 128000,
    supportsThinking: false,
    // ...
  }
};
```

### Responses Errored

**Symptom:** Red error message on response card.

**Cause:** Model API error (rate limit, auth, timeout).

**Behavior:** AI Judge is skipped when any response has errors. Toast notification explains this.

### Rankings Not Updating

**Symptom:** Vote submitted but rankings unchanged.

**Cause:** Background sync may be delayed.

**Fix:** Manually refresh via `arenaStore.refresh()` or wait for sync.

### Blind Mode Names Not Revealing

**Symptom:** After voting, still shows "Model A".

**Cause:** State not updating correctly.

**Debug:**
1. Check `hasVoted` prop is truthy
2. Check `blindMode` setting in battle
3. Verify vote was stored via `activeBattle.userVote`

---

## Future Considerations

1. **My Results Tab** — Battle history with filtering, search, export
2. **Rankings Tab** — Personal and community leaderboards by category
3. **BattleOutcome Persistence** — Comprehensive outcome tracking for analytics
4. **Cost Tracking** — Display estimated cost per response
5. **Rematch** — Re-run same prompt with different models
6. **Share Battle** — Public link to battle results
7. **Tournament Mode** — Bracket-style multi-round comparisons
8. **Custom Judge Criteria** — User-defined evaluation criteria
9. **Model Notes** — Save observations about specific models
