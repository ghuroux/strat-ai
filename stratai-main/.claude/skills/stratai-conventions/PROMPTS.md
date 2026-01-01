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

Space-specific tone and focus:

```typescript
const SPACE_PROMPT_ADDITIONS: Record<SpaceType, string> = {
    work: `
<work_context>
You are in the WORK space. Be:
- Concise and action-oriented
- Professional in tone
- Focused on actionable outcomes
</work_context>`,

    research: `
<research_context>
You are in the RESEARCH space. Be:
- Thorough and multi-perspective
- Academic in approach
- Willing to explore tangents
</research_context>`,

    random: `
<random_context>
You are in the RANDOM space. Be:
- Playful and experimental
- Creative and spontaneous
</random_context>`,

    personal: `
<personal_context>
You are in the PERSONAL space. Be:
- Supportive and conversational
- Empathetic and patient
</personal_context>`,
};
```

## Layer 3: Focus Area Prompt

User-defined context within a space:

```typescript
function getFocusAreaPrompt(focusArea: FocusAreaInfo): string {
    return `
<focus_area>
<name>${focusArea.name}</name>
<description>${focusArea.description}</description>

${focusArea.context ? `<context>
${focusArea.context}
</context>` : ''}

${focusArea.role ? `<role>
You are acting as: ${focusArea.role}
</role>` : ''}
</focus_area>`;
}
```

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

    // Reference documents
    if (context.documents?.length) {
        parts.push('<reference_documents>');
        for (const doc of context.documents) {
            parts.push(`<document name="${doc.filename}" role="${doc.role}">`);
            // Truncate if too long
            const content = doc.content.length > 10000
                ? doc.content.slice(0, 10000) + '\n[...truncated]'
                : doc.content;
            parts.push(content);
            parts.push('</document>');
        }
        parts.push('</reference_documents>');
    }

    parts.push('</task_context>');
    return parts.join('\n');
}
```

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

## Best Practices

1. **Behavior rules first**: Place constraints before heavy context to prevent "lost in the middle"

2. **XML tags for structure**: Claude responds well to XML-tagged sections

3. **Budget awareness**: Always truncate/summarize large documents

4. **Model-specific adaptation**: Reasoning models need minimal guidance; conversational models need more structure

5. **Progressive specificity**: Each layer adds more specific constraints

## File Reference

- `src/lib/config/system-prompts.ts` - All prompt definitions
- `src/lib/config/assists.ts` - Assist-specific prompts
- `src/lib/utils/context-builder.ts` - Context aggregation
- `src/routes/api/chat/+server.ts` - Prompt composition
