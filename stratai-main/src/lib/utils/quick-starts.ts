/**
 * Contextual Quick Starts
 *
 * Generates context-aware quick start suggestions based on task characteristics.
 * Uses keyword detection to identify task type and provide relevant prompts.
 */

/**
 * Available icon types for quick starts
 * Components render these as SVG icons
 */
export type QuickStartIcon =
	| 'checklist'
	| 'search'
	| 'chart'
	| 'target'
	| 'calendar'
	| 'warning'
	| 'question'
	| 'magnifier'
	| 'document'
	| 'ruler'
	| 'puzzle'
	| 'microscope'
	| 'lightbulb'
	| 'users'
	| 'sparkle'
	| 'bolt'
	| 'rocket';

export interface QuickStart {
	icon: QuickStartIcon;
	label: string;
	prompt: string;
}

export interface QuickStartContext {
	title: string;
	description?: string;
	parentTaskTitle?: string;
	isSubtask: boolean;
	richContext?: string;
}

type TaskType = 'audit' | 'plan' | 'research' | 'create' | 'fix' | 'document' | 'default';

/**
 * Keywords that identify each task type
 */
const TYPE_KEYWORDS: Record<Exclude<TaskType, 'default'>, string[]> = {
	audit: ['audit', 'review', 'check', 'assess', 'evaluate', 'analyze', 'inspect', 'examine', 'verify'],
	plan: ['plan', 'design', 'architect', 'structure', 'outline', 'strategy', 'strategize', 'organize'],
	research: ['research', 'investigate', 'explore', 'study', 'learn', 'understand', 'discover', 'find out'],
	create: ['create', 'build', 'implement', 'develop', 'write', 'make', 'produce', 'generate', 'draft'],
	fix: ['fix', 'debug', 'resolve', 'troubleshoot', 'repair', 'solve', 'address', 'correct'],
	document: ['document', 'describe', 'explain', 'record', 'capture', 'log', 'note']
};

/**
 * Templates for each task type
 * {title} placeholder is replaced with the task title
 */
const TEMPLATES: Record<TaskType, Array<{ icon: QuickStartIcon; label: string; promptTemplate: string }>> = {
	audit: [
		{ icon: 'checklist', label: 'Start checklist', promptTemplate: 'Help me create a checklist for auditing: {title}' },
		{ icon: 'search', label: 'Identify gaps', promptTemplate: 'Help me identify gaps and areas needing attention in: {title}' },
		{ icon: 'chart', label: 'Structure findings', promptTemplate: 'Help me structure my findings and observations from: {title}' }
	],
	plan: [
		{ icon: 'target', label: 'Define objectives', promptTemplate: 'Help me define clear objectives and success criteria for: {title}' },
		{ icon: 'calendar', label: 'Create timeline', promptTemplate: 'Help me create a timeline with key milestones for: {title}' },
		{ icon: 'warning', label: 'Identify risks', promptTemplate: 'Help me identify potential risks and blockers for: {title}' }
	],
	research: [
		{ icon: 'question', label: 'Key questions', promptTemplate: 'Help me identify the key questions to answer for: {title}' },
		{ icon: 'magnifier', label: 'Research approach', promptTemplate: 'Help me structure my research approach for: {title}' },
		{ icon: 'document', label: 'Organize notes', promptTemplate: 'Help me organize my research notes and findings on: {title}' }
	],
	create: [
		{ icon: 'ruler', label: 'Define requirements', promptTemplate: 'Help me define the requirements and scope for: {title}' },
		{ icon: 'document', label: 'Create outline', promptTemplate: 'Help me create an outline or structure for: {title}' },
		{ icon: 'puzzle', label: 'Break into steps', promptTemplate: 'Help me break down "{title}" into actionable steps' }
	],
	fix: [
		{ icon: 'microscope', label: 'Find root cause', promptTemplate: 'Help me identify the root cause of: {title}' },
		{ icon: 'checklist', label: 'List symptoms', promptTemplate: 'Help me document the symptoms and issues related to: {title}' },
		{ icon: 'lightbulb', label: 'Propose solutions', promptTemplate: 'Help me brainstorm potential solutions for: {title}' }
	],
	document: [
		{ icon: 'document', label: 'Create outline', promptTemplate: 'Help me create an outline for documenting: {title}' },
		{ icon: 'users', label: 'Define audience', promptTemplate: 'Help me identify the target audience and their needs for: {title}' },
		{ icon: 'sparkle', label: 'Key points', promptTemplate: 'Help me identify the key points to cover in: {title}' }
	],
	default: [
		{ icon: 'bolt', label: 'Brainstorm', promptTemplate: 'Help me brainstorm different approaches to: {title}' },
		{ icon: 'document', label: 'Create a plan', promptTemplate: 'Help me create a plan for: {title}' },
		{ icon: 'rocket', label: 'Get started', promptTemplate: 'Help me get started with: {title}. What should I focus on first?' }
	]
};

/**
 * Detect task type from title keywords
 */
function detectTaskType(title: string): TaskType {
	const lowerTitle = title.toLowerCase();

	for (const [type, keywords] of Object.entries(TYPE_KEYWORDS) as [Exclude<TaskType, 'default'>, string[]][]) {
		for (const keyword of keywords) {
			if (lowerTitle.includes(keyword)) {
				return type;
			}
		}
	}

	return 'default';
}

/**
 * Build context suffix for prompts
 * Adds parent task reference and any rich context
 */
function buildContextSuffix(ctx: QuickStartContext): string {
	const parts: string[] = [];

	if (ctx.parentTaskTitle) {
		parts.push(`This is part of the larger task: "${ctx.parentTaskTitle}".`);
	}

	if (ctx.richContext) {
		// Truncate rich context if too long
		const trimmed = ctx.richContext.length > 200
			? ctx.richContext.substring(0, 200) + '...'
			: ctx.richContext;
		parts.push(`Context: ${trimmed}`);
	}

	return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

/**
 * Generate contextual quick starts for a task
 */
export function getQuickStarts(context: QuickStartContext): QuickStart[] {
	const taskType = detectTaskType(context.title);
	const templates = TEMPLATES[taskType];
	const contextSuffix = buildContextSuffix(context);

	return templates.map(template => ({
		icon: template.icon,
		label: template.label,
		prompt: template.promptTemplate.replace('{title}', context.title) + contextSuffix
	}));
}

/**
 * Get just the labels (for backwards compatibility with older components)
 * @deprecated Use getQuickStarts() instead
 */
export function getQuickActionLabels(title: string): string[] {
	const taskType = detectTaskType(title);
	return TEMPLATES[taskType].map(t => t.label);
}
