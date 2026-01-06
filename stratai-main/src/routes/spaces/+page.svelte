<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getEnabledSpaces } from '$lib/config/spaces';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';
	import { SpaceModal } from '$lib/components/spaces';
	import type { SpaceConfig, SpaceType } from '$lib/types/chat';
	import type { Space } from '$lib/types/spaces';

	// Type for display items (union of system and custom spaces)
	interface DisplaySpace {
		id: string;
		name: string;
		description: string;
		accentColor: string;
		isCustom?: boolean;
		color?: string;
	}

	// System spaces from config
	const systemSpaces = getEnabledSpaces();
	const systemSpaceIds = new Set<string>(systemSpaces.map(s => s.id));

	// Custom spaces from store (loaded on mount)
	let customSpaces = $derived.by(() => {
		// Convert SvelteMap to array and filter
		return Array.from(spacesStore.spaces.values()).filter((s: Space) => !systemSpaceIds.has(s.slug));
	});

	// Combined display: system spaces first, then custom
	let allSpaces = $derived([...systemSpaces, ...customSpaces.map((s: Space) => ({
		id: s.slug,
		name: s.name,
		description: s.context || 'Custom space',
		accentColor: getAccentFromColor(s.color),
		isCustom: true,
		color: s.color
	}))]);

	// SpaceModal state
	let showCreateModal = $state(false);

	// Load spaces on mount
	onMount(async () => {
		await spacesStore.loadSpaces();
	});

	// Map hex color to accent name
	function getAccentFromColor(color?: string): string {
		if (!color) return 'blue';
		const colorMap: Record<string, string> = {
			'#3b82f6': 'blue',
			'#8b5cf6': 'purple',
			'#f97316': 'orange',
			'#22c55e': 'green',
			'#ef4444': 'red',
			'#06b6d4': 'cyan',
			'#ec4899': 'pink',
			'#eab308': 'yellow'
		};
		return colorMap[color.toLowerCase()] || 'blue';
	}

	// Map accent colors to Tailwind classes
	const accentClasses: Record<string, { bg: string; border: string; hover: string; icon: string }> = {
		blue: {
			bg: 'bg-blue-500/10',
			border: 'border-blue-500/30',
			hover: 'hover:bg-blue-500/20 hover:border-blue-500/50',
			icon: 'text-blue-400'
		},
		purple: {
			bg: 'bg-purple-500/10',
			border: 'border-purple-500/30',
			hover: 'hover:bg-purple-500/20 hover:border-purple-500/50',
			icon: 'text-purple-400'
		},
		orange: {
			bg: 'bg-orange-500/10',
			border: 'border-orange-500/30',
			hover: 'hover:bg-orange-500/20 hover:border-orange-500/50',
			icon: 'text-orange-400'
		},
		green: {
			bg: 'bg-green-500/10',
			border: 'border-green-500/30',
			hover: 'hover:bg-green-500/20 hover:border-green-500/50',
			icon: 'text-green-400'
		},
		red: {
			bg: 'bg-red-500/10',
			border: 'border-red-500/30',
			hover: 'hover:bg-red-500/20 hover:border-red-500/50',
			icon: 'text-red-400'
		},
		cyan: {
			bg: 'bg-cyan-500/10',
			border: 'border-cyan-500/30',
			hover: 'hover:bg-cyan-500/20 hover:border-cyan-500/50',
			icon: 'text-cyan-400'
		},
		pink: {
			bg: 'bg-pink-500/10',
			border: 'border-pink-500/30',
			hover: 'hover:bg-pink-500/20 hover:border-pink-500/50',
			icon: 'text-pink-400'
		},
		yellow: {
			bg: 'bg-yellow-500/10',
			border: 'border-yellow-500/30',
			hover: 'hover:bg-yellow-500/20 hover:border-yellow-500/50',
			icon: 'text-yellow-400'
		}
	};

	function getAccentClass(space: { accentColor?: string }) {
		return accentClasses[space.accentColor || 'blue'] || accentClasses.blue;
	}

	// Handle space creation
	async function handleCreateSpace(input: { name: string; context?: string }) {
		const newSpace = await spacesStore.createSpace(input);
		if (newSpace) {
			showCreateModal = false;
			goto(`/spaces/${newSpace.slug}`);
		}
	}

	// Handle space update (not used in create mode, but required by modal)
	async function handleUpdateSpace(id: string, input: { name?: string; context?: string }) {
		await spacesStore.updateSpace(id, input);
	}
</script>

<svelte:head>
	<title>Spaces - StratAI</title>
</svelte:head>

<!-- Header -->
<header class="h-16 px-4 flex items-center border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl flex-shrink-0">
	<!-- Logo / Back to Chat -->
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

	<div class="flex-1"></div>

	<!-- Back to regular chat -->
	<a
		href="/"
		class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
			   text-surface-400 hover:text-surface-200 transition-colors"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
		<span>Chat</span>
	</a>
</header>

<!-- Main Content -->
<main class="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto bg-surface-950">
	<div class="max-w-2xl w-full text-center">
		<!-- Title -->
		<h1 class="text-3xl font-bold text-surface-100 mb-3">Choose Your Space</h1>
		<p class="text-surface-400 mb-8">
			Each space provides a focused environment with specialized templates and context
		</p>

		<!-- Space Cards -->
		<div class="grid gap-4 sm:grid-cols-2">
			{#each allSpaces as space}
				{@const accent = getAccentClass(space)}
				{@const isCustom = 'isCustom' in space && space.isCustom}
				<a
					href="/spaces/{space.id}"
					class="group relative p-6 rounded-xl border text-left transition-all duration-200
						   {accent.bg} {accent.border} {accent.hover}"
				>
					<!-- Icon -->
					<div class="mb-3 {accent.icon}">
						{#if isCustom}
							<!-- Custom space icon (folder with star) -->
							<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
							</svg>
						{:else}
							<SpaceIcon space={space.id as SpaceType} size="xl" />
						{/if}
					</div>

					<!-- Name -->
					<h2 class="text-xl font-semibold text-surface-100 mb-2 group-hover:text-white transition-colors">
						{space.name}
					</h2>

					<!-- Description -->
					<p class="text-sm text-surface-400 group-hover:text-surface-300 transition-colors">
						{space.description}
					</p>

					<!-- Hover arrow indicator -->
					<div class="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
						<svg class="w-5 h-5 {accent.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
						</svg>
					</div>
				</a>
			{/each}

			<!-- Create Space Card -->
			<button
				type="button"
				onclick={() => showCreateModal = true}
				class="group relative p-6 rounded-xl border text-left transition-all duration-200
					   border-dashed border-surface-600 hover:border-surface-400
					   bg-surface-800/30 hover:bg-surface-800/50"
			>
				<!-- Icon -->
				<div class="mb-3 text-surface-500 group-hover:text-surface-300 transition-colors">
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
					</svg>
				</div>

				<!-- Name -->
				<h2 class="text-xl font-semibold text-surface-400 mb-2 group-hover:text-surface-200 transition-colors">
					Create Space
				</h2>

				<!-- Description -->
				<p class="text-sm text-surface-500 group-hover:text-surface-400 transition-colors">
					Create a custom space for your specific needs
				</p>
			</button>
		</div>

		<!-- Hint text -->
		{#if customSpaces.length === 0}
			<p class="mt-8 text-sm text-surface-500">
				Create custom spaces to organize your work and conversations
			</p>
		{/if}
	</div>
</main>

<!-- Create Space Modal -->
<SpaceModal
	open={showCreateModal}
	onClose={() => showCreateModal = false}
	onCreate={handleCreateSpace}
	onUpdate={handleUpdateSpace}
/>
