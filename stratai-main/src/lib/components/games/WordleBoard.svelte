<!--
	WordleBoard.svelte - 6×5 Letter Tile Grid

	Displays the Wordle game board with:
	- 6 rows (attempts) × 5 columns (letters)
	- Color-coded tiles: green (correct), yellow (present), gray (absent)
	- Current row shows typed letters
	- Flip animation on reveal
-->
<script lang="ts">
	import { flip } from 'svelte/animate';
	import type { LetterState } from './wordle-words';

	// =============================================================================
	// Types
	// =============================================================================

	export interface GuessResult {
		word: string;
		states: LetterState[];
		revealed: boolean;
	}

	// =============================================================================
	// Props
	// =============================================================================

	interface Props {
		guesses: GuessResult[];
		currentGuess: string;
		currentRow: number;
		maxAttempts?: number;
		shake?: boolean; // Shake animation for invalid word
	}

	let {
		guesses,
		currentGuess,
		currentRow,
		maxAttempts = 6,
		shake = false
	}: Props = $props();

	// =============================================================================
	// Helpers
	// =============================================================================

	/**
	 * Get the letter for a specific cell
	 */
	function getLetter(row: number, col: number): string {
		if (row < guesses.length) {
			// Previous guess
			return guesses[row].word[col]?.toUpperCase() || '';
		} else if (row === currentRow) {
			// Current typing row
			return currentGuess[col]?.toUpperCase() || '';
		}
		return '';
	}

	/**
	 * Get the state for a specific cell
	 */
	function getState(row: number, col: number): LetterState | 'empty' | 'typing' {
		if (row < guesses.length && guesses[row].revealed) {
			return guesses[row].states[col];
		} else if (row === currentRow && currentGuess[col]) {
			return 'typing';
		}
		return 'empty';
	}

	/**
	 * Get animation delay for reveal (stagger effect)
	 */
	function getRevealDelay(col: number): string {
		return `${col * 150}ms`;
	}
</script>

<div class="wordle-board" class:shake>
	{#each Array(maxAttempts) as _, row}
		<div class="board-row" class:current={row === currentRow}>
			{#each Array(5) as _, col}
				{@const letter = getLetter(row, col)}
				{@const state = getState(row, col)}
				{@const isRevealing = row < guesses.length && guesses[row].revealed}
				<div
					class="tile {state}"
					class:filled={letter !== ''}
					class:reveal={isRevealing}
					style:animation-delay={isRevealing ? getRevealDelay(col) : '0ms'}
				>
					<span class="letter">{letter}</span>
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.wordle-board {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px;
	}

	.board-row {
		display: flex;
		gap: 6px;
		justify-content: center;
	}

	.tile {
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.75rem;
		font-weight: 700;
		text-transform: uppercase;
		border-radius: 6px;
		border: 2px solid transparent;
		transition: transform 0.1s ease, border-color 0.1s ease;
		user-select: none;

		/* Default empty state */
		background: transparent;
		border-color: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.9);
	}

	:global(.light) .tile {
		border-color: rgba(0, 0, 0, 0.2);
		color: rgba(0, 0, 0, 0.9);
	}

	/* Filled but not revealed */
	.tile.filled {
		border-color: rgba(255, 255, 255, 0.4);
	}

	:global(.light) .tile.filled {
		border-color: rgba(0, 0, 0, 0.4);
	}

	/* Typing state - slight pop */
	.tile.typing {
		border-color: rgba(255, 255, 255, 0.5);
		animation: pop 0.1s ease;
	}

	:global(.light) .tile.typing {
		border-color: rgba(0, 0, 0, 0.5);
	}

	/* Revealed states with colors */
	.tile.correct {
		background: #22c55e;
		border-color: #22c55e;
		color: white;
	}

	.tile.present {
		background: #eab308;
		border-color: #eab308;
		color: white;
	}

	.tile.absent {
		background: #52525b;
		border-color: #52525b;
		color: white;
	}

	:global(.light) .tile.absent {
		background: #9ca3af;
		border-color: #9ca3af;
	}

	/* Reveal animation */
	.tile.reveal {
		animation: flip 0.5s ease forwards;
		animation-delay: var(--reveal-delay, 0ms);
	}

	/* Letter inside tile */
	.letter {
		line-height: 1;
	}

	/* Shake animation for invalid word */
	.wordle-board.shake .board-row.current {
		animation: shake 0.5s ease;
	}

	/* Pop animation when typing */
	@keyframes pop {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
		}
	}

	/* Flip animation for reveal */
	@keyframes flip {
		0% {
			transform: rotateX(0deg);
		}
		45% {
			transform: rotateX(90deg);
		}
		55% {
			transform: rotateX(90deg);
		}
		100% {
			transform: rotateX(0deg);
		}
	}

	/* Shake animation */
	@keyframes shake {
		0%, 100% {
			transform: translateX(0);
		}
		10%, 30%, 50%, 70%, 90% {
			transform: translateX(-4px);
		}
		20%, 40%, 60%, 80% {
			transform: translateX(4px);
		}
	}

	/* Responsive sizing */
	@media (max-width: 400px) {
		.tile {
			width: 48px;
			height: 48px;
			font-size: 1.5rem;
		}

		.wordle-board {
			gap: 4px;
		}

		.board-row {
			gap: 4px;
		}
	}
</style>
