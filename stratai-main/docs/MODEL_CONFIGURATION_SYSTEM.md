# Model Configuration System

## Overview

A data-driven system for managing model-specific parameters, constraints, and capabilities without hardcoding quirks into application code.

**Problem Statement:**
Model providers have inconsistent API parameter support:
- OpenAI GPT-5.2 Instant: temperature **must** be exactly 1
- Claude models: temperature 0-1
- Some models: don't support `top_p`
- Some models: have specific max token limits
- Constraints change as providers update their APIs

Hardcoding these quirks creates maintenance nightmares and requires deployments for simple fixes.

**Solution:**
A hybrid system where:
1. **Code provides defaults** (`model-capabilities.ts`)
2. **Database provides runtime overrides** (`model_configurations` table)
3. **API layer applies constraints** before calling LiteLLM
4. **Admin UI enables runtime fixes** without deployments

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin UI                                  │
│      /admin/models → View, edit, enable/disable models           │
│      Real-time updates, no deployment required                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                 model_configurations (Database)                  │
│                                                                  │
│  • parameter_constraints (JSONB) - Runtime overrides             │
│  • capabilities_override (JSONB) - Feature flag overrides        │
│  • enabled/deprecated flags - Model availability                 │
│  • notes - Documentation for why constraints exist               │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Overrides code defaults
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              model-capabilities.ts (Code Defaults)               │
│                                                                  │
│  • Base capability definitions (context window, vision, etc.)    │
│  • Default parameter constraints                                 │
│  • Fallback when no DB override exists                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              applyModelConstraints() (API Layer)                 │
│                                                                  │
│  • Load model config (DB override → Code fallback)               │
│  • Validate/clamp/omit parameters                                │
│  • Log constraint applications for debugging                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    LiteLLM Proxy → Provider API
```

---

## Data Model

### Parameter Constraints Schema

```typescript
/**
 * Constraints for a single API parameter.
 * Each field is optional - only specify what you need to constrain.
 */
interface ParameterConstraint {
  /** If false, parameter is completely omitted from API request */
  supported?: boolean;

  /** If set, parameter MUST be exactly this value (user choice ignored) */
  fixed?: number;

  /** Minimum allowed value (user values below this are clamped up) */
  min?: number;

  /** Maximum allowed value (user values above this are clamped down) */
  max?: number;

  /** Default value when user doesn't specify (only if supported) */
  default?: number;
}

/**
 * Complete parameter constraints for a model.
 * Extensible via index signature for future parameters.
 */
interface ParameterConstraints {
  temperature?: ParameterConstraint;
  maxTokens?: ParameterConstraint;
  topP?: ParameterConstraint;
  topK?: ParameterConstraint;
  frequencyPenalty?: ParameterConstraint;
  presencePenalty?: ParameterConstraint;

  /** Stop sequences configuration */
  stop?: {
    supported?: boolean;
    maxSequences?: number;  // Max number of stop sequences allowed
  };

  /** Extensible for future parameters */
  [key: string]: ParameterConstraint | { supported?: boolean; maxSequences?: number } | undefined;
}
```

### Capability Overrides Schema

```typescript
/**
 * Override specific capabilities at runtime.
 * Only specified fields override the code defaults.
 */
interface CapabilityOverrides {
  supportsThinking?: boolean;
  supportsVision?: boolean;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  supportsJsonMode?: boolean;

  /** Override context window (e.g., provider reduced it) */
  contextWindow?: number;

  /** Override max output tokens */
  maxOutputTokens?: number;
}
```

### Database Schema

```sql
-- Migration: 030-model-configurations.sql

-- Model runtime configuration overrides
CREATE TABLE model_configurations (
  -- Model identifier (matches model-capabilities.ts keys)
  model_id TEXT PRIMARY KEY,

  -- Runtime parameter constraint overrides (JSONB)
  -- Only specified fields override code defaults
  parameter_constraints JSONB DEFAULT '{}',

  -- Runtime capability overrides (JSONB)
  -- Only specified fields override code defaults
  capabilities_override JSONB DEFAULT '{}',

  -- Model availability
  enabled BOOLEAN NOT NULL DEFAULT true,
  deprecated BOOLEAN NOT NULL DEFAULT false,
  deprecation_message TEXT,

  -- Documentation
  notes TEXT,  -- Why constraints exist (e.g., "OpenAI API returns error for temp != 1")

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT  -- User ID who made the change
);

-- Index for quick lookups
CREATE INDEX idx_model_configurations_enabled ON model_configurations(enabled);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_model_configurations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER model_configurations_updated_at
  BEFORE UPDATE ON model_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_model_configurations_timestamp();

-- Seed data for known problematic models
INSERT INTO model_configurations (model_id, parameter_constraints, notes)
VALUES (
  'gpt-5.2-chat-latest',
  '{"temperature": {"fixed": 1}}',
  'OpenAI API returns error: temperature must be exactly 1 for this model'
);
```

### TypeScript Types

```typescript
// src/lib/types/model-configuration.ts

export interface ParameterConstraint {
  supported?: boolean;
  fixed?: number;
  min?: number;
  max?: number;
  default?: number;
}

export interface StopConstraint {
  supported?: boolean;
  maxSequences?: number;
}

export interface ParameterConstraints {
  temperature?: ParameterConstraint;
  maxTokens?: ParameterConstraint;
  topP?: ParameterConstraint;
  topK?: ParameterConstraint;
  frequencyPenalty?: ParameterConstraint;
  presencePenalty?: ParameterConstraint;
  stop?: StopConstraint;
  [key: string]: ParameterConstraint | StopConstraint | undefined;
}

export interface CapabilityOverrides {
  supportsThinking?: boolean;
  supportsVision?: boolean;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  supportsJsonMode?: boolean;
  contextWindow?: number;
  maxOutputTokens?: number;
}

export interface ModelConfiguration {
  modelId: string;
  parameterConstraints: ParameterConstraints;
  capabilitiesOverride: CapabilityOverrides;
  enabled: boolean;
  deprecated: boolean;
  deprecationMessage: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

// Combined view: code defaults + DB overrides
export interface ResolvedModelConfig {
  modelId: string;
  displayName: string;
  provider: string;

  // Resolved capabilities (code + DB overrides merged)
  capabilities: {
    contextWindow: number;
    maxOutputTokens: number;
    supportsThinking: boolean;
    supportsVision: boolean;
    supportsTools: boolean;
    supportsStreaming: boolean;
  };

  // Resolved parameter constraints (code + DB overrides merged)
  parameterConstraints: ParameterConstraints;

  // Status
  enabled: boolean;
  deprecated: boolean;
  deprecationMessage: string | null;

  // Metadata
  hasDbOverride: boolean;
  notes: string | null;
}
```

---

## Code Changes

### 1. Extend model-capabilities.ts

Add `parameterConstraints` to `ModelCapabilities` interface:

```typescript
// In src/lib/config/model-capabilities.ts

export interface ModelCapabilities {
  displayName: string;
  provider: 'anthropic' | 'openai' | 'meta' | 'amazon' | 'deepseek' | 'mistral' | 'google';
  contextWindow: number;
  maxOutputTokens: number;
  supportsThinking: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming?: boolean;  // NEW: defaults to true if not specified
  reasoningEffortLevels?: ('low' | 'medium' | 'high' | 'xhigh')[];
  description?: string;
  pricing?: { input: number; output: number; };
  taskPlanning?: TaskPlanningCapabilities;

  // NEW: Parameter constraints
  parameterConstraints?: ParameterConstraints;
}

// Update gpt-5.2-chat-latest entry:
'gpt-5.2-chat-latest': {
  displayName: 'GPT-5.2 Instant',
  provider: 'openai',
  contextWindow: 400000,
  maxOutputTokens: 128000,
  supportsThinking: false,
  supportsVision: true,
  supportsTools: true,
  description: 'Speed-optimized for routine queries',

  // NEW: This model requires temperature = 1
  parameterConstraints: {
    temperature: { fixed: 1 }
  }
}
```

### 2. Model Configuration Service

```typescript
// src/lib/services/model-configuration.ts

import { MODEL_CAPABILITIES, type ModelCapabilities } from '$lib/config/model-capabilities';
import type {
  ModelConfiguration,
  ResolvedModelConfig,
  ParameterConstraints,
  CapabilityOverrides
} from '$lib/types/model-configuration';

// In-memory cache for DB configurations (refreshed periodically)
let configCache: Map<string, ModelConfiguration> = new Map();
let cacheLastRefresh: Date | null = null;
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Load model configurations from database.
 * Called by API endpoints or periodically refreshed.
 */
export async function loadModelConfigurations(
  repository: ModelConfigurationRepository
): Promise<void> {
  const configs = await repository.findAll();
  configCache = new Map(configs.map(c => [c.modelId, c]));
  cacheLastRefresh = new Date();
}

/**
 * Get resolved configuration for a model.
 * Merges code defaults with DB overrides.
 */
export function getResolvedModelConfig(modelId: string): ResolvedModelConfig | null {
  const codeConfig = MODEL_CAPABILITIES[modelId];
  if (!codeConfig) return null;

  const dbConfig = configCache.get(modelId);

  // Merge capabilities
  const capabilities = {
    contextWindow: dbConfig?.capabilitiesOverride?.contextWindow ?? codeConfig.contextWindow,
    maxOutputTokens: dbConfig?.capabilitiesOverride?.maxOutputTokens ?? codeConfig.maxOutputTokens,
    supportsThinking: dbConfig?.capabilitiesOverride?.supportsThinking ?? codeConfig.supportsThinking,
    supportsVision: dbConfig?.capabilitiesOverride?.supportsVision ?? codeConfig.supportsVision,
    supportsTools: dbConfig?.capabilitiesOverride?.supportsTools ?? codeConfig.supportsTools,
    supportsStreaming: dbConfig?.capabilitiesOverride?.supportsStreaming ?? codeConfig.supportsStreaming ?? true
  };

  // Merge parameter constraints (DB overrides code)
  const parameterConstraints = mergeParameterConstraints(
    codeConfig.parameterConstraints ?? {},
    dbConfig?.parameterConstraints ?? {}
  );

  return {
    modelId,
    displayName: codeConfig.displayName,
    provider: codeConfig.provider,
    capabilities,
    parameterConstraints,
    enabled: dbConfig?.enabled ?? true,
    deprecated: dbConfig?.deprecated ?? false,
    deprecationMessage: dbConfig?.deprecationMessage ?? null,
    hasDbOverride: !!dbConfig,
    notes: dbConfig?.notes ?? null
  };
}

/**
 * Merge parameter constraints: DB values override code values.
 */
function mergeParameterConstraints(
  codeConstraints: ParameterConstraints,
  dbConstraints: ParameterConstraints
): ParameterConstraints {
  const result: ParameterConstraints = { ...codeConstraints };

  for (const [key, value] of Object.entries(dbConstraints)) {
    if (value !== undefined) {
      result[key] = { ...result[key], ...value };
    }
  }

  return result;
}

/**
 * Get all models with their resolved configurations.
 * For Admin UI listing.
 */
export function getAllResolvedConfigs(): ResolvedModelConfig[] {
  return Object.keys(MODEL_CAPABILITIES)
    .map(getResolvedModelConfig)
    .filter((c): c is ResolvedModelConfig => c !== null);
}
```

### 3. Parameter Application Service

```typescript
// src/lib/services/apply-model-constraints.ts

import type { ParameterConstraints, ParameterConstraint } from '$lib/types/model-configuration';
import { getResolvedModelConfig } from './model-configuration';

interface ChatRequestParams {
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  // ... other params
}

interface ConstraintApplicationResult {
  params: ChatRequestParams;
  applied: Array<{
    param: string;
    original: any;
    final: any;
    reason: string;
  }>;
  warnings: string[];
}

/**
 * Apply model constraints to request parameters.
 * Returns modified params and a log of what was changed.
 */
export function applyModelConstraints(
  params: ChatRequestParams
): ConstraintApplicationResult {
  const result: ConstraintApplicationResult = {
    params: { ...params },
    applied: [],
    warnings: []
  };

  const config = getResolvedModelConfig(params.model);
  if (!config) {
    // Unknown model - pass through unchanged
    return result;
  }

  // Check if model is enabled
  if (!config.enabled) {
    result.warnings.push(`Model ${params.model} is disabled`);
  }

  // Check if model is deprecated
  if (config.deprecated) {
    result.warnings.push(
      config.deprecationMessage || `Model ${params.model} is deprecated`
    );
  }

  const constraints = config.parameterConstraints;

  // Apply temperature constraints
  if (constraints.temperature) {
    const applied = applyNumericConstraint(
      'temperature',
      params.temperature,
      constraints.temperature
    );
    if (applied.changed) {
      result.params.temperature = applied.value;
      result.applied.push(applied.log);
    }
    if (applied.omit) {
      delete result.params.temperature;
      result.applied.push(applied.log);
    }
  }

  // Apply max_tokens constraints
  if (constraints.maxTokens) {
    const applied = applyNumericConstraint(
      'max_tokens',
      params.max_tokens,
      constraints.maxTokens
    );
    if (applied.changed) {
      result.params.max_tokens = applied.value;
      result.applied.push(applied.log);
    }
    if (applied.omit) {
      delete result.params.max_tokens;
      result.applied.push(applied.log);
    }
  }

  // Apply top_p constraints
  if (constraints.topP) {
    const applied = applyNumericConstraint(
      'top_p',
      params.top_p,
      constraints.topP
    );
    if (applied.changed) {
      result.params.top_p = applied.value;
      result.applied.push(applied.log);
    }
    if (applied.omit) {
      delete result.params.top_p;
      result.applied.push(applied.log);
    }
  }

  // Apply stop sequence constraints
  if (constraints.stop && params.stop) {
    if (constraints.stop.supported === false) {
      delete result.params.stop;
      result.applied.push({
        param: 'stop',
        original: params.stop,
        final: undefined,
        reason: 'Parameter not supported by model'
      });
    } else if (constraints.stop.maxSequences && params.stop.length > constraints.stop.maxSequences) {
      result.params.stop = params.stop.slice(0, constraints.stop.maxSequences);
      result.applied.push({
        param: 'stop',
        original: params.stop,
        final: result.params.stop,
        reason: `Limited to ${constraints.stop.maxSequences} sequences`
      });
    }
  }

  return result;
}

/**
 * Apply numeric constraint to a parameter value.
 */
function applyNumericConstraint(
  paramName: string,
  value: number | undefined,
  constraint: ParameterConstraint
): {
  value: number | undefined;
  changed: boolean;
  omit: boolean;
  log: { param: string; original: any; final: any; reason: string };
} {
  // Not supported - omit entirely
  if (constraint.supported === false) {
    return {
      value: undefined,
      changed: false,
      omit: true,
      log: {
        param: paramName,
        original: value,
        final: undefined,
        reason: 'Parameter not supported by model'
      }
    };
  }

  // Fixed value - override user choice
  if (constraint.fixed !== undefined) {
    if (value !== constraint.fixed) {
      return {
        value: constraint.fixed,
        changed: true,
        omit: false,
        log: {
          param: paramName,
          original: value,
          final: constraint.fixed,
          reason: `Model requires exactly ${constraint.fixed}`
        }
      };
    }
  }

  // No value provided - use default if available
  if (value === undefined) {
    if (constraint.default !== undefined) {
      return {
        value: constraint.default,
        changed: true,
        omit: false,
        log: {
          param: paramName,
          original: undefined,
          final: constraint.default,
          reason: `Applied default value`
        }
      };
    }
    return { value: undefined, changed: false, omit: false, log: { param: '', original: '', final: '', reason: '' } };
  }

  // Clamp to min
  if (constraint.min !== undefined && value < constraint.min) {
    return {
      value: constraint.min,
      changed: true,
      omit: false,
      log: {
        param: paramName,
        original: value,
        final: constraint.min,
        reason: `Clamped to minimum ${constraint.min}`
      }
    };
  }

  // Clamp to max
  if (constraint.max !== undefined && value > constraint.max) {
    return {
      value: constraint.max,
      changed: true,
      omit: false,
      log: {
        param: paramName,
        original: value,
        final: constraint.max,
        reason: `Clamped to maximum ${constraint.max}`
      }
    };
  }

  // No changes needed
  return { value, changed: false, omit: false, log: { param: '', original: '', final: '', reason: '' } };
}
```

---

## Admin UI Design

### Navigation

Add to Admin Sidebar under "ACCESS" section:

```typescript
{
  label: 'ACCESS',
  items: [
    { href: '/admin/model-access', label: 'Model Tiers', icon: 'sparkles' },
    { href: '/admin/models', label: 'Model Config', icon: 'adjustments' }  // NEW
  ]
}
```

### Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Model Configuration                                                          │
│ Manage model parameters, constraints, and availability                       │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search models...                    [Provider ▼] [Status ▼] [⟳]     │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ MODEL            PROVIDER   STATUS    CONSTRAINTS      UPDATED          │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ Claude Opus 4.5  Anthropic  ● Active  -               -                 │ │
│ │ Claude Sonnet 4  Anthropic  ● Active  -               -                 │ │
│ │ GPT-5.2 Instant  OpenAI     ● Active  ⚡ temp=1       2 hours ago       │ │
│ │ GPT-5.2          OpenAI     ● Active  -               -                 │ │
│ │ Gemini 3 Pro     Google     ○ Disabled -              1 day ago         │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Showing 45 models                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Model List Component

File: `src/routes/admin/models/+page.svelte`

Key features:
- Table with sortable columns
- Filter by provider (Anthropic, OpenAI, Google, etc.)
- Filter by status (Active, Disabled, Deprecated, Has Overrides)
- Search by model name
- Click row to open edit modal
- Quick toggle for enable/disable
- Visual indicator for models with DB overrides (⚡ icon)
- Relative time for last updated

### Edit Modal Design

```
┌─────────────────────────────────────────────────────────────────┐
│ Configure Model                                            [×]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ GPT-5.2 Instant                                                 │
│ openai · gpt-5.2-chat-latest                                    │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ STATUS                                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ● Enabled   ○ Disabled   ○ Deprecated                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [If deprecated: Deprecation Message input field]                │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ PARAMETER CONSTRAINTS                                           │
│                                                                 │
│ Temperature                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Mode: ○ Default  ○ Fixed  ○ Range  ○ Not Supported          │ │
│ │                                                             │ │
│ │ [If Fixed:]   Value: [1.0    ]                              │ │
│ │ [If Range:]   Min: [0.0] Max: [2.0] Default: [0.7]          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Max Tokens                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Mode: ● Default  ○ Fixed  ○ Range  ○ Not Supported          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Top P                                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Mode: ● Default  ○ Fixed  ○ Range  ○ Not Supported          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [+ Add Parameter]                                               │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ CAPABILITY OVERRIDES (Optional)                                 │
│                                                                 │
│ ☐ Override thinking support     [ ]                             │
│ ☐ Override vision support       [ ]                             │
│ ☐ Override tool support         [ ]                             │
│ ☐ Override context window       [ ]                             │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ NOTES                                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ OpenAI API returns error: temperature must be exactly 1     │ │
│ │ for this model. Discovered 2026-01-13.                      │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ Code Defaults (read-only reference)                             │
│ • Context: 400K tokens                                          │
│ • Max Output: 128K tokens                                       │
│ • Vision: ✓  Tools: ✓  Thinking: ✗                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Reset to Defaults]  [Cancel] [Save]│
└─────────────────────────────────────────────────────────────────┘
```

### Parameter Constraint Editor

The key UX insight: Make it easy to specify the most common constraint types.

**Mode Options:**

1. **Default** - Use code defaults, no DB override
2. **Fixed** - Must be exactly this value (e.g., GPT-5.2 Instant temp=1)
3. **Range** - Allow values between min and max (with optional default)
4. **Not Supported** - Omit parameter entirely from API request

**Visual Design:**

```svelte
<!-- ParameterConstraintEditor.svelte -->
<div class="param-editor">
  <div class="param-header">
    <span class="param-name">Temperature</span>
    {#if hasOverride}
      <span class="override-badge">Override Active</span>
    {/if}
  </div>

  <div class="mode-selector">
    <label class="mode-option">
      <input type="radio" bind:group={mode} value="default" />
      <span>Default</span>
    </label>
    <label class="mode-option">
      <input type="radio" bind:group={mode} value="fixed" />
      <span>Fixed Value</span>
    </label>
    <label class="mode-option">
      <input type="radio" bind:group={mode} value="range" />
      <span>Range</span>
    </label>
    <label class="mode-option">
      <input type="radio" bind:group={mode} value="unsupported" />
      <span>Not Supported</span>
    </label>
  </div>

  {#if mode === 'fixed'}
    <div class="value-inputs">
      <label>
        Value:
        <input type="number" step="0.1" bind:value={fixedValue} />
      </label>
    </div>
  {:else if mode === 'range'}
    <div class="value-inputs range">
      <label>
        Min:
        <input type="number" step="0.1" bind:value={minValue} />
      </label>
      <label>
        Max:
        <input type="number" step="0.1" bind:value={maxValue} />
      </label>
      <label>
        Default:
        <input type="number" step="0.1" bind:value={defaultValue} />
      </label>
    </div>
  {:else if mode === 'unsupported'}
    <p class="mode-hint">Parameter will be removed from API requests.</p>
  {:else}
    <p class="mode-hint">Using code defaults. No override applied.</p>
  {/if}
</div>
```

---

## API Endpoints

### List All Models with Resolved Config

```
GET /api/admin/models
```

Response:
```json
{
  "models": [
    {
      "modelId": "gpt-5.2-chat-latest",
      "displayName": "GPT-5.2 Instant",
      "provider": "openai",
      "enabled": true,
      "deprecated": false,
      "hasDbOverride": true,
      "parameterConstraints": {
        "temperature": { "fixed": 1 }
      },
      "notes": "OpenAI API requires temperature = 1",
      "updatedAt": "2026-01-13T12:00:00Z"
    }
  ]
}
```

### Get Single Model Config

```
GET /api/admin/models/:modelId
```

### Update Model Config

```
PUT /api/admin/models/:modelId
```

Request:
```json
{
  "parameterConstraints": {
    "temperature": { "fixed": 1 }
  },
  "capabilitiesOverride": {},
  "enabled": true,
  "deprecated": false,
  "deprecationMessage": null,
  "notes": "OpenAI API returns error for temperature != 1"
}
```

### Reset Model Config to Defaults

```
DELETE /api/admin/models/:modelId
```

Removes the DB override, reverting to code defaults.

---

## Implementation Phases

### Phase 1: Foundation (Immediate Fix)

**Goal:** Fix GPT-5.2 Instant immediately, establish patterns.

**Tasks:**
1. Extend `ModelCapabilities` interface with `parameterConstraints`
2. Add `parameterConstraints` to affected models in `model-capabilities.ts`
3. Create `applyModelConstraints()` function
4. Integrate into chat API endpoint (`/api/chat`)
5. Add logging for applied constraints

**Files to modify:**
- `src/lib/config/model-capabilities.ts`
- `src/lib/types/model-configuration.ts` (NEW)
- `src/lib/services/apply-model-constraints.ts` (NEW)
- `src/routes/api/chat/+server.ts`

**Acceptance Tests:**
- [ ] GPT-5.2 Instant requests have temperature forced to 1
- [ ] Console logs show when constraints are applied
- [ ] Other models unaffected
- [ ] TypeScript compiles with no errors

### Phase 2: Database Layer

**Goal:** Enable runtime overrides without deployments.

**Tasks:**
1. Create migration `030-model-configurations.sql`
2. Create `ModelConfigurationRepository` with CRUD operations
3. Create `model-configuration.ts` service for merging code + DB
4. Add cache with TTL for performance
5. Seed DB with initial overrides (GPT-5.2 Instant)

**Files to create:**
- `src/lib/server/persistence/migrations/030-model-configurations.sql`
- `src/lib/server/persistence/model-configurations-postgres.ts`
- `src/lib/services/model-configuration.ts`

**Acceptance Tests:**
- [ ] Migration runs successfully
- [ ] DB overrides take precedence over code defaults
- [ ] Cache refreshes after TTL
- [ ] Unknown models pass through unchanged

### Phase 3: Admin API

**Goal:** Backend ready for Admin UI.

**Tasks:**
1. Create API endpoints:
   - `GET /api/admin/models` - List all with resolved config
   - `GET /api/admin/models/:modelId` - Single model details
   - `PUT /api/admin/models/:modelId` - Update config
   - `DELETE /api/admin/models/:modelId` - Reset to defaults
2. Add authorization (admin only)
3. Add validation for constraint values

**Files to create:**
- `src/routes/api/admin/models/+server.ts`
- `src/routes/api/admin/models/[modelId]/+server.ts`

**Acceptance Tests:**
- [ ] API endpoints return correct data
- [ ] Updates persist to database
- [ ] Reset removes DB override
- [ ] Non-admin users get 403

### Phase 4: Admin UI - List View

**Goal:** View all models with their configurations.

**Tasks:**
1. Create page route `/admin/models`
2. Create `ModelConfigurationList.svelte` component
3. Add filtering (provider, status)
4. Add search
5. Add sorting
6. Show override indicators

**Files to create:**
- `src/routes/admin/models/+page.svelte`
- `src/routes/admin/models/+page.server.ts`
- `src/lib/components/admin/ModelConfigurationList.svelte`

**Acceptance Tests:**
- [ ] All models from `model-capabilities.ts` listed
- [ ] Filters work correctly
- [ ] Search finds by name or ID
- [ ] Override indicator shows for models with DB config
- [ ] Matches existing admin UX patterns

### Phase 5: Admin UI - Edit Modal

**Goal:** Full editing capability for model configurations.

**Tasks:**
1. Create `ModelConfigurationModal.svelte`
2. Create `ParameterConstraintEditor.svelte`
3. Implement status toggle (enabled/disabled/deprecated)
4. Implement parameter constraint editing (fixed/range/unsupported)
5. Implement capability overrides (optional)
6. Implement notes field
7. Implement reset to defaults
8. Show code defaults as reference

**Files to create:**
- `src/lib/components/admin/ModelConfigurationModal.svelte`
- `src/lib/components/admin/ParameterConstraintEditor.svelte`

**Acceptance Tests:**
- [ ] Modal opens with current config
- [ ] Status changes save correctly
- [ ] Fixed value constraint works
- [ ] Range constraint works
- [ ] Reset to defaults clears DB override
- [ ] Notes persist
- [ ] Code defaults shown as reference

### Phase 6: Integration & Polish

**Goal:** Production-ready with logging and monitoring.

**Tasks:**
1. Add constraint application logging to usage tracking
2. Add admin notification for new constraint applications
3. Add change history in UI (who changed what, when)
4. Performance optimization (cache warming)
5. Documentation for ops team

**Acceptance Tests:**
- [ ] Constraint applications logged
- [ ] Change history visible in UI
- [ ] Performance acceptable (<100ms overhead)
- [ ] Documentation complete

---

## Example Configurations

### GPT-5.2 Instant (Temperature Fixed)

```json
{
  "modelId": "gpt-5.2-chat-latest",
  "parameterConstraints": {
    "temperature": { "fixed": 1 }
  },
  "notes": "OpenAI API returns error: temperature must be exactly 1 for Instant models"
}
```

### Hypothetical: Model with No Top-P Support

```json
{
  "modelId": "some-model",
  "parameterConstraints": {
    "topP": { "supported": false }
  },
  "notes": "This model ignores top_p and returns error if provided"
}
```

### Hypothetical: Model with Temperature Range

```json
{
  "modelId": "careful-model",
  "parameterConstraints": {
    "temperature": {
      "min": 0.3,
      "max": 0.9,
      "default": 0.7
    }
  },
  "notes": "Provider recommends temperature between 0.3-0.9 for best results"
}
```

### Hypothetical: Disabled Model

```json
{
  "modelId": "deprecated-model",
  "enabled": false,
  "deprecated": true,
  "deprecationMessage": "This model will be removed on 2026-03-01. Please migrate to new-model.",
  "notes": "Provider announced deprecation in January 2026"
}
```

---

## Related Documentation

- `AUTO_MODEL_ROUTING.md` - How AUTO routing selects models
- `COST_OPTIMIZATION_STRATEGY.md` - Cost considerations for model selection
- `model-capabilities.ts` - Code-level model definitions

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Hybrid code + DB approach | Code provides type safety and defaults; DB enables runtime fixes |
| JSONB for constraints | Flexible schema, easy to extend, no migrations for new parameters |
| Cache with TTL | Avoid DB hit on every request; 1-minute TTL balances freshness vs performance |
| Admin-only access | Model config is sensitive; accidental changes could break production |
| Mode-based constraint UI | Simpler UX than exposing all JSONB fields; covers 95% of use cases |
| Show code defaults in modal | Helps admin understand what they're overriding |
| Notes field | Critical for documenting WHY a constraint exists (institutional knowledge) |
