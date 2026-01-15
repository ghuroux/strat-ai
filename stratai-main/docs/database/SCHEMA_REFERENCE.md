# Database Schema Reference

> **Auto-generated** from migration files on 2026-01-14
> **Tables:** 32

**Important:** postgres.js automatically transforms `snake_case` columns to `camelCase` at runtime.
Use camelCase in TypeScript, snake_case in SQL.

---

## Table of Contents

- [area_memberships](#area_memberships)
- [areas](#areas)
- [arena_battle_models](#arena_battle_models)
- [arena_battles](#arena_battles)
- [audit_events](#audit_events)
- [conversations](#conversations)
- [document_area_shares](#document_area_shares)
- [documents](#documents)
- [email_logs](#email_logs)
- [focus_areas](#focus_areas)
- [group_memberships](#group_memberships)
- [groups](#groups)
- [llm_usage](#llm_usage)
- [model_rankings](#model_rankings)
- [org_memberships](#org_memberships)
- [organizations](#organizations)
- [page_conversations](#page_conversations)
- [page_group_shares](#page_group_shares)
- [page_user_shares](#page_user_shares)
- [page_versions](#page_versions)
- [pages](#pages)
- [password_reset_attempts](#password_reset_attempts)
- [password_reset_tokens](#password_reset_tokens)
- [related_tasks](#related_tasks)
- [routing_decisions](#routing_decisions)
- [space_memberships](#space_memberships)
- [spaces](#spaces)
- [task_documents](#task_documents)
- [tasks](#tasks)
- [tool_result_cache](#tool_result_cache)
- [user_id_mappings](#user_id_mappings)
- [users](#users)

---

## area_memberships

Explicit access grants for areas. Supports both user and group invites (XOR).

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `area_id` | `areaId` | TEXT | NO | - | - |
| `user_id` | `userId` | TEXT | YES | - | - |
| `group_id` | `groupId` | UUID | YES | - | - |
| `role` | `role` | TEXT | NO | 'member' | Access level: owner (full), admin (manage), member (participate), viewer (read-only) |
| `invited_by` | `invitedBy` | TEXT | YES | - | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `area_id` → `areas.id` (ON DELETE CASCADE)
- `group_id` → `groups.id` (ON DELETE CASCADE)

### Indexes

- **idx_area_memberships_user_unique**: UNIQUE (area_id, user_id) WHERE user_id IS NOT NULL
- **idx_area_memberships_group_unique**: UNIQUE (area_id, group_id) WHERE group_id IS NOT NULL
- **idx_area_memberships_area**: (area_id)
- **idx_area_memberships_user**: (user_id) WHERE user_id IS NOT NULL
- **idx_area_memberships_group**: (group_id) WHERE group_id IS NOT NULL

### TypeScript Interface

```typescript
interface AreaMembershipsRow {
    id: string | null;
    areaId: string;
    userId: string | null;
    groupId: string | null;
    role: string;
    invitedBy: string | null;
    createdAt: Date | null;
}
```

---

## areas

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `user_uuid` | `userUuid` | UUID | YES | - | - |
| `is_restricted` | `isRestricted` | BOOLEAN | NO | false | If true, requires explicit area_memberships. If false, space access grants area access. |
| `created_by` | `createdBy` | TEXT | YES | - | Original creator of the area. Has implicit owner access. |

### Indexes

- **idx_areas_user_space**: (user_id, space_id)
- **idx_areas_slug**: UNIQUE (space_id, slug, user_id) WHERE deleted_at IS NULL
- **idx_areas_is_restricted**: (space_id, is_restricted) WHERE deleted_at IS NULL

### TypeScript Interface

```typescript
interface AreasRow {
    userUuid: string | null;
    isRestricted: boolean;
    createdBy: string | null;
}
```

---

## arena_battle_models

Junction table for efficient model-to-battle lookups

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `battle_id` | `battleId` | TEXT | NO | - | - |
| `model_id` | `modelId` | TEXT | NO | - | - |
| `position` | `position` | INTEGER | NO | - | - |

### Foreign Keys

- `battle_id` → `arena_battles.id` (ON DELETE CASCADE)

### Indexes

- **idx_battle_models_model**: (model_id)

### TypeScript Interface

```typescript
interface ArenaBattleModelsRow {
    battleId: string;
    modelId: string;
    position: number;
}
```

---

## arena_battles

Model Arena battles with full response content and judgments

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `prompt` | `prompt` | TEXT | NO | - | - |
| `models` | `models` | JSONB | NO | '[]'::jsonb | Array of participating models: [{id, displayName, provider}] |
| `responses` | `responses` | JSONB | NO | '[]'::jsonb | Full response content: [{id, modelId, content, thinking?, metrics?, sources?, error?, startedAt, completedAt, durationMs}] |
| `settings` | `settings` | JSONB | NO | '{}'::jsonb | Battle configuration: {webSearchEnabled, extendedThinkingEnabled, thinkingBudgetTokens, temperature, reasoningEffort, blindMode} |
| `status` | `status` | TEXT | NO | 'pending' | - |
| `pinned` | `pinned` | BOOLEAN | NO | FALSE | - |
| `user_id` | `userId` | TEXT | NO | - | UUID reference to users table |
| `created_at` | `createdAt` | TIMESTAMPTZ | NO | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | NO | NOW() | - |
| `deleted_at` | `deletedAt` | TIMESTAMPTZ | YES | - | - |
| `user_uuid` | `userUuid` | UUID | YES | - | - |

### Indexes

- **idx_arena_battles_user_created**: (user_id, created_at) WHERE deleted_at IS NULL
- **idx_arena_battles_status**: (user_id, status) WHERE deleted_at IS NULL
- **idx_arena_battles_team**: (team_id, created_at) WHERE deleted_at IS NULL AND team_id IS NOT NULL
- **idx_arena_battles_pinned**: (user_id, pinned, created_at) WHERE deleted_at IS NULL
- **idx_arena_battles_responses_gin**: (responses)
- **idx_arena_battles_user_created**: (user_id, created_at)

### TypeScript Interface

```typescript
interface ArenaBattlesRow {
    id: string | null;
    prompt: string;
    models: object;
    responses: object;
    settings: object;
    status: string;
    pinned: boolean;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    userUuid: string | null;
}
```

---

## audit_events

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `user_id` | `userId` | TEXT | NO | - | - |
| `event_type` | `eventType` | TEXT | NO | - | - |
| `resource_type` | `resourceType` | TEXT | NO | - | - |
| `resource_id` | `resourceId` | TEXT | NO | - | - |
| `action` | `action` | TEXT | NO | - | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Indexes

- **idx_audit_events_resource**: (resource_type, resource_id, created_at)
- **idx_audit_events_user**: (user_id, created_at)
- **idx_audit_events_type**: (event_type, created_at)
- **idx_audit_events_created**: (created_at)

### TypeScript Interface

```typescript
interface AuditEventsRow {
    id: string | null;
    userId: string;
    eventType: string;
    resourceType: string;
    resourceId: string;
    action: string;
    createdAt: Date | null;
}
```

---

## conversations

Chat conversations with embedded JSONB messages. Supports soft deletes and multi-tenant access patterns.

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `title` | `title` | TEXT | NO | 'New | - |
| `model` | `model` | TEXT | NO | 'claude-sonnet-4-20250514' | - |
| `messages` | `messages` | JSONB | NO | '[]'::jsonb | Array of message objects: [{id, role, content, timestamp, thinking?, attachments?, sources?}] |
| `pinned` | `pinned` | BOOLEAN | NO | FALSE | - |
| `continued_from_id` | `continuedFromId` | TEXT | YES | - | - |
| `continuation_summary` | `continuationSummary` | TEXT | YES | - | - |
| `refreshed_at` | `refreshedAt` | TIMESTAMPTZ | YES | - | - |
| `team_id` | `teamId` | TEXT | YES | - | - |
| `tags` | `tags` | TEXT[] | YES | '{}' | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | NO | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | NO | NOW() | - |
| `deleted_at` | `deletedAt` | TIMESTAMPTZ | YES | - | - |
| `space_id` | `spaceId` | TEXT | YES | - | Foreign key to spaces table. For system spaces, equals the slug (work, research, random, personal). For custom spaces, is the UUID. |
| `last_viewed_at` | `lastViewedAt` | TIMESTAMPTZ | YES | - | Timestamp when user last opened/viewed this conversation. Used for Recent Conversations sorting. |
| `user_uuid` | `userUuid` | UUID | YES | - | - |

### Foreign Keys

- `continued_from_id` → `conversations.id` (ON DELETE SET NULL)

### Indexes

- **idx_conversations_user_updated**: (user_id, updated_at) WHERE deleted_at IS NULL
- **idx_conversations_pinned**: (user_id, pinned, updated_at) WHERE deleted_at IS NULL AND pinned = TRUE
- **idx_conversations_team**: (team_id, updated_at) WHERE deleted_at IS NULL
- **idx_conversations_messages_gin**: (messages)
- **idx_conversations_continued_from**: (continued_from_id) WHERE continued_from_id IS NOT NULL
- **idx_conversations_space_id**: (user_id, space_id, updated_at) WHERE deleted_at IS NULL AND space_id IS NOT NULL
- **idx_conversations_focus_area**: (user_id, focus_area_id, updated_at) WHERE deleted_at IS NULL AND focus_area_id IS NOT NULL
- **idx_conversations_task**: (user_id, task_id, updated_at) WHERE deleted_at IS NULL AND task_id IS NOT NULL
- **idx_conversations_tags**: (tags) WHERE deleted_at IS NULL
- **idx_conversations_space_id**: (user_id, space_id, updated_at) WHERE deleted_at IS NULL AND space_id IS NOT NULL
- **idx_conversations_last_viewed**: (user_id, last_viewed_at) WHERE deleted_at IS NULL
- **idx_conversations_space_last_viewed**: (user_id, space_id, last_viewed_at) WHERE deleted_at IS NULL AND space_id IS NOT NULL
- **idx_conversations_user_updated**: (user_id, updated_at)

### TypeScript Interface

```typescript
interface ConversationsRow {
    id: string | null;
    title: string;
    model: string;
    messages: object;
    pinned: boolean;
    continuedFromId: string | null;
    continuationSummary: string | null;
    refreshedAt: Date | null;
    teamId: string | null;
    tags: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    spaceId: string | null;
    lastViewedAt: Date | null;
    userUuid: string | null;
}
```

---

## document_area_shares

Junction table for area-level document sharing when visibility=areas

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `document_id` | `documentId` | TEXT | NO | - | - |
| `area_id` | `areaId` | TEXT | NO | - | - |
| `shared_by` | `sharedBy` | TEXT | NO | - | User ID who shared the document with this area |
| `shared_at` | `sharedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `notifications_sent` | `notificationsSent` | BOOLEAN | YES | FALSE | Whether area members have been notified about this share |

### Foreign Keys

- `document_id` → `documents.id` (ON DELETE CASCADE)
- `area_id` → `areas.id` (ON DELETE CASCADE)

### Indexes

- **idx_doc_shares_document**: (document_id)
- **idx_doc_shares_area**: (area_id)
- **idx_doc_shares_shared_by**: (shared_by)

### TypeScript Interface

```typescript
interface DocumentAreaSharesRow {
    id: string | null;
    documentId: string;
    areaId: string;
    sharedBy: string;
    sharedAt: Date | null;
    notificationsSent: boolean | null;
}
```

---

## documents

Documents - space_id normalized to proper IDs (migration 011)

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `user_id` | `userId` | TEXT | NO | - | UUID reference to users table |
| `filename` | `filename` | TEXT | NO | - | - |
| `mime_type` | `mimeType` | TEXT | NO | - | - |
| `file_size` | `fileSize` | INTEGER | NO | - | - |
| `char_count` | `charCount` | INTEGER | NO | - | - |
| `page_count` | `pageCount` | INTEGER | YES | - | - |
| `content` | `content` | TEXT | NO | - | Extracted text content, NOT raw binary. This is what gets injected into AI prompts. |
| `content_hash` | `contentHash` | TEXT | NO | - | SHA256 hash of content for deduplication |
| `truncated` | `truncated` | BOOLEAN | YES | FALSE | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `deleted_at` | `deletedAt` | TIMESTAMPTZ | YES | - | - |
| `user_uuid` | `userUuid` | UUID | YES | - | - |
| `visibility` | `visibility` | TEXT | NO | 'private' | Access scope: private (owner only), areas (specific areas via document_area_shares), space (all space members) |

### Indexes

- **idx_documents_user**: (user_id) WHERE deleted_at IS NULL
- **idx_documents_space_id**: (user_id, space_id) WHERE deleted_at IS NULL
- **idx_documents_hash**: (user_id, content_hash) WHERE deleted_at IS NULL
- **idx_documents_updated**: (user_id, updated_at) WHERE deleted_at IS NULL
- **idx_documents_user**: (user_id)
- **idx_documents_visibility**: (visibility) WHERE deleted_at IS NULL
- **idx_documents_filename_space**: (space_id, filename) WHERE deleted_at IS NULL

### TypeScript Interface

```typescript
interface DocumentsRow {
    id: string | null;
    userId: string;
    filename: string;
    mimeType: string;
    fileSize: number;
    charCount: number;
    pageCount: number | null;
    content: string;
    contentHash: string;
    truncated: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
    userUuid: string | null;
    visibility: string;
}
```

---

## email_logs

Audit trail for all emails sent through the system

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `org_id` | `orgId` | UUID | YES | - | - |
| `user_id` | `userId` | UUID | YES | - | - |
| `email_type` | `emailType` | TEXT | NO | - | - |
| `recipient_email` | `recipientEmail` | TEXT | NO | - | - |
| `subject` | `subject` | TEXT | NO | - | - |
| `sendgrid_message_id` | `sendgridMessageId` | TEXT | YES | - | SendGrid X-Message-Id for delivery tracking |
| `status` | `status` | TEXT | NO | 'pending' | - |
| `error_message` | `errorMessage` | TEXT | YES | - | - |
| `metadata` | `metadata` | JSONB | YES | '{}' | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `sent_at` | `sentAt` | TIMESTAMPTZ | YES | - | - |

### Foreign Keys

- `org_id` → `organizations.id` (ON DELETE SET NULL)
- `user_id` → `users.id` (ON DELETE SET NULL)

### Indexes

- **idx_email_logs_org**: (org_id)
- **idx_email_logs_user**: (user_id)
- **idx_email_logs_type**: (email_type)
- **idx_email_logs_status**: (status)
- **idx_email_logs_created**: (created_at)

### TypeScript Interface

```typescript
interface EmailLogsRow {
    id: string | null;
    orgId: string | null;
    userId: string | null;
    emailType: string;
    recipientEmail: string;
    subject: string;
    sendgridMessageId: string | null;
    status: string;
    errorMessage: string | null;
    metadata: object | null;
    createdAt: Date | null;
    sentAt: Date | null;
}
```

---

## focus_areas

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `space_id` | `spaceId` | TEXT | NO | - | - |
| `name` | `name` | TEXT | NO | - | - |
| `order_index` | `orderIndex` | INTEGER | YES | 0 | - |
| `user_id` | `userId` | TEXT | NO | - | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `deleted_at` | `deletedAt` | TIMESTAMPTZ | YES | - | - |
| `is_general` | `isGeneral` | BOOLEAN | YES | FALSE | - |
| `slug` | `slug` | TEXT | YES | - | - |

### Indexes

- **idx_focus_areas_space**: (space_id, user_id) WHERE deleted_at IS NULL
- **idx_focus_areas_user**: (user_id) WHERE deleted_at IS NULL
- **idx_focus_areas_order**: (space_id, user_id, order_index) WHERE deleted_at IS NULL
- **idx_focus_areas_slug**: UNIQUE (space_id, slug, user_id) WHERE deleted_at IS NULL
- **idx_focus_areas_general**: (space_id, user_id, is_general) WHERE is_general = TRUE AND deleted_at IS NULL

### TypeScript Interface

```typescript
interface FocusAreasRow {
    id: string | null;
    spaceId: string;
    name: string;
    orderIndex: number | null;
    userId: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
    isGeneral: boolean | null;
    slug: string | null;
}
```

---

## group_memberships

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `group_id` | `groupId` | UUID | NO | - | - |
| `user_id` | `userId` | UUID | NO | - | - |
| `role` | `role` | TEXT | YES | 'member' | - |
| `joined_at` | `joinedAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `group_id` → `groups.id` (ON DELETE CASCADE)
- `user_id` → `users.id` (ON DELETE CASCADE)

### Indexes

- **idx_group_memberships_user**: (user_id)

### TypeScript Interface

```typescript
interface GroupMembershipsRow {
    groupId: string;
    userId: string;
    role: string | null;
    joinedAt: Date | null;
}
```

---

## groups

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `organization_id` | `organizationId` | UUID | NO | - | - |
| `name` | `name` | TEXT | NO | - | - |
| `description` | `description` | TEXT | YES | - | - |
| `system_prompt` | `systemPrompt` | TEXT | YES | - | - |
| `litellm_team_id` | `litellmTeamId` | TEXT | YES | - | - |
| `allowed_tiers` | `allowedTiers` | TEXT[] | YES | - | - |
| `settings` | `settings` | JSONB | YES | '{}' | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `organization_id` → `organizations.id` (ON DELETE CASCADE)

### Indexes

- **idx_groups_org**: (organization_id)

### TypeScript Interface

```typescript
interface GroupsRow {
    id: string | null;
    organizationId: string;
    name: string;
    description: string | null;
    systemPrompt: string | null;
    litellmTeamId: string | null;
    allowedTiers: string | null;
    settings: object | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}
```

---

## llm_usage

Token usage tracking per LLM request for analytics and cost monitoring

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `organization_id` | `organizationId` | UUID | NO | - | - |
| `user_id` | `userId` | UUID | NO | - | - |
| `conversation_id` | `conversationId` | TEXT | YES | - | - |
| `model` | `model` | TEXT | NO | - | - |
| `request_type` | `requestType` | TEXT | NO | 'chat' | Type of request: chat (main chat), arena (model arena), second-opinion (comparison) |
| `prompt_tokens` | `promptTokens` | INTEGER | NO | 0 | - |
| `completion_tokens` | `completionTokens` | INTEGER | NO | 0 | - |
| `total_tokens` | `totalTokens` | INTEGER | NO | 0 | - |
| `cache_creation_tokens` | `cacheCreationTokens` | INTEGER | YES | 0 | Tokens used to create new cache entries (Anthropic prompt caching) |
| `cache_read_tokens` | `cacheReadTokens` | INTEGER | YES | 0 | Tokens read from cache (90% cost savings) |
| `estimated_cost_millicents` | `estimatedCostMillicents` | INTEGER | YES | 0 | Estimated cost in millicents (1000 millicents = 1 cent) |
| `created_at` | `createdAt` | TIMESTAMPTZ | NO | NOW() | - |

### Foreign Keys

- `organization_id` → `organizations.id`
- `user_id` → `users.id`
- `conversation_id` → `conversations.id` (ON DELETE SET NULL)

### Indexes

- **idx_llm_usage_org_date**: (organization_id, created_at)
- **idx_llm_usage_user_date**: (user_id, created_at)
- **idx_llm_usage_model**: (organization_id, model, created_at)

### TypeScript Interface

```typescript
interface LlmUsageRow {
    id: string | null;
    organizationId: string;
    userId: string;
    conversationId: string | null;
    model: string;
    requestType: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cacheCreationTokens: number | null;
    cacheReadTokens: number | null;
    estimatedCostMillicents: number | null;
    createdAt: Date;
}
```

---

## model_rankings

Per-user model performance rankings with Elo ratings

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `user_id` | `userId` | TEXT | NO | - | UUID reference to users table (part of composite PK) |
| `model_id` | `modelId` | TEXT | NO | - | - |
| `wins` | `wins` | INTEGER | NO | 0 | - |
| `losses` | `losses` | INTEGER | NO | 0 | - |
| `ties` | `ties` | INTEGER | NO | 0 | - |
| `total_battles` | `totalBattles` | INTEGER | NO | 0 | - |
| `user_wins` | `userWins` | INTEGER | NO | 0 | - |
| `user_losses` | `userLosses` | INTEGER | NO | 0 | - |
| `ai_wins` | `aiWins` | INTEGER | NO | 0 | - |
| `ai_losses` | `aiLosses` | INTEGER | NO | 0 | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | NO | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | NO | NOW() | - |
| `user_uuid` | `userUuid` | UUID | YES | - | - |

### Indexes

- **idx_model_rankings_elo**: (user_id, elo_rating)
- **idx_model_rankings_elo**: (user_id, elo_rating)

### TypeScript Interface

```typescript
interface ModelRankingsRow {
    userId: string;
    modelId: string;
    wins: number;
    losses: number;
    ties: number;
    totalBattles: number;
    userWins: number;
    userLosses: number;
    aiWins: number;
    aiLosses: number;
    createdAt: Date;
    updatedAt: Date;
    userUuid: string | null;
}
```

---

## org_memberships

User roles within an organization

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `organization_id` | `organizationId` | UUID | NO | - | - |
| `user_id` | `userId` | UUID | NO | - | - |
| `role` | `role` | TEXT | YES | 'member' | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `organization_id` → `organizations.id` (ON DELETE CASCADE)
- `user_id` → `users.id` (ON DELETE CASCADE)

### Indexes

- **idx_org_memberships_user**: (user_id)
- **idx_org_memberships_org**: (organization_id)
- **idx_org_memberships_owner**: (organization_id) WHERE role = 'owner'

### TypeScript Interface

```typescript
interface OrgMembershipsRow {
    id: string | null;
    organizationId: string;
    userId: string;
    role: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}
```

---

## organizations

Multi-tenant root entity. All data is scoped to an organization.

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `name` | `name` | TEXT | NO | - | - |
| `slug` | `slug` | TEXT | NO | - | - |
| `settings` | `settings` | JSONB | YES | '{}' | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `deleted_at` | `deletedAt` | TIMESTAMPTZ | YES | - | - |
| `system_prompt` | `systemPrompt` | TEXT | YES | - | Organization-wide AI context/instructions included in all conversations for this org |
| `allowed_tiers` | `allowedTiers` | TEXT[] | YES | ARRAY['basic' | Model tiers enabled for this organization (basic, standard, premium) |
| `monthly_budget` | `monthlyBudget` | DECIMAL(10 | YES | - | Monthly spending limit in USD, NULL means no limit |
| `budget_alert_threshold` | `budgetAlertThreshold` | INTEGER | YES | 80 | Percentage threshold for budget alerts (default 80%) |
| `budget_hard_limit` | `budgetHardLimit` | BOOLEAN | YES | false | If true, block requests when budget is exceeded |
| `model_tier_assignments` | `modelTierAssignments` | JSONB | YES | '{}' | Per-model tier assignments. Keys are model IDs, values are tier names (basic/standard/premium) or null (disabled) |

### Indexes

- **idx_organizations_slug**: (slug) WHERE deleted_at IS NULL

### TypeScript Interface

```typescript
interface OrganizationsRow {
    id: string | null;
    name: string;
    slug: string;
    settings: object | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
    systemPrompt: string | null;
    allowedTiers: string | null;
    monthlyBudget: number | null;
    budgetAlertThreshold: number | null;
    budgetHardLimit: boolean | null;
    modelTierAssignments: object | null;
}
```

---

## page_conversations

Junction table linking pages to conversations

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `page_id` | `pageId` | TEXT | NO | - | - |
| `conversation_id` | `conversationId` | TEXT | NO | - | - |
| `relationship` | `relationship` | TEXT | NO | - | How conversation relates: source (created from), discussion (about page), reference (mentioned) |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Indexes

- **idx_page_conversations_page**: (page_id)
- **idx_page_conversations_conv**: (conversation_id)

### TypeScript Interface

```typescript
interface PageConversationsRow {
    id: string | null;
    pageId: string;
    conversationId: string;
    relationship: string;
    createdAt: Date | null;
}
```

---

## page_group_shares

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `page_id` | `pageId` | TEXT | NO | - | - |
| `group_id` | `groupId` | UUID | NO | - | - |
| `permission` | `permission` | TEXT | NO | 'viewer' | - |
| `shared_by` | `sharedBy` | TEXT | NO | - | - |
| `shared_at` | `sharedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `page_id` → `pages.id` (ON DELETE CASCADE)
- `group_id` → `groups.id` (ON DELETE CASCADE)

### Indexes

- **idx_page_group_shares_unique**: UNIQUE (page_id, group_id)
- **idx_page_group_shares_page**: (page_id)
- **idx_page_group_shares_group**: (group_id)

### TypeScript Interface

```typescript
interface PageGroupSharesRow {
    id: string | null;
    pageId: string;
    groupId: string;
    permission: string;
    sharedBy: string;
    sharedAt: Date | null;
    createdAt: Date | null;
}
```

---

## page_user_shares

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `page_id` | `pageId` | TEXT | NO | - | - |
| `user_id` | `userId` | TEXT | NO | - | - |
| `permission` | `permission` | TEXT | NO | 'viewer' | - |
| `shared_by` | `sharedBy` | TEXT | NO | - | - |
| `shared_at` | `sharedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `page_id` → `pages.id` (ON DELETE CASCADE)

### Indexes

- **idx_page_user_shares_unique**: UNIQUE (page_id, user_id)
- **idx_page_user_shares_page**: (page_id)
- **idx_page_user_shares_user**: (user_id)

### TypeScript Interface

```typescript
interface PageUserSharesRow {
    id: string | null;
    pageId: string;
    userId: string;
    permission: string;
    sharedBy: string;
    sharedAt: Date | null;
    createdAt: Date | null;
}
```

---

## page_versions

Version history for page content

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `page_id` | `pageId` | TEXT | NO | - | - |
| `content` | `content` | JSONB | NO | - | - |
| `content_text` | `contentText` | TEXT | YES | - | - |
| `title` | `title` | TEXT | NO | - | - |
| `word_count` | `wordCount` | INTEGER | YES | 0 | - |
| `created_by` | `createdBy` | TEXT | NO | - | - |
| `version_number` | `versionNumber` | INTEGER | NO | - | - |
| `change_summary` | `changeSummary` | TEXT | YES | - | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Indexes

- **idx_page_versions_page**: (page_id)
- **idx_page_versions_created**: (page_id, created_at)

### TypeScript Interface

```typescript
interface PageVersionsRow {
    id: string | null;
    pageId: string;
    content: object;
    contentText: string | null;
    title: string;
    wordCount: number | null;
    createdBy: string;
    versionNumber: number;
    changeSummary: string | null;
    createdAt: Date | null;
}
```

---

## pages

User-created rich text documents for knowledge management

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `user_id` | `userId` | TEXT | NO | - | - |
| `area_id` | `areaId` | TEXT | NO | - | - |
| `title` | `title` | TEXT | NO | - | - |
| `content` | `content` | JSONB | NO | '{"type":"doc" | TipTap/ProseMirror JSON document structure |
| `page_type` | `pageType` | TEXT | NO | 'general' | Template type: general, meeting_notes, decision_record, proposal, project_brief, weekly_update, technical_spec |
| `visibility` | `visibility` | TEXT | NO | 'private' | Access level: private (owner only) or shared (team visible) |
| `word_count` | `wordCount` | INTEGER | YES | 0 | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `deleted_at` | `deletedAt` | TIMESTAMPTZ | YES | - | - |

### Indexes

- **idx_pages_user**: (user_id) WHERE deleted_at IS NULL
- **idx_pages_area**: (area_id) WHERE deleted_at IS NULL
- **idx_pages_task**: (task_id) WHERE task_id IS NOT NULL AND deleted_at IS NULL
- **idx_pages_updated**: (user_id, updated_at) WHERE deleted_at IS NULL

### TypeScript Interface

```typescript
interface PagesRow {
    id: string | null;
    userId: string;
    areaId: string;
    title: string;
    content: object;
    pageType: string;
    visibility: string;
    wordCount: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
}
```

---

## password_reset_attempts

Rate limiting for password reset requests

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `email` | `email` | TEXT | NO | - | - |
| `ip_address` | `ipAddress` | TEXT | YES | - | - |
| `attempted_at` | `attemptedAt` | TIMESTAMPTZ | YES | NOW() | - |

### Indexes

- **idx_password_reset_attempts_email**: (email, attempted_at)
- **idx_password_reset_attempts_ip**: (ip_address, attempted_at) WHERE ip_address IS NOT NULL

### TypeScript Interface

```typescript
interface PasswordResetAttemptsRow {
    id: string | null;
    email: string;
    ipAddress: string | null;
    attemptedAt: Date | null;
}
```

---

## password_reset_tokens

Secure password reset tokens (hashed)

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `user_id` | `userId` | UUID | NO | - | - |
| `token_hash` | `tokenHash` | TEXT | NO | - | SHA256 hash - plain token sent via email |
| `expires_at` | `expiresAt` | TIMESTAMPTZ | NO | - | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `user_id` → `users.id` (ON DELETE CASCADE)

### Indexes

- **idx_password_reset_tokens_user**: (user_id)
- **idx_password_reset_tokens_hash**: (token_hash)
- **idx_password_reset_tokens_expires**: (expires_at) WHERE used_at IS NULL

### TypeScript Interface

```typescript
interface PasswordResetTokensRow {
    id: string | null;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date | null;
}
```

---

## related_tasks

Junction table for peer task relationships (distinct from parent-child hierarchy)

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `source_task_id` | `sourceTaskId` | TEXT | NO | - | - |
| `target_task_id` | `targetTaskId` | TEXT | NO | - | - |
| `relationship_type` | `relationshipType` | TEXT | NO | 'related' | Type of relationship: related, blocks, depends_on, or informs |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `source_task_id` → `tasks.id` (ON DELETE CASCADE)
- `target_task_id` → `tasks.id` (ON DELETE CASCADE)

### Indexes

- **idx_related_tasks_source**: (source_task_id)
- **idx_related_tasks_target**: (target_task_id)

### TypeScript Interface

```typescript
interface RelatedTasksRow {
    id: string | null;
    sourceTaskId: string;
    targetTaskId: string;
    relationshipType: string;
    createdAt: Date | null;
}
```

---

## routing_decisions

AUTO mode routing decision log for analytics and tuning

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | NO | NOW() | - |
| `user_id` | `userId` | UUID | NO | - | - |
| `organization_id` | `organizationId` | UUID | YES | - | - |
| `conversation_id` | `conversationId` | UUID | YES | - | - |
| `provider` | `provider` | VARCHAR(50) | NO | - | - |
| `conversation_turn` | `conversationTurn` | INTEGER | NO | 1 | - |
| `selected_model` | `selectedModel` | VARCHAR(100) | NO | - | - |
| `tier` | `tier` | VARCHAR(20) | NO | - | Complexity tier: simple (Haiku), medium (Sonnet), complex (Opus) |
| `score` | `score` | INTEGER | NO | - | Complexity score 0-100 from query analysis |
| `confidence` | `confidence` | REAL | NO | - | Router confidence in the classification (0.0-1.0) |
| `reasoning` | `reasoning` | TEXT | YES | - | - |
| `query_length` | `queryLength` | INTEGER | YES | - | - |
| `request_succeeded` | `requestSucceeded` | BOOLEAN | YES | - | - |
| `response_tokens` | `responseTokens` | INTEGER | YES | - | - |
| `estimated_cost_millicents` | `estimatedCostMillicents` | INTEGER | YES | - | - |

### Foreign Keys

- `user_id` → `users.id` (ON DELETE CASCADE)
- `organization_id` → `organizations.id` (ON DELETE CASCADE)

### Indexes

- **idx_routing_decisions_created**: (created_at)
- **idx_routing_decisions_org**: (organization_id, created_at)
- **idx_routing_decisions_user**: (user_id, created_at)
- **idx_routing_decisions_tier**: (tier, created_at)
- **idx_routing_decisions_model**: (selected_model, created_at)
- **idx_routing_decisions_provider**: (provider, created_at)

### TypeScript Interface

```typescript
interface RoutingDecisionsRow {
    id: string | null;
    createdAt: Date;
    userId: string;
    organizationId: string | null;
    conversationId: string | null;
    provider: string;
    conversationTurn: number;
    selectedModel: string;
    tier: string;
    score: number;
    confidence: number;
    reasoning: string | null;
    queryLength: number | null;
    requestSucceeded: boolean | null;
    responseTokens: number | null;
    estimatedCostMillicents: number | null;
}
```

---

## space_memberships

Space-level access control. Users/groups can be members of spaces with role-based permissions.

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | 'sm_' | - |
| `space_id` | `spaceId` | TEXT | NO | - | - |
| `user_id` | `userId` | UUID | YES | - | - |
| `group_id` | `groupId` | UUID | YES | - | - |
| `role` | `role` | TEXT | NO | 'member' | owner=full control, admin=manage members, member=standard access, guest=limited (only shared areas) |
| `invited_by` | `invitedBy` | UUID | YES | - | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | NO | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | NO | NOW() | - |

### Foreign Keys

- `space_id` → `spaces.id` (ON DELETE CASCADE)
- `user_id` → `users.id` (ON DELETE CASCADE)
- `group_id` → `groups.id` (ON DELETE CASCADE)
- `invited_by` → `users.id`

### Indexes

- **idx_space_memberships_user**: UNIQUE (space_id, user_id) WHERE user_id IS NOT NULL
- **idx_space_memberships_group**: UNIQUE (space_id, group_id) WHERE group_id IS NOT NULL
- **idx_space_memberships_space**: (space_id)
- **idx_space_memberships_user_lookup**: (user_id) WHERE user_id IS NOT NULL
- **idx_space_memberships_role**: (space_id, role)

### TypeScript Interface

```typescript
interface SpaceMembershipsRow {
    id: string | null;
    spaceId: string;
    userId: string | null;
    groupId: string | null;
    role: string;
    invitedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}
```

---

## spaces

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `user_id` | `userId` | TEXT | NO | - | UUID reference to users table |
| `name` | `name` | TEXT | NO | - | - |
| `type` | `type` | TEXT | NO | - | - |
| `slug` | `slug` | TEXT | NO | - | - |
| `context_document_ids` | `contextDocumentIds` | TEXT[] | YES | '{}' | - |
| `order_index` | `orderIndex` | INTEGER | NO | 0 | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `deleted_at` | `deletedAt` | TIMESTAMPTZ | YES | - | - |
| `user_uuid` | `userUuid` | UUID | YES | - | - |
| `space_type` | `spaceType` | TEXT | YES | 'personal' | personal=single owner, organization=org-wide, project=team project |
| `organization_id` | `organizationId` | UUID | YES | - | - |

### Indexes

- **idx_spaces_user_slug**: UNIQUE (user_id, slug) WHERE deleted_at IS NULL
- **idx_spaces_user**: (user_id) WHERE deleted_at IS NULL
- **idx_spaces_order**: (user_id, order_index) WHERE deleted_at IS NULL
- **idx_spaces_user**: (user_id)
- **idx_spaces_order**: (user_id, order_index)

### TypeScript Interface

```typescript
interface SpacesRow {
    id: string | null;
    userId: string;
    name: string;
    type: string;
    slug: string;
    contextDocumentIds: string | null;
    orderIndex: number;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
    userUuid: string | null;
    spaceType: string | null;
    organizationId: string | null;
}
```

---

## task_documents

Junction table linking tasks to documents for context

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `task_id` | `taskId` | TEXT | NO | - | - |
| `document_id` | `documentId` | TEXT | NO | - | - |
| `context_role` | `contextRole` | TEXT | NO | 'reference' | How this document relates to the task: reference, input, or output |
| `context_note` | `contextNote` | TEXT | YES | - | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `task_id` → `tasks.id` (ON DELETE CASCADE)
- `document_id` → `documents.id` (ON DELETE CASCADE)

### Indexes

- **idx_task_documents_task**: (task_id)
- **idx_task_documents_document**: (document_id)

### TypeScript Interface

```typescript
interface TaskDocumentsRow {
    id: string | null;
    taskId: string;
    documentId: string;
    contextRole: string;
    contextNote: string | null;
    createdAt: Date | null;
}
```

---

## tasks

Tasks - subtask planning status bug fixed (migration 012)

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `title` | `title` | TEXT | NO | - | - |
| `status` | `status` | TEXT | NO | 'active' | - |
| `priority` | `priority` | TEXT | YES | 'normal' | - |
| `color` | `color` | TEXT | NO | - | - |
| `due_date` | `dueDate` | TIMESTAMPTZ | YES | - | - |
| `due_date_type` | `dueDateType` | TEXT | YES | - | - |
| `completed_at` | `completedAt` | TIMESTAMPTZ | YES | - | - |
| `completion_notes` | `completionNotes` | TEXT | YES | - | - |
| `source_type` | `sourceType` | TEXT | NO | 'manual' | - |
| `source_assist_id` | `sourceAssistId` | TEXT | YES | - | - |
| `source_conversation_id` | `sourceConversationId` | TEXT | YES | - | - |
| `linked_conversation_ids` | `linkedConversationIds` | TEXT[] | YES | '{}' | - |
| `parent_task_id` | `parentTaskId` | TEXT | YES | - | - |
| `subtask_type` | `subtaskType` | TEXT | YES | 'conversation' | - |
| `subtask_order` | `subtaskOrder` | INTEGER | YES | 0 | - |
| `context_summary` | `contextSummary` | TEXT | YES | - | - |
| `area_id` | `areaId` | TEXT | YES | - | - |
| `planning_data` | `planningData` | JSONB | YES | - | JSONB storage for Plan Mode state including phase, proposedSubtasks, and conversation reference. NULL when not in planning status. |
| `space_id` | `spaceId` | TEXT | NO | - | Foreign key to spaces table. Required for all tasks. |
| `user_id` | `userId` | TEXT | NO | - | UUID reference to users table |
| `last_activity_at` | `lastActivityAt` | TIMESTAMPTZ | YES | NOW() | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `deleted_at` | `deletedAt` | TIMESTAMPTZ | YES | - | - |
| `description` | `description` | TEXT | YES | - | User-provided description/background context for the task. Injected into AI prompts for better planning quality. |
| `stale_dismissed_at` | `staleDismissedAt` | TIMESTAMPTZ | YES | - | Timestamp when user dismissed the stale warning. Reset when there is new activity on the task. |
| `estimated_effort` | `estimatedEffort` | VARCHAR(20) | YES | - | Estimated effort: quick (<15m), short (<1h), medium (1-4h), long (4h+), multi_day |
| `approach_chosen_at` | `approachChosenAt` | TIMESTAMPTZ | YES | - | Timestamp when user chose work/plan approach via modal. NULL = show modal on first visit. |
| `user_uuid` | `userUuid` | UUID | YES | - | - |

### Foreign Keys

- `parent_task_id` → `tasks.id` (ON DELETE CASCADE)
- `area_id` → `areas.id` (ON DELETE SET NULL)

### Indexes

- **idx_tasks_user_space_id**: (user_id, space_id) WHERE deleted_at IS NULL
- **idx_tasks_user_status**: (user_id, status) WHERE deleted_at IS NULL
- **idx_tasks_active**: (user_id, space_id, status) WHERE deleted_at IS NULL AND status = 'active'
- **idx_tasks_parent**: (parent_task_id, subtask_order) WHERE parent_task_id IS NOT NULL AND deleted_at IS NULL
- **idx_tasks_has_subtasks**: (parent_task_id) WHERE parent_task_id IS NOT NULL AND deleted_at IS NULL
- **idx_tasks_area**: (area_id) WHERE area_id IS NOT NULL AND deleted_at IS NULL
- **idx_tasks_planning**: (user_id, space_id) WHERE status = 'planning' AND deleted_at IS NULL
- **idx_tasks_user_space_id**: (user_id, space_id) WHERE deleted_at IS NULL
- **idx_tasks_active_space_id**: (user_id, space_id, status) WHERE deleted_at IS NULL AND status = 'active'
- **idx_tasks_planning**: (user_id, space_id) WHERE status = 'planning' AND deleted_at IS NULL
- **idx_tasks_area**: (area_id) WHERE area_id IS NOT NULL AND deleted_at IS NULL
- **idx_tasks_estimated_effort**: (estimated_effort) WHERE estimated_effort IS NOT NULL
- **idx_tasks_user_space**: (user_id, space_id)
- **idx_tasks_source_document**: (source_assist_id) WHERE source_type = 'document' AND deleted_at IS NULL

### TypeScript Interface

```typescript
interface TasksRow {
    id: string | null;
    title: string;
    status: string;
    priority: string | null;
    color: string;
    dueDate: Date | null;
    dueDateType: string | null;
    completedAt: Date | null;
    completionNotes: string | null;
    sourceType: string;
    sourceAssistId: string | null;
    sourceConversationId: string | null;
    linkedConversationIds: string | null;
    parentTaskId: string | null;
    subtaskType: string | null;
    subtaskOrder: number | null;
    contextSummary: string | null;
    areaId: string | null;
    planningData: object | null;
    spaceId: string;
    userId: string;
    lastActivityAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
    description: string | null;
    staleDismissedAt: Date | null;
    estimatedEffort: string | null;
    approachChosenAt: Date | null;
    userUuid: string | null;
}
```

---

## tool_result_cache

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | TEXT | YES | - | - |
| `conversation_id` | `conversationId` | TEXT | NO | - | - |
| `user_id` | `userId` | TEXT | NO | - | - |
| `tool_name` | `toolName` | TEXT | NO | - | - |
| `params_hash` | `paramsHash` | TEXT | NO | - | - |
| `full_result` | `fullResult` | TEXT | NO | - | - |
| `access_count` | `accessCount` | INTEGER | YES | 1 | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `last_accessed_at` | `lastAccessedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `expires_at` | `expiresAt` | TIMESTAMPTZ | YES | (NOW() | - |

### Indexes

- **idx_tool_cache_lookup**: (conversation_id, tool_name, params_hash) WHERE expires_at > NOW()
- **idx_tool_cache_expires**: (expires_at)

### TypeScript Interface

```typescript
interface ToolResultCacheRow {
    id: string | null;
    conversationId: string;
    userId: string;
    toolName: string;
    paramsHash: string;
    fullResult: string;
    accessCount: number | null;
    createdAt: Date | null;
    lastAccessedAt: Date | null;
    expiresAt: Date | null;
}
```

---

## user_id_mappings

Backward compatibility: maps legacy TEXT user_ids to UUID user_ids

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `legacy_id` | `legacyId` | TEXT | YES | - | - |
| `user_id` | `userId` | UUID | NO | - | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |

### Foreign Keys

- `user_id` → `users.id` (ON DELETE CASCADE)

### Indexes

- **idx_user_id_mappings_user**: (user_id)

### TypeScript Interface

```typescript
interface UserIdMappingsRow {
    legacyId: string | null;
    userId: string;
    createdAt: Date | null;
}
```

---

## users

User accounts within an organization

### Columns

| Column (SQL) | Column (JS) | Type | Nullable | Default | Description |
|--------------|-------------|------|----------|---------|-------------|
| `id` | `id` | UUID | YES | gen_random_uuid() | - |
| `organization_id` | `organizationId` | UUID | NO | - | - |
| `email` | `email` | TEXT | NO | - | - |
| `username` | `username` | TEXT | NO | - | - |
| `display_name` | `displayName` | TEXT | YES | - | - |
| `password_hash` | `passwordHash` | TEXT | YES | - | - |
| `status` | `status` | TEXT | YES | 'active' | - |
| `last_login_at` | `lastLoginAt` | TIMESTAMPTZ | YES | - | - |
| `settings` | `settings` | JSONB | YES | '{}' | - |
| `created_at` | `createdAt` | TIMESTAMPTZ | YES | NOW() | - |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | YES | NOW() | - |
| `deleted_at` | `deletedAt` | TIMESTAMPTZ | YES | - | - |
| `preferences` | `preferences` | jsonb | YES | '{}'::jsonb | User preferences as JSON. Includes homePage settings, etc. |
| `first_name` | `firstName` | VARCHAR(100) | YES | - | - |
| `last_name` | `lastName` | VARCHAR(100) | YES | - | - |

### Foreign Keys

- `organization_id` → `organizations.id`

### Indexes

- **idx_users_org**: (organization_id) WHERE deleted_at IS NULL
- **idx_users_email**: (email) WHERE deleted_at IS NULL
- **idx_users_username**: (username) WHERE deleted_at IS NULL
- **idx_users_first_name**: (first_name)
- **idx_users_last_name**: (last_name)

### TypeScript Interface

```typescript
interface UsersRow {
    id: string | null;
    organizationId: string;
    email: string;
    username: string;
    displayName: string | null;
    passwordHash: string | null;
    status: string | null;
    lastLoginAt: Date | null;
    settings: object | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    deletedAt: Date | null;
    preferences: object | null;
    firstName: string | null;
    lastName: string | null;
}
```

---

