<script lang="ts">
	/**
	 * ArenaCategoryChips - Category selector for Arena battles
	 *
	 * Allows users to select a battle category before starting.
	 * "General" is the default, AI Judge can suggest a more specific
	 * category after analyzing the prompt.
	 */
	import { TEMPLATE_CATEGORIES, type TemplateCategory } from '$lib/config/battle-templates';

	interface Props {
		selected: TemplateCategory;
		onSelect: (category: TemplateCategory) => void;
		disabled?: boolean;
	}

	let { selected = 'general', onSelect, disabled = false }: Props = $props();

	// Define category order (general first as default)
	const categories: TemplateCategory[] = ['general', 'coding', 'reasoning', 'creative', 'analysis'];

	// Category icons
	const categoryIcons: Record<TemplateCategory, string> = {
		general: '💬',
		coding: '💻',
		reasoning: '🧠',
		creative: '🎨',
		analysis: '📊'
	};
</script>

<div class="category-chips" class:disabled>
	<span class="label">Category</span>
	<div class="chips">
		{#each categories as cat}
			{@const config = TEMPLATE_CATEGORIES[cat]}
			<button
				type="button"
				class="chip"
				class:active={selected === cat}
				style="--chip-color: {config.color}"
				onclick={() => onSelect(cat)}
				{disabled}
			>
				<span class="icon">{categoryIcons[cat]}</span>
				<span class="text">{config.label}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.category-chips {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.category-chips.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.chip:hover:not(:disabled) {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.chip.active {
		color: #fff;
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.chip:disabled {
		cursor: not-allowed;
	}

	.icon {
		font-size: 0.875rem;
		line-height: 1;
	}

	.text {
		line-height: 1;
	}

	/* Responsive: Stack on small screens */
	@media (max-width: 640px) {
		.category-chips {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
