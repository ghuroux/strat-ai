/**
 * Platform-level system prompt configuration
 * Model-aware prompts optimized for Claude 4.x and GPT-5.x (December 2025)
 *
 * Key insights from research:
 * - Claude 4.x: Requires explicit, specific instructions; responds well to XML tags
 * - GPT-5.x: Benefits from structured XML containers; uses adaptive reasoning
 * - Reasoning models (o1/o3/o4): Prefer minimal prompts; avoid "think step by step"
 */

import type { SpaceType } from "$lib/types/chat";
import type { TaskContextInfo } from "$lib/utils/context-builder";
import type { SkillContext } from "$lib/types/skills";

// ============================================================================
// TEMPORAL CONTEXT
// ============================================================================
// Provides current date and timezone information for AI temporal awareness

/** Default timezone when user preference is not set */
const DEFAULT_TIMEZONE = "Africa/Johannesburg";

/**
 * Generate temporal context for injection into system prompts.
 * This enables the AI to answer date-relative questions accurately.
 *
 * @param timezone - IANA timezone string (e.g., 'Africa/Johannesburg', 'America/New_York')
 *                   Defaults to 'Africa/Johannesburg' (SAST) if not provided
 * @returns Temporal context wrapped in XML tags for prompt injection
 *
 * @example
 * getTemporalContext() // Uses default Africa/Johannesburg
 * getTemporalContext('America/New_York') // Uses Eastern Time
 *
 * Output format:
 * <temporal_context>
 * Current date: Thursday, January 16, 2026
 * Timezone: South Africa Standard Time
 * </temporal_context>
 */
export function getTemporalContext(timezone?: string): string {
  const tz = timezone || DEFAULT_TIMEZONE;

  // Get current date/time in the specified timezone
  const now = new Date();

  // Format date as "Thursday, January 16, 2026" (long format with day of week)
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedDate = dateFormatter.format(now);

  // Format time as "6:17 PM" in the user's timezone
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const formattedTime = timeFormatter.format(now);

  // Get timezone display name (e.g., "South Africa Standard Time")
  // Use timeZoneName: 'long' to get the full display name
  const tzNameFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "long",
  });
  const tzParts = tzNameFormatter.formatToParts(now);
  const timeZoneName =
    tzParts.find((part) => part.type === "timeZoneName")?.value || tz;

  return `<temporal_context>
Current date: ${formattedDate}
Current time: ${formattedTime}
Timezone: ${timeZoneName}
</temporal_context>`;
}

/**
 * Claude 4.x optimized prompt (Opus 4.5, Sonnet 4.5, Haiku 4.5)
 *
 * Best practices applied:
 * - Be explicit and specific (Claude 4.x is more precise)
 * - Add context/motivation to instructions
 * - Use clear structure with sections
 * - Default to action rather than suggestions
 * - Avoid words like "think" when extended thinking is disabled
 */
export const CLAUDE_4_PROMPT = `You are a helpful, knowledgeable AI assistant.

<guidelines>
## Communication
- Be direct and concise - get to the point without unnecessary preamble
- Match the user's tone (casual for chat, professional for work tasks)
- Avoid excessive caveats or over-qualifying statements
- When uncertain, acknowledge it honestly rather than guessing

## Response Quality
- Provide accurate, well-reasoned responses
- For complex topics, structure your response with clear sections
- Include relevant context and explanations when helpful
- Go beyond the basics when the task warrants depth

## Code & Technical Content
- Write clean, readable code with appropriate comments
- Explain your approach when showing code solutions
- Consider edge cases and error handling
- Use modern best practices for the language/framework
- Implement changes directly rather than only suggesting them

## Format
- Use markdown formatting for readability when appropriate
- Use code blocks with language tags for code snippets
- Use bullet points or numbered lists for multiple items
- Keep responses appropriately sized - comprehensive but not verbose
</guidelines>

<default_behavior>
By default, implement solutions rather than only suggesting approaches. If the user's intent is unclear, infer the most useful likely action and proceed. Provide complete, working solutions when possible.
</default_behavior>`;

/**
 * GPT-5.x optimized prompt (GPT-5, GPT-5.1, GPT-5.2)
 *
 * Best practices applied:
 * - Use structured XML tags for different sections
 * - Distinguish hard constraints from soft preferences
 * - Clear task structure that works with adaptive reasoning
 * - Avoid contradictions in instructions
 */
export const GPT_5_PROMPT = `You are a helpful, knowledgeable AI assistant.

<task_spec>
Assist users with questions, tasks, and creative work. Provide accurate, helpful, and well-structured responses.
</task_spec>

<guidelines>
## Communication Style
- Be direct and concise - get to the point without unnecessary preamble
- Match the user's tone (casual for chat, professional for work tasks)
- Avoid excessive caveats or over-qualifying statements
- When uncertain, acknowledge it honestly

## Response Quality
- Provide accurate, well-reasoned responses
- For complex topics, structure your response with clear sections
- Include relevant context and explanations when helpful
- Adapt response depth to task complexity

## Code & Technical Content
- Write clean, readable code with appropriate comments
- Explain your approach when showing code solutions
- Consider edge cases and error handling
- Use modern best practices for the language/framework

## Format
- Use markdown formatting for readability when appropriate
- Use code blocks with language tags for code snippets
- Use bullet points or numbered lists for multiple items
- Keep responses appropriately sized - comprehensive but not verbose
</guidelines>

<constraints>
- Acknowledge uncertainty rather than guessing
- Provide working solutions rather than incomplete sketches
- Cite sources when making factual claims about recent events
</constraints>`;

/**
 * GPT-4o / GPT-4.1 prompt (legacy but still widely used)
 * These models follow instructions literally and benefit from detail
 */
export const GPT_4_PROMPT = `You are a helpful, knowledgeable AI assistant.

## Guidelines

### Communication Style
- Be direct and concise - get to the point without unnecessary preamble
- Use clear, natural language appropriate for the context
- Match the user's tone (casual for chat, professional for work tasks)
- Avoid excessive caveats, hedging, or over-qualifying statements

### Response Quality
- Provide accurate, well-reasoned responses
- When uncertain, acknowledge it honestly rather than guessing
- For complex topics, structure your response with clear sections
- Include relevant context and explanations when helpful

### Code & Technical Content
- Write clean, readable code with appropriate comments
- Explain your approach when showing code solutions
- Consider edge cases and error handling
- Use modern best practices for the language/framework

### Format
- Use markdown formatting for readability when appropriate
- Use code blocks with language tags for code snippets
- Use bullet points or numbered lists for multiple items
- Keep responses appropriately sized - comprehensive but not verbose`;

/**
 * Minimal prompt for reasoning models (o1, o3, o4 series)
 *
 * Research findings:
 * - Keep prompts concise and direct
 * - Do NOT use "think step by step" or chain-of-thought triggers
 * - Minimal few-shot examples (they degrade performance)
 * - Let the model reason internally without explicit guidance
 */
export const REASONING_MODEL_PROMPT =
  "You are a helpful AI assistant. Be direct and accurate.";

/**
 * Model family detection utilities
 */

type ModelFamily = "claude-4" | "gpt-5" | "gpt-4" | "reasoning" | "other";

/**
 * Detect the model family from model name
 */
export function getModelFamily(model: string): ModelFamily {
  if (!model) return "other";
  const lowerModel = model.toLowerCase();

  // OpenAI Reasoning models (o1, o3, o4 series) - check first
  // Must exclude gpt-4o which is NOT a reasoning model
  if (!lowerModel.includes("gpt-4o") && !lowerModel.includes("gpt-5")) {
    if (
      lowerModel.startsWith("o1") ||
      lowerModel.startsWith("o3") ||
      lowerModel.startsWith("o4") ||
      lowerModel.includes("/o1") ||
      lowerModel.includes("/o3") ||
      lowerModel.includes("/o4")
    ) {
      return "reasoning";
    }
  }

  // Claude 4.x models (Opus 4.5, Sonnet 4.5, Haiku 4.5, Sonnet 4, etc.)
  if (
    lowerModel.includes("claude-opus-4") ||
    lowerModel.includes("claude-sonnet-4") ||
    lowerModel.includes("claude-haiku-4") ||
    lowerModel.includes("claude-4") ||
    // Also match claude-3-7 which is part of the 4.x era
    lowerModel.includes("claude-3-7")
  ) {
    return "claude-4";
  }

  // GPT-5.x models
  if (
    lowerModel.includes("gpt-5") ||
    lowerModel.includes("gpt5") ||
    lowerModel.includes("codex-max") ||
    lowerModel.includes("codex-mini")
  ) {
    return "gpt-5";
  }

  // GPT-4.x models (including gpt-4o, gpt-4.1)
  if (lowerModel.includes("gpt-4") || lowerModel.includes("gpt4")) {
    return "gpt-4";
  }

  // Older Claude models (3.5, 3, etc.)
  if (lowerModel.includes("claude")) {
    return "claude-4"; // Use Claude 4 prompt as fallback for older models
  }

  return "other";
}

/**
 * Get the appropriate system prompt for a given model
 * Returns model-family-optimized prompt
 */
export function getPlatformPrompt(model: string): string {
  const family = getModelFamily(model);

  switch (family) {
    case "reasoning":
      return REASONING_MODEL_PROMPT;
    case "claude-4":
      return CLAUDE_4_PROMPT;
    case "gpt-5":
      return GPT_5_PROMPT;
    case "gpt-4":
      return GPT_4_PROMPT;
    default:
      // Default to GPT-4 style for unknown models
      return GPT_4_PROMPT;
  }
}

/**
 * Check if a model is a reasoning model (o1/o3/o4 series)
 */
export function isReasoningModel(model: string): boolean {
  return getModelFamily(model) === "reasoning";
}

/**
 * Check if a model is Claude 4.x (supports extended thinking, etc.)
 */
export function isClaude4Model(model: string): boolean {
  return getModelFamily(model) === "claude-4";
}

/**
 * Check if a model is GPT-5.x
 */
export function isGpt5Model(model: string): boolean {
  return getModelFamily(model) === "gpt-5";
}

/**
 * Get prompt metadata for debugging/logging
 */
export function getPromptInfo(model: string): {
  family: ModelFamily;
  promptLength: number;
} {
  const family = getModelFamily(model);
  const prompt = getPlatformPrompt(model);
  return {
    family,
    promptLength: prompt.length,
  };
}

/**
 * Space-specific prompt additions
 * These are appended to the platform prompt when the user is in a specific space
 */
export const SPACE_PROMPT_ADDITIONS: Record<SpaceType, string> = {
  work: `
<space_context>
## Work Space Context
You are assisting in a professional work environment. Adjust your responses accordingly:
- Be concise and action-oriented - time is valuable
- Focus on productivity and practical outcomes
- Use professional language appropriate for workplace communication
- Prioritize clarity and efficiency in explanations
- When drafting communications, maintain professional tone
- For meeting notes and status updates, structure information clearly
</space_context>`,

  research: `
<space_context>
## Research Space Context
You are assisting with research and exploration. Adjust your approach accordingly:
- Be thorough and consider multiple perspectives
- Provide nuanced analysis with supporting evidence
- Cite sources and note limitations when relevant
- Encourage deeper exploration of topics
- Synthesize information from multiple angles
- Balance depth with accessibility in explanations
</space_context>`,

  random: `
<space_context>
## Experimental Space Context
This is a space for experimentation and casual exploration:
- Feel free to be more creative and playful
- Experiment with ideas without constraints
- Explore tangential thoughts and what-ifs
- Less structure is fine - go with the flow
</space_context>`,

  personal: `
<space_context>
## Personal Space Context
This is a personal, private space for the user:
- Be supportive and conversational
- Maintain discretion and privacy awareness
- Adapt to personal preferences over time
- Balance helpfulness with respect for boundaries
</space_context>`,
};

/**
 * Document content for context injection
 * Includes optional summary for cost-efficient context (summaries in prompt, full content via tool)
 */
export interface ContextDocument {
  id: string;
  filename: string;
  content: string;
  charCount: number;
  summary?: string; // ~200 token summary for context; use read_document tool for full content
  contentType?: 'text' | 'image'; // Type of content (text = extractable, image = base64 for vision)
  mimeType?: string; // MIME type for images (e.g., 'image/jpeg', 'image/png')
}

/**
 * Space information for custom space context injection
 */
export interface SpaceInfo {
  id: string;
  name: string;
  slug: string;
  type: "system" | "custom";
  context?: string; // User-provided markdown context
  contextDocuments?: ContextDocument[]; // Documents attached to this space (uses ContextDocument type)
}

/**
 * Get the space-specific prompt addition for a given space
 * For system spaces, uses the predefined prompts
 * For custom spaces, uses the user-provided context
 */
export function getSpacePromptAddition(
  space: SpaceType | null | undefined,
): string {
  if (!space) return "";
  return SPACE_PROMPT_ADDITIONS[space] || "";
}

/**
 * Generate a prompt for a space with user-provided context
 * Uses document summaries for cost efficiency; full content available via read_document tool
 * Image documents are listed separately and injected visually into context
 */
export function getCustomSpacePrompt(space: SpaceInfo): string {
  // Check if there's any context to add
  const hasContext =
    space.context ||
    (space.contextDocuments && space.contextDocuments.length > 0);
  if (!hasContext) return "";

  // Separate text and image documents
  const textDocs = space.contextDocuments?.filter(doc => doc.contentType !== 'image') || [];
  const imageDocs = space.contextDocuments?.filter(doc => doc.contentType === 'image') || [];

  let prompt = `
<space_context>
## Space: ${space.name}

You are working within the "${space.name}" space.`;

  // Add text context if present
  if (space.context) {
    prompt += `

### Space Context
${space.context}`;
  }

  // Include reference document summaries for TEXT documents
  // Full content available via read_document tool for detailed analysis
  if (textDocs.length > 0) {
    prompt += `

### Reference Documents
The following document summaries provide context for this space:`;

    for (const doc of textDocs) {
      const sizeKb = Math.round(doc.charCount / 1000);
      prompt += `

<document_summary filename="${doc.filename}" size="${sizeKb}k chars">
${doc.summary || "[Summary pending - use read_document tool to access content]"}
</document_summary>`;
    }
  }

  // List image documents with descriptions (they're also injected visually)
  if (imageDocs.length > 0) {
    prompt += `

### Reference Images
The following images are included in the conversation context:`;
    for (const doc of imageDocs) {
      if (doc.summary) {
        // Show AI-generated description
        prompt += `

**${doc.filename}**
${doc.summary}`;
      } else {
        // No description yet (processing or failed)
        prompt += `
- ${doc.filename} [Image - visual content included above]`;
      }
    }
  }

  // Build guidelines based on document types
  const hasTextDocs = textDocs.length > 0;
  const hasImageDocs = imageDocs.length > 0;

  prompt += `

**Guidelines:**
- Apply this space context to all responses
- Reference relevant context when helpful`;

  if (hasTextDocs) {
    prompt += `
- Use **read_document** tool to access full document content when you need specific details or quotes`;
  }
  if (hasImageDocs) {
    prompt += `
- Reference the images when they're relevant to the user's question
- Image descriptions are provided above; the full images are visible in the conversation`;
  }
  prompt += `
- Stay focused on topics relevant to this space
</space_context>`;

  return prompt;
}

/**
 * Get the full system prompt for a model and optional space context
 * Combines platform-optimized prompt with space-specific additions
 */
export function getFullSystemPrompt(
  model: string,
  space?: SpaceType | null,
  timezone?: string,
): string {
  const temporalContext = getTemporalContext(timezone);
  const platformPrompt = getPlatformPrompt(model);
  const spaceAddition = getSpacePromptAddition(space);

  if (!spaceAddition) {
    return `${temporalContext}\n${platformPrompt}`;
  }

  return `${temporalContext}\n${platformPrompt}\n${spaceAddition}`;
}

/**
 * Get the full system prompt with custom space context
 * Used when a custom space has user-provided context
 */
export function getFullSystemPromptWithSpace(
  model: string,
  space: SpaceInfo,
  timezone?: string,
): string {
  const temporalContext = getTemporalContext(timezone);
  const platformPrompt = getPlatformPrompt(model);

  if (space.type === "system") {
    // Use predefined prompts for system spaces
    const spaceAddition = getSpacePromptAddition(space.slug as SpaceType);
    if (!spaceAddition) {
      return `${temporalContext}\n${platformPrompt}`;
    }
    return `${temporalContext}\n${platformPrompt}\n${spaceAddition}`;
  }

  // For custom spaces, use the user-provided context
  const customSpacePrompt = getCustomSpacePrompt(space);
  if (!customSpacePrompt) {
    return `${temporalContext}\n${platformPrompt}`;
  }

  return `${temporalContext}\n${platformPrompt}\n${customSpacePrompt}`;
}

/**
 * Focus area information for context injection
 * Inherits space context while adding specialized context
 */
export interface FocusAreaInfo {
  id: string;
  name: string;
  context?: string; // Markdown context content
  contextDocuments?: ContextDocument[]; // Documents attached to this focus area
  spaceId: string;
  skills?: SkillContext[]; // Active skills for this area
}

/**
 * Focused task information for context injection
 */
export interface FocusedTaskInfo {
  title: string;
  priority: "normal" | "high";
  dueDate?: string;
  dueDateType?: "hard" | "soft";
  // Subtask context for injecting planning conversation
  isSubtask?: boolean;
  parentTaskTitle?: string;
  sourceConversationId?: string; // Plan Mode conversation ID for context injection
  planningConversationSummary?: string; // Summary of the planning conversation (injected by API)
}

// ============================================================================
// SKILLS PROMPT INJECTION
// ============================================================================

/**
 * Token budget for skills in the system prompt.
 * Skills within this budget get full injection; overflow gets summary-only.
 */
const SKILL_TOKEN_BUDGET = 3000;

/**
 * Skills with content under this threshold (in estimated tokens) are injected in full.
 * Larger skills get summary + read_skill instruction.
 */
const FULL_INJECTION_THRESHOLD = 800;

/**
 * Rough token estimate: ~4 chars per token for English text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate the skills prompt block for system prompt injection.
 *
 * Implements hybrid injection strategy from SKILLS.md Section 7:
 * - Sort: always-active first, shorter first, ID tiebreaker (cache stability)
 * - Skills ≤ FULL_INJECTION_THRESHOLD tokens AND within budget → full content
 * - Over threshold or budget → summary only + read_skill instruction
 */
export function getSkillsPrompt(skills: SkillContext[]): string {
  if (skills.length === 0) return '';

  // Sort: always-active first, then shorter content first, then by ID for cache stability
  const sorted = [...skills].sort((a, b) => {
    // always > trigger > manual
    const modeOrder = { always: 0, trigger: 1, manual: 2 };
    const modeDiff = (modeOrder[a.activationMode] ?? 2) - (modeOrder[b.activationMode] ?? 2);
    if (modeDiff !== 0) return modeDiff;

    // Shorter content first (more likely to fit in budget)
    const lenDiff = a.content.length - b.content.length;
    if (lenDiff !== 0) return lenDiff;

    // Stable tiebreaker
    return a.id.localeCompare(b.id);
  });

  let budgetRemaining = SKILL_TOKEN_BUDGET;
  let prompt = `

### Active Skills
<active_skills count="${sorted.length}">`;

  for (const skill of sorted) {
    const contentTokens = estimateTokens(skill.content);

    if (contentTokens <= FULL_INJECTION_THRESHOLD && contentTokens <= budgetRemaining) {
      // Full injection — content fits in budget
      prompt += `

<skill name="${skill.name}" injection="full" mode="${skill.activationMode}">
${skill.content}
</skill>`;
      budgetRemaining -= contentTokens;
    } else {
      // Summary injection — too large or budget exhausted
      const summaryText = skill.summary || skill.description;
      prompt += `

<skill name="${skill.name}" injection="summary" mode="${skill.activationMode}">
${summaryText}
[Use read_skill tool with skill_name="${skill.name}" to access full methodology]
</skill>`;
      budgetRemaining -= estimateTokens(summaryText);
    }
  }

  prompt += `
</active_skills>`;

  return prompt;
}

/**
 * Generate prompt addition for focus area context
 * Focus areas provide specialized context within a space
 * Uses document summaries for cost efficiency; full content available via read_document tool
 * Image documents are listed separately and injected visually into context
 */
export function getFocusAreaPrompt(focusArea: FocusAreaInfo): string {
  // Separate text documents, image documents, and pages
  const pageDocs = focusArea.contextDocuments?.filter(doc => doc.filename.startsWith('[Page] ')) || [];
  const textDocs = focusArea.contextDocuments?.filter(doc => doc.contentType !== 'image' && !doc.filename.startsWith('[Page] ')) || [];
  const imageDocs = focusArea.contextDocuments?.filter(doc => doc.contentType === 'image') || [];

  let prompt = `
<focus_area_context>
## Focus Area: ${focusArea.name}
You are assisting within a specialized context called "${focusArea.name}".`;

  if (focusArea.context) {
    prompt += `

### Background Context
${focusArea.context}`;
  }

  // Include reference document summaries for TEXT documents
  // Full content available via read_document tool for detailed analysis
  if (textDocs.length > 0) {
    prompt += `

### Reference Documents
The following document summaries provide context for this focus area:`;

    for (const doc of textDocs) {
      const sizeKb = Math.round(doc.charCount / 1000);
      prompt += `

<document_summary filename="${doc.filename}" size="${sizeKb}k chars">
${doc.summary || "[Summary pending - use read_document tool to access content]"}
</document_summary>`;
    }
  }

  // List image documents with descriptions (they're also injected visually)
  if (imageDocs.length > 0) {
    prompt += `

### Reference Images
The following images are included in the conversation context:`;
    for (const doc of imageDocs) {
      if (doc.summary) {
        // Show AI-generated description
        prompt += `

<image_description filename="${doc.filename}">
${doc.summary}
</image_description>`;
      } else {
        // No description yet (processing or failed)
        prompt += `
- ${doc.filename} [Image - visual content included above]`;
      }
    }
  }

  // Include finalized pages as authoritative context
  if (pageDocs.length > 0) {
    prompt += `

### Finalized Pages
The following team pages provide authoritative context:`;
    for (const page of pageDocs) {
      const title = page.filename.replace('[Page] ', '');
      const sizeKb = Math.round(page.charCount / 1000);
      prompt += `

<page_summary title="${title}" size="${sizeKb}k chars">
${page.summary || "[Use read_document tool to access content]"}
</page_summary>`;
    }
  }

  // Include active skills
  const hasSkills = (focusArea.skills?.length ?? 0) > 0;
  if (hasSkills) {
    prompt += getSkillsPrompt(focusArea.skills!);
  }

  // Build role guidelines based on document types
  const hasTextDocs = textDocs.length > 0;
  const hasImageDocs = imageDocs.length > 0;
  const hasPages = pageDocs.length > 0;

  prompt += `

**Your role:**
- Apply this specialized context to all responses
- Reference relevant background information when helpful`;

  if (hasTextDocs || hasPages) {
    prompt += `
- Use **read_document** tool to access full content of documents or pages when you need specific details or quotes`;
  }
  if (hasImageDocs) {
    prompt += `
- Reference the images when they're relevant to the user's question
- Image descriptions are provided above; the full images are visible in the conversation`;
  }
  if (hasPages) {
    prompt += `
- Finalized pages are authoritative team content — treat them as reliable reference material`;
  }
  if (hasSkills) {
    prompt += `
- For summarized skills, use **read_skill** tool to access full methodology before applying`;
  }
  prompt += `
- Stay focused on topics relevant to this context
- If the user asks about unrelated topics, you can still help but acknowledge it's outside this focus area
</focus_area_context>`;

  return prompt;
}

/**
 * Get the space prompt addition for a focus area
 * Uses the focus area's parent space to get the appropriate space context
 */
export function getSpacePromptForFocusArea(focusArea: FocusAreaInfo): string {
  return getSpacePromptAddition(focusArea.spaceId as SpaceType);
}

/**
 * Get the full system prompt with focus area context
 * Combines: Temporal → Platform → Space → Focus Area
 */
export function getFullSystemPromptWithFocusArea(
  model: string,
  focusArea: FocusAreaInfo,
  timezone?: string,
): string {
  const temporalContext = getTemporalContext(timezone);
  const platformPrompt = getPlatformPrompt(model);
  const spaceAddition = getSpacePromptForFocusArea(focusArea);
  const focusAreaPrompt = getFocusAreaPrompt(focusArea);

  return `${temporalContext}\n${platformPrompt}${spaceAddition}\n${focusAreaPrompt}`;
}

/**
 * Generate prompt addition for focused task context
 * This helps the AI understand what the user is working on and provide relevant assistance
 * For subtasks, includes planning conversation context if available
 */
export function getFocusedTaskPrompt(task: FocusedTaskInfo): string {
  const priorityNote = task.priority === "high" ? " (high priority)" : "";
  let dueDateNote = "";

  if (task.dueDate) {
    const type = task.dueDateType === "hard" ? "hard deadline" : "target";
    dueDateNote = `\nDue: ${task.dueDate} (${type})`;
  }

  // For subtasks, add parent task context and planning conversation summary
  let subtaskContext = "";
  if (task.isSubtask && task.parentTaskTitle) {
    subtaskContext = `\n\nThis is a subtask of: "${task.parentTaskTitle}"`;
    if (task.planningConversationSummary) {
      subtaskContext += `

<planning_context>
## Context from Task Planning
The following is a summary of the planning conversation where this subtask was defined. Use this context to understand what the user wants to accomplish.

${task.planningConversationSummary}
</planning_context>`;
    }
  }

  return `
<focus_context>
## Current Task Focus
The user is focused on: "${task.title}"${priorityNote}${dueDateNote}${subtaskContext}

**Your role:**
- Help them make progress on "${task.title}" specifically
- Be concise and action-oriented
- Ask clarifying questions only if needed to move forward
- If they seem stuck, offer a concrete next step
- Keep responses focused on this task unless they change topics
${task.isSubtask ? "- Reference the planning context when relevant to show continuity" : ""}

**Do NOT:**
- Ask about other tasks or projects
- Provide lengthy explanations unless requested
- Overwhelm with multiple options
${task.isSubtask ? "- Repeat information already established in the planning conversation" : ""}
</focus_context>`;
}

/**
 * Get the full system prompt including focus area and task context
 * Context chain: Platform → Space → Focus Area → Task
 * Used when a user is focused on a specific task, optionally within a focus area
 */
export function getFullSystemPromptWithTask(
  model: string,
  space: SpaceType | null | undefined,
  focusedTask: FocusedTaskInfo | null | undefined,
  focusArea?: FocusAreaInfo | null,
): string {
  let prompt: string;

  if (focusArea) {
    // Use focus area context (which includes space context)
    prompt = getFullSystemPromptWithFocusArea(model, focusArea);
  } else {
    // Just platform + space context
    prompt = getFullSystemPrompt(model, space);
  }

  if (focusedTask) {
    prompt += "\n" + getFocusedTaskPrompt(focusedTask);
  }

  return prompt;
}

/**
 * Plan Mode prompts for guided task breakdown
 * Used when user clicks "Help me plan this" on a focused task
 */
export type PlanModePhase = "eliciting" | "proposing" | "confirming";

/**
 * Task metadata for Plan Mode context
 */
export interface PlanModeTaskContext {
  title: string;
  description?: string; // User-provided background/context for the task
  priority: "normal" | "high";
  dueDate?: Date | null;
  dueDateType?: "hard" | "soft" | null;
  createdAt: Date;
}

/**
 * Format a date in a human-friendly way relative to today
 */
function formatRelativeDate(date: Date, today: Date): string {
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return `${overdueDays} day${overdueDays !== 1 ? "s" : ""} overdue`;
  } else if (diffDays === 0) {
    return "today";
  } else if (diffDays === 1) {
    return "tomorrow";
  } else if (diffDays <= 7) {
    return `in ${diffDays} days`;
  } else if (diffDays <= 14) {
    return `in about ${Math.ceil(diffDays / 7)} week${diffDays > 7 ? "s" : ""}`;
  } else {
    return `in ${diffDays} days (${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
  }
}

/**
 * Generate smart opener guidance based on task metadata
 * This helps the AI craft contextually relevant first questions
 */
function getOpenerGuidance(
  taskContext: PlanModeTaskContext | undefined,
  today: Date,
): string {
  if (!taskContext) {
    return `**Opener Focus:** Fresh task - ask what prompted this and what "done" looks like.`;
  }

  const taskAge = Math.floor(
    (today.getTime() - taskContext.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  let daysUntilDue: number | null = null;
  if (taskContext.dueDate) {
    daysUntilDue = Math.ceil(
      (taskContext.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  // Priority order: urgency > overdue > old task > high priority > default
  if (daysUntilDue !== null && daysUntilDue <= 0) {
    return `**Opener Focus:** This task is OVERDUE. Acknowledge empathetically, ask if urgency has shifted or if it's still pressing.`;
  }

  if (daysUntilDue !== null && daysUntilDue <= 1) {
    return `**Opener Focus:** Due ${daysUntilDue === 0 ? "TODAY" : "TOMORROW"}. Be crisp - ask what the ONE essential deliverable is.`;
  }

  if (daysUntilDue !== null && daysUntilDue <= 3) {
    return `**Opener Focus:** Due in ${daysUntilDue} days. Ask what "done" looks like and what's already in progress.`;
  }

  if (taskAge >= 7) {
    return `**Opener Focus:** Task created ${taskAge} days ago. Ask what's been the blocker - complexity, other priorities, or unclear scope?`;
  }

  if (taskContext.priority === "high") {
    return `**Opener Focus:** Marked as high priority. Ask what's driving that - impact, visibility, or downstream dependencies?`;
  }

  return `**Opener Focus:** Ask what prompted this task and what success looks like.`;
}

/**
 * Get Plan Mode system prompt based on current phase
 * Now includes task metadata for time/priority awareness and exchange count
 *
 * Phases:
 * - eliciting: Ask clarifying questions to understand scope
 * - proposing: Generate 3-7 actionable subtasks
 * - confirming: Await user confirmation (minimal AI involvement)
 */
export function getPlanModePrompt(
  taskTitle: string,
  phase: PlanModePhase,
  taskContext?: PlanModeTaskContext,
  exchangeCount: number = 0,
): string {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build task metadata section
  let taskMetadata = "";
  if (taskContext) {
    const parts: string[] = [];

    // Priority
    if (taskContext.priority === "high") {
      parts.push("**Priority:** High (flagged as important)");
    }

    // Due date with relative context
    if (taskContext.dueDate) {
      const relativeDate = formatRelativeDate(taskContext.dueDate, today);
      const deadlineType =
        taskContext.dueDateType === "hard"
          ? "(hard deadline - cannot slip)"
          : "(target date - flexible)";
      parts.push(`**Due:** ${relativeDate} ${deadlineType}`);
    }

    // Task age
    const taskAge = Math.floor(
      (today.getTime() - taskContext.createdAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (taskAge > 0) {
      parts.push(`**Created:** ${taskAge} day${taskAge !== 1 ? "s" : ""} ago`);
    } else {
      parts.push("**Created:** Today");
    }

    if (parts.length > 0) {
      taskMetadata = `\n${parts.join("\n")}`;
    }
  }

  // Build description section if provided
  const descriptionSection = taskContext?.description
    ? `\n\n**User's Background/Context:**\n${taskContext.description}`
    : "";

  const baseContext = `
<plan_mode>
## Planning Mode

**Today:** ${todayStr}

**Task:** "${taskTitle}"${taskMetadata}${descriptionSection}

You are a planning partner helping the user break down this task into focused, manageable pieces. Your goal is to reduce their cognitive load - make planning feel effortless, not overwhelming.
</plan_mode>`;

  switch (phase) {
    case "eliciting":
      // Generate smart opener guidance based on task metadata
      const openerGuidance = getOpenerGuidance(taskContext, today);

      // For exchanges 2+, use softer prompt that allows offering to propose
      if (exchangeCount >= 2) {
        return `${baseContext}

<understanding_rules>
## Building Understanding (Exchange ${exchangeCount})

You've had ${exchangeCount} exchange(s) with the user. You're making progress.

**Your response MUST be ONE of these two patterns:**

**Pattern A - Ask a follow-up question:**
"[One sentence acknowledging what they shared]. [One specific follow-up question]?"

**Pattern B - Offer to propose (only if you understand their angle):**
"[One sentence synthesis]. I think I have a good picture - ready for me to suggest a breakdown?"

**HARD CONSTRAINTS - THESE ARE NON-NEGOTIABLE:**
- MAXIMUM 300 CHARACTERS total
- Choose Pattern A OR Pattern B, not both
- NO numbered lists, bullet points, or tables
- NO frameworks, generic advice, or summaries
- NO lengthy explanations or caveats
- If using Pattern A: ONE follow-up question only
- If using Pattern B: End with the exact phrase "ready for me to suggest a breakdown?"

**Bad responses (will be rejected):**
- "Let me summarize what I'm hearing..." (too long, not a pattern)
- "Here are some things to consider..." (framework dump)
- "Based on the documents, I can see..." (document summary)

**Tone:** Efficient colleague who respects their time.
</understanding_rules>`;
      }

      // First 1-2 exchanges: strict elicitation prompt
      return `${baseContext}

<brief_response_format>
## Elicitation Phase - Understand Before Proposing

Your response will be displayed in a chat interface with limited space.
Keep responses concise to maintain conversational flow. Long responses lose user engagement.

<document_instruction>
If reference documents are available: call the read_document tool FIRST.
Use specific details from documents to show you've engaged with their preparation.
</document_instruction>

${openerGuidance}

<response_structure>
Write exactly three parts in flowing prose (not a list):
1. ONE sentence citing specific details from the document or task description (names, dates, numbers, locations)
2. ONE focused question about their priorities, concerns, or constraints
3. Brief invitation: "What else should I know?"
</response_structure>

<example_good>
"The Ironman 70.3 on May 9th with 4 racing and 2 supporting - solid crew. What's your main concern: race logistics, or keeping the supporters entertained? What else?"
</example_good>

<example_bad>
"I see you have a document attached. What are you trying to accomplish?"
↑ FAILS: Generic acknowledgment without specific details from document
</example_bad>

<constraints>
1. Stay under 400 characters total
2. Write in prose, not lists or bullets
3. Ask only ONE question
4. Reference SPECIFIC details (names, dates, locations, numbers)
5. Conversational tone - capable colleague, not assistant
</constraints>

<checklist_before_responding>
✓ Read documents first (if available)
✓ Opening sentence cites specific details
✓ Single focused question included
✓ Ends with "What else should I know?" or similar
✓ Total response under 400 characters
</checklist_before_responding>
</brief_response_format>`;

    case "proposing":
      // Adjust guidance based on deadline urgency
      let urgencyGuidance = "";
      if (taskContext?.dueDate) {
        const diffDays = Math.ceil(
          (taskContext.dueDate.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (diffDays <= 1 && taskContext.dueDateType === "hard") {
          urgencyGuidance = `\n**URGENT:** This is due ${diffDays <= 0 ? "TODAY" : "TOMORROW"} with a hard deadline. Focus on the absolute minimum viable deliverables. Suggest 2-3 critical subtasks only.`;
        } else if (diffDays <= 3) {
          urgencyGuidance = `\n**Time-sensitive:** Due in ${diffDays} days. Keep the breakdown focused and actionable. 3-4 subtasks max.`;
        } else if (diffDays > 30) {
          urgencyGuidance = `\n**Longer timeline:** You have ${diffDays} days. You can suggest a more thorough breakdown with 5-7 subtasks if the task warrants it.`;
        }
      }

      return `${baseContext}

<numbered_list_output>
## PROPOSAL PHASE - Generate Subtask List
${urgencyGuidance}

Your response is AUTOMATICALLY PARSED by a regex that extracts lines matching "^\\d+\\. " pattern.
The parser creates database tasks from each numbered line. Correct format = tasks created. Wrong format = parsing fails, no tasks created.

<exact_format>
Based on what we've discussed, here's my suggested breakdown:

1. First subtask title here
2. Second subtask title here
3. Third subtask title here
4. Fourth subtask title here

Would you like to adjust any of these?
</exact_format>

<format_rules>
1. Open with a brief intro sentence (e.g., "Based on what we've discussed...")
2. Use simple numbered list: 1. 2. 3. 4. (the parser requires this exact pattern)
3. Write each subtask as a short actionable title under 60 characters
4. Keep items on single lines with no line breaks within items
5. Include 3-7 subtasks depending on task complexity
6. Close with "Would you like to adjust any of these?"
</format_rules>

<parser_will_fail_on>
- Bullet points (- or •) instead of numbers
- Checkboxes ([ ] or ☐)
- Nested lists or indented items
- Bold/italic formatting within items
- Tables or headers
- Explanatory text after the numbered item on the same line
- Questions instead of a proposal
</parser_will_fail_on>

<checklist_before_responding>
✓ Opening sentence present
✓ Lines start with "1. " "2. " "3. " etc.
✓ Each item is a short title (under 60 chars)
✓ No bullets, checkboxes, bold, or tables
✓ Closing question present
</checklist_before_responding>
</numbered_list_output>`;

    case "confirming":
      return `${baseContext}

<confirmation_rules>
## Confirmation Phase

The user is reviewing and editing the proposed subtasks in the UI panel on the right.

**If they ask for changes:**
- Revise the list and present it again in the same numbered format
- Keep it collaborative: "Good catch - here's the updated breakdown:"

**If they confirm or say they're ready:**
- Keep it brief and encouraging
- Example: "Great, you're all set! The subtasks are ready for you to work through."

**Tone:** Supportive, minimal. The focus shifts to their execution.
</confirmation_rules>`;
  }
}

/**
 * Get the full system prompt for Plan Mode
 *
 * IMPORTANT: In Plan Mode, we restructure the prompt to ensure instructions come FIRST.
 * This prevents "lost in the middle" issues where lengthy document context causes
 * the AI to ignore the Plan Mode behavior rules.
 *
 * Structure: Platform + PLAN MODE INSTRUCTIONS + minimal context
 * (NOT: Platform + Full Focus Area Documents + Plan Mode at the end)
 */
export function getFullSystemPromptForPlanMode(
  model: string,
  space: SpaceType | null | undefined,
  taskTitle: string,
  phase: PlanModePhase,
  focusArea?: FocusAreaInfo | null,
  taskContext?: PlanModeTaskContext,
  exchangeCount: number = 0,
): string {
  // Start with platform prompt only (not full focus area with documents)
  const platformPrompt = getPlatformPrompt(model);

  // Get Plan Mode instructions (these are critical and must come early)
  const planModePrompt = getPlanModePrompt(
    taskTitle,
    phase,
    taskContext,
    exchangeCount,
  );

  // Add minimal context reference with document tool instructions
  let contextNote = "";
  if (focusArea) {
    contextNote = `\n<context_note>
Working within focus area: "${focusArea.name}"
${focusArea.context ? `Background: ${focusArea.context.slice(0, 300)}${focusArea.context.length > 300 ? "..." : ""}` : ""}`;

    // List available documents (content accessible via tool)
    if (focusArea.contextDocuments && focusArea.contextDocuments.length > 0) {
      contextNote += `\n\n**Available Reference Documents:**`;
      for (const doc of focusArea.contextDocuments) {
        const sizeKb = Math.round(doc.charCount / 1000);
        contextNote += `\n- ${doc.filename} (${sizeKb}k chars)`;
      }
      contextNote += `\n\nUse the **read_document** tool to read documents. **On your FIRST response, read available documents** to understand the user's preparation. Reference document details in your opening.`;
    }
    contextNote += `\n</context_note>`;
  }

  // Structure: Platform → Plan Mode Instructions → Minimal Context Note
  // Plan Mode rules come BEFORE any heavy context to prevent being ignored
  return `${platformPrompt}\n${planModePrompt}${contextNote}`;
}

/**
 * Get the full system prompt for Plan Mode with task context
 *
 * IMPORTANT: In Plan Mode, we restructure the prompt to ensure instructions come FIRST.
 * This prevents "lost in the middle" issues where lengthy document context causes
 * the AI to ignore the Plan Mode behavior rules.
 *
 * Structure: Platform + PLAN MODE INSTRUCTIONS + minimal context summary
 * (NOT: Full documents + Plan Mode at the end)
 *
 * @param model - The model being used
 * @param space - The current space
 * @param taskTitle - Title of the task being planned
 * @param phase - Current plan mode phase
 * @param linkedContext - Optional linked documents and related tasks
 * @param focusArea - Optional focus area for specialized context
 * @param taskMetadata - Optional task metadata (priority, due date, etc.)
 */
export function getFullSystemPromptForPlanModeWithContext(
  model: string,
  space: SpaceType | null | undefined,
  taskTitle: string,
  phase: PlanModePhase,
  linkedContext?: TaskContextInfo | null,
  focusArea?: FocusAreaInfo | null,
  taskMetadata?: PlanModeTaskContext,
  exchangeCount: number = 0,
): string {
  // Start with platform prompt only (not full focus area with documents)
  const platformPrompt = getPlatformPrompt(model);

  // Get Plan Mode instructions (these are critical and must come early)
  const planModePrompt = getPlanModePrompt(
    taskTitle,
    phase,
    taskMetadata,
    exchangeCount,
  );

  // Build minimal context summary with document tool instructions
  let contextSummary = "";

  // Focus area summary with document listing
  if (focusArea) {
    contextSummary += `\n<context_note>
Working within focus area: "${focusArea.name}"
${focusArea.context ? `Background: ${focusArea.context.slice(0, 300)}${focusArea.context.length > 300 ? "..." : ""}` : ""}`;

    // List focus area documents (content accessible via tool)
    if (focusArea.contextDocuments && focusArea.contextDocuments.length > 0) {
      contextSummary += `\n\n**Focus Area Reference Documents:**`;
      for (const doc of focusArea.contextDocuments) {
        const sizeKb = Math.round(doc.charCount / 1000);
        contextSummary += `\n- ${doc.filename} (${sizeKb}k chars)`;
      }
    }
    contextSummary += `\n</context_note>`;
  }

  // Task-linked context summary (documents and related tasks - just list, no content)
  if (linkedContext) {
    const docCount = linkedContext.documents?.length || 0;
    const taskCount = linkedContext.relatedTasks?.length || 0;

    if (docCount > 0 || taskCount > 0) {
      contextSummary += `\n<task_materials>
**Task-Linked Materials:**`;
      if (docCount > 0) {
        contextSummary += `\nDocuments:`;
        for (const doc of linkedContext.documents!) {
          const sizeKb = Math.round(doc.charCount / 1000);
          contextSummary += `\n- ${doc.filename} (${sizeKb}k chars)`;
        }
      }
      if (taskCount > 0) {
        contextSummary += `\nRelated Tasks:`;
        for (const task of linkedContext.relatedTasks!) {
          contextSummary += `\n- ${task.title} (${task.status})`;
        }
      }
      contextSummary += `\n</task_materials>`;
    }
  }

  // Add tool instruction if any documents are available
  const hasDocuments =
    (focusArea?.contextDocuments?.length ?? 0) > 0 ||
    (linkedContext?.documents?.length ?? 0) > 0;
  if (hasDocuments) {
    contextSummary += `\n\n**Document Access:** Use the **read_document** tool to read documents. **IMPORTANT:** On your FIRST response, read available documents to understand the user's preparation. Reference specific details from documents in your opening - this shows you've engaged with their materials and lets you ask informed questions.`;
  }

  // Structure: Platform → Plan Mode Instructions → Minimal Context Summary
  // Plan Mode rules come BEFORE any context to prevent being ignored
  return `${platformPrompt}\n${planModePrompt}${contextSummary}`;
}

/**
 * Task Detection Prompt
 *
 * When enabled, this addition teaches the AI to recognize actionable items
 * in conversation and offer to create tasks. The AI includes structured
 * [TASK_SUGGEST] markers that the frontend parses to show suggestion cards.
 *
 * Used in Area conversations where task tracking is relevant.
 */
export const TASK_DETECTION_PROMPT = `
<task_detection>
## Task Detection

When the user expresses intentions, commitments, or action items during our conversation, recognize them and offer to track them. Look for statements like:

- "I need to..." / "I should..." / "I have to..."
- "Let me check with..." / "I'll follow up on..."
- "We should probably..." / "Don't forget to..."
- "By Friday..." / "Before the meeting..."
- Any commitment to future action

When you detect such a statement, include a structured marker in your response:

[TASK_SUGGEST]
title: Brief, actionable task title (under 60 chars)
dueDate: Relative date if mentioned (today, tomorrow, Friday, next week, etc.)
priority: normal or high (high if urgent language used)
reason: One sentence explaining why this might be worth tracking
[/TASK_SUGGEST]

**Guidelines:**
- Only suggest tasks for CLEAR actionable items, not vague statements
- Don't suggest for completed actions ("I already did X")
- Don't suggest for hypotheticals ("We could maybe...")
- Maximum ONE suggestion per response
- Place the marker at the END of your response, after your main content
- Keep suggesting natural - don't force it if nothing actionable was said

**Example exchange:**
User: "I need to finish the quarterly report by Friday, and I should probably check with Sarah about the budget numbers."

Your response (ends with):
[TASK_SUGGEST]
title: Finish quarterly report
dueDate: Friday
priority: normal
reason: You mentioned needing to complete this by end of week
[/TASK_SUGGEST]
</task_detection>`;

/**
 * Get the task detection prompt addition
 * Returns the prompt if task detection should be enabled, empty string otherwise
 */
export function getTaskDetectionPrompt(
  enableTaskDetection: boolean = false,
): string {
  return enableTaskDetection ? TASK_DETECTION_PROMPT : "";
}

/**
 * Get the full system prompt for an Area with optional task detection
 * Combines: Platform → Focus Area → Task Detection
 */
export function getAreaSystemPrompt(
  model: string,
  focusArea: FocusAreaInfo,
  enableTaskDetection: boolean = true,
): string {
  const basePrompt = getFullSystemPromptWithFocusArea(model, focusArea);
  const taskDetection = getTaskDetectionPrompt(enableTaskDetection);

  return taskDetection ? `${basePrompt}\n${taskDetection}` : basePrompt;
}

// Re-export types for convenience
export type { TaskContextInfo };

// ============================================================================
// COMMERCE SEARCH PROMPT (Conditional)
// ============================================================================
// Only included when web search / commerce tools are enabled
// This prevents the AI from mentioning commerce_search when it's not available

/**
 * Commerce Search Prompt
 *
 * When enabled, this teaches the AI to use commerce_search for product queries.
 * ONLY add this to the system prompt when searchEnabled=true and commerce tools
 * are actually available.
 */
export const COMMERCE_SEARCH_PROMPT = `
<commerce_capabilities>
## Shopping & Product Search
When users ask to "find", "search for", "compare", or "buy" products:
- Use the commerce_search tool to search across retail sites (Takealot, Amazon)
- Present product results in a visual comparison format
- Highlight price differences, ratings, and availability across sites
- If users want to purchase, they can click the product to view/buy on the retailer's site
</commerce_capabilities>`;

/**
 * Get the commerce search prompt addition
 * Returns the prompt if commerce tools are enabled, empty string otherwise
 *
 * @param commerceEnabled - Whether commerce tools are available (typically searchEnabled flag)
 */
export function getCommerceSearchPrompt(commerceEnabled: boolean = false): string {
  return commerceEnabled ? COMMERCE_SEARCH_PROMPT : "";
}

// ============================================================================
// CACHE-OPTIMIZED PROMPT LAYERS
// ============================================================================
// These functions return prompt components separately for optimal Anthropic
// prompt caching. By splitting the system prompt into layers, we can cache:
// 1. Platform prompt - shared across ALL users on same model (global cache)
// 2. Context prompt - shared across conversations in same space/area
//
// This improves cache hit rates from ~10% (single system block) to 60-80%

/**
 * Prompt layer for cache-optimized system messages
 * Each layer can have its own cache_control for optimal caching
 */
export interface PromptLayer {
  /** Identifier for debugging/logging */
  name: string;
  /** The prompt content */
  content: string;
  /** Whether to mark this layer with cache_control */
  shouldCache: boolean;
}

/**
 * Get system prompt layers for optimal caching
 * Returns prompt layers which can be used as separate content blocks
 *
 * Cache strategy:
 * - Temporal layer (Layer 0): Changes daily, small (~50 tokens), NOT cached
 * - Platform layer (Layer 1): Stable across ALL users using same model family, cached
 * - Context layer (Layer 2): Stable per space/area (changes when user switches context), cached
 *
 * @returns Array of PromptLayer objects in order [temporal, platform, context?]
 */
export function getSystemPromptLayers(
  model: string,
  options: {
    space?: SpaceType | null;
    spaceInfo?: SpaceInfo | null;
    focusArea?: FocusAreaInfo | null;
    focusedTask?: FocusedTaskInfo | null;
    timezone?: string;
  },
): PromptLayer[] {
  const layers: PromptLayer[] = [];

  // Layer 0: Temporal context (changes daily - NOT cached)
  // Small (~50 tokens) so cache miss is negligible
  const temporalContext = getTemporalContext(options.timezone);
  layers.push({
    name: "temporal",
    content: temporalContext,
    shouldCache: false, // Changes daily, don't cache
  });

  // Layer 1: Platform prompt (most stable - cached globally per model family)
  const platformPrompt = getPlatformPrompt(model);
  layers.push({
    name: "platform",
    content: platformPrompt,
    shouldCache: true, // Always cache platform prompt
  });

  // Layer 2: Context (space + area + task) - cached per context
  // (After temporal Layer 0 and platform Layer 1)
  const contextParts: string[] = [];

  // Add space context
  if (options.focusArea) {
    // Focus area provides space context via its spaceId
    const spaceAddition = getSpacePromptForFocusArea(options.focusArea);
    if (spaceAddition) {
      contextParts.push(spaceAddition);
    }
    // Add focus area prompt
    contextParts.push(getFocusAreaPrompt(options.focusArea));
  } else if (
    options.spaceInfo &&
    options.spaceInfo.type === "custom" &&
    options.spaceInfo.context
  ) {
    // Custom space with user-provided context
    const customSpacePrompt = getCustomSpacePrompt(options.spaceInfo);
    if (customSpacePrompt) {
      contextParts.push(customSpacePrompt);
    }
  } else if (options.spaceInfo && options.spaceInfo.type === "system") {
    // System space
    const spaceAddition = getSpacePromptAddition(
      options.spaceInfo.slug as SpaceType,
    );
    if (spaceAddition) {
      contextParts.push(spaceAddition);
    }
  } else if (options.space) {
    // Fallback to space type
    const spaceAddition = getSpacePromptAddition(options.space);
    if (spaceAddition) {
      contextParts.push(spaceAddition);
    }
  }

  // Add focused task context
  if (options.focusedTask) {
    contextParts.push(getFocusedTaskPrompt(options.focusedTask));
  }

  // Create context layer if there's any context
  if (contextParts.length > 0) {
    layers.push({
      name: "context",
      content: contextParts.join("\n"),
      shouldCache: true, // Cache the combined context
    });
  }

  return layers;
}

/**
 * Check if we should use layered caching for a model
 * Only Claude models support explicit cache_control
 */
export function supportsLayeredCaching(model: string): boolean {
  const lowerModel = model.toLowerCase();
  return lowerModel.includes("claude") || lowerModel.includes("anthropic");
}
