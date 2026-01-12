/**
 * Template Renderers Index
 *
 * Importing this file registers all template renderers.
 *
 * See: docs/GUIDED_CREATION.md Phase 4
 */

// Import to register
import './meeting-notes-renderer';

// Re-export main interface
export { renderTemplate, hasRenderer } from '../template-renderer';
export type { RenderResult, EntityToCreate, TemplateRenderer } from '../template-renderer';

// Re-export entity creator for API routes
export { createEntitiesFromGuidedCreation } from '../guided-entity-creator';
export type { EntityCreationContext } from '../guided-entity-creator';
