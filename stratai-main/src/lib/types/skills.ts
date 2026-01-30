/**
 * Skills Types
 *
 * Skills are reusable AI instruction sets (methodologies, workflows, rubrics)
 * that can be attached to Spaces or Areas. Space skills can be activated
 * per-Area via area_skill_activations.
 *
 * See docs/features/SKILLS.md
 */

/**
 * Activation mode determines when a skill's content is injected into the system prompt
 */
export type SkillActivationMode = 'always' | 'trigger' | 'manual';

/**
 * Core Skill entity
 */
export interface Skill {
	id: string;
	spaceId?: string;
	areaId?: string;
	name: string;
	description: string;
	content: string;
	summary?: string;
	activationMode: SkillActivationMode;
	triggers?: string[];
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Database row representation
 * Note: postgres.js auto-converts snake_case to camelCase
 */
export interface SkillRow {
	id: string;
	spaceId: string | null;
	areaId: string | null;
	name: string;
	description: string;
	content: string;
	summary: string | null;
	activationMode: string;
	triggers: string[] | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Input for creating a skill
 */
export interface CreateSkillInput {
	spaceId?: string;
	areaId?: string;
	name: string;
	description: string;
	content: string;
	summary?: string;
	activationMode?: SkillActivationMode;
	triggers?: string[];
}

/**
 * Input for updating a skill
 */
export interface UpdateSkillInput {
	name?: string;
	description?: string;
	content?: string;
	summary?: string;
	activationMode?: SkillActivationMode;
	triggers?: string[];
}

/**
 * Area skill activation record
 */
export interface AreaSkillActivation {
	id: string;
	areaId: string;
	skillId: string;
	activatedAt: Date;
	activatedBy: string;
}

/**
 * Database row for area_skill_activations
 */
export interface AreaSkillActivationRow {
	id: string;
	areaId: string;
	skillId: string;
	activatedAt: Date;
	activatedBy: string;
}

/**
 * Lightweight skill context for prompt injection
 * Contains only what the system prompt builder needs
 */
export interface SkillContext {
	id: string;
	name: string;
	description: string;
	content: string;
	summary?: string;
	activationMode: SkillActivationMode;
}

/**
 * Convert database row to Skill entity
 * Note: postgres.js auto-converts snake_case to camelCase, so row properties are already camelCase
 */
export function rowToSkill(row: SkillRow): Skill {
	return {
		id: row.id,
		spaceId: row.spaceId ?? undefined,
		areaId: row.areaId ?? undefined,
		name: row.name,
		description: row.description,
		content: row.content,
		summary: row.summary ?? undefined,
		activationMode: row.activationMode as SkillActivationMode,
		triggers: row.triggers ?? undefined,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

/**
 * Convert database row to SkillContext (for prompt injection)
 */
export function rowToSkillContext(row: SkillRow): SkillContext {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		content: row.content,
		summary: row.summary ?? undefined,
		activationMode: row.activationMode as SkillActivationMode
	};
}
