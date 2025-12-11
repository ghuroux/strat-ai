<script lang="ts">
	import { fade } from 'svelte/transition';

	interface Props {
		hasModel: boolean;
		onNewChat: () => void;
	}

	let { hasModel, onNewChat }: Props = $props();
</script>

<div class="h-full flex items-center justify-center min-h-[60vh]" in:fade={{ duration: 300 }}>
	<div class="text-center max-w-md">
		<!-- Logo/Icon -->
		<div
			class="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center animate-glow"
			style="background: var(--gradient-primary);"
		>
			<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
				/>
			</svg>
		</div>

		<!-- Welcome Text -->
		<h2 class="text-2xl font-bold text-gradient mb-3">Welcome to StratHost Chat</h2>
		<p class="text-surface-400 mb-6">
			Your AI-powered assistant for intelligent conversations.
			Select a model and start chatting.
		</p>

		<!-- Quick Actions -->
		<div class="flex flex-col gap-3">
			{#if !hasModel}
				<div class="flex items-center justify-center gap-2 text-sm text-surface-500">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 11l5-5m0 0l5 5m-5-5v12"
						/>
					</svg>
					<span>Select a model above to get started</span>
				</div>
			{:else}
				<button type="button" onclick={onNewChat} class="btn-primary mx-auto">
					Start New Chat
				</button>
			{/if}
		</div>

		<!-- Feature hints -->
		<div class="mt-8 grid grid-cols-2 gap-4 text-left">
			<div class="p-4 rounded-xl bg-surface-900 border border-surface-800">
				<svg
					class="w-6 h-6 text-primary-500 mb-2"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
				<h3 class="font-medium text-surface-200 mb-1">Fast & Responsive</h3>
				<p class="text-xs text-surface-500">Real-time streaming responses</p>
			</div>
			<div class="p-4 rounded-xl bg-surface-900 border border-surface-800">
				<svg
					class="w-6 h-6 text-accent-500 mb-2"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
					/>
				</svg>
				<h3 class="font-medium text-surface-200 mb-1">Secure & Private</h3>
				<p class="text-xs text-surface-500">Your data stays safe</p>
			</div>
		</div>
	</div>
</div>
