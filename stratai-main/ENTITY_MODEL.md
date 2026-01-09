# StratAI Entity Model

> **Document Purpose:** Authoritative reference for StratAI's foundational data architecture. This document defines all entities, relationships, access patterns, and serves as the success criteria for implementation.
>
> **Created:** January 2026
> **Status:** Approved for Implementation
> **Supersedes:** Schema sections in `docs/enterprise-roadmap.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Principles](#2-design-principles)
3. [Entity Hierarchy](#3-entity-hierarchy)
4. [Platform Entities](#4-platform-entities)
5. [Organization Entities](#5-organization-entities)
6. [Workspace Entities](#6-workspace-entities)
7. [Context Entities](#7-context-entities)
8. [Operational Entities](#8-operational-entities)
9. [Access Resolution Algorithms](#9-access-resolution-algorithms)
10. [Guardrails Resolution](#10-guardrails-resolution)
11. [Complete Schema](#11-complete-schema)
12. [Index Strategy](#12-index-strategy)
13. [Migration Path](#13-migration-path)
14. [Decision Log](#14-decision-log)
15. [Appendix: Query Examples](#15-appendix-query-examples)

---

## 1. Executive Summary

### Purpose

This document defines the complete data model for StratAI's enterprise platform. It serves as:

- **Single source of truth** for all entity definitions
- **Implementation specification** for database schema
- **Success criteria** for the multi-tenancy implementation phase
- **Reference** for access control and business logic

### Scope

The entity model covers:

| Domain | Entities |
|--------|----------|
| **Platform** | Models, Model Tiers, Guardrails |
| **Organization** | Organizations, Groups, Users, Profiles, Memberships |
| **Workspace** | Spaces, Areas, Tasks, Memberships |
| **Context** | Conversations, Messages, Memories, Documents |
| **Operations** | Usage Records, Budgets, Invoices, Invitations, Audit Log |

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Models as first-class entities | Enable per-model guardrails, not just tier-level |
| Two Space types (organizational/personal) | Clear governance boundary, appropriate propagation |
| Areas as collaboration unit | Granular sharing without exposing entire Spaces |
| Bi-temporal memories | Enterprise compliance, audit trails |
| Separate subscription (tiers) from governance (guardrails) | Orthogonal concerns, cleaner logic |

---

## 2. Design Principles

### 2.1 Separation of Concerns

```
SUBSCRIPTION (What you pay for)     GOVERNANCE (What you can use)
├── Model Tiers                     ├── Guardrails
├── Org subscription level          ├── Applied at multiple levels
└── User tier access                └── Most restrictive wins

         ↓                                    ↓
         └──────────── COMBINED ──────────────┘
                          ↓
              User's Available Models
```

### 2.2 Hierarchical Inheritance

Access and context flow through hierarchies, but with clear boundaries:

```
ORGANIZATIONAL HIERARCHY          WORKSPACE HIERARCHY
Organization                      Space (Org or Personal)
    └── Groups                        └── Areas
        └── Users                         └── Tasks
                                              └── Conversations
```

### 2.3 Explicit Over Implicit

- Access is explicitly granted, not assumed
- Memberships are recorded, not computed
- Guardrails stack explicitly with documented resolution

### 2.4 Audit Everything

- All state changes are logged
- Temporal tracking on critical entities
- Full provenance for memories and context

---

## 3. Entity Hierarchy

### 3.1 Complete Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STRATAI ENTITY MODEL                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PLATFORM LEVEL (Global)                                                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                         │
│  │   Models    │───▶│ Model Tiers │    │ Guardrails  │                         │
│  │ (individual)│    │  (bundles)  │    │  (rules)    │                         │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                         │
│                                               │ applied at ↓                    │
│  ─────────────────────────────────────────────┼────────────────────────────────│
│                                               │                                  │
│  ORGANIZATION LEVEL                           │                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                           Organization                                   │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │   │
│  │  │    Groups    │    │    Users     │    │   Profiles   │              │   │
│  │  │ (departments)│    │  (people)    │    │ (templates)  │              │   │
│  │  └───────┬──────┘    └───────┬──────┘    └──────────────┘              │   │
│  │          │                   │                                          │   │
│  │          └─────────┬─────────┘                                          │   │
│  │                    │                                                     │   │
│  │           ┌────────┴────────┐                                           │   │
│  │           │  Org Membership │ (role, tiers, budget)                     │   │
│  │           │ Group Membership│ (role)                                    │   │
│  │           └─────────────────┘                                           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                          │                                                       │
│  ─────────────────────────┼──────────────────────────────────────────────────── │
│                          │                                                       │
│  WORKSPACE LEVEL         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   ┌─────────────────────────┐      ┌─────────────────────────┐         │   │
│  │   │   ORGANIZATIONAL SPACE  │      │    PERSONAL SPACE       │         │   │
│  │   │   (org-provided)        │      │    (user-created)       │         │   │
│  │   │                         │      │                         │         │   │
│  │   │   space_group_access    │      │   created_by = user     │         │   │
│  │   │   (auto-access)         │      │   (private by default)  │         │   │
│  │   └───────────┬─────────────┘      └───────────┬─────────────┘         │   │
│  │               │                                │                        │   │
│  │               └────────────┬───────────────────┘                        │   │
│  │                            │                                             │   │
│  │                            ▼                                             │   │
│  │               ┌─────────────────────────┐                               │   │
│  │               │         Areas           │                               │   │
│  │               │  (collaboration units)  │                               │   │
│  │               │                         │                               │   │
│  │               │   area_memberships      │                               │   │
│  │               │   (users + groups)      │                               │   │
│  │               └───────────┬─────────────┘                               │   │
│  │                           │                                              │   │
│  │                           ▼                                              │   │
│  │               ┌─────────────────────────┐                               │   │
│  │               │         Tasks           │                               │   │
│  │               │   (work items)          │                               │   │
│  │               └─────────────────────────┘                               │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                          │                                                       │
│  ─────────────────────────┼──────────────────────────────────────────────────── │
│                          │                                                       │
│  CONTEXT LEVEL           ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │   │
│  │   │Conversations │──▶│   Messages   │   │   Memories   │               │   │
│  │   │              │   │ (+ vectors)  │   │ (+ vectors)  │               │   │
│  │   └──────────────┘   └──────────────┘   └──────────────┘               │   │
│  │                                                                          │   │
│  │   ┌──────────────┐   ┌──────────────┐                                   │   │
│  │   │  Documents   │   │   Memory     │                                   │   │
│  │   │ (+ chunks)   │   │  Proposals   │                                   │   │
│  │   └──────────────┘   └──────────────┘                                   │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                          │                                                       │
│  ─────────────────────────┼──────────────────────────────────────────────────── │
│                          │                                                       │
│  OPERATIONAL LEVEL       ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐               │   │
│  │   │Usage Records │   │   Budgets    │   │   Invoices   │               │   │
│  │   └──────────────┘   └──────────────┘   └──────────────┘               │   │
│  │                                                                          │   │
│  │   ┌──────────────┐   ┌──────────────┐                                   │   │
│  │   │ Invitations  │   │  Audit Log   │                                   │   │
│  │   └──────────────┘   └──────────────┘                                   │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Platform Entities

Platform entities exist at the global level and are managed by StratAI platform administrators.

### 4.1 Models

Individual LLM models available on the platform.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `model_id` | TEXT | LiteLLM model identifier (e.g., 'claude-opus-4-5-20251101') |
| `display_name` | TEXT | Human-readable name (e.g., 'Claude Opus 4.5') |
| `provider` | TEXT | Provider name ('anthropic', 'openai', 'google', 'aws') |
| `tier_id` | UUID | FK to model_tiers (which subscription tier includes this) |
| `is_enabled` | BOOLEAN | Global toggle - can disable model platform-wide |
| `requires_approval` | BOOLEAN | If true, usage requires approval workflow |
| `description` | TEXT | Model description for UI |
| `best_use_case` | TEXT | Recommended use cases |
| `capabilities` | JSONB | Feature flags (vision, tools, extended_thinking, etc.) |
| `context_window` | INTEGER | Max context window in tokens |
| `input_cost_per_million` | DECIMAL | Our cost per 1M input tokens |
| `output_cost_per_million` | DECIMAL | Our cost per 1M output tokens |
| `markup_percentage` | DECIMAL | Markup for premium pass-through (default 25%) |
| `sort_order` | INTEGER | Display order within tier |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Key Behaviors:**
- Models can be globally disabled without affecting tier definitions
- Guardrails can reference specific models for fine-grained control
- Pricing supports transparent pass-through for premium models

### 4.2 Model Tiers

Subscription bundles that group models for billing purposes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Tier name ('Basic', 'Standard', 'Premium') |
| `slug` | TEXT | URL-safe identifier ('basic', 'standard', 'premium') |
| `description` | TEXT | Tier description |
| `best_use_case` | TEXT | When to use this tier |
| `base_price` | DECIMAL | Monthly subscription component (if any) |
| `is_active` | BOOLEAN | Can be offered to customers |
| `sort_order` | INTEGER | Display order |
| `created_at` | TIMESTAMPTZ | Record creation |

**Key Behaviors:**
- Tiers are for BILLING (what you pay for)
- Models belong to tiers; tiers don't contain guardrails
- Organizations subscribe to tiers; users inherit tier access

### 4.3 Guardrails

Governance rules that can be applied at multiple levels.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Human-readable name |
| `description` | TEXT | What this guardrail does |
| `type` | TEXT | Guardrail type (see below) |
| `config` | JSONB | Type-specific configuration |
| `level` | TEXT | Scope level ('global', 'organization', 'group', 'user') |
| `scope_id` | UUID | ID of org/group/user (null for global) |
| `action` | TEXT | What happens on violation ('block', 'warn', 'log') |
| `priority` | INTEGER | Resolution order (higher = checked first) |
| `is_active` | BOOLEAN | Currently enforced |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Guardrail Types:**

| Type | Config Schema | Description |
|------|---------------|-------------|
| `model_allowlist` | `{"models": ["model_id", ...]}` | Only these models allowed |
| `model_denylist` | `{"models": ["model_id", ...]}` | These models blocked |
| `tier_allowlist` | `{"tiers": ["basic", "standard"]}` | Only these tiers allowed |
| `token_limit` | `{"max_input": N, "max_output": N}` | Token limits per request |
| `rate_limit` | `{"requests": N, "period": "hour"}` | Rate limiting |
| `budget_limit` | `{"amount": N, "period": "monthly"}` | Spending cap |
| `content_filter` | `{"blocked_patterns": [...]}` | Content restrictions |

**Key Behaviors:**
- Guardrails are for GOVERNANCE (what you're allowed to use)
- Multiple guardrails can apply; resolution is documented in Section 10
- Guardrails stack: most restrictive wins for each type

---

## 5. Organization Entities

### 5.1 Organizations

Top-level tenant entity. All customer data is scoped to an organization.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Organization name |
| `slug` | TEXT | URL-safe identifier (unique) |
| `litellm_org_id` | TEXT | Synced LiteLLM organization ID |
| `settings` | JSONB | Organization settings (see below) |
| `billing_email` | TEXT | Primary billing contact |
| `billing_plan` | TEXT | Current plan ('trial', 'pro', 'team', 'enterprise') |
| `stripe_customer_id` | TEXT | Stripe customer reference |
| `is_active` | BOOLEAN | Account active |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Settings JSONB Structure:**
```json
{
  "allowed_tiers": ["basic", "standard"],
  "default_tier": "standard",
  "require_mfa": false,
  "data_retention_days": 365,
  "memory_sharing_policy": "approval_required",
  "sensitive_patterns": ["SSN", "password", "api_key"]
}
```

### 5.2 Groups

Teams or departments within an organization.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `name` | TEXT | Group name |
| `description` | TEXT | Group description |
| `litellm_team_id` | TEXT | Synced LiteLLM team ID |
| `allowed_tiers` | TEXT[] | Tier access (can be more restrictive than org) |
| `monthly_budget` | DECIMAL | Group spending limit |
| `settings` | JSONB | Group-specific settings |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Constraints:**
- `UNIQUE(organization_id, name)` - Group names unique within org

### 5.3 Users

Individual user accounts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | TEXT | Email address (unique) |
| `name` | TEXT | Display name |
| `avatar_url` | TEXT | Profile image URL |
| `auth0_id` | TEXT | Auth0 user identifier (unique) |
| `platform_role` | TEXT | Platform-wide role ('super_admin', 'user') |
| `is_active` | BOOLEAN | Account active |
| `last_login_at` | TIMESTAMPTZ | Last login timestamp |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Notes:**
- Users exist independently of organizations
- Organization membership is via `org_memberships`
- `platform_role = 'super_admin'` grants global admin access

### 5.4 User Profiles

Templates for user types with default configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Profile name ('Internal Employee', 'External Contractor') |
| `description` | TEXT | Profile description |
| `default_tiers` | TEXT[] | Default tier access for this profile |
| `default_guardrails` | JSONB | Default guardrail configurations |
| `available_to` | TEXT | Who can use ('all', 'internal', 'enterprise') |
| `created_at` | TIMESTAMPTZ | Record creation |

**Use Cases:**
- "Internal Employee" - Full standard access
- "External Contractor" - Basic tier, additional content guardrails
- "Executive" - Premium access, reduced guardrails
- "Intern" - Basic only, budget limits

### 5.5 Org Memberships

Links users to organizations with role and configuration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `user_id` | UUID | FK to users |
| `role` | TEXT | Role in org ('owner', 'admin', 'member') |
| `profile_id` | UUID | FK to user_profiles (optional) |
| `allowed_tiers` | TEXT[] | Tier access override (null = use profile/org default) |
| `monthly_budget` | DECIMAL | Personal spending limit |
| `virtual_key` | TEXT | LiteLLM virtual key for this user |
| `virtual_key_id` | TEXT | LiteLLM key ID reference |
| `joined_at` | TIMESTAMPTZ | When user joined org |

**Constraints:**
- `UNIQUE(organization_id, user_id)` - User can only be in org once

**Role Permissions:**

| Role | Capabilities |
|------|--------------|
| `owner` | Full control, billing, can delete org |
| `admin` | Manage users, groups, settings (not billing) |
| `member` | Use platform, manage own spaces |

### 5.6 Group Memberships

Links users to groups within their organization.

| Column | Type | Description |
|--------|------|-------------|
| `group_id` | UUID | FK to groups |
| `user_id` | UUID | FK to users |
| `role` | TEXT | Role in group ('lead', 'member') |
| `joined_at` | TIMESTAMPTZ | When user joined group |

**Constraints:**
- `PRIMARY KEY(group_id, user_id)`
- User must be member of group's organization (enforced in application)

---

## 6. Workspace Entities

### 6.1 Spaces

Containers for related work context. Two types: organizational and personal.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `name` | TEXT | Space name |
| `slug` | TEXT | URL-safe identifier |
| `description` | TEXT | Space description |
| `icon` | TEXT | Icon identifier |
| `color` | TEXT | Brand color |
| `space_type` | TEXT | 'organizational' or 'personal' |
| `is_org_wide` | BOOLEAN | If true + organizational, all org members have access |
| `created_by` | UUID | FK to users who created |
| `context` | TEXT | Space-level context/instructions for AI |
| `settings` | JSONB | Space-specific settings |
| `is_archived` | BOOLEAN | Soft delete |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Constraints:**
- `UNIQUE(organization_id, slug)`

**Space Types:**

| Type | Access Model | Context Propagation |
|------|--------------|---------------------|
| `organizational` | Via `space_group_access` or `is_org_wide` | Can propagate to group/org |
| `personal` | Creator only + explicit area invites | Stays personal |

### 6.2 Space Group Access

Grants group-based access to organizational spaces.

| Column | Type | Description |
|--------|------|-------------|
| `space_id` | UUID | FK to spaces |
| `group_id` | UUID | FK to groups |
| `access_level` | TEXT | 'admin', 'member', 'viewer' |
| `created_at` | TIMESTAMPTZ | When access granted |

**Constraints:**
- `PRIMARY KEY(space_id, group_id)`
- Only applies to `space_type = 'organizational'`

**Access Levels:**

| Level | Capabilities |
|-------|--------------|
| `admin` | Manage space settings, create areas |
| `member` | Create areas, full participation |
| `viewer` | Read-only access |

### 6.3 Space Memberships

Explicit user-level access and ownership for spaces. Complements group-based access with individual grants and clear ownership.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `space_id` | UUID | FK to spaces |
| `user_id` | UUID | FK to users |
| `role` | TEXT | 'owner', 'admin', 'member', 'viewer' |
| `granted_by` | UUID | FK to users who granted access |
| `created_at` | TIMESTAMPTZ | When membership created |

**Constraints:**
- `UNIQUE(space_id, user_id)` - User can only have one membership per space

**Role Permissions:**

| Role | Capabilities |
|------|--------------|
| `owner` | Full control, transfer ownership, delete space, approve memory proposals |
| `admin` | Manage space settings, invite members, create areas |
| `member` | Create areas, full participation |
| `viewer` | Read-only access |

**Key Behaviors:**
- Every space MUST have at least one owner (enforced in application)
- For personal spaces: creator automatically becomes owner
- For organizational spaces: org admins can assign owners
- Ownership can be transferred between users
- Space owners are the approvers for memory sharing proposals (per Context Strategy)

**Relationship with Space Group Access:**

| Access Type | Use Case |
|-------------|----------|
| `space_group_access` | Grant access to entire groups (bulk access for org spaces) |
| `space_memberships` | Individual grants, explicit ownership, cross-group collaboration |

When both exist for a user, the **highest role wins**:
```
Final role = MAX(space_memberships.role, space_group_access.access_level)
```

### 6.4 Areas

Sub-contexts within spaces. The primary unit for collaboration.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `space_id` | UUID | FK to spaces |
| `name` | TEXT | Area name |
| `slug` | TEXT | URL-safe identifier |
| `color` | TEXT | Area color |
| `context_notes` | TEXT | Area-specific context for AI |
| `is_restricted` | BOOLEAN | If true, requires explicit membership |
| `locked_model` | TEXT | If set, all conversations use this model |
| `settings` | JSONB | Area-specific settings |
| `created_by` | UUID | FK to users who created |
| `is_archived` | BOOLEAN | Soft delete |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Constraints:**
- `UNIQUE(space_id, slug)`

**Access Rules:**
- If `is_restricted = false`: Anyone with Space access has Area access
- If `is_restricted = true`: Only explicit `area_memberships` grants access
- Creator always has owner-level access

### 6.5 Area Memberships

Explicit access grants for areas. Supports both individual and group invites.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `area_id` | UUID | FK to areas |
| `user_id` | UUID | FK to users (null if group invite) |
| `group_id` | UUID | FK to groups (null if user invite) |
| `role` | TEXT | 'owner', 'admin', 'member', 'viewer' |
| `invited_by` | UUID | FK to users who invited |
| `created_at` | TIMESTAMPTZ | When membership created |

**Constraints:**
- `CHECK((user_id IS NOT NULL AND group_id IS NULL) OR (user_id IS NULL AND group_id IS NOT NULL))`
- `UNIQUE(area_id, user_id)` where user_id is not null
- `UNIQUE(area_id, group_id)` where group_id is not null

**Role Permissions:**

| Role | Capabilities |
|------|--------------|
| `owner` | Full control, can delete area |
| `admin` | Manage area settings, invite members |
| `member` | Full participation, create tasks |
| `viewer` | Read-only access |

### 6.6 Tasks

Work items within areas for task-focused workflows.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `space_id` | UUID | FK to spaces |
| `area_id` | UUID | FK to areas |
| `parent_task_id` | UUID | FK to tasks (for subtasks) |
| `title` | TEXT | Task title |
| `description` | TEXT | Task description |
| `status` | TEXT | 'backlog', 'planning', 'in_progress', 'completed', 'archived' |
| `priority` | TEXT | 'low', 'medium', 'high', 'urgent' |
| `estimated_effort` | TEXT | Effort estimate |
| `created_by` | UUID | FK to users |
| `assigned_to` | UUID | FK to users (optional) |
| `due_date` | DATE | Due date (optional) |
| `completed_at` | TIMESTAMPTZ | Completion timestamp |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Constraints:**
- `UNIQUE(area_id, title)` - Task titles unique within area

---

## 7. Context Entities

These entities support the memory and context system. See `CONTEXT_STRATEGY.md` for full architecture.

### 7.1 Conversations

Chat sessions that belong to a user and optionally a workspace context.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `user_id` | UUID | FK to users (conversation owner) |
| `space_id` | UUID | FK to spaces (optional) |
| `area_id` | UUID | FK to areas (optional) |
| `task_id` | UUID | FK to tasks (optional) |
| `title` | TEXT | Conversation title (auto-generated or manual) |
| `model` | TEXT | Model used for this conversation |
| `pinned` | BOOLEAN | User pinned this conversation |
| `archived` | BOOLEAN | Soft archive |
| `continued_from_id` | UUID | FK to conversations (for continuations) |
| `continuation_summary` | TEXT | Summary of continued conversation |
| `message_count` | INTEGER | Cached count for performance |
| `last_message_at` | TIMESTAMPTZ | Timestamp of last message |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Context Hierarchy:**
- Main chat: `space_id`, `area_id`, `task_id` all null
- Space chat: `space_id` set, others null
- Area chat: `space_id` and `area_id` set
- Task chat: All three set

### 7.2 Messages

Individual messages within conversations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `conversation_id` | UUID | FK to conversations |
| `role` | TEXT | 'user', 'assistant', 'system' |
| `content` | TEXT | Message content |
| `thinking` | TEXT | Extended thinking content (if enabled) |
| `attachments` | JSONB | File attachments metadata |
| `sources` | JSONB | Web search sources |
| `tool_calls` | JSONB | Tool/function calls made |
| `error` | TEXT | Error message if failed |
| `input_tokens` | INTEGER | Tokens in prompt |
| `output_tokens` | INTEGER | Tokens in response |
| `model` | TEXT | Model used (may differ from conversation default) |
| `embedding` | vector(1536) | Semantic embedding for search |
| `sequence_num` | INTEGER | Order within conversation |
| `created_at` | TIMESTAMPTZ | Message timestamp |

**Constraints:**
- `UNIQUE(conversation_id, sequence_num)`

### 7.3 Memories

Extracted and curated context that persists across conversations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `user_id` | UUID | FK to users (who owns this memory) |
| `group_id` | UUID | FK to groups (if group-scoped) |
| `space_id` | UUID | FK to spaces (if space-scoped) |
| `area_id` | UUID | FK to areas (if area-scoped) |
| `task_id` | UUID | FK to tasks (if task-scoped) |
| `content` | TEXT | Memory content |
| `memory_type` | TEXT | Type classification |
| `visibility` | TEXT | Sharing scope |
| `importance` | FLOAT | 0.0-1.0 importance score |
| `access_count` | INTEGER | Times retrieved for context |
| `last_accessed_at` | TIMESTAMPTZ | Last retrieval |
| `valid_from` | TIMESTAMPTZ | When this became true |
| `valid_to` | TIMESTAMPTZ | When this stopped being true (null = current) |
| `source_conversation_id` | UUID | FK to conversations |
| `source_message_id` | UUID | FK to messages |
| `contributed_by_user_id` | UUID | Who created/shared this |
| `extraction_model` | TEXT | Model used for extraction |
| `confidence` | FLOAT | Extraction confidence |
| `approval_status` | TEXT | 'pending', 'approved', 'rejected' |
| `approved_by_user_id` | UUID | Who approved |
| `approved_at` | TIMESTAMPTZ | Approval timestamp |
| `embedding` | vector(1536) | Semantic embedding |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Memory Types:**
- `fact` - Domain knowledge
- `preference` - User/team preference
- `instruction` - Behavioral rule
- `summary` - Consolidated context
- `entity` - Named entity
- `relationship` - Entity relationship
- `guideline` - Policy/guideline

**Visibility Levels:**
- `private` - Only creator
- `area` - Area collaborators
- `space` - Space members
- `group` - Group members
- `organization` - Entire org

### 7.4 Memory Proposals

Workflow for sharing memories to broader scope.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `memory_id` | UUID | FK to memories |
| `proposed_visibility` | TEXT | Target visibility level |
| `proposed_scope_id` | UUID | Target scope (space/group/org ID) |
| `proposed_by_user_id` | UUID | Who proposed |
| `proposed_at` | TIMESTAMPTZ | Proposal timestamp |
| `status` | TEXT | 'pending', 'approved', 'rejected', 'withdrawn' |
| `reviewed_by_user_id` | UUID | Who reviewed |
| `reviewed_at` | TIMESTAMPTZ | Review timestamp |
| `review_notes` | TEXT | Reviewer comments |
| `supporting_conversations` | JSONB | Evidence references |
| `confidence_score` | FLOAT | Auto-calculated confidence |

### 7.5 Documents

Uploaded files with content extraction.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `space_id` | UUID | FK to spaces |
| `name` | TEXT | Document name |
| `content_type` | TEXT | MIME type |
| `size_bytes` | INTEGER | File size |
| `storage_path` | TEXT | File storage location |
| `content` | TEXT | Extracted text content |
| `chunks` | JSONB | Chunked content with embeddings |
| `uploaded_by` | UUID | FK to users |
| `created_at` | TIMESTAMPTZ | Upload timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification |

**Chunks JSONB Structure:**
```json
[
  {
    "index": 0,
    "content": "chunk text...",
    "embedding": [0.1, 0.2, ...],
    "token_count": 512
  }
]
```

---

## 8. Operational Entities

### 8.1 Usage Records

Tracks all LLM usage for billing and analytics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `group_id` | UUID | FK to groups (for attribution) |
| `user_id` | UUID | FK to users |
| `space_id` | UUID | FK to spaces (for project attribution) |
| `area_id` | UUID | FK to areas |
| `tier_id` | UUID | FK to model_tiers |
| `model` | TEXT | Actual model used |
| `input_tokens` | INTEGER | Input token count |
| `output_tokens` | INTEGER | Output token count |
| `provider_cost` | DECIMAL | Our cost from provider |
| `billed_amount` | DECIMAL | Amount charged to customer |
| `litellm_request_id` | TEXT | LiteLLM request reference |
| `conversation_id` | UUID | FK to conversations |
| `endpoint` | TEXT | 'chat', 'arena', 'task_planning', 'embedding' |
| `created_at` | TIMESTAMPTZ | Request timestamp |

**Notes:**
- `space_id` included for V2 project-based cost attribution
- Partitioning by month recommended for high-volume deployments

### 8.2 Budgets

Spending limits at various scopes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `scope_type` | TEXT | 'organization', 'group', 'user', 'space' |
| `scope_id` | UUID | ID of scoped entity |
| `limit_amount` | DECIMAL | Budget limit |
| `limit_period` | TEXT | 'daily', 'weekly', 'monthly' |
| `current_usage` | DECIMAL | Usage in current period |
| `period_start` | TIMESTAMPTZ | Current period start |
| `period_end` | TIMESTAMPTZ | Current period end |
| `alert_threshold` | DECIMAL | Alert at this percentage (e.g., 0.80) |
| `alert_sent` | BOOLEAN | Alert already sent this period |
| `hard_limit` | BOOLEAN | Block requests when exceeded (vs warn) |
| `created_at` | TIMESTAMPTZ | Record creation |
| `updated_at` | TIMESTAMPTZ | Last modification |

### 8.3 Invoices

Billing records for organizations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `period_start` | DATE | Billing period start |
| `period_end` | DATE | Billing period end |
| `subtotal` | DECIMAL | Pre-tax amount |
| `tax` | DECIMAL | Tax amount |
| `total` | DECIMAL | Total amount |
| `line_items` | JSONB | Itemized charges |
| `status` | TEXT | 'draft', 'sent', 'paid', 'overdue', 'cancelled' |
| `stripe_invoice_id` | TEXT | Stripe reference |
| `stripe_payment_intent_id` | TEXT | Stripe payment reference |
| `paid_at` | TIMESTAMPTZ | Payment timestamp |
| `created_at` | TIMESTAMPTZ | Record creation |

### 8.4 Invitations

Pending invitations to join organizations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `email` | TEXT | Invitee email |
| `role` | TEXT | Role to assign on accept |
| `group_ids` | UUID[] | Groups to add on accept |
| `profile_id` | UUID | Profile to assign |
| `token` | TEXT | Unique invitation token |
| `status` | TEXT | 'pending', 'accepted', 'expired', 'revoked' |
| `expires_at` | TIMESTAMPTZ | Expiration timestamp |
| `invited_by` | UUID | FK to users |
| `accepted_at` | TIMESTAMPTZ | Acceptance timestamp |
| `accepted_by` | UUID | FK to users (the new user) |
| `created_at` | TIMESTAMPTZ | Record creation |

### 8.5 Audit Log

Comprehensive audit trail for compliance.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | FK to organizations |
| `entity_type` | TEXT | What was affected |
| `entity_id` | UUID | ID of affected entity |
| `action` | TEXT | What happened |
| `actor_user_id` | UUID | Who did it |
| `actor_type` | TEXT | 'user', 'system', 'api' |
| `previous_value` | JSONB | State before change |
| `new_value` | JSONB | State after change |
| `metadata` | JSONB | Additional context (IP, user agent, etc.) |
| `created_at` | TIMESTAMPTZ | Event timestamp |

**Entity Types:**
`organization`, `group`, `user`, `space`, `area`, `task`, `conversation`, `memory`, `memory_proposal`, `document`, `budget`, `guardrail`, `invitation`

**Actions:**
`created`, `updated`, `deleted`, `accessed`, `shared`, `unshared`, `proposed`, `approved`, `rejected`, `exported`, `imported`, `invited`, `joined`, `left`, `login`, `logout`

**Context Strategy Actions (for memory workflow):**

| Action | Use Case |
|--------|----------|
| `shared` | Memory visibility upgraded (private → area/space/group/org) |
| `unshared` | Memory visibility downgraded or retracted |
| `proposed` | Memory sharing proposal created |
| `approved` | Memory proposal approved by owner |
| `rejected` | Memory proposal rejected by owner |
| `exported` | Data exported for compliance/backup |
| `imported` | Data imported from external source |

---

## 9. Access Resolution Algorithms

### 9.1 Space Access

```
ALGORITHM: CanAccessSpace(user_id, space_id)

INPUT:
  - user_id: UUID
  - space_id: UUID

PROCESS:
  1. Fetch space record

  2. CHECK EXPLICIT MEMBERSHIP (space_memberships):
     membership = SELECT FROM space_memberships
                  WHERE space_id = space_id AND user_id = user_id

     IF membership exists:
       RETURN: ACCESS_GRANTED (level: membership.role, source: 'membership')

  3. IF space.space_type = 'organizational':
       a. CHECK GROUP ACCESS (space_group_access):
            - Fetch user's groups in this organization
            - Check if any group has entry in space_group_access
            - IF found:
                group_level = MAX(access_level) from matching groups
                RETURN: ACCESS_GRANTED (level: group_level, source: 'group')

       b. CHECK ORG-WIDE ACCESS:
            IF space.is_org_wide = true:
              - Check user is member of space.organization_id
              - RETURN: ACCESS_GRANTED (level: 'member', source: 'org_wide')

       c. RETURN: ACCESS_DENIED

  4. IF space.space_type = 'personal':
       // Personal spaces: only explicit membership grants access
       // (Creator should have ownership in space_memberships)
       RETURN: ACCESS_DENIED (check area-level access)

OUTPUT:
  - access: boolean
  - level: 'owner' | 'admin' | 'member' | 'viewer' | null
  - source: 'membership' | 'group' | 'org_wide' | null
```

**Role Priority:**
When a user has access from multiple sources (e.g., both membership and group), the highest role wins:
```
owner > admin > member > viewer
```

### 9.2 Area Access

```
ALGORITHM: CanAccessArea(user_id, area_id)

INPUT:
  - user_id: UUID
  - area_id: UUID

PROCESS:
  1. Fetch area record with space

  2. Check Space access first:
     space_access = CanAccessSpace(user_id, area.space_id)

     IF space_access.granted AND area.is_restricted = false:
       RETURN: ACCESS_GRANTED (level: inherited from space)

  3. Check explicit area membership (user):
     membership = SELECT FROM area_memberships
                  WHERE area_id = area_id AND user_id = user_id

     IF membership exists:
       RETURN: ACCESS_GRANTED (level: membership.role)

  4. Check explicit area membership (via group):
     user_groups = user's group_ids in this organization

     group_membership = SELECT FROM area_memberships
                        WHERE area_id = area_id
                        AND group_id IN user_groups

     IF group_membership exists:
       RETURN: ACCESS_GRANTED (level: group_membership.role)

  5. RETURN: ACCESS_DENIED

OUTPUT:
  - access: boolean
  - level: 'owner' | 'admin' | 'member' | 'viewer' | null
  - source: 'space_inherited' | 'user_membership' | 'group_membership' | null
```

### 9.3 Model Access

```
ALGORITHM: CanUseModel(user_id, model_id)

INPUT:
  - user_id: UUID
  - model_id: TEXT (e.g., 'claude-opus-4-5-20251101')

PROCESS:
  1. AVAILABILITY CHECK:
     model = SELECT FROM models WHERE model_id = model_id

     IF model.is_enabled = false:
       RETURN: DENIED (reason: 'model_disabled')

  2. SUBSCRIPTION CHECK:
     user_tiers = GetUserAllowedTiers(user_id)  // See 9.4

     IF model.tier_id NOT IN user_tiers:
       RETURN: DENIED (reason: 'tier_not_subscribed')

  3. GUARDRAILS CHECK:
     guardrails = GetApplicableGuardrails(user_id)  // See Section 10

     FOR each guardrail WHERE type = 'model_denylist':
       IF model_id IN guardrail.config.models:
         RETURN: DENIED (reason: 'guardrail_blocked', guardrail: guardrail.name)

     FOR each guardrail WHERE type = 'model_allowlist':
       IF model_id NOT IN guardrail.config.models:
         RETURN: DENIED (reason: 'guardrail_not_allowed', guardrail: guardrail.name)

  4. APPROVAL CHECK (if applicable):
     IF model.requires_approval:
       // Check approval status (future feature)
       // For now, requires_approval models need admin grant
       RETURN: DENIED (reason: 'approval_required')

  5. RETURN: ALLOWED

OUTPUT:
  - allowed: boolean
  - reason: string (if denied)
  - guardrail: string (if guardrail caused denial)
```

### 9.4 User Allowed Tiers

```
ALGORITHM: GetUserAllowedTiers(user_id)

INPUT:
  - user_id: UUID

PROCESS:
  1. Get user's org membership:
     membership = SELECT FROM org_memberships WHERE user_id = user_id

  2. Determine tier access (in priority order):

     a. IF membership.allowed_tiers IS NOT NULL:
          // Explicit override on membership
          user_tiers = membership.allowed_tiers

     b. ELSE IF membership.profile_id IS NOT NULL:
          // Use profile defaults
          profile = SELECT FROM user_profiles WHERE id = membership.profile_id
          user_tiers = profile.default_tiers

     c. ELSE:
          // Fall back to org default
          org = SELECT FROM organizations WHERE id = membership.organization_id
          user_tiers = org.settings->>'allowed_tiers'

  3. Intersect with org's allowed tiers:
     org_tiers = org.settings->>'allowed_tiers'
     final_tiers = INTERSECTION(user_tiers, org_tiers)

  4. Get tier IDs:
     tier_ids = SELECT id FROM model_tiers WHERE slug = ANY(final_tiers)

OUTPUT:
  - tier_ids: UUID[]
```

---

## 10. Guardrails Resolution

### 10.1 Collecting Applicable Guardrails

```
ALGORITHM: GetApplicableGuardrails(user_id)

INPUT:
  - user_id: UUID

PROCESS:
  1. Get user context:
     org_membership = user's org membership
     group_ids = user's group IDs in that org

  2. Collect guardrails at all levels:

     guardrails = SELECT * FROM guardrails
                  WHERE is_active = true
                  AND (
                    (level = 'global' AND scope_id IS NULL)
                    OR (level = 'organization' AND scope_id = org_membership.organization_id)
                    OR (level = 'group' AND scope_id IN group_ids)
                    OR (level = 'user' AND scope_id = user_id)
                  )
                  ORDER BY priority DESC, level ASC

OUTPUT:
  - guardrails: Guardrail[]
```

### 10.2 Resolving Guardrails by Type

For each guardrail type, the resolution rule differs:

| Type | Resolution Rule |
|------|-----------------|
| `model_allowlist` | INTERSECTION of all lists (most restrictive) |
| `model_denylist` | UNION of all lists (if any blocks, blocked) |
| `tier_allowlist` | INTERSECTION of all lists |
| `token_limit` | MINIMUM of all limits |
| `rate_limit` | MINIMUM of all limits |
| `budget_limit` | MINIMUM of all limits |
| `content_filter` | UNION of all patterns |

### 10.3 Full Guardrails Resolution

```
ALGORITHM: ResolveGuardrails(user_id)

INPUT:
  - user_id: UUID

PROCESS:
  1. guardrails = GetApplicableGuardrails(user_id)

  2. Group by type:
     grouped = GROUP guardrails BY type

  3. Resolve each type:

     resolved = {}

     FOR 'model_allowlist':
       IF any guardrails of this type:
         resolved.allowed_models = INTERSECTION of all config.models
       ELSE:
         resolved.allowed_models = ALL_MODELS

     FOR 'model_denylist':
       resolved.denied_models = UNION of all config.models

     FOR 'token_limit':
       resolved.max_input_tokens = MIN of all config.max_input
       resolved.max_output_tokens = MIN of all config.max_output

     FOR 'rate_limit':
       // Group by period, take min for each
       resolved.rate_limits = [
         { period: 'minute', max: MIN(...) },
         { period: 'hour', max: MIN(...) },
         { period: 'day', max: MIN(...) }
       ]

     FOR 'budget_limit':
       resolved.budget_limits = [
         { period: 'daily', max: MIN(...) },
         { period: 'monthly', max: MIN(...) }
       ]

     FOR 'content_filter':
       resolved.blocked_patterns = UNION of all config.blocked_patterns

OUTPUT:
  - resolved: ResolvedGuardrails
```

### 10.4 Request Validation

```
ALGORITHM: ValidateRequest(user_id, request)

INPUT:
  - user_id: UUID
  - request: { model, input_tokens, content }

PROCESS:
  1. resolved = ResolveGuardrails(user_id)

  2. Check model access:
     IF request.model IN resolved.denied_models:
       RETURN: BLOCKED (reason: 'model_denied')

     IF resolved.allowed_models != ALL_MODELS:
       IF request.model NOT IN resolved.allowed_models:
         RETURN: BLOCKED (reason: 'model_not_allowed')

  3. Check token limits:
     IF request.input_tokens > resolved.max_input_tokens:
       RETURN: BLOCKED (reason: 'input_tokens_exceeded')

  4. Check rate limits:
     current_usage = GetCurrentUsage(user_id, period)
     FOR each rate_limit in resolved.rate_limits:
       IF current_usage[rate_limit.period] >= rate_limit.max:
         RETURN: BLOCKED (reason: 'rate_limit_exceeded')

  5. Check budget:
     FOR each budget_limit in resolved.budget_limits:
       IF current_spend[budget_limit.period] >= budget_limit.max:
         RETURN: BLOCKED (reason: 'budget_exceeded')

  6. Check content:
     FOR each pattern in resolved.blocked_patterns:
       IF request.content MATCHES pattern:
         RETURN: BLOCKED (reason: 'content_blocked')

  7. RETURN: ALLOWED

OUTPUT:
  - allowed: boolean
  - reason: string (if blocked)
```

---

## 11. Complete Schema

### 11.1 Extensions

```sql
-- Required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### 11.2 Platform Tables

```sql
-- ============================================================
-- MODEL TIERS (Subscription bundles)
-- ============================================================

CREATE TABLE model_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    best_use_case TEXT,
    base_price DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default tiers
INSERT INTO model_tiers (name, slug, description, best_use_case, sort_order) VALUES
    ('Basic', 'basic', 'High-volume, cost-effective AI for simple tasks',
     'Classification, summarization, simple Q&A', 1),
    ('Standard', 'standard', 'Balanced performance for everyday productivity',
     'Writing, analysis, coding assistance', 2),
    ('Premium', 'premium', 'Maximum capability for complex work',
     'Strategic analysis, complex reasoning', 3);

-- ============================================================
-- MODELS (Individual LLMs)
-- ============================================================

CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    tier_id UUID REFERENCES model_tiers(id),
    is_enabled BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    description TEXT,
    best_use_case TEXT,
    capabilities JSONB DEFAULT '{}',
    context_window INTEGER,
    input_cost_per_million DECIMAL(10,4),
    output_cost_per_million DECIMAL(10,4),
    markup_percentage DECIMAL(5,2) DEFAULT 25.00,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GUARDRAILS (Governance rules)
-- ============================================================

CREATE TABLE guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'model_allowlist', 'model_denylist', 'tier_allowlist',
        'token_limit', 'rate_limit', 'budget_limit', 'content_filter'
    )),
    config JSONB NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('global', 'organization', 'group', 'user')),
    scope_id UUID,
    action TEXT DEFAULT 'block' CHECK (action IN ('block', 'warn', 'log')),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_scope CHECK (
        (level = 'global' AND scope_id IS NULL) OR
        (level != 'global' AND scope_id IS NOT NULL)
    )
);
```

### 11.3 Organization Tables

```sql
-- ============================================================
-- ORGANIZATIONS (Tenants)
-- ============================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    litellm_org_id TEXT UNIQUE,
    settings JSONB DEFAULT '{
        "allowed_tiers": ["basic", "standard"],
        "default_tier": "standard",
        "require_mfa": false,
        "data_retention_days": 365,
        "memory_sharing_policy": "approval_required"
    }',
    billing_email TEXT,
    billing_plan TEXT DEFAULT 'trial' CHECK (
        billing_plan IN ('trial', 'pro', 'team', 'enterprise')
    ),
    stripe_customer_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GROUPS (Teams/Departments)
-- ============================================================

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    litellm_team_id TEXT,
    allowed_tiers TEXT[],
    monthly_budget DECIMAL(10,2),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    auth0_id TEXT UNIQUE,
    platform_role TEXT DEFAULT 'user' CHECK (platform_role IN ('super_admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES (Templates)
-- ============================================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    default_tiers TEXT[] DEFAULT ARRAY['basic'],
    default_guardrails JSONB DEFAULT '[]',
    available_to TEXT DEFAULT 'all' CHECK (available_to IN ('all', 'internal', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default profiles
INSERT INTO user_profiles (name, description, default_tiers, available_to) VALUES
    ('Internal Employee', 'Full access for internal team members',
     ARRAY['basic', 'standard'], 'all'),
    ('External Contractor', 'Limited access for external collaborators',
     ARRAY['basic'], 'all'),
    ('Executive', 'Premium access for leadership',
     ARRAY['basic', 'standard', 'premium'], 'enterprise');

-- ============================================================
-- ORG MEMBERSHIPS (User-Org relationship)
-- ============================================================

CREATE TABLE org_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    profile_id UUID REFERENCES user_profiles(id),
    allowed_tiers TEXT[],
    monthly_budget DECIMAL(10,2),
    virtual_key TEXT,
    virtual_key_id TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, user_id)
);

-- ============================================================
-- GROUP MEMBERSHIPS (User-Group relationship)
-- ============================================================

CREATE TABLE group_memberships (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (group_id, user_id)
);
```

### 11.4 Workspace Tables

```sql
-- ============================================================
-- SPACES
-- ============================================================

CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    space_type TEXT DEFAULT 'personal' CHECK (space_type IN ('organizational', 'personal')),
    is_org_wide BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    context TEXT,
    settings JSONB DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, slug)
);

-- ============================================================
-- SPACE GROUP ACCESS
-- ============================================================

CREATE TABLE space_group_access (
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    access_level TEXT DEFAULT 'member' CHECK (access_level IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (space_id, group_id)
);

-- ============================================================
-- SPACE MEMBERSHIPS
-- ============================================================

CREATE TABLE space_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    granted_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(space_id, user_id)
);

-- ============================================================
-- AREAS
-- ============================================================

CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    color TEXT,
    context_notes TEXT,
    is_restricted BOOLEAN DEFAULT false,
    locked_model TEXT,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(space_id, slug)
);

-- ============================================================
-- AREA MEMBERSHIPS
-- ============================================================

CREATE TABLE area_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    invited_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT single_membership_type CHECK (
        (user_id IS NOT NULL AND group_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Unique constraints with partial indexes for nullable columns
CREATE UNIQUE INDEX idx_area_memberships_user_unique
    ON area_memberships(area_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_area_memberships_group_unique
    ON area_memberships(area_id, group_id) WHERE group_id IS NOT NULL;

-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'backlog' CHECK (
        status IN ('backlog', 'planning', 'in_progress', 'completed', 'archived')
    ),
    priority TEXT DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high', 'urgent')
    ),
    estimated_effort TEXT,
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.5 Context Tables

```sql
-- ============================================================
-- CONVERSATIONS
-- ============================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    title TEXT,
    model TEXT NOT NULL,
    pinned BOOLEAN DEFAULT false,
    archived BOOLEAN DEFAULT false,
    continued_from_id UUID REFERENCES conversations(id),
    continuation_summary TEXT,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    thinking TEXT,
    attachments JSONB,
    sources JSONB,
    tool_calls JSONB,
    error TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    model TEXT,
    embedding vector(1536),
    sequence_num INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(conversation_id, sequence_num)
);

-- ============================================================
-- MEMORIES
-- ============================================================

CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN (
        'fact', 'preference', 'instruction', 'summary',
        'entity', 'relationship', 'guideline'
    )),
    visibility TEXT DEFAULT 'private' CHECK (visibility IN (
        'private', 'area', 'space', 'group', 'organization'
    )),
    importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    contributed_by_user_id UUID NOT NULL REFERENCES users(id),
    extraction_model TEXT,
    confidence FLOAT DEFAULT 0.8,
    approval_status TEXT DEFAULT 'approved' CHECK (
        approval_status IN ('pending', 'approved', 'rejected')
    ),
    approved_by_user_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEMORY PROPOSALS
-- ============================================================

CREATE TABLE memory_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    proposed_visibility TEXT NOT NULL,
    proposed_scope_id UUID,
    proposed_by_user_id UUID NOT NULL REFERENCES users(id),
    proposed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'withdrawn')
    ),
    reviewed_by_user_id UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    supporting_conversations JSONB,
    confidence_score FLOAT
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content_type TEXT,
    size_bytes INTEGER,
    storage_path TEXT,
    content TEXT,
    chunks JSONB,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.6 Operational Tables

```sql
-- ============================================================
-- USAGE RECORDS
-- ============================================================

CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    group_id UUID REFERENCES groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    space_id UUID REFERENCES spaces(id),
    area_id UUID REFERENCES areas(id),
    tier_id UUID REFERENCES model_tiers(id),
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    provider_cost DECIMAL(10,6) NOT NULL,
    billed_amount DECIMAL(10,6) NOT NULL,
    litellm_request_id TEXT,
    conversation_id UUID REFERENCES conversations(id),
    endpoint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BUDGETS
-- ============================================================

CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (
        scope_type IN ('organization', 'group', 'user', 'space')
    ),
    scope_id UUID NOT NULL,
    limit_amount DECIMAL(10,2) NOT NULL,
    limit_period TEXT DEFAULT 'monthly' CHECK (
        limit_period IN ('daily', 'weekly', 'monthly')
    ),
    current_usage DECIMAL(10,2) DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    alert_threshold DECIMAL(3,2) DEFAULT 0.80,
    alert_sent BOOLEAN DEFAULT false,
    hard_limit BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    line_items JSONB NOT NULL DEFAULT '[]',
    status TEXT DEFAULT 'draft' CHECK (
        status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')
    ),
    stripe_invoice_id TEXT,
    stripe_payment_intent_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVITATIONS
-- ============================================================

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    group_ids UUID[] DEFAULT ARRAY[]::UUID[],
    profile_id UUID REFERENCES user_profiles(id),
    token TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'expired', 'revoked')
    ),
    expires_at TIMESTAMPTZ NOT NULL,
    invited_by UUID REFERENCES users(id),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type TEXT DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'api')),
    previous_value JSONB,
    new_value JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 12. Index Strategy

### 12.1 Primary Key and Foreign Key Indexes

PostgreSQL automatically creates indexes for primary keys. Foreign key indexes must be explicit.

```sql
-- ============================================================
-- ORGANIZATION LEVEL INDEXES
-- ============================================================

-- Groups
CREATE INDEX idx_groups_org ON groups(organization_id);

-- Users (auth lookup)
CREATE INDEX idx_users_auth0 ON users(auth0_id) WHERE auth0_id IS NOT NULL;
CREATE INDEX idx_users_email ON users(email);

-- Org Memberships
CREATE INDEX idx_org_memberships_org ON org_memberships(organization_id);
CREATE INDEX idx_org_memberships_user ON org_memberships(user_id);

-- Group Memberships
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);

-- ============================================================
-- WORKSPACE LEVEL INDEXES
-- ============================================================

-- Spaces
CREATE INDEX idx_spaces_org ON spaces(organization_id);
CREATE INDEX idx_spaces_type ON spaces(organization_id, space_type);
CREATE INDEX idx_spaces_created_by ON spaces(created_by) WHERE space_type = 'personal';

-- Space Group Access
CREATE INDEX idx_space_group_access_group ON space_group_access(group_id);

-- Space Memberships
CREATE INDEX idx_space_memberships_space ON space_memberships(space_id);
CREATE INDEX idx_space_memberships_user ON space_memberships(user_id);
CREATE INDEX idx_space_memberships_owner ON space_memberships(space_id) WHERE role = 'owner';

-- Areas
CREATE INDEX idx_areas_space ON areas(space_id);

-- Area Memberships
CREATE INDEX idx_area_memberships_area ON area_memberships(area_id);
CREATE INDEX idx_area_memberships_user ON area_memberships(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_area_memberships_group ON area_memberships(group_id) WHERE group_id IS NOT NULL;

-- Tasks
CREATE INDEX idx_tasks_org ON tasks(organization_id);
CREATE INDEX idx_tasks_space ON tasks(space_id);
CREATE INDEX idx_tasks_area ON tasks(area_id);
CREATE INDEX idx_tasks_status ON tasks(area_id, status) WHERE status NOT IN ('completed', 'archived');
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- ============================================================
-- CONTEXT LEVEL INDEXES
-- ============================================================

-- Conversations
CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_conversations_space ON conversations(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX idx_conversations_area ON conversations(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX idx_conversations_task ON conversations(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_conversations_recent ON conversations(user_id, last_message_at DESC NULLS LAST);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, sequence_num);
CREATE INDEX idx_messages_created ON messages(conversation_id, created_at);

-- Message Embeddings (vector similarity search)
CREATE INDEX idx_messages_embedding ON messages
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Memories
CREATE INDEX idx_memories_org ON memories(organization_id);
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_space ON memories(space_id) WHERE space_id IS NOT NULL;
CREATE INDEX idx_memories_area ON memories(area_id) WHERE area_id IS NOT NULL;
CREATE INDEX idx_memories_visibility ON memories(visibility, approval_status)
    WHERE valid_to IS NULL;
CREATE INDEX idx_memories_importance ON memories(importance DESC)
    WHERE valid_to IS NULL AND approval_status = 'approved';

-- Memory Embeddings (vector similarity search)
CREATE INDEX idx_memories_embedding ON memories
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Hierarchical memory lookup (common query pattern)
CREATE INDEX idx_memories_hierarchy ON memories(organization_id, space_id, area_id, visibility)
    WHERE valid_to IS NULL AND approval_status = 'approved';

-- Memory Proposals
CREATE INDEX idx_memory_proposals_memory ON memory_proposals(memory_id);
CREATE INDEX idx_memory_proposals_status ON memory_proposals(status, proposed_at DESC)
    WHERE status = 'pending';

-- Documents
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_space ON documents(space_id);

-- ============================================================
-- OPERATIONAL LEVEL INDEXES
-- ============================================================

-- Usage Records (critical for billing and analytics)
CREATE INDEX idx_usage_org_time ON usage_records(organization_id, created_at);
CREATE INDEX idx_usage_user_time ON usage_records(user_id, created_at);
CREATE INDEX idx_usage_space_time ON usage_records(space_id, created_at)
    WHERE space_id IS NOT NULL;
CREATE INDEX idx_usage_model ON usage_records(organization_id, model, created_at);

-- Consider partitioning for high-volume deployments
-- CREATE TABLE usage_records (...) PARTITION BY RANGE (created_at);

-- Budgets
CREATE INDEX idx_budgets_scope ON budgets(scope_type, scope_id);
CREATE INDEX idx_budgets_org ON budgets(organization_id);

-- Invoices
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status, period_end DESC);

-- Invitations
CREATE INDEX idx_invitations_token ON invitations(token) WHERE status = 'pending';
CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email, status);

-- Audit Log
CREATE INDEX idx_audit_org ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_user_id, created_at DESC);

-- ============================================================
-- GUARDRAILS INDEXES
-- ============================================================

CREATE INDEX idx_guardrails_level ON guardrails(level, scope_id) WHERE is_active = true;
CREATE INDEX idx_guardrails_type ON guardrails(type) WHERE is_active = true;

-- ============================================================
-- MODELS INDEXES
-- ============================================================

CREATE INDEX idx_models_tier ON models(tier_id) WHERE is_enabled = true;
CREATE INDEX idx_models_provider ON models(provider) WHERE is_enabled = true;
```

### 12.2 Index Rationale Summary

| Index | Query Pattern | Expected Frequency |
|-------|--------------|-------------------|
| `idx_spaces_type` | Load user's accessible spaces | Every page load |
| `idx_conversations_recent` | Conversation list sidebar | Every page load |
| `idx_memories_hierarchy` | Context assembly | Every chat message |
| `idx_memories_embedding` | Semantic memory search | Every chat message |
| `idx_usage_org_time` | Billing dashboard | Daily/weekly |
| `idx_guardrails_level` | Request validation | Every API call |

---

## 13. Migration Path

### 13.1 Current State

| Entity | Current Location | Migration Needed |
|--------|-----------------|------------------|
| Spaces | PostgreSQL | Add `organization_id`, `space_type`, `is_org_wide` |
| Areas | PostgreSQL | Add `is_restricted`, `created_by` |
| Tasks | PostgreSQL | Add `organization_id` |
| Documents | PostgreSQL | Add `organization_id` |
| Conversations | localStorage | Full migration to PostgreSQL |
| Messages | localStorage | Full migration to PostgreSQL |

### 13.2 Migration Phases

#### Phase 1: Organization Infrastructure

```sql
-- Migration 013: Create organization infrastructure

-- 1. Create new tables
CREATE TABLE organizations (...);
CREATE TABLE groups (...);
CREATE TABLE users (...);
CREATE TABLE user_profiles (...);
CREATE TABLE org_memberships (...);
CREATE TABLE group_memberships (...);

-- 2. Create default internal organization
INSERT INTO organizations (id, name, slug, billing_plan) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Internal', 'internal', 'enterprise');

-- 3. Seed default profiles
INSERT INTO user_profiles ...;
```

#### Phase 2: Add Organization Context to Existing Tables

```sql
-- Migration 014: Add organization_id to existing tables

-- Spaces
ALTER TABLE spaces ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE spaces ADD COLUMN space_type TEXT DEFAULT 'personal';
ALTER TABLE spaces ADD COLUMN is_org_wide BOOLEAN DEFAULT false;
ALTER TABLE spaces ADD COLUMN created_by UUID REFERENCES users(id);

-- Set all existing spaces to internal org
UPDATE spaces SET organization_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE spaces ALTER COLUMN organization_id SET NOT NULL;

-- Areas
ALTER TABLE areas ADD COLUMN is_restricted BOOLEAN DEFAULT false;
ALTER TABLE areas ADD COLUMN created_by UUID REFERENCES users(id);

-- Tasks
ALTER TABLE tasks ADD COLUMN organization_id UUID REFERENCES organizations(id);
UPDATE tasks SET organization_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE tasks ALTER COLUMN organization_id SET NOT NULL;

-- Documents
ALTER TABLE documents ADD COLUMN organization_id UUID REFERENCES organizations(id);
UPDATE documents SET organization_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE documents ALTER COLUMN organization_id SET NOT NULL;
```

#### Phase 3: Workspace Access Tables

```sql
-- Migration 015: Create workspace access tables

CREATE TABLE space_group_access (...);
CREATE TABLE area_memberships (...);
```

#### Phase 4: Platform Tables

```sql
-- Migration 016: Create platform tables

CREATE TABLE model_tiers (...);
CREATE TABLE models (...);
CREATE TABLE guardrails (...);

-- Seed tiers
INSERT INTO model_tiers ...;

-- Seed models (import from model-capabilities.ts)
INSERT INTO models ...;
```

#### Phase 5: Conversation Migration

```sql
-- Migration 017: Create conversation tables

CREATE TABLE conversations (...);
CREATE TABLE messages (...);
```

**Application-side migration:**
1. Create API endpoint to receive localStorage data
2. Client-side migration script reads localStorage, posts to API
3. API validates and inserts into PostgreSQL
4. On success, clear localStorage
5. Feature flag to switch client to server-side storage

#### Phase 6: Context Tables

```sql
-- Migration 018: Create memory and context tables

CREATE TABLE memories (...);
CREATE TABLE memory_proposals (...);

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Phase 7: Operational Tables

```sql
-- Migration 019: Create operational tables

CREATE TABLE usage_records (...);
CREATE TABLE budgets (...);
CREATE TABLE invoices (...);
CREATE TABLE invitations (...);
CREATE TABLE audit_log (...);
```

#### Phase 8: Create Indexes

```sql
-- Migration 020: Create all indexes

CREATE INDEX idx_groups_org ...;
-- (all indexes from Section 12)
```

### 13.3 Migration Validation Checklist

- [ ] All existing spaces have `organization_id`
- [ ] All existing tasks have `organization_id`
- [ ] All existing documents have `organization_id`
- [ ] Default organization exists
- [ ] Default user profiles exist
- [ ] Model tiers seeded
- [ ] Models seeded with tier assignments
- [ ] Conversations migrated from localStorage
- [ ] Messages migrated with sequence numbers
- [ ] All indexes created
- [ ] Foreign key constraints enforced

---

## 14. Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2026-01 | Separate Models table from Tiers | Enable per-model guardrails, not just tier-level | Embedding model list in tier config |
| 2026-01 | Two Space types (org/personal) | Clear governance boundary, appropriate context propagation | Single space type with visibility flags |
| 2026-01 | Areas as collaboration unit | Granular sharing without exposing entire Spaces | Space-level sharing only |
| 2026-01 | `is_restricted` flag on Areas | Allow private areas in org spaces for incubation | Always inherit from space |
| 2026-01 | Separate subscription (tiers) from governance (guardrails) | Orthogonal concerns, cleaner logic | Combined access control |
| 2026-01 | `space_id` in usage_records | Enable V2 project-based cost attribution | Join through conversations |
| 2026-01 | Guardrails at model and tier level | Fine-grained control ("block Opus for Marketing") | Tier-level only |
| 2026-01 | Bi-temporal memories | Enterprise compliance, audit trails | Simple timestamps |
| 2026-01 | Area memberships support groups | Invite entire teams to areas efficiently | User-only memberships |
| 2026-01 | Default internal organization | Smooth migration from single-tenant | Start fresh |
| 2026-01 | PostgreSQL + pgvector | Simplicity, existing stack | Dedicated vector DB |
| 2026-01 | Explicit space_memberships table | Clear ownership for memory approval, cross-group collaboration | Rely on created_by only |
| 2026-01 | Extended audit actions | Support Context Strategy memory workflow (proposed, approved, exported) | Minimal action set |
| 2026-01 | UUID primary keys from Day 1 | Avoid painful TEXT→UUID migration in production; enterprise-standard | TEXT IDs with semantic prefixes |
| 2026-01 | Fixed seed UUIDs | Predictable IDs for StraTech org (`10000000-...-001`), Gabriel user (`20000000-...-001`) | Generated UUIDs |
| 2026-01 | user_id_mappings table | Backward compatibility bridge from legacy TEXT user_ids to UUIDs during transition | Update all data in place |

---

## 15. Appendix: Query Examples

### 15.1 Get User's Accessible Spaces

```sql
-- All spaces user can access (via membership, group access, or org-wide)
WITH user_groups AS (
    SELECT group_id
    FROM group_memberships
    WHERE user_id = $user_id
)
SELECT DISTINCT s.*,
    COALESCE(
        sm.role,                              -- Explicit membership takes priority
        (SELECT MAX(sga.access_level)         -- Then group access
         FROM space_group_access sga
         WHERE sga.space_id = s.id
         AND sga.group_id IN (SELECT group_id FROM user_groups)),
        CASE WHEN s.is_org_wide THEN 'member' END  -- Then org-wide default
    ) as user_access_level,
    CASE
        WHEN sm.id IS NOT NULL THEN 'membership'
        WHEN EXISTS (SELECT 1 FROM space_group_access sga
                     WHERE sga.space_id = s.id
                     AND sga.group_id IN (SELECT group_id FROM user_groups))
            THEN 'group'
        WHEN s.is_org_wide THEN 'org_wide'
    END as access_source
FROM spaces s
LEFT JOIN space_memberships sm ON s.id = sm.space_id AND sm.user_id = $user_id
LEFT JOIN space_group_access sga ON s.id = sga.space_id
    AND sga.group_id IN (SELECT group_id FROM user_groups)
WHERE s.organization_id = $org_id
    AND s.is_archived = false
    AND (
        -- Explicit space membership
        sm.id IS NOT NULL
        -- Group-based access (organizational spaces)
        OR (s.space_type = 'organizational' AND sga.space_id IS NOT NULL)
        -- Org-wide spaces
        OR (s.space_type = 'organizational' AND s.is_org_wide = true)
    )
ORDER BY s.updated_at DESC;
```

### 15.2 Get User's Accessible Areas in a Space

```sql
-- All areas user can access in a given space
WITH user_groups AS (
    SELECT group_id
    FROM group_memberships
    WHERE user_id = $user_id
),
space_access AS (
    -- Check if user has space-level access (membership, group, or org-wide)
    SELECT EXISTS (
        SELECT 1 FROM spaces s
        LEFT JOIN space_memberships sm ON s.id = sm.space_id AND sm.user_id = $user_id
        LEFT JOIN space_group_access sga ON s.id = sga.space_id
        WHERE s.id = $space_id
            AND (
                sm.id IS NOT NULL                                    -- Explicit membership
                OR s.is_org_wide = true                              -- Org-wide access
                OR sga.group_id IN (SELECT group_id FROM user_groups) -- Group access
            )
    ) as has_space_access
)
SELECT a.*,
    COALESCE(am_user.role, am_group.role, 'member') as user_role,
    CASE
        WHEN am_user.id IS NOT NULL THEN 'direct'
        WHEN am_group.id IS NOT NULL THEN 'group'
        WHEN (SELECT has_space_access FROM space_access) THEN 'inherited'
    END as access_source
FROM areas a
CROSS JOIN space_access sa
LEFT JOIN area_memberships am_user ON a.id = am_user.area_id
    AND am_user.user_id = $user_id
LEFT JOIN area_memberships am_group ON a.id = am_group.area_id
    AND am_group.group_id IN (SELECT group_id FROM user_groups)
WHERE a.space_id = $space_id
    AND a.is_archived = false
    AND (
        -- Non-restricted areas with space access
        (a.is_restricted = false AND sa.has_space_access = true)
        -- Explicit user membership
        OR am_user.id IS NOT NULL
        -- Group membership
        OR am_group.id IS NOT NULL
    )
ORDER BY a.name;
```

### 15.3 Get User's Available Models

```sql
-- All models user can access based on subscription and guardrails
WITH user_tiers AS (
    -- Get user's allowed tier slugs
    SELECT COALESCE(
        om.allowed_tiers,
        up.default_tiers,
        (o.settings->>'allowed_tiers')::text[]
    ) as tiers
    FROM org_memberships om
    JOIN organizations o ON o.id = om.organization_id
    LEFT JOIN user_profiles up ON up.id = om.profile_id
    WHERE om.user_id = $user_id
),
tier_ids AS (
    SELECT mt.id
    FROM model_tiers mt
    CROSS JOIN user_tiers ut
    WHERE mt.slug = ANY(ut.tiers)
        AND mt.is_active = true
),
user_groups AS (
    SELECT group_id
    FROM group_memberships
    WHERE user_id = $user_id
),
applicable_guardrails AS (
    SELECT * FROM guardrails
    WHERE is_active = true
        AND (
            level = 'global'
            OR (level = 'organization' AND scope_id = $org_id)
            OR (level = 'group' AND scope_id IN (SELECT group_id FROM user_groups))
            OR (level = 'user' AND scope_id = $user_id)
        )
),
denied_models AS (
    SELECT DISTINCT jsonb_array_elements_text(config->'models') as model_id
    FROM applicable_guardrails
    WHERE type = 'model_denylist'
),
allowed_models AS (
    SELECT DISTINCT jsonb_array_elements_text(config->'models') as model_id
    FROM applicable_guardrails
    WHERE type = 'model_allowlist'
)
SELECT m.*, mt.name as tier_name, mt.slug as tier_slug
FROM models m
JOIN model_tiers mt ON m.tier_id = mt.id
WHERE m.is_enabled = true
    AND m.tier_id IN (SELECT id FROM tier_ids)
    AND m.model_id NOT IN (SELECT model_id FROM denied_models)
    AND (
        NOT EXISTS (SELECT 1 FROM allowed_models)
        OR m.model_id IN (SELECT model_id FROM allowed_models)
    )
ORDER BY mt.sort_order, m.sort_order;
```

### 15.4 Context Assembly for Chat

```sql
-- Get relevant memories for context assembly
WITH user_groups AS (
    SELECT group_id FROM group_memberships WHERE user_id = $user_id
)
SELECT m.*,
    1 - (m.embedding <=> $query_embedding) as similarity,
    CASE m.visibility
        WHEN 'area' THEN 1.0
        WHEN 'space' THEN 0.8
        WHEN 'group' THEN 0.6
        WHEN 'organization' THEN 0.4
        WHEN 'private' THEN 1.0
    END as scope_weight
FROM memories m
WHERE m.organization_id = $org_id
    AND m.approval_status = 'approved'
    AND (m.valid_to IS NULL OR m.valid_to > NOW())
    AND (
        -- Organization-wide memories
        (m.visibility = 'organization')
        -- Group memories for user's groups
        OR (m.visibility = 'group' AND m.group_id IN (SELECT group_id FROM user_groups))
        -- Space memories for current space
        OR (m.visibility = 'space' AND m.space_id = $space_id)
        -- Area memories for current area
        OR (m.visibility = 'area' AND m.area_id = $area_id)
        -- User's private memories
        OR (m.visibility = 'private' AND m.user_id = $user_id)
    )
ORDER BY
    (1 - (m.embedding <=> $query_embedding)) * 0.4 +  -- Relevance
    scope_weight * 0.3 +                                -- Proximity
    EXTRACT(EPOCH FROM (NOW() - m.created_at)) / -86400 * 0.001 * 0.2 + -- Recency
    m.importance * 0.1                                  -- Importance
    DESC
LIMIT 50;
```

### 15.5 Usage Summary for Billing

```sql
-- Monthly usage summary by organization
SELECT
    o.id as organization_id,
    o.name as organization_name,
    mt.name as tier_name,
    ur.model,
    COUNT(*) as request_count,
    SUM(ur.input_tokens) as total_input_tokens,
    SUM(ur.output_tokens) as total_output_tokens,
    SUM(ur.provider_cost) as total_provider_cost,
    SUM(ur.billed_amount) as total_billed_amount
FROM usage_records ur
JOIN organizations o ON o.id = ur.organization_id
LEFT JOIN model_tiers mt ON mt.id = ur.tier_id
WHERE ur.created_at >= $period_start
    AND ur.created_at < $period_end
    AND ur.organization_id = $org_id
GROUP BY o.id, o.name, mt.name, ur.model
ORDER BY total_billed_amount DESC;
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-09 | Claude Code | Initial document |

---

*This document is the authoritative reference for StratAI's entity model. All schema implementations must conform to these specifications. Updates require review and approval before implementation.*
