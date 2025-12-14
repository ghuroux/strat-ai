<script lang="ts">
	import { fade } from 'svelte/transition';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';
	import type { SpaceType } from '$lib/types/chat';

	interface Props {
		hasModel: boolean;
		onNewChat: () => void;
		space?: SpaceType | null;
	}

	let { hasModel, onNewChat, space = null }: Props = $props();

	// Space-specific content
	const spaceContent = {
		work: {
			title: 'Your Work Space',
			subtitle: 'A dedicated corner for your professional life. Draft emails, prep for meetings, or think through that tricky problem—all in one place.',
			buttonText: 'Start a Work Chat',
			features: [
				{
					title: 'Stays Organized',
					description: 'Your work conversations kept separate and easy to find',
					icon: 'folder'
				},
				{
					title: 'Pick Up Anytime',
					description: 'Context preserved so you can dive right back in',
					icon: 'clock'
				}
			]
		},
		research: {
			title: 'Your Research Space',
			subtitle: 'A place to explore ideas, dig into topics, and make sense of complex information. Follow your curiosity wherever it leads.',
			buttonText: 'Start Exploring',
			features: [
				{
					title: 'Go Deep',
					description: 'Explore topics thoroughly without distraction',
					icon: 'search'
				},
				{
					title: 'Build Understanding',
					description: 'Your research threads stay organized and accessible',
					icon: 'layers'
				}
			]
		},
		random: {
			title: 'Your Experimental Space',
			subtitle: 'A sandbox for wild ideas, random thoughts, and creative exploration. No rules, just curiosity.',
			buttonText: 'Start Something',
			features: [
				{
					title: 'No Pressure',
					description: 'Experiment freely without expectations',
					icon: 'sparkle'
				},
				{
					title: 'Capture Ideas',
					description: 'A home for thoughts that don\'t fit elsewhere',
					icon: 'lightbulb'
				}
			]
		},
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

	let content = $derived(space ? spaceContent[space] : null);
</script>

<div class="h-full flex items-center justify-center min-h-[60vh]" in:fade={{ duration: 300 }}>
	<div class="text-center max-w-md">
		<!-- Logo/Icon -->
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

		<!-- Feature hints -->
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
	</div>
</div>
