<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import MoveChatModal from '$lib/components/chat/MoveChatModal.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import KeyboardShortcutsModal from '$lib/components/KeyboardShortcutsModal.svelte';
	import MatrixRain from '$lib/components/effects/MatrixRain.svelte';
	import Confetti from '$lib/components/effects/Confetti.svelte';
	import { SnakeGame, WordleGame, PromptRunnerGame } from '$lib/components/games';
	import { BuyModal } from '$lib/components/commerce';
	import ErrorFallback from '$lib/components/ErrorFallback.svelte';
	import { moveChatModalStore } from '$lib/stores/moveChatModal.svelte';
	import { commandPaletteStore } from '$lib/stores/commandPalette.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { easterEggsStore } from '$lib/stores/easter-eggs.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { gameStore } from '$lib/stores/games.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { ThemePreference } from '$lib/types/user';

	// Svelte 5: Use @render for slots with Snippets
	let { children, data }: { children: any; data: PageData } = $props();

	// Keyboard shortcuts modal state
	let showShortcutsModal = $state(false);

	// Rage click detection state
	let clickTimestamps: number[] = [];
	const RAGE_CLICK_THRESHOLD = 6; // clicks needed
	const RAGE_CLICK_WINDOW = 2000; // within 2 seconds

	// Sync user data from server to client store
	$effect(() => {
		userStore.setUser(data.user);

		// Sync theme from database preference to settings store (if available)
		// This ensures theme persists across cache clears
		const dbTheme = data.user?.preferences?.theme;
		if (dbTheme && dbTheme !== settingsStore.theme) {
			settingsStore.setTheme(dbTheme);
		}
	});

	/**
	 * Apply theme on initial page load and when it changes
	 * Also sync conversations from API to ensure data is loaded after login
	 */
	onMount(() => {
		// Use database theme if available, otherwise use localStorage theme
		const theme = data.user?.preferences?.theme ?? settingsStore.theme;
		applyTheme(theme);

		// Sync conversations from API (ensures data is loaded after login/page refresh)
		// This is safe to call on every mount - syncFromApi merges with existing data
		if (data.user) {
			chatStore.refresh();
		}

		// Detect and sync timezone (silent operation - no UI feedback)
		if (data.user) {
			syncTimezone();
		}

		// Proactive calendar token refresh (silent - keeps tokens alive)
		if (data.user) {
			checkCalendarHealth();
		}

		// Listen for system theme changes when using 'system' preference
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			const currentTheme = data.user?.preferences?.theme ?? settingsStore.theme;
			if (currentTheme === 'system') {
				applyTheme('system');
			}
		};
		mediaQuery.addEventListener('change', handleChange);

		// Mobile sidebar management: auto-close on resize to mobile, auto-open on desktop
		const desktopMediaQuery = window.matchMedia('(min-width: 768px)');
		const handleSidebarResize = (e: MediaQueryListEvent | MediaQueryList) => {
			if (e.matches) {
				// Desktop: open sidebar by default
				settingsStore.setSidebarOpen(true);
			} else {
				// Mobile: close sidebar by default
				settingsStore.setSidebarOpen(false);
			}
		};
		// Set initial state
		handleSidebarResize(desktopMediaQuery);
		// Listen for changes
		desktopMediaQuery.addEventListener('change', handleSidebarResize);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
			desktopMediaQuery.removeEventListener('change', handleSidebarResize);
		};
	});

	/**
	 * Detect browser timezone and sync to server if different from stored preference.
	 * Silent operation - no UI feedback unless error.
	 */
	async function syncTimezone() {
		try {
			// Detect browser timezone using Intl API
			const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const storedTimezone = data.user?.preferences?.timezone;

			// Only update if timezone differs from stored preference
			if (detectedTimezone && detectedTimezone !== storedTimezone) {
				const response = await fetch('/api/user/preferences', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ timezone: detectedTimezone })
				});

				if (response.ok) {
					// Update local store with new timezone
					userStore.setPreferences({
						...userStore.preferences,
						timezone: detectedTimezone
					});
				}
				// Silent failure - don't show error to user for timezone sync
			}
		} catch {
			// Silent failure - timezone sync is not critical
			console.debug('Failed to sync timezone');
		}
	}

	/**
	 * Proactive calendar token health check.
	 * Calls the health endpoint to trigger a token refresh if the access token
	 * is expired or expiring soon. This prevents the "please reconnect" experience
	 * by keeping tokens alive on every page load.
	 *
	 * Silent operation — does not show UI feedback.
	 */
	async function checkCalendarHealth() {
		try {
			await fetch('/api/integrations/calendar/health');
			// Response intentionally ignored — the server-side refresh is the goal
		} catch {
			// Silent failure — calendar health is not critical for page load
			console.debug('Calendar health check failed (non-critical)');
		}
	}

	function applyTheme(theme: ThemePreference) {
		const root = document.documentElement;

		if (theme === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			root.classList.toggle('light', !prefersDark);
			root.classList.toggle('dark', prefersDark);
		} else {
			root.classList.toggle('light', theme === 'light');
			root.classList.toggle('dark', theme === 'dark');
		}
	}

	/**
	 * Global keyboard shortcut handler for Command Palette and Easter Eggs
	 * ⌘K (Mac) or Ctrl+K (Windows/Linux)
	 */
	function handleGlobalKeydown(e: KeyboardEvent) {
		// Check for ⌘K or Ctrl+K
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			commandPaletteStore.toggle();
			return;
		}

		// Check for ⌘⇧H or Ctrl+Shift+H - Go to preferred home
		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
			e.preventDefault();
			goto(userStore.homeUrl);
			return;
		}

		// Check if user is typing in an input
		const target = e.target as HTMLElement;
		const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

		// "?" shortcut to show keyboard shortcuts (only when not typing)
		if (!isTyping && e.key === '?' && e.shiftKey) {
			e.preventDefault();
			showShortcutsModal = true;
			return;
		}

		// Track Konami code: ↑↑↓↓←→←→BA (only when not typing)
		if (!isTyping) {
			const konamiCompleted = easterEggsStore.trackKonamiKey(e.code);
			if (konamiCompleted) {
				const isFirstTime = easterEggsStore.discover('konami-code');
				if (isFirstTime) {
					toastStore.discovery('You found a secret! The Konami Code lives on.', 5000);
				} else {
					toastStore.info('You know the code! Nice.', 3000);
				}
				triggerKonamiAnimation();
			}
		}
	}

	/**
	 * Rage click detection - detect frustrated rapid clicking
	 */
	function handleGlobalClick() {
		const now = Date.now();

		// Add current click and filter old ones
		clickTimestamps.push(now);
		clickTimestamps = clickTimestamps.filter(t => now - t < RAGE_CLICK_WINDOW);

		// Check if we've hit the threshold
		if (clickTimestamps.length >= RAGE_CLICK_THRESHOLD) {
			// Reset to prevent repeated triggers
			clickTimestamps = [];

			const isFirstTime = easterEggsStore.discover('rage-click');
			if (isFirstTime) {
				toastStore.discovery('Whoa there! Take a deep breath... we\'re here to help.', 5000);
			} else {
				const calmingMessages = [
					'Easy does it... everything is going to be okay.',
					'Hey, take a breath. We got this.',
					'Clicking harder won\'t make it faster, but we appreciate the enthusiasm!',
					'The computer can feel your frustration. Be gentle.',
					'Have you tried... clicking less aggressively?'
				];
				const message = calmingMessages[Math.floor(Math.random() * calmingMessages.length)];
				toastStore.info(message, 4000);
			}
		}
	}

	/**
	 * Trigger a fun animation when Konami code is entered
	 */
	function triggerKonamiAnimation() {
		// Add a brief celebratory effect
		const body = document.body;
		body.classList.add('konami-activated');
		setTimeout(() => {
			body.classList.remove('konami-activated');
		}, 1500);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<svelte:window onkeydown={handleGlobalKeydown} />
<svelte:body onclick={handleGlobalClick} />

<div class="min-h-screen bg-surface-950">
	<svelte:boundary onerror={(e) => console.error('[Boundary Error]', e)}>
		{@render children()}
		{#snippet failed(error, reset)}
			<ErrorFallback {error} {reset} variant="page" />
		{/snippet}
	</svelte:boundary>
</div>

<Toast />

<!-- Global Move Chat Modal -->
{#if moveChatModalStore.isOpen && moveChatModalStore.conversation}
	<MoveChatModal
		conversation={moveChatModalStore.conversation}
		onMove={(spaceId, areaId) => moveChatModalStore.move(spaceId, areaId)}
		onClose={() => moveChatModalStore.close()}
	/>
{/if}

<!-- Global Command Palette -->
<CommandPalette />

<!-- Keyboard Shortcuts Modal -->
<KeyboardShortcutsModal
	open={showShortcutsModal}
	onClose={() => showShortcutsModal = false}
/>

<!-- Snake Game Modal -->
<SnakeGame
	isOpen={gameStore.isSnakeOpen}
	onClose={() => gameStore.closeSnake()}
/>

<!-- Wordle Game Modal -->
<WordleGame
	isOpen={gameStore.isWordleOpen}
	onClose={() => gameStore.closeWordle()}
/>

<!-- Prompt Runner Game Modal -->
<PromptRunnerGame
	isOpen={gameStore.isPromptRunnerOpen}
	onClose={() => gameStore.closePromptRunner()}
/>

<!-- Matrix Rain Effect (Hacker Mode) -->
{#if easterEggsStore.matrixRainActive}
	<MatrixRain
		duration={3000}
		onComplete={() => easterEggsStore.onMatrixRainComplete()}
	/>
{/if}

<!-- Confetti Effect (Party Mode & Celebrations) -->
{#if easterEggsStore.confettiActive}
	<Confetti
		duration={5000}
		particleCount={350}
		onComplete={() => easterEggsStore.onConfettiComplete()}
	/>
{/if}

<!-- Commerce Buy Modal (global for product card clicks) -->
<BuyModal />
