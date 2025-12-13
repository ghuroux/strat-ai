<script lang="ts">
	import {
		BATTLE_TEMPLATES,
		TEMPLATE_CATEGORIES,
		type BattleTemplate,
		type TemplateCategory
	} from '$lib/config/battle-templates';

	interface Props {
		onSelectTemplate: (prompt: string) => void;
	}

	let { onSelectTemplate }: Props = $props();

	let isOpen = $state(false);
	let selectedCategory = $state<TemplateCategory | 'all'>('all');

	let filteredTemplates = $derived(
		selectedCategory === 'all'
			? BATTLE_TEMPLATES
			: BATTLE_TEMPLATES.filter((t) => t.category === selectedCategory)
	);

	const categories: Array<{ value: TemplateCategory | 'all'; label: string }> = [
		{ value: 'all', label: 'All' },
		{ value: 'coding', label: 'Coding' },
		{ value: 'creative', label: 'Creative' },
		{ value: 'analysis', label: 'Analysis' },
		{ value: 'reasoning', label: 'Reasoning' },
		{ value: 'general', label: 'General' }
	];

	function handleSelect(template: BattleTemplate) {
		onSelectTemplate(template.prompt);
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.arena-templates')) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="arena-templates relative">
	<!-- Trigger button -->
	<button
		type="button"
		onclick={(e) => {
			e.stopPropagation();
			isOpen = !isOpen;
		}}
		class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm
			   {isOpen
				? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
				: 'bg-surface-800/50 border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
		title="Use a battle template"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
		</svg>
		<span class="hidden sm:inline">Templates</span>
		<svg
			class="w-3 h-3 transition-transform {isOpen ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Dropdown panel -->
	{#if isOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div
			class="absolute bottom-full left-0 mb-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden
				   bg-surface-800 border border-surface-700 rounded-xl shadow-2xl z-50"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header with category tabs -->
			<div class="p-3 border-b border-surface-700">
				<div class="text-sm font-medium text-surface-200 mb-2">Battle Templates</div>
				<div class="flex flex-wrap gap-1">
					{#each categories as cat}
						<button
							type="button"
							onclick={() => (selectedCategory = cat.value)}
							class="px-2 py-0.5 text-xs rounded transition-all
								   {selectedCategory === cat.value
									? 'bg-primary-500 text-white'
									: 'bg-surface-700 text-surface-400 hover:bg-surface-600 hover:text-surface-200'}"
						>
							{cat.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Template list -->
			<div class="overflow-y-auto max-h-[50vh] p-2">
				<div class="space-y-1">
					{#each filteredTemplates as template (template.id)}
						<button
							type="button"
							onclick={() => handleSelect(template)}
							class="w-full text-left p-3 rounded-lg hover:bg-surface-700/50 transition-colors group"
						>
							<div class="flex items-start gap-3">
								<span class="text-lg">{template.icon}</span>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-0.5">
										<span class="font-medium text-surface-100 group-hover:text-primary-400 transition-colors">
											{template.name}
										</span>
										<span
											class="px-1.5 py-0.5 text-xs rounded {TEMPLATE_CATEGORIES[template.category].color}"
										>
											{TEMPLATE_CATEGORIES[template.category].label}
										</span>
									</div>
									<p class="text-xs text-surface-400 line-clamp-2">{template.description}</p>
								</div>
								<svg
									class="w-4 h-4 text-surface-500 group-hover:text-primary-400 transition-colors shrink-0 mt-1"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- Footer hint -->
			<div class="p-2 border-t border-surface-700 text-xs text-surface-500 text-center">
				Click a template to use it
			</div>
		</div>
	{/if}
</div>
