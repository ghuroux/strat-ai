<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { easterEggsStore } from '$lib/stores/easter-eggs.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	let { open, onClose }: Props = $props();

	// Show discovery toast on first open
	$effect(() => {
		if (open) {
			const isFirstTime = easterEggsStore.discover('keyboard-shortcuts');
			if (isFirstTime) {
				toastStore.discovery('You found the secret shortcuts guide!', 4000);
			}
		}
	});

	// Close on Escape
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	const shortcuts = [
		{
			category: 'Navigation',
			items: [
				{ keys: ['⌘', 'K'], description: 'Open command palette' },
				{ keys: ['⌘', '⇧', 'H'], description: 'Go to main chat' },
				{ keys: ['⌘', '⇧', 'A'], description: 'Open Model Arena' },
				{ keys: ['Esc'], description: 'Close modals & panels' }
			]
		},
		{
			category: 'Chat',
			items: [
				{ keys: ['⌘', 'N'], description: 'New conversation' },
				{ keys: ['Enter'], description: 'Send message' },
				{ keys: ['⇧', 'Enter'], description: 'New line in message' },
				{ keys: ['⌘', '\\'], description: 'Toggle sidebar' }
			]
		},
		{
			category: 'Editor',
			items: [
				{ keys: ['⌘', 'S'], description: 'Save page' },
				{ keys: ['⌘', 'B'], description: 'Bold' },
				{ keys: ['⌘', 'I'], description: 'Italic' },
				{ keys: ['⌘', 'U'], description: 'Underline' },
				{ keys: ['⌘', 'K'], description: 'Insert link' },
				{ keys: ['⌘', 'Z'], description: 'Undo' },
				{ keys: ['⌘', '⇧', 'Z'], description: 'Redo' },
				{ keys: ['⌘', '⌥', '1'], description: 'Heading 1' },
				{ keys: ['⌘', '⌥', '2'], description: 'Heading 2' },
				{ keys: ['⌘', '⌥', '3'], description: 'Heading 3' }
			]
		},
		{
			category: 'Tasks Dashboard',
			items: [
				{ keys: ['J'], description: 'Next item' },
				{ keys: ['K'], description: 'Previous item' },
				{ keys: ['Enter'], description: 'Open focused item' },
				{ keys: ['X'], description: 'Complete focused task' },
				{ keys: ['N'], description: 'New task' },
				{ keys: ['/'], description: 'Focus filters' },
				{ keys: ['Esc'], description: 'Clear focus' }
			]
		},
		{
			category: 'Secrets',
			items: [
				{ keys: ['↑↑↓↓←→←→', 'B', 'A'], description: '???' },
				{ keys: ['⌘', 'K'], description: 'Type "hacker" for a surprise' },
				{ keys: ['7x'], description: 'Click the logo rapidly' }
			]
		}
	];
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
		transition:fade={{ duration: 150 }}
		onclick={onClose}
		role="button"
		tabindex="-1"
		aria-label="Close shortcuts"
	></div>

	<!-- Modal -->
	<div
		class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
			   w-full max-w-lg max-h-[80vh] overflow-hidden
			   bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl"
		transition:fly={{ y: 20, duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="shortcuts-title"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-4 border-b border-surface-700">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
					</svg>
				</div>
				<div>
					<h2 id="shortcuts-title" class="text-lg font-semibold text-surface-100">Keyboard Shortcuts</h2>
					<p class="text-xs text-surface-500">Navigate like a pro</p>
				</div>
			</div>
			<button
				type="button"
				class="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
				onclick={onClose}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
			{#each shortcuts as section}
				<div>
					<h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
						{section.category}
					</h3>
					<div class="space-y-2">
						{#each section.items as shortcut}
							<div class="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-800/50 hover:bg-surface-800 transition-colors">
								<span class="text-sm text-surface-300">{shortcut.description}</span>
								<div class="flex items-center gap-1">
									{#each shortcut.keys as key}
										<kbd class="px-2 py-1 text-xs font-mono rounded bg-surface-700 text-surface-200 border border-surface-600 shadow-sm min-w-[1.5rem] text-center">
											{key}
										</kbd>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<!-- Footer -->
		<div class="px-6 py-3 border-t border-surface-700 bg-surface-800/50">
			<p class="text-xs text-surface-500 text-center">
				Press <kbd class="px-1.5 py-0.5 text-xs font-mono rounded bg-surface-700 text-surface-300">?</kbd> anytime to show this guide
			</p>
		</div>
	</div>
{/if}
