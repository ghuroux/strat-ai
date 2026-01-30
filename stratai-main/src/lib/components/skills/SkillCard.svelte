<script lang="ts">
	/**
	 * SkillCard - Reusable card for displaying a skill
	 *
	 * Shows skill name, description, activation mode badge, triggers,
	 * and optional edit/delete actions (shown on hover).
	 *
	 * Used in:
	 * - Space Skills page (with actions)
	 * - ContextPanel skills section (without actions)
	 */
	import { Zap } from 'lucide-svelte';
	import type { Skill, SkillActivationMode } from '$lib/types/skills';

	interface Props {
		skill: Skill;
		showActions?: boolean;
		spaceColor?: string;
		onEdit?: () => void;
		onDelete?: () => void;
	}

	let {
		skill,
		showActions = false,
		spaceColor = '#3b82f6',
		onEdit,
		onDelete
	}: Props = $props();

	// Mode badge config
	function getModeConfig(mode: SkillActivationMode): { label: string; colorClass: string } {
		switch (mode) {
			case 'always':
				return { label: 'Always', colorClass: 'mode-always' };
			case 'trigger':
				return { label: 'Trigger', colorClass: 'mode-trigger' };
			case 'manual':
				return { label: 'Manual', colorClass: 'mode-manual' };
			default:
				return { label: 'Manual', colorClass: 'mode-manual' };
		}
	}

	let modeConfig = $derived(getModeConfig(skill.activationMode));
</script>

<div class="skill-card" style="--space-color: {spaceColor}">
	<div class="card-header">
		<div class="card-title-row">
			<div class="skill-icon">
				<Zap size={14} strokeWidth={2} />
			</div>
			<span class="skill-name" title={skill.name}>{skill.name}</span>
		</div>
		<span class="mode-badge {modeConfig.colorClass}">{modeConfig.label}</span>
	</div>

	<p class="skill-description">{skill.description}</p>

	{#if skill.triggers && skill.triggers.length > 0}
		<div class="skill-triggers">
			{#each skill.triggers as trigger}
				<span class="trigger-tag">{trigger}</span>
			{/each}
		</div>
	{/if}

	{#if showActions && (onEdit || onDelete)}
		<div class="card-actions">
			{#if onEdit}
				<button type="button" class="action-btn" onclick={onEdit}>Edit</button>
			{/if}
			{#if onDelete}
				<button type="button" class="action-btn action-delete" onclick={onDelete}>Delete</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.skill-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.625rem;
		transition: all 0.15s ease;
		position: relative;
	}

	@media (prefers-color-scheme: light) {
		.skill-card {
			background: white;
			border-color: rgb(228 228 231);
		}
	}

	.skill-card:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.12);
	}

	@media (prefers-color-scheme: light) {
		.skill-card:hover {
			background: rgb(250 250 250);
			border-color: rgb(212 212 216);
		}
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.card-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.skill-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		background: color-mix(in srgb, var(--space-color) 15%, transparent);
		border-radius: 0.25rem;
		color: var(--space-color);
	}

	.skill-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@media (prefers-color-scheme: light) {
		.skill-name {
			color: rgb(24 24 27);
		}
	}

	.mode-badge {
		flex-shrink: 0;
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.mode-always {
		background: rgba(16, 185, 129, 0.15);
		color: #10b981;
	}

	.mode-trigger {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.mode-manual {
		background: rgba(161, 161, 170, 0.15);
		color: rgb(161 161 170);
	}

	.skill-description {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.5;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	@media (prefers-color-scheme: light) {
		.skill-description {
			color: rgb(113 113 122);
		}
	}

	.skill-triggers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.trigger-tag {
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.25rem;
		color: rgba(255, 255, 255, 0.5);
	}

	@media (prefers-color-scheme: light) {
		.trigger-tag {
			background: rgb(244 244 245);
			border-color: rgb(228 228 231);
			color: rgb(113 113 122);
		}
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.25rem;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.skill-card:hover .card-actions {
		opacity: 1;
	}

	.action-btn {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.625rem;
		border-radius: 0.25rem;
		color: rgba(255, 255, 255, 0.6);
		transition: all 0.15s ease;
	}

	@media (prefers-color-scheme: light) {
		.action-btn {
			color: rgb(113 113 122);
		}
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	@media (prefers-color-scheme: light) {
		.action-btn:hover {
			background: rgb(244 244 245);
			color: rgb(24 24 27);
		}
	}

	.action-delete:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	@media (prefers-color-scheme: light) {
		.action-delete:hover {
			background: rgba(239, 68, 68, 0.1);
			color: #ef4444;
		}
	}
</style>
