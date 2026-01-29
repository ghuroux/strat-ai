import type { RequestHandler } from './$types';
import { createChatCompletion, createChatCompletionWithTools, mapErrorMessage, supportsExtendedThinking } from '$lib/server/litellm';
import { searchWeb, formatSearchResultsForLLM, isBraveSearchConfigured } from '$lib/server/brave-search';
import type { ChatCompletionRequest, ToolDefinition, ThinkingConfig, ChatMessage, MessageContentBlock } from '$lib/types/api';
import { getFullSystemPrompt, getFocusedTaskPrompt, getFullSystemPromptForPlanMode, getFullSystemPromptForPlanModeWithContext, getFullSystemPromptWithFocusArea, getFullSystemPromptWithSpace, getFocusAreaPrompt, getSystemPromptLayers, supportsLayeredCaching, getCommerceSearchPrompt, type FocusedTaskInfo, type PlanModePhase, type TaskContextInfo, type FocusAreaInfo, type SpaceInfo, type PlanModeTaskContext, type PromptLayer, type ContextDocument } from '$lib/config/system-prompts';
import { routeQuery, isAutoMode, getDefaultContext, type RoutingContext, type RoutingDecision } from '$lib/services/model-router';
import { postgresDocumentRepository } from '$lib/server/persistence/documents-postgres';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import { postgresConversationRepository } from '$lib/server/persistence/postgres';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';
import { getToolCacheRepository, hashParams } from '$lib/server/persistence/tool-cache-postgres';
import { postgresUsageRepository } from '$lib/server/persistence/usage-postgres';
import { postgresRoutingDecisionsRepository } from '$lib/server/persistence/routing-decisions-postgres';
import { postgresUserRepository } from '$lib/server/persistence/users-postgres';
import { debugLog } from '$lib/utils/debug';
import { getAssistById, TASK_BREAKDOWN_PHASE_PROMPTS } from '$lib/config/assists';
import { estimateCost } from '$lib/config/model-pricing';
import type { SpaceType } from '$lib/types/chat';
import { isSystemSpace } from '$lib/types/spaces';
import { generateSummaryOnDemand, needsSummarization } from '$lib/server/summarization';
import { commerceTools, executeCommerceTool, isCommerceTool } from '$lib/server/commerce/tools';
import type { CommerceMessageContent } from '$lib/types/commerce';
import { postgresIntegrationsRepository } from '$lib/server/persistence/integrations-postgres';
import { postgresIntegrationCredentialsRepository } from '$lib/server/persistence/integration-credentials-postgres';
import { calendarTools, isCalendarTool, executeCalendarTool } from '$lib/server/integrations/providers/calendar/tools';
import { emailTools, isEmailTool, executeEmailTool } from '$lib/server/integrations/providers/calendar/email-tools';
import { refreshAccessToken, tokensToCredentials } from '$lib/server/integrations/providers/calendar/oauth';

/**
 * Context for tracking usage across streaming responses
 */
interface UsageContext {
	organizationId: string;
	userId: string;
	model: string;
	conversationId?: string;
	requestType: 'chat' | 'arena' | 'second-opinion';
}

/**
 * Save LLM usage to the database
 * Called after streaming completes or for non-streaming responses
 */
async function saveUsage(
	context: UsageContext,
	usage: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		cacheCreationTokens?: number;
		cacheReadTokens?: number;
	}
): Promise<void> {
	try {
		const estimatedCostMillicents = estimateCost(
			context.model,
			usage.promptTokens,
			usage.completionTokens,
			usage.cacheReadTokens || 0
		);

		await postgresUsageRepository.create({
			organizationId: context.organizationId,
			userId: context.userId,
			conversationId: context.conversationId || null,
			model: context.model,
			requestType: context.requestType,
			promptTokens: usage.promptTokens,
			completionTokens: usage.completionTokens,
			totalTokens: usage.totalTokens,
			cacheCreationTokens: usage.cacheCreationTokens || 0,
			cacheReadTokens: usage.cacheReadTokens || 0,
			estimatedCostMillicents
		});

		debugLog('USAGE', `Saved: ${usage.totalTokens} tokens, ${context.model}, cost: ${estimatedCostMillicents} millicents`);
	} catch (error) {
		// Log but don't fail the request - usage tracking is non-critical
		console.error('[Usage] Failed to save usage:', error);
	}
}

/**
 * Check if model supports explicit cache_control (Anthropic Claude models)
 * OpenAI handles caching automatically, so we only add cache_control for Claude
 */
function shouldUseCacheControl(model: string): boolean {
	const lowerModel = model.toLowerCase();
	return lowerModel.includes('claude') || lowerModel.includes('anthropic');
}

/**
 * Add cache_control breakpoints to conversation history for Anthropic prompt caching
 * Anthropic limits cache_control to a maximum of 4 blocks, so we strategically place them:
 *
 * 1. System prompt (most stable, always cache)
 * 2. Last assistant message before current user message (recent context)
 * 3. Second-to-last assistant message if available (more context)
 * 4. Last user message in history (not current one)
 *
 * This achieves optimal caching while respecting the 4-block limit.
 * Cache breakpoints tell Anthropic: "cache everything up to and including this point"
 */
function addCacheBreakpoints(messages: ChatMessage[], model: string): ChatMessage[] {
	// Only apply cache_control for Claude models
	if (!shouldUseCacheControl(model)) {
		return messages;
	}

	// Find the last user message index (current turn - don't cache this one)
	let lastUserIndex = -1;
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === 'user') {
			lastUserIndex = i;
			break;
		}
	}

	// Check if system message already has cache_control (from layered caching)
	// If so, count existing breakpoints and allocate remaining to history
	const systemIndex = messages.findIndex(m => m.role === 'system');
	let existingCacheBreakpoints = 0;
	let systemAlreadyCached = false;

	if (systemIndex >= 0) {
		const systemMsg = messages[systemIndex];
		if (Array.isArray(systemMsg.content)) {
			// Count cache_control blocks in system message
			for (const block of systemMsg.content) {
				if ('cache_control' in block && block.cache_control) {
					existingCacheBreakpoints++;
					systemAlreadyCached = true;
				}
			}
		}
	}

	// Identify which indices should get cache_control (max 4 total)
	const cacheIndices = new Set<number>();

	// Only add system message if it's not already cached
	if (systemIndex >= 0 && !systemAlreadyCached) {
		cacheIndices.add(systemIndex);
	}

	// Find historical messages to cache (working backwards from current message)
	const historicalMessages: number[] = [];
	for (let i = lastUserIndex - 1; i >= 0; i--) {
		if (messages[i].role !== 'system' && messages[i].role !== 'tool') {
			historicalMessages.push(i);
		}
	}

	// Calculate remaining slots: 4 total - existing breakpoints - new system cache
	const usedSlots = existingCacheBreakpoints + cacheIndices.size;
	const remainingSlots = 4 - usedSlots;

	// Add historical messages to cache (up to remaining slots)
	for (let i = 0; i < Math.min(remainingSlots, historicalMessages.length); i++) {
		cacheIndices.add(historicalMessages[i]);
	}

	// Log cache allocation for debugging
	if (existingCacheBreakpoints > 0) {
		debugLog('CACHE', `Breakpoints: ${existingCacheBreakpoints} (system layered) + ${cacheIndices.size} (history) = ${existingCacheBreakpoints + cacheIndices.size}/4`);
	}

	return messages.map((msg, index) => {
		// Only add cache_control to selected indices
		if (!cacheIndices.has(index)) {
			return msg;
		}

		// Skip tool messages - they have special handling
		if (msg.role === 'tool') {
			return msg;
		}

		// Convert string content to content block with cache_control
		if (typeof msg.content === 'string') {
			return {
				...msg,
				content: [{
					type: 'text' as const,
					text: msg.content,
					cache_control: { type: 'ephemeral' as const }
				}]
			};
		}

		// If already array and NOT system (system already has cache_control from layered caching),
		// add cache_control to last block
		if (Array.isArray(msg.content) && msg.content.length > 0) {
			const blocks = [...msg.content] as MessageContentBlock[];
			const lastBlock = blocks[blocks.length - 1];
			blocks[blocks.length - 1] = {
				...lastBlock,
				cache_control: { type: 'ephemeral' as const }
			};
			return { ...msg, content: blocks };
		}

		return msg;
	});
}

/**
 * Final validation step: Ensure we never exceed Anthropic's 4 cache_control block limit
 * This is a safety net that catches any edge cases in the caching logic above
 * 
 * Strategy: Count all cache_control blocks, and if > 4, remove from historical
 * messages (keeping system message cache_control intact as it's most valuable)
 */
function enforceCacheControlLimit(messages: ChatMessage[], model: string): ChatMessage[] {
	if (!shouldUseCacheControl(model)) {
		return messages;
	}

	const MAX_CACHE_BLOCKS = 4;
	
	// Count all cache_control blocks and track their locations
	const cacheLocations: { messageIndex: number; blockIndex: number; isSystem: boolean }[] = [];
	
	messages.forEach((msg, msgIndex) => {
		if (Array.isArray(msg.content)) {
			msg.content.forEach((block, blockIndex) => {
				if ('cache_control' in block && block.cache_control) {
					cacheLocations.push({
						messageIndex: msgIndex,
						blockIndex,
						isSystem: msg.role === 'system'
					});
				}
			});
		}
	});

	// If within limit, no action needed
	if (cacheLocations.length <= MAX_CACHE_BLOCKS) {
		return messages;
	}

	// Log warning - this helps identify where the bug is occurring
	console.warn(`[Cache] LIMIT EXCEEDED: Found ${cacheLocations.length} cache_control blocks (limit: ${MAX_CACHE_BLOCKS}). Removing extras from historical messages.`);

	// Calculate how many to remove
	const toRemove = cacheLocations.length - MAX_CACHE_BLOCKS;
	
	// Prioritize keeping system message cache (most valuable for cache hits)
	// Remove from non-system messages first, starting from oldest
	const nonSystemCaches = cacheLocations.filter(loc => !loc.isSystem);
	const cachesToRemove = nonSystemCaches.slice(0, toRemove);

	// If we need to remove more than non-system caches, we have a serious bug
	if (cachesToRemove.length < toRemove) {
		console.error(`[Cache] CRITICAL: Need to remove ${toRemove} cache blocks but only ${nonSystemCaches.length} non-system caches available. System has ${cacheLocations.length - nonSystemCaches.length} cache blocks.`);
	}

	// Create set of locations to remove for fast lookup
	const removeSet = new Set(
		cachesToRemove.map(loc => `${loc.messageIndex}-${loc.blockIndex}`)
	);

	// Remove cache_control from selected blocks
	return messages.map((msg, msgIndex) => {
		if (!Array.isArray(msg.content)) {
			return msg;
		}

		const newContent = msg.content.map((block, blockIndex) => {
			const key = `${msgIndex}-${blockIndex}`;
			if (removeSet.has(key) && 'cache_control' in block) {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { cache_control, ...rest } = block;
				return rest as MessageContentBlock;
			}
			return block;
		});

		return { ...msg, content: newContent };
	});
}

interface AssistContext {
	assistId?: string | null;
	assistPhase?: 'collecting' | 'confirming' | 'prioritizing' | 'focused' | null;
	assistTasks?: string[] | null;
	assistFocusedTask?: string | null;
}

interface PlanModeContext {
	taskId: string;
	taskTitle: string;
	description?: string; // User-provided background/context for the task
	phase: PlanModePhase;
	exchangeCount?: number; // Tracks conversation depth for prompt selection
	context?: TaskContextInfo;
	// Task metadata for time/date awareness and priority context
	priority?: 'normal' | 'high';
	dueDate?: string | null; // ISO string from frontend
	dueDateType?: 'hard' | 'soft' | null;
	createdAt?: string; // ISO string from frontend
}

/**
 * Helper to inject a system prompt into messages
 * Either prepends to existing system message or adds new one at start
 */
function injectSystemPrompt(messages: ChatMessage[], prompt: string): ChatMessage[] {
	if (!prompt) return messages;

	// Find the first system message (if any)
	const systemIndex = messages.findIndex(m => m.role === 'system');

	if (systemIndex >= 0) {
		// Prepend platform prompt to existing system message
		const existingSystem = messages[systemIndex];
		const existingContent = typeof existingSystem.content === 'string'
			? existingSystem.content
			: Array.isArray(existingSystem.content)
				? existingSystem.content.map(c => 'text' in c ? c.text : '').join('\n')
				: '';

		const updatedMessages = [...messages];
		updatedMessages[systemIndex] = {
			...existingSystem,
			content: `${prompt}\n\n---\n\nUser Instructions:\n${existingContent}`
		};
		return updatedMessages;
	} else {
		// Add new system message at the beginning
		return [
			{ role: 'system' as const, content: prompt },
			...messages
		];
	}
}

/**
 * Create a system message with layered content blocks for optimal caching
 * Each layer gets its own cache_control, allowing:
 * - Platform prompt to be cached globally (shared across ALL users on same model)
 * - Context to be cached per-area (shared across conversations in same area)
 *
 * This significantly improves cache hit rates compared to single-block caching.
 */
function createLayeredSystemMessage(
	layers: PromptLayer[],
	existingSystemContent?: string
): ChatMessage {
	const contentBlocks: MessageContentBlock[] = [];

	for (const layer of layers) {
		const block: MessageContentBlock = {
			type: 'text' as const,
			text: layer.content
		};

		// Add cache_control for layers that should be cached
		if (layer.shouldCache) {
			block.cache_control = { type: 'ephemeral' as const };
		}

		contentBlocks.push(block);
	}

	// Add existing user-provided system content if any (without cache_control)
	if (existingSystemContent) {
		contentBlocks.push({
			type: 'text' as const,
			text: `\n\n---\n\nUser Instructions:\n${existingSystemContent}`
		});
	}

	return {
		role: 'system' as const,
		content: contentBlocks
	};
}

/**
 * Check if a model supports vision (image inputs)
 * Used to determine whether to include image context documents
 */
function modelSupportsVision(model: string): boolean {
	const lowerModel = model.toLowerCase();
	// Claude models with vision support
	if (lowerModel.includes('claude-3') || lowerModel.includes('claude-4') ||
	    lowerModel.includes('claude-sonnet') || lowerModel.includes('claude-opus') ||
	    lowerModel.includes('claude-haiku')) {
		return true;
	}
	// GPT-4 vision models
	if (lowerModel.includes('gpt-4') && (lowerModel.includes('vision') || lowerModel.includes('turbo') || lowerModel.includes('o'))) {
		return true;
	}
	// GPT-4o models have vision
	if (lowerModel.includes('gpt-4o')) {
		return true;
	}
	// GPT-5 models are expected to have vision
	if (lowerModel.includes('gpt-5')) {
		return true;
	}
	// Gemini models have vision
	if (lowerModel.includes('gemini')) {
		return true;
	}
	return false;
}

/**
 * Build vision content blocks from image context documents
 * Returns an array of image_url content blocks ready for injection into messages
 */
function buildImageContextBlocks(
	focusArea?: FocusAreaInfo | null,
	spaceInfo?: SpaceInfo | null
): MessageContentBlock[] {
	const imageBlocks: MessageContentBlock[] = [];

	// Collect image documents from all sources (focus area takes precedence)
	const allDocs: Array<{ filename: string; content: string; mimeType?: string; contentType?: string }> = [];

	if (focusArea?.contextDocuments) {
		allDocs.push(...focusArea.contextDocuments);
	}
	if (spaceInfo?.contextDocuments) {
		// Only add space docs that aren't already included from focus area
		const focusAreaFilenames = new Set(focusArea?.contextDocuments?.map(d => d.filename) || []);
		for (const doc of spaceInfo.contextDocuments) {
			if (!focusAreaFilenames.has(doc.filename)) {
				allDocs.push(doc);
			}
		}
	}

	// Filter to only image documents and build content blocks
	for (const doc of allDocs) {
		if (doc.contentType === 'image' && doc.content && doc.mimeType) {
			imageBlocks.push({
				type: 'image_url',
				image_url: {
					url: `data:${doc.mimeType};base64,${doc.content}`,
					format: doc.mimeType
				}
			});
		}
	}

	return imageBlocks;
}

/**
 * Inject image context documents as vision content blocks
 * Images are injected as a user message before the actual user message
 * with an explanatory text prefix
 */
function injectImageContext(
	messages: ChatMessage[],
	model: string,
	focusArea?: FocusAreaInfo | null,
	spaceInfo?: SpaceInfo | null
): ChatMessage[] {
	// Skip if model doesn't support vision
	if (!modelSupportsVision(model)) {
		debugLog('CHAT', 'Model does not support vision, skipping image context injection');
		return messages;
	}

	// Build image content blocks
	const imageBlocks = buildImageContextBlocks(focusArea, spaceInfo);

	// No images to inject
	if (imageBlocks.length === 0) {
		return messages;
	}

	debugLog('CHAT', `Injecting ${imageBlocks.length} image(s) as context`);

	// Find the index of the last user message
	let lastUserIndex = -1;
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].role === 'user') {
			lastUserIndex = i;
			break;
		}
	}

	// If no user message found, can't inject
	if (lastUserIndex === -1) {
		return messages;
	}

	// Build the image context message
	// Add introductory text explaining the images
	const contextText: MessageContentBlock = {
		type: 'text',
		text: `[The following images have been shared as reference context for this conversation. They are documents activated in the current area/space.]`
	};

	// Create user message with images (images first, then text - Claude performs better this way)
	const imageContextMessage: ChatMessage = {
		role: 'user',
		content: [...imageBlocks, contextText]
	};

	// Insert the image context message before the last user message
	const updatedMessages = [...messages];
	updatedMessages.splice(lastUserIndex, 0, imageContextMessage);

	return updatedMessages;
}

/**
 * Inject platform-level system prompt before user messages
 * This provides consistent baseline behavior across all conversations
 * The platform prompt is composed with any user-provided system prompt
 * Context chain: Platform → Space → Focus Area → Task
 * When an assistId is provided, the assist's system prompt is also included
 * Phase-specific prompts are added for task-breakdown assist flow
 * When a focusedTask is provided (persistent focus mode), task context is added
 * When planMode is active, Plan Mode prompts take precedence over other contexts
 * When a custom space with context is provided, custom space context is injected
 */
function injectPlatformPrompt(
	messages: ChatMessage[],
	model: string,
	space?: SpaceType | null,
	assistContext?: AssistContext | null,
	focusedTask?: FocusedTaskInfo | null,
	planModeContext?: PlanModeContext | null,
	focusArea?: FocusAreaInfo | null,
	spaceInfo?: SpaceInfo | null,
	timezone?: string,
	searchEnabled?: boolean
): ChatMessage[] {
	// Plan Mode takes precedence - use specialized Plan Mode prompts
	if (planModeContext) {
		debugLog('PLAN', '\n========== PLAN MODE ACTIVE ==========');
		debugLog('PLAN', `Task: "${planModeContext.taskTitle}"`);
		debugLog('PLAN', `Phase: ${planModeContext.phase}`);
		debugLog('PLAN', `Exchange Count: ${planModeContext.exchangeCount || 0}`);
		debugLog('PLAN', `Has Context: ${!!planModeContext.context}`);
		if (planModeContext.context) {
			debugLog('PLAN', `Context - Docs: ${planModeContext.context.documents?.length || 0}, Tasks: ${planModeContext.context.relatedTasks?.length || 0}`);
		}
		debugLog('PLAN', `Priority: ${planModeContext.priority || 'normal'}`);
		debugLog('PLAN', `Due: ${planModeContext.dueDate || 'none'}`);
		debugLog('PLAN', '=======================================\n');

		// Build task metadata context for time/date awareness
		const taskMetadata: PlanModeTaskContext | undefined = planModeContext.createdAt
			? {
					title: planModeContext.taskTitle,
					description: planModeContext.description,
					priority: planModeContext.priority || 'normal',
					dueDate: planModeContext.dueDate ? new Date(planModeContext.dueDate) : null,
					dueDateType: planModeContext.dueDateType || null,
					createdAt: new Date(planModeContext.createdAt)
				}
			: undefined;

		// Use context-aware prompt if task context is available
		// Pass exchangeCount for phase-appropriate elicitation prompts
		const exchangeCount = planModeContext.exchangeCount || 0;
		const fullPrompt = planModeContext.context
			? getFullSystemPromptForPlanModeWithContext(
					model,
					space,
					planModeContext.taskTitle,
					planModeContext.phase,
					planModeContext.context,
					focusArea,
					taskMetadata,
					exchangeCount
				)
			: getFullSystemPromptForPlanMode(
					model,
					space,
					planModeContext.taskTitle,
					planModeContext.phase,
					focusArea,
					taskMetadata,
					exchangeCount
				);

		// Log a preview of the Plan Mode prompt (first 800 chars)
		const promptPreview = fullPrompt.length > 800 ? fullPrompt.slice(0, 800) + '...' : fullPrompt;
		debugLog('PLAN', 'System Prompt Preview:');
		debugLog('PLAN', '---');
		debugLog('PLAN', promptPreview);
		debugLog('PLAN', '---');
		debugLog('PLAN', `Total prompt length: ${fullPrompt.length} chars\n`);

		return injectSystemPrompt(messages, fullPrompt);
	}

	// Check if we can use layered caching (Claude models without assists)
	// Layered caching splits the system prompt into separate content blocks,
	// each with its own cache_control. This allows:
	// - Platform prompt to be cached globally (shared across ALL users on same model)
	// - Context to be cached per-area (shared across conversations in same area)
	const canUseLayeredCaching = supportsLayeredCaching(model) && !assistContext?.assistId;

	if (canUseLayeredCaching) {
		// Use layered caching for better cache hit rates
		const layers = getSystemPromptLayers(model, {
			space,
			spaceInfo,
			focusArea,
			focusedTask: focusedTask && !assistContext?.assistFocusedTask ? focusedTask : null,
			timezone
		});

		// Check for existing user-provided system message
		const systemIndex = messages.findIndex(m => m.role === 'system');
		let existingContent: string | undefined;
		if (systemIndex >= 0) {
			const existingSystem = messages[systemIndex];
			existingContent = typeof existingSystem.content === 'string'
				? existingSystem.content
				: Array.isArray(existingSystem.content)
					? existingSystem.content.map(c => 'text' in c ? c.text : '').join('\n')
					: undefined;
		}

		// Add commerce search instructions only when search tools are enabled
		// This prevents the AI from mentioning commerce_search when it's not available
		if (searchEnabled) {
			const commercePrompt = getCommerceSearchPrompt(true);
			existingContent = existingContent
				? `${existingContent}\n${commercePrompt}`
				: commercePrompt;
		}

		// Create layered system message
		const layeredSystemMessage = createLayeredSystemMessage(layers, existingContent);

		// Log cache optimization info
		debugLog('CACHE', `Using layered caching: ${layers.map(l => l.name).join(' → ')}`);

		// Replace or add system message
		if (systemIndex >= 0) {
			const updatedMessages = [...messages];
			updatedMessages[systemIndex] = layeredSystemMessage;
			return updatedMessages;
		} else {
			return [layeredSystemMessage, ...messages];
		}
	}

	// Fallback: Build single-block prompt for non-Claude models or when assists are active
	// Priority: Focus Area > Custom Space with context > System Space
	let fullPrompt: string;
	if (focusArea) {
		// Focus area includes space context
		fullPrompt = getFullSystemPromptWithFocusArea(model, focusArea, timezone);
	} else if (spaceInfo && spaceInfo.type === 'custom' && spaceInfo.context) {
		// Custom space with user-provided context
		fullPrompt = getFullSystemPromptWithSpace(model, spaceInfo, timezone);
	} else if (spaceInfo && spaceInfo.type === 'system') {
		// System space - use slug as SpaceType
		fullPrompt = getFullSystemPrompt(model, spaceInfo.slug as SpaceType, timezone);
	} else {
		// Fallback to space from request body (backwards compatibility)
		fullPrompt = getFullSystemPrompt(model, space, timezone);
	}

	// If assist is active, append the assist-specific prompt
	if (assistContext?.assistId) {
		const assist = getAssistById(assistContext.assistId);
		if (assist?.systemPromptAddition) {
			fullPrompt = fullPrompt
				? `${fullPrompt}\n\n---\n\n${assist.systemPromptAddition}`
				: assist.systemPromptAddition;
		}

		// Add phase-specific prompts for task-breakdown assist
		if (assistContext.assistId === 'task-breakdown') {
			const phase = assistContext.assistPhase;
			const tasks = assistContext.assistTasks || [];
			const assistFocusedTask = assistContext.assistFocusedTask;

			if (phase === 'prioritizing') {
				fullPrompt = fullPrompt
					? `${fullPrompt}\n\n${TASK_BREAKDOWN_PHASE_PROMPTS.prioritizing}`
					: TASK_BREAKDOWN_PHASE_PROMPTS.prioritizing;
			} else if (phase === 'focused' && assistFocusedTask) {
				const focusedPrompt = TASK_BREAKDOWN_PHASE_PROMPTS.focused(assistFocusedTask, tasks);
				fullPrompt = fullPrompt
					? `${fullPrompt}\n\n${focusedPrompt}`
					: focusedPrompt;
			}
		}
	}

	// Add persistent task focus context (takes precedence when no assist is active)
	// This is for when a user has focused on a task from the task badge, not from an assist flow
	if (focusedTask && !assistContext?.assistFocusedTask) {
		const taskPrompt = getFocusedTaskPrompt(focusedTask);
		fullPrompt = fullPrompt
			? `${fullPrompt}\n${taskPrompt}`
			: taskPrompt;
	}

	// Add commerce search instructions only when search tools are enabled
	// This prevents the AI from mentioning commerce_search when it's not available
	if (searchEnabled) {
		const commercePrompt = getCommerceSearchPrompt(true);
		fullPrompt = fullPrompt
			? `${fullPrompt}\n${commercePrompt}`
			: commercePrompt;
	}

	return injectSystemPrompt(messages, fullPrompt);
}

// Web search tool definition - Anthropic format (input_schema)
const webSearchToolAnthropic: ToolDefinition = {
	name: 'web_search',
	description: 'Search the web for current information. Use this when the user asks about recent events, current news, real-time data, weather, prices, or anything that might have changed since your training cutoff. The search returns titles, URLs, and description snippets from relevant web pages. After receiving results, synthesize the information into a helpful, comprehensive answer.',
	input_schema: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'The search query to look up on the web. Be specific and include relevant details like location, date, or context.'
			}
		},
		required: ['query']
	}
};

// Web search tool definition - OpenAI format (type: 'function', function.parameters)
const webSearchToolOpenAI = {
	type: 'function' as const,
	function: {
		name: 'web_search',
		description: 'Search the web for current information. Use this when the user asks about recent events, current news, real-time data, weather, prices, or anything that might have changed since your training cutoff. The search returns titles, URLs, and description snippets from relevant web pages. After receiving results, synthesize the information into a helpful, comprehensive answer.',
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The search query to look up on the web. Be specific and include relevant details like location, date, or context.'
				}
			},
			required: ['query']
		}
	}
};

// Document reading tool - Anthropic format
// Enables AI to access full document content on-demand (prompts contain summaries)
const readDocumentToolAnthropic: ToolDefinition = {
	name: 'read_document',
	description: 'Read a reference document to access its full content. Use this when you need specific details, quotes, or comprehensive information beyond what the document summary provides. Available documents are listed in the system context.',
	input_schema: {
		type: 'object',
		properties: {
			filename: {
				type: 'string',
				description: 'The filename of the document to read (as listed in available documents)'
			}
		},
		required: ['filename']
	}
};

// Document reading tool - OpenAI format
const readDocumentToolOpenAI = {
	type: 'function' as const,
	function: {
		name: 'read_document',
		description: 'Read a reference document to access its full content. Use this when you need specific details, quotes, or comprehensive information beyond what the document summary provides. Available documents are listed in the system context.',
		parameters: {
			type: 'object',
			properties: {
				filename: {
					type: 'string',
					description: 'The filename of the document to read (as listed in available documents)'
				}
			},
			required: ['filename']
		}
	}
};

// Commerce tools - OpenAI format (type: 'function', function.parameters)
// Mirrors the Anthropic-format tools in commerce/tools.ts
const commerceToolsOpenAI = [
	{
		type: 'function' as const,
		function: {
			name: 'commerce_search',
			description: 'Search for products across South African e-commerce sites (Takealot and Amazon.co.za). Returns product listings with prices, ratings, and images. Use this when the user wants to find or compare products.',
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'The search query (e.g., "wireless earbuds", "laptop bag")'
					},
					sites: {
						type: 'string',
						description: 'Comma-separated list of sites to search. Options: takealot, amazon. Default: both'
					},
					max_price: {
						type: 'number',
						description: 'Maximum price in South African Rands as a number. Examples: 500 for R500, 5000 for R5000, 10000 for R10000. Pass the exact number the user mentions.'
					}
				},
				required: ['query']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'commerce_get_product',
			description: 'Get detailed information about a specific product. Use this when the user wants more details about a product from search results.',
			parameters: {
				type: 'object',
				properties: {
					product_url: {
						type: 'string',
						description: 'The full URL of the product page'
					},
					site: {
						type: 'string',
						description: 'The site the product is from (takealot or amazon)'
					}
				},
				required: ['product_url', 'site']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'commerce_add_to_cart',
			description: 'Add a product to the shopping cart. Requires user to be logged in to the site. Use this when the user explicitly wants to add something to their cart.',
			parameters: {
				type: 'object',
				properties: {
					product_url: {
						type: 'string',
						description: 'The full URL of the product to add'
					},
					site: {
						type: 'string',
						description: 'The site the product is from (takealot or amazon)'
					},
					quantity: {
						type: 'string',
						description: 'Quantity to add (default: 1)'
					}
				},
				required: ['product_url', 'site']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'commerce_checkout',
			description: 'Preview the checkout with current cart contents. Shows items, subtotal, shipping, and total. Does NOT complete the purchase. Use this before confirming a purchase.',
			parameters: {
				type: 'object',
				properties: {
					site: {
						type: 'string',
						description: 'The site to checkout from (takealot or amazon)'
					}
				},
				required: ['site']
			}
		}
	}
];

// Calendar tools - OpenAI format (type: 'function', function.parameters)
// Mirrors the Anthropic-format tools in calendar/tools.ts
const calendarToolsOpenAI = [
	{
		type: 'function' as const,
		function: {
			name: 'calendar_list_events',
			description: 'List calendar events within a specified time range. Use this to see what meetings are scheduled.',
			parameters: {
				type: 'object',
				properties: {
					startDateTime: {
						type: 'string',
						description: 'Start of the time range in ISO 8601 format (e.g., "2026-01-28T00:00:00Z"). Use today\'s date if not specified.'
					},
					endDateTime: {
						type: 'string',
						description: 'End of the time range in ISO 8601 format (e.g., "2026-01-28T23:59:59Z"). Defaults to end of start day if not specified.'
					},
					maxResults: {
						type: 'string',
						description: 'Maximum number of events to return (default: 10, max: 50)'
					}
				},
				required: ['startDateTime', 'endDateTime']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'calendar_get_event',
			description: 'Get detailed information about a specific calendar event by its ID.',
			parameters: {
				type: 'object',
				properties: {
					eventId: {
						type: 'string',
						description: 'The unique identifier of the calendar event'
					}
				},
				required: ['eventId']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'calendar_create_event',
			description: 'Create a new calendar event. Can include attendees and create a Teams meeting link.',
			parameters: {
				type: 'object',
				properties: {
					subject: {
						type: 'string',
						description: 'The title/subject of the meeting'
					},
					start: {
						type: 'string',
						description: 'Start time in ISO 8601 format (e.g., "2026-01-28T14:00:00")'
					},
					end: {
						type: 'string',
						description: 'End time in ISO 8601 format (e.g., "2026-01-28T15:00:00")'
					},
					timeZone: {
						type: 'string',
						description: 'Time zone for the event (e.g., "America/New_York", "Europe/London"). Defaults to UTC.'
					},
					body: {
						type: 'string',
						description: 'Description or agenda for the meeting (supports HTML)'
					},
					location: {
						type: 'string',
						description: 'Location of the meeting (e.g., "Conference Room A" or "Virtual")'
					},
					attendees: {
						type: 'string',
						description: 'Comma-separated list of attendee email addresses'
					},
					createTeamsMeeting: {
						type: 'string',
						description: 'Set to "true" to create a Microsoft Teams meeting with the event',
						enum: ['true', 'false']
					}
				},
				required: ['subject', 'start', 'end']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'calendar_get_free_busy',
			description: 'Check availability (free/busy status) for one or more people during a time range.',
			parameters: {
				type: 'object',
				properties: {
					emails: {
						type: 'string',
						description: 'Comma-separated list of email addresses to check availability for'
					},
					startDateTime: {
						type: 'string',
						description: 'Start of the time range in ISO 8601 format'
					},
					endDateTime: {
						type: 'string',
						description: 'End of the time range in ISO 8601 format'
					},
					timeZone: {
						type: 'string',
						description: 'Time zone for the query (e.g., "America/New_York"). Defaults to UTC.'
					}
				},
				required: ['emails', 'startDateTime', 'endDateTime']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'calendar_find_meeting_times',
			description: 'Find available time slots that work for all specified attendees.',
			parameters: {
				type: 'object',
				properties: {
					attendees: {
						type: 'string',
						description: 'Comma-separated list of attendee email addresses'
					},
					durationMinutes: {
						type: 'string',
						description: 'Duration of the meeting in minutes (e.g., "30", "60")'
					},
					startDateTime: {
						type: 'string',
						description: 'Start of the search range in ISO 8601 format'
					},
					endDateTime: {
						type: 'string',
						description: 'End of the search range in ISO 8601 format'
					},
					timeZone: {
						type: 'string',
						description: 'Time zone for the query. Defaults to UTC.'
					}
				},
				required: ['attendees', 'durationMinutes', 'startDateTime', 'endDateTime']
			}
		}
	}
];

// Email tools - OpenAI format (type: 'function', function.parameters)
// Mirrors the Anthropic-format tools in calendar/email-tools.ts
const emailToolsOpenAI = [
	{
		type: 'function' as const,
		function: {
			name: 'email_send_email',
			description: 'Send an email on behalf of the user via Microsoft Outlook. CRITICAL: You MUST draft the email in the conversation and get explicit user approval before calling this tool. Never call this tool without user confirmation.',
			parameters: {
				type: 'object',
				properties: {
					to: {
						type: 'string',
						description: 'Comma-separated list of recipient email addresses (To field)'
					},
					cc: {
						type: 'string',
						description: 'Comma-separated list of CC email addresses (optional)'
					},
					bcc: {
						type: 'string',
						description: 'Comma-separated list of BCC email addresses (optional)'
					},
					subject: {
						type: 'string',
						description: 'Email subject line'
					},
					body: {
						type: 'string',
						description: 'Email body in HTML format. Use <p> tags for paragraphs, <br> for line breaks, <strong> for bold, <em> for italic.'
					},
					saveToSentItems: {
						type: 'string',
						description: 'Whether to save the email in Sent Items folder. Defaults to "true".',
						enum: ['true', 'false']
					}
				},
				required: ['to', 'subject', 'body']
			}
		}
	}
];

// Document info for tool context
interface DocumentInfo {
	filename: string;
	content: string;
	charCount: number;
	contentType?: 'text' | 'image';
}

/**
 * Get the appropriate tool format for the model
 * Anthropic uses input_schema, OpenAI uses type:'function' with parameters
 * Optionally includes document reading tool when documents are available
 * Optionally includes commerce tools for shopping functionality
 * Optionally includes calendar tools for meeting/scheduling functionality
 */
function getToolsForModel(model: string, options: { includeDocumentTool?: boolean; includeCommerceTools?: boolean; includeCalendarTools?: boolean; includeEmailTools?: boolean } = {}): ToolDefinition[] {
	const { includeDocumentTool = false, includeCommerceTools = false, includeCalendarTools = false, includeEmailTools = false } = options;
	const lowerModel = model.toLowerCase();

	// Check if it's an Anthropic/Claude model
	if (lowerModel.includes('claude') || lowerModel.includes('anthropic')) {
		const tools = [webSearchToolAnthropic];
		if (includeDocumentTool) {
			tools.push(readDocumentToolAnthropic);
		}
		if (includeCommerceTools) {
			tools.push(...commerceTools);
		}
		if (includeCalendarTools) {
			tools.push(...calendarTools);
		}
		if (includeEmailTools) {
			tools.push(...emailTools);
		}
		return tools;
	}

	// For OpenAI and other models, use OpenAI format
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const tools: any[] = [webSearchToolOpenAI];
	if (includeDocumentTool) {
		tools.push(readDocumentToolOpenAI);
	}
	if (includeCommerceTools) {
		// Use OpenAI-formatted commerce tools for non-Claude models
		tools.push(...commerceToolsOpenAI);
	}
	if (includeCalendarTools) {
		// Use OpenAI-formatted calendar tools for non-Claude models
		tools.push(...calendarToolsOpenAI);
	}
	if (includeEmailTools) {
		// Use OpenAI-formatted email tools for non-Claude models
		tools.push(...emailToolsOpenAI);
	}
	// Cast to unknown first, then to ToolDefinition[] to satisfy type checker
	return tools as unknown as ToolDefinition[];
}

// System message to add when search is enabled
const searchSystemMessage = `You have access to web search. When you use the web_search tool:
1. Analyze the search results carefully and extract relevant information from the snippets
2. Synthesize the information into a clear, helpful response that directly answers the user's question
3. If the snippets don't contain enough detail, explain what you found and suggest the user visit the sources for more details
4. Always cite your sources by mentioning which results you drew information from
5. For weather, prices, or time-sensitive data, note that the information comes from web search and may need verification`;

// System message for commerce tools
const commerceSystemMessage = `You have access to commerce tools for searching and comparing products on South African e-commerce sites.

IMPORTANT: When the user asks about products, prices, shopping, or wants to buy something, you MUST use the commerce_search tool. Do NOT answer from your training data.

Available commerce tools:
- commerce_search: Search for products on Takealot and Amazon.co.za. Use this when users ask about products, want to compare options, or mention a budget/price range.
- commerce_get_product: Get detailed product information
- commerce_add_to_cart: Add items to the shopping cart
- commerce_checkout: Preview the checkout before purchase

Budget/Price handling - IMPORTANT:
- When user says "R5000" or "under R5000", pass max_price: 5000 (the number five thousand)
- When user says "R500", pass max_price: 500 (five hundred)
- When user says "R10000", pass max_price: 10000 (ten thousand)
- Always pass the EXACT number the user mentions - do not drop zeros!

Examples of when to use commerce_search:
- "Find me wireless earbuds under R500" → max_price: 500
- "Products under R5000" → max_price: 5000
- "Budget of R1500" → max_price: 1500

When presenting search results:
1. Highlight the best options based on price, rating, and value
2. Always mention the actual price and which site it's from
3. If a user mentions a budget, filter and prioritize results within that budget`;

// System message for calendar tools
const calendarSystemMessage = `You have access to calendar tools for managing meetings and checking availability.

IMPORTANT: When the user asks about their calendar, meetings, schedule, or wants to book time, you MUST use the appropriate calendar tool. Do NOT answer from assumptions.

Available calendar tools:
- calendar_list_events: List events in a time range. Use this when users ask "what's on my calendar" or "what meetings do I have".
- calendar_get_event: Get details about a specific event by ID.
- calendar_create_event: Create a new meeting. Can add attendees and create a Microsoft Teams meeting link.
- calendar_get_free_busy: Check availability/busy status for one or more people.
- calendar_find_meeting_times: Find time slots that work for all specified attendees.

Date/Time handling:
- Use ISO 8601 format for all dates (e.g., "2026-01-28T14:00:00")
- If user says "today", use today's date
- If user says "tomorrow", use tomorrow's date
- If user says "next week", calculate the appropriate date range
- For time zones, use the user's timezone if known, otherwise default to UTC

Examples of when to use calendar tools:
- "What's on my calendar today?" → calendar_list_events with today's date range
- "Schedule a meeting with john@example.com tomorrow at 2pm" → first ask to confirm details, THEN calendar_create_event
- "When is everyone free for a 30-minute meeting this week?" → calendar_find_meeting_times
- "Is Sarah available tomorrow afternoon?" → calendar_get_free_busy

⚠️ CRITICAL - BEFORE CREATING ANY CALENDAR EVENT:
You MUST confirm ALL of the following with the user before calling calendar_create_event:
1. **Email address**: Verify the EXACT email address (do not guess or auto-complete)
2. **Date and time**: Confirm the specific date, start time, and duration
3. **Meeting type**: Ask if they want a Microsoft Teams video call link included
4. **Meeting title**: Propose a clear subject line and get approval

DO NOT create a calendar event until the user has explicitly confirmed these details.
If ANY information is missing or ambiguous, ASK for clarification first.

Example confirmation flow:
User: "Schedule a meeting with Gabriel tomorrow at 2pm"
Assistant: "I'll help you schedule that meeting. Before I create it, please confirm:
- **Attendee email**: What is Gabriel's email address?
- **Duration**: How long should the meeting be? (30 min, 1 hour, etc.)
- **Teams meeting**: Should I include a Microsoft Teams video link?
- **Title**: What should I call this meeting?

Once you confirm these details, I'll create the invite."

NEVER skip the confirmation step for calendar_create_event. This prevents sending invites to wrong people.

✅ AFTER SUCCESSFULLY CREATING A CALENDAR EVENT:
Keep your response concise and helpful:
1. **Confirm success**: Briefly state the meeting was created
2. **Key details only**: Meeting title, date/time, attendees, and Teams link (if applicable)
3. **Offer preparation help**: Ask if they'd like help preparing for the meeting (agenda, talking points, background research on attendees/topics)

Example post-creation response:
"Done! I've created **[Meeting Title]** for [Date] at [Time] with [Attendees]. A Teams meeting link has been included in the invite.

Would you like help preparing for this meeting? I can help you:
- Draft an agenda
- Prepare talking points
- Research background on the topic or attendees"

Do NOT repeat all the raw tool output data. Keep it human-friendly and actionable.`;

// System message for email tools
const emailSystemMessage = `You have access to the email_send_email tool for sending emails via the user's Microsoft Outlook account.

⚠️ CRITICAL EMAIL PROTOCOL — You MUST follow these steps IN ORDER. Skipping any step is a serious error:

1. **DETECT email intent**: Look for signals like "send an email", "email [name]", "write to [person]", "follow up with", "let them know", etc. You may also proactively offer to draft an email when context makes it natural (e.g., after a meeting discussion).

2. **DRAFT in conversation (MANDATORY)**: Before calling the tool, you MUST show the full draft in conversation:
   - **To:** [recipients]
   - **CC:** [if any]
   - **Subject:** [subject line]
   - **Body:**
   [Full email body text]

3. **ASK for confirmation (MANDATORY)**: After showing the draft, ask: "Shall I send this?" or similar. Wait for explicit approval.

4. **SEND only after approval**: Only call email_send_email AFTER the user explicitly confirms (e.g., "yes", "send it", "looks good, send", "go ahead").

NEVER skip the draft preview. NEVER send on the first response. NEVER call the tool without explicit user approval.

If the user wants changes to the draft, revise it and show the updated version before asking again.

Example flow:
User: "Email Sarah about the project timeline update"
Assistant: "Here's a draft email:

**To:** [need Sarah's email address]
**Subject:** Project Timeline Update

**Body:**
Hi Sarah,

I wanted to share an update on the project timeline...

Could you provide Sarah's email address so I can finalize this draft?"

Available email tools:
- email_send_email: Send an email via Microsoft Outlook. Requires to, subject, and body (HTML format). Optional: cc, bcc, saveToSentItems.

Email body format:
- Use HTML: <p> for paragraphs, <br> for line breaks, <strong> for bold, <em> for italic
- Keep formatting clean and professional
- Convert the plain text draft to proper HTML when sending`;

/**
 * Prepare messages with search, commerce, calendar, and email system context
 * Adds or augments the system message with tool instructions
 * Preserves cache_control if present on the system message
 */
function prepareMessagesWithSearchContext(
	messages: ChatCompletionRequest['messages'],
	options: { includeCalendarContext?: boolean; includeEmailContext?: boolean } = {}
): ChatCompletionRequest['messages'] {
	const { includeCalendarContext = false, includeEmailContext = false } = options;
	const result = [...messages];

	// Combined context for all tools (conditionally include calendar and email)
	let toolContext = `${searchSystemMessage}\n\n${commerceSystemMessage}`;
	if (includeCalendarContext) {
		toolContext += `\n\n${calendarSystemMessage}`;
	}
	if (includeEmailContext) {
		toolContext += `\n\n${emailSystemMessage}`;
	}

	// Check if there's already a system message
	const systemIndex = result.findIndex(m => m.role === 'system');

	if (systemIndex >= 0) {
		// Augment existing system message
		const existingSystem = result[systemIndex];

		// Handle cache_control format (content is array with cache_control)
		if (Array.isArray(existingSystem.content) && existingSystem.content.length > 0) {
			const blocks = [...existingSystem.content] as MessageContentBlock[];
			const lastBlock = blocks[blocks.length - 1];

			// Append search context to the last text block
			if ('text' in lastBlock) {
				blocks[blocks.length - 1] = {
					...lastBlock,
					text: `${lastBlock.text}\n\n${toolContext}`
				};
			} else {
				// Add as new block (preserving cache_control on existing block)
				blocks.push({
					type: 'text' as const,
					text: toolContext
				});
			}

			result[systemIndex] = {
				...existingSystem,
				content: blocks
			};
		} else {
			// Simple string content
			const existingContent = typeof existingSystem.content === 'string'
				? existingSystem.content
				: JSON.stringify(existingSystem.content);
			result[systemIndex] = {
				...existingSystem,
				content: `${existingContent}\n\n${toolContext}`
			};
		}
	} else {
		// Add new system message at the beginning
		result.unshift({
			role: 'system',
			content: toolContext
		});
	}

	return result;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify session
	if (!locals.session) {
		return new Response(
			JSON.stringify({ error: { message: 'Unauthorized', type: 'auth_error' } }),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Capture userId for use throughout the handler
	const sessionUserId = locals.session.userId;

	// Fetch user timezone from preferences for temporal context in prompts
	// Falls back to 'Africa/Johannesburg' if not set (handled by getTemporalContext)
	let userTimezone: string | undefined;
	try {
		const preferences = await postgresUserRepository.getPreferences(sessionUserId);
		userTimezone = (preferences.timezone as string) || undefined;
	} catch {
		// Non-critical - temporal context will use default timezone
		debugLog('CHAT', 'Failed to fetch user timezone, using default');
	}

	// Check if user has calendar integration connected
	// This makes calendar tools available in ALL chat contexts (one-size-fits-all approach)
	let calendarAccessToken: string | null = null;
	try {
		const calendarIntegration = await postgresIntegrationsRepository.findByUserAndService(
			sessionUserId,
			'calendar'
		);
		if (calendarIntegration && calendarIntegration.status === 'connected') {
			// Check if access token is still valid
			const hasValidToken = await postgresIntegrationCredentialsRepository.hasValidAccessToken(calendarIntegration.id);

			if (hasValidToken) {
				// Token is valid, use it directly
				const accessTokenCred = await postgresIntegrationCredentialsRepository.getDecryptedCredential(
					calendarIntegration.id,
					'access_token'
				);
				if (accessTokenCred) {
					calendarAccessToken = accessTokenCred.value;
					debugLog('CHAT', 'Calendar integration connected - using valid access token');
				}
			} else {
				// Token expired, try to refresh
				debugLog('CHAT', 'Calendar access token expired, attempting refresh...');
				const refreshTokenCred = await postgresIntegrationCredentialsRepository.getDecryptedCredential(
					calendarIntegration.id,
					'refresh_token'
				);

				if (refreshTokenCred) {
					try {
						// Refresh the tokens
						const newTokens = await refreshAccessToken(refreshTokenCred.value);
						const newCredentials = tokensToCredentials(newTokens);

						// Store the new credentials
						for (const cred of newCredentials) {
							await postgresIntegrationCredentialsRepository.upsert({
								integrationId: calendarIntegration.id,
								credentialType: cred.type,
								value: cred.value,
								expiresAt: cred.expiresAt,
								scope: cred.scope
							});
						}

						// Use the new access token
						calendarAccessToken = newTokens.accessToken;
						debugLog('CHAT', 'Calendar tokens refreshed successfully');
					} catch (refreshError) {
						console.error('Failed to refresh calendar token:', refreshError);
						// Mark integration as needing reconnection
						await postgresIntegrationsRepository.updateStatus(calendarIntegration.id, 'error');
						debugLog('CHAT', 'Calendar token refresh failed - user needs to reconnect');
					}
				} else {
					debugLog('CHAT', 'No refresh token available for calendar');
				}
			}
		}
	} catch (error) {
		// Non-critical - calendar tools just won't be available
		console.error('Calendar integration check failed:', error);
		debugLog('CHAT', 'Failed to check calendar integration');
	}

	// Parse request body
	let body: ChatCompletionRequest;
	try {
		body = await request.json();
	} catch {
		return new Response(
			JSON.stringify({ error: { message: 'Invalid JSON', type: 'parse_error' } }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Validate request
	if (!body.model || !body.messages || !Array.isArray(body.messages)) {
		return new Response(
			JSON.stringify({
				error: { message: 'Invalid request: model and messages are required', type: 'validation_error' }
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Check if search is enabled and Brave Search is configured
	const braveConfigured = isBraveSearchConfigured();
	const searchEnabled = body.searchEnabled && braveConfigured;

	// Check if extended thinking is enabled for Claude models
	// In AUTO mode, allow thinking - router will select a thinking-capable model
	const isAutoModeRequest = isAutoMode(body.model);
	const thinkingEnabled = body.thinkingEnabled && (isAutoModeRequest || supportsExtendedThinking(body.model));

	debugLog('CHAT', 'Search enabled:', searchEnabled, 'configured:', braveConfigured);
	debugLog('CHAT', 'Thinking enabled:', thinkingEnabled, 'model supports:', supportsExtendedThinking(body.model));

	// Extract space, assist context, focused task, plan mode, and focus area (before removing client fields)
	const space = body.space;
	const assistContext: AssistContext | null = body.assistId ? {
		assistId: body.assistId,
		assistPhase: body.assistPhase,
		assistTasks: body.assistTasks,
		assistFocusedTask: body.assistFocusedTask
	} : null;
	const focusedTask: FocusedTaskInfo | null = body.focusedTask ?? null;
	let planModeContext: PlanModeContext | null = body.planMode ?? null;
	const areaId = body.areaId;

	// Debug logging: What plan mode context did we receive?
	debugLog('CHAT', '========== CHAT API REQUEST ==========');
	debugLog('CHAT', `body.planMode received:`, body.planMode ? 'YES' : 'NO');
	if (body.planMode) {
		debugLog('CHAT', `planMode.taskId: ${body.planMode.taskId}`);
		debugLog('CHAT', `planMode.phase: ${body.planMode.phase}`);
		debugLog('CHAT', `planMode.exchangeCount: ${body.planMode.exchangeCount}`);
	}
	debugLog('CHAT', '========================================\n');

	// Fetch planning conversation context for subtasks
	// This provides warm-start context from the Plan Mode conversation that created the subtask
	let focusedTaskWithPlanningContext: FocusedTaskInfo | null = focusedTask;
	if (focusedTask?.isSubtask && focusedTask?.sourceConversationId) {
		try {
			const userId = sessionUserId;
			const planningConversation = await postgresConversationRepository.findById(focusedTask.sourceConversationId, userId);

			if (planningConversation?.messages && planningConversation.messages.length > 0) {
				// Generate a concise summary of the planning conversation
				const planningMessages = planningConversation.messages;

				// Extract the key points from the planning conversation
				// Focus on user requirements and AI's understanding
				const summary = planningMessages
					.map(msg => {
						const role = msg.role === 'user' ? 'User' : 'AI';
						let content = '';
						if (typeof msg.content === 'string') {
							content = msg.content;
						} else if (Array.isArray(msg.content)) {
							content = (msg.content as Array<{ type: string; text?: string }>)
								.filter(c => c.type === 'text' && c.text)
								.map(c => c.text)
								.join(' ');
						}
						// Truncate long messages
						const truncated = content.length > 500 ? content.slice(0, 500) + '...' : content;
						return `${role}: ${truncated}`;
					})
					.join('\n\n');

				// Add the summary to focusedTask
				focusedTaskWithPlanningContext = {
					...focusedTask,
					planningConversationSummary: summary
				};

				debugLog('CHAT', `Loaded planning conversation context for subtask (${planningMessages.length} messages)`);
			}
		} catch (error) {
			console.warn('[API] Failed to load planning conversation context:', error);
			// Continue without planning context - non-critical
		}
	}

	// Fetch space context - for spaces with user-provided context
	let spaceContext: SpaceInfo | null = null;
	if (space) {
		try {
			const userId = sessionUserId;
			const spaceData = await postgresSpaceRepository.findBySlug(space, userId);

			if (spaceData) {
				spaceContext = {
					id: spaceData.id,
					name: spaceData.name,
					slug: spaceData.slug,
					type: spaceData.type,
					context: spaceData.context
				};

				// Fetch documents if space has document IDs
				if (spaceData.contextDocumentIds && spaceData.contextDocumentIds.length > 0) {
					const documents = await Promise.all(
						spaceData.contextDocumentIds.map(async (docId) => {
							const doc = await postgresDocumentRepository.findById(docId, userId);
							return doc;
						})
					);

					// Filter out nulls and map to context format
					const validDocs = documents.filter((doc): doc is NonNullable<typeof doc> => doc !== null);
					if (validDocs.length > 0) {
						// Generate summaries on-demand for text documents missing them
						// Images don't need summarization - they're processed visually
						spaceContext.contextDocuments = await Promise.all(
							validDocs.map(async (doc) => {
								let summary = doc.summary;
								// Only generate summary for text documents that need it
								const isImage = doc.contentType === 'image';
								if (!isImage && needsSummarization(doc.charCount, summary)) {
									summary = await generateSummaryOnDemand(
										doc.id,
										doc.content,
										doc.filename,
										userId,
										locals.session!.organizationId
									);
								}
								return {
									id: doc.id,
									filename: doc.filename,
									content: doc.content,
									charCount: doc.charCount,
									summary: isImage ? undefined : (summary ?? undefined),
									contentType: doc.contentType,
									mimeType: doc.mimeType
								};
							})
						);
						debugLog('CHAT', `Space "${spaceData.name}" loaded with ${validDocs.length} document(s)`);
					}
				}

				// Log if space has context or documents
				if (spaceData.context || spaceContext.contextDocuments?.length) {
					debugLog('CHAT', `Space context loaded: "${spaceData.name}" (context: ${!!spaceData.context}, docs: ${spaceContext.contextDocuments?.length || 0})`);
				}
			}
		} catch (error) {
			// Log but don't fail - space context is optional enhancement
			console.warn('Failed to load space context:', error);
		}
	}

	// Fetch focus area context if areaId is provided
	let focusAreaContext: FocusAreaInfo | null = null;
	if (areaId) {
		try {
			const userId = sessionUserId;
			const focusArea = await postgresAreaRepository.findById(areaId, userId);

			if (focusArea) {
				debugLog('CHAT', `Focus area found:`, {
					id: focusArea.id,
					name: focusArea.name,
					contextDocumentIds: focusArea.contextDocumentIds,
					hasDocIds: !!focusArea.contextDocumentIds,
					docIdsLength: focusArea.contextDocumentIds?.length
				});

				focusAreaContext = {
					id: focusArea.id,
					name: focusArea.name,
					context: focusArea.context,
					spaceId: focusArea.spaceId
				};

				// Fetch documents if focus area has document IDs
				if (focusArea.contextDocumentIds && focusArea.contextDocumentIds.length > 0) {
					const documents = await Promise.all(
						focusArea.contextDocumentIds.map(async (docId) => {
							const doc = await postgresDocumentRepository.findById(docId, userId);
							return doc;
						})
					);

					// Filter out nulls and map to context format
					const validDocs = documents.filter((doc): doc is NonNullable<typeof doc> => doc !== null);
					if (validDocs.length > 0) {
						// Generate summaries on-demand for text documents missing them
						// Images don't need summarization - they're processed visually
						focusAreaContext.contextDocuments = await Promise.all(
							validDocs.map(async (doc) => {
								let summary = doc.summary;
								// Only generate summary for text documents that need it
								const isImage = doc.contentType === 'image';
								if (!isImage && needsSummarization(doc.charCount, summary)) {
									summary = await generateSummaryOnDemand(
										doc.id,
										doc.content,
										doc.filename,
										userId,
										locals.session!.organizationId
									);
								}
								return {
									id: doc.id,
									filename: doc.filename,
									content: doc.content,
									charCount: doc.charCount,
									summary: isImage ? undefined : (summary ?? undefined),
									contentType: doc.contentType,
									mimeType: doc.mimeType
								};
							})
						);
						debugLog('CHAT', `Focus area "${focusArea.name}" loaded with ${validDocs.length} document(s)`);
					}
				}

				debugLog('CHAT', `Focus area context loaded: "${focusArea.name}" in space "${focusArea.spaceId}"`);

				// Phase 2: Load finalized pages in context for this area
				try {
					const contextPages = await postgresPageRepository.findPagesInContext(areaId);
					if (contextPages.length > 0) {
						const pageContextDocs: ContextDocument[] = contextPages.map(page => ({
							id: page.id,
							filename: `[Page] ${page.title}${page.contextVersionNumber ? ` (v${page.contextVersionNumber}, being updated)` : ''}`,
							content: page.contentText || '',
							charCount: page.contentText?.length || page.wordCount * 5,
							summary: page.contentText?.slice(0, 800) || undefined,
							contentType: 'text' as const
						}));

						focusAreaContext.contextDocuments = [
							...(focusAreaContext.contextDocuments || []),
							...pageContextDocs
						];
						debugLog('CHAT', `Loaded ${contextPages.length} page(s) in context for area "${focusArea.name}"`);
					}
				} catch (pageError) {
					console.warn('Failed to load pages in context:', pageError);
				}
			}
		} catch (error) {
			// Log but don't fail - focus area context is optional enhancement
			console.warn('Failed to load focus area context:', error);
		}
	}

	// Fetch task context for Plan Mode if a task is selected
	// This provides documents, related tasks, and task description as context for planning
	if (planModeContext?.taskId) {
		try {
			const userId = sessionUserId;

			// Fetch task for description, documents, and related tasks in parallel
			const [task, linkedDocs, relatedTasksInfo] = await Promise.all([
				postgresTaskRepository.findById(planModeContext.taskId, userId),
				postgresDocumentRepository.getDocumentsForTask(planModeContext.taskId, userId),
				postgresTaskRepository.getRelatedTasks(planModeContext.taskId, userId)
			]);

			// Add task description if available
			if (task?.description) {
				planModeContext = { ...planModeContext, description: task.description };
				debugLog('PLAN', `Task has description (${task.description.length} chars)`);
			}

			// Attach context if we have documents or related tasks
			if (linkedDocs.length > 0 || relatedTasksInfo.length > 0) {
				planModeContext = {
					...planModeContext,
					context: {
						documents: linkedDocs.map((doc) => ({
							id: doc.id,
							filename: doc.filename,
							content: doc.content,
							summary: doc.summary,
							charCount: doc.charCount,
							role: doc.contextRole
						})),
						relatedTasks: relatedTasksInfo.map((rt) => ({
							id: rt.task.id,
							title: rt.task.title,
							contextSummary: rt.task.contextSummary,
							status: rt.task.status,
							relationship: rt.relationshipType
						}))
					}
				};

				debugLog('PLAN', `Context loaded: ${linkedDocs.length} documents, ${relatedTasksInfo.length} related tasks`);
			}
		} catch (error) {
			// Log but don't fail - context is optional enhancement
			console.warn('Failed to load Plan Mode task context:', error);
		}
	}

	// ============================================
	// AUTO MODEL ROUTING
	// ============================================
	// If model is 'auto' or 'AUTO', use the router to select optimal model
	let routingDecision: RoutingDecision | null = null;
	let resolvedModel = body.model;

	if (isAutoMode(body.model)) {
		// Extract the last user message for query analysis
		const lastUserMessage = body.messages
			.filter(m => m.role === 'user')
			.pop();

		const userQuery = lastUserMessage
			? (typeof lastUserMessage.content === 'string'
				? lastUserMessage.content
				: Array.isArray(lastUserMessage.content)
					? lastUserMessage.content
						.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
						.map(c => c.text)
						.join(' ')
					: '')
			: '';

		// Map space to routing context - now accepts any space slug
		const mapSpaceType = (s: typeof space): RoutingContext['spaceType'] => {
			return s || null;
		};

		// Fetch recent complexity scores for cache coherence (non-blocking if fails)
		let recentComplexityScores: number[] = [];
		try {
			recentComplexityScores = await postgresRoutingDecisionsRepository.getRecentScoresForUser(sessionUserId, 3);
		} catch (err) {
			console.warn('[Router] Failed to fetch recent complexity scores:', err);
		}

		// Build routing context from available information
		const routingContext: RoutingContext = {
			...getDefaultContext(),
			provider: body.provider || 'anthropic',
			thinkingEnabled: !!thinkingEnabled, // Ensure boolean
			userTier: 'pro', // TODO: Get from user session when available
			spaceType: mapSpaceType(space),
			spaceSlug: spaceContext?.slug || null,
			areaId: areaId || null,
			areaHasDocs: (focusAreaContext?.contextDocuments?.length ?? 0) > 0,
			isTaskPlanMode: !!planModeContext,
			planModePhase: planModeContext?.phase || null,
			conversationTurn: body.conversationTurn || Math.floor(body.messages.filter(m => m.role === 'user').length),
			currentModel: body.currentModel || null,
			recentComplexityScores
		};

		// Run the router
		routingDecision = routeQuery(userQuery, routingContext);
		resolvedModel = routingDecision.selectedModel;

		// Log routing decision
		debugLog('ROUTER', '\n========== AUTO MODEL ROUTING ==========');
		debugLog('ROUTER', `Query: "${userQuery.slice(0, 100)}${userQuery.length > 100 ? '...' : ''}"`);
		debugLog('ROUTER', `Score: ${routingDecision.complexity.score}/100 (${routingDecision.tier})`);
		debugLog('ROUTER', `Confidence: ${(routingDecision.complexity.confidence * 100).toFixed(0)}%`);
		debugLog('ROUTER', `Selected: ${resolvedModel}`);
		if (routingDecision.overrides.length > 0) {
			debugLog('ROUTER', `Overrides: ${routingDecision.overrides.map(o => o.type).join(', ')}`);
		}
		debugLog('ROUTER', `Time: ${routingDecision.routingTimeMs.toFixed(2)}ms`);
		debugLog('ROUTER', `Reasoning: ${routingDecision.reasoning}`);
		debugLog('ROUTER', '=========================================\n');

		// Log routing decision to database for analytics (non-blocking)
		postgresRoutingDecisionsRepository.create({
			userId: sessionUserId,
			organizationId: locals.session.organizationId || null,
			conversationId: null, // Not passed in request currently
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
			// Store the record ID on the routing decision for outcome updates
			(routingDecision as RoutingDecision & { recordId?: string }).recordId = record.id;
		}).catch(err => {
			// Non-critical - log but don't fail the request
			console.error('[Router] Failed to log routing decision:', err);
		});
	}

	// Remove client-specific fields before forwarding to LiteLLM
	const { searchEnabled: _, thinkingEnabled: __, thinkingBudgetTokens: ___, space: ____, assistId: _____, assistPhase: ______, assistTasks: _______, assistFocusedTask: ________, focusedTask: _________, planMode: __________, areaId: ___________, provider: ____________, currentModel: _____________, conversationTurn: ______________, systemPrompt: customSystemPrompt, ...cleanBody } = body;

	// Use the resolved model (either original or from routing)
	cleanBody.model = resolvedModel;

	// If a custom system prompt is provided (e.g., for Page Discussion), inject it into messages
	// This happens BEFORE platform prompt injection so both get composed properly
	if (customSystemPrompt && typeof customSystemPrompt === 'string' && customSystemPrompt.trim()) {
		debugLog('CHAT', 'Custom system prompt provided, injecting into messages');
		cleanBody.messages = injectSystemPrompt(cleanBody.messages as ChatMessage[], customSystemPrompt);
	}

	// Disable extended thinking during Plan Mode eliciting phase
	// Reason: We enforce max_tokens=120 for brief responses, which conflicts with thinking.budget_tokens
	const effectiveThinkingEnabled = thinkingEnabled && !(planModeContext?.phase === 'eliciting');
	if (planModeContext?.phase === 'eliciting' && thinkingEnabled) {
		debugLog('PLAN', 'Extended thinking disabled during eliciting phase (max_tokens constraint)');
	}

	// Add thinking config if enabled AND resolved model supports it
	// Note: Router guarantees a thinking-capable model when thinkingEnabled is in context
	if (effectiveThinkingEnabled && supportsExtendedThinking(resolvedModel)) {
		cleanBody.thinking = {
			type: 'enabled',
			budget_tokens: body.thinkingBudgetTokens || 10000
		};
		debugLog('CHAT', `Thinking enabled for ${resolvedModel} with budget ${body.thinkingBudgetTokens || 10000} tokens`);
	} else if (effectiveThinkingEnabled && !supportsExtendedThinking(resolvedModel)) {
		debugLog('CHAT', `Warning: Thinking requested but ${resolvedModel} doesn't support it - this shouldn't happen with AUTO routing`);
	}

	try {
		debugLog('CHAT', 'Forwarding to LiteLLM:', cleanBody.model, cleanBody.messages.length, 'messages', searchEnabled ? '(search enabled)' : '', thinkingEnabled ? '(thinking enabled)' : '');

		// Determine if we need tool handling:
		// 1. Web search is enabled
		// 2. Reference documents exist (enables on-demand document reading via read_document tool)
		//    - This is critical for cost optimization: prompts contain summaries, tool provides full content
		const hasReferenceDocuments =
			(focusAreaContext?.contextDocuments?.length ?? 0) > 0 ||
			(planModeContext?.context?.documents?.length ?? 0) > 0 ||
			(spaceContext?.contextDocuments?.length ?? 0) > 0;
		const hasCalendarAccess = !!calendarAccessToken;
		const needsToolHandling = searchEnabled || hasReferenceDocuments || hasCalendarAccess;

		if (needsToolHandling) {
			return await handleChatWithTools(cleanBody, effectiveThinkingEnabled, space, assistContext, focusedTaskWithPlanningContext, planModeContext, focusAreaContext, spaceContext, sessionUserId, locals.session.organizationId, routingDecision, userTimezone, searchEnabled, calendarAccessToken);
		}

		// Inject platform system prompt with space + focus area + custom space context (before cache breakpoints so it gets cached)
		// Note: searchEnabled=false here since we're in the non-tool path (needsToolHandling was false)
		const messagesWithPlatformPrompt = injectPlatformPrompt(cleanBody.messages as ChatMessage[], cleanBody.model as string, space, assistContext, focusedTaskWithPlanningContext, planModeContext, focusAreaContext, spaceContext, userTimezone, false);

		// Inject image context documents as vision content blocks (for models that support vision)
		const messagesWithImageContext = injectImageContext(messagesWithPlatformPrompt, cleanBody.model as string, focusAreaContext, spaceContext);

		// Apply cache breakpoints for Claude models (conversation history caching)
		const messagesWithCache = addCacheBreakpoints(messagesWithImageContext, cleanBody.model);
		
		// Final safety check: enforce Anthropic's 4 cache_control block limit
		const validatedMessages = enforceCacheControlLimit(messagesWithCache, cleanBody.model);

		// DEBUG: Count exact cache_control blocks being sent to LiteLLM
		let totalCacheBlocks = 0;
		validatedMessages.forEach((msg, idx) => {
			if (Array.isArray(msg.content)) {
				msg.content.forEach((block, blockIdx) => {
					if ('cache_control' in block && block.cache_control) {
						totalCacheBlocks++;
						console.log(`[Cache Debug] Message ${idx} (${msg.role}), Block ${blockIdx}: HAS cache_control`);
					}
				});
			}
		});
		console.log(`[Cache Debug] TOTAL cache_control blocks being sent to LiteLLM: ${totalCacheBlocks}`);
		if (totalCacheBlocks > 4) {
			console.error(`[Cache Debug] ❌ EXCEEDED LIMIT BEFORE LITELLM! Found ${totalCacheBlocks} blocks`);
		}

		// Log cache breakpoint application for debugging
		if (shouldUseCacheControl(cleanBody.model)) {
			const cachedCount = validatedMessages.filter(m =>
				Array.isArray(m.content) &&
				m.content.some((c: MessageContentBlock) => 'cache_control' in c)
			).length;
			debugLog('CACHE', `Cache breakpoints: ${cachedCount}/${validatedMessages.length} messages marked for caching`);
		}

		// Build request options
		const requestOptions: typeof cleanBody & { max_tokens?: number } = {
			...cleanBody,
			messages: validatedMessages
		};

		// Structural constraint: limit response length during ALL of Plan Mode elicitation
		// This prevents the AI from dumping content - user must explicitly trigger proposal
		if (planModeContext?.phase === 'eliciting') {
			// Exchange 0-1: 400 char limit → ~120 tokens
			// Exchange 2+: 300 char limit → ~100 tokens
			const tokenLimit = (planModeContext.exchangeCount || 0) >= 2 ? 100 : 120;
			requestOptions.max_tokens = tokenLimit;
			debugLog('PLAN', `Elicitation constraint: max_tokens=${tokenLimit} (exchange ${planModeContext.exchangeCount || 0})`);
		}

		// Standard streaming response without tools
		const litellmResponse = await createChatCompletion(requestOptions);
		debugLog('CHAT', 'LiteLLM response status:', litellmResponse.status);

		// Log cache statistics if available (for monitoring prompt caching effectiveness)
		const cacheHeader = litellmResponse.headers.get('x-litellm-cache-key');
		if (cacheHeader) {
			debugLog('CACHE', 'Cache key:', cacheHeader);
		}

		// Check for cache statistics in response headers (Anthropic returns these)
		const cacheCreation = litellmResponse.headers.get('x-cache-creation-input-tokens');
		const cacheRead = litellmResponse.headers.get('x-cache-read-input-tokens');
		if (cacheCreation || cacheRead) {
			debugLog('CACHE', 'Cache stats:', {
				created: cacheCreation || '0',
				read: cacheRead || '0',
				savings: cacheRead ? `${Math.round(parseInt(cacheRead) * 0.9)} tokens at 90% off` : 'N/A'
			});
		}

		if (!litellmResponse.ok) {
			return await handleLiteLLMError(litellmResponse);
		}

		// Build usage context for tracking
		const usageContext: UsageContext = {
			organizationId: locals.session.organizationId,
			userId: sessionUserId,
			model: cleanBody.model,
			requestType: 'chat'
		};

		// Extract cache headers for usage tracking
		const cacheHeaders = {
			cacheCreation: cacheCreation ? parseInt(cacheCreation, 10) : 0,
			cacheRead: cacheRead ? parseInt(cacheRead, 10) : 0
		};

		return streamResponse(litellmResponse, effectiveThinkingEnabled, usageContext, cacheHeaders, routingDecision);

	} catch (err) {
		console.error('Chat endpoint error:', err);
		return new Response(
			JSON.stringify({
				error: {
					message: mapErrorMessage(err),
					type: 'server_error'
				}
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};

/**
 * Handle chat with tools (web search)
 * This uses non-streaming for the initial request to detect tool use
 * Supports interleaved thinking for Claude 4+ models when thinkingEnabled is true
 *
 * IMPORTANT: Anthropic requires ALL tool_use blocks to have corresponding
 * tool_result blocks in the immediately following message. We must:
 * 1. Execute ALL tool calls first
 * 2. Collect ALL results
 * 3. Send ALL tool_result blocks together in ONE message
 */
async function handleChatWithTools(body: ChatCompletionRequest, thinkingEnabled: boolean = false, space?: SpaceType | null, assistContext?: AssistContext | null, focusedTask?: FocusedTaskInfo | null, planModeContext?: PlanModeContext | null, focusArea?: FocusAreaInfo | null, spaceInfo?: SpaceInfo | null, userId?: string, organizationId?: string, routingDecision?: RoutingDecision | null, timezone?: string, searchEnabled?: boolean, calendarAccessToken?: string | null): Promise<Response> {
	const encoder = new TextEncoder();

	// Build usage context for tracking (if we have the required data)
	const usageContext: UsageContext | undefined = userId && organizationId ? {
		organizationId,
		userId,
		model: body.model,
		requestType: 'chat'
	} : undefined;

	// Build map of available documents (from space, focus area, and/or plan mode task context)
	// This enables the read_document tool to access full content when AI needs details beyond summaries
	const availableDocuments = new Map<string, DocumentInfo>();
	if (spaceInfo?.contextDocuments) {
		for (const doc of spaceInfo.contextDocuments) {
			availableDocuments.set(doc.filename, {
				filename: doc.filename,
				content: doc.content,
				charCount: doc.charCount,
				contentType: doc.contentType
			});
		}
	}
	if (focusArea?.contextDocuments) {
		for (const doc of focusArea.contextDocuments) {
			availableDocuments.set(doc.filename, {
				filename: doc.filename,
				content: doc.content,
				charCount: doc.charCount,
				contentType: doc.contentType
			});
		}
	}
	if (planModeContext?.context?.documents) {
		for (const doc of planModeContext.context.documents) {
			availableDocuments.set(doc.filename, {
				filename: doc.filename,
				content: doc.content,
				charCount: doc.charCount
				// Plan mode docs don't have contentType yet
			});
		}
	}
	const hasDocuments = availableDocuments.size > 0;

	// Inject platform prompt with space + focus area + custom space context (and assist if active), then cache breakpoints, then search context
	// Pass searchEnabled to conditionally include commerce search instructions
	const messagesWithPlatformPrompt = injectPlatformPrompt(body.messages, body.model, space, assistContext, focusedTask, planModeContext, focusArea, spaceInfo, timezone, searchEnabled);

	// Inject image context documents as vision content blocks (for models that support vision)
	const messagesWithImageContext = injectImageContext(messagesWithPlatformPrompt, body.model, focusArea, spaceInfo);

	const cachedMessages = addCacheBreakpoints(messagesWithImageContext, body.model);
	const messagesWithSearchContext = prepareMessagesWithSearchContext(cachedMessages, {
		includeCalendarContext: !!calendarAccessToken,
		includeEmailContext: !!calendarAccessToken
	});
	
	// Final safety check: enforce Anthropic's 4 cache_control block limit
	const finalMessages = enforceCacheControlLimit(messagesWithSearchContext, body.model);

	// DEBUG: Count exact cache_control blocks being sent to LiteLLM (tool path)
	let totalCacheBlocksTool = 0;
	finalMessages.forEach((msg, idx) => {
		if (Array.isArray(msg.content)) {
			msg.content.forEach((block, blockIdx) => {
				if ('cache_control' in block && block.cache_control) {
					totalCacheBlocksTool++;
					console.log(`[Cache Debug Tool] Message ${idx} (${msg.role}), Block ${blockIdx}: HAS cache_control`);
				}
			});
		}
	});
	console.log(`[Cache Debug Tool] TOTAL cache_control blocks being sent to LiteLLM: ${totalCacheBlocksTool}`);
	if (totalCacheBlocksTool > 4) {
		console.error(`[Cache Debug Tool] ❌ EXCEEDED LIMIT BEFORE LITELLM! Found ${totalCacheBlocksTool} blocks`);
	}

	// Create a ReadableStream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			// Start heartbeat to keep connection alive (prevents Cloudflare 100s timeout)
			const stopHeartbeat = startHeartbeat(controller, encoder);

			// Emit routing decision first if AUTO mode was used
			if (routingDecision) {
				sendSSE(controller, encoder, {
					type: 'routing',
					selectedModel: routingDecision.selectedModel,
					tier: routingDecision.tier,
					score: routingDecision.complexity.score,
					confidence: routingDecision.complexity.confidence,
					reasoning: routingDecision.reasoning,
					overrides: routingDecision.overrides.map(o => o.type)
				});
			}

			try {
				// Build request options with optional max_tokens constraint
				// Enable commerce tools for product search/purchase functionality
				const includeCommerceTools = true; // TODO: Control via space setting or feature flag
				// Enable calendar tools if user has calendar connected
				const includeCalendarTools = !!calendarAccessToken;
				// Enable email tools if user has Microsoft integration connected (same token)
				const includeEmailTools = !!calendarAccessToken;
				const toolRequestOptions: typeof body & { max_tokens?: number } = {
					...body,
					messages: finalMessages,
					stream: false,
					tools: getToolsForModel(body.model, { includeDocumentTool: hasDocuments, includeCommerceTools, includeCalendarTools, includeEmailTools })
				};

				// Structural constraint: limit response length during ALL of Plan Mode elicitation
				if (planModeContext?.phase === 'eliciting') {
					// Exchange 0-1: 400 char limit → ~120 tokens
					// Exchange 2+: 300 char limit → ~100 tokens
					const tokenLimit = (planModeContext.exchangeCount || 0) >= 2 ? 100 : 120;
					toolRequestOptions.max_tokens = tokenLimit;
					debugLog('PLAN', `Elicitation constraint (tools): max_tokens=${tokenLimit}`);
				}

				// Make initial request with tools (non-streaming to detect tool use)
				// Include document tool if documents are available (Plan Mode with reference docs)
				const initialResponse = await createChatCompletionWithTools(toolRequestOptions);

				if (!initialResponse.ok) {
					const errorBody = await initialResponse.text();
					console.error('LiteLLM error with tools:', initialResponse.status, errorBody);
					sendSSE(controller, encoder, {
						type: 'error',
						error: `Request failed: ${initialResponse.statusText}`
					});
					controller.close();
					return;
				}

				const responseData = await initialResponse.json();
				debugLog('CHAT', 'Initial response:', JSON.stringify(responseData, null, 2).slice(0, 1000));

				// Extract and send any thinking content from the initial response
				// This happens BEFORE tool execution for the premium UX
				if (thinkingEnabled) {
					const thinkingContent = extractThinkingFromResponse(responseData);
					if (thinkingContent) {
						sendSSE(controller, encoder, { type: 'thinking_start' });
						// Send thinking in chunks for streaming effect
						const chunkSize = 50;
						for (let i = 0; i < thinkingContent.length; i += chunkSize) {
							sendSSE(controller, encoder, {
								type: 'thinking',
								content: thinkingContent.slice(i, i + chunkSize)
							});
							await new Promise(resolve => setTimeout(resolve, 10));
						}
						sendSSE(controller, encoder, { type: 'thinking_end' });
					}
				}

				// Check if the model wants to use a tool
				const message = responseData.choices?.[0]?.message;
				const toolCalls = message?.tool_calls;

				if (toolCalls && toolCalls.length > 0) {
					debugLog('TOOLS', `Processing ${toolCalls.length} tool calls`);

					// Collect ALL sources and tool results
					const allSources: Array<{ title: string; url: string; snippet: string }> = [];
					const toolResults: Array<{ tool_call_id: string; content: string }> = [];
					const searchQueries: string[] = [];

					// First pass: collect all queries for status display
					for (const toolCall of toolCalls) {
						if (toolCall.function?.name === 'web_search') {
							const args = JSON.parse(toolCall.function.arguments || '{}');
							if (args.query) {
								searchQueries.push(args.query);
							}
						}
					}

					// Send searching status only if there are actual web searches
					if (searchQueries.length > 0) {
						const statusQuery = searchQueries.length === 1
							? searchQueries[0]
							: `${searchQueries.length} searches: ${searchQueries.slice(0, 2).join(', ')}${searchQueries.length > 2 ? '...' : ''}`;

						sendSSE(controller, encoder, {
							type: 'status',
							status: 'searching',
							query: statusQuery
						});
					}

					// Execute ALL tool calls and collect results
					for (const toolCall of toolCalls) {
						if (toolCall.function?.name === 'web_search') {
							const args = JSON.parse(toolCall.function.arguments || '{}');
							const query = args.query;

							if (query) {
								debugLog('TOOLS', 'Executing web search:', query);

								try {
									const searchResults = await searchWeb(query);
									debugLog('TOOLS', 'Search returned', searchResults.length, 'results for:', query);

									// Collect sources
									allSources.push(...searchResults.map(r => ({
										title: r.title,
										url: r.url,
										snippet: r.description
									})));

									// Format results for LLM
									const formattedResults = formatSearchResultsForLLM(searchResults);

									// Store tool result for this tool call
									toolResults.push({
										tool_call_id: toolCall.id,
										content: formattedResults
									});
								} catch (searchError) {
									console.error('Search error for query:', query, searchError);
									// Still add a tool result even on error (required by Anthropic)
									toolResults.push({
										tool_call_id: toolCall.id,
										content: `Search failed for "${query}": ${searchError instanceof Error ? searchError.message : 'Unknown error'}`
									});
								}
							} else {
								// No query provided - add empty result
								toolResults.push({
									tool_call_id: toolCall.id,
									content: 'No search query provided'
								});
							}
						} else if (toolCall.function?.name === 'read_document') {
							// Document reading tool - used in Plan Mode for reference docs
							const args = JSON.parse(toolCall.function.arguments || '{}');
							const filename = args.filename;

							if (filename) {
								debugLog('TOOLS', 'Reading document:', filename);

								// Cache scope with fallback hierarchy:
								// 1. taskId - most specific, cache per task (Plan Mode)
								// 2. areaId - area level, shared across conversations in same area
								// 3. spaceId - space level, shared across conversations in same space
								// This ensures document reads are cached even outside Plan Mode
								const cacheScope =
									planModeContext?.taskId ||
									body.planMode?.taskId ||
									body.areaId ||
									focusArea?.spaceId ||
									spaceInfo?.id ||
									null;

								// Log cache scope for debugging
								const cacheScopeType = planModeContext?.taskId || body.planMode?.taskId
									? 'task'
									: body.areaId
										? 'area'
										: focusArea?.spaceId || spaceInfo?.id
											? 'space'
											: 'none';
								debugLog('CACHE', `Scope: ${cacheScopeType} (${cacheScope || 'null'})`);

								const paramsHash = hashParams({ filename });
								const cacheUserId = userId || 'anonymous';
								let cachedResult = null;

								if (cacheScope) {
									try {
										const toolCache = getToolCacheRepository();
										cachedResult = await toolCache.findByParams(
											cacheScope,
											'read_document',
											paramsHash,
											cacheUserId
										);
										if (cachedResult) {
											debugLog('CACHE', `HIT for document: ${filename} (${cacheScopeType}: ${cacheScope})`);
											// Use cached result
											toolResults.push({
												tool_call_id: toolCall.id,
												content: cachedResult.fullResult
											});
											continue; // Skip to next tool call
										}
									} catch (cacheError) {
										console.warn('Cache lookup failed, will read document:', cacheError);
									}
								}

								// Look up document in available documents
								const doc = availableDocuments.get(filename);
								if (doc) {
									// Handle image documents differently - they're already visible in context
									if (doc.contentType === 'image') {
										debugLog('TOOLS', `Image document requested: ${filename} (already visible in context)`);
										toolResults.push({
											tool_call_id: toolCall.id,
											content: `Image "${filename}" is already included visually in the conversation context. You can see and reference it directly without needing to read it.`
										});
									} else {
										debugLog('TOOLS', `Document found: ${filename} (${doc.charCount} chars)`);

										// Send status update for UX feedback
										sendSSE(controller, encoder, {
											type: 'status',
											status: 'reading_document',
											query: filename
										});

										const resultContent = `Document "${filename}":\n\n${doc.content}`;

										// Cache the result for future turns
										if (cacheScope) {
											try {
												const toolCache = getToolCacheRepository();
												await toolCache.create(
													cacheScope,
													'read_document',
													paramsHash,
													resultContent,
													null, // TODO: Generate summary for token efficiency
													doc.charCount,
													cacheUserId
												);
												debugLog('CACHE', `STORED document: ${filename} (${cacheScopeType}: ${cacheScope})`);
											} catch (cacheError) {
												console.warn('Failed to cache document:', cacheError);
											}
										}

										// Return document content
										toolResults.push({
											tool_call_id: toolCall.id,
											content: resultContent
										});
									}
								} else {
									// Document not found
									const availableList = Array.from(availableDocuments.keys()).join(', ');
									toolResults.push({
										tool_call_id: toolCall.id,
										content: `Document "${filename}" not found. Available documents: ${availableList || 'none'}`
									});
								}
							} else {
								toolResults.push({
									tool_call_id: toolCall.id,
									content: 'No filename provided for read_document'
								});
							}
						} else if (isCommerceTool(toolCall.function?.name || '')) {
							// Commerce tool - product search, cart, checkout
							const toolName = toolCall.function?.name || '';
							const args = JSON.parse(toolCall.function?.arguments || '{}');

							debugLog('TOOLS', `Executing commerce tool: ${toolName}`, args);

							// Send browsing status for commerce operations
							const statusMessage = toolName === 'commerce_search'
								? `Searching for: ${args.query}`
								: toolName === 'commerce_get_product'
									? 'Getting product details'
									: toolName === 'commerce_add_to_cart'
										? 'Adding to cart'
										: 'Processing checkout';

							sendSSE(controller, encoder, {
								type: 'status',
								status: 'browsing',
								query: statusMessage
							});

							try {
								const { result, commerceData } = await executeCommerceTool(toolName, args);

								toolResults.push({
									tool_call_id: toolCall.id,
									content: result
								});

								// Send commerce data via SSE for UI rendering
								if (commerceData) {
									sendSSE(controller, encoder, {
										type: 'commerce',
										data: commerceData
									});
								}
							} catch (commerceError) {
								console.error('Commerce tool error:', commerceError);
								toolResults.push({
									tool_call_id: toolCall.id,
									content: `Commerce operation failed: ${commerceError instanceof Error ? commerceError.message : 'Unknown error'}`
								});
							}
						} else if (isCalendarTool(toolCall.function?.name || '')) {
							// Calendar tool - events, scheduling, availability
							const toolName = toolCall.function?.name || '';
							const args = JSON.parse(toolCall.function?.arguments || '{}');

							debugLog('TOOLS', `Executing calendar tool: ${toolName}`, args);

							// Check if we have calendar access
							if (!calendarAccessToken) {
								toolResults.push({
									tool_call_id: toolCall.id,
									content: 'Calendar not connected. Please connect your calendar in Settings to use calendar features.'
								});
							} else {
								// Send status for calendar operations
								const statusMessage = toolName === 'calendar_list_events'
									? 'Checking your calendar...'
									: toolName === 'calendar_get_event'
										? 'Getting event details...'
										: toolName === 'calendar_create_event'
											? 'Creating meeting...'
											: toolName === 'calendar_get_free_busy'
												? 'Checking availability...'
												: 'Finding meeting times...';

								sendSSE(controller, encoder, {
									type: 'status',
									status: 'calendar',
									query: statusMessage
								});

								try {
									// Pass user's timezone for proper time display formatting
									const result = await executeCalendarTool(toolName, args, calendarAccessToken, timezone);

									toolResults.push({
										tool_call_id: toolCall.id,
										content: result
									});

									debugLog('TOOLS', `Calendar tool ${toolName} completed successfully`);
								} catch (calendarError) {
									console.error('Calendar tool error:', calendarError);
									toolResults.push({
										tool_call_id: toolCall.id,
										content: `Calendar operation failed: ${calendarError instanceof Error ? calendarError.message : 'Unknown error'}`
									});
								}
							}
						} else if (isEmailTool(toolCall.function?.name || '')) {
							// Email tool - sending emails
							const toolName = toolCall.function?.name || '';
							const args = JSON.parse(toolCall.function?.arguments || '{}');

							debugLog('TOOLS', `Executing email tool: ${toolName}`, args);

							// Check if we have access (same token as calendar)
							if (!calendarAccessToken) {
								toolResults.push({
									tool_call_id: toolCall.id,
									content: 'Email not connected. Please connect your Microsoft account in Settings to use email features.'
								});
							} else {
								// Send status for email operations
								sendSSE(controller, encoder, {
									type: 'status',
									status: 'email',
									query: 'Sending email...'
								});

								try {
									const result = await executeEmailTool(toolName, args, calendarAccessToken);

									toolResults.push({
										tool_call_id: toolCall.id,
										content: result
									});

									debugLog('TOOLS', `Email tool ${toolName} completed successfully`);
								} catch (emailError) {
									console.error('Email tool error:', emailError);
									toolResults.push({
										tool_call_id: toolCall.id,
										content: `Email operation failed: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`
									});
								}
							}
						} else {
							// Unknown tool - still need to provide a result
							toolResults.push({
								tool_call_id: toolCall.id,
								content: `Unknown tool: ${toolCall.function?.name}`
							});
						}
					}

					// Send sources preview immediately so UI can show favicons
					if (allSources.length > 0) {
						// Deduplicate sources by URL
						const uniqueSources = allSources.filter((source, index, self) =>
							index === self.findIndex(s => s.url === source.url)
						);

						sendSSE(controller, encoder, {
							type: 'sources_preview',
							sources: uniqueSources
						});
					}

					// Build the messages with ALL tool results
					// Anthropic requires: assistant message with tool_calls, then tool messages for EACH tool_call
					const messagesWithToolResults: ChatCompletionRequest['messages'] = [
						...finalMessages,
						{
							role: 'assistant' as const,
							content: message.content || null,
							tool_calls: toolCalls
						},
						// Add ALL tool results as separate messages
						...toolResults.map(result => ({
							role: 'tool' as const,
							tool_call_id: result.tool_call_id,
							content: result.content
						}))
					];

					debugLog('TOOLS', 'Sending', toolResults.length, 'tool results to LLM');

					// Send status update - now processing results
					sendSSE(controller, encoder, { type: 'status', status: 'processing' });

					// Add instruction to synthesize results (not make more searches)
					const synthesisInstruction = {
						role: 'user' as const,
						content: 'Please synthesize the search results above into a comprehensive answer. Do not make any more searches - use only the information you have received.'
					};

					// Get final response (streaming)
					// Must include tools because Anthropic requires it when tool_calls are in history
					const finalResponse = await createChatCompletionWithTools({
						...body,
						messages: [...messagesWithToolResults, synthesisInstruction],
						tools: getToolsForModel(body.model, { includeCommerceTools, includeCalendarTools, includeEmailTools }),
						stream: true
					});

					debugLog('CHAT', 'Final response status:', finalResponse.status, finalResponse.ok);

					if (!finalResponse.ok) {
						const errorText = await finalResponse.text();
						console.error('Final response error:', errorText);
						sendSSE(controller, encoder, {
							type: 'error',
							error: 'Failed to get final response'
						});
					} else {
						debugLog('CHAT', 'Starting to stream final response...');
						// Stream the final response with usage tracking and routing decision
						await streamToController(finalResponse, controller, encoder, thinkingEnabled, usageContext, routingDecision);
						debugLog('CHAT', 'Finished streaming final response');

						// Send sources after content (deduplicated)
						if (allSources.length > 0) {
							const uniqueSources = allSources.filter((source, index, self) =>
								index === self.findIndex(s => s.url === source.url)
							);

							sendSSE(controller, encoder, {
								type: 'sources',
								sources: uniqueSources
							});
						}
					}
				} else {
					// No tool use - stream the content directly
					if (message?.content) {
						// For non-streaming response, send content in chunks for better UX
						const content = message.content;
						const chunkSize = 10; // Characters per chunk
						for (let i = 0; i < content.length; i += chunkSize) {
							sendSSE(controller, encoder, {
								type: 'content',
								content: content.slice(i, i + chunkSize)
							});
							// Small delay for streaming effect
							await new Promise(resolve => setTimeout(resolve, 20));
						}
					}
				}

				// Save usage from initial response (non-streaming part has usage data)
				if (usageContext && responseData.usage) {
					const usage = responseData.usage as {
						prompt_tokens?: number;
						completion_tokens?: number;
						total_tokens?: number;
						cache_creation_input_tokens?: number;
						cache_read_input_tokens?: number;
					};

					// Cache metrics are in the usage object (not HTTP headers)
					const cacheCreation = usage.cache_creation_input_tokens || 0;
					const cacheRead = usage.cache_read_input_tokens || 0;

					if (cacheCreation > 0 || cacheRead > 0) {
						debugLog('CACHE', `${usageContext.model}: created=${cacheCreation}, read=${cacheRead} tokens`);
					}

					saveUsage(usageContext, {
						promptTokens: usage.prompt_tokens || 0,
						completionTokens: usage.completion_tokens || 0,
						totalTokens: usage.total_tokens || 0,
						cacheCreationTokens: cacheCreation,
						cacheReadTokens: cacheRead
					});

					// Update routing decision outcome if we have a record ID
					const recordId = (routingDecision as RoutingDecision & { recordId?: string })?.recordId;
					if (recordId) {
						const completionTokens = usage.completion_tokens || 0;
						const cost = estimateCost(
							usageContext.model,
							usage.prompt_tokens || 0,
							completionTokens,
							cacheRead
						);
						postgresRoutingDecisionsRepository.updateOutcome(recordId, {
							requestSucceeded: true,
							responseTokens: completionTokens,
							estimatedCostMillicents: cost
						}).catch(err => {
							console.error('[Router] Failed to update routing outcome:', err);
						});
					}
				}

				sendSSE(controller, encoder, '[DONE]');
				controller.close();

			} catch (err) {
				console.error('Tool handling error:', err);
				sendSSE(controller, encoder, {
					type: 'error',
					error: err instanceof Error ? err.message : 'Unknown error'
				});
				controller.close();
			} finally {
				// Always stop heartbeat when stream ends
				stopHeartbeat();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}

/**
 * Extract thinking content from a non-streaming response
 * Handles various formats from LiteLLM/Anthropic
 */
function extractThinkingFromResponse(responseData: Record<string, unknown>): string | null {
	try {
		const message = (responseData.choices as Array<{ message?: Record<string, unknown> }>)?.[0]?.message;
		if (!message) return null;

		// Check for thinking field directly
		if (typeof message.thinking === 'string' && message.thinking) {
			return message.thinking;
		}

		// Check for reasoning_content (alternative field name)
		if (typeof message.reasoning_content === 'string' && message.reasoning_content) {
			return message.reasoning_content;
		}

		// Check for thinking_blocks in provider_specific_fields
		const providerFields = message.provider_specific_fields as Record<string, unknown> | undefined;
		if (providerFields?.thinking_blocks) {
			const blocks = providerFields.thinking_blocks as Array<{ thinking?: string }>;
			if (Array.isArray(blocks)) {
				const thinkingParts = blocks
					.filter(b => b.thinking)
					.map(b => b.thinking);
				if (thinkingParts.length > 0) {
					return thinkingParts.join('\n');
				}
			}
		}

		// Check for content array with thinking blocks (native Anthropic format)
		if (Array.isArray(message.content)) {
			const thinkingBlocks = (message.content as Array<{ type?: string; thinking?: string }>)
				.filter(block => block.type === 'thinking' && block.thinking)
				.map(block => block.thinking);
			if (thinkingBlocks.length > 0) {
				return thinkingBlocks.join('\n');
			}
		}

		return null;
	} catch (err) {
		console.error('Error extracting thinking:', err);
		return null;
	}
}

/**
 * Send SSE event
 */
function sendSSE(
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder,
	data: string | object
) {
	const payload = typeof data === 'string' ? data : JSON.stringify(data);
	controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
}

/**
 * Send SSE heartbeat comment to keep connection alive
 * SSE comments (lines starting with :) are ignored by EventSource but keep the connection active
 * This prevents Cloudflare and other proxies from dropping idle connections (typically 100s timeout)
 */
function sendHeartbeat(
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder
) {
	try {
		controller.enqueue(encoder.encode(`: heartbeat\n\n`));
	} catch {
		// Controller may be closed, ignore
	}
}

/**
 * Start a heartbeat interval that sends periodic pings
 * Returns a cleanup function to stop the heartbeat
 */
function startHeartbeat(
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder,
	intervalMs: number = 30000 // 30 seconds - well under Cloudflare's 100s timeout
): () => void {
	const intervalId = setInterval(() => {
		sendHeartbeat(controller, encoder);
	}, intervalMs);

	return () => clearInterval(intervalId);
}

/**
 * Stream response from LiteLLM to controller
 * Supports extended thinking content when thinkingEnabled is true
 */
async function streamToController(
	response: Response,
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder,
	thinkingEnabled: boolean = false,
	usageContext?: UsageContext,
	routingDecision?: RoutingDecision | null
) {
	const reader = response.body?.getReader();
	if (!reader) {
		console.error('No reader available for streaming');
		return;
	}

	const decoder = new TextDecoder();
	let buffer = '';
	let chunkCount = 0;
	let isThinking = false;
	let hasReceivedContent = false;
	let usageData: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
		cache_creation_input_tokens?: number;
		cache_read_input_tokens?: number;
	} | null = null;

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			debugLog('STREAM', `Stream complete. Total chunks processed: ${chunkCount}`);
			// If we were in thinking mode at the end, close it
			if (isThinking) {
				sendSSE(controller, encoder, { type: 'thinking_end' });
			}
			// Save usage if we have context and data
			if (usageContext && usageData) {
				const cacheCreation = usageData.cache_creation_input_tokens || 0;
				const cacheRead = usageData.cache_read_input_tokens || 0;

				if (cacheCreation > 0 || cacheRead > 0) {
					debugLog('CACHE', `${usageContext.model}: created=${cacheCreation}, read=${cacheRead} tokens`);
				}

				debugLog('USAGE', `streamToController saving for ${usageContext.model}:`, JSON.stringify(usageData));
				saveUsage(usageContext, {
					promptTokens: usageData.prompt_tokens || 0,
					completionTokens: usageData.completion_tokens || 0,
					totalTokens: usageData.total_tokens || 0,
					cacheCreationTokens: cacheCreation,
					cacheReadTokens: cacheRead
				});

				// Send usage to client for Arena metrics display
				sendSSE(controller, encoder, { type: 'usage', usage: usageData });

				// Update routing decision outcome if we have a record ID
				const recordId = (routingDecision as RoutingDecision & { recordId?: string })?.recordId;
				if (recordId) {
					const completionTokens = usageData.completion_tokens || 0;
					const cost = estimateCost(
						usageContext.model,
						usageData.prompt_tokens || 0,
						completionTokens,
						cacheRead
					);
					postgresRoutingDecisionsRepository.updateOutcome(recordId, {
						requestSucceeded: true,
						responseTokens: completionTokens,
						estimatedCostMillicents: cost
					}).catch(err => {
						console.error('[Router] Failed to update routing outcome:', err);
					});
				}
			} else if (usageContext) {
				debugLog('USAGE', `streamToController: no usage data for ${usageContext.model}`);
			}
			break;
		}

		const decoded = decoder.decode(value, { stream: true });
		buffer += decoded;

		// Log first chunk to see format
		if (chunkCount === 0) {
			debugLog('STREAM', 'First stream chunk:', decoded.slice(0, 500));
		}
		chunkCount++;

		const lines = buffer.split('\n');
		buffer = lines.pop() || '';

		for (const line of lines) {
			if (line.startsWith('data: ')) {
				const data = line.slice(6);
				if (data === '[DONE]') {
					debugLog('STREAM', 'Received [DONE] signal');
					continue;
				}

				try {
					const chunk = JSON.parse(data);

					// Capture usage from final chunk
					if (chunk.usage) {
						usageData = chunk.usage;
					}
					if (chunk.x_litellm_usage) {
						usageData = chunk.x_litellm_usage;
					}

					const delta = chunk.choices?.[0]?.delta;

					// Log chunks to debug thinking content format
					if (thinkingEnabled && chunkCount <= 10) {
						debugLog('STREAM', `Stream chunk #${chunkCount}:`, JSON.stringify(delta).slice(0, 800));
					}

					if (delta) {
						// Check for thinking content - multiple possible field names from LiteLLM
						const thinkingContent = delta.thinking || delta.reasoning_content;
						if (thinkingContent) {
							if (!isThinking) {
								isThinking = true;
								sendSSE(controller, encoder, { type: 'thinking_start' });
							}
							sendSSE(controller, encoder, { type: 'thinking', content: thinkingContent });
							continue;
						}

						// Check for thinking_blocks in provider_specific_fields (LiteLLM format)
						if (delta.provider_specific_fields?.thinking_blocks) {
							const blocks = delta.provider_specific_fields.thinking_blocks;
							if (Array.isArray(blocks)) {
								for (const block of blocks) {
									if (block.thinking) {
										if (!isThinking) {
											isThinking = true;
											sendSSE(controller, encoder, { type: 'thinking_start' });
										}
										sendSSE(controller, encoder, { type: 'thinking', content: block.thinking });
									}
								}
								continue;
							}
						}

						// Check for content block with type "thinking" (native Anthropic format)
						if (delta.content_block?.type === 'thinking') {
							isThinking = true;
							sendSSE(controller, encoder, { type: 'thinking_start' });
							continue;
						}

						// Check for content block with type "text" - end thinking mode
						if (delta.content_block?.type === 'text' && isThinking) {
							isThinking = false;
							sendSSE(controller, encoder, { type: 'thinking_end' });
						}

						// Regular text content
						if (delta.content) {
							// If we were in thinking mode and get regular content, end thinking
							if (isThinking) {
								isThinking = false;
								sendSSE(controller, encoder, { type: 'thinking_end' });
							}
							sendSSE(controller, encoder, { type: 'content', content: delta.content });
							hasReceivedContent = true;
						}
					}
				} catch (e) {
					// Log parse errors for debugging
					console.error('JSON parse error:', e, 'Data:', data.slice(0, 200));
				}
			}
		}
	}
}

/**
 * Handle LiteLLM error response
 */
async function handleLiteLLMError(response: Response): Promise<Response> {
	const errorBody = await response.text();
	console.error('LiteLLM error:', response.status, errorBody);

	let errorMessage = `LiteLLM error: ${response.statusText}`;
	try {
		const errorJson = JSON.parse(errorBody);
		if (errorJson.error?.message) {
			errorMessage = errorJson.error.message;
		}
	} catch {
		// Use default error message
	}

	return new Response(
		JSON.stringify({
			error: {
				message: mapErrorMessage(new Error(errorMessage)),
				type: 'upstream_error'
			}
		}),
		{
			status: response.status,
			headers: { 'Content-Type': 'application/json' }
		}
	);
}

/**
 * Stream response with extended thinking support and usage tracking
 * Parses the stream to extract thinking content and regular content separately
 * Tracks token usage and saves to database on completion
 * Optionally emits routing decision at the start if AUTO mode was used
 */
function streamResponse(
	litellmResponse: Response,
	thinkingEnabled: boolean = false,
	usageContext?: UsageContext,
	cacheHeaders?: { cacheCreation: number; cacheRead: number },
	routingDecision?: RoutingDecision | null
): Response {
	const reader = litellmResponse.body?.getReader();
	if (!reader) {
		return new Response(
			JSON.stringify({ error: { message: 'No response body', type: 'stream_error' } }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	const stream = new ReadableStream({
		async start(controller) {
			// Start heartbeat to keep connection alive (prevents Cloudflare 100s timeout)
			const stopHeartbeat = startHeartbeat(controller, encoder);

			// Emit routing decision first if AUTO mode was used
			// This lets the frontend know which model was selected before content starts
			if (routingDecision) {
				controller.enqueue(encoder.encode(`data: ${JSON.stringify({
					type: 'routing',
					selectedModel: routingDecision.selectedModel,
					tier: routingDecision.tier,
					score: routingDecision.complexity.score,
					confidence: routingDecision.complexity.confidence,
					reasoning: routingDecision.reasoning,
					overrides: routingDecision.overrides.map(o => o.type)
				})}\n\n`));
			}

			let buffer = '';
			let isThinking = false; // Don't start in thinking mode - wait for actual thinking content
			let hasReceivedContent = false; // Track if we've received any content yet

			// Track usage from stream chunks (including Anthropic cache fields)
			let usageData: {
				prompt_tokens?: number;
				completion_tokens?: number;
				total_tokens?: number;
				cache_creation_input_tokens?: number;
				cache_read_input_tokens?: number;
			} | null = null;

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						// Debug: log full usage data structure for debugging cache issues
						if (usageData) {
							debugLog('USAGE', `Stream done for ${usageContext?.model || 'unknown'}:`, JSON.stringify(usageData));
						} else {
							debugLog('USAGE', `Stream done for ${usageContext?.model || 'unknown'}: NO usage data captured`);
						}

						// Save usage if we have context and data
						// Prefer cache metrics from usage object (Anthropic), fallback to HTTP headers
						if (usageContext && usageData) {
							const cacheCreation = usageData.cache_creation_input_tokens || cacheHeaders?.cacheCreation || 0;
							const cacheRead = usageData.cache_read_input_tokens || cacheHeaders?.cacheRead || 0;

							if (cacheCreation > 0 || cacheRead > 0) {
								debugLog('CACHE', `${usageContext.model}: created=${cacheCreation}, read=${cacheRead} tokens`);
							}

							saveUsage(usageContext, {
								promptTokens: usageData.prompt_tokens || 0,
								completionTokens: usageData.completion_tokens || 0,
								totalTokens: usageData.total_tokens || 0,
								cacheCreationTokens: cacheCreation,
								cacheReadTokens: cacheRead
							});

							// Send usage to client for Arena metrics display
							controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'usage', usage: usageData })}\n\n`));

							// Update routing decision outcome if we have a record ID
							const recordId = (routingDecision as RoutingDecision & { recordId?: string })?.recordId;
							if (recordId) {
								const completionTokens = usageData.completion_tokens || 0;
								const cost = estimateCost(
									usageContext.model,
									usageData.prompt_tokens || 0,
									completionTokens,
									cacheRead
								);
								postgresRoutingDecisionsRepository.updateOutcome(recordId, {
									requestSucceeded: true,
									responseTokens: completionTokens,
									estimatedCostMillicents: cost
								}).catch(err => {
									console.error('[Router] Failed to update routing outcome:', err);
								});
							}
						}

						// Send done signal
						controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
						controller.close();
						break;
					}

					const decoded = decoder.decode(value, { stream: true });
					buffer += decoded;

					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							if (data === '[DONE]') {
								continue;
							}

							try {
								const chunk = JSON.parse(data);

								// Debug: log final chunks to understand format differences between providers
								const finishReason = chunk.choices?.[0]?.finish_reason;
								if (finishReason || chunk.usage) {
									debugLog('USAGE', 'Final chunk:', JSON.stringify(chunk).slice(0, 800));
								}

								// Capture usage from final chunk (LiteLLM includes this with stream_options.include_usage)
								if (chunk.usage) {
									usageData = chunk.usage;
								}

								// Also check for x_litellm_usage (alternate format)
								if (chunk.x_litellm_usage) {
									usageData = chunk.x_litellm_usage;
								}

								const delta = chunk.choices?.[0]?.delta;

								// Log first few chunks to debug thinking content
								if (!hasReceivedContent && thinkingEnabled) {
									debugLog('STREAM', 'Stream chunk (thinking enabled):', JSON.stringify(chunk).slice(0, 500));
								}

								if (delta) {
									// Check for thinking content - multiple possible field names from LiteLLM
									const thinkingContent = delta.thinking || delta.reasoning_content;
									if (thinkingContent) {
										if (!isThinking) {
											isThinking = true;
											controller.enqueue(encoder.encode(`data: ${JSON.stringify({
												type: 'thinking_start'
											})}\n\n`));
										}
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'thinking',
											content: thinkingContent
										})}\n\n`));
										continue;
									}

									// Check for thinking_blocks in provider_specific_fields (LiteLLM format)
									if (delta.provider_specific_fields?.thinking_blocks) {
										const blocks = delta.provider_specific_fields.thinking_blocks;
										if (Array.isArray(blocks)) {
											for (const block of blocks) {
												if (block.thinking) {
													if (!isThinking) {
														isThinking = true;
														controller.enqueue(encoder.encode(`data: ${JSON.stringify({
															type: 'thinking_start'
														})}\n\n`));
													}
													controller.enqueue(encoder.encode(`data: ${JSON.stringify({
														type: 'thinking',
														content: block.thinking
													})}\n\n`));
												}
											}
											continue;
										}
									}

									// Check for content block with type "thinking" (native Anthropic format)
									if (delta.content_block?.type === 'thinking') {
										isThinking = true;
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'thinking_start'
										})}\n\n`));
										continue;
									}

									// Check for content block with type "text" - end thinking mode
									if (delta.content_block?.type === 'text' && isThinking) {
										isThinking = false;
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'thinking_end'
										})}\n\n`));
									}

									// Regular text content - always send as content (not thinking)
									if (delta.content) {
										// If we were in thinking mode and get regular content, end thinking
										if (isThinking) {
											isThinking = false;
											controller.enqueue(encoder.encode(`data: ${JSON.stringify({
												type: 'thinking_end'
											})}\n\n`));
										}
										controller.enqueue(encoder.encode(`data: ${JSON.stringify({
											type: 'content',
											content: delta.content
										})}\n\n`));
										hasReceivedContent = true;
									}
								}
							} catch {
								// If we can't parse the JSON, pass through the line as-is
								controller.enqueue(encoder.encode(`${line}\n`));
							}
						}
					}
				}
			} catch (err) {
				console.error('Stream error:', err);
				controller.error(err);
			} finally {
				// Always stop heartbeat when stream ends
				stopHeartbeat();
			}
		},
		cancel() {
			reader.cancel();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
