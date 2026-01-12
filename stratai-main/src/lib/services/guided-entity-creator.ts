/**
 * Guided Entity Creator Service
 *
 * Creates database entities (Tasks, etc.) from guided creation output.
 * Server-side only - called from API routes.
 *
 * See: docs/GUIDED_CREATION.md Phase 5
 */

import type { EntityToCreate } from './template-renderer';
import type { EntityCreationResult } from '$lib/types/guided-creation';
import type { Task } from '$lib/types/tasks';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context needed to create entities
 */
export interface EntityCreationContext {
	/** Space where entities will be created */
	spaceId: string;
	/** Area within the space (optional) */
	areaId: string | null;
	/** ID of the source document (for traceability) */
	sourceDocumentId: string;
	/** User creating the entities */
	userId: string;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Create all entities from guided creation output
 *
 * Processes each entity sequentially, capturing results for each.
 * Failures are recorded but don't stop processing of remaining entities.
 */
export async function createEntitiesFromGuidedCreation(
	entities: EntityToCreate[],
	context: EntityCreationContext
): Promise<EntityCreationResult[]> {
	const results: EntityCreationResult[] = [];

	for (const entity of entities) {
		try {
			const result = await createEntity(entity, context);
			results.push(result);
		} catch (error) {
			results.push({
				type: entity.type,
				id: '',
				title: entity.data.title || 'Unknown',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	return results;
}

// ============================================================================
// ENTITY CREATORS
// ============================================================================

/**
 * Route entity to appropriate creator
 */
async function createEntity(
	entity: EntityToCreate,
	context: EntityCreationContext
): Promise<EntityCreationResult> {
	switch (entity.type) {
		case 'task':
			return createTaskEntity(entity.data, context);
		default:
			throw new Error(`Unknown entity type: ${(entity as { type: string }).type}`);
	}
}

/**
 * Create a Task from entity data
 */
async function createTaskEntity(
	data: EntityToCreate['data'],
	context: EntityCreationContext
): Promise<EntityCreationResult> {
	// Validate required fields
	if (!data.title || data.title.trim() === '') {
		throw new Error('Task title is required');
	}

	// Parse due date if provided
	let dueDate: Date | undefined;
	if (data.dueDate) {
		dueDate = new Date(data.dueDate);
		if (isNaN(dueDate.getTime())) {
			throw new Error('Invalid due date format');
		}
	}

	// Create the task
	const task: Task = await postgresTaskRepository.create(
		{
			title: data.title.trim(),
			spaceId: context.spaceId,
			areaId: context.areaId ?? undefined,
			dueDate,
			dueDateType: dueDate ? 'soft' : undefined,
			source: {
				type: 'document',
				assistId: context.sourceDocumentId // Store document ID in assistId field
			}
		},
		context.userId
	);

	return {
		type: 'task',
		id: task.id,
		title: task.title,
		success: true
	};
}
