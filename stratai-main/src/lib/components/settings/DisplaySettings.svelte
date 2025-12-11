<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';

	let showTimestamps = $derived(settingsStore.showTimestamps);

	function toggleTimestamps() {
		settingsStore.setShowTimestamps(!showTimestamps);
	}
</script>

<div class="space-y-4">
	<!-- Timestamp Toggle -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="p-2 rounded-lg bg-surface-800">
				<svg class="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<div>
				<span class="block text-sm font-medium text-surface-200">Show Timestamps</span>
				<span class="block text-xs text-surface-500">Display time on messages</span>
			</div>
		</div>
		<button
			type="button"
			role="switch"
			aria-checked={showTimestamps}
			onclick={toggleTimestamps}
			class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
				   transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-900
				   {showTimestamps ? 'bg-primary-500' : 'bg-surface-700'}"
		>
			<span
				class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
					   transition duration-200 ease-in-out
					   {showTimestamps ? 'translate-x-5' : 'translate-x-0'}"
			></span>
		</button>
	</div>
</div>
