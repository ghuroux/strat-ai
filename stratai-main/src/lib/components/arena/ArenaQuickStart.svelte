<script lang="ts">
	import { Zap, ChevronDown, ChevronRight, Sparkles, X } from 'lucide-svelte';
	import type { TemplateCategory } from '$lib/config/battle-templates';
	import { BATTLE_TEMPLATES, TEMPLATE_CATEGORIES, type BattleTemplate } from '$lib/config/battle-templates';

	interface Props {
		selectedTemplate?: BattleTemplate | null;
		onSelectTemplate: (template: BattleTemplate) => void;
		onReset: () => void;
	}

	let { selectedTemplate = null, onSelectTemplate, onReset }: Props = $props();

	let isOpen = $state(false);
	let filterCategory = $state<TemplateCategory | 'all'>('all');

	const categories: Array<{ value: TemplateCategory | 'all'; label: string }> = [
		{ value: 'all', label: 'All' },
		{ value: 'coding', label: 'Coding' },
		{ value: 'creative', label: 'Creative' },
		{ value: 'analysis', label: 'Analysis' },
		{ value: 'reasoning', label: 'Reasoning' },
		{ value: 'research', label: 'Research' },
		{ value: 'general', label: 'General' }
	];

	let filteredTemplates = $derived(
		filterCategory === 'all'
			? BATTLE_TEMPLATES
			: BATTLE_TEMPLATES.filter((t) => t.category === filterCategory)
	);

	function handleSelect(template: BattleTemplate) {
		onSelectTemplate(template);
		isOpen = false;
	}

	function handleReset() {
		onReset();
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.quick-start-dropdown')) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="quick-start-section p-6 rounded-2xl bg-gradient-to-br from-primary-500/10 to-accent-500/5 border border-primary-500/20">
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
				<Sparkles class="w-5 h-5 text-white" />
			</div>
			<div>
				<h2 class="text-lg font-semibold text-surface-100">Quick Start</h2>
				<p class="text-sm text-surface-400">
					{#if selectedTemplate}
						Template loaded - <button type="button" class="text-primary-400 hover:text-primary-300 underline" onclick={handleReset}>reset to customize</button>
					{:else}
						Choose a template to begin with a sample prompt
					{/if}
				</p>
			</div>
		</div>

		<!-- Template Dropdown / Selected State -->
		<div class="quick-start-dropdown relative flex items-center gap-2">
			{#if selectedTemplate}
				<!-- Selected template badge with reset -->
				<div class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/20 border border-primary-500/50">
					<span class="text-lg">{selectedTemplate.icon}</span>
					<span class="text-sm font-medium text-primary-300">{selectedTemplate.name}</span>
					<span class="px-1.5 py-0.5 text-xs rounded {TEMPLATE_CATEGORIES[selectedTemplate.category].color}">
						{TEMPLATE_CATEGORIES[selectedTemplate.category].label}
					</span>
				</div>
				<button
					type="button"
					onclick={handleReset}
					class="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium
						   bg-surface-800 border border-surface-600 text-surface-300
						   hover:bg-surface-700 hover:border-surface-500 hover:text-surface-100 transition-all"
					title="Reset to custom mode"
				>
					<X class="w-4 h-4" />
					<span>Reset</span>
				</button>
			{:else}
				<!-- Template selector button -->
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						isOpen = !isOpen;
					}}
					class="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium
						   {isOpen
							? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
							: 'bg-surface-800 border-surface-600 text-surface-200 hover:bg-surface-700 hover:border-surface-500'}"
				>
					<Zap class="w-4 h-4" />
					<span>Choose a template</span>
					<ChevronDown class="w-4 h-4 transition-transform {isOpen ? 'rotate-180' : ''}" />
				</button>
			{/if}

			<!-- Dropdown panel -->
			{#if isOpen}
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<div
					class="absolute top-full right-0 sm:left-0 mt-2 w-80 sm:w-96 max-h-[60vh] overflow-hidden
						   bg-surface-800 border border-surface-700 rounded-xl shadow-2xl z-50"
					onclick={(e) => e.stopPropagation()}
					role="presentation"
				>
					<!-- Header with category tabs -->
					<div class="p-3 border-b border-surface-700">
						<div class="flex flex-wrap gap-1">
							{#each categories as cat}
								<button
									type="button"
									onclick={() => (filterCategory = cat.value)}
									class="px-2.5 py-1 text-xs rounded-lg transition-all
										   {filterCategory === cat.value
											? 'bg-primary-500 text-white'
											: 'bg-surface-700 text-surface-400 hover:bg-surface-600 hover:text-surface-200'}"
								>
									{cat.label}
								</button>
							{/each}
						</div>
					</div>

					<!-- Template list -->
					<div class="overflow-y-auto max-h-[45vh] p-2">
						<div class="space-y-1">
							{#each filteredTemplates as template (template.id)}
								<button
									type="button"
									onclick={() => handleSelect(template)}
									class="w-full text-left p-3 rounded-lg hover:bg-surface-700/50 transition-colors group"
								>
									<div class="flex items-start gap-3">
										<span class="text-lg shrink-0">{template.icon}</span>
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
										<ChevronRight class="w-4 h-4 text-surface-500 group-hover:text-primary-400 transition-colors shrink-0 mt-1" />
									</div>
								</button>
							{/each}
						</div>
					</div>

					<!-- Footer hint -->
					<div class="p-2 border-t border-surface-700 text-xs text-surface-500 text-center">
						Select a template to pre-fill your prompt
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
