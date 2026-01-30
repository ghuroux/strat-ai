/**
 * Skills Store - Skill management with PostgreSQL persistence
 * Uses Svelte 5 runes for reactivity with SvelteMap for proper tracking
 *
 * Skills are reusable AI instruction sets (methodologies, workflows, rubrics)
 * that belong to Spaces and can be activated per-Area.
 *
 * Handles:
 * - Space skill CRUD operations
 * - Area skill activation/deactivation
 * - Cache management per-space and per-area
 */

import { SvelteMap } from 'svelte/reactivity';
import type { Skill, CreateSkillInput, UpdateSkillInput } from '$lib/types/skills';
import { toastStore } from './toast.svelte';
import { debugLog } from '$lib/utils/debug';

class SkillStore {
	// Skills by space: spaceId -> Skill[]
	skillsBySpace = new SvelteMap<string, Skill[]>();

	// Activated skills by area: areaId -> Skill[]
	activatedByArea = new SvelteMap<string, Skill[]>();

	// Loading state
	isLoading = $state(false);

	// Version counter for fine-grained reactivity
	_version = $state(0);

	// Track which spaces/areas have been loaded
	private loadedSpaces = new Set<string>();
	private loadedAreas = new Set<string>();

	// ==========================================
	// Space Skills
	// ==========================================

	/**
	 * Load all skills for a space
	 */
	async loadSkills(spaceId: string): Promise<void> {
		if (this.loadedSpaces.has(spaceId)) return;

		this.isLoading = true;

		try {
			const response = await fetch(`/api/skills?spaceId=${spaceId}`);

			if (!response.ok) {
				if (response.status === 401) return;
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.skills) {
				const skills: Skill[] = data.skills.map((s: Skill) => ({
					...s,
					createdAt: new Date(s.createdAt),
					updatedAt: new Date(s.updatedAt)
				}));

				this.skillsBySpace.set(spaceId, skills);
				this.loadedSpaces.add(spaceId);
				this._version++;
			}
		} catch (e) {
			debugLog('SKILLS_STORE', 'Failed to load skills:', e);
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Get skills for a space (reactive)
	 */
	getSkillsForSpace(spaceId: string): Skill[] {
		void this._version;
		return this.skillsBySpace.get(spaceId) ?? [];
	}

	/**
	 * Create a new skill
	 */
	async createSkill(input: CreateSkillInput): Promise<Skill | null> {
		this.isLoading = true;

		try {
			const response = await fetch('/api/skills', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error?.message || `Create failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.skill) {
				const skill: Skill = {
					...data.skill,
					createdAt: new Date(data.skill.createdAt),
					updatedAt: new Date(data.skill.updatedAt)
				};

				// Add to space cache
				const spaceId = input.spaceId;
				if (spaceId) {
					const spaceList = this.skillsBySpace.get(spaceId) ?? [];
					this.skillsBySpace.set(spaceId, [...spaceList, skill]);
				}

				this._version++;
				toastStore.success('Skill created');
				return skill;
			}
			return null;
		} catch (e) {
			debugLog('SKILLS_STORE', 'Failed to create skill:', e);
			toastStore.error(e instanceof Error ? e.message : 'Failed to create skill');
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Update an existing skill
	 */
	async updateSkill(id: string, input: UpdateSkillInput): Promise<Skill | null> {
		this.isLoading = true;

		try {
			const response = await fetch(`/api/skills/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(input)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error?.message || `Update failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.skill) {
				const skill: Skill = {
					...data.skill,
					createdAt: new Date(data.skill.createdAt),
					updatedAt: new Date(data.skill.updatedAt)
				};

				// Update in space cache
				const spaceId = skill.spaceId;
				if (spaceId) {
					const spaceList = this.skillsBySpace.get(spaceId);
					if (spaceList) {
						const index = spaceList.findIndex((s) => s.id === id);
						if (index !== -1) {
							spaceList[index] = skill;
							this.skillsBySpace.set(spaceId, [...spaceList]);
						}
					}
				}

				// Update in activated area caches
				for (const [areaId, areaSkills] of this.activatedByArea) {
					const index = areaSkills.findIndex((s) => s.id === id);
					if (index !== -1) {
						areaSkills[index] = skill;
						this.activatedByArea.set(areaId, [...areaSkills]);
					}
				}

				this._version++;
				toastStore.success('Skill updated');
				return skill;
			}
			return null;
		} catch (e) {
			debugLog('SKILLS_STORE', 'Failed to update skill:', e);
			toastStore.error(e instanceof Error ? e.message : 'Failed to update skill');
			return null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Delete a skill
	 */
	async deleteSkill(id: string, spaceId: string): Promise<boolean> {
		this.isLoading = true;

		try {
			const response = await fetch(`/api/skills/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error?.message || `Delete failed: ${response.status}`);
			}

			// Remove from space cache
			const spaceList = this.skillsBySpace.get(spaceId);
			if (spaceList) {
				this.skillsBySpace.set(
					spaceId,
					spaceList.filter((s) => s.id !== id)
				);
			}

			// Remove from all activated area caches
			for (const [areaId, areaSkills] of this.activatedByArea) {
				if (areaSkills.some((s) => s.id === id)) {
					this.activatedByArea.set(
						areaId,
						areaSkills.filter((s) => s.id !== id)
					);
				}
			}

			this._version++;
			toastStore.success('Skill deleted');
			return true;
		} catch (e) {
			debugLog('SKILLS_STORE', 'Failed to delete skill:', e);
			toastStore.error(e instanceof Error ? e.message : 'Failed to delete skill');
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	// ==========================================
	// Area Activations
	// ==========================================

	/**
	 * Load activated skills for an area
	 */
	async loadActivatedSkills(areaId: string): Promise<void> {
		if (this.loadedAreas.has(areaId)) return;

		try {
			const response = await fetch(`/api/areas/${areaId}/skills`);

			if (!response.ok) {
				if (response.status === 401) return;
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.skills) {
				const skills: Skill[] = data.skills.map((s: Skill) => ({
					...s,
					createdAt: new Date(s.createdAt),
					updatedAt: new Date(s.updatedAt)
				}));

				this.activatedByArea.set(areaId, skills);
				this.loadedAreas.add(areaId);
				this._version++;
			}
		} catch (e) {
			debugLog('SKILLS_STORE', 'Failed to load activated skills:', e);
		}
	}

	/**
	 * Get activated skills for an area (reactive)
	 */
	getActivatedSkills(areaId: string): Skill[] {
		void this._version;
		return this.activatedByArea.get(areaId) ?? [];
	}

	/**
	 * Check if a skill is activated in an area (reactive)
	 */
	isSkillActivated(areaId: string, skillId: string): boolean {
		void this._version;
		const skills = this.activatedByArea.get(areaId) ?? [];
		return skills.some((s) => s.id === skillId);
	}

	/**
	 * Activate a skill in an area
	 */
	async activateSkill(areaId: string, skillId: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/areas/${areaId}/skills`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ skillId })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error?.message || `Activate failed: ${response.status}`);
			}

			const data = await response.json();
			if (data.skill) {
				const skill: Skill = {
					...data.skill,
					createdAt: new Date(data.skill.createdAt),
					updatedAt: new Date(data.skill.updatedAt)
				};

				const areaSkills = this.activatedByArea.get(areaId) ?? [];
				if (!areaSkills.some((s) => s.id === skillId)) {
					this.activatedByArea.set(areaId, [...areaSkills, skill]);
				}
			}

			this._version++;
			return true;
		} catch (e) {
			debugLog('SKILLS_STORE', 'Failed to activate skill:', e);
			toastStore.error(e instanceof Error ? e.message : 'Failed to activate skill');
			return false;
		}
	}

	/**
	 * Deactivate a skill from an area
	 */
	async deactivateSkill(areaId: string, skillId: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/areas/${areaId}/skills/${skillId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error?.message || `Deactivate failed: ${response.status}`);
			}

			const areaSkills = this.activatedByArea.get(areaId) ?? [];
			this.activatedByArea.set(
				areaId,
				areaSkills.filter((s) => s.id !== skillId)
			);

			this._version++;
			return true;
		} catch (e) {
			debugLog('SKILLS_STORE', 'Failed to deactivate skill:', e);
			toastStore.error(e instanceof Error ? e.message : 'Failed to deactivate skill');
			return false;
		}
	}

	// ==========================================
	// Cache Management
	// ==========================================

	/**
	 * Invalidate space cache (forces reload on next access)
	 */
	invalidateSpace(spaceId: string): void {
		this.loadedSpaces.delete(spaceId);
		this.skillsBySpace.delete(spaceId);
		this._version++;
	}

	/**
	 * Invalidate area cache (forces reload on next access)
	 */
	invalidateArea(areaId: string): void {
		this.loadedAreas.delete(areaId);
		this.activatedByArea.delete(areaId);
		this._version++;
	}
}

export const skillStore = new SkillStore();
