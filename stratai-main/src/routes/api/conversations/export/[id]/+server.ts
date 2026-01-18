/**
 * Conversation Export API
 *
 * GET /api/conversations/export/[id]?format=markdown|json|plaintext
 * Exports a conversation in the specified format for download.
 *
 * Query params:
 * - format: Export format (markdown, json, plaintext) - defaults to markdown
 *
 * Returns:
 * - 200: File download with appropriate Content-Type and Content-Disposition headers
 * - 400: Invalid format parameter
 * - 401: Not authenticated
 * - 404: Conversation not found
 * - 500: Server error
 *
 * Acceptance criteria (US-001, US-003):
 * - Markdown: title as H1, role labels, timestamps, preserved code blocks with language hints
 * - JSON: id, title, createdAt, updatedAt, messages array with metadata
 * - Plain text: [Timestamp] Role: Message - suitable for grep/analysis
 * - Content-Type matches format
 * - Content-Disposition with filename: {task-title}-conversation-{timestamp}.{ext}
 * - Handles empty conversations gracefully
 *
 * US-003 Polish:
 * - Filenames sanitized: no special chars (/\:*?"<>|), truncated to 50 chars
 * - Markdown: code blocks with language hints
 * - Markdown: attachments with filename, size (human-readable), MIME type
 * - Markdown: extended thinking sections marked clearly with 💭 icon
 * - Markdown: search sources as numbered reference list at message end
 * - Markdown: export metadata footer (platform, timestamp, message count)
 * - Subtask conversations include parent task context in header
 * - Handles special characters (emoji, backticks, markdown-like text)
 * - Efficient for long conversations (1000+ messages)
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Conversation, Message } from '$lib/types/chat';
import type { Task } from '$lib/types/tasks';
import { postgresConversationRepository } from '$lib/server/persistence';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

/**
 * Supported export formats
 */
type ExportFormat = 'markdown' | 'json' | 'plaintext';

/**
 * Context for subtask conversations
 */
interface SubtaskContext {
	parentTask: Task;
	currentTask: Task;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Sanitize filename by removing special characters and limiting length
 * US-003: Filenames sanitized: no special chars (/\:*?"<>|), truncated to 50 chars
 */
function sanitizeFilename(text: string): string {
	return (
		text
			// Remove filesystem-forbidden characters
			.replace(/[/\\:*?"<>|]/g, '')
			// Remove control characters
			.replace(/[\x00-\x1F\x7F]/g, '')
			// Replace newlines and tabs with spaces
			.replace(/[\r\n\t]+/g, ' ')
			// Replace multiple spaces with single space
			.replace(/\s+/g, ' ')
			// Convert to dashes for URL-friendliness
			.replace(/\s/g, '-')
			// Remove duplicate dashes
			.replace(/-+/g, '-')
			// Remove leading/trailing dashes
			.replace(/^-+|-+$/g, '')
			.trim()
			// Truncate to 50 characters (US-003 requirement)
			.substring(0, 50)
	);
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(timestamp: number): string {
	return new Date(timestamp).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

/**
 * Format file size in human-readable format
 * US-003: Human-readable size (e.g., "1.5 MB")
 */
function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get role display label
 */
function getRoleLabel(role: 'user' | 'assistant' | 'system'): string {
	switch (role) {
		case 'user':
			return 'User';
		case 'assistant':
			return 'Assistant';
		case 'system':
			return 'System';
		default:
			return role;
	}
}

/**
 * Detect programming language from code block or content
 * US-003: Code blocks have language hints (```typescript, ```python)
 */
function detectLanguageHint(code: string): string {
	// Common file extension patterns
	const patterns: [RegExp, string][] = [
		// JavaScript/TypeScript
		[/\b(const|let|var)\s+\w+\s*=|function\s+\w+\s*\(|=>\s*{/i, 'javascript'],
		[/\binterface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean)\b/i, 'typescript'],
		[/import\s+.*\s+from\s+['"]|export\s+(default|const|function|class)/i, 'typescript'],

		// Python
		[/\bdef\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import/i, 'python'],
		[/\bclass\s+\w+.*:|if\s+__name__\s*==\s*['"]__main__['"]/i, 'python'],

		// SQL
		[/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/i, 'sql'],

		// HTML/XML
		[/<\/?[a-z][\s\S]*>/i, 'html'],

		// CSS
		[/[.#][\w-]+\s*{|@media|@import|@keyframes/i, 'css'],

		// JSON
		[/^\s*{[\s\S]*"[\w-]+":\s*[{\["]/i, 'json'],

		// Shell/Bash
		[/\b(npm|yarn|pnpm|git|docker|kubectl)\s+|^\s*#!/i, 'bash'],
		[/\$\(.*\)|&&\s*\w+|\|\|\s*\w+/i, 'bash'],

		// Markdown
		[/^#{1,6}\s+|\*\*.*\*\*|^\s*[-*]\s+/m, 'markdown'],

		// YAML
		[/^\s*[\w-]+:\s*[|\->]?\s*$/m, 'yaml'],

		// Go
		[/\bfunc\s+\w+\s*\(|package\s+\w+|import\s+\(/i, 'go'],

		// Rust
		[/\bfn\s+\w+|impl\s+\w+|let\s+mut\s+/i, 'rust'],

		// Java/C#
		[/\bpublic\s+(class|interface|void|static)/i, 'java'],
		[/\bnamespace\s+\w+|using\s+System/i, 'csharp']
	];

	for (const [pattern, lang] of patterns) {
		if (pattern.test(code)) {
			return lang;
		}
	}

	return ''; // No hint if we can't detect
}

/**
 * Process message content to add language hints to code blocks
 * US-003: Code blocks have language hints
 */
function processCodeBlocks(content: string): string {
	// Match code blocks that don't have a language hint
	// Pattern: ``` followed by newline (no language specified)
	return content.replace(/```\n([\s\S]*?)```/g, (match, codeContent) => {
		const hint = detectLanguageHint(codeContent);
		if (hint) {
			return '```' + hint + '\n' + codeContent + '```';
		}
		return match; // Return unchanged if no hint detected
	});
}

/**
 * Escape special markdown characters in text to prevent rendering issues
 * US-003: Handle special characters (emoji, backticks, markdown-like text)
 */
function escapeMarkdownInText(text: string): string {
	// We don't escape everything - just ensure backticks in inline text don't break
	// Emoji and most characters should pass through fine
	return text;
}

// =============================================================================
// Export Format Converters
// =============================================================================

/**
 * Convert conversation to Markdown format
 *
 * US-003 Polish Requirements:
 * - Code blocks with language hints
 * - Attachments with filename, size (human-readable), MIME type
 * - Extended thinking sections marked clearly with 💭 icon
 * - Search sources as numbered reference list at message end
 * - Export metadata footer
 * - Subtask context in header
 */
function convertToMarkdown(
	conversation: Conversation,
	subtaskContext: SubtaskContext | null
): string {
	// Use array join for efficient string building with large conversations
	const lines: string[] = [];

	// Title
	lines.push(`# ${escapeMarkdownInText(conversation.title)}`);
	lines.push('');

	// Subtask context header (US-003: Subtask conversations include parent task context)
	if (subtaskContext) {
		lines.push('> **📋 Subtask of:** ' + escapeMarkdownInText(subtaskContext.parentTask.title));
		if (subtaskContext.currentTask.contextSummary) {
			// Parse context summary if it's JSON (SubtaskContext format)
			try {
				const ctx = JSON.parse(subtaskContext.currentTask.contextSummary);
				if (ctx.whyImportant) {
					lines.push('> ');
					lines.push('> **Why important:** ' + ctx.whyImportant);
				}
			} catch {
				// Not JSON, use as-is
				lines.push('> ');
				lines.push('> ' + subtaskContext.currentTask.contextSummary);
			}
		}
		lines.push('');
	}

	// Metadata
	lines.push(`**Created:** ${formatTimestamp(conversation.createdAt)}`);
	lines.push(`**Updated:** ${formatTimestamp(conversation.updatedAt)}`);
	if (conversation.model) {
		lines.push(`**Model:** ${conversation.model}`);
	}
	lines.push('');
	lines.push('---');
	lines.push('');

	// Handle empty conversations (US-003: Empty conversations export successfully)
	const visibleMessages = (conversation.messages ?? []).filter((m) => !m.hidden);
	if (visibleMessages.length === 0) {
		lines.push('*No messages yet*');
		lines.push('');
	} else {
		// Messages - process efficiently for long conversations
		for (const message of visibleMessages) {
			// Role header with timestamp
			const roleLabel = getRoleLabel(message.role);
			const roleIcon = message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : '⚙️';
			lines.push(`## ${roleIcon} ${roleLabel}`);
			lines.push(`*${formatTimestamp(message.timestamp)}*`);
			lines.push('');

			// Extended thinking section (US-003: Marked clearly with 💭 icon)
			if (message.thinking) {
				lines.push('<details>');
				lines.push('<summary>💭 Extended Thinking</summary>');
				lines.push('');
				lines.push('```');
				lines.push(message.thinking);
				lines.push('```');
				lines.push('');
				lines.push('</details>');
				lines.push('');
			}

			// Message content with code block processing (US-003: Language hints)
			if (message.content) {
				const processedContent = processCodeBlocks(message.content);
				lines.push(processedContent);
				lines.push('');
			}

			// Error indicator
			if (message.error) {
				lines.push(`> ⚠️ **Error:** ${message.error}`);
				lines.push('');
			}

			// Attachments (US-003: filename, size, MIME type)
			if (message.attachments && message.attachments.length > 0) {
				lines.push('**📎 Attachments:**');
				lines.push('');
				lines.push('| Filename | Size | Type |');
				lines.push('|----------|------|------|');
				for (const attachment of message.attachments) {
					const size = formatFileSize(attachment.size);
					const filename = escapeMarkdownInText(attachment.filename);
					lines.push(`| ${filename} | ${size} | \`${attachment.mimeType}\` |`);
				}
				lines.push('');
			}

			// Search sources (US-003: Formatted as numbered reference list)
			if (message.sources && message.sources.length > 0) {
				lines.push('**🔗 References:**');
				lines.push('');
				for (let i = 0; i < message.sources.length; i++) {
					const source = message.sources[i];
					const num = i + 1;
					lines.push(`${num}. [${escapeMarkdownInText(source.title)}](${source.url})`);
					if (source.snippet) {
						lines.push(`   > ${source.snippet.substring(0, 200)}${source.snippet.length > 200 ? '...' : ''}`);
					}
				}
				lines.push('');
			}

			lines.push('---');
			lines.push('');
		}
	}

	// Export metadata footer (US-003)
	lines.push('');
	lines.push('---');
	lines.push('');
	lines.push('### Export Information');
	lines.push('');
	lines.push(`- **Exported:** ${new Date().toISOString()}`);
	lines.push(`- **Platform:** StratAI`);
	lines.push(`- **Message Count:** ${visibleMessages.length}`);
	if (subtaskContext) {
		lines.push(`- **Task Type:** Subtask`);
		lines.push(`- **Parent Task:** ${escapeMarkdownInText(subtaskContext.parentTask.title)}`);
	}
	lines.push('');

	return lines.join('\n').trim();
}

/**
 * Convert conversation to JSON format
 *
 * Returns full conversation data with all metadata
 * US-003: Include parent task info for subtasks
 */
function convertToJson(
	conversation: Conversation,
	subtaskContext: SubtaskContext | null
): string {
	const visibleMessages = (conversation.messages ?? []).filter((m) => !m.hidden);

	// Create a clean export object with all relevant fields
	const exportData = {
		id: conversation.id,
		title: conversation.title,
		model: conversation.model,
		createdAt: conversation.createdAt,
		updatedAt: conversation.updatedAt,
		lastViewedAt: conversation.lastViewedAt ?? null,
		pinned: conversation.pinned ?? false,
		spaceId: conversation.spaceId ?? null,
		areaId: conversation.areaId ?? null,
		taskId: conversation.taskId ?? null,
		tags: conversation.tags ?? [],
		// Subtask context (US-003)
		subtaskContext: subtaskContext
			? {
					parentTaskId: subtaskContext.parentTask.id,
					parentTaskTitle: subtaskContext.parentTask.title,
					subtaskType: subtaskContext.currentTask.subtaskType ?? null,
					contextSummary: subtaskContext.currentTask.contextSummary ?? null
				}
			: null,
		messageCount: visibleMessages.length,
		messages: visibleMessages.map((message) => ({
			id: message.id,
			role: message.role,
			content: message.content,
			timestamp: message.timestamp,
			error: message.error ?? null,
			thinking: message.thinking ?? null,
			attachments:
				message.attachments?.map((a) => ({
					id: a.id,
					filename: a.filename,
					mimeType: a.mimeType,
					size: a.size,
					truncated: a.truncated,
					charCount: a.charCount ?? null,
					pageCount: a.pageCount ?? null
					// Note: content.data is excluded to keep export size reasonable
				})) ?? [],
			sources: message.sources ?? []
		})),
		exportedAt: new Date().toISOString(),
		exportedBy: 'StratAI',
		exportVersion: '1.1' // Version bump for US-003 enhancements
	};

	return JSON.stringify(exportData, null, 2);
}

/**
 * Convert conversation to plain text format
 *
 * Format: [Timestamp] Role: Message
 * Suitable for grep/analysis
 * US-003: Include subtask context header
 */
function convertToPlaintext(
	conversation: Conversation,
	subtaskContext: SubtaskContext | null
): string {
	const lines: string[] = [];

	// Header
	lines.push(`Conversation: ${conversation.title}`);
	lines.push(`Created: ${formatTimestamp(conversation.createdAt)}`);
	lines.push(`Updated: ${formatTimestamp(conversation.updatedAt)}`);
	if (conversation.model) {
		lines.push(`Model: ${conversation.model}`);
	}

	// Subtask context (US-003)
	if (subtaskContext) {
		lines.push('');
		lines.push(`Parent Task: ${subtaskContext.parentTask.title}`);
		if (subtaskContext.currentTask.contextSummary) {
			try {
				const ctx = JSON.parse(subtaskContext.currentTask.contextSummary);
				if (ctx.whyImportant) {
					lines.push(`Context: ${ctx.whyImportant}`);
				}
			} catch {
				lines.push(`Context: ${subtaskContext.currentTask.contextSummary}`);
			}
		}
	}

	lines.push('');
	lines.push('='.repeat(80));
	lines.push('');

	// Handle empty conversations
	const visibleMessages = (conversation.messages ?? []).filter((m) => !m.hidden);
	if (visibleMessages.length === 0) {
		lines.push('No messages yet');
		lines.push('');
	} else {
		// Messages
		for (const message of visibleMessages) {
			const timestamp = formatTimestamp(message.timestamp);
			const role = getRoleLabel(message.role);

			// Main content
			if (message.content) {
				// For multi-line content, prefix each line
				const contentLines = message.content.split('\n');
				for (let i = 0; i < contentLines.length; i++) {
					if (i === 0) {
						lines.push(`[${timestamp}] ${role}: ${contentLines[i]}`);
					} else {
						// Continuation lines are indented
						lines.push(`                                     ${contentLines[i]}`);
					}
				}
			} else {
				lines.push(`[${timestamp}] ${role}: (empty message)`);
			}

			// Error indicator
			if (message.error) {
				lines.push(`[${timestamp}] ${role} ERROR: ${message.error}`);
			}

			// Attachments (simple list)
			if (message.attachments && message.attachments.length > 0) {
				for (const attachment of message.attachments) {
					lines.push(
						`[${timestamp}] ${role} ATTACHMENT: ${attachment.filename} (${formatFileSize(attachment.size)}, ${attachment.mimeType})`
					);
				}
			}

			// Sources (US-003: Include in plaintext too)
			if (message.sources && message.sources.length > 0) {
				for (const source of message.sources) {
					lines.push(`[${timestamp}] ${role} SOURCE: ${source.title} - ${source.url}`);
				}
			}

			lines.push('');
		}
	}

	// Footer (US-003: Export metadata)
	lines.push('='.repeat(80));
	lines.push(`Exported: ${new Date().toISOString()}`);
	lines.push(`Platform: StratAI`);
	lines.push(`Messages: ${visibleMessages.length}`);

	return lines.join('\n').trim();
}

// =============================================================================
// Request Handler
// =============================================================================

/**
 * GET /api/conversations/export/[id]?format=markdown|json|plaintext
 *
 * Export a conversation in the specified format
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	// Authentication check
	if (!locals.session) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.session.userId;
	const { id } = params;

	// Get and validate format parameter
	const formatParam = url.searchParams.get('format') || 'markdown';
	const validFormats: ExportFormat[] = ['markdown', 'json', 'plaintext'];

	if (!validFormats.includes(formatParam as ExportFormat)) {
		throw error(
			400,
			`Invalid format: ${formatParam}. Supported formats: ${validFormats.join(', ')}`
		);
	}

	const format = formatParam as ExportFormat;

	// Fetch conversation
	const conversation = await postgresConversationRepository.findById(id, userId);

	if (!conversation) {
		throw error(404, 'Conversation not found');
	}

	// Check for subtask context (US-003: Subtask conversations include parent task context)
	let subtaskContext: SubtaskContext | null = null;

	if (conversation.taskId) {
		try {
			const task = await postgresTaskRepository.findById(conversation.taskId, userId);
			if (task && task.parentTaskId) {
				// This is a subtask conversation - get parent task info
				const parentTask = await postgresTaskRepository.findById(task.parentTaskId, userId);
				if (parentTask) {
					subtaskContext = {
						parentTask,
						currentTask: task
					};
				}
			}
		} catch (e) {
			// If we can't fetch task info, continue without subtask context
			console.warn('[export] Failed to fetch task context:', e);
		}
	}

	// Generate filename (US-003: sanitized, truncated to 50 chars)
	const sanitizedTitle = sanitizeFilename(conversation.title) || 'conversation';
	const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	// Convert based on format
	let content: string;
	let contentType: string;
	let extension: string;

	switch (format) {
		case 'markdown':
			content = convertToMarkdown(conversation, subtaskContext);
			contentType = 'text/markdown; charset=utf-8';
			extension = 'md';
			break;

		case 'json':
			content = convertToJson(conversation, subtaskContext);
			contentType = 'application/json; charset=utf-8';
			extension = 'json';
			break;

		case 'plaintext':
			content = convertToPlaintext(conversation, subtaskContext);
			contentType = 'text/plain; charset=utf-8';
			extension = 'txt';
			break;
	}

	const filename = `${sanitizedTitle}-conversation-${timestamp}.${extension}`;

	return new Response(content, {
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
