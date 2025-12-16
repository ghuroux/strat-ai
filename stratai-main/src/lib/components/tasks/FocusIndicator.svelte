<script lang="ts">
	import { fly } from 'svelte/transition';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import type { Task } from '$lib/types/tasks';

	interface Props {
		onCompleteTask?: (taskId: string, notes?: string) => void;
		onSwitchTask?: () => void;
		onExitFocus?: () => void;
	}

	let { onCompleteTask, onSwitchTask, onExitFocus }: Props = $props();

	// State
	let isOpen = $state(false);
	let showNotesInput = $state(false);
	let completionNotes = $state('');
	let dropdownRef: HTMLDivElement | undefined = $state();

	// Derived
	let focusedTask = $derived(taskStore.focusedTask);

	// Close dropdown on outside click
	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			isOpen = false;
			showNotesInput = false;
		}
	}

	// Close on escape
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (showNotesInput) {
				showNotesInput = false;
			} else if (isOpen) {
				isOpen = false;
			}
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleKeydown);
		}
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	function handleMarkDone() {
		if (!focusedTask) return;
		showNotesInput = true;
	}

	function handleConfirmComplete() {
		if (!focusedTask) return;
		onCompleteTask?.(focusedTask.id, completionNotes.trim() || undefined);
		completionNotes = '';
		showNotesInput = false;
		isOpen = false;
	}

	function handleQuickComplete() {
		if (!focusedTask) return;
		onCompleteTask?.(focusedTask.id);
		isOpen = false;
	}

	function handleSwitchTask() {
		isOpen = false;
		onSwitchTask?.();
	}

	function handleExitFocus() {
		isOpen = false;
		onExitFocus?.();
	}
</script>

{#if focusedTask}
	<div class="relative" bind:this={dropdownRef}>
		<!-- Focus Badge -->
		<button
			type="button"
			class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300
				   hover:brightness-110 border"
			style="
				background: color-mix(in srgb, {focusedTask.color} 15%, transparent);
				border-color: color-mix(in srgb, {focusedTask.color} 40%, transparent);
				color: {focusedTask.color};
			"
			onclick={() => isOpen = !isOpen}
			aria-expanded={isOpen}
			aria-haspopup="true"
		>
			<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
				<circle cx="12" cy="12" r="3" />
				<path d="M12 2v4m0 12v4m10-10h-4M6 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg>
			<span class="max-w-[200px] truncate">{focusedTask.title}</span>
			<svg class="w-3 h-3 transition-transform {isOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		<!-- Dropdown -->
		{#if isOpen}
			<div
				class="absolute top-full right-0 mt-2 w-64 overflow-hidden
					   bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-50"
				transition:fly={{ y: -10, duration: 150 }}
			>
				<!-- Task Info -->
				<div class="px-4 py-3 border-b border-surface-700">
					<div class="flex items-center gap-2 mb-1">
						<div class="w-3 h-3 rounded-full" style="background-color: {focusedTask.color};"></div>
						<span class="text-sm font-medium text-surface-200 truncate">{focusedTask.title}</span>
					</div>
					{#if focusedTask.priority === 'high'}
						<span class="inline-flex items-center gap-1 text-xs text-amber-400">
							<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
								<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
							</svg>
							High priority
						</span>
					{/if}
				</div>

				<!-- Actions -->
				<div class="p-2">
					{#if showNotesInput}
						<!-- Notes Input -->
						<div class="p-2" transition:fly={{ y: -5, duration: 150 }}>
							<label class="text-xs text-surface-400 mb-1.5 block">
								Quick note (optional)
							</label>
							<textarea
								bind:value={completionNotes}
								class="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg
									   text-sm text-surface-200 placeholder-surface-500 resize-none
									   focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50"
								placeholder="What did you accomplish?"
								rows="2"
							></textarea>
							<div class="flex gap-2 mt-2">
								<button
									type="button"
									class="flex-1 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
									onclick={handleConfirmComplete}
								>
									Complete
								</button>
								<button
									type="button"
									class="px-3 py-1.5 text-sm rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-300 transition-colors"
									onclick={() => showNotesInput = false}
								>
									Cancel
								</button>
							</div>
						</div>
					{:else}
						<!-- Regular Actions -->
						<button
							type="button"
							class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
								   text-emerald-400 hover:bg-emerald-500/10 transition-colors"
							onclick={handleMarkDone}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							Mark done
						</button>

						<button
							type="button"
							class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
								   text-surface-300 hover:bg-surface-700 transition-colors"
							onclick={handleQuickComplete}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							Quick complete (no notes)
						</button>

						<div class="my-1 border-t border-surface-700"></div>

						<button
							type="button"
							class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
								   text-surface-300 hover:bg-surface-700 transition-colors"
							onclick={handleSwitchTask}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
							Switch task
						</button>

						<button
							type="button"
							class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
								   text-surface-400 hover:bg-surface-700 hover:text-surface-300 transition-colors"
							onclick={handleExitFocus}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
							Exit focus mode
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Smooth color transition for focus mode */
	button {
		transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
	}
</style>
