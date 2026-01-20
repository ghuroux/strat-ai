<!--
	WordleGame.svelte - Full Wordle Game Modal

	Features:
	- Daily Challenge: Same word for everyone, leaderboard tracked
	- Practice Mode: Random words, unlimited play, no leaderboard
	- 6 attempts to guess the 5-letter word
	- Color feedback: green (correct), yellow (present), gray (absent)
	- Physical keyboard + on-screen keyboard support
	- Confetti on win!
-->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { X, Calendar, Gamepad2, Trophy, RotateCcw } from 'lucide-svelte';
	import WordleBoard from './WordleBoard.svelte';
	import WordleKeyboard from './WordleKeyboard.svelte';
	import Confetti from '../effects/Confetti.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import {
		getDailyWord,
		getRandomWord,
		getTodayDateString,
		isValidWord,
		checkGuess,
		type LetterState
	} from './wordle-words';
	import type { GameScoreWithUser } from '$lib/server/persistence/game-scores-postgres';

	// =============================================================================
	// Types
	// =============================================================================

	type GameMode = 'daily' | 'practice';
	type GameState = 'playing' | 'won' | 'lost';

	interface GuessResult {
		word: string;
		states: LetterState[];
		revealed: boolean;
	}

	// =============================================================================
	// Props
	// =============================================================================

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	// =============================================================================
	// Game State
	// =============================================================================

	let mode = $state<GameMode>('daily');
	let gameState = $state<GameState>('playing');
	let targetWord = $state('');
	let guesses = $state<GuessResult[]>([]);
	let currentGuess = $state('');
	let letterStates = $state(new Map<string, LetterState>());
	let shake = $state(false);
	let dailyCompleted = $state(false);
	let dailyScore = $state<number | null>(null);

	// Leaderboard
	let leaderboard = $state<GameScoreWithUser[]>([]);
	let isLoadingLeaderboard = $state(false);

	// Celebration
	let showConfetti = $state(false);

	// Theme
	let isDarkMode = $derived(settingsStore.theme === 'dark');

	// Computed
	let currentRow = $derived(guesses.length);
	let maxAttempts = 6;

	// =============================================================================
	// Game Logic
	// =============================================================================

	function initGame(newMode: GameMode) {
		mode = newMode;
		gameState = 'playing';
		currentGuess = '';
		guesses = [];
		letterStates = new Map();
		shake = false;
		showConfetti = false;

		if (newMode === 'daily') {
			targetWord = getDailyWord();
			checkDailyCompletion();
		} else {
			targetWord = getRandomWord();
			dailyCompleted = false;
			dailyScore = null;
		}
	}

	async function checkDailyCompletion() {
		try {
			const response = await fetch(`/api/games/scores?gameType=wordle&limit=10`);
			if (response.ok) {
				const data = await response.json();
				leaderboard = data.leaderboard || [];

				// Check if user already completed today's daily
				const todayDate = getTodayDateString();
				const userEntry = leaderboard.find(
					(entry) =>
						entry.userId === userStore.id &&
						entry.metadata?.date === todayDate &&
						entry.metadata?.mode === 'daily'
				);

				if (userEntry) {
					dailyCompleted = true;
					dailyScore = userEntry.score;
					gameState = 'won'; // Show as completed
					// Reconstruct the game state from metadata
					if (userEntry.metadata?.attempts) {
						reconstructGameFromAttempts(userEntry.metadata.attempts as string[]);
					}
				} else {
					dailyCompleted = false;
					dailyScore = null;
				}
			}
		} catch (error) {
			console.error('Failed to check daily completion:', error);
		}
	}

	function reconstructGameFromAttempts(attempts: string[]) {
		guesses = attempts.map((word) => ({
			word,
			states: checkGuess(word, targetWord),
			revealed: true
		}));
		// Rebuild letter states
		letterStates = new Map();
		for (const guess of guesses) {
			for (let i = 0; i < guess.word.length; i++) {
				const letter = guess.word[i];
				const state = guess.states[i];
				const currentState = letterStates.get(letter);
				// Priority: correct > present > absent
				if (state === 'correct' || !currentState) {
					letterStates.set(letter, state);
				} else if (state === 'present' && currentState !== 'correct') {
					letterStates.set(letter, state);
				}
			}
		}
	}

	async function fetchLeaderboard() {
		isLoadingLeaderboard = true;
		try {
			const response = await fetch('/api/games/scores?gameType=wordle&limit=10');
			if (response.ok) {
				const data = await response.json();
				// Filter to only today's daily scores
				const todayDate = getTodayDateString();
				leaderboard = (data.leaderboard || []).filter(
					(entry: GameScoreWithUser) =>
						entry.metadata?.date === todayDate && entry.metadata?.mode === 'daily'
				);
			}
		} catch (error) {
			console.error('Failed to fetch leaderboard:', error);
		} finally {
			isLoadingLeaderboard = false;
		}
	}

	function handleKeyInput(key: string) {
		if (gameState !== 'playing' || currentGuess.length >= 5) return;
		currentGuess += key.toLowerCase();
	}

	function handleBackspace() {
		if (gameState !== 'playing' || currentGuess.length === 0) return;
		currentGuess = currentGuess.slice(0, -1);
	}

	function handleEnter() {
		if (gameState !== 'playing') return;

		// Must have 5 letters
		if (currentGuess.length !== 5) {
			triggerShake();
			toastStore.error('Not enough letters', 1500);
			return;
		}

		// Must be a valid word
		if (!isValidWord(currentGuess)) {
			triggerShake();
			toastStore.error('Not in word list', 1500);
			return;
		}

		// Check the guess
		const states = checkGuess(currentGuess, targetWord);
		const newGuess: GuessResult = {
			word: currentGuess,
			states,
			revealed: true
		};

		guesses = [...guesses, newGuess];

		// Update letter states for keyboard
		for (let i = 0; i < currentGuess.length; i++) {
			const letter = currentGuess[i];
			const state = states[i];
			const currentState = letterStates.get(letter);

			// Priority: correct > present > absent
			if (state === 'correct' || !currentState) {
				letterStates.set(letter, state);
			} else if (state === 'present' && currentState !== 'correct') {
				letterStates.set(letter, state);
			}
		}
		letterStates = new Map(letterStates); // Trigger reactivity

		// Check win condition
		if (currentGuess === targetWord) {
			gameState = 'won';
			showConfetti = true;
			const score = 7 - guesses.length; // 6 for 1 guess, 1 for 6 guesses
			if (mode === 'daily') {
				saveScore(score);
			}
			toastStore.success(getWinMessage(guesses.length), 3000);
		} else if (guesses.length >= maxAttempts) {
			gameState = 'lost';
			toastStore.error(`The word was: ${targetWord.toUpperCase()}`, 4000);
		}

		currentGuess = '';
	}

	function triggerShake() {
		shake = true;
		setTimeout(() => (shake = false), 500);
	}

	function getWinMessage(attempts: number): string {
		const messages = [
			'Genius! 🧠',
			'Magnificent! ✨',
			'Impressive! 🎯',
			'Splendid! 👏',
			'Great! 👍',
			'Phew! 😅'
		];
		return messages[attempts - 1] || 'You got it!';
	}

	async function saveScore(score: number) {
		if (mode !== 'daily') return;

		try {
			const response = await fetch('/api/games/scores', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					gameType: 'wordle',
					score,
					level: guesses.length, // Use level to store number of guesses
					metadata: {
						mode: 'daily',
						date: getTodayDateString(),
						word: targetWord,
						attempts: guesses.map((g) => g.word)
					}
				})
			});

			if (response.ok) {
				const data = await response.json();
				dailyCompleted = true;
				dailyScore = score;
				fetchLeaderboard(); // Refresh leaderboard
			}
		} catch (error) {
			console.error('Failed to save score:', error);
		}
	}

	function playAgain() {
		if (mode === 'daily') {
			// Can't replay daily - switch to practice
			initGame('practice');
			toastStore.info("Switched to Practice mode - you've already completed today's daily!", 3000);
		} else {
			initGame('practice');
		}
	}

	// =============================================================================
	// Keyboard Handler
	// =============================================================================

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		// Escape to close
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return;
		}

		// Don't process game input if not playing
		if (gameState !== 'playing') {
			if (e.key === 'Enter') {
				e.preventDefault();
				playAgain();
			}
			return;
		}

		// Letter input
		if (/^[a-zA-Z]$/.test(e.key)) {
			e.preventDefault();
			handleKeyInput(e.key);
			return;
		}

		// Backspace
		if (e.key === 'Backspace') {
			e.preventDefault();
			handleBackspace();
			return;
		}

		// Enter
		if (e.key === 'Enter') {
			e.preventDefault();
			handleEnter();
			return;
		}
	}

	// =============================================================================
	// Effects
	// =============================================================================

	$effect(() => {
		if (isOpen) {
			initGame('daily');
			fetchLeaderboard();
		}
	});

	function handleConfettiComplete() {
		showConfetti = false;
	}

	// =============================================================================
	// Helpers
	// =============================================================================

	function getDisplayName(entry: GameScoreWithUser): string {
		if (entry.displayName) return entry.displayName;
		if (entry.firstName) return entry.firstName;
		return entry.username;
	}

	function guessesToEmoji(guessCount: number): string {
		return guessCount <= 6 ? `${guessCount}/6` : 'X/6';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Confetti -->
	{#if showConfetti}
		<Confetti duration={3500} particleCount={120} onComplete={handleConfettiComplete} />
	{/if}

	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4
			   bg-black/60 dark:bg-black/70 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={onClose}
		role="button"
		tabindex="-1"
		aria-label="Close game"
	></div>

	<!-- Modal -->
	<div
		class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
			   w-full max-w-3xl max-h-[95vh] overflow-hidden
			   bg-white dark:bg-zinc-900
			   border border-zinc-200 dark:border-zinc-700/50
			   rounded-2xl shadow-2xl"
		transition:fly={{ y: 20, duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="wordle-game-title"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-5 py-4
					border-b border-zinc-200 dark:border-zinc-700/50">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-yellow-500
							flex items-center justify-center text-xl">
					🟩
				</div>
				<div>
					<h2 id="wordle-game-title" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						Wordle
					</h2>
					<p class="text-xs text-zinc-500 dark:text-zinc-400">
						{mode === 'daily' ? "Today's Challenge" : 'Practice Mode'}
					</p>
				</div>
			</div>

			<!-- Mode Toggle -->
			<div class="flex items-center gap-2">
				<div class="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
					<button
						type="button"
						class="mode-btn"
						class:active={mode === 'daily'}
						onclick={() => initGame('daily')}
					>
						<Calendar size={14} />
						<span>Daily</span>
					</button>
					<button
						type="button"
						class="mode-btn"
						class:active={mode === 'practice'}
						onclick={() => initGame('practice')}
					>
						<Gamepad2 size={14} />
						<span>Practice</span>
					</button>
				</div>

				<button
					type="button"
					class="p-2 rounded-lg text-zinc-400 dark:text-zinc-500
						   hover:text-zinc-900 dark:hover:text-zinc-200
						   hover:bg-zinc-100 dark:hover:bg-zinc-800
						   transition-colors"
					onclick={onClose}
				>
					<X size={20} />
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="p-4 overflow-y-auto overflow-x-hidden max-h-[calc(95vh-12rem)]">
			<div class="flex flex-col lg:flex-row gap-6 items-start">
				<!-- Game area -->
				<div class="flex-1 min-w-0 flex flex-col items-center">
					<!-- Board -->
					<WordleBoard {guesses} {currentGuess} {currentRow} {maxAttempts} {shake} />

					<!-- Game over message -->
					{#if gameState === 'won' || gameState === 'lost'}
						<div class="mt-4 text-center">
							{#if gameState === 'won'}
								<p class="text-lg font-semibold text-green-500">
									{#if mode === 'daily' && dailyCompleted}
										You solved today's Wordle in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}!
									{:else}
										🎉 You got it in {guesses.length}!
									{/if}
								</p>
								{#if mode === 'daily'}
									<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
										Score: {7 - guesses.length} points
									</p>
								{/if}
							{:else}
								<p class="text-lg font-semibold text-red-500">
									The word was: <span class="uppercase">{targetWord}</span>
								</p>
							{/if}
							<button
								type="button"
								class="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg
									   bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium
									   transition-colors"
								onclick={playAgain}
							>
								<RotateCcw size={16} />
								{mode === 'daily' ? 'Practice Mode' : 'Play Again'}
							</button>
						</div>
					{/if}

					<!-- Keyboard -->
					<div class="mt-4 w-full">
						<WordleKeyboard
							{letterStates}
							onKey={handleKeyInput}
							onEnter={handleEnter}
							onBackspace={handleBackspace}
							disabled={gameState !== 'playing'}
						/>
					</div>
				</div>

				<!-- Leaderboard (daily mode only) -->
				{#if mode === 'daily'}
					<div class="w-full lg:w-56 flex-shrink-0">
						<div class="leaderboard">
							<h3 class="leaderboard-title">
								<Trophy size={16} class="text-yellow-500" />
								<span>Today's Solvers</span>
							</h3>

							{#if isLoadingLeaderboard}
								<div class="py-4 text-center text-sm text-zinc-500">Loading...</div>
							{:else if leaderboard.length === 0}
								<div class="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
									No one has solved today's word yet.<br />Be the first!
								</div>
							{:else}
								<div class="leaderboard-list">
									{#each leaderboard as entry, index}
										{@const isCurrentUser = entry.userId === userStore.id}
										<div
											class="leaderboard-entry"
											class:current-user={isCurrentUser}
										>
											<span class="rank">{index + 1}</span>
											<span class="name" class:highlight={isCurrentUser}>
												{getDisplayName(entry)}
												{#if isCurrentUser}
													<span class="you-badge">you</span>
												{/if}
											</span>
											<span class="score">{guessesToEmoji(entry.level || 6)}</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Footer -->
		<div class="px-5 py-3 border-t border-zinc-100 dark:border-zinc-700/30
					bg-zinc-50/50 dark:bg-zinc-900/50">
			<div class="flex items-center justify-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
				<span>Type letters to guess</span>
				<span>•</span>
				<span>Green = correct spot</span>
				<span>•</span>
				<span>Yellow = wrong spot</span>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Mode toggle buttons */
	.mode-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(113, 113, 122, 1);
		transition: all 0.15s;
	}

	:global(.dark) .mode-btn {
		color: rgba(161, 161, 170, 1);
	}

	.mode-btn:hover {
		color: rgba(24, 24, 27, 1);
	}

	:global(.dark) .mode-btn:hover {
		color: rgba(250, 250, 250, 1);
	}

	.mode-btn.active {
		background: white;
		color: rgba(24, 24, 27, 1);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .mode-btn.active {
		background: rgba(63, 63, 70, 1);
		color: rgba(250, 250, 250, 1);
	}

	/* Leaderboard */
	.leaderboard {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		padding: 1rem;
	}

	:global(.light) .leaderboard {
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.08);
	}

	.leaderboard-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	:global(.light) .leaderboard-title {
		color: rgba(0, 0, 0, 0.9);
		border-color: rgba(0, 0, 0, 0.08);
	}

	.leaderboard-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.leaderboard-entry {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		border-radius: 0.375rem;
	}

	.leaderboard-entry.current-user {
		background: rgba(34, 197, 94, 0.1);
	}

	.rank {
		width: 1.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
	}

	:global(.light) .rank {
		color: rgba(0, 0, 0, 0.5);
	}

	.name {
		flex: 1;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.85);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	:global(.light) .name {
		color: rgba(0, 0, 0, 0.85);
	}

	.name.highlight {
		color: #22c55e;
		font-weight: 500;
	}

	.you-badge {
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.score {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		font-variant-numeric: tabular-nums;
	}

	:global(.light) .score {
		color: rgba(0, 0, 0, 0.7);
	}
</style>
