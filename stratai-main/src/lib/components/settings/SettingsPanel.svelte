<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import ThemeToggle from './ThemeToggle.svelte';
	import DisplaySettings from './DisplaySettings.svelte';
	import LLMSettings from './LLMSettings.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
		transition:fade={{ duration: 200 }}
		onclick={handleBackdropClick}
	>
		<!-- Panel -->
		<aside
			class="absolute right-0 top-0 h-full w-full max-w-sm bg-surface-900 border-l border-surface-800 shadow-2xl flex flex-col"
			transition:fly={{ x: 400, duration: 300, opacity: 1 }}
		>
			<!-- Header -->
			<header class="flex items-center justify-between px-6 py-4 border-b border-surface-800">
				<h2 class="text-lg font-semibold text-surface-100">Settings</h2>
				<button
					type="button"
					onclick={onclose}
					class="btn-icon"
					aria-label="Close settings"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</header>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-6 space-y-8">
				<!-- Appearance Section -->
				<section>
					<h3 class="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">
						Appearance
					</h3>
					<div class="space-y-4">
						<ThemeToggle />
						<DisplaySettings />
					</div>
				</section>

				<!-- AI Behavior Section -->
				<section>
					<h3 class="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">
						AI Behavior
					</h3>
					<LLMSettings />
				</section>
			</div>

			<!-- Footer -->
			<footer class="px-6 py-4 border-t border-surface-800">
				<p class="text-xs text-surface-500 text-center">
					StratAI v0.1.0
				</p>
			</footer>
		</aside>
	</div>
{/if}
