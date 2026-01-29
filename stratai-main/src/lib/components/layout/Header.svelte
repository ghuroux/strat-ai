<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { easterEggsStore } from '$lib/stores/easter-eggs.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { Menu, X } from 'lucide-svelte';
	import ModelSelector from '../ModelSelector.svelte';
	import ModelBadge from '../ModelBadge.svelte';
	import PlanningTasksIndicator from '../tasks/PlanningTasksIndicator.svelte';
	import UserMenu from './UserMenu.svelte';
	import { SpaceModal, SpaceNavTabs } from '../spaces';
	import MoreNavMenu from './MoreNavMenu.svelte';
	import type { CreateSpaceInput, UpdateSpaceInput, Space } from '$lib/types/spaces';
	import { MAX_CUSTOM_SPACES } from '$lib/types/spaces';

	interface Props {
		onModelChange?: (model: string) => void;
		onProviderChange?: (provider: 'anthropic' | 'openai' | 'google') => void;
		onSettingsClick?: () => void;
	}

	let { onModelChange, onProviderChange, onSettingsClick }: Props = $props();

	// Read selected model directly from store (for new conversations)
	let selectedModel = $derived(settingsStore.selectedModel || '');

	// AUTO mode: track the routed model from chat store
	let routedModel = $derived(chatStore.routedModel);

	// Resolve the actual model for the badge display
	// When in AUTO mode, show the routed model instead of "auto"
	let isConversationAutoMode = $derived(
		chatStore.activeConversation?.model?.toLowerCase() === 'auto'
	);
	let badgeModel = $derived.by(() => {
		const conv = chatStore.activeConversation;
		if (!conv) return '';
		if (conv.model.toLowerCase() === 'auto') {
			// Use current routing state first
			if (routedModel) return routedModel;
			// Fall back to last assistant message's routed model
			const lastRouted = [...conv.messages].reverse().find(m => m.role === 'assistant' && m.routedModel);
			if (lastRouted?.routedModel) return lastRouted.routedModel;
		}
		return conv.model;
	});

	// Spaces state
	let showSpaceModal = $state(false);
	let editingSpace = $state<Space | null>(null);
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

	// Detect if we're on the global tasks dashboard
	let isGlobalTasks = $derived.by(() => {
		return $page.url.pathname.startsWith('/tasks');
	});

	// Detect if we're on main chat (/)
	let isMainChat = $derived.by(() => {
		return $page.url.pathname === '/';
	});

	// Get user data from page data (set by +layout.server.ts)
	let userData = $derived($page.data.user as { displayName: string | null; role: 'owner' | 'admin' | 'member' } | null);

	// Current user ID for space display name disambiguation
	let currentUserId = $derived(userStore.id ?? '');

	onMount(() => {
		spacesStore.loadSpaces();
	});

	function toggleSidebar() {
		settingsStore.toggleSidebar();
	}

	function handleToggleSpaceConversations() {
		settingsStore.toggleSpaceConversations();
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
		try {
			await spacesStore.updateSpace(id, input);
			handleCloseModal();
		} catch (e) {
			console.error('Failed to update space:', e);
			toastStore.error('Failed to update space');
		}
	}

	async function handleDeleteSpace(id: string) {
		try {
			const success = await spacesStore.deleteSpace(id);
			if (success) {
				handleCloseModal();
				// If we're currently viewing the deleted space, navigate away
				const deletedSpace = customSpaces.find(s => s.id === id);
				if (deletedSpace && currentSpaceSlug === deletedSpace.slug) {
					goto('/spaces');
				}
			}
		} catch (e) {
			console.error('Failed to delete space:', e);
			toastStore.error('Failed to delete space');
		}
	}

	// Easter egg: Logo multi-click
	let logoElement: HTMLAnchorElement | undefined = $state();

	function handleLogoClick(e: MouseEvent) {
		// Check for easter egg first
		const triggered = easterEggsStore.trackLogoClick();
		if (triggered) {
			e.preventDefault();
			const isFirstTime = easterEggsStore.discover('logo-click');

			// Trigger animation
			if (logoElement) {
				logoElement.classList.add('logo-easter-egg');
				setTimeout(() => {
					logoElement?.classList.remove('logo-easter-egg');
				}, 600);
			}

			// Show toast
			if (isFirstTime) {
				toastStore.discovery('You found the secret logo dance! Built with love by the StratAI team.', 5000);
			} else {
				toastStore.info('The logo appreciates your enthusiasm!', 3000);
			}
			return;
		}

		// Navigate to user's preferred home page
		e.preventDefault();
		goto(userStore.homeUrl);
	}
</script>

<header class="h-16 px-4 hidden md:flex items-center border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl overflow-visible relative z-40">
	<!-- Left: Sidebar Toggle & Logo -->
	<div class="flex items-center gap-3 min-w-0">
		<!-- Sidebar Toggle (All screen sizes) -->
		<button
			type="button"
			class="btn-icon w-9 h-9"
			onclick={isSpaceDashboard ? handleToggleSpaceConversations : toggleSidebar}
			aria-label={isSpaceDashboard ? "Toggle space conversations" : "Toggle sidebar"}
		>
			{#if isSpaceDashboard}
				<!-- Space dashboard: show space conversations state -->
				{#if settingsStore.spaceConversationsOpen}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
					</svg>
				{/if}
			{:else}
				<!-- Main chat: show main sidebar state -->
				{#if settingsStore.sidebarOpen}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
					</svg>
				{/if}
			{/if}
		</button>

		<!-- Logo (with easter egg on 7 rapid clicks) - Hidden on mobile -->
		<a
			bind:this={logoElement}
			href="/"
			class="hidden sm:flex items-center gap-2 hover:opacity-90 transition-opacity"
			onclick={handleLogoClick}
		>
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
			<span class="font-bold text-lg text-gradient">StratAI</span>
		</a>

		<!-- Mobile/Tablet: Icon Navigation (<768px) -->
		<div class="flex md:hidden items-center gap-1 ml-2">
			<!-- Main Chat Icon -->
			<a
				href="/"
				class="flex items-center justify-center w-9 h-9 rounded-lg
				       transition-colors"
				class:bg-primary-500={isMainChat}
				class:text-white={isMainChat}
				class:text-surface-400={!isMainChat}
				class:hover:text-surface-100={!isMainChat}
				class:hover:bg-surface-800={!isMainChat}
				title="Main Chat"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
				</svg>
			</a>
			<!-- Tasks Icon -->
			<a
				href="/tasks"
				class="flex items-center justify-center w-9 h-9 rounded-lg
				       transition-colors"
				class:bg-primary-500={isGlobalTasks}
				class:text-white={isGlobalTasks}
				class:text-surface-400={!isGlobalTasks}
				class:hover:text-surface-100={!isGlobalTasks}
				class:hover:bg-surface-800={!isGlobalTasks}
				title="Tasks"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
				</svg>
			</a>
			<!-- Arena Icon -->
			<a
				href="/arena"
				class="flex items-center justify-center w-9 h-9 rounded-lg
				       transition-colors"
				class:bg-primary-500={isArena}
				class:text-white={isArena}
				class:text-surface-400={!isArena}
				class:hover:text-surface-100={!isArena}
				class:hover:bg-surface-800={!isArena}
				title="Arena"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
			</a>
			<!-- Spaces Dropdown -->
			<MoreNavMenu {currentUserId} {currentSpaceSlug} />
		</div>

		<!-- Desktop: Spaces Navigation (≥768px) -->
		<div class="hidden md:flex items-center gap-1 ml-2">
			<SpaceNavTabs {currentUserId} {currentSpaceSlug} />
			<!-- Main Chat Button -->
			<a
				href="/"
				class="space-nav-chat"
				class:active={isMainChat}
				title="Main Chat"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
				</svg>
			</a>
			<!-- Tasks Button -->
			<a
				href="/tasks"
				class="space-nav-chat"
				class:active={isGlobalTasks}
				title="Tasks"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
				</svg>
			</a>
			<!-- Arena Link (Desktop) -->
			<a
				href="/arena"
				class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 ml-1 rounded-lg text-sm font-medium
				       border transition-all"
				class:bg-primary-500={isArena}
				class:text-white={isArena}
				class:border-primary-500={isArena}
				class:bg-surface-800={!isArena}
				class:text-surface-300={!isArena}
				class:hover:bg-surface-700={!isArena}
				class:hover:text-surface-100={!isArena}
				class:border-surface-700={!isArena}
				class:hover:border-surface-600={!isArena}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
				<span>Arena</span>
			</a>
		</div>
	</div>

	<!-- Center: Model Selector (hide on Space Dashboard, Arena, and Tasks, show when no messages elsewhere) -->
	{#if isSpaceDashboard || isArena || isGlobalTasks}
		<!-- No model selector on Space Dashboard or Arena (Arena has its own) -->
		<div class="flex-1"></div>
	{:else if !chatStore.messages || chatStore.messages.length === 0}
		<div class="flex-1 flex justify-center">
			<div class="w-full max-w-[160px] sm:max-w-[240px] md:max-w-[280px] lg:max-w-xs">
				<ModelSelector
					{selectedModel}
					{routedModel}
					disabled={chatStore.isStreaming}
					onchange={handleModelChange}
					onproviderchange={onProviderChange}
				/>
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
			<ModelBadge model={badgeModel} isAutoMode={isConversationAutoMode} />
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

		<!-- User Menu -->
		{#if userData}
			<UserMenu displayName={userData.displayName} role={userData.role} />
		{:else}
			<!-- Fallback logout for edge cases -->
			<form action="/logout" method="GET">
				<button type="submit" class="btn-ghost text-sm">Logout</button>
			</form>
		{/if}
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
	/* Main Chat button in nav bar */
	.space-nav-chat {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
		margin-left: 0.25rem;
	}

	.space-nav-chat:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.08);
	}

	.space-nav-chat.active {
		color: #3b82f6;
		background: color-mix(in srgb, #3b82f6 15%, transparent);
	}
</style>
