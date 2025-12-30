/**
 * Context Builder Utility
 *
 * Formats task context (documents + related tasks) for injection into system prompts.
 * Handles token budget management by truncating or using summaries for large documents.
 */

import type { TaskContext } from '$lib/types/tasks';

/**
 * Maximum characters for context injection (~12.5k tokens)
 */
const MAX_CONTEXT_CHARS = 50000;

/**
 * Threshold for using summary instead of full content
 */
const LARGE_DOC_THRESHOLD = 20000;

/**
 * Context info for prompt building
 */
export interface TaskContextInfo {
	documents?: Array<{
		id: string;
		filename: string;
		content: string;
		summary?: string;
		charCount: number;
		role: string;
	}>;
	relatedTasks?: Array<{
		id: string;
		title: string;
		contextSummary?: string;
		status: string;
		relationship: string;
	}>;
}

/**
 * Build a formatted context prompt from task context
 *
 * @param context - The task context containing documents and related tasks
 * @returns Formatted string for system prompt injection
 */
export function buildContextPrompt(context: TaskContextInfo): string {
	if (!context.documents?.length && !context.relatedTasks?.length) {
		return '';
	}

	let prompt = '';
	let charCount = 0;

	// Add related tasks first (smaller, higher signal)
	if (context.relatedTasks && context.relatedTasks.length > 0) {
		prompt += '<related_tasks>\n';
		prompt += 'The following tasks are related to the current task:\n\n';

		for (const task of context.relatedTasks) {
			const statusBadge =
				task.status === 'completed'
					? '[completed]'
					: task.status === 'deferred'
						? '[deferred]'
						: '';

			let taskInfo = `- **${task.title}** ${statusBadge} (${task.relationship})`;

			if (task.contextSummary) {
				taskInfo += `\n  Context: ${task.contextSummary}`;
			}

			taskInfo += '\n';

			// Check budget
			if (charCount + taskInfo.length > MAX_CONTEXT_CHARS) {
				prompt += '  [Additional related tasks truncated for context limit]\n';
				break;
			}

			prompt += taskInfo;
			charCount += taskInfo.length;
		}

		prompt += '</related_tasks>\n\n';
	}

	// Add documents
	if (context.documents && context.documents.length > 0) {
		prompt += '<context_documents>\n';
		prompt += 'The following documents have been provided as context:\n\n';

		for (const doc of context.documents) {
			// Decide whether to use summary or full content
			const useContent =
				doc.summary && doc.charCount > LARGE_DOC_THRESHOLD
					? `[Summary of ${doc.charCount.toLocaleString()} character document]\n${doc.summary}`
					: doc.content;

			const header = `### ${doc.filename} (${doc.role})\n`;
			const docSection = header + useContent + '\n\n';

			// Check if we can fit the full document
			if (charCount + docSection.length > MAX_CONTEXT_CHARS) {
				// Try to fit a truncated version
				const remainingBudget = MAX_CONTEXT_CHARS - charCount - header.length - 100;

				if (remainingBudget > 1000) {
					// Truncate content to fit
					const truncatedContent = useContent.slice(0, remainingBudget);
					prompt +=
						header + truncatedContent + '\n[...content truncated for context limit...]\n\n';
					charCount += header.length + truncatedContent.length + 50;
				} else {
					// Not enough space, just note the document exists
					prompt += `### ${doc.filename} (${doc.role})\n[Document content omitted - ${doc.charCount.toLocaleString()} characters]\n\n`;
				}

				// Stop adding more documents
				if (charCount >= MAX_CONTEXT_CHARS - 500) {
					prompt += '[Additional documents omitted for context limit]\n';
					break;
				}
			} else {
				prompt += docSection;
				charCount += docSection.length;
			}
		}

		prompt += '</context_documents>\n';
	}

	return prompt;
}

/**
 * Convert API response to TaskContextInfo
 */
export function taskContextToInfo(context: TaskContext): TaskContextInfo {
	return {
		documents: context.documents,
		relatedTasks: context.relatedTasks
	};
}

/**
 * Estimate token count from character count
 * Rough approximation: ~4 characters per token
 */
export function estimateTokens(charCount: number): number {
	return Math.ceil(charCount / 4);
}

/**
 * Check if context will exceed recommended budget
 */
export function willExceedBudget(context: TaskContextInfo): boolean {
	let totalChars = 0;

	if (context.documents) {
		totalChars += context.documents.reduce((sum, doc) => sum + doc.charCount, 0);
	}

	if (context.relatedTasks) {
		totalChars += context.relatedTasks.reduce(
			(sum, task) => sum + task.title.length + (task.contextSummary?.length ?? 0) + 100,
			0
		);
	}

	return totalChars > MAX_CONTEXT_CHARS;
}
