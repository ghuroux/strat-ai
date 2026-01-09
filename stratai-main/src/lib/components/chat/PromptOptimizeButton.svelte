<script lang="ts">
	import { Sparkles, Loader, Undo2 } from 'lucide-svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface Props {
		inputText: string;
		disabled?: boolean;
		onoptimize: (optimizedText: string) => void;
		onundo: (originalText: string) => void;
	}

	let { inputText, disabled = false, onoptimize, onundo }: Props = $props();

	// State
	let isOptimizing = $state(false);
	let originalText = $state<string | null>(null);
	let showUndo = $state(false);
	let cooldownActive = $state(false);

	// Timers
	let undoTimeout: ReturnType<typeof setTimeout> | null = null;
	let cooldownTimeout: ReturnType<typeof setTimeout> | null = null;

	// Clear undo state when user types new content
	$effect(() => {
		if (originalText && inputText !== originalText && inputText !== lastOptimized) {
			// User has modified the text, clear undo
			clearUndoState();
		}
	});

	let lastOptimized = $state<string | null>(null);

	// Derived states
	let effectiveDisabled = $derived(disabled || isOptimizing || cooldownActive || !inputText.trim());
	let canOptimize = $derived(inputText.trim().length >= 5);

	let title = $derived(
		isOptimizing ? 'Optimizing prompt...' :
		showUndo ? 'Undo optimization' :
		cooldownActive ? 'Please wait...' :
		!inputText.trim() ? 'Enter a prompt first' :
		!canOptimize ? 'Prompt too short' :
		'Optimize prompt'
	);

	function clearUndoState() {
		showUndo = false;
		originalText = null;
		lastOptimized = null;
		if (undoTimeout) {
			clearTimeout(undoTimeout);
			undoTimeout = null;
		}
	}

	async function handleClick() {
		// If in undo state, perform undo
		if (showUndo && originalText) {
			handleUndo();
			return;
		}

		// Otherwise, optimize
		await handleOptimize();
	}

	async function handleOptimize() {
		if (effectiveDisabled || !canOptimize) {
			if (!canOptimize && inputText.trim()) {
				toastStore.info('Prompt is too short to optimize');
			}
			return;
		}

		// Store original text for undo
		const currentOriginal = inputText;
		isOptimizing = true;

		try {
			const response = await fetch('/api/prompt-optimize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: inputText })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error?.message || 'Optimization failed');
			}

			const result = await response.json();

			if (result.unchanged) {
				toastStore.info(result.reason || 'Your prompt is already well-written!');
				return;
			}

			// Success - store original and emit optimized
			originalText = currentOriginal;
			lastOptimized = result.optimizedPrompt;
			onoptimize(result.optimizedPrompt);

			// Show undo for 10 seconds
			showUndo = true;
			undoTimeout = setTimeout(() => {
				clearUndoState();
			}, 10000);

		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to optimize prompt';
			toastStore.error(message);
		} finally {
			isOptimizing = false;

			// Start cooldown
			cooldownActive = true;
			cooldownTimeout = setTimeout(() => {
				cooldownActive = false;
			}, 3000);
		}
	}

	function handleUndo() {
		if (originalText) {
			onundo(originalText);
			clearUndoState();
			toastStore.info('Restored original prompt');
		}
	}
</script>

<button
	type="button"
	onclick={handleClick}
	disabled={effectiveDisabled && !showUndo}
	class="flex items-center justify-center w-10 h-10 rounded-xl
		   transition-all duration-200
		   {isOptimizing
			? 'bg-purple-600/20 text-purple-400 ring-2 ring-purple-500/50'
			: showUndo
				? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
				: effectiveDisabled
					? 'text-surface-400 opacity-50 cursor-not-allowed'
					: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
	aria-label={title}
	aria-busy={isOptimizing}
>
	{#if isOptimizing}
		<Loader class="w-5 h-5 animate-spin" />
	{:else if showUndo}
		<Undo2 class="w-5 h-5" />
	{:else}
		<Sparkles class="w-5 h-5" />
	{/if}
</button>

<!-- Tooltip -->
<div class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-800 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none {isOptimizing || showUndo ? 'text-purple-400' : 'text-surface-300'}">
	{title}
</div>
