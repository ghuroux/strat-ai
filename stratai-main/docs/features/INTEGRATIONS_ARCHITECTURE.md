# Integrations Architecture

> **The Foundation for External Service Connections**

This document specifies the integration layer architecture for StratAI—a reusable foundation that Calendar, GitHub, Linear, Jira, Slack, Confluence, and future integrations will plug into. Building this architecture first ensures consistency, security, and maintainability as we expand our integration surface.

**Key Insight: Build Once, Integrate Many.** Each new integration shouldn't reinvent credential management, permissions, and UI patterns. This architecture provides the shared foundation that makes adding integrations predictable and secure.

**Strategic Decisions (January 2026):**
- **MCP-Native**: We are an MCP Host, leveraging ecosystem MCP servers where they exist
- **Calendar First**: Microsoft Graph calendar is the first integration (dogfood principle)
- **Two Tiers**: Foundational integrations (first-party UX) vs Contextual integrations (add-on UX)

---

## Table of Contents

1. [Vision & Strategic Value](#1-vision--strategic-value)
2. [Integration Tiers](#2-integration-tiers)
3. [Integration Scoping Model](#3-integration-scoping-model)
4. [Data Model](#4-data-model)
5. [Permission Model](#5-permission-model)
6. [Service Architecture (MCP-Native)](#6-service-architecture-mcp-native)
7. [Credential Management](#7-credential-management)
8. [UX Components](#8-ux-components)
9. [Integration Roadmap](#9-integration-roadmap)
10. [Implementation Phases](#10-implementation-phases)
11. [Security & Compliance](#11-security--compliance)
12. [Success Metrics](#12-success-metrics)

---

## 1. Vision & Strategic Value

### Why Build an Architecture First

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      WITHOUT INTEGRATION ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   GitHub Integration           Jira Integration           Slack Integration      │
│   ┌─────────────────┐         ┌─────────────────┐        ┌─────────────────┐    │
│   │ Custom auth     │         │ Custom auth     │        │ Custom auth     │    │
│   │ Custom storage  │         │ Custom storage  │        │ Custom storage  │    │
│   │ Custom UI       │         │ Custom UI       │        │ Custom UI       │    │
│   │ Custom perms    │         │ Custom perms    │        │ Custom perms    │    │
│   │ Custom logging  │         │ Custom logging  │        │ Custom logging  │    │
│   └─────────────────┘         └─────────────────┘        └─────────────────┘    │
│          │                           │                          │                │
│          └───────────────────────────┼──────────────────────────┘                │
│                                      │                                           │
│                                      ▼                                           │
│                          ┌─────────────────────┐                                 │
│                          │  N integrations =   │                                 │
│                          │  N implementations  │                                 │
│                          │  N bug surfaces     │                                 │
│                          │  N security audits  │                                 │
│                          └─────────────────────┘                                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                       WITH INTEGRATION ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                          ┌─────────────────────────────┐                         │
│                          │    Integration Layer        │                         │
│                          │                             │                         │
│                          │  • Shared credential mgmt   │                         │
│                          │  • Unified permissions      │                         │
│                          │  • Consistent settings UI   │                         │
│                          │  • Centralized audit logs   │                         │
│                          │  • Common tool interface    │                         │
│                          └──────────────┬──────────────┘                         │
│                                         │                                        │
│            ┌────────────────────────────┼────────────────────────────┐           │
│            │                            │                            │           │
│            ▼                            ▼                            ▼           │
│   ┌─────────────────┐         ┌─────────────────┐        ┌─────────────────┐    │
│   │ GitHub Provider │         │ Jira Provider   │        │ Slack Provider  │    │
│   │                 │         │                 │        │                 │    │
│   │ • API client    │         │ • API client    │        │ • API client    │    │
│   │ • Tools         │         │ • Tools         │        │ • Tools         │    │
│   │ • Config        │         │ • Config        │        │ • Config        │    │
│   └─────────────────┘         └─────────────────┘        └─────────────────┘    │
│                                                                                  │
│   Result: Add integrations in days, not weeks                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Value Proposition

| Benefit | Description |
|---------|-------------|
| **Faster Integration Development** | New integrations leverage existing infrastructure |
| **Consistent Security** | Single audit surface for credential management |
| **Unified UX** | Users learn one pattern for all integrations |
| **Enterprise-Ready** | Built-in audit logging and compliance |
| **Maintainability** | Fix once, benefit everywhere |

---

## 2. Integration Tiers

### Foundational vs Contextual Integrations

Not all integrations are equal. Some are so core to productivity that they should feel built-in, while others are contextual add-ons for specific work.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       INTEGRATION TIERS                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   FOUNDATIONAL INTEGRATIONS              CONTEXTUAL INTEGRATIONS                 │
│   (First-party UX, always prominent)     (Add-on UX, per-Area activation)        │
│                                                                                  │
│   ┌─────────────────────────────────┐    ┌─────────────────────────────────┐    │
│   │                                 │    │                                 │    │
│   │  📅 Calendar (Microsoft/Google) │    │  🐙 GitHub                       │    │
│   │     • Meeting prep & capture    │    │     • Code context              │    │
│   │     • Schedule awareness        │    │     • Issue tracking            │    │
│   │     • Focus time blocks         │    │                                 │    │
│   │                                 │    │  📋 Jira/Linear                  │    │
│   │  📧 Email (future)              │    │     • Work tracking             │    │
│   │     • Action item extraction    │    │     • Sprint context            │    │
│   │     • Follow-up reminders       │    │                                 │    │
│   │                                 │    │  💬 Slack/Teams                  │    │
│   │  🔐 Identity (WorkOS - existing)│    │     • Channel context           │    │
│   │     • SSO, user management      │    │     • Notification routing      │    │
│   │                                 │    │                                 │    │
│   └─────────────────────────────────┘    │  📝 Confluence/Notion            │    │
│                                          │     • Documentation context     │    │
│   Setup: During onboarding               │                                 │    │
│   Visibility: Always prominent           └─────────────────────────────────┘    │
│   Permission: User-level                                                         │
│                                          Setup: When needed for Area             │
│                                          Visibility: Area settings               │
│                                          Permission: Space-level + Area toggle   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Why This Distinction Matters

| Aspect | Foundational | Contextual |
|--------|--------------|------------|
| **Setup** | During onboarding or first use | When connecting to a specific project |
| **Visibility** | Always visible (sidebar, header) | Visible when enabled in Area |
| **Benefit** | Universal productivity (everyone uses calendar) | Domain-specific context (not everyone needs GitHub) |
| **Expectation** | "My calendar just works" | "I connected GitHub to this Area" |
| **Failure Mode** | "Why doesn't my calendar sync?" (broken experience) | "I should connect GitHub" (missing feature) |

### First Integration: Calendar (Microsoft Graph)

**Why Calendar First:**
1. **Dogfood Principle**: StratGroup uses Microsoft 365 - we build for our actual stack
2. **Universal Value**: Every knowledge worker benefits from calendar intelligence
3. **Flywheel Enabler**: Meeting capture feeds decisions into the data flywheel
4. **Proves Architecture**: Calendar has read/write, OAuth, real-time - tests the full pattern

**Scope:** See [CALENDAR_INTEGRATION.md](./CALENDAR_INTEGRATION.md) for detailed specification.

---

## 3. Integration Scoping Model

### Three-Level Hierarchy

Integrations follow StratAI's existing hierarchy: **Organization → Space → Area**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       INTEGRATION SCOPING MODEL                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ORGANIZATION LEVEL                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   Org Admin installs GitHub App for "acme-corp" GitHub org               │   │
│   │                                                                          │   │
│   │   ✓ Single installation, org-wide benefit                                │   │
│   │   ✓ Centralized credential management                                    │   │
│   │   ✓ All Spaces can access (if permitted)                                 │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                        │
│                                         ▼                                        │
│   SPACE LEVEL                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   Space: "Frontend Team"          Space: "Backend Team"                  │   │
│   │   ┌───────────────────────┐       ┌───────────────────────┐             │   │
│   │   │ GitHub: frontend repo │       │ GitHub: api-server    │             │   │
│   │   │ Linear: FE-xxx        │       │ Linear: BE-xxx        │             │   │
│   │   └───────────────────────┘       └───────────────────────┘             │   │
│   │                                                                          │   │
│   │   ✓ Space Admin configures which repo/project                            │   │
│   │   ✓ Space Members can use configured integrations                        │   │
│   │   ✓ Can disable org-level integrations if not relevant                   │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                         │                                        │
│                                         ▼                                        │
│   AREA LEVEL                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   Area: "Auth System"             Area: "UI Components"                  │   │
│   │   ┌───────────────────────┐       ┌───────────────────────┐             │   │
│   │   │ GitHub: src/auth/*    │       │ GitHub: src/components│             │   │
│   │   │ Issues: label:auth    │       │ Issues: label:ui      │             │   │
│   │   └───────────────────────┘       └───────────────────────┘             │   │
│   │                                                                          │   │
│   │   ✓ Area Owner enables/disables integrations                             │   │
│   │   ✓ Can scope to specific paths, labels, etc.                            │   │
│   │   ✓ Fine-grained context control                                         │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Scoping Rules

| Level | Who Manages | What They Control |
|-------|-------------|-------------------|
| **Organization** | Org Admin | Which integrations are available; org-wide credentials |
| **Space** | Space Owner/Admin | Which repo/project; enable/disable for Space |
| **Area** | Area Owner | Enable/disable for Area; scope restrictions (paths, labels) |

### Inheritance & Override

```typescript
// Effective integration config for an Area
function getEffectiveConfig(areaId: string): IntegrationConfig {
  const orgConfig = getOrgIntegration(orgId, serviceType);
  const spaceConfig = getSpaceIntegration(spaceId, serviceType);
  const areaConfig = getAreaIntegration(areaId, serviceType);

  // Area must explicitly enable; inherits Space config
  if (!areaConfig?.isEnabled) return null;

  return {
    ...orgConfig,      // Base credentials
    ...spaceConfig,    // Space-specific config (repo, project)
    ...areaConfig,     // Area-specific overrides (paths, labels)
  };
}
```

---

## 3. Data Model

### Core Tables

```sql
-- ============================================================================
-- INTEGRATIONS: Space-level integration configuration
-- ============================================================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Integration identity
  service_type TEXT NOT NULL,      -- 'github', 'linear', 'jira', 'slack', etc.
  display_name TEXT,               -- User-friendly name (e.g., "Frontend Repo")

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',    -- 'active', 'error', 'rate_limited', 'expired'
  status_message TEXT,             -- Human-readable status details

  -- Service-specific configuration (non-sensitive)
  config JSONB NOT NULL DEFAULT '{}',
  -- GitHub example: { "repoOwner": "acme", "repoName": "frontend", "defaultBranch": "main" }
  -- Linear example: { "teamId": "TEAM-123", "projectFilter": "FE-*" }
  -- Slack example:  { "channelId": "C123ABC", "notifyOn": ["mentions"] }

  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(space_id, service_type)  -- One integration per type per Space
);

-- Indexes for common queries
CREATE INDEX idx_integrations_space ON integrations(space_id);
CREATE INDEX idx_integrations_org ON integrations(organization_id);
CREATE INDEX idx_integrations_service ON integrations(service_type);

-- ============================================================================
-- INTEGRATION_CREDENTIALS: Encrypted sensitive data (separate for security)
-- ============================================================================
CREATE TABLE integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- Credential details
  credential_type TEXT NOT NULL,   -- 'access_token', 'refresh_token', 'api_key', 'installation_id'
  encrypted_value TEXT NOT NULL,   -- Encrypted with org data key
  expires_at TIMESTAMPTZ,          -- For OAuth tokens with expiry

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(integration_id, credential_type)
);

-- Index for credential lookups
CREATE INDEX idx_credentials_integration ON integration_credentials(integration_id);

-- ============================================================================
-- AREA_INTEGRATIONS: Area-level activation and overrides
-- ============================================================================
CREATE TABLE area_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- Status
  is_enabled BOOLEAN DEFAULT true,

  -- Area-specific configuration overrides
  config_override JSONB DEFAULT '{}',
  -- GitHub example: { "allowedPaths": ["src/auth/", "docs/"], "issueLabels": ["auth"] }
  -- Linear example: { "projectFilter": "AUTH-*" }

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(area_id, integration_id)
);

-- Indexes
CREATE INDEX idx_area_integrations_area ON area_integrations(area_id);
CREATE INDEX idx_area_integrations_integration ON area_integrations(integration_id);

-- ============================================================================
-- INTEGRATION_LOGS: Audit trail for compliance and debugging
-- ============================================================================
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  conversation_id UUID,            -- Link to chat context

  -- Operation details
  operation TEXT NOT NULL,         -- 'read_file', 'search_code', 'get_issue', 'list_files'
  parameters JSONB,                -- { "path": "src/index.ts", "query": "auth" }

  -- Result
  status TEXT NOT NULL,            -- 'success', 'error', 'rate_limited', 'permission_denied'
  error_message TEXT,
  response_size_bytes INTEGER,
  tokens_used INTEGER,             -- Track context budget impact

  -- Timing
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for log queries
CREATE INDEX idx_integration_logs_integration ON integration_logs(integration_id);
CREATE INDEX idx_integration_logs_user ON integration_logs(user_id);
CREATE INDEX idx_integration_logs_created ON integration_logs(created_at);
CREATE INDEX idx_integration_logs_status ON integration_logs(status) WHERE status != 'success';
```

### TypeScript Types

```typescript
// src/lib/server/integrations/types.ts

export type ServiceType = 'github' | 'linear' | 'jira' | 'slack' | 'confluence' | 'notion';

export type IntegrationStatus = 'active' | 'error' | 'rate_limited' | 'expired';

export type CredentialType = 'access_token' | 'refresh_token' | 'api_key' | 'installation_id';

export type LogStatus = 'success' | 'error' | 'rate_limited' | 'permission_denied';

export interface Integration {
  id: string;
  spaceId: string;
  organizationId: string;
  serviceType: ServiceType;
  displayName: string | null;
  isEnabled: boolean;
  status: IntegrationStatus;
  statusMessage: string | null;
  config: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationCredential {
  id: string;
  integrationId: string;
  credentialType: CredentialType;
  encryptedValue: string;  // Never exposed to client
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AreaIntegration {
  id: string;
  areaId: string;
  integrationId: string;
  isEnabled: boolean;
  configOverride: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationLog {
  id: string;
  integrationId: string | null;
  areaId: string | null;
  userId: string | null;
  conversationId: string | null;
  operation: string;
  parameters: Record<string, unknown> | null;
  status: LogStatus;
  errorMessage: string | null;
  responseSizeBytes: number | null;
  tokensUsed: number | null;
  durationMs: number | null;
  createdAt: Date;
}

// Service-specific config types
export interface GitHubConfig {
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
}

export interface GitHubAreaConfig {
  allowedPaths?: string[];
  issueLabels?: string[];
}

export interface LinearConfig {
  teamId: string;
  projectFilter?: string;
}

export interface SlackConfig {
  channelId: string;
  notifyOn: ('mentions' | 'replies' | 'reactions')[];
}
```

---

## 4. Permission Model

### Role-Based Access

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION PERMISSIONS                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ORGANIZATION LEVEL                                                             │
│   ─────────────────                                                              │
│   Org Admin          │ Install/uninstall integrations at org level               │
│                      │ Configure org-wide credentials                            │
│                      │ View org-wide integration usage/logs                      │
│                                                                                  │
│   SPACE LEVEL                                                                    │
│   ───────────                                                                    │
│   Space Owner/Admin  │ Connect integrations to specific repos/projects           │
│                      │ Enable/disable integrations for the Space                 │
│                      │ View Space integration usage/logs                         │
│                      │ Override org-level config (if permitted)                  │
│                                                                                  │
│   Space Member       │ Use enabled integrations in chat                          │
│                      │ View integration status (connected/not connected)         │
│                      │ ✗ Cannot configure integrations                           │
│                                                                                  │
│   Space Guest        │ ✗ Cannot access integrations (security boundary)          │
│                      │ ✗ No visibility into integration config                   │
│                                                                                  │
│   AREA LEVEL                                                                     │
│   ──────────                                                                     │
│   Area Owner         │ Enable/disable Space integrations for their Area          │
│                      │ Configure Area-specific scope restrictions                │
│                      │ View Area integration usage                               │
│                                                                                  │
│   Area Member        │ Use enabled integrations in Area context                  │
│                      │ View which integrations are active                        │
│                      │ ✗ Cannot configure Area integrations                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Permission Checks

```typescript
// Permission check examples

export function canManageSpaceIntegrations(
  userId: string,
  spaceId: string
): Promise<boolean> {
  // Space Owner or Admin can manage integrations
  const membership = await getSpaceMembership(userId, spaceId);
  return membership?.role === 'owner' || membership?.role === 'admin';
}

export function canUseIntegration(
  userId: string,
  areaId: string,
  integrationId: string
): Promise<boolean> {
  // Must be Space Member (not Guest) AND Area must have integration enabled
  const area = await getArea(areaId);
  const spaceMembership = await getSpaceMembership(userId, area.spaceId);

  if (!spaceMembership || spaceMembership.role === 'guest') {
    return false;  // Guests cannot use integrations
  }

  const areaIntegration = await getAreaIntegration(areaId, integrationId);
  return areaIntegration?.isEnabled ?? false;
}

export function canConfigureAreaIntegrations(
  userId: string,
  areaId: string
): Promise<boolean> {
  // Area Owner can configure integrations for their area
  const area = await getArea(areaId);
  return area.ownerId === userId;
}
```

---

## 5. Service Architecture

### Directory Structure

```
src/lib/server/integrations/
├── types.ts                    # Integration, Credential, Log types
├── service.ts                  # IntegrationsService (main orchestrator)
├── encryption.ts               # Credential encryption/decryption
├── rate-limiter.ts             # Per-integration rate limiting
│
├── providers/
│   ├── base-provider.ts        # Abstract BaseProvider class
│   ├── provider-registry.ts    # Provider lookup by service type
│   │
│   ├── github/
│   │   ├── provider.ts         # GitHubProvider extends BaseProvider
│   │   ├── client.ts           # GitHub API client (Octokit wrapper)
│   │   ├── tools.ts            # Tool definitions for AI
│   │   ├── oauth.ts            # OAuth/App auth flow
│   │   └── types.ts            # GitHub-specific types
│   │
│   ├── linear/
│   │   ├── provider.ts
│   │   ├── client.ts
│   │   ├── tools.ts
│   │   └── types.ts
│   │
│   └── slack/
│       ├── provider.ts
│       ├── client.ts
│       ├── tools.ts
│       └── types.ts
│
└── persistence/
    ├── integrations-postgres.ts    # Integration CRUD
    ├── credentials-postgres.ts     # Credential CRUD (with encryption)
    ├── area-integrations-postgres.ts
    └── logs-postgres.ts            # Audit logging
```

### Base Provider Interface

```typescript
// src/lib/server/integrations/providers/base-provider.ts

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;  // JSON Schema
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  tokensUsed?: number;
}

export abstract class BaseProvider {
  protected integration: Integration;
  protected credentials: IntegrationCredential[];

  constructor(integration: Integration, credentials: IntegrationCredential[]) {
    this.integration = integration;
    this.credentials = credentials;
  }

  // Service identity
  abstract get serviceType(): ServiceType;
  abstract get displayName(): string;
  abstract get iconUrl(): string;

  // Connection management
  abstract validateConnection(): Promise<{ valid: boolean; error?: string }>;
  abstract refreshCredentials(): Promise<void>;

  // Tool interface (for AI)
  abstract getToolDefinitions(): ToolDefinition[];
  abstract executeTool(
    toolName: string,
    parameters: Record<string, unknown>,
    context: { userId: string; areaId: string }
  ): Promise<ToolResult>;

  // Context generation (for system prompt)
  abstract getContextSummary(): Promise<string>;

  // Utility methods (shared)
  protected async log(
    operation: string,
    params: Record<string, unknown>,
    result: ToolResult,
    context: { userId: string; areaId: string; conversationId?: string }
  ): Promise<void> {
    await logIntegrationOperation({
      integrationId: this.integration.id,
      areaId: context.areaId,
      userId: context.userId,
      conversationId: context.conversationId,
      operation,
      parameters: params,
      status: result.success ? 'success' : 'error',
      errorMessage: result.error,
      tokensUsed: result.tokensUsed,
    });
  }
}
```

### Integrations Service

```typescript
// src/lib/server/integrations/service.ts

export class IntegrationsService {
  private providerRegistry: ProviderRegistry;
  private encryptionService: EncryptionService;

  // Get provider instance for an integration
  async getProvider(integrationId: string): Promise<BaseProvider | null> {
    const integration = await getIntegration(integrationId);
    if (!integration || !integration.isEnabled) return null;

    const credentials = await getIntegrationCredentials(integrationId);
    const decrypted = await this.encryptionService.decryptCredentials(credentials);

    return this.providerRegistry.createProvider(integration, decrypted);
  }

  // Get all active integrations for an Area
  async getAreaIntegrations(areaId: string): Promise<BaseProvider[]> {
    const areaIntegrations = await getEnabledAreaIntegrations(areaId);
    const providers: BaseProvider[] = [];

    for (const ai of areaIntegrations) {
      const provider = await this.getProvider(ai.integrationId);
      if (provider) providers.push(provider);
    }

    return providers;
  }

  // Get combined tool definitions for AI
  async getToolsForArea(areaId: string): Promise<ToolDefinition[]> {
    const providers = await this.getAreaIntegrations(areaId);
    return providers.flatMap(p => p.getToolDefinitions());
  }

  // Execute a tool call from AI
  async executeTool(
    areaId: string,
    toolName: string,
    parameters: Record<string, unknown>,
    context: { userId: string; conversationId?: string }
  ): Promise<ToolResult> {
    // Parse tool name to find provider (e.g., "github_read_file" -> GitHub provider)
    const [serviceType, ...rest] = toolName.split('_');
    const provider = await this.getProviderByType(areaId, serviceType as ServiceType);

    if (!provider) {
      return { success: false, error: `Integration ${serviceType} not available` };
    }

    return provider.executeTool(toolName, parameters, { ...context, areaId });
  }

  // Generate context summary for system prompt
  async getContextForArea(areaId: string): Promise<string> {
    const providers = await this.getAreaIntegrations(areaId);
    const summaries = await Promise.all(providers.map(p => p.getContextSummary()));
    return summaries.join('\n\n');
  }
}
```

---

## 6. Credential Management

### Encryption Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       CREDENTIAL ENCRYPTION LAYERS                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Option A: Platform Key (Simpler)                                               │
│   ──────────────────────────────                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   Platform Master Key (env: INTEGRATION_ENCRYPTION_KEY)                  │   │
│   │                              │                                           │   │
│   │                              ▼                                           │   │
│   │   ┌──────────────────────────────────────────────────────────────────┐  │   │
│   │   │  All credentials encrypted with platform key                      │  │   │
│   │   │  AES-256-GCM with unique IV per credential                       │  │   │
│   │   └──────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                          │   │
│   │   ✓ Simpler implementation                                               │   │
│   │   ✓ Easier key rotation                                                  │   │
│   │   ✗ Platform breach exposes all credentials                              │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   Option B: Per-Org Keys (More Secure, Future)                                   │
│   ────────────────────────────────────────────                                   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   Platform Master Key                                                    │   │
│   │          │                                                               │   │
│   │          ▼                                                               │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │   │
│   │   │ Org A Key   │  │ Org B Key   │  │ Org C Key   │  (encrypted)        │   │
│   │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                     │   │
│   │          │                │                │                             │   │
│   │          ▼                ▼                ▼                             │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │   │
│   │   │ Org A       │  │ Org B       │  │ Org C       │  credentials        │   │
│   │   │ credentials │  │ credentials │  │ credentials │                     │   │
│   │   └─────────────┘  └─────────────┘  └─────────────┘                     │   │
│   │                                                                          │   │
│   │   ✓ Org breach only exposes that org's credentials                       │   │
│   │   ✓ Enterprise compliance (data isolation)                               │   │
│   │   ✗ More complex key management                                          │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   RECOMMENDATION: Start with Option A, migrate to B for enterprise tier         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Encryption Service

```typescript
// src/lib/server/integrations/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class EncryptionService {
  private masterKey: Buffer;

  constructor() {
    const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('INTEGRATION_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }
    this.masterKey = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedValue: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async decryptCredentials(
    credentials: IntegrationCredential[]
  ): Promise<DecryptedCredential[]> {
    return credentials.map(cred => ({
      ...cred,
      value: this.decrypt(cred.encryptedValue),
    }));
  }
}
```

---

## 7. UX Components

### Space Settings: Integrations Section

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SPACE SETTINGS                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   [General] [Members] [Integrations] [Danger Zone]                               │
│                                                                                  │
│   ───────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│   INTEGRATIONS                                                                   │
│                                                                                  │
│   Connect external services to enhance AI context in this Space.                 │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  CONNECTED                                                               │   │
│   │  ─────────                                                               │   │
│   │                                                                          │   │
│   │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│   │  │ [GitHub Icon]  GitHub                              [Configure]  │    │   │
│   │  │                acme-corp/frontend-app               [Disconnect]│    │   │
│   │  │                ● Connected                                      │    │   │
│   │  └─────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  AVAILABLE                                                               │   │
│   │  ─────────                                                               │   │
│   │                                                                          │   │
│   │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│   │  │ [Linear Icon]  Linear                               [Connect]   │    │   │
│   │  │                Issue tracking & project management              │    │   │
│   │  └─────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│   │  │ [Slack Icon]   Slack                                [Connect]   │    │   │
│   │  │                Team communication                               │    │   │
│   │  └─────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   │  ┌─────────────────────────────────────────────────────────────────┐    │   │
│   │  │ [Jira Icon]    Jira                                 [Connect]   │    │   │
│   │  │                Issue & project tracking                         │    │   │
│   │  └─────────────────────────────────────────────────────────────────┘    │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### GitHub Configuration Modal

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CONNECT GITHUB                                    [X]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Connect a GitHub repository to give AI access to your codebase.                │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  AUTHENTICATION                                                          │   │
│   │                                                                          │   │
│   │  ○ GitHub App (Recommended for organizations)                            │   │
│   │    Install StratAI GitHub App on your org                                │   │
│   │                                                                          │   │
│   │  ● Personal Access Token                                                 │   │
│   │    Use a fine-grained PAT for personal repos                             │   │
│   │                                                                          │   │
│   │  ┌───────────────────────────────────────────────────────────────────┐  │   │
│   │  │ Token: ghp_************************************                   │  │   │
│   │  └───────────────────────────────────────────────────────────────────┘  │   │
│   │  Required scopes: repo (read-only), read:org                            │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  REPOSITORY                                                              │   │
│   │                                                                          │   │
│   │  Owner: [acme-corp          ▼]                                           │   │
│   │  Repo:  [frontend-app       ▼]                                           │   │
│   │  Branch: [main              ▼]                                           │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  AI CAPABILITIES                                                         │   │
│   │                                                                          │   │
│   │  ☑ Browse file tree                                                      │   │
│   │  ☑ Read file contents (max 50KB)                                         │   │
│   │  ☑ Search code                                                           │   │
│   │  ☑ View issues and PRs                                                   │   │
│   │  ☐ View commit history                                                   │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│                                              [Cancel]  [Test Connection]         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Area Integration Toggle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AREA: AUTH SYSTEM                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ACTIVE INTEGRATIONS                                                            │
│                                                                                  │
│   These integrations are available in this Area. AI can use them                 │
│   to provide better context for your work.                                       │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  [GitHub Icon]  GitHub: acme-corp/frontend-app                          │   │
│   │                                                                          │   │
│   │  [Toggle: ON]                                             [Configure]   │   │
│   │                                                                          │   │
│   │  Scope: src/auth/*, src/lib/auth/*                                       │   │
│   │  Issues: label:auth, label:security                                      │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  [Linear Icon]  Linear: AUTH-*                                           │   │
│   │                                                                          │   │
│   │  [Toggle: OFF]                                            [Configure]   │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Chat Integration Indicator

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Area: Auth System                                                               │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ Active Context:  [GitHub: frontend-app]  [Linear: AUTH-*]                 │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  You: I need to add rate limiting to the login endpoint                          │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  AI: Let me explore your codebase to understand the current auth setup...        │
│                                                                                  │
│      ┌─────────────────────────────────────────────────────────────────────┐    │
│      │ 🔍 Searching: "login" in src/auth/*                                  │    │
│      │ 📄 Reading: src/auth/login.ts                                        │    │
│      │ 📄 Reading: src/lib/rate-limiter.ts                                  │    │
│      └─────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│      I found your login endpoint in `src/auth/login.ts`. I also noticed          │
│      you have a rate limiter utility at `src/lib/rate-limiter.ts` that           │
│      uses a sliding window algorithm.                                            │
│                                                                                  │
│      Here's how we could integrate rate limiting...                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Integration Roadmap

### Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       INTEGRATION ROADMAP                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   PHASE 1: Foundational (Personal Productivity)                                  │
│   ─────────────────────────────────────────────                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   [Calendar - Microsoft Graph] ★ FIRST                                   │   │
│   │   • Meeting awareness & capture                                          │   │
│   │   • Free/busy scheduling                                                 │   │
│   │   • Focus time blocks                                                    │   │
│   │   • Read + Write operations                                              │   │
│   │                                                                          │   │
│   │   Use Case: Meeting capture feeds the decision flywheel                  │   │
│   │                                                                          │   │
│   │   [Email - Microsoft Graph] (future)                                     │   │
│   │   • Action item extraction                                               │   │
│   │   • Follow-up reminders                                                  │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   PHASE 2: Team Intelligence                                                     │
│   ──────────────────────────                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   [GitHub]                                                               │   │
│   │   • Code context for ticket writing                                      │   │
│   │   • Issue tracking                                                       │   │
│   │   • PR awareness                                                         │   │
│   │                                                                          │   │
│   │   [Linear/Jira]                                                          │   │
│   │   • Sprint context                                                       │   │
│   │   • Work tracking                                                        │   │
│   │                                                                          │   │
│   │   Use Case: Technical context for product & engineering teams            │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   PHASE 3: Collaboration Context                                                 │
│   ──────────────────────────────                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   [Slack/Teams]      [Confluence]        [Notion]                        │   │
│   │   • Channel history  • Page lookup       • Page lookup                   │   │
│   │   • Thread context   • Search docs       • Database query                │   │
│   │   • Notifications    • Space browsing    • Search docs                   │   │
│   │                                                                          │   │
│   │   Use Case: Organizational knowledge, decision context                   │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   PHASE 4: Enterprise & StraTech                                                 │
│   ──────────────────────────────                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   [StraTech/StratOS] ← THE FLYWHEEL CLOSES                               │   │
│   │   • Operational data context                                             │   │
│   │   • Decision → Outcome measurement                                       │   │
│   │   • Pattern learning                                                     │   │
│   │                                                                          │   │
│   │   [Salesforce]       [ServiceNow]        [Custom]                        │   │
│   │   • Customer context • Incident context  • Internal systems              │   │
│   │                                                                          │   │
│   │   Use Case: Enterprise workflows, flywheel activation                    │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Integration Catalog

| Integration | Phase | Tier | Tools | Use Case |
|-------------|-------|------|-------|----------|
| **Calendar (MS Graph)** | 1 | Foundational | list_events, create_event, get_free_busy, update_event | Meeting capture, flywheel enabler |
| **Email (MS Graph)** | 1 | Foundational | search_mail, get_message, send_mail | Action extraction |
| **GitHub** | 2 | Contextual | list_files, read_file, search_code, get_issue | Code context for tickets |
| **Linear** | 2 | Contextual | get_issue, search_issues, get_project | Work tracking context |
| **Jira** | 2 | Contextual | get_issue, search_issues, get_sprint | Enterprise work tracking |
| **Slack** | 3 | Contextual | search_messages, get_channel_history | Team context |
| **Confluence** | 3 | Contextual | get_page, search_pages | Documentation context |
| **Notion** | 3 | Contextual | get_page, query_database | Knowledge base context |
| **StraTech** | 4 | Internal | operational_data, measure_outcome | Flywheel closure |

---

## 10. Implementation Phases

### Phase 0: Architecture Foundation (~1 week)

**Goal:** Validate architecture with minimal implementation

| Task | Deliverable |
|------|-------------|
| Create database tables | Migration for integrations, credentials, area_integrations, logs |
| Implement encryption service | Basic AES-256-GCM encryption/decryption |
| Set up MCP client layer | MCP TypeScript SDK integration |
| Build settings UI skeleton | Onboarding flow for foundational integrations |
| Write integration tests | Repository tests with test encryption |

### Phase 1: Calendar MVP (~2-3 weeks)

**Goal:** Microsoft Graph Calendar with meeting capture focus

| Task | Deliverable |
|------|-------------|
| Microsoft OAuth flow | Azure AD app registration, token management |
| MS Graph MCP integration | Calendar MCP server setup or custom if needed |
| Calendar read operations | List events, get attendees, check free/busy |
| Calendar write operations | Create events, update events, add focus time |
| Meeting capture UI | Post-meeting capture prompts, decision extraction |
| Foundational UX | Calendar appears prominently, not as "integration" |

See [CALENDAR_INTEGRATION.md](./CALENDAR_INTEGRATION.md) for detailed specification.

### Phase 2: Calendar Polish + GitHub (~2 weeks)

**Goal:** Production-ready calendar, validate with second integration

| Task | Deliverable |
|------|-------------|
| Implement GitHubProvider | Provider class with all tools |
| OAuth/PAT authentication flow | Settings modal with auth options |
| GitHub API client | Octokit wrapper with rate limiting |
| Tool integration in chat | Tools available to AI in Area context |
| PM persona prompts | System prompt additions for PM use case |

### Phase 2: Polish & Security (~1 week)

**Goal:** Production-ready GitHub integration

| Task | Deliverable |
|------|-------------|
| Rate limiting | Per-integration rate limits with backoff |
| Audit logging | Complete operation logging |
| Error UX | User-friendly error messages |
| Connection health monitoring | Status indicators and alerts |
| Security audit | Review credential handling, permissions |

### Phase 3: Second Integration (~2 weeks)

**Goal:** Validate architecture with Linear/Jira

| Task | Deliverable |
|------|-------------|
| Implement LinearProvider | Second provider validates base class |
| Linear OAuth flow | Settings UI for Linear connection |
| Cross-integration context | AI uses multiple integrations together |
| Documentation | Architecture docs, integration guide |

---

## 10. Security & Compliance

### Security Principles

| Principle | Implementation |
|-----------|----------------|
| **Least Privilege** | Request only necessary scopes; read-only by default |
| **Encryption at Rest** | All credentials encrypted with AES-256-GCM |
| **Audit Trail** | All integration operations logged |
| **Credential Isolation** | Credentials in separate table, never exposed to client |
| **Permission Boundaries** | Guests cannot access integrations |

### Credential Handling

```typescript
// NEVER do this - credentials in response
return { integration, accessToken: decryptedToken };

// DO this - credentials stay server-side
return { integration, isConnected: true };
```

### Rate Limiting Strategy

```typescript
// Per-integration rate limits
const RATE_LIMITS: Record<ServiceType, RateLimit> = {
  github: { requests: 5000, window: '1h' },    // GitHub API limit
  linear: { requests: 1000, window: '1h' },
  slack: { requests: 50, window: '1m' },       // Tier 2 limit
};

// Per-user rate limits (prevent abuse)
const USER_LIMITS = {
  toolCallsPerMinute: 20,
  toolCallsPerHour: 200,
};
```

### Compliance Features

| Feature | Purpose |
|---------|---------|
| **Operation Logs** | Who accessed what, when |
| **Retention Policies** | Log retention per org settings |
| **Export Capability** | Compliance reporting |
| **Revocation** | Immediate credential invalidation |

---

## 6. Service Architecture (MCP-Native)

### Model Context Protocol (MCP) Strategy

**MCP is the industry standard** for AI tool integration, adopted by OpenAI (March 2025), Google DeepMind (April 2025), and Microsoft (May 2025). With 10,000+ MCP servers and 97M+ monthly SDK downloads, building custom clients would be reinventing the wheel.

**Our Approach:** StratAI is an **MCP Host** that wraps MCP servers with our value-add layer.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       MCP-NATIVE ARCHITECTURE                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                    STRATAI (MCP HOST)                                    │   │
│   │                                                                          │   │
│   │   ┌──────────────────────────────────────────────────────────────────┐  │   │
│   │   │  STRATAI VALUE-ADD LAYER                                          │  │   │
│   │   │                                                                    │  │   │
│   │   │  • Credential encryption & OAuth management                        │  │   │
│   │   │  • Permission model (Org → Space → Area)                           │  │   │
│   │   │  • Audit logging for compliance                                    │  │   │
│   │   │  • Area-level scoping and overrides                                │  │   │
│   │   │  • Rate limiting and guardrails                                    │  │   │
│   │   │  • Unified settings UI                                             │  │   │
│   │   └──────────────────────────────────────────────────────────────────┘  │   │
│   │                              │                                           │   │
│   │                              ▼                                           │   │
│   │   ┌──────────────────────────────────────────────────────────────────┐  │   │
│   │   │  MCP CLIENT LAYER                                                 │  │   │
│   │   │                                                                    │  │   │
│   │   │  Standard MCP client implementation                                │  │   │
│   │   │  Capability negotiation, tool discovery, execution                 │  │   │
│   │   └──────────────────────────────────────────────────────────────────┘  │   │
│   │                              │                                           │   │
│   └──────────────────────────────┼──────────────────────────────────────────┘   │
│                                  │                                               │
│   ┌──────────────────────────────┼──────────────────────────────────────────┐   │
│   │                              ▼                                           │   │
│   │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────┐  │   │
│   │   │ MS Graph MCP │   │ GitHub MCP   │   │ Slack MCP    │   │ Custom  │  │   │
│   │   │ Server       │   │ Server       │   │ Server       │   │ Servers │  │   │
│   │   │              │   │              │   │              │   │         │  │   │
│   │   │ • Calendar   │   │ • Code       │   │ • Messages   │   │ • Your  │  │   │
│   │   │ • Email      │   │ • Issues     │   │ • Channels   │   │   APIs  │  │   │
│   │   │ • Teams      │   │ • PRs        │   │ • Users      │   │         │  │   │
│   │   └──────────────┘   └──────────────┘   └──────────────┘   └─────────┘  │   │
│   │                                                                          │   │
│   │   MCP SERVER ECOSYSTEM (10,000+ available)                               │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Why MCP-Native?

| Factor | Custom Clients | MCP-Native |
|--------|----------------|------------|
| **Development Time** | Build each client from scratch | Use existing MCP servers |
| **Ecosystem** | Maintain ourselves | 10,000+ community servers |
| **Standards** | Proprietary interface | Industry standard |
| **Future-Proof** | Migration required | Already aligned |
| **Interoperability** | StratAI-only | Works with any MCP host |

### What MCP Does NOT Handle (Our Value-Add)

MCP explicitly states: "The client/host is responsible for obtaining user consent, managing credentials, and access controls."

| Responsibility | MCP | StratAI |
|----------------|-----|---------|
| Tool execution | ✅ | Wraps with logging |
| Capability discovery | ✅ | Wraps with permissions |
| **Credential storage** | ❌ | ✅ Encrypted credentials |
| **OAuth flows** | ❌ | ✅ Token management |
| **User consent** | ❌ | ✅ Permission model |
| **Audit logging** | ❌ | ✅ Compliance logs |
| **Area scoping** | ❌ | ✅ Context restrictions |

### Directory Structure (Updated for MCP)

```
src/lib/server/integrations/
├── types.ts                    # Integration, Credential types
├── service.ts                  # IntegrationsService class
├── encryption.ts               # Credential encryption/decryption
├── rate-limiter.ts             # Per-integration rate limiting
│
├── mcp/
│   ├── client.ts               # MCP Client implementation
│   ├── server-manager.ts       # Start/stop MCP servers
│   ├── tool-wrapper.ts         # Wrap MCP tools with StratAI features
│   └── transport.ts            # stdio/SSE transport handling
│
├── providers/
│   ├── base-provider.ts        # Abstract BaseProvider (wraps MCP servers)
│   ├── provider-registry.ts    # Provider lookup by service type
│   │
│   ├── calendar/
│   │   ├── provider.ts         # CalendarProvider (wraps MS Graph MCP)
│   │   ├── oauth.ts            # Microsoft OAuth flow
│   │   └── types.ts            # Calendar-specific types
│   │
│   ├── github/
│   │   ├── provider.ts         # GitHubProvider (wraps GitHub MCP)
│   │   ├── oauth.ts            # GitHub OAuth/App auth
│   │   └── types.ts            # GitHub-specific types
│   │
│   └── slack/
│       └── ...
│
└── persistence/
    ├── integrations-postgres.ts
    ├── credentials-postgres.ts
    ├── area-integrations-postgres.ts
    └── logs-postgres.ts
```

### MCP Tool Interface

```typescript
// MCP tool definition (standard)
interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

// StratAI wrapper adds context
interface WrappedToolExecution {
  tool: MCPTool;
  params: Record<string, unknown>;
  context: {
    userId: string;
    areaId: string;
    integrationId: string;
    conversationId?: string;
  };
}

// Execution flow
async function executeTool(execution: WrappedToolExecution): Promise<ToolResult> {
  // 1. Check permissions (StratAI)
  await checkPermissions(execution.context);

  // 2. Apply Area scope restrictions (StratAI)
  const scopedParams = applyScopeRestrictions(execution);

  // 3. Execute via MCP client (MCP standard)
  const result = await mcpClient.callTool(execution.tool.name, scopedParams);

  // 4. Log for audit (StratAI)
  await logToolExecution(execution, result);

  return result;
}
```

### References

- [MCP Specification (2025-11)](https://modelcontextprotocol.io/specification/2025-11-25)
- [Anthropic MCP Announcement](https://www.anthropic.com/news/model-context-protocol)
- [MCP Linux Foundation Donation](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation)

---

## 12. Success Metrics

### Architecture Success

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Integration Development Time** | < 1 week for new provider | Time from start to functional |
| **Code Reuse** | > 80% shared code | Provider-specific vs shared |
| **Security Incidents** | 0 credential leaks | Security audit results |
| **Audit Coverage** | 100% operations logged | Log completeness check |

### Integration Health

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Connection Success Rate** | > 99% | Successful API calls / total |
| **Credential Refresh Success** | > 99.9% | Auto-refresh success rate |
| **Average Latency** | < 500ms | Tool execution time |
| **Error Rate** | < 1% | Errors / total operations |

### User Adoption

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Integration Setup Time** | < 5 minutes | Time to connected state |
| **Setup Completion Rate** | > 80% | Completed setups / started |
| **Daily Active Integrations** | Growing | Integrations used per day |
| **Tool Calls per Conversation** | 3-5 average | Not too many, not too few |

---

## Related Documents

- [GITHUB_CONTEXT_INTEGRATION.md](./GITHUB_CONTEXT_INTEGRATION.md) - First integration spec
- [ENTITY_MODEL.md](../ENTITY_MODEL.md) - Data architecture
- [AI_RETRIEVAL_ARCHITECTURE.md](./AI_RETRIEVAL_ARCHITECTURE.md) - How AI accesses data
- [CONTEXT_STRATEGY.md](./CONTEXT_STRATEGY.md) - What context to store

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Integration scoping: Org → Space → Area | Matches existing hierarchy; enables fine-grained control | 2026-01-22 |
| Space-level integration, Area-level activation | Balance between central management and Area flexibility | 2026-01-22 |
| Separate credentials table | Security isolation; easier audit; no accidental exposure | 2026-01-22 |
| Platform encryption key (start simple) | Defer per-org keys to enterprise tier | 2026-01-22 |
| Guests cannot access integrations | Security boundary; integrations often contain sensitive data | 2026-01-22 |
| **MCP-Native architecture** | MCP is the industry standard (OpenAI, Google, Microsoft adopted). 10K+ servers, 97M+ downloads. Don't build custom clients. | 2026-01-22 |
| **Two integration tiers** | Foundational (first-party UX: Calendar, Email) vs Contextual (add-on UX: GitHub, Jira). Different setup expectations. | 2026-01-22 |
| **Calendar first, not GitHub** | Dogfood principle (StratGroup uses MS 365). Universal value (everyone uses calendar). Meeting capture enables flywheel. | 2026-01-22 |
| **Microsoft Graph first** | Build for actual stack. Calendar + Email + Teams in one API. Proves architecture with complex OAuth. | 2026-01-22 |
| **Capture focus for Calendar V1** | Post-meeting decision capture feeds the flywheel (DECIDE → CAPTURE → EXECUTE → MEASURE → LEARN). Prep comes second. | 2026-01-22 |
| **Full read-write for Calendar** | Higher value enables creating follow-up meetings, focus time blocks. Flywheel requires pushing decisions to execution. | 2026-01-22 |
| **Calendar is foundation, Meeting Lifecycle is feature** | Calendar = primitive (read/write events). Meeting Lifecycle = higher feature that uses calendar + AI + tasks + pages. | 2026-01-22 |
| **Hybrid UX for foundational integrations** | First-party feel (always visible, prominent). Uses Integrations architecture under the hood (consistency, security). | 2026-01-22 |
