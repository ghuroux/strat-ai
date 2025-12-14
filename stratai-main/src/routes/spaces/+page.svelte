<script lang="ts">
	import { getEnabledSpaces } from '$lib/config/spaces';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';
	import type { SpaceConfig } from '$lib/types/chat';

	const spaces = getEnabledSpaces();

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
		}
	};

	function getAccentClass(space: SpaceConfig) {
		return accentClasses[space.accentColor] || accentClasses.blue;
	}
</script>

<svelte:head>
	<title>Spaces - StratAI</title>
</svelte:head>

<!-- Header -->
<header class="h-16 px-4 flex items-center border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl">
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
		class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
			   bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100
			   border border-surface-700 hover:border-surface-600 transition-all"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
		<span class="hidden sm:inline">Back to Chat</span>
	</a>
</header>

<!-- Main Content -->
<main class="flex-1 flex flex-col items-center justify-center p-6 bg-surface-950">
	<div class="max-w-2xl w-full text-center">
		<!-- Title -->
		<h1 class="text-3xl font-bold text-surface-100 mb-3">Choose Your Space</h1>
		<p class="text-surface-400 mb-8">
			Each space provides a focused environment with specialized templates and context
		</p>

		<!-- Space Cards -->
		<div class="grid gap-4 sm:grid-cols-2">
			{#each spaces as space}
				{@const accent = getAccentClass(space)}
				<a
					href="/spaces/{space.id}"
					class="group relative p-6 rounded-xl border text-left transition-all duration-200
						   {accent.bg} {accent.border} {accent.hover}"
				>
					<!-- Icon -->
					<div class="mb-3 {accent.icon}">
						<SpaceIcon space={space.id} size="xl" />
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
		</div>

		<!-- Coming soon hint -->
		<p class="mt-8 text-sm text-surface-500">
			More spaces coming soon: Personal & Random
		</p>
	</div>
</main>
