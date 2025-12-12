<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import ModelSelector from '../ModelSelector.svelte';

	interface Props {
		selectedModel: string;
		onModelChange?: (model: string) => void;
		onSettingsClick?: () => void;
	}

	let { selectedModel = $bindable(), onModelChange, onSettingsClick }: Props = $props();

	function toggleSidebar() {
		settingsStore.toggleSidebar();
	}

	function handleModelChange(model: string) {
		selectedModel = model;
		settingsStore.setSelectedModel(model);
		onModelChange?.(model);
	}
</script>

<header class="h-16 px-4 flex items-center border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl overflow-visible relative z-40">
	<!-- Left: Sidebar Toggle & Logo -->
	<div class="flex items-center gap-3 min-w-0">
		<!-- Sidebar Toggle -->
		<button
			type="button"
			class="btn-icon lg:hidden"
			onclick={toggleSidebar}
			aria-label="Toggle sidebar"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>

		<!-- Desktop Sidebar Toggle -->
		<button
			type="button"
			class="btn-icon hidden lg:flex"
			onclick={toggleSidebar}
			aria-label="Toggle sidebar"
		>
			{#if settingsStore.sidebarOpen}
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
				</svg>
			{:else}
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
				</svg>
			{/if}
		</button>

		<!-- Logo -->
		<div class="flex items-center gap-2">
			<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: var(--gradient-primary);">
				<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
					/>
				</svg>
			</div>
			<span class="font-bold text-lg text-gradient hidden sm:inline">StratHost Chat</span>
		</div>
	</div>

	<!-- Center: Model Selector (only show when no messages in active conversation) -->
	{#if !chatStore.messages || chatStore.messages.length === 0}
		<div class="flex-1 flex justify-center">
			<div class="w-full max-w-xs">
				<ModelSelector bind:selectedModel disabled={chatStore.isStreaming} onchange={handleModelChange} />
			</div>
		</div>
	{:else}
		<div class="flex-1"></div>
	{/if}

	<!-- Right: Actions -->
	<div class="flex items-center gap-2">
		<!-- Current conversation model badge (show when chat has messages) -->
		{#if chatStore.messages && chatStore.messages.length > 0 && chatStore.activeConversation}
			<span class="flex items-center gap-1.5 px-3 py-1.5 bg-surface-800 rounded-lg text-xs text-surface-400">
				<span class="w-2 h-2 rounded-full bg-accent-500"></span>
				{chatStore.activeConversation.model.split('/').pop()}
			</span>
		{/if}

		<!-- Settings -->
		<button
			type="button"
			class="btn-icon"
			onclick={onSettingsClick}
			aria-label="Open settings"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		</button>

		<!-- Logout -->
		<form action="/logout" method="GET">
			<button
				type="submit"
				class="btn-ghost text-sm flex items-center gap-2"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
				</svg>
				<span class="hidden sm:inline">Logout</span>
			</button>
		</form>
	</div>
</header>
