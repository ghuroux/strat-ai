/**
 * Template Renderers Index
 *
 * Importing this file registers all template renderers.
 * This module is safe for client-side use.
 *
 * NOTE: Server-side entity creation (createEntitiesFromGuidedCreation)
 * must be imported directly from '$lib/services/guided-entity-creator'
 * in API routes, as it uses postgres.
 *
 * See: docs/GUIDED_CREATION.md Phase 4
 */

// Import to register
import './meeting-notes-renderer';

// Re-export main interface (client-safe)
export { renderTemplate, hasRenderer } from '../template-renderer';
export type { RenderResult, EntityToCreate, TemplateRenderer } from '../template-renderer';
