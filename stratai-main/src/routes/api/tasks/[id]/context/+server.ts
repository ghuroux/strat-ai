/**
 * Task Context API
 *
 * GET /api/tasks/[id]/context - Get full context for a task (documents + related tasks)
 *
 * This endpoint aggregates all linked context for Plan Mode prompt injection.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresDocumentRepository } from '$lib/server/persistence/documents-postgres';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import type { TaskContext } from '$lib/types/tasks';

/**
 * GET /api/tasks/[id]/context
 * Returns the full context payload for Plan Mode
 * Includes:
 * - Linked documents with content
 * - Related tasks with context summaries
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id: taskId } = params;

		// Verify task exists
		const task = await postgresTaskRepository.findById(taskId, userId);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Fetch linked documents
		const linkedDocs = await postgresDocumentRepository.getDocumentsForTask(taskId, userId);

		// Fetch related tasks
		const relatedTasksInfo = await postgresTaskRepository.getRelatedTasks(taskId, userId);

		// Build context payload
		const context: TaskContext = {
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
		};

		// Calculate total character count for token estimation
		const totalChars =
			context.documents.reduce((sum, doc) => sum + doc.charCount, 0) +
			context.relatedTasks.reduce(
				(sum, task) => sum + task.title.length + (task.contextSummary?.length ?? 0),
				0
			);

		return json({
			context,
			meta: {
				documentCount: context.documents.length,
				relatedTaskCount: context.relatedTasks.length,
				totalChars,
				estimatedTokens: Math.ceil(totalChars / 4) // Rough estimate: 4 chars per token
			}
		});
	} catch (error) {
		console.error('Failed to fetch task context:', error);
		return json(
			{
				error: 'Failed to fetch task context',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
