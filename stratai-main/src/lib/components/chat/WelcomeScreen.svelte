<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Sparkles, Zap } from 'lucide-svelte';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';
	import type { Assist } from '$lib/types/assists';
	import { ASSIST_ICONS } from '$lib/config/assists';
	import { settingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		hasModel: boolean;
		onNewChat: () => void;
		space?: string | null;
		activeAssist?: Assist | null;
	}

	let { hasModel, onNewChat, space = null, activeAssist = null }: Props = $props();

	// AUTO mode identifier
	const AUTO_MODEL_ID = 'auto';

	// Get reactive selectedModel
	const selectedModel = $derived(settingsStore.selectedModel);

	function selectAutoMode() {
		settingsStore.setSelectedModel(AUTO_MODEL_ID);
	}

	// Get icon path for assist
	function getAssistIconPath(iconName: string): string {
		return ASSIST_ICONS[iconName] || ASSIST_ICONS.tasks;
	}

	// Space-specific content (only Personal is a system space now)
	const spaceContent: Record<string, { title: string; subtitle: string; buttonText: string; features: { title: string; description: string; icon: string }[] }> = {
		personal: {
			title: 'Your Personal Space',
			subtitle: 'A private corner just for you. Personal projects, private thoughts, things you\'re working through.',
			buttonText: 'Start a Chat',
			features: [
				{
					title: 'Completely Private',
					description: 'Just between you and your AI assistant',
					icon: 'lock'
				},
				{
					title: 'Your Pace',
					description: 'No deadlines, no pressure—work on what matters to you',
					icon: 'heart'
				}
			]
		}
	};

	// Default content for custom spaces
	const defaultContent = {
		title: 'Your Space',
		subtitle: 'A dedicated space for your work. Start a conversation to get going.',
		buttonText: 'Start a Chat',
		features: [
			{
				title: 'Stays Organized',
				description: 'Conversations kept separate and easy to find',
				icon: 'folder'
			},
			{
				title: 'Pick Up Anytime',
				description: 'Context preserved so you can dive right back in',
				icon: 'clock'
			}
		]
	};

	let content = $derived(space ? (spaceContent[space] || defaultContent) : null);
</script>

<div class="h-full flex items-center justify-center min-h-[60vh]" in:fade={{ duration: 300 }}>
	{#if !selectedModel}
		<!-- Model selection guidance for first-time users -->
		<div class="max-w-md w-full px-4 text-center">
			<div
				class="mx-auto w-20 h-20 rounded-2xl mb-6
						 bg-gradient-to-br from-primary-500/20 to-cyan-500/20
						 border border-primary-500/30
						 flex items-center justify-center"
			>
				<Sparkles class="w-10 h-10 text-primary-400" />
			</div>

			<h1 class="text-2xl font-bold text-zinc-100 mb-3">
				Welcome to StratAI
			</h1>

			<p class="text-base text-zinc-400 mb-6">
				To get started, select an AI model
			</p>

			<div class="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 mb-6 text-left">
				<div class="flex items-start gap-3">
					<div
						class="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/15
									 flex items-center justify-center mt-0.5"
					>
						<Zap class="w-4 h-4 text-primary-400" />
					</div>
					<div>
						<p class="text-sm font-medium text-zinc-200 mb-1">
							We recommend AUTO mode
						</p>
						<p class="text-sm text-zinc-400 leading-relaxed">
							StratAI will automatically choose the best model for each conversation based on complexity.
						</p>
					</div>
				</div>
			</div>

			<button
				onclick={selectAutoMode}
				class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl
						 bg-primary-500 hover:bg-primary-600
						 text-base font-semibold text-white
						 transition-all duration-150
						 shadow-lg shadow-primary-500/25"
			>
				<Sparkles class="w-5 h-5" />
				Select AUTO Mode
			</button>

			<p class="mt-4 text-sm text-zinc-500">
				Or select a specific model from the dropdown above
			</p>
		</div>
	{:else}
		<div class="text-center max-w-md">
			{#if activeAssist}
			<!-- ASSIST MODE: Show assist-specific welcome -->
			<div
				class="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center assist-icon-glow"
				style="background: var(--space-accent-muted); border: 2px solid var(--space-accent-ring);"
			>
				<svg
					class="w-12 h-12"
					style="color: var(--space-accent);"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getAssistIconPath(activeAssist.icon)} />
				</svg>
			</div>

			<h2 class="text-2xl font-bold mb-3" style="color: var(--space-accent);">{activeAssist.name}</h2>
			<p class="text-surface-400 mb-6 leading-relaxed">
				{activeAssist.description}
			</p>

			<!-- Assist guidance - improved -->
			<div class="mb-8 p-5 rounded-2xl border bg-gradient-to-br from-surface-800/80 to-surface-900/80 backdrop-blur-sm" style="border-color: var(--space-accent-ring);">
				<div class="space-y-4">
					<!-- Step 1 -->
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background: var(--space-accent); color: white;">1</div>
						<div class="text-left">
							<p class="text-sm text-surface-200">Brain dump everything on your mind</p>
							<p class="text-xs text-surface-500 mt-0.5">Meetings, deadlines, ideas—just let it flow</p>
						</div>
					</div>
					<!-- Step 2 -->
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background: var(--space-accent); color: white;">2</div>
						<div class="text-left">
							<p class="text-sm text-surface-200">I'll organize it into clear tasks</p>
							<p class="text-xs text-surface-500 mt-0.5">Prioritized, with dependencies noted</p>
						</div>
					</div>
					<!-- Step 3 -->
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style="background: var(--space-accent); color: white;">3</div>
						<div class="text-left">
							<p class="text-sm text-surface-200">Get a clear action plan</p>
							<p class="text-xs text-surface-500 mt-0.5">Know exactly what to tackle first</p>
						</div>
					</div>
				</div>

				<!-- Example hint -->
				<div class="mt-4 pt-4 border-t border-surface-700/50">
					<p class="text-xs text-surface-500 italic">"I have a roadmap to finish, need to email Sarah, standup at 10, and should probably start performance reviews..."</p>
				</div>
			</div>

			<!-- Visual pointer to chat input -->
			<div class="flex flex-col items-center gap-2 text-surface-500 animate-subtle-bounce">
				<span class="text-sm">Start typing below</span>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
				</svg>
			</div>
		{:else}
			<!-- NORMAL MODE: Logo/Icon -->
			{#if space}
				<!-- Space-specific icon -->
				<div
					class="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
					style="background: var(--space-accent-muted); border: 1px solid var(--space-accent-ring);"
				>
					<div style="color: var(--space-accent);">
						<SpaceIcon {space} size="xl" class="w-10 h-10" />
					</div>
				</div>
			{:else}
				<!-- Default StratAI icon -->
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
			{/if}

			<!-- Welcome Text -->
			{#if content}
				<h2 class="text-2xl font-bold mb-3" style="color: var(--space-accent);">{content.title}</h2>
				<p class="text-surface-400 mb-6 leading-relaxed">
					{content.subtitle}
				</p>
			{:else}
				<h2 class="text-2xl font-bold text-gradient mb-3">Welcome to StratAI</h2>
				<p class="text-surface-400 mb-6">
					Your AI-powered assistant for intelligent conversations.
					Select a model and start chatting.
				</p>
			{/if}
		{/if}

		<!-- Quick Actions (hidden in assist mode) -->
		{#if !activeAssist}
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
					<button
						type="button"
						onclick={onNewChat}
						class="mx-auto px-6 py-2.5 rounded-xl font-medium transition-all duration-200"
						style={space
							? 'background: var(--space-accent); color: white;'
							: 'background: var(--gradient-primary); color: white;'}
					>
						{content?.buttonText || 'Start New Chat'}
					</button>
				{/if}
			</div>

			<!-- Feature hints (hidden in assist mode) -->
			<div class="mt-8 grid grid-cols-2 gap-4 text-left">
			{#if content}
				<!-- Space-specific features -->
				{#each content.features as feature}
					<div
						class="p-4 rounded-xl border"
						style="background: var(--space-accent-muted); border-color: var(--space-accent-ring);"
					>
						<div class="w-6 h-6 mb-2" style="color: var(--space-accent);">
							{#if feature.icon === 'folder'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
								</svg>
							{:else if feature.icon === 'clock'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							{:else if feature.icon === 'search'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							{:else if feature.icon === 'layers'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
							{:else if feature.icon === 'sparkle'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
								</svg>
							{:else if feature.icon === 'lightbulb'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
								</svg>
							{:else if feature.icon === 'lock'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
							{:else if feature.icon === 'heart'}
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
								</svg>
							{/if}
						</div>
						<h3 class="font-medium text-surface-200 mb-1">{feature.title}</h3>
						<p class="text-xs text-surface-500">{feature.description}</p>
					</div>
				{/each}
			{:else}
				<!-- Default features -->
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
			{/if}
		</div>
		{/if}
	</div>
	{/if}
</div>

<style>
	/* Subtle glow animation for assist icon */
	.assist-icon-glow {
		animation: assist-glow 2s ease-in-out infinite;
	}

	@keyframes assist-glow {
		0%, 100% {
			box-shadow: 0 0 20px rgba(var(--space-accent-rgb, 59, 130, 246), 0.2);
		}
		50% {
			box-shadow: 0 0 30px rgba(var(--space-accent-rgb, 59, 130, 246), 0.4);
		}
	}

	/* Subtle bounce animation for pointer */
	.animate-subtle-bounce {
		animation: subtle-bounce 2s ease-in-out infinite;
	}

	@keyframes subtle-bounce {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(6px);
		}
	}
</style>
