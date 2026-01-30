/**
 * PostgreSQL Skills Repository
 *
 * Handles CRUD operations for skills and area skill activations.
 * Skills are reusable AI instruction sets attached to Spaces or Areas.
 *
 * See docs/features/SKILLS.md
 */

import { sql } from './db';
import type {
	Skill,
	SkillRow,
	CreateSkillInput,
	UpdateSkillInput,
	AreaSkillActivation,
	AreaSkillActivationRow,
	SkillContext
} from '$lib/types/skills';
import { rowToSkill, rowToSkillContext } from '$lib/types/skills';

/**
 * Generate a unique skill ID
 */
function generateSkillId(): string {
	return `skill_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique activation ID
 */
function generateActivationId(): string {
	return `skact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const postgresSkillsRepository = {
	/**
	 * Create a new skill
	 */
	async create(input: CreateSkillInput, userId: string): Promise<Skill> {
		const id = generateSkillId();
		const now = new Date();

		const rows = await sql<SkillRow[]>`
			INSERT INTO skills (
				id, space_id, area_id, name, description, content, summary,
				activation_mode, triggers, created_by, created_at, updated_at
			) VALUES (
				${id},
				${input.spaceId ?? null},
				${input.areaId ?? null},
				${input.name},
				${input.description},
				${input.content},
				${input.summary ?? null},
				${input.activationMode ?? 'manual'},
				${input.triggers ?? null},
				${userId},
				${now},
				${now}
			)
			RETURNING *
		`;

		return rowToSkill(rows[0]);
	},

	/**
	 * Find a skill by ID
	 */
	async findById(skillId: string): Promise<Skill | null> {
		const rows = await sql<SkillRow[]>`
			SELECT * FROM skills WHERE id = ${skillId}
		`;
		return rows.length > 0 ? rowToSkill(rows[0]) : null;
	},

	/**
	 * Update a skill
	 */
	async update(skillId: string, input: UpdateSkillInput): Promise<Skill | null> {
		const existing = await this.findById(skillId);
		if (!existing) return null;

		await sql`
			UPDATE skills
			SET
				name = COALESCE(${input.name ?? null}, name),
				description = COALESCE(${input.description ?? null}, description),
				content = COALESCE(${input.content ?? null}, content),
				summary = ${input.summary === undefined ? sql`summary` : input.summary ?? null},
				activation_mode = COALESCE(${input.activationMode ?? null}, activation_mode),
				triggers = ${input.triggers === undefined ? sql`triggers` : input.triggers ?? null},
				updated_at = NOW()
			WHERE id = ${skillId}
		`;

		return this.findById(skillId);
	},

	/**
	 * Delete a skill (CASCADE handles activations)
	 */
	async delete(skillId: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM skills WHERE id = ${skillId} RETURNING id
		`;
		return result.length > 0;
	},

	/**
	 * Find all skills owned by a Space
	 */
	async findBySpace(spaceId: string): Promise<Skill[]> {
		const rows = await sql<SkillRow[]>`
			SELECT * FROM skills
			WHERE space_id = ${spaceId}
			ORDER BY name ASC
		`;
		return rows.map(rowToSkill);
	},

	/**
	 * Find all skills owned directly by an Area
	 */
	async findByArea(areaId: string): Promise<Skill[]> {
		const rows = await sql<SkillRow[]>`
			SELECT * FROM skills
			WHERE area_id = ${areaId}
			ORDER BY name ASC
		`;
		return rows.map(rowToSkill);
	},

	/**
	 * Activate a Space skill in an Area
	 */
	async activateInArea(areaId: string, skillId: string, userId: string): Promise<AreaSkillActivation> {
		const id = generateActivationId();

		const rows = await sql<AreaSkillActivationRow[]>`
			INSERT INTO area_skill_activations (id, area_id, skill_id, activated_at, activated_by)
			VALUES (${id}, ${areaId}, ${skillId}, NOW(), ${userId})
			ON CONFLICT (area_id, skill_id) DO NOTHING
			RETURNING *
		`;

		// If ON CONFLICT, fetch existing
		if (rows.length === 0) {
			const existing = await sql<AreaSkillActivationRow[]>`
				SELECT * FROM area_skill_activations
				WHERE area_id = ${areaId} AND skill_id = ${skillId}
			`;
			return {
				id: existing[0].id,
				areaId: existing[0].areaId,
				skillId: existing[0].skillId,
				activatedAt: existing[0].activatedAt,
				activatedBy: existing[0].activatedBy
			};
		}

		return {
			id: rows[0].id,
			areaId: rows[0].areaId,
			skillId: rows[0].skillId,
			activatedAt: rows[0].activatedAt,
			activatedBy: rows[0].activatedBy
		};
	},

	/**
	 * Deactivate a skill from an Area
	 */
	async deactivateInArea(areaId: string, skillId: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM area_skill_activations
			WHERE area_id = ${areaId} AND skill_id = ${skillId}
			RETURNING id
		`;
		return result.length > 0;
	},

	/**
	 * Find Space skills activated in a specific Area (via area_skill_activations)
	 */
	async findActivatedForArea(areaId: string): Promise<Skill[]> {
		const rows = await sql<SkillRow[]>`
			SELECT s.*
			FROM skills s
			JOIN area_skill_activations asa ON s.id = asa.skill_id
			WHERE asa.area_id = ${areaId}
			ORDER BY s.name ASC
		`;
		return rows.map(rowToSkill);
	},

	/**
	 * Get all active skills for an Area — the critical method for prompt injection.
	 *
	 * Combines:
	 * 1. Skills directly owned by the area (area_id = areaId)
	 * 2. Space skills activated in this area (via area_skill_activations join)
	 *
	 * Returns SkillContext[] (lightweight, prompt-ready)
	 */
	async getActiveSkillsForArea(areaId: string): Promise<SkillContext[]> {
		const rows = await sql<SkillRow[]>`
			SELECT s.* FROM skills s
			WHERE s.area_id = ${areaId}

			UNION

			SELECT s.* FROM skills s
			JOIN area_skill_activations asa ON s.id = asa.skill_id
			WHERE asa.area_id = ${areaId}

			ORDER BY name ASC
		`;
		return rows.map(rowToSkillContext);
	}
};
