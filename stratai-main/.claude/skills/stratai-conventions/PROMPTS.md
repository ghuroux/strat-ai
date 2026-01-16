# Prompt Engineering Patterns

StratAI uses a layered prompt architecture for context-aware AI interactions.

## Layered Prompt Architecture

System prompts are composed in layers, from general to specific:

```
┌─────────────────────────────────────────┐
│ Layer 1: Platform Prompt (model-specific)│
├─────────────────────────────────────────┤
│ Layer 2: Space Prompt (Work/Research)   │
├─────────────────────────────────────────┤
│ Layer 3: Focus Area Prompt (context)    │
├─────────────────────────────────────────┤
│ Layer 4: Task Prompt (current work)     │
├─────────────────────────────────────────┤
│ Layer 5: Task Context (linked docs)     │
└─────────────────────────────────────────┘
```

Each layer adds more specific constraints while inheriting parent context.

## Layer 1: Platform Prompt

Model-specific base prompts in `src/lib/config/system-prompts.ts`:

```typescript
const PLATFORM_PROMPTS: Record<string, string> = {
    // Claude 4.x: Explicit, XML-tagged structure
    'claude': `You are a productivity partner...

<formatting_rules>
- Use markdown for structure
- Be concise but thorough
</formatting_rules>`,

    // GPT-5.x: Structured constraints
    'gpt-5': `You are a productivity assistant...`,

    // Reasoning models: Minimal guidance (let them think)
    'o1': `You are an expert assistant. Think step by step.`,
    'o3': `You are an expert assistant. Think step by step.`,
};
```

## Layer 2: Space Prompt

Space type and custom context with document summaries:

```typescript
// Current space types (as of 2026)
export type SpaceType = 'personal' | 'organization' | 'project';

// Space context includes user-provided text + document summaries
function getCustomSpacePrompt(space: SpaceInfo): string {
    let prompt = `
<space_context>
## Space: ${space.name}

You are working within the "${space.name}" space.`;

    // User-provided text context
    if (space.context) {
        prompt += `

### Space Context
${space.context}`;
    }

    // Document SUMMARIES (not full content - for token efficiency)
    if (space.contextDocuments?.length > 0) {
        prompt += `

### Reference Documents
The following document summaries provide context for this space:`;

        for (const doc of space.contextDocuments) {
            const sizeKb = Math.round(doc.charCount / 1000);
            prompt += `

<document_summary filename="${doc.filename}" size="${sizeKb}k chars">
${doc.summary || '[Summary pending - use read_document tool to access content]'}
</document_summary>`;
        }
    }

    prompt += `

**Guidelines:**
- Apply this space context to all responses
- Reference relevant context when helpful
- Use **read_document** tool to access full document content when you need specific details or quotes
- Stay focused on topics relevant to this space
</space_context>`;

    return prompt;
}
```

**Key Pattern**: Document **summaries** in prompts, full content via `read_document` tool.

## Layer 3: Focus Area Prompt

User-defined context within a space (with document summaries):

```typescript
function getFocusAreaPrompt(focusArea: FocusAreaInfo): string {
    let prompt = `
<focus_area_context>
## Focus Area: ${focusArea.name}
You are assisting within a specialized context called "${focusArea.name}".`;

    // User-provided text context
    if (focusArea.context) {
        prompt += `

### Background Context
${focusArea.context}`;
    }

    // Document SUMMARIES (not full content)
    if (focusArea.contextDocuments?.length > 0) {
        prompt += `

### Reference Documents
The following document summaries provide context for this focus area:`;

        for (const doc of focusArea.contextDocuments) {
            const sizeKb = Math.round(doc.charCount / 1000);
            prompt += `

<document_summary filename="${doc.filename}" size="${sizeKb}k chars">
${doc.summary || '[Summary pending - use read_document tool to access content]'}
</document_summary>`;
        }
    }

    prompt += `

**Your role:**
- Apply this specialized context to all responses
- Reference relevant background information when helpful
- Use **read_document** tool to access full document content when you need specific details or quotes
- Stay focused on topics relevant to this context
</focus_area_context>`;

    return prompt;
}
```

**Key Pattern**: Same as spaces - summaries in prompt, tool for full content.

## Layer 4: Task Prompt

Current task context for deep work:

```typescript
function getFocusedTaskPrompt(task: FocusedTaskInfo): string {
    const parts: string[] = [
        '<focused_task>',
        `<title>${task.title}</title>`,
    ];

    if (task.priority === 'high') {
        parts.push('<priority>HIGH PRIORITY</priority>');
    }

    if (task.dueDate) {
        parts.push(`<due_date>${task.dueDate}</due_date>`);
    }

    // Subtask context
    if (task.parentTaskTitle) {
        parts.push(`<parent_task>${task.parentTaskTitle}</parent_task>`);
    }

    // Planning summary injection
    if (task.planningSummary) {
        parts.push(`<planning_context>${task.planningSummary}</planning_context>`);
    }

    parts.push('</focused_task>');
    parts.push('<instruction>Focus on this specific task. Do not ask about other tasks.</instruction>');

    return parts.join('\n');
}
```

## Layer 5: Task Context

Linked documents and related tasks:

```typescript
// NOTE: Task-linked documents also use SUMMARIES, not full content
function buildTaskContextPrompt(context: TaskContextInfo): string {
    const parts: string[] = ['<task_context>'];

    // Related tasks
    if (context.relatedTasks?.length) {
        parts.push('<related_tasks>');
        for (const task of context.relatedTasks) {
            parts.push(`- [${task.status}] ${task.title}`);
            if (task.contextSummary) {
                parts.push(`  Summary: ${task.contextSummary}`);
            }
        }
        parts.push('</related_tasks>');
    }

    // Document summaries (consistent with space/area pattern)
    if (context.documents?.length) {
        parts.push('<reference_documents>');
        for (const doc of context.documents) {
            parts.push(`<document_summary filename="${doc.filename}" role="${doc.role}">`);
            // Use summary if available, otherwise note that tool should be used
            const summary = doc.summary || '[Use read_document tool to access content]';
            parts.push(summary);
            parts.push('</document_summary>');
        }
        parts.push('</reference_documents>');
        parts.push('Use **read_document** tool for full content when needed.');
    }

    parts.push('</task_context>');
    return parts.join('\n');
}
```

**Key Pattern**: Document summaries throughout all layers.

## Plan Mode Prompts

Phase-specific prompts for task planning:

```typescript
const PLAN_MODE_PHASES = {
    eliciting: `
<plan_mode phase="eliciting">
You are helping the user plan a task. Your goal is to understand:
1. What the task really entails
2. What outcomes they want
3. Any constraints or dependencies

Ask clarifying questions. Don't propose subtasks yet.
Limit: 2-3 questions per exchange.
</plan_mode>`,

    proposing: `
<plan_mode phase="proposing">
Based on the conversation, propose 3-7 concrete subtasks.
Format as a numbered list with clear, actionable items.
Each subtask should be completable in one session.
</plan_mode>`,

    confirming: `
<plan_mode phase="confirming">
The user is reviewing your proposed subtasks.
Help them refine, reorder, or adjust as needed.
When they confirm, summarize the final plan.
</plan_mode>`,
};
```

## Token Budget Management

Context is budget-aware to prevent overflow:

```typescript
const CONTEXT_BUDGETS = {
    systemPrompt: 2000,      // ~500 tokens
    taskContext: 50000,      // ~12.5k tokens
    documentPerFile: 10000,  // ~2.5k tokens per doc
};

function truncateToCharBudget(content: string, budget: number): string {
    if (content.length <= budget) return content;
    return content.slice(0, budget) + '\n[...truncated for length]';
}
```

## Prompt Composition

Final composition in API endpoint:

```typescript
function buildSystemPrompt(options: PromptOptions): string {
    const parts: string[] = [];

    // Layer 1: Platform
    parts.push(getPlatformPrompt(options.model));

    // Layer 2: Space (if applicable)
    if (options.space) {
        parts.push(getSpacePromptAddition(options.space));
    }

    // Layer 3: Focus Area (if applicable)
    if (options.focusArea) {
        parts.push(getFocusAreaPrompt(options.focusArea));
    }

    // Layer 4: Task (if applicable)
    if (options.focusedTask) {
        parts.push(getFocusedTaskPrompt(options.focusedTask));
    }

    // Layer 5: Context (if applicable)
    if (options.taskContext) {
        parts.push(buildTaskContextPrompt(options.taskContext));
    }

    // Plan Mode overlay (if applicable)
    if (options.planMode) {
        parts.push(PLAN_MODE_PHASES[options.planMode.phase]);
    }

    return parts.join('\n\n');
}
```

## Document Summary Pattern (NEW - 2026)

**Key Architecture Change**: Use document **summaries** in prompts, full content via `read_document` tool.

### Why Summaries?

1. **Token Efficiency**: 100KB doc → 500 char summary = 99% token reduction
2. **Tool Integration**: AI can request full content only when needed
3. **Layered Caching**: Summaries cache well, full docs accessed on-demand
4. **Better UX**: Faster first response (summaries load quickly)

### Implementation Pattern

```typescript
// In ALL layers (space, area, task context)
<document_summary filename="${doc.filename}" size="${sizeKb}k chars">
${doc.summary || '[Summary pending - use read_document tool to access content]'}
</document_summary>

// Always provide tool guidance
prompt += '- Use **read_document** tool to access full document content when you need specific details or quotes';
```

### Plan Mode Exception

In Plan Mode, prompt restructuring prevents "lost in the middle":

```typescript
// Structure: Platform → Plan Mode Instructions → Minimal Context
// Plan Mode rules come FIRST, before any context
return `${platformPrompt}\n${planModePrompt}${minimalContextNote}`;
```

**Why**: Heavy document context can cause AI to ignore Plan Mode instructions if they come at the end.

## Best Practices

1. **Document summaries everywhere**: Never embed full document content in prompts (use tool)

2. **Behavior rules first**: Place constraints before heavy context to prevent "lost in the middle"

3. **XML tags for structure**: Claude responds well to XML-tagged sections

4. **Budget awareness**: Summaries for prompt, tool for full content

5. **Model-specific adaptation**: Reasoning models need minimal guidance; conversational models need more structure

6. **Progressive specificity**: Each layer adds more specific constraints

7. **Tool integration**: Always mention `read_document` tool availability when documents are present

## File Reference

- `src/lib/config/system-prompts.ts` - All prompt definitions
- `src/lib/config/assists.ts` - Assist-specific prompts
- `src/lib/utils/context-builder.ts` - Context aggregation
- `src/routes/api/chat/+server.ts` - Prompt composition
