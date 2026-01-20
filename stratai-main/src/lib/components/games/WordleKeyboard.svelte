<!--
	WordleKeyboard.svelte - On-screen QWERTY Keyboard

	Features:
	- QWERTY layout with Enter and Backspace
	- Color-coded keys showing letter states
	- Click or physical keyboard input
	- Touch-friendly sizing
-->
<script lang="ts">
	import { Delete, CornerDownLeft } from 'lucide-svelte';
	import type { LetterState } from './wordle-words';

	// =============================================================================
	// Props
	// =============================================================================

	interface Props {
		letterStates: Map<string, LetterState>;
		onKey: (key: string) => void;
		onEnter: () => void;
		onBackspace: () => void;
		disabled?: boolean;
	}

	let {
		letterStates,
		onKey,
		onEnter,
		onBackspace,
		disabled = false
	}: Props = $props();

	// =============================================================================
	// Keyboard Layout
	// =============================================================================

	const rows = [
		['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
		['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
		['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace']
	];

	// =============================================================================
	// Helpers
	// =============================================================================

	function getKeyState(key: string): LetterState | 'unused' {
		return letterStates.get(key) || 'unused';
	}

	function handleKeyClick(key: string) {
		if (disabled) return;

		if (key === 'enter') {
			onEnter();
		} else if (key === 'backspace') {
			onBackspace();
		} else {
			onKey(key);
		}
	}
</script>

<div class="keyboard">
	{#each rows as row, rowIndex}
		<div class="keyboard-row">
			{#each row as key}
				{@const state = getKeyState(key)}
				{@const isSpecial = key === 'enter' || key === 'backspace'}
				<button
					type="button"
					class="key {state}"
					class:special={isSpecial}
					class:enter={key === 'enter'}
					onclick={() => handleKeyClick(key)}
					{disabled}
				>
					{#if key === 'enter'}
						<CornerDownLeft size={18} />
					{:else if key === 'backspace'}
						<Delete size={18} />
					{:else}
						{key.toUpperCase()}
					{/if}
				</button>
			{/each}
		</div>
	{/each}
</div>

<style>
	.keyboard {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px;
		max-width: 500px;
		margin: 0 auto;
	}

	.keyboard-row {
		display: flex;
		justify-content: center;
		gap: 5px;
	}

	.key {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 36px;
		height: 52px;
		padding: 0 12px;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.15s ease;
		user-select: none;

		/* Default unused state */
		background: rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.9);
	}

	:global(.light) .key {
		background: rgba(0, 0, 0, 0.1);
		color: rgba(0, 0, 0, 0.9);
	}

	.key:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.25);
		transform: translateY(-1px);
	}

	:global(.light) .key:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.15);
	}

	.key:active:not(:disabled) {
		transform: translateY(1px);
	}

	.key:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Special keys (Enter, Backspace) */
	.key.special {
		min-width: 56px;
		font-size: 0.75rem;
	}

	.key.enter {
		background: rgba(34, 197, 94, 0.3);
	}

	.key.enter:hover:not(:disabled) {
		background: rgba(34, 197, 94, 0.5);
	}

	/* Letter state colors */
	.key.correct {
		background: #22c55e;
		color: white;
	}

	.key.correct:hover:not(:disabled) {
		background: #16a34a;
	}

	.key.present {
		background: #eab308;
		color: white;
	}

	.key.present:hover:not(:disabled) {
		background: #ca8a04;
	}

	.key.absent {
		background: #3f3f46;
		color: rgba(255, 255, 255, 0.6);
	}

	:global(.light) .key.absent {
		background: #9ca3af;
		color: white;
	}

	.key.absent:hover:not(:disabled) {
		background: #52525b;
	}

	:global(.light) .key.absent:hover:not(:disabled) {
		background: #6b7280;
	}

	/* Responsive sizing */
	@media (max-width: 400px) {
		.key {
			min-width: 28px;
			height: 46px;
			padding: 0 8px;
			font-size: 0.75rem;
		}

		.key.special {
			min-width: 44px;
			font-size: 0.625rem;
		}

		.keyboard {
			gap: 4px;
		}

		.keyboard-row {
			gap: 3px;
		}
	}
</style>
