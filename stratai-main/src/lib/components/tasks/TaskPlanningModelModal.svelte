<script lang="ts">
	/**
	 * TaskPlanningModelModal - Model selection for "Help me plan this" feature
	 *
	 * Shows models grouped by task planning tier (recommended/capable/experimental).
	 * Remembers user's last selection and provides option to skip this modal.
	 */
	import { fade, fly } from 'svelte/transition';
	import { browser } from '$app/environment';
	import {
		getModelsGroupedByTaskPlanningTier,
		getModelCapabilities,
		getProviderDisplayName,
		type ModelCapabilities,
		type TaskPlanningCapabilities
	} from '$lib/config/model-capabilities';

	interface Props {
		open: boolean;
		taskTitle: string;
		onSelect: (modelId: string) => void;
		onCancel: () => void;
	}

	let { open, taskTitle, onSelect, onCancel }: Props = $props();

	// LocalStorage keys
	const STORAGE_KEY_LAST_MODEL = 'stratai-task-planning-model';
	const STORAGE_KEY_SKIP_MODAL = 'stratai-task-planning-skip-modal';

	// Get models grouped by tier
	const modelGroups = getModelsGroupedByTaskPlanningTier();

	// Selected model state - default to first recommended or load from storage
	let selectedModelId = $state<string>('');
	let rememberChoice = $state(false);

	// Initialize from localStorage
	$effect(() => {
		if (browser && open) {
			const savedModel = localStorage.getItem(STORAGE_KEY_LAST_MODEL);
			if (savedModel && getModelCapabilities(savedModel)) {
				selectedModelId = savedModel;
			} else if (modelGroups.recommended.length > 0) {
				selectedModelId = modelGroups.recommended[0].id;
			}
		}
	});

	// Handle keyboard
	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			onCancel();
		} else if (e.key === 'Enter' && selectedModelId) {
			handleConfirm();
		}
	}

	// Handle confirm
	function handleConfirm() {
		if (!selectedModelId) return;

		// Save preference if remember is checked
		if (browser) {
			localStorage.setItem(STORAGE_KEY_LAST_MODEL, selectedModelId);
			if (rememberChoice) {
				localStorage.setItem(STORAGE_KEY_SKIP_MODAL, 'true');
			}
		}

		onSelect(selectedModelId);
	}

	// Get tier badge styling
	function getTierStyle(tier: string): string {
		switch (tier) {
			case 'recommended':
				return 'bg-green-500/20 text-green-400 border-green-500/30';
			case 'capable':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			case 'experimental':
				return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
			default:
				return 'bg-surface-700 text-surface-400';
		}
	}

	// Get provider icon color
	function getProviderColor(provider: string): string {
		switch (provider) {
			case 'anthropic':
				return '#d97706'; // Amber
			case 'openai':
				return '#10b981'; // Green
			case 'google':
				return '#3b82f6'; // Blue
			case 'meta':
				return '#8b5cf6'; // Purple
			default:
				return '#6b7280'; // Gray
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
		transition:fade={{ duration: 150 }}
		onclick={onCancel}
		role="presentation"
	></div>

	<!-- Modal -->
	<div
		class="fixed inset-0 flex items-center justify-center z-50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div
			class="modal-content w-full max-w-lg bg-surface-900 border border-surface-700 rounded-xl shadow-2xl"
			transition:fly={{ y: 20, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-surface-700">
				<h2 id="modal-title" class="text-lg font-semibold text-surface-100">
					Choose a Model for Task Planning
				</h2>
				<p class="text-sm text-surface-400 mt-1 truncate" title={taskTitle}>
					Planning: {taskTitle}
				</p>
			</div>

			<!-- Content -->
			<div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
				<!-- Recommended Section -->
				{#if modelGroups.recommended.length > 0}
					<div class="mb-4">
						<div class="flex items-center gap-2 mb-2">
							<span class="text-xs font-semibold uppercase tracking-wider text-green-400">
								Recommended
							</span>
							<span class="text-[10px] text-surface-500">Best results</span>
						</div>
						<div class="space-y-2">
							{#each modelGroups.recommended as { id, capabilities, taskPlanning }}
								<button
									type="button"
									class="model-option"
									class:selected={selectedModelId === id}
									onclick={() => selectedModelId = id}
								>
									<div class="flex items-start gap-3">
										<div
											class="w-1.5 h-full rounded-full self-stretch min-h-[2.5rem]"
											style="background: {getProviderColor(capabilities.provider)};"
										></div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<span class="font-medium text-surface-100">
													{capabilities.displayName}
												</span>
												<span class="text-[10px] text-surface-500">
													{getProviderDisplayName(capabilities.provider)}
												</span>
											</div>
											{#if taskPlanning.planningNote}
												<p class="text-xs text-surface-400 mt-0.5">
													{taskPlanning.planningNote}
												</p>
											{/if}
										</div>
										{#if selectedModelId === id}
											<svg class="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
												<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
											</svg>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Capable Section -->
				{#if modelGroups.capable.length > 0}
					<div class="mb-4">
						<div class="flex items-center gap-2 mb-2">
							<span class="text-xs font-semibold uppercase tracking-wider text-blue-400">
								Capable
							</span>
							<span class="text-[10px] text-surface-500">Works with guidance</span>
						</div>
						<div class="space-y-2">
							{#each modelGroups.capable as { id, capabilities, taskPlanning }}
								<button
									type="button"
									class="model-option"
									class:selected={selectedModelId === id}
									onclick={() => selectedModelId = id}
								>
									<div class="flex items-start gap-3">
										<div
											class="w-1.5 h-full rounded-full self-stretch min-h-[2.5rem]"
											style="background: {getProviderColor(capabilities.provider)};"
										></div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<span class="font-medium text-surface-100">
													{capabilities.displayName}
												</span>
												<span class="text-[10px] text-surface-500">
													{getProviderDisplayName(capabilities.provider)}
												</span>
											</div>
											{#if taskPlanning.planningNote}
												<p class="text-xs text-surface-400 mt-0.5">
													{taskPlanning.planningNote}
												</p>
											{/if}
											{#if taskPlanning.warnings?.length}
												<p class="text-[10px] text-amber-400 mt-0.5">
													{taskPlanning.warnings[0]}
												</p>
											{/if}
										</div>
										{#if selectedModelId === id}
											<svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
												<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
											</svg>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Experimental Section (collapsed by default) -->
				{#if modelGroups.experimental.length > 0}
					<details class="group">
						<summary class="flex items-center gap-2 mb-2 cursor-pointer list-none">
							<svg
								class="w-4 h-4 text-surface-500 transition-transform group-open:rotate-90"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
							<span class="text-xs font-semibold uppercase tracking-wider text-amber-400">
								Experimental
							</span>
							<span class="text-[10px] text-surface-500">
								{modelGroups.experimental.length} models - results may vary
							</span>
						</summary>
						<div class="space-y-2 mt-2 pl-6">
							{#each modelGroups.experimental as { id, capabilities, taskPlanning }}
								<button
									type="button"
									class="model-option experimental"
									class:selected={selectedModelId === id}
									onclick={() => selectedModelId = id}
								>
									<div class="flex items-start gap-3">
										<div
											class="w-1.5 h-full rounded-full self-stretch min-h-[2rem]"
											style="background: {getProviderColor(capabilities.provider)};"
										></div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<span class="font-medium text-surface-200">
													{capabilities.displayName}
												</span>
												<span class="text-[10px] text-surface-500">
													{getProviderDisplayName(capabilities.provider)}
												</span>
											</div>
											<p class="text-[10px] text-amber-400/80 mt-0.5">
												Not yet tested for task planning
											</p>
										</div>
										{#if selectedModelId === id}
											<svg class="w-5 h-5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
												<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
											</svg>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</details>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 border-t border-surface-700 space-y-3">
				<!-- Remember choice checkbox -->
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={rememberChoice}
						class="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
					/>
					<span class="text-xs text-surface-400">
						Remember my choice and skip this dialog
					</span>
				</label>

				<!-- Action buttons -->
				<div class="flex justify-end gap-3">
					<button
						type="button"
						class="px-4 py-2 text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
						onclick={onCancel}
					>
						Cancel
					</button>
					<button
						type="button"
						class="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={!selectedModelId}
						onclick={handleConfirm}
					>
						Start Planning
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-content {
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(255, 255, 255, 0.05);
	}

	.model-option {
		width: 100%;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.model-option:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.model-option.selected {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.3);
	}

	.model-option.experimental {
		opacity: 0.8;
	}

	.model-option.experimental:hover {
		opacity: 1;
	}

	.model-option.experimental.selected {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.3);
	}

	/* Custom scrollbar for modal */
	.modal-content ::-webkit-scrollbar {
		width: 6px;
	}

	.modal-content ::-webkit-scrollbar-track {
		background: transparent;
	}

	.modal-content ::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.modal-content ::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
