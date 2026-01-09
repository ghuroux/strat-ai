<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import MoveChatModal from '$lib/components/chat/MoveChatModal.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import KeyboardShortcutsModal from '$lib/components/KeyboardShortcutsModal.svelte';
	import { moveChatModalStore } from '$lib/stores/moveChatModal.svelte';
	import { commandPaletteStore } from '$lib/stores/commandPalette.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { easterEggsStore } from '$lib/stores/easter-eggs.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

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
	});

	/**
	 * Apply theme on initial page load
	 */
	onMount(() => {
		applyTheme(settingsStore.theme);

		// Listen for system theme changes when using 'system' preference
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (settingsStore.theme === 'system') {
				applyTheme('system');
			}
		};
		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	});

	function applyTheme(theme: 'dark' | 'light' | 'system') {
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
	{@render children()}
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
