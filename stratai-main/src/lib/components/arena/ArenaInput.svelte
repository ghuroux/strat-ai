<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { arenaStore } from '$lib/stores/arena.svelte';
	import ArenaSettings from './ArenaSettings.svelte';
	import ArenaTemplates from './ArenaTemplates.svelte';

	interface Props {
		onStartBattle: (prompt: string, reasoningEffort: 'low' | 'medium' | 'high', blindMode: boolean) => void;
		disabled?: boolean;
		isStreaming?: boolean;
	}

	let { onStartBattle, disabled = false, isStreaming = false }: Props = $props();

	let prompt = $state('');
	let textareaRef: HTMLTextAreaElement | undefined = $state();
	let reasoningEffort = $state<'low' | 'medium' | 'high'>('medium');
	let blindMode = $state(false);

	let selectedCount = $derived(arenaStore.selectedModels.length);
	let canStart = $derived(selectedCount >= 2 && prompt.trim().length > 0 && !disabled && !isStreaming);

	// Auto-resize textarea
	function handleInput() {
		if (textareaRef) {
			textareaRef.style.height = 'auto';
			textareaRef.style.height = Math.min(textareaRef.scrollHeight, 200) + 'px';
		}
	}

	// Handle form submission
	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!canStart) return;

		onStartBattle(prompt.trim(), reasoningEffort, blindMode);
		prompt = '';

		// Reset textarea height
		if (textareaRef) {
			textareaRef.style.height = 'auto';
		}
	}

	// Handle keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && settingsStore.sendOnEnter) {
			e.preventDefault();
			if (canStart) {
				onStartBattle(prompt.trim(), reasoningEffort, blindMode);
				prompt = '';
				if (textareaRef) {
					textareaRef.style.height = 'auto';
				}
			}
		}
	}

	// Handle template selection
	function handleTemplateSelect(templatePrompt: string) {
		prompt = templatePrompt;
		// Trigger auto-resize
		setTimeout(() => {
			if (textareaRef) {
				textareaRef.style.height = 'auto';
				textareaRef.style.height = Math.min(textareaRef.scrollHeight, 200) + 'px';
			}
		}, 0);
	}
</script>

<div class="arena-input-container p-4 border-t border-surface-800 bg-surface-900/80 backdrop-blur-sm">
	<div class="max-w-5xl mx-auto">
		<form onsubmit={handleSubmit} class="relative">
			<!-- Textarea -->
			<div class="relative">
				<textarea
					bind:this={textareaRef}
					bind:value={prompt}
					oninput={handleInput}
					onkeydown={handleKeydown}
					placeholder={selectedCount < 2
						? 'Select at least 2 models above to start a battle...'
						: 'Enter your prompt to battle the models...'}
					disabled={disabled || isStreaming}
					rows="1"
					class="w-full px-4 py-3 pr-32 bg-surface-800 border border-surface-700 rounded-xl
						   text-surface-100 placeholder-surface-500 resize-none
						   focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
						   disabled:opacity-50 disabled:cursor-not-allowed
						   transition-all duration-200"
					style="min-height: 48px; max-height: 200px;"
				></textarea>

				<!-- Battle button -->
				<button
					type="submit"
					disabled={!canStart}
					class="absolute right-2 bottom-2 px-4 py-1.5 rounded-lg font-medium text-sm
						   transition-all duration-200 flex items-center gap-2
						   {canStart
							? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:shadow-glow'
							: 'bg-surface-700 text-surface-500 cursor-not-allowed'}"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
					Battle
				</button>
			</div>

			<!-- Bottom row with settings and info -->
			<div class="flex items-center justify-between mt-3 text-sm gap-4">
				<div class="flex items-center gap-3 flex-wrap">
					<!-- Arena Settings (thinking, search, reasoning effort, blind mode) -->
					<ArenaSettings
						{reasoningEffort}
						{blindMode}
						onReasoningEffortChange={(effort) => (reasoningEffort = effort)}
						onBlindModeChange={(enabled) => (blindMode = enabled)}
					/>

					<!-- Divider -->
					<div class="h-6 w-px bg-surface-700 hidden sm:block"></div>

					<!-- Templates -->
					<ArenaTemplates onSelectTemplate={handleTemplateSelect} />
				</div>

				<div class="flex items-center gap-4 text-surface-500 shrink-0">
					<!-- Model count -->
					<span class="flex items-center gap-1.5">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
						</svg>
						{selectedCount} models
					</span>

					<!-- Blind mode indicator -->
					{#if blindMode}
						<span class="flex items-center gap-1 text-accent-400">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
							</svg>
							<span class="text-xs">Blind</span>
						</span>
					{/if}

					<!-- Keyboard hint -->
					<span class="hidden md:inline text-xs">
						{settingsStore.sendOnEnter ? 'Enter' : 'Ctrl+Enter'} to battle
					</span>
				</div>
			</div>
		</form>
	</div>
</div>
