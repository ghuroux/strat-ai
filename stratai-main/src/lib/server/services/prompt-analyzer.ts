/**
 * System Prompt Analyzer Service
 *
 * Extracts and analyzes system prompts for admin debugging.
 * Returns structured breakdown with token counts per component.
 *
 * Used by: /admin/prompts page for debugging and optimization
 */

import { countTokens } from '$lib/services/tokenCounter';
import { getModelPricing, estimateCost, formatCost } from '$lib/config/model-pricing';
import { MODEL_CAPABILITIES } from '$lib/config/model-capabilities';
import {
	getPlatformPrompt,
	getModelFamily,
	getSpacePromptAddition,
	getCustomSpacePrompt,
	getFocusAreaPrompt,
	getFocusedTaskPrompt,
	type SpaceInfo,
	type FocusAreaInfo,
	type FocusedTaskInfo
} from '$lib/config/system-prompts';
import type { SpaceType } from '$lib/types/chat';

// Repository imports for data loading
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';
import { postgresDocumentRepository } from '$lib/server/persistence/documents-postgres';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

// =============================================================================
// TYPES
// =============================================================================

export type PromptComponentType =
	| 'platform'
	| 'space'
	| 'area'
	| 'areaNotes'
	| 'document'
	| 'task'
	| 'planMode';

export interface PromptComponent {
	/** Display name: "Platform Prompt", "Area: Q1 Planning", "Document: budget.pdf" */
	name: string;
	/** Component type for grouping */
	type: PromptComponentType;
	/** Actual prompt text */
	content: string;
	/** Token count */
	tokens: number;
	/** Character count for reference */
	characterCount: number;
}

export interface DocumentBreakdown {
	id: string;
	filename: string;
	charCount: number;
	tokens: number;
	hasSummary: boolean;
	summaryTokens: number;
	fullContentTokens: number;
}

export type WarningSeverity = 'info' | 'warning' | 'critical';

export interface PromptWarning {
	type: 'large_prompt' | 'large_document' | 'many_documents' | 'context_window_risk';
	severity: WarningSeverity;
	message: string;
	details?: string;
}

// =============================================================================
// CACHE OPTIMIZATION TYPES
// =============================================================================

export type CachingMechanism = 'explicit' | 'automatic' | 'none';

export interface CacheRecommendation {
	id: string;
	priority: 'high' | 'medium' | 'low';
	title: string;
	description: string;
	potentialSavings?: string;
}

export interface CacheOptimizationAnalysis {
	/** Provider name for display */
	provider: string;
	/** Type of caching available for this model */
	mechanism: CachingMechanism;
	/** Whether caching is currently enabled/optimized */
	isOptimized: boolean;
	/** Optimization score 0-100 */
	score: number;
	/** Score breakdown explanation */
	scoreBreakdown: {
		factor: string;
		score: number;
		maxScore: number;
		note: string;
	}[];
	/** Estimated savings if fully optimized */
	potentialSavings: {
		percentage: string;
		description: string;
	};
	/** Tokens that would be cached */
	cacheableTokens: number;
	/** Percentage of prompt that's cacheable */
	cacheablePercentage: number;
	/** Specific recommendations for improvement */
	recommendations: CacheRecommendation[];
	/** Summary status for quick display */
	status: 'excellent' | 'good' | 'needs-attention' | 'not-available';
}

export interface PromptAnalysisContext {
	model: string;
	modelFamily: string;
	modelDisplayName: string;
	contextWindow: number;
	spaceId?: string;
	spaceName?: string;
	spaceType?: 'system' | 'custom';
	areaId?: string;
	areaName?: string;
	taskId?: string;
	taskTitle?: string;
	isPlanMode?: boolean;
	planModePhase?: string;
}

export interface PromptAnalysis {
	/** Full assembled prompt */
	fullPrompt: string;
	/** Total tokens in the prompt */
	totalTokens: number;
	/** Percentage of context window used */
	contextWindowUsage: number;

	/** Component breakdown */
	components: PromptComponent[];

	/** Document-specific breakdown */
	documents: DocumentBreakdown[];
	documentTotalTokens: number;

	/** Cost estimates (for system prompt only, assuming no completion) */
	estimatedCost: {
		millicents: number;
		formatted: string;
		model: string;
		note: string;
	};

	/** Warnings for optimization opportunities */
	warnings: PromptWarning[];

	/** Context metadata */
	context: PromptAnalysisContext;

	/** Cache optimization analysis */
	cacheOptimization: CacheOptimizationAnalysis;
}

export interface AnalyzePromptOptions {
	model: string;
	spaceId?: string;
	areaId?: string;
	taskId?: string;
	planModePhase?: 'eliciting' | 'proposing' | 'confirming';
}

// =============================================================================
// WARNING THRESHOLDS
// =============================================================================

const WARNING_THRESHOLDS = {
	/** Warn if total prompt exceeds this many tokens */
	LARGE_PROMPT_TOKENS: 4000,
	/** Critical if prompt uses this % of context window */
	CONTEXT_WINDOW_CRITICAL_PERCENT: 50,
	/** Warn if prompt uses this % of context window */
	CONTEXT_WINDOW_WARNING_PERCENT: 30,
	/** Warn if a single document exceeds this many tokens */
	LARGE_DOCUMENT_TOKENS: 2000,
	/** Warn if there are more than this many documents */
	MANY_DOCUMENTS_COUNT: 5
};

// =============================================================================
// CACHE OPTIMIZATION THRESHOLDS
// =============================================================================

const CACHE_THRESHOLDS = {
	/** Minimum tokens for OpenAI automatic prefix caching */
	OPENAI_MIN_PREFIX_TOKENS: 1024,
	/** Minimum tokens for Gemini implicit caching */
	GEMINI_MIN_CACHE_TOKENS: 32768,
	/** Ideal stable content ratio for prefix caching */
	IDEAL_STABLE_RATIO: 0.7,
	/** High document token ratio warning threshold */
	HIGH_DOCUMENT_RATIO: 0.6
};

// =============================================================================
// CACHE OPTIMIZATION ANALYSIS
// =============================================================================

/**
 * Analyze cache optimization potential for the system prompt
 */
function analyzeCacheOptimization(
	model: string,
	provider: string,
	components: PromptComponent[],
	totalTokens: number,
	documentTotalTokens: number
): CacheOptimizationAnalysis {
	// Determine caching mechanism based on provider
	const mechanism = getCachingMechanism(provider);
	const providerName = getProviderDisplayName(provider);

	// If no caching available, return early
	if (mechanism === 'none') {
		return {
			provider: providerName,
			mechanism: 'none',
			isOptimized: false,
			score: 0,
			scoreBreakdown: [],
			potentialSavings: {
				percentage: '0%',
				description: 'Caching not available for this provider via current API'
			},
			cacheableTokens: 0,
			cacheablePercentage: 0,
			recommendations: [{
				id: 'no-caching',
				priority: 'low',
				title: 'No caching available',
				description: `${providerName} models via Bedrock do not support prompt caching through the Converse API.`
			}],
			status: 'not-available'
		};
	}

	// Calculate stable vs variable content
	// Stable: platform, space, area (rarely changes)
	// Variable: task, documents (may change frequently)
	const stableTypes: PromptComponentType[] = ['platform', 'space', 'area', 'areaNotes'];
	const stableTokens = components
		.filter(c => stableTypes.includes(c.type))
		.reduce((sum, c) => sum + c.tokens, 0);

	const stableRatio = totalTokens > 0 ? stableTokens / totalTokens : 0;
	const cacheableTokens = stableTokens;
	const cacheablePercentage = stableRatio * 100;

	// Score calculation based on provider-specific factors
	const scoreBreakdown: CacheOptimizationAnalysis['scoreBreakdown'] = [];
	let totalScore = 0;
	let maxPossibleScore = 0;

	// Factor 1: Prompt size (affects cache efficiency)
	maxPossibleScore += 30;
	if (mechanism === 'automatic') {
		// OpenAI/DeepSeek: need 1024+ tokens for prefix caching
		if (totalTokens >= CACHE_THRESHOLDS.OPENAI_MIN_PREFIX_TOKENS) {
			totalScore += 30;
			scoreBreakdown.push({
				factor: 'Prompt Size',
				score: 30,
				maxScore: 30,
				note: `${totalTokens.toLocaleString()} tokens exceeds minimum (1,024) for automatic caching`
			});
		} else {
			const sizeScore = Math.round((totalTokens / CACHE_THRESHOLDS.OPENAI_MIN_PREFIX_TOKENS) * 30);
			totalScore += sizeScore;
			scoreBreakdown.push({
				factor: 'Prompt Size',
				score: sizeScore,
				maxScore: 30,
				note: `${totalTokens.toLocaleString()} tokens below 1,024 minimum for automatic caching`
			});
		}
	} else {
		// Anthropic: explicit caching always works, but benefits scale with size
		const sizeScore = Math.min(30, Math.round(Math.log10(totalTokens + 1) * 10));
		totalScore += sizeScore;
		scoreBreakdown.push({
			factor: 'Prompt Size',
			score: sizeScore,
			maxScore: 30,
			note: `Larger prompts benefit more from caching`
		});
	}

	// Factor 2: Stable content ratio
	maxPossibleScore += 40;
	const ratioScore = Math.round(stableRatio * 40);
	totalScore += ratioScore;
	scoreBreakdown.push({
		factor: 'Stable Content Ratio',
		score: ratioScore,
		maxScore: 40,
		note: `${(stableRatio * 100).toFixed(0)}% of prompt is stable (platform, space, area)`
	});

	// Factor 3: Content ordering (stable first = better for prefix caching)
	maxPossibleScore += 30;
	const isWellOrdered = checkContentOrdering(components);
	if (isWellOrdered) {
		totalScore += 30;
		scoreBreakdown.push({
			factor: 'Content Ordering',
			score: 30,
			maxScore: 30,
			note: 'Stable content is ordered first (optimal for prefix caching)'
		});
	} else {
		totalScore += 10;
		scoreBreakdown.push({
			factor: 'Content Ordering',
			score: 10,
			maxScore: 30,
			note: 'Content could be reordered for better cache efficiency'
		});
	}

	// Calculate final score
	const score = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

	// Generate recommendations
	const recommendations = generateCacheRecommendations(
		provider,
		mechanism,
		totalTokens,
		stableRatio,
		documentTotalTokens,
		components,
		isWellOrdered
	);

	// Determine status
	let status: CacheOptimizationAnalysis['status'];
	if (score >= 80) {
		status = 'excellent';
	} else if (score >= 60) {
		status = 'good';
	} else {
		status = 'needs-attention';
	}

	// Calculate potential savings
	const potentialSavings = getPotentialSavings(provider, mechanism);

	return {
		provider: providerName,
		mechanism,
		isOptimized: score >= 70,
		score,
		scoreBreakdown,
		potentialSavings,
		cacheableTokens,
		cacheablePercentage,
		recommendations,
		status
	};
}

/**
 * Determine caching mechanism based on provider
 */
function getCachingMechanism(provider: string): CachingMechanism {
	switch (provider) {
		case 'anthropic':
			return 'explicit'; // Requires cache_control markers
		case 'openai':
		case 'deepseek':
			return 'automatic'; // Automatic prefix caching
		case 'google':
			return 'automatic'; // Implicit caching (explicit available but not implemented)
		case 'meta':
		case 'amazon':
		case 'mistral':
		default:
			return 'none'; // Bedrock Converse API doesn't support caching
	}
}

/**
 * Get provider display name
 */
function getProviderDisplayName(provider: string): string {
	const names: Record<string, string> = {
		anthropic: 'Anthropic',
		openai: 'OpenAI',
		google: 'Google',
		deepseek: 'DeepSeek',
		meta: 'Meta (Llama)',
		amazon: 'Amazon',
		mistral: 'Mistral'
	};
	return names[provider] || provider;
}

/**
 * Check if content is ordered optimally (stable content first)
 */
function checkContentOrdering(components: PromptComponent[]): boolean {
	// Ideal order: platform → space → area → areaNotes → documents → task
	const idealOrder: PromptComponentType[] = ['platform', 'space', 'area', 'areaNotes', 'document', 'task'];

	let lastIndex = -1;
	for (const component of components) {
		const currentIndex = idealOrder.indexOf(component.type);
		if (currentIndex < lastIndex) {
			return false; // Out of order
		}
		lastIndex = currentIndex;
	}
	return true;
}

/**
 * Generate cache optimization recommendations
 */
function generateCacheRecommendations(
	provider: string,
	mechanism: CachingMechanism,
	totalTokens: number,
	stableRatio: number,
	documentTokens: number,
	components: PromptComponent[],
	isWellOrdered: boolean
): CacheRecommendation[] {
	const recommendations: CacheRecommendation[] = [];

	// Provider-specific recommendations
	if (provider === 'anthropic') {
		recommendations.push({
			id: 'anthropic-cache-enabled',
			priority: 'low',
			title: 'Explicit caching enabled',
			description: 'StratAI uses cache_control breakpoints for Claude models. Up to 4 strategic cache points are set automatically.',
			potentialSavings: '90% on cached tokens'
		});
	}

	if (provider === 'openai' || provider === 'deepseek') {
		if (totalTokens < CACHE_THRESHOLDS.OPENAI_MIN_PREFIX_TOKENS) {
			recommendations.push({
				id: 'prefix-minimum',
				priority: 'medium',
				title: 'Below prefix caching threshold',
				description: `Automatic prefix caching requires ${CACHE_THRESHOLDS.OPENAI_MIN_PREFIX_TOKENS.toLocaleString()}+ tokens. Current prompt has ${totalTokens.toLocaleString()} tokens.`,
				potentialSavings: 'Add more context to enable 50% savings'
			});
		} else {
			recommendations.push({
				id: 'prefix-active',
				priority: 'low',
				title: 'Automatic prefix caching active',
				description: `Prompt exceeds ${CACHE_THRESHOLDS.OPENAI_MIN_PREFIX_TOKENS.toLocaleString()} tokens - automatic caching is active for repeated prefixes.`,
				potentialSavings: '50% on cached prefixes'
			});
		}
	}

	if (provider === 'google') {
		if (totalTokens >= CACHE_THRESHOLDS.GEMINI_MIN_CACHE_TOKENS) {
			recommendations.push({
				id: 'gemini-explicit',
				priority: 'high',
				title: 'Consider explicit context caching',
				description: `Large prompt (${totalTokens.toLocaleString()} tokens) would benefit from Gemini's explicit context caching API for 75% storage discount.`,
				potentialSavings: '75-90% on cached content'
			});
		} else {
			recommendations.push({
				id: 'gemini-implicit',
				priority: 'low',
				title: 'Implicit caching active',
				description: 'Gemini automatically caches repeated content. Explicit caching available for prompts over 32K tokens.',
				potentialSavings: '75% discount on cached tokens'
			});
		}
	}

	// Content ordering recommendation
	if (!isWellOrdered && mechanism !== 'none') {
		recommendations.push({
			id: 'reorder-content',
			priority: 'medium',
			title: 'Optimize content ordering',
			description: 'Reordering content with stable elements first (platform, space, area) improves prefix cache hit rates.',
			potentialSavings: '10-20% better cache efficiency'
		});
	}

	// High document ratio recommendation
	const docRatio = totalTokens > 0 ? documentTokens / totalTokens : 0;
	if (docRatio > CACHE_THRESHOLDS.HIGH_DOCUMENT_RATIO && mechanism !== 'none') {
		recommendations.push({
			id: 'document-heavy',
			priority: 'medium',
			title: 'High document content ratio',
			description: `Documents comprise ${(docRatio * 100).toFixed(0)}% of the prompt. Consider using document summaries to reduce variable content.`,
			potentialSavings: 'Reduces per-request costs'
		});
	}

	// Low stable content recommendation
	if (stableRatio < 0.5 && mechanism !== 'none') {
		recommendations.push({
			id: 'low-stable',
			priority: 'high',
			title: 'Low stable content ratio',
			description: `Only ${(stableRatio * 100).toFixed(0)}% of the prompt is stable. Caching works best with higher ratios of consistent content.`,
			potentialSavings: 'Structure context for better caching'
		});
	}

	return recommendations;
}

/**
 * Get potential savings description for provider
 */
function getPotentialSavings(
	provider: string,
	mechanism: CachingMechanism
): { percentage: string; description: string } {
	switch (provider) {
		case 'anthropic':
			return {
				percentage: 'Up to 90%',
				description: '90% discount on cache reads, 25% premium on cache writes. 5-minute TTL on ephemeral cache.'
			};
		case 'openai':
			return {
				percentage: 'Up to 50%',
				description: '50% discount on cached prefix tokens. Automatic for prompts over 1,024 tokens with matching prefixes.'
			};
		case 'google':
			return {
				percentage: '75-90%',
				description: '75% discount on implicit cached tokens. Explicit caching offers 90% savings with controlled TTL.'
			};
		case 'deepseek':
			return {
				percentage: 'Up to 50%',
				description: 'Automatic prefix caching similar to OpenAI. Effective for repeated context patterns.'
			};
		default:
			return {
				percentage: 'N/A',
				description: 'Prompt caching not available for this provider through current API.'
			};
	}
}

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

/**
 * Analyze system prompt for a given context
 *
 * @param userId - User ID for data access
 * @param orgId - Organization ID for data access
 * @param options - Analysis options (model, context IDs)
 * @returns Detailed prompt analysis with token breakdown
 */
export async function analyzeSystemPrompt(
	userId: string,
	orgId: string,
	options: AnalyzePromptOptions
): Promise<PromptAnalysis> {
	const { model, spaceId, areaId, taskId, planModePhase } = options;

	// Get model info
	const modelFamily = getModelFamily(model);
	const modelCaps = MODEL_CAPABILITIES[model] || {
		displayName: model,
		contextWindow: 128000
	};
	const contextWindow = modelCaps.contextWindow || 128000;

	// Initialize collections
	const components: PromptComponent[] = [];
	const documents: DocumentBreakdown[] = [];
	const warnings: PromptWarning[] = [];

	// Context metadata
	const context: PromptAnalysisContext = {
		model,
		modelFamily,
		modelDisplayName: modelCaps.displayName || model,
		contextWindow
	};

	// ==========================================================================
	// 1. PLATFORM PROMPT (always present)
	// ==========================================================================
	const platformPrompt = getPlatformPrompt(model);
	const platformTokens = countTokens(platformPrompt);
	components.push({
		name: `Platform Prompt (${modelFamily})`,
		type: 'platform',
		content: platformPrompt,
		tokens: platformTokens,
		characterCount: platformPrompt.length
	});

	// ==========================================================================
	// 2. SPACE CONTEXT (if spaceId provided)
	// ==========================================================================
	let spaceInfo: SpaceInfo | null = null;
	let focusAreaInfo: FocusAreaInfo | null = null;

	if (spaceId) {
		const space = await postgresSpaceRepository.findById(spaceId, userId);
		if (space) {
			context.spaceId = space.id;
			context.spaceName = space.name;

			// Determine if system or custom space (only 'personal' is system now)
			const isSystemSpace = space.slug === 'personal';

			if (isSystemSpace) {
				context.spaceType = 'system';
				const spaceAddition = getSpacePromptAddition(space.slug as SpaceType);
				if (spaceAddition) {
					const spaceTokens = countTokens(spaceAddition);
					components.push({
						name: `Space: ${space.name}`,
						type: 'space',
						content: spaceAddition,
						tokens: spaceTokens,
						characterCount: spaceAddition.length
					});
				}
			} else {
				context.spaceType = 'custom';
				// Load space documents if any
				let spaceDocuments: SpaceInfo['contextDocuments'] = [];
				if (space.contextDocumentIds && space.contextDocumentIds.length > 0) {
					const docs = await Promise.all(
						space.contextDocumentIds.map((docId) =>
							postgresDocumentRepository.findById(docId, userId)
						)
					);
					spaceDocuments = docs
						.filter((d): d is NonNullable<typeof d> => d !== null)
						.map((d) => ({
							id: d.id,
							filename: d.filename,
							content: d.content,
							charCount: d.charCount,
							summary: d.summary || undefined
						}));
				}

				spaceInfo = {
					id: space.id,
					name: space.name,
					slug: space.slug,
					type: 'custom',
					context: space.context || undefined,
					contextDocuments: spaceDocuments
				};

				const customSpacePrompt = getCustomSpacePrompt(spaceInfo);
				if (customSpacePrompt) {
					const customSpaceTokens = countTokens(customSpacePrompt);
					components.push({
						name: `Space: ${space.name}`,
						type: 'space',
						content: customSpacePrompt,
						tokens: customSpaceTokens,
						characterCount: customSpacePrompt.length
					});

					// Track individual documents
					for (const doc of spaceDocuments) {
						const summaryTokens = doc.summary ? countTokens(doc.summary) : 0;
						const fullTokens = countTokens(doc.content);
						documents.push({
							id: doc.id,
							filename: doc.filename,
							charCount: doc.charCount,
							tokens: summaryTokens || fullTokens, // What's actually in prompt
							hasSummary: !!doc.summary,
							summaryTokens,
							fullContentTokens: fullTokens
						});
					}
				}
			}
		}
	}

	// ==========================================================================
	// 3. AREA CONTEXT (if areaId provided)
	// ==========================================================================
	if (areaId) {
		const area = await postgresAreaRepository.findById(areaId, userId);
		if (area) {
			context.areaId = area.id;
			context.areaName = area.name;

			// Load area documents if any
			let areaDocuments: FocusAreaInfo['contextDocuments'] = [];
			if (area.contextDocumentIds && area.contextDocumentIds.length > 0) {
				const docs = await Promise.all(
					area.contextDocumentIds.map((docId) =>
						postgresDocumentRepository.findById(docId, userId)
					)
				);
				areaDocuments = docs
					.filter((d): d is NonNullable<typeof d> => d !== null)
					.map((d) => ({
						id: d.id,
						filename: d.filename,
						content: d.content,
						charCount: d.charCount,
						summary: d.summary || undefined
					}));
			}

			focusAreaInfo = {
				id: area.id,
				name: area.name,
				context: area.context || undefined,
				contextDocuments: areaDocuments,
				spaceId: area.spaceId
			};

			const focusAreaPrompt = getFocusAreaPrompt(focusAreaInfo);
			const focusAreaTokens = countTokens(focusAreaPrompt);

			// Add the focus area prompt as a single component
			// (area.context is already included inside focusAreaPrompt as "Background Context")
			components.push({
				name: `Area: ${area.name}`,
				type: 'area',
				content: focusAreaPrompt,
				tokens: focusAreaTokens,
				characterCount: focusAreaPrompt.length
			});

			// Track area documents (if not already tracked from space)
			for (const doc of areaDocuments) {
				// Skip if already tracked
				if (documents.some((d) => d.id === doc.id)) continue;

				const summaryTokens = doc.summary ? countTokens(doc.summary) : 0;
				const fullTokens = countTokens(doc.content);
				documents.push({
					id: doc.id,
					filename: doc.filename,
					charCount: doc.charCount,
					tokens: summaryTokens || fullTokens,
					hasSummary: !!doc.summary,
					summaryTokens,
					fullContentTokens: fullTokens
				});
			}
		}
	}

	// ==========================================================================
	// 4. TASK CONTEXT (if taskId provided)
	// ==========================================================================
	if (taskId) {
		const task = await postgresTaskRepository.findById(taskId, userId);
		if (task) {
			context.taskId = task.id;
			context.taskTitle = task.title;

			const taskInfo: FocusedTaskInfo = {
				title: task.title,
				priority: task.priority as 'normal' | 'high',
				dueDate: task.dueDate?.toISOString(),
				dueDateType: task.dueDateType as 'hard' | 'soft' | undefined,
				isSubtask: !!task.parentTaskId,
				parentTaskTitle: task.parentTaskId ? undefined : undefined // Could load parent if needed
			};

			const taskPrompt = getFocusedTaskPrompt(taskInfo);
			const taskTokens = countTokens(taskPrompt);
			components.push({
				name: `Task: ${task.title}`,
				type: 'task',
				content: taskPrompt,
				tokens: taskTokens,
				characterCount: taskPrompt.length
			});
		}
	}

	// ==========================================================================
	// 5. CALCULATE TOTALS
	// ==========================================================================

	// Build full prompt (same order as injectPlatformPrompt)
	const fullPrompt = components.map((c) => c.content).join('\n');
	const totalTokens = countTokens(fullPrompt);
	const documentTotalTokens = documents.reduce((sum, d) => sum + d.tokens, 0);
	const contextWindowUsage = (totalTokens / contextWindow) * 100;

	// ==========================================================================
	// 6. GENERATE WARNINGS
	// ==========================================================================

	// Large prompt warning
	if (totalTokens > WARNING_THRESHOLDS.LARGE_PROMPT_TOKENS) {
		warnings.push({
			type: 'large_prompt',
			severity: 'warning',
			message: `System prompt is ${totalTokens.toLocaleString()} tokens`,
			details: `Consider reducing context to leave room for conversation`
		});
	}

	// Context window usage
	if (contextWindowUsage >= WARNING_THRESHOLDS.CONTEXT_WINDOW_CRITICAL_PERCENT) {
		warnings.push({
			type: 'context_window_risk',
			severity: 'critical',
			message: `Using ${contextWindowUsage.toFixed(0)}% of context window`,
			details: `Only ${((contextWindow - totalTokens) / 1000).toFixed(0)}K tokens left for conversation`
		});
	} else if (contextWindowUsage >= WARNING_THRESHOLDS.CONTEXT_WINDOW_WARNING_PERCENT) {
		warnings.push({
			type: 'context_window_risk',
			severity: 'warning',
			message: `Using ${contextWindowUsage.toFixed(0)}% of context window`,
			details: `${((contextWindow - totalTokens) / 1000).toFixed(0)}K tokens available for conversation`
		});
	}

	// Large documents
	for (const doc of documents) {
		if (doc.tokens > WARNING_THRESHOLDS.LARGE_DOCUMENT_TOKENS) {
			warnings.push({
				type: 'large_document',
				severity: 'info',
				message: `"${doc.filename}" is ${doc.tokens.toLocaleString()} tokens`,
				details: doc.hasSummary
					? 'Using summary in prompt (full content via tool)'
					: 'Consider adding a summary to reduce prompt size'
			});
		}
	}

	// Many documents
	if (documents.length > WARNING_THRESHOLDS.MANY_DOCUMENTS_COUNT) {
		warnings.push({
			type: 'many_documents',
			severity: 'info',
			message: `${documents.length} documents in context`,
			details: 'Consider focusing on most relevant documents'
		});
	}

	// ==========================================================================
	// 7. CALCULATE COST
	// ==========================================================================
	const costMillicents = estimateCost(model, totalTokens, 0, 0);

	// ==========================================================================
	// 8. CACHE OPTIMIZATION ANALYSIS
	// ==========================================================================
	const provider = (modelCaps as { provider?: string }).provider || 'unknown';
	const cacheOptimization = analyzeCacheOptimization(
		model,
		provider,
		components,
		totalTokens,
		documentTotalTokens
	);

	return {
		fullPrompt,
		totalTokens,
		contextWindowUsage,
		components,
		documents,
		documentTotalTokens,
		estimatedCost: {
			millicents: costMillicents,
			formatted: formatCost(costMillicents),
			model,
			note: 'Cost for system prompt only (input tokens, no completion)'
		},
		warnings,
		context,
		cacheOptimization
	};
}

/**
 * Get list of available models for the inspector dropdown
 */
export function getAvailableModels(): Array<{
	id: string;
	displayName: string;
	provider: string;
	contextWindow: number;
}> {
	return Object.entries(MODEL_CAPABILITIES).map(([id, caps]) => ({
		id,
		displayName: caps.displayName,
		provider: caps.provider,
		contextWindow: caps.contextWindow
	}));
}
