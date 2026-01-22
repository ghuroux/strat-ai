# GitHub Context Integration

> **Better Tickets Through Codebase Understanding**

This document specifies the GitHub integration for StratAI—enabling Product Managers to write better tickets with AI that understands their codebase. This is the first implementation of the [Integrations Architecture](./INTEGRATIONS_ARCHITECTURE.md), focused on read-only code context for the PM persona.

**Key Insight: Bridge the PM-Developer Gap.** PMs often write tickets that lack technical context, leading to back-and-forth clarification. By giving AI access to the codebase, we help PMs anticipate developer questions and write more complete specifications.

---

## Table of Contents

1. [Vision & User Story](#1-vision--user-story)
2. [Scope Boundaries](#2-scope-boundaries)
3. [Progressive Disclosure Flow](#3-progressive-disclosure-flow)
4. [Tool Definitions](#4-tool-definitions)
5. [Context Strategy](#5-context-strategy)
6. [System Prompt Guidelines](#6-system-prompt-guidelines)
7. [Authentication Options](#7-authentication-options)
8. [Guardrails & Limits](#8-guardrails--limits)
9. [Error Handling](#9-error-handling)
10. [UX Components](#10-ux-components)
11. [Implementation Details](#11-implementation-details)
12. [Success Metrics](#12-success-metrics)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Vision & User Story

### The Problem

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PM TICKET WRITING TODAY                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   PM writes ticket:                                                              │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   "Add dark mode to the app"                                             │   │
│   │                                                                          │   │
│   │   Acceptance Criteria:                                                   │   │
│   │   - User can toggle dark mode                                            │   │
│   │   - Dark mode should look nice                                           │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   Developer asks:                                                                │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   ❓ "Should it follow system preference or be user-controlled?"         │   │
│   │   ❓ "Where does the toggle go? Settings? Header? Both?"                 │   │
│   │   ❓ "Do we need to update the 47 components with hardcoded colors?"     │   │
│   │   ❓ "Should preference persist? localStorage or database?"              │   │
│   │   ❓ "What about our third-party components? Do they support theming?"   │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   Result: Multiple rounds of clarification, delayed sprint planning              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### The Solution

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PM TICKET WRITING WITH GITHUB CONTEXT                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   PM: "I want to write a ticket for adding dark mode"                            │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   AI: "Let me explore your codebase to understand your current           │   │
│   │        theming approach..."                                              │   │
│   │                                                                          │   │
│   │        🔍 Searching: "theme" in src/                                     │   │
│   │        📄 Reading: src/lib/theme/ThemeProvider.svelte                    │   │
│   │        📄 Reading: src/app.css                                           │   │
│   │        📄 Reading: src/lib/components/Button.svelte                      │   │
│   │                                                                          │   │
│   │   AI: "I found your ThemeProvider that currently only supports light     │   │
│   │        mode. I also noticed:                                             │   │
│   │                                                                          │   │
│   │        • 23 components use CSS variables (good!)                         │   │
│   │        • 8 components have hardcoded colors (need updates)               │   │
│   │        • You're using Tailwind's dark: prefix pattern                    │   │
│   │        • No current preference persistence                               │   │
│   │                                                                          │   │
│   │        Before we write this ticket, a few questions developers           │   │
│   │        will likely ask:                                                  │   │
│   │                                                                          │   │
│   │        1. Should dark mode follow system preference or be manual?        │   │
│   │        2. Given 8 components need color updates, should we include       │   │
│   │           a refactoring phase in this ticket or separate it?             │   │
│   │        3. Where should the toggle live? I see you have a Settings        │   │
│   │           page at src/routes/settings/+page.svelte"                      │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   PM answers questions → AI drafts comprehensive ticket                          │
│                                                                                  │
│   Result: Complete ticket, minimal developer clarification needed                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Primary User Story

> **As a Product Manager,** I want to connect a GitHub repository to my Area so I can write better tickets with AI that understands our codebase, while learning to anticipate developer questions.

### Secondary User Stories

> **As a PM,** I want AI to explore relevant code before drafting a ticket, so the specification reflects actual implementation details.

> **As a PM,** I want AI to ask me clarifying questions that developers would ask, so I can address them proactively in the ticket.

> **As a PM,** I want to see what files AI accessed, so I understand what context informed its suggestions.

---

## 2. Scope Boundaries

### In Scope (V1)

| Capability | Description |
|------------|-------------|
| **Read-only repo access** | Browse files, read content, search code |
| **PM persona** | Educational prompts that anticipate developer questions |
| **Single repo per Area** | One repository connection per Area |
| **File tree navigation** | List directories, understand project structure |
| **Code search** | Find relevant files by content |
| **Issue reading** | Get context from existing issues |
| **Recent commits** | Understand recent changes |

### Out of Scope (Future)

| Capability | Why Deferred |
|------------|--------------|
| **Write operations** | PRs, commits - requires different permission model |
| **Developer persona** | Different prompts, code generation focus - separate feature |
| **Multi-repo** | Complexity; single repo proves value first |
| **Full code indexing** | Semantic search, embeddings - Phase 2 enhancement |
| **Issue creation** | Write operation; PM creates in their tool |
| **PR review** | Developer workflow, not PM workflow |
| **Webhook events** | Real-time sync - complexity for V1 |

### Persona Focus: Product Manager

This integration is designed for the **PM persona** - someone who:
- Writes feature specifications and tickets
- Needs to understand technical constraints without deep code knowledge
- Benefits from AI explaining code implications in business terms
- Wants to anticipate and preempt developer questions

Developer persona (code generation, PR review) is a separate feature.

---

## 3. Progressive Disclosure Flow

### Conversation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    PROGRESSIVE DISCLOSURE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   STEP 1: PM States Intent                                                       │
│   ────────────────────────                                                       │
│                                                                                  │
│   PM: "I want to write a ticket for adding user profile avatars"                 │
│                                                                                  │
│   ───────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│   STEP 2: AI Explores Codebase (Visible to User)                                 │
│   ──────────────────────────────────────────────                                 │
│                                                                                  │
│   AI: "Let me explore your codebase to understand how user profiles              │
│        are currently handled..."                                                 │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  🔍 Searching: "profile" in src/                                         │   │
│   │  📂 Listing: src/lib/components/user/                                    │   │
│   │  📄 Reading: src/lib/components/user/ProfileCard.svelte                  │   │
│   │  📄 Reading: src/routes/settings/profile/+page.svelte                    │   │
│   │  📄 Reading: src/lib/types/user.ts                                       │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ───────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│   STEP 3: AI Summarizes Findings                                                 │
│   ──────────────────────────────                                                 │
│                                                                                  │
│   AI: "Here's what I found about your current user profile setup:                │
│                                                                                  │
│        📍 Profile display: ProfileCard.svelte shows name and email               │
│        📍 Profile editing: settings/profile page with form                       │
│        📍 User type: Has name, email, role - no avatar field yet                 │
│        📍 Image handling: I found an ImageUpload component at                    │
│           src/lib/components/common/ImageUpload.svelte                           │
│                                                                                  │
│        This gives me context to help with your avatar ticket."                   │
│                                                                                  │
│   ───────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│   STEP 4: AI Asks Clarifying Questions                                           │
│   ────────────────────────────────────                                           │
│                                                                                  │
│   AI: "Before drafting the ticket, here are questions a developer                │
│        would likely ask:                                                         │
│                                                                                  │
│        1. **Storage**: Should avatars be stored in your database                 │
│           or a service like S3/Cloudinary? (I didn't find existing               │
│           cloud storage config)                                                  │
│                                                                                  │
│        2. **Default avatars**: What happens for users without avatars?           │
│           Initials? Generic icon? Gravatar integration?                          │
│                                                                                  │
│        3. **Size/Format**: What dimensions? Should we accept any                 │
│           image and resize, or enforce upload constraints?                       │
│                                                                                  │
│        4. **Display locations**: I found ProfileCard is used in 4                │
│           places - should all show avatars, or just some?"                       │
│                                                                                  │
│   ───────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│   STEP 5: PM Provides Answers                                                    │
│   ───────────────────────────                                                    │
│                                                                                  │
│   PM: "S3 for storage, initials as default, max 2MB JPG/PNG resized              │
│        to 200x200, show in all locations"                                        │
│                                                                                  │
│   ───────────────────────────────────────────────────────────────────────────   │
│                                                                                  │
│   STEP 6: AI Drafts Ticket                                                       │
│   ────────────────────────                                                       │
│                                                                                  │
│   AI: "Based on your answers and what I found in the codebase,                   │
│        here's a draft ticket:                                                    │
│                                                                                  │
│        ───────────────────────────────────────────────────────                   │
│        ## Add User Profile Avatars                                               │
│                                                                                  │
│        ### Summary                                                               │
│        Enable users to upload profile avatars...                                 │
│                                                                                  │
│        ### Technical Context                                                     │
│        - Existing ImageUpload component can be reused                            │
│        - User type in src/lib/types/user.ts needs avatarUrl field                │
│        - ProfileCard.svelte used in 4 locations (all need update)                │
│                                                                                  │
│        ### Acceptance Criteria                                                   │
│        - [ ] Add S3 bucket configuration for avatar storage                      │
│        - [ ] Add avatarUrl field to User type and database                       │
│        - [ ] Update profile settings page with avatar upload                     │
│        - [ ] Update ProfileCard to display avatar with initials fallback         │
│        - [ ] Enforce 2MB limit, JPG/PNG only, resize to 200x200                  │
│                                                                                  │
│        ### Files to Modify                                                       │
│        - src/lib/types/user.ts                                                   │
│        - src/lib/components/user/ProfileCard.svelte                              │
│        - src/routes/settings/profile/+page.svelte                                │
│        - Database migration for users.avatar_url                                 │
│        ───────────────────────────────────────────────────────                   │
│                                                                                  │
│        Would you like me to adjust anything?"                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Behaviors

| Behavior | Description |
|----------|-------------|
| **Explore Before Answering** | AI searches codebase before making suggestions |
| **Show Work** | Tool calls visible to user (transparency) |
| **Summarize Findings** | Explain what was found in business terms |
| **Anticipate Questions** | Ask what developers would ask |
| **Reference Specific Files** | Cite actual paths, not generic advice |
| **Draft, Don't Dictate** | Offer ticket draft for PM to refine |

---

## 4. Tool Definitions

### Available Tools

```typescript
// src/lib/server/integrations/providers/github/tools.ts

export const GITHUB_TOOLS: ToolDefinition[] = [
  {
    name: 'github_list_files',
    description: 'List files and directories at a path in the repository. Use this to explore the project structure.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Repository path to list (e.g., "src/components"). Use "" for root.',
          default: ''
        }
      },
      required: []
    }
  },

  {
    name: 'github_read_file',
    description: 'Read the contents of a file from the repository. Use this to understand implementation details.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Full path to the file (e.g., "src/lib/auth/login.ts")'
        },
        startLine: {
          type: 'number',
          description: 'Optional: Start reading from this line (1-indexed)'
        },
        endLine: {
          type: 'number',
          description: 'Optional: Stop reading at this line'
        }
      },
      required: ['path']
    }
  },

  {
    name: 'github_search_code',
    description: 'Search for code patterns in the repository. Use this to find relevant files.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "function handleAuth", "import.*lodash")'
        },
        path: {
          type: 'string',
          description: 'Optional: Limit search to this path (e.g., "src/")'
        },
        extension: {
          type: 'string',
          description: 'Optional: Limit to file extension (e.g., "ts", "svelte")'
        }
      },
      required: ['query']
    }
  },

  {
    name: 'github_get_issue',
    description: 'Get details of a GitHub issue by number. Use this for context on existing work.',
    parameters: {
      type: 'object',
      properties: {
        number: {
          type: 'number',
          description: 'Issue number'
        }
      },
      required: ['number']
    }
  },

  {
    name: 'github_search_issues',
    description: 'Search for issues in the repository. Use this to find related work or avoid duplicates.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (searches title and body)'
        },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by issue state',
          default: 'all'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by labels'
        },
        limit: {
          type: 'number',
          description: 'Max results to return',
          default: 10
        }
      },
      required: ['query']
    }
  },

  {
    name: 'github_get_recent_commits',
    description: 'Get recent commits to understand recent changes. Use this to know what\'s actively being worked on.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Optional: Limit to commits affecting this path'
        },
        count: {
          type: 'number',
          description: 'Number of commits to retrieve',
          default: 10,
          maximum: 50
        }
      },
      required: []
    }
  }
];
```

### Tool Response Formats

```typescript
// github_list_files response
interface ListFilesResponse {
  path: string;
  entries: {
    name: string;
    type: 'file' | 'dir';
    size?: number;  // For files
  }[];
  truncated: boolean;  // If > 100 entries
}

// github_read_file response
interface ReadFileResponse {
  path: string;
  content: string;
  size: number;
  truncated: boolean;  // If > 50KB
  language?: string;   // Detected language
  lineCount: number;
}

// github_search_code response
interface SearchCodeResponse {
  query: string;
  totalCount: number;
  results: {
    path: string;
    matches: {
      lineNumber: number;
      content: string;
      context: string;  // Surrounding lines
    }[];
  }[];
  truncated: boolean;  // If > 20 results
}

// github_get_issue response
interface GetIssueResponse {
  number: number;
  title: string;
  state: 'open' | 'closed';
  body: string;
  author: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
}

// github_search_issues response
interface SearchIssuesResponse {
  query: string;
  totalCount: number;
  issues: {
    number: number;
    title: string;
    state: 'open' | 'closed';
    labels: string[];
    createdAt: string;
  }[];
}

// github_get_recent_commits response
interface GetRecentCommitsResponse {
  commits: {
    sha: string;
    message: string;
    author: string;
    date: string;
    filesChanged: number;
  }[];
  path?: string;  // If filtered by path
}
```

---

## 5. Context Strategy

### Always-Available Context (~2K tokens)

This context is automatically included in every conversation when GitHub is enabled:

```typescript
interface GitHubBaseContext {
  // Repository identity
  repoOwner: string;      // "acme-corp"
  repoName: string;       // "frontend-app"
  repoDescription: string; // "React frontend for Acme platform"
  defaultBranch: string;  // "main"
  primaryLanguage: string; // "TypeScript"

  // Project structure (depth 2)
  fileTree: string;       // Formatted tree of top-level dirs

  // README summary (AI-generated, cached)
  readmeSummary: string;  // 200-word summary of README

  // Recent activity
  lastCommit: {
    message: string;
    author: string;
    date: string;
  };
}
```

### Example Base Context

```
## Connected Repository: acme-corp/frontend-app

**Description:** React frontend for Acme platform
**Primary Language:** TypeScript
**Default Branch:** main

### Project Structure (top-level)
```
├── src/
│   ├── components/     # UI components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities
│   ├── types/          # TypeScript types
│   └── styles/         # Global styles
├── public/             # Static assets
├── tests/              # Test files
└── docs/               # Documentation
```

### README Summary
This is a React 18 application using TypeScript and Tailwind CSS. It implements
a customer portal with user authentication, dashboard, and settings management.
Key dependencies include React Query for data fetching and Zustand for state.

### Recent Activity
Last commit: "fix: resolve login redirect loop" by @jane (2 hours ago)
```

### On-Demand Context (via Tools)

When AI needs deeper context, it calls tools:

```
User: "I want to add dark mode support"

AI thinks: "I should search for existing theme/styling code"

AI calls: github_search_code({ query: "theme", path: "src/" })
AI calls: github_read_file({ path: "src/styles/globals.css" })
AI calls: github_list_files({ path: "src/components" })
```

### Context Budget Management

```typescript
// Track context usage per conversation
interface ConversationContextBudget {
  baseContext: number;      // ~2K tokens
  toolResults: number;      // Accumulates with tool calls
  maxBudget: number;        // ~20K tokens for GitHub context
  warningThreshold: number; // ~15K tokens
}

// When approaching budget, summarize instead of raw content
function manageContextBudget(result: ToolResult, budget: ConversationContextBudget) {
  if (budget.toolResults + estimateTokens(result) > budget.warningThreshold) {
    return summarizeResult(result);  // AI-summarized, smaller
  }
  return result;
}
```

---

## 6. System Prompt Guidelines

### PM Persona Prompt Addition

```markdown
## GitHub Repository Context

You have access to the connected GitHub repository: {{repoOwner}}/{{repoName}}.

### Your Role: PM Assistant

You're helping a Product Manager write better feature specifications. Your approach:

1. **Explore Before Suggesting**
   - Always search the codebase to understand current implementation
   - Find relevant files before making assumptions
   - Identify existing patterns and conventions

2. **Anticipate Developer Questions**
   - After exploring, ask the PM questions that developers would ask
   - Frame technical considerations in business terms
   - Help the PM think through edge cases

3. **Reference Specific Code**
   - Cite actual file paths, not generic examples
   - Explain what you found and why it matters
   - Show the connection between code and feature impact

4. **Draft Comprehensive Tickets**
   - Include technical context section
   - List specific files that need changes
   - Write acceptance criteria that address developer concerns

### Tool Usage Guidelines

- **github_list_files**: Start here to understand project structure
- **github_search_code**: Find relevant code by pattern/keyword
- **github_read_file**: Read files to understand implementation details
- **github_get_issue**: Get context on existing/related issues
- **github_search_issues**: Check for duplicate or related work
- **github_get_recent_commits**: Understand what's actively changing

### Example Exploration Pattern

For a feature like "add user avatars":
1. Search for "profile" or "user" to find relevant components
2. List the user-related directories
3. Read the User type definition
4. Check for existing image upload components
5. Search issues for "avatar" to check for existing work

### Response Style

When exploring code:
```
Let me explore your codebase to understand how [topic] is currently handled...

🔍 Searching: "[query]" in src/
📂 Listing: [path]
📄 Reading: [file]

Here's what I found:
- [Finding 1 with business implication]
- [Finding 2 with business implication]
```

When asking clarifying questions:
```
Before we draft this ticket, here are questions developers will likely ask:

1. **[Topic]**: [Question]?
   (I noticed [what you found in code])

2. **[Topic]**: [Question]?
   (This matters because [business/technical reason])
```
```

### Guardrail Prompts

```markdown
### Important Boundaries

- **Read-only**: You can explore and read code, but cannot make changes
- **No credentials**: Never expose API keys, tokens, or secrets found in code
- **File size limits**: Files over 50KB will be summarized
- **Rate awareness**: Limit tool calls to what's necessary (target 3-5 per response)
- **PM focus**: Help with specifications, not implementation details
```

---

## 7. Authentication Options

### Option A: Personal Access Token (Simpler, V1)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PERSONAL ACCESS TOKEN FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. User creates fine-grained PAT in GitHub                                     │
│      └─▶ Settings → Developer settings → Personal access tokens                  │
│          └─▶ Fine-grained tokens → Generate new token                            │
│                                                                                  │
│   2. Required permissions:                                                       │
│      ┌─────────────────────────────────────────────────────────────────────┐    │
│      │  Repository permissions:                                             │    │
│      │    ✓ Contents: Read-only                                             │    │
│      │    ✓ Issues: Read-only                                               │    │
│      │    ✓ Metadata: Read-only (always included)                           │    │
│      └─────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│   3. User pastes token in StratAI settings                                       │
│      └─▶ Token encrypted and stored                                              │
│                                                                                  │
│   4. StratAI uses token for API calls                                            │
│      └─▶ Subject to user's repo access                                           │
│                                                                                  │
│   Pros:                                                                          │
│   ✓ Simple setup                                                                 │
│   ✓ Works with any repo user has access to                                       │
│   ✓ No GitHub App installation needed                                            │
│                                                                                  │
│   Cons:                                                                          │
│   ✗ Token tied to individual user                                                │
│   ✗ Breaks if user leaves org or revokes token                                   │
│   ✗ Can't easily audit access across org                                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Option B: GitHub App (Recommended for Production)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      GITHUB APP FLOW                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   1. StratAI registers GitHub App                                                │
│      └─▶ One-time setup by StratAI team                                          │
│                                                                                  │
│   2. Org admin installs app on their GitHub org                                  │
│      └─▶ Selects which repos to grant access                                     │
│      └─▶ Grants read-only permissions                                            │
│                                                                                  │
│   3. StratAI receives installation ID                                            │
│      └─▶ Can generate installation tokens                                        │
│      └─▶ Tokens scoped to granted repos                                          │
│                                                                                  │
│   4. Users in org can connect any granted repo                                   │
│      └─▶ No individual token management                                          │
│      └─▶ Access persists even if user leaves                                     │
│                                                                                  │
│   Required permissions:                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  Repository permissions:                                                 │   │
│   │    ✓ Contents: Read-only                                                 │   │
│   │    ✓ Issues: Read-only                                                   │   │
│   │    ✓ Metadata: Read-only                                                 │   │
│   │                                                                          │   │
│   │  Organization permissions:                                               │   │
│   │    ✓ Members: Read-only (for user context)                               │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   Pros:                                                                          │
│   ✓ Org-level management                                                         │
│   ✓ Fine-grained per-repo access                                                 │
│   ✓ Doesn't depend on individual users                                           │
│   ✓ Better audit trail                                                           │
│   ✓ Auto-renewing tokens                                                         │
│                                                                                  │
│   Cons:                                                                          │
│   ✗ More complex setup                                                           │
│   ✗ Requires org admin action                                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Recommendation

| Phase | Auth Method | Reason |
|-------|-------------|--------|
| **V1 (MVP)** | Personal Access Token | Faster to implement, good for validation |
| **V2 (Production)** | GitHub App | Better for organizations, required for enterprise |

---

## 8. Guardrails & Limits

### File Limits

| Limit | Value | Behavior |
|-------|-------|----------|
| Max file read size | 50KB | Larger files truncated with summary |
| Max directory entries | 100 | Additional entries listed as count only |
| Max search results | 20 | Most relevant results returned |
| Max line range | 500 lines | For partial file reads |

### Rate Limits

| Limit | Value | Scope |
|-------|-------|-------|
| Tool calls per turn | 5 | Single AI response |
| Tool calls per conversation | 50 | Entire conversation |
| Tool calls per hour (user) | 200 | Per user across all conversations |
| GitHub API calls per hour | 5000 | Per installation (GitHub's limit) |

### Caching

| Cache | TTL | Purpose |
|-------|-----|---------|
| File contents | 5 minutes | Reduce API calls for re-reads |
| Directory listings | 5 minutes | Project structure caching |
| README summary | 1 hour | Expensive to regenerate |
| Search results | 1 minute | Balance freshness vs. speed |

### Content Filtering

```typescript
// Files to never read/expose
const BLOCKED_PATTERNS = [
  '.env*',           // Environment files
  '*.pem',           // Private keys
  '*.key',           // Private keys
  '*credential*',    // Credential files
  '*secret*',        // Secret files
  'id_rsa*',         // SSH keys
  '.git/config',     // Git credentials
];

// Patterns to redact in file content
const REDACT_PATTERNS = [
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
  /secret\s*[:=]\s*['"][^'"]+['"]/gi,
  /password\s*[:=]\s*['"][^'"]+['"]/gi,
  /token\s*[:=]\s*['"][^'"]+['"]/gi,
];
```

---

## 9. Error Handling

### Error Categories

```typescript
type GitHubErrorCategory =
  | 'auth_failed'       // Token invalid or expired
  | 'not_found'         // File/repo doesn't exist
  | 'rate_limited'      // GitHub API rate limit
  | 'permission_denied' // No access to resource
  | 'file_too_large'    // Exceeds size limit
  | 'network_error'     // Connection issues
  | 'internal_error';   // Unexpected error
```

### User-Friendly Error Messages

| Error | User Message | Recovery |
|-------|--------------|----------|
| `auth_failed` | "GitHub connection expired. Please reconnect in Space settings." | Link to settings |
| `not_found` | "I couldn't find that file. It may have been moved or deleted." | Suggest alternatives |
| `rate_limited` | "GitHub's rate limit reached. I'll continue in a few minutes." | Auto-retry with backoff |
| `permission_denied` | "I don't have access to that repository/path." | Check permissions |
| `file_too_large` | "That file is too large to read fully. Here's a summary..." | Provide summary |
| `network_error` | "Couldn't reach GitHub. Please check your connection." | Retry option |

### Graceful Degradation

```typescript
// When GitHub is unavailable, continue without code context
async function handleGitHubError(error: GitHubError, context: ConversationContext) {
  // Log for monitoring
  await logIntegrationError(error, context);

  // Inform user appropriately
  if (error.category === 'rate_limited') {
    return {
      message: "I've hit GitHub's rate limit. I can still help, but without live code context for a few minutes.",
      canContinue: true,
    };
  }

  if (error.category === 'auth_failed') {
    return {
      message: "Your GitHub connection needs to be refreshed. Would you like me to continue without code context, or would you prefer to reconnect first?",
      canContinue: true,
      suggestReconnect: true,
    };
  }

  // For other errors, continue without context
  return {
    message: "I couldn't access GitHub right now. I can still help based on our conversation, but won't have live code context.",
    canContinue: true,
  };
}
```

---

## 10. UX Components

### Space Settings: GitHub Configuration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      CONNECT GITHUB REPOSITORY                            [X]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   Connect a GitHub repository to give AI access to your codebase when           │
│   writing feature specifications.                                                │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  STEP 1: Authentication                                                  │   │
│   │                                                                          │   │
│   │  Create a fine-grained Personal Access Token:                            │   │
│   │                                                                          │   │
│   │  1. Go to GitHub → Settings → Developer settings                         │   │
│   │  2. Personal access tokens → Fine-grained tokens                         │   │
│   │  3. Generate new token with these permissions:                           │   │
│   │     • Contents: Read-only                                                │   │
│   │     • Issues: Read-only                                                  │   │
│   │                                                                          │   │
│   │  [Open GitHub Settings ↗]                                                │   │
│   │                                                                          │   │
│   │  ┌───────────────────────────────────────────────────────────────────┐  │   │
│   │  │ Token: ghp_                                                       │  │   │
│   │  └───────────────────────────────────────────────────────────────────┘  │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  STEP 2: Select Repository                                               │   │
│   │                                                                          │   │
│   │  Owner:  [acme-corp              ▼]                                      │   │
│   │  Repo:   [frontend-app           ▼]                                      │   │
│   │  Branch: [main                   ▼]                                      │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  STEP 3: Verify Connection                                               │   │
│   │                                                                          │   │
│   │  [Test Connection]                                                       │   │
│   │                                                                          │   │
│   │  ✓ Connected successfully                                                │   │
│   │    Repository: acme-corp/frontend-app                                    │   │
│   │    Files: 847 │ Language: TypeScript │ Last commit: 2 hours ago          │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│                                                   [Cancel]  [Save Connection]   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Chat: Integration Indicator

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   Area: Product Specs                                                            │
│   ┌───────────────────────────────────────────────────────────────────────────┐ │
│   │  Context: [📁 GitHub: frontend-app]                                       │ │
│   └───────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────┤
```

### Chat: Tool Usage Display

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   AI: Let me explore your codebase to understand the current auth setup...       │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  ▼ Exploring codebase                                     [2.3s]        │   │
│   │                                                                          │   │
│   │    🔍 Searched "authentication" in src/          12 results             │   │
│   │    📂 Listed src/lib/auth/                       8 files                │   │
│   │    📄 Read src/lib/auth/login.ts                 142 lines              │   │
│   │    📄 Read src/lib/auth/session.ts               87 lines               │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   Based on what I found in your codebase...                                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Area Settings: GitHub Scope

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│   GITHUB INTEGRATION                                                             │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │  📁 GitHub: acme-corp/frontend-app                                       │   │
│   │                                                                          │   │
│   │  [Toggle: ON ●]                                           [Configure]   │   │
│   │                                                                          │   │
│   │  Scope restrictions (optional):                                          │   │
│   │                                                                          │   │
│   │  Paths:  ┌──────────────────────────────────────────────────────────┐   │   │
│   │          │ src/auth/                                                 │   │   │
│   │          │ src/lib/auth/                                             │   │   │
│   │          │ docs/authentication/                                      │   │   │
│   │          └──────────────────────────────────────────────────────────┘   │   │
│   │          AI can only explore files in these paths                        │   │
│   │                                                                          │   │
│   │  Issue labels:  [auth] [security] [×]  [+ Add label]                    │   │
│   │                 Only show issues with these labels                       │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Implementation Details

### GitHub Provider Class

```typescript
// src/lib/server/integrations/providers/github/provider.ts

import { Octokit } from '@octokit/rest';
import { BaseProvider, ToolDefinition, ToolResult } from '../base-provider';
import { GITHUB_TOOLS } from './tools';
import { GitHubClient } from './client';

export class GitHubProvider extends BaseProvider {
  private client: GitHubClient;

  constructor(integration: Integration, credentials: DecryptedCredential[]) {
    super(integration, credentials);

    const token = credentials.find(c => c.type === 'access_token')?.value;
    if (!token) throw new Error('GitHub access token required');

    this.client = new GitHubClient({
      token,
      owner: integration.config.repoOwner as string,
      repo: integration.config.repoName as string,
      branch: integration.config.defaultBranch as string,
    });
  }

  get serviceType() { return 'github' as const; }
  get displayName() { return 'GitHub'; }
  get iconUrl() { return '/icons/github.svg'; }

  async validateConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.client.getRepository();
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return GITHUB_TOOLS;
  }

  async executeTool(
    toolName: string,
    parameters: Record<string, unknown>,
    context: { userId: string; areaId: string; conversationId?: string }
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      let result: unknown;

      switch (toolName) {
        case 'github_list_files':
          result = await this.client.listFiles(parameters.path as string);
          break;
        case 'github_read_file':
          result = await this.client.readFile(
            parameters.path as string,
            parameters.startLine as number,
            parameters.endLine as number
          );
          break;
        case 'github_search_code':
          result = await this.client.searchCode(
            parameters.query as string,
            parameters.path as string,
            parameters.extension as string
          );
          break;
        case 'github_get_issue':
          result = await this.client.getIssue(parameters.number as number);
          break;
        case 'github_search_issues':
          result = await this.client.searchIssues(
            parameters.query as string,
            parameters.state as string,
            parameters.labels as string[],
            parameters.limit as number
          );
          break;
        case 'github_get_recent_commits':
          result = await this.client.getRecentCommits(
            parameters.path as string,
            parameters.count as number
          );
          break;
        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }

      const toolResult = {
        success: true,
        data: result,
        tokensUsed: this.estimateTokens(result),
      };

      // Log operation
      await this.log(toolName, parameters, toolResult, {
        ...context,
        durationMs: Date.now() - startTime,
      });

      return toolResult;

    } catch (error) {
      const toolResult = {
        success: false,
        error: this.formatError(error),
      };

      await this.log(toolName, parameters, toolResult, {
        ...context,
        durationMs: Date.now() - startTime,
      });

      return toolResult;
    }
  }

  async getContextSummary(): Promise<string> {
    const repo = await this.client.getRepository();
    const tree = await this.client.getFileTree(2);
    const readme = await this.client.getReadmeSummary();

    return `
## Connected Repository: ${repo.owner}/${repo.name}

**Description:** ${repo.description || 'No description'}
**Primary Language:** ${repo.language || 'Unknown'}
**Default Branch:** ${repo.defaultBranch}

### Project Structure
\`\`\`
${tree}
\`\`\`

### README Summary
${readme}

### Recent Activity
Last commit: "${repo.lastCommit.message}" by @${repo.lastCommit.author} (${repo.lastCommit.relativeTime})
    `.trim();
  }

  private estimateTokens(data: unknown): number {
    const json = JSON.stringify(data);
    return Math.ceil(json.length / 4);  // Rough estimate: 4 chars per token
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('Not Found')) {
        return 'File or resource not found';
      }
      if (error.message.includes('rate limit')) {
        return 'GitHub API rate limit reached. Please wait a moment.';
      }
      return error.message;
    }
    return 'An unexpected error occurred';
  }
}
```

### GitHub API Client

```typescript
// src/lib/server/integrations/providers/github/client.ts

import { Octokit } from '@octokit/rest';

interface GitHubClientConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private branch: string;

  constructor(config: GitHubClientConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch;
  }

  async getRepository() {
    const { data } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });

    const commits = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      per_page: 1,
    });

    return {
      owner: data.owner.login,
      name: data.name,
      description: data.description,
      language: data.language,
      defaultBranch: data.default_branch,
      lastCommit: commits.data[0] ? {
        message: commits.data[0].commit.message.split('\n')[0],
        author: commits.data[0].author?.login || 'unknown',
        relativeTime: this.getRelativeTime(commits.data[0].commit.author?.date),
      } : null,
    };
  }

  async listFiles(path: string = ''): Promise<ListFilesResponse> {
    const { data } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref: this.branch,
    });

    if (!Array.isArray(data)) {
      throw new Error('Path is a file, not a directory');
    }

    const entries = data.slice(0, 100).map(item => ({
      name: item.name,
      type: item.type as 'file' | 'dir',
      size: item.size,
    }));

    return {
      path,
      entries,
      truncated: data.length > 100,
    };
  }

  async readFile(
    path: string,
    startLine?: number,
    endLine?: number
  ): Promise<ReadFileResponse> {
    const { data } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref: this.branch,
    });

    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error('Path is not a file');
    }

    // Check blocked patterns
    if (this.isBlockedFile(path)) {
      throw new Error('Access to this file type is not permitted');
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    // Handle large files
    if (data.size > 50 * 1024) {
      return {
        path,
        content: content.slice(0, 50 * 1024) + '\n\n[File truncated - exceeds 50KB limit]',
        size: data.size,
        truncated: true,
        lineCount: content.split('\n').length,
      };
    }

    // Handle line range
    if (startLine || endLine) {
      const lines = content.split('\n');
      const start = (startLine || 1) - 1;
      const end = endLine || lines.length;
      const slicedContent = lines.slice(start, end).join('\n');

      return {
        path,
        content: slicedContent,
        size: slicedContent.length,
        truncated: false,
        lineCount: end - start,
      };
    }

    // Redact sensitive content
    const redactedContent = this.redactSensitiveContent(content);

    return {
      path,
      content: redactedContent,
      size: data.size,
      truncated: false,
      language: this.detectLanguage(path),
      lineCount: content.split('\n').length,
    };
  }

  async searchCode(
    query: string,
    path?: string,
    extension?: string
  ): Promise<SearchCodeResponse> {
    let q = `${query} repo:${this.owner}/${this.repo}`;
    if (path) q += ` path:${path}`;
    if (extension) q += ` extension:${extension}`;

    const { data } = await this.octokit.search.code({
      q,
      per_page: 20,
    });

    const results = await Promise.all(
      data.items.slice(0, 20).map(async (item) => {
        // Get file content for context
        try {
          const file = await this.readFile(item.path);
          const lines = file.content.split('\n');

          // Find matching lines
          const matches = lines
            .map((line, index) => ({ line, index }))
            .filter(({ line }) =>
              line.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 5)
            .map(({ line, index }) => ({
              lineNumber: index + 1,
              content: line.trim(),
              context: this.getLineContext(lines, index),
            }));

          return { path: item.path, matches };
        } catch {
          return { path: item.path, matches: [] };
        }
      })
    );

    return {
      query,
      totalCount: data.total_count,
      results: results.filter(r => r.matches.length > 0),
      truncated: data.total_count > 20,
    };
  }

  async getIssue(number: number): Promise<GetIssueResponse> {
    const { data } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: number,
    });

    return {
      number: data.number,
      title: data.title,
      state: data.state as 'open' | 'closed',
      body: data.body || '',
      author: data.user?.login || 'unknown',
      labels: data.labels.map(l =>
        typeof l === 'string' ? l : l.name || ''
      ),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      commentsCount: data.comments,
    };
  }

  async searchIssues(
    query: string,
    state: string = 'all',
    labels?: string[],
    limit: number = 10
  ): Promise<SearchIssuesResponse> {
    let q = `${query} repo:${this.owner}/${this.repo} is:issue`;
    if (state !== 'all') q += ` state:${state}`;
    if (labels?.length) q += ` label:${labels.join(',')}`;

    const { data } = await this.octokit.search.issuesAndPullRequests({
      q,
      per_page: Math.min(limit, 20),
    });

    return {
      query,
      totalCount: data.total_count,
      issues: data.items.map(item => ({
        number: item.number,
        title: item.title,
        state: item.state as 'open' | 'closed',
        labels: item.labels.map(l =>
          typeof l === 'string' ? l : l.name || ''
        ),
        createdAt: item.created_at,
      })),
    };
  }

  async getRecentCommits(
    path?: string,
    count: number = 10
  ): Promise<GetRecentCommitsResponse> {
    const { data } = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
      sha: this.branch,
      path,
      per_page: Math.min(count, 50),
    });

    return {
      commits: data.map(commit => ({
        sha: commit.sha.slice(0, 7),
        message: commit.commit.message.split('\n')[0],
        author: commit.author?.login || commit.commit.author?.name || 'unknown',
        date: commit.commit.author?.date || '',
        filesChanged: 0,  // Would need separate API call
      })),
      path,
    };
  }

  private isBlockedFile(path: string): boolean {
    const blockedPatterns = [
      /\.env/i,
      /\.pem$/i,
      /\.key$/i,
      /credential/i,
      /secret/i,
      /id_rsa/i,
    ];
    return blockedPatterns.some(pattern => pattern.test(path));
  }

  private redactSensitiveContent(content: string): string {
    const patterns = [
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
      /secret\s*[:=]\s*['"][^'"]+['"]/gi,
      /password\s*[:=]\s*['"][^'"]+['"]/gi,
      /token\s*[:=]\s*['"][^'"]+['"]/gi,
    ];

    let redacted = content;
    for (const pattern of patterns) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
    return redacted;
  }

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const languages: Record<string, string> = {
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      svelte: 'Svelte',
      py: 'Python',
      go: 'Go',
      rs: 'Rust',
      java: 'Java',
      css: 'CSS',
      html: 'HTML',
      md: 'Markdown',
      json: 'JSON',
      yaml: 'YAML',
      yml: 'YAML',
    };
    return languages[ext || ''] || 'Unknown';
  }

  private getLineContext(lines: string[], index: number): string {
    const start = Math.max(0, index - 2);
    const end = Math.min(lines.length, index + 3);
    return lines.slice(start, end).join('\n');
  }

  private getRelativeTime(date?: string): string {
    if (!date) return 'unknown';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}
```

---

## 12. Success Metrics

### Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Ticket Quality Score** | +30% improvement | Before/after comparison of ticket completeness |
| **Developer Clarification Requests** | -50% reduction | Count of follow-up questions per ticket |
| **Questions Anticipated** | 2-3 per ticket | AI asks clarifying questions before drafting |
| **Setup Completion Rate** | >80% | Started setups that complete successfully |
| **Setup Time** | <5 minutes | Time from start to successful connection |
| **Tool Calls per Conversation** | 3-5 average | Not too few (no value), not too many (annoying) |
| **Error Rate** | <1% | Tool call failures / total calls |

### Qualitative Metrics

| Metric | Collection Method |
|--------|-------------------|
| **PM Satisfaction** | Post-conversation survey |
| **Ticket Usefulness** | Developer feedback on tickets created with GitHub context |
| **Learning Effect** | PM self-reported improvement in anticipating questions |

### Health Monitoring

| Metric | Alert Threshold |
|--------|-----------------|
| **GitHub API errors** | >5% error rate |
| **Rate limit hits** | >10 per hour |
| **Connection failures** | >3 consecutive failures |
| **Token expiration** | Expiring within 7 days |

---

## 13. Future Enhancements

### Phase 2: Enhanced Code Understanding

| Enhancement | Description |
|-------------|-------------|
| **Semantic search** | Embed code for meaning-based search |
| **Dependency graph** | Understand import relationships |
| **Change impact analysis** | "What else might be affected?" |
| **Code summarization** | AI-generated summaries of complex files |

### Phase 3: Developer Persona

| Enhancement | Description |
|-------------|-------------|
| **Code generation** | Generate implementation code |
| **PR review context** | Understand PR in context of codebase |
| **Debugging assistance** | Explore code to understand bugs |
| **Refactoring suggestions** | Identify improvement opportunities |

### Phase 4: Write Operations

| Enhancement | Description |
|-------------|-------------|
| **Create issues** | AI drafts, PM approves, auto-creates |
| **Create branches** | Start implementation branches |
| **Create PRs** | Draft PRs with AI-generated descriptions |
| **Commit code** | AI-generated code commits (with approval) |

---

## Related Documents

- [INTEGRATIONS_ARCHITECTURE.md](./INTEGRATIONS_ARCHITECTURE.md) - Integration layer design
- [CONTEXT_STRATEGY.md](../CONTEXT_STRATEGY.md) - Context management approach
- [AI_RETRIEVAL_ARCHITECTURE.md](./AI_RETRIEVAL_ARCHITECTURE.md) - How AI accesses data

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| PM persona first | Clearer use case, proves value without code generation complexity | 2026-01-22 |
| Read-only V1 | Simpler permissions, lower risk, faster to ship | 2026-01-22 |
| Personal Access Token first | Faster implementation, GitHub App for production | 2026-01-22 |
| 50KB file limit | Balance between usefulness and context budget | 2026-01-22 |
| 5 tool calls per turn | Prevent excessive API usage, keep conversations flowing | 2026-01-22 |
| Show tool calls to user | Transparency builds trust, helps PM understand AI reasoning | 2026-01-22 |
| Progressive disclosure | Don't dump code; explore → summarize → ask → draft | 2026-01-22 |
