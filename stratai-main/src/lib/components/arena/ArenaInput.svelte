<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { arenaStore } from '$lib/stores/arena.svelte';
	import ThinkingToggle from '$lib/components/chat/ThinkingToggle.svelte';
	import SearchToggle from '$lib/components/chat/SearchToggle.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { Zap, Cpu, EyeOff, Eye, Swords } from 'lucide-svelte';

	interface Props {
		onStartBattle: (prompt: string, reasoningEffort: 'low' | 'medium' | 'high', blindMode: boolean) => void;
		disabled?: boolean;
		isStreaming?: boolean;
		initialPrompt?: string | null;
	}

	let { onStartBattle, disabled = false, isStreaming = false, initialPrompt = null }: Props = $props();

	let prompt = $state('');
	let textareaRef: HTMLTextAreaElement | undefined = $state();
	let isFocused = $state(false);
	let reasoningEffort = $state<'low' | 'medium' | 'high'>('medium');
	let blindMode = $state(false);
	let showBurst = $state(false);

	// Generate sword particles for the burst animation
	const SWORD_COUNT = 10;
	const swordParticles = Array.from({ length: SWORD_COUNT }, (_, i) => {
		const angleBase = (i * 360 / SWORD_COUNT) + (Math.random() * 15 - 7.5);
		const angleRad = (angleBase * Math.PI) / 180;
		const distance = 70 + Math.random() * 30;

		return {
			id: i,
			// Pre-calculate X/Y offsets for CSS
			x: Math.cos(angleRad) * distance,
			y: Math.sin(angleRad) * distance,
			delay: Math.random() * 80, // 0-80ms stagger
			rotation: 180 + Math.random() * 90, // 180-270° rotation
			scale: 0.6 + Math.random() * 0.4, // 0.6-1.0 final scale
		};
	});

	// Track previous initialPrompt to detect reset (change to null)
	let prevInitialPrompt: string | null = null;

	// Apply initial prompt when provided, or clear when reset (null)
	$effect(() => {
		// Only act when initialPrompt actually changes
		if (initialPrompt !== prevInitialPrompt) {
			const wasSet = prevInitialPrompt !== null;
			prevInitialPrompt = initialPrompt;

			if (initialPrompt) {
				// Template selected - set prompt
				prompt = initialPrompt;
				// Trigger auto-resize after prompt is set
				setTimeout(() => {
					if (textareaRef) {
						textareaRef.style.height = 'auto';
						textareaRef.style.height = Math.min(textareaRef.scrollHeight, 200) + 'px';
					}
				}, 0);
			} else if (wasSet) {
				// Reset clicked (initialPrompt changed from value to null) - clear prompt
				prompt = '';
				if (textareaRef) {
					textareaRef.style.height = 'auto';
				}
			}
		}
	});

	let selectedCount = $derived(arenaStore.selectedModels.length);
	let canStart = $derived(selectedCount >= 2 && prompt.trim().length > 0 && !disabled && !isStreaming);

	// Check if any selected model supports tools (for search toggle)
	let anyModelSupportsTools = $derived(
		arenaStore.selectedModels.some((modelId) => modelCapabilitiesStore.supportsTools(modelId))
	);

	// Auto-resize textarea
	function handleInput() {
		if (textareaRef) {
			textareaRef.style.height = 'auto';
			textareaRef.style.height = Math.min(textareaRef.scrollHeight, 200) + 'px';
		}
	}

	// Trigger battle with animation
	function triggerBattle() {
		if (!canStart || showBurst) return;

		// Trigger the sword burst animation
		showBurst = true;

		// Start the battle IMMEDIATELY - API requests go out while animation plays
		// The page delays the UI transition for 1 second, so user sees the animation
		// while responses start streaming in the background
		onStartBattle(prompt.trim(), reasoningEffort, blindMode);
		prompt = '';

		// Reset textarea height
		if (textareaRef) {
			textareaRef.style.height = 'auto';
		}

		// Animation plays for 1 second (synced with page transition delay)
		setTimeout(() => {
			showBurst = false;
		}, 1000);
	}

	// Handle form submission
	function handleSubmit(e: Event) {
		e.preventDefault();
		triggerBattle();
	}

	// Handle keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && settingsStore.sendOnEnter) {
			e.preventDefault();
			triggerBattle();
		}
	}

	let thinkingEnabled = $derived(settingsStore.extendedThinkingEnabled);
	let searchEnabled = $derived(settingsStore.webSearchEnabled);
	let webSearchFeatureEnabled = $derived(settingsStore.webSearchFeatureEnabled);
</script>

<div class="arena-input-container border-t border-surface-800 p-4 bg-surface-900/80 backdrop-blur-xl">
	<div class="max-w-4xl mx-auto">
		<!-- Input container with gradient border on focus -->
		<div
			class="relative rounded-2xl transition-all duration-300
				   {isFocused ? 'gradient-border shadow-glow' : ''}"
		>
			<form onsubmit={handleSubmit}>
				<div class="chat-input-field flex items-end gap-3 bg-surface-800 rounded-2xl p-3 {isFocused ? '' : 'border border-surface-700'}">
					<div class="flex-1 relative">
						<textarea
							bind:this={textareaRef}
							bind:value={prompt}
							oninput={handleInput}
							onkeydown={handleKeydown}
							onfocus={() => (isFocused = true)}
							onblur={() => (isFocused = false)}
							placeholder={selectedCount < 2
								? 'Select at least 2 models above to start a battle...'
								: 'Enter your prompt to battle the models...'}
							disabled={disabled || isStreaming}
							rows="1"
							class="w-full bg-transparent text-surface-100 placeholder-surface-500
								   resize-none focus:outline-none leading-relaxed"
							style="min-height: 24px; max-height: 200px;"
						></textarea>
					</div>

					<!-- Actions -->
					<div class="flex items-center gap-2">
						<!-- Extended Thinking Toggle -->
						<ThinkingToggle disabled={disabled || isStreaming} />

						<!-- Web Search Toggle -->
						{#if webSearchFeatureEnabled && anyModelSupportsTools}
							<SearchToggle disabled={disabled || isStreaming} />
						{/if}

						<!-- Blind Mode Toggle -->
						<button
							type="button"
							onclick={() => (blindMode = !blindMode)}
							class="flex items-center justify-center w-10 h-10 rounded-xl transition-all
								   {blindMode
									? 'bg-accent-500/20 text-accent-400'
									: 'bg-surface-700 text-surface-400 hover:text-surface-200 hover:bg-surface-600'}"
							title="Blind mode - hide model names until you vote"
						>
							{#if blindMode}
								<EyeOff class="w-5 h-5" />
							{:else}
								<Eye class="w-5 h-5" />
							{/if}
						</button>

						<!-- Battle button with sword burst -->
						<div class="relative">
							<button
								type="submit"
								disabled={!canStart}
								class="battle-btn flex items-center justify-center w-10 h-10 rounded-xl
									   transition-all duration-200
									   {canStart
										? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white hover:scale-105 shadow-glow-sm'
										: 'bg-surface-700 text-surface-500 cursor-not-allowed'}
									   {showBurst ? 'scale-110' : ''}"
								title="Start battle"
							>
								<Zap class="w-5 h-5" />
							</button>

							<!-- Sword burst particles -->
							{#if showBurst}
								<div class="burst-container">
									{#each swordParticles as particle (particle.id)}
										<div
											class="burst-sword"
											style="
												--x: {particle.x}px;
												--y: {particle.y}px;
												--delay: {particle.delay}ms;
												--rotation: {particle.rotation}deg;
												--final-scale: {particle.scale};
											"
										>
											<Swords class="w-5 h-5" />
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</form>
		</div>

		<!-- Footer hints -->
		<div class="flex items-center justify-between mt-2 px-1">
			<div class="flex items-center gap-4 text-xs text-surface-500">
				<span>
					<kbd class="px-1.5 py-0.5 bg-surface-800 rounded text-surface-400">Enter</kbd> to battle
				</span>
				{#if thinkingEnabled}
					<span class="flex items-center gap-1.5 text-amber-400">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
						Extended thinking
					</span>
				{/if}
				{#if webSearchFeatureEnabled && searchEnabled}
					<span class="flex items-center gap-1.5 text-primary-400">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
						</svg>
						Web search
					</span>
				{/if}
				{#if blindMode}
					<span class="flex items-center gap-1.5 text-accent-400">
						<EyeOff class="w-3.5 h-3.5" />
						Blind mode
					</span>
				{/if}
			</div>

			<div class="flex items-center gap-3 text-xs text-surface-500">
				<span class="flex items-center gap-1.5">
					<Cpu class="w-3.5 h-3.5" />
					{selectedCount} models
				</span>
			</div>
		</div>
	</div>
</div>

<style>
	/* Sword burst animation styles */
	.burst-container {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
		z-index: 50;
	}

	.burst-sword {
		position: absolute;
		top: 0;
		left: 0;
		transform: translate(-50%, -50%);
		animation: sword-burst 900ms ease-out forwards;
		animation-delay: var(--delay);
		opacity: 0;
	}

	.burst-sword :global(svg) {
		color: var(--color-primary-400);
		filter: drop-shadow(0 0 8px var(--color-primary-500));
	}

	@keyframes sword-burst {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(0deg) scale(1);
		}
		20% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform:
				translate(
					calc(-50% + var(--x)),
					calc(-50% + var(--y))
				)
				rotate(var(--rotation))
				scale(var(--final-scale));
		}
	}

	/* Button pulse effect during burst */
	.battle-btn {
		transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
	}
</style>
