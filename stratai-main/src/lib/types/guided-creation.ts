/**
 * Guided Creation Types
 *
 * Core type definitions for the step-based guided creation system.
 * This is distinct from the existing GuidedQuestion interface in page-templates.ts
 * which handles simpler chat-based Q&A flows.
 *
 * See: docs/GUIDED_CREATION.md
 */

import type { PageType } from './page';

// ============================================================================
// FIELD TYPES
// ============================================================================

/**
 * Supported field types for guided creation steps
 */
export type FieldType =
	| 'text' // Single line text input
	| 'textarea' // Multi-line text input
	| 'datetime' // Date and time picker
	| 'date' // Date only picker
	| 'toggle' // Boolean toggle switch
	| 'user-select' // Single user from Space/Area members
	| 'user-multi' // Multiple users selection
	| 'attendees' // Internal + external attendees (special compound type)
	| 'list' // Repeatable text items
	| 'decisions' // Decision with owner + rationale
	| 'action-items'; // Actions with assignee + due + create task toggle

// ============================================================================
// FIELD & STEP DEFINITIONS
// ============================================================================

/**
 * Single field definition within a step
 */
export interface FieldDefinition {
	/** Unique identifier for this field (used as data key) */
	id: string;
	/** The type of input to render */
	type: FieldType;
	/** Display label for the field */
	label: string;
	/** Placeholder text for input fields */
	placeholder?: string;
	/** Helper text shown below the field */
	hint?: string;
	/** Whether this field must have a value */
	required?: boolean;
	/** Default value - can be a value or a function returning a value */
	defaultValue?: unknown | (() => unknown);
}

/**
 * A step in the guided creation flow
 */
export interface StepDefinition {
	/** Unique identifier for this step */
	id: string;
	/** Display title for the step */
	title: string;
	/** Optional description shown under the title */
	description?: string;
	/** Fields to render in this step */
	fields: FieldDefinition[];
	/** Whether this entire step can be skipped */
	optional?: boolean;
}

// ============================================================================
// ENTITY CREATION
// ============================================================================

/**
 * Entity to create from collected data
 *
 * Defines how to extract and create entities (like Tasks)
 * from the guided creation data.
 */
export interface EntityCreationRule {
	/** Type of entity to create */
	type: 'task'; // Future: 'decision', 'memory'
	/** Which field in the collected data contains the source array */
	sourceField: string;
	/** How to map source item fields to entity fields */
	mapping: Record<string, string>;
	/** Optional JS expression to filter items (e.g., "item.createTask === true") */
	condition?: string;
}

/**
 * Result of creating an entity from guided creation
 */
export interface EntityCreationResult {
	/** Type of entity created */
	type: 'task';
	/** ID of the created entity */
	id: string;
	/** Title/name of the created entity (for display) */
	title: string;
	/** Whether creation succeeded */
	success: boolean;
	/** Error message if creation failed */
	error?: string;
}

// ============================================================================
// TEMPLATE SCHEMA
// ============================================================================

/**
 * Complete template schema definition
 *
 * Defines the full configuration for a guided creation flow
 * including steps, fields, and entity creation rules.
 */
export interface TemplateSchema {
	/** The page type this schema is for */
	type: PageType;
	/** Schema version for migration/compatibility */
	version: number;
	/** Steps in the guided flow */
	steps: StepDefinition[];
	/** Rules for creating entities from collected data */
	entityCreation?: EntityCreationRule[];
}

// ============================================================================
// COLLECTED DATA
// ============================================================================

/**
 * Collected data from guided creation
 *
 * This is what gets stored after the user completes the flow,
 * before rendering into a document.
 */
export interface GuidedCreationData {
	/** The template type used */
	templateType: PageType;
	/** Version of the schema used (for compatibility) */
	schemaVersion: number;
	/** When the data was collected (ISO timestamp) */
	collectedAt: string;
	/** The actual collected field values */
	data: Record<string, unknown>;
	/** Results of entity creation (populated after processing) */
	entityCreationResults?: EntityCreationResult[];
}
