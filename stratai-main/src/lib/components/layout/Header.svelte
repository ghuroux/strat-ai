<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import ModelSelector from '../ModelSelector.svelte';
	import ModelBadge from '../ModelBadge.svelte';
	import PlanningTasksIndicator from '../tasks/PlanningTasksIndicator.svelte';
	import { SpaceModal } from '../spaces';
	import type { CreateSpaceInput, UpdateSpaceInput, Space } from '$lib/types/spaces';
	import { MAX_CUSTOM_SPACES } from '$lib/types/spaces';

	interface Props {
		onModelChange?: (model: string) => void;
		onSettingsClick?: () => void;
	}

	let { onModelChange, onSettingsClick }: Props = $props();

	// Read selected model directly from store (for new conversations)
	let selectedModel = $derived(settingsStore.selectedModel || '');

	// Spaces state
	let showSpaceModal = $state(false);
	let editingSpace = $state<Space | null>(null);
	let systemSpaces = $derived(spacesStore.getSystemSpaces());
	let customSpaces = $derived(spacesStore.getCustomSpaces());
	let canCreateSpace = $derived(spacesStore.getCustomSpaceCount() < MAX_CUSTOM_SPACES);

	// Get current space slug from URL
	let currentSpaceSlug = $derived.by(() => {
		const path = $page.url.pathname;
		const match = path.match(/^\/spaces\/([^/]+)/);
		return match ? match[1] : null;
	});

	// Detect if we're on the Space Dashboard (not area or task page)
	// Pattern: /spaces/[space] but NOT /spaces/[space]/[anything]
	let isSpaceDashboard = $derived.by(() => {
		const path = $page.url.pathname;
		return /^\/spaces\/[^/]+\/?$/.test(path);
	});

	// Detect if we're in the Arena
	let isArena = $derived.by(() => {
		return $page.url.pathname.startsWith('/arena');
	});

	onMount(() => {
		spacesStore.loadSpaces();
	});

	function toggleSidebar() {
		settingsStore.toggleSidebar();
	}

	function handleModelChange(model: string) {
		settingsStore.setSelectedModel(model);
		onModelChange?.(model);
	}

	function handleOpenCreateModal() {
		editingSpace = null;
		showSpaceModal = true;
	}

	function handleEditSpace(space: Space) {
		editingSpace = space;
		showSpaceModal = true;
	}

	function handleCloseModal() {
		showSpaceModal = false;
		editingSpace = null;
	}

	async function handleCreateSpace(input: CreateSpaceInput) {
		const space = await spacesStore.createSpace(input);
		if (space) {
			handleCloseModal();
		} else if (spacesStore.error) {
			throw new Error(spacesStore.error);
		}
	}

	async function handleUpdateSpace(id: string, input: UpdateSpaceInput) {
		await spacesStore.updateSpace(id, input);
		handleCloseModal();
	}

	async function handleDeleteSpace(id: string) {
		const success = await spacesStore.deleteSpace(id);
		if (success) {
			handleCloseModal();
			// If we're currently viewing the deleted space, navigate away
			const deletedSpace = customSpaces.find(s => s.id === id);
			if (deletedSpace && currentSpaceSlug === deletedSpace.slug) {
				goto('/spaces');
			}
		}
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
		<a href="/" class="flex items-center gap-2 hover:opacity-90 transition-opacity">
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
			<span class="font-bold text-lg text-gradient hidden sm:inline">StratAI</span>
		</a>

		<!-- Spaces Navigation -->
		<nav class="hidden md:flex items-center gap-1 ml-2">
			<!-- System Spaces -->
			{#each systemSpaces as space (space.id)}
				<a
					href="/spaces/{space.slug}"
					class="space-nav-item"
					class:active={currentSpaceSlug === space.slug}
					style="--space-color: {space.color}"
				>
					{space.name}
				</a>
			{/each}

			<!-- Separator (if there are custom spaces or can create) -->
			{#if customSpaces.length > 0 || canCreateSpace}
				<span class="space-nav-separator"></span>
			{/if}

			<!-- Custom Spaces (with edit on double-click) -->
			{#each customSpaces as space (space.id)}
				<a
					href="/spaces/{space.slug}"
					class="space-nav-item group"
					class:active={currentSpaceSlug === space.slug}
					style="--space-color: {space.color || '#6b7280'}"
					ondblclick={(e) => { e.preventDefault(); handleEditSpace(space); }}
					title="Double-click to edit"
				>
					{space.name}
					<button
						type="button"
						class="space-nav-edit"
						onclick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditSpace(space); }}
						title="Edit space"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
						</svg>
					</button>
				</a>
			{/each}

			<!-- Add Space Button -->
			{#if canCreateSpace}
				<button
					type="button"
					class="space-nav-add"
					onclick={handleOpenCreateModal}
					title="Create custom space"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				</button>
			{/if}

			<!-- All Spaces Link -->
			<a
				href="/spaces"
				class="space-nav-all"
				title="View all spaces"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
				</svg>
			</a>
		</nav>

		<!-- Mobile Spaces Link -->
		<a
			href="/spaces"
			class="flex md:hidden items-center gap-1.5 px-3 py-1.5 ml-2 rounded-lg text-sm font-medium
				   bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100
				   border border-surface-700 hover:border-surface-600 transition-all"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
			</svg>
			<span class="hidden sm:inline">Spaces</span>
		</a>

		<!-- Arena Link -->
		<a
			href="/arena"
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
				   bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100
				   border border-surface-700 hover:border-surface-600 transition-all"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
			</svg>
			<span class="hidden sm:inline">Arena</span>
		</a>
	</div>

	<!-- Center: Model Selector (hide on Space Dashboard and Arena, show when no messages elsewhere) -->
	{#if isSpaceDashboard || isArena}
		<!-- No model selector on Space Dashboard or Arena (Arena has its own) -->
		<div class="flex-1"></div>
	{:else if !chatStore.messages || chatStore.messages.length === 0}
		<div class="flex-1 flex justify-center">
			<div class="w-full max-w-xs">
				<ModelSelector {selectedModel} disabled={chatStore.isStreaming} onchange={handleModelChange} />
			</div>
		</div>
	{:else}
		<div class="flex-1"></div>
	{/if}

	<!-- Right: Actions -->
	<div class="flex items-center gap-2">
		<!-- Planning tasks indicator -->
		<PlanningTasksIndicator />

		<!-- Current conversation model badge (hide on Space Dashboard and Arena) -->
		{#if !isSpaceDashboard && !isArena && chatStore.messages && chatStore.messages.length > 0 && chatStore.activeConversation}
			<ModelBadge model={chatStore.activeConversation.model} />
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

<!-- Space Modal -->
<SpaceModal
	open={showSpaceModal}
	space={editingSpace}
	onClose={handleCloseModal}
	onCreate={handleCreateSpace}
	onUpdate={handleUpdateSpace}
	onDelete={handleDeleteSpace}
/>

<style>
	.space-nav-item {
		display: flex;
		align-items: center;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.space-nav-item:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
	}

	.space-nav-item.active {
		color: var(--space-color, #fff);
		background: color-mix(in srgb, var(--space-color, #3b82f6) 15%, transparent);
	}

	.space-nav-separator {
		width: 1px;
		height: 1rem;
		background: rgba(255, 255, 255, 0.15);
		margin: 0 0.25rem;
	}

	.space-nav-add {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		color: rgba(255, 255, 255, 0.4);
		border: 1px dashed rgba(255, 255, 255, 0.2);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.space-nav-add:hover {
		color: rgba(255, 255, 255, 0.8);
		border-color: rgba(255, 255, 255, 0.4);
		background: rgba(255, 255, 255, 0.05);
	}

	.space-nav-all {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.space-nav-all:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.08);
	}

	.space-nav-edit {
		display: none;
		align-items: center;
		justify-content: center;
		margin-left: 0.25rem;
		padding: 0.125rem;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.space-nav-item:hover .space-nav-edit,
	.space-nav-item.active .space-nav-edit {
		display: flex;
	}

	.space-nav-edit:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
	}
</style>
