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
 * Acceptance criteria (US-001):
 * - Markdown: title as H1, role labels, timestamps, preserved code blocks
 * - JSON: id, title, createdAt, updatedAt, messages array with metadata
 * - Plain text: [Timestamp] Role: Message - suitable for grep/analysis
 * - Content-Type matches format
 * - Content-Disposition with filename: {task-title}-conversation-{timestamp}.{ext}
 * - Handles empty conversations gracefully
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Conversation, Message, FileAttachment, SearchSource } from '$lib/types/chat';
import { postgresConversationRepository } from '$lib/server/persistence';

/**
 * Supported export formats
 */
type ExportFormat = 'markdown' | 'json' | 'plaintext';

/**
 * Sanitize filename by removing special characters and limiting length
 */
function sanitizeFilename(text: string): string {
	return text
		.replace(/[/\\:*?"<>|]/g, '') // Remove special characters
		.replace(/\s+/g, '-') // Replace spaces with dashes
		.replace(/-+/g, '-') // Remove duplicate dashes
		.trim()
		.substring(0, 50); // Limit length
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(timestamp: number): string {
	return new Date(timestamp).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

/**
 * Format file size in human-readable format
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
 * Convert conversation to Markdown format
 *
 * Format:
 * - Title as H1
 * - Messages with role labels and timestamps
 * - Code blocks preserved
 * - Attachments listed with metadata
 * - Thinking sections marked clearly
 * - Search sources as reference list
 */
function convertToMarkdown(conversation: Conversation): string {
	const lines: string[] = [];

	// Title
	lines.push(`# ${conversation.title}`);
	lines.push('');

	// Metadata
	lines.push(`**Created:** ${formatTimestamp(conversation.createdAt)}`);
	lines.push(`**Updated:** ${formatTimestamp(conversation.updatedAt)}`);
	if (conversation.model) {
		lines.push(`**Model:** ${conversation.model}`);
	}
	lines.push('');
	lines.push('---');
	lines.push('');

	// Handle empty conversations
	if (!conversation.messages || conversation.messages.length === 0) {
		lines.push('*No messages yet*');
		return lines.join('\n');
	}

	// Messages
	for (const message of conversation.messages) {
		// Skip hidden messages
		if (message.hidden) continue;

		// Role header with timestamp
		const roleLabel = getRoleLabel(message.role);
		lines.push(`## ${roleLabel}`);
		lines.push(`*${formatTimestamp(message.timestamp)}*`);
		lines.push('');

		// Extended thinking section (if present)
		if (message.thinking) {
			lines.push('<details>');
			lines.push('<summary>Extended Thinking</summary>');
			lines.push('');
			lines.push(message.thinking);
			lines.push('');
			lines.push('</details>');
			lines.push('');
		}

		// Message content
		if (message.content) {
			lines.push(message.content);
			lines.push('');
		}

		// Error indicator
		if (message.error) {
			lines.push(`> **Error:** ${message.error}`);
			lines.push('');
		}

		// Attachments
		if (message.attachments && message.attachments.length > 0) {
			lines.push('**Attachments:**');
			for (const attachment of message.attachments) {
				const size = formatFileSize(attachment.size);
				lines.push(`- ${attachment.filename} (${size}, ${attachment.mimeType})`);
			}
			lines.push('');
		}

		// Search sources
		if (message.sources && message.sources.length > 0) {
			lines.push('**Sources:**');
			for (const source of message.sources) {
				lines.push(`- [${source.title}](${source.url})`);
				if (source.snippet) {
					lines.push(`  > ${source.snippet}`);
				}
			}
			lines.push('');
		}

		lines.push('---');
		lines.push('');
	}

	return lines.join('\n').trim();
}

/**
 * Convert conversation to JSON format
 *
 * Returns full conversation data with all metadata
 */
function convertToJson(conversation: Conversation): string {
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
		messageCount: conversation.messages?.length ?? 0,
		messages: (conversation.messages ?? [])
			.filter((m) => !m.hidden) // Exclude hidden messages
			.map((message) => ({
				id: message.id,
				role: message.role,
				content: message.content,
				timestamp: message.timestamp,
				error: message.error ?? null,
				thinking: message.thinking ?? null,
				attachments: message.attachments?.map((a) => ({
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
		exportedAt: new Date().toISOString()
	};

	return JSON.stringify(exportData, null, 2);
}

/**
 * Convert conversation to plain text format
 *
 * Format: [Timestamp] Role: Message
 * Suitable for grep/analysis
 */
function convertToPlaintext(conversation: Conversation): string {
	const lines: string[] = [];

	// Header
	lines.push(`Conversation: ${conversation.title}`);
	lines.push(`Created: ${formatTimestamp(conversation.createdAt)}`);
	lines.push(`Updated: ${formatTimestamp(conversation.updatedAt)}`);
	if (conversation.model) {
		lines.push(`Model: ${conversation.model}`);
	}
	lines.push('');
	lines.push('='.repeat(80));
	lines.push('');

	// Handle empty conversations
	if (!conversation.messages || conversation.messages.length === 0) {
		lines.push('No messages yet');
		return lines.join('\n');
	}

	// Messages
	for (const message of conversation.messages) {
		// Skip hidden messages
		if (message.hidden) continue;

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
					`[${timestamp}] ${role} ATTACHMENT: ${attachment.filename} (${formatFileSize(attachment.size)})`
				);
			}
		}

		lines.push('');
	}

	return lines.join('\n').trim();
}

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

	// Generate filename
	const sanitizedTitle = sanitizeFilename(conversation.title) || 'conversation';
	const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

	// Convert based on format
	let content: string;
	let contentType: string;
	let extension: string;

	switch (format) {
		case 'markdown':
			content = convertToMarkdown(conversation);
			contentType = 'text/markdown; charset=utf-8';
			extension = 'md';
			break;

		case 'json':
			content = convertToJson(conversation);
			contentType = 'application/json; charset=utf-8';
			extension = 'json';
			break;

		case 'plaintext':
			content = convertToPlaintext(conversation);
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
