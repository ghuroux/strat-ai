/**
 * Template Renderer Service
 *
 * Converts GuidedCreationData into TipTap document content.
 * Supports multiple template types through a registry pattern.
 *
 * See: docs/GUIDED_CREATION.md Phase 4
 */

import type { TipTapContent } from '$lib/types/page';
import type { GuidedCreationData } from '$lib/types/guided-creation';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of rendering a template
 */
export interface RenderResult {
	/** The TipTap document content */
	content: TipTapContent;
	/** Entities to create after document creation */
	entitiesToCreate: EntityToCreate[];
}

/**
 * Entity to be created from guided data
 */
export interface EntityToCreate {
	type: 'task';
	data: {
		title: string;
		assigneeId?: string;
		dueDate?: string;
	};
}

/**
 * Interface for template-specific renderers
 */
export interface TemplateRenderer {
	render(data: GuidedCreationData, areaContext?: string): RenderResult;
}

// ============================================================================
// REGISTRY
// ============================================================================

// Registry of renderers by template type
const renderers = new Map<string, TemplateRenderer>();

/**
 * Register a renderer for a template type
 */
export function registerRenderer(type: string, renderer: TemplateRenderer): void {
	renderers.set(type, renderer);
}

/**
 * Render guided creation data into TipTap content
 *
 * @throws Error if no renderer registered for template type
 */
export function renderTemplate(data: GuidedCreationData, areaContext?: string): RenderResult {
	const renderer = renderers.get(data.templateType);
	if (!renderer) {
		throw new Error(`No renderer registered for template type: ${data.templateType}`);
	}
	return renderer.render(data, areaContext);
}

/**
 * Check if a renderer exists for a template type
 */
export function hasRenderer(type: string): boolean {
	return renderers.has(type);
}
