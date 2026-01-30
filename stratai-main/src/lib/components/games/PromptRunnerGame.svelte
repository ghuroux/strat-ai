<!--
	PromptRunnerGame.svelte - Prompt Runner Game Modal

	Container modal for the endless runner game featuring:
	- Full-screen modal with keyboard shortcuts
	- Game canvas with controls
	- Real-time score (tokens processed) and level display
	- Personal best and org best tracking
	- Org-wide leaderboard
	- Confetti celebration on new records

	Keyboard:
	- Space / ↑: Jump
	- P: Pause/Resume
	- Enter: Start / Restart (when idle or game over)
	- Escape: Close modal
-->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { X, Play, Pause, RotateCcw, Terminal, Keyboard } from 'lucide-svelte';
	import PromptRunnerCanvas from './PromptRunnerCanvas.svelte';
	import SnakeLeaderboard from './SnakeLeaderboard.svelte';
	import Confetti from '../effects/Confetti.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import type { GameScoreWithUser } from '$lib/server/persistence/game-scores-postgres';
	import type { RunnerStats } from './PromptRunnerCanvas.svelte';

	// =============================================================================
	// Props
	// =============================================================================

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	// =============================================================================
	// State
	// =============================================================================

	let gameState = $state<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
	let isPaused = $state(false);
	let currentScore = $state(0);
	let currentLevel = $state(1);

	// Leaderboard data
	let leaderboard = $state<GameScoreWithUser[]>([]);
	let personalBest = $state<number | null>(null);
	let orgBest = $state<number | null>(null);
	let personalRank = $state<number | null>(null);
	let isLoadingLeaderboard = $state(false);

	// Celebration
	let showConfetti = $state(false);
	let isNewPersonalBest = $state(false);
	let isNewOrgBest = $state(false);

	// Theme
	let isDarkMode = $derived(settingsStore.theme === 'dark');

	// Canvas ref
	let canvasRef: { start: () => void } | undefined = $state();

	// =============================================================================
	// Data Fetching
	// =============================================================================

	async function fetchLeaderboard() {
		isLoadingLeaderboard = true;
		try {
			const response = await fetch('/api/games/scores?gameType=prompt-runner&limit=10');
			if (response.ok) {
				const data = await response.json();
				leaderboard = data.leaderboard || [];
				personalBest = data.personalBest?.score ?? null;
				personalRank = data.personalRank;

				if (leaderboard.length > 0) {
					orgBest = leaderboard[0].score;
				}
			}
		} catch (error) {
			console.error('Failed to fetch leaderboard:', error);
		} finally {
			isLoadingLeaderboard = false;
		}
	}

	async function saveScore(stats: RunnerStats) {
		try {
			const response = await fetch('/api/games/scores', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					gameType: 'prompt-runner',
					score: stats.score,
					level: stats.level,
					metadata: {
						obstaclesCleared: stats.obstaclesCleared,
						timeMs: stats.timeMs
					}
				})
			});

			if (response.ok) {
				const data = await response.json();
				isNewPersonalBest = data.isPersonalBest;
				isNewOrgBest = data.isOrgBest;

				if (isNewPersonalBest || isNewOrgBest) {
					showConfetti = true;

					if (isNewOrgBest) {
						toastStore.success('New Organization Record!', 4000);
					} else if (isNewPersonalBest) {
						toastStore.success('New Personal Best!', 3000);
					}
				}

				await fetchLeaderboard();
			}
		} catch (error) {
			console.error('Failed to save score:', error);
		}
	}

	// Fetch leaderboard when modal opens
	$effect(() => {
		if (isOpen) {
			fetchLeaderboard();
			gameState = 'idle';
			isPaused = false;
			currentScore = 0;
			currentLevel = 1;
			isNewPersonalBest = false;
			isNewOrgBest = false;
		}
	});

	// =============================================================================
	// Game Event Handlers
	// =============================================================================

	function handleScore(score: number) {
		currentScore = score;
	}

	function handleLevelUp(level: number) {
		currentLevel = level;
		toastStore.info(`Level ${level}!`, 1500);
	}

	function handleGameOver(stats: RunnerStats) {
		gameState = 'gameover';
		isPaused = false;

		if (stats.score > 0) {
			saveScore(stats);
		}
	}

	function handleGameStart() {
		gameState = 'playing';
		isPaused = false;
		currentScore = 0;
		currentLevel = 1;
		isNewPersonalBest = false;
		isNewOrgBest = false;
	}

	// =============================================================================
	// Keyboard Handling
	// =============================================================================

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;

		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return;
		}

		// P to pause/resume (only when playing)
		if ((e.key === 'p' || e.key === 'P') && gameState === 'playing') {
			e.preventDefault();
			isPaused = !isPaused;
			return;
		}
	}

	// =============================================================================
	// Confetti Handler
	// =============================================================================

	function handleConfettiComplete() {
		showConfetti = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Confetti overlay -->
	{#if showConfetti}
		<Confetti
			duration={isNewOrgBest ? 5000 : 3500}
			particleCount={isNewOrgBest ? 200 : 120}
			onComplete={handleConfettiComplete}
		/>
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
			   w-full max-w-3xl max-h-[90vh] overflow-hidden
			   bg-white dark:bg-zinc-900
			   border border-zinc-200 dark:border-zinc-700/50
			   rounded-2xl shadow-2xl"
		transition:fly={{ y: 20, duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="runner-game-title"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-5 py-4
					border-b border-zinc-200 dark:border-zinc-700/50">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600
							flex items-center justify-center">
					<Terminal size={20} class="text-white" />
				</div>
				<div>
					<h2 id="runner-game-title" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						Prompt Runner
					</h2>
					<p class="text-xs text-zinc-500 dark:text-zinc-400">
						Navigate the LLM pipeline
					</p>
				</div>
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

		<!-- Content -->
		<div class="p-5 overflow-y-auto max-h-[calc(90vh-10rem)]">
			<div class="flex flex-col lg:flex-row gap-5">
				<!-- Game area -->
				<div class="flex-1">
					<!-- Score bar -->
					<div class="flex items-center justify-between mb-3 px-1">
						<div class="flex items-center gap-4">
							<div class="score-stat">
								<span class="stat-label">Tokens</span>
								<span class="stat-value">{currentScore.toLocaleString()}</span>
							</div>
							<div class="score-stat">
								<span class="stat-label">Level</span>
								<span class="stat-value">{currentLevel}</span>
							</div>
						</div>

						<div class="flex items-center gap-4 text-right">
							{#if personalBest !== null}
								<div class="score-stat">
									<span class="stat-label">Your Best</span>
									<span class="stat-value text-cyan-500">{personalBest.toLocaleString()}</span>
								</div>
							{/if}
							{#if orgBest !== null}
								<div class="score-stat">
									<span class="stat-label">Org Best</span>
									<span class="stat-value text-yellow-500">{orgBest.toLocaleString()}</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Canvas -->
					<PromptRunnerCanvas
						bind:this={canvasRef}
						{isPaused}
						{isDarkMode}
						onScore={handleScore}
						onLevelUp={handleLevelUp}
						onGameOver={handleGameOver}
						onGameStart={handleGameStart}
					/>

					<!-- Game status -->
					<div class="mt-3 flex items-center justify-center gap-2">
						{#if gameState === 'playing' && isPaused}
							<div class="status-badge paused">
								<Pause size={14} />
								<span>Paused</span>
							</div>
						{:else if gameState === 'playing'}
							<div class="status-badge playing">
								<Play size={14} />
								<span>Running</span>
							</div>
						{:else if gameState === 'gameover'}
							<div class="status-badge gameover">
								<RotateCcw size={14} />
								<span>Buffer Overflow - Press Space to retry</span>
							</div>
						{:else}
							<div class="status-badge idle">
								<Keyboard size={14} />
								<span>Press Space or Click to start</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Leaderboard sidebar -->
				<div class="w-full lg:w-64 flex-shrink-0">
					<SnakeLeaderboard
						{leaderboard}
						currentUserId={userStore.id || ''}
						{personalRank}
						isLoading={isLoadingLeaderboard}
					/>
				</div>
			</div>
		</div>

		<!-- Footer with controls -->
		<div class="px-5 py-3 border-t border-zinc-100 dark:border-zinc-700/30
					bg-zinc-50/50 dark:bg-zinc-900/50">
			<div class="flex items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
				<div class="flex items-center gap-1.5">
					<kbd>Space</kbd>
					<span>or</span>
					<kbd>↑</kbd>
					<span>Jump</span>
				</div>
				<div class="flex items-center gap-1.5">
					<kbd>P</kbd>
					<span>Pause</span>
				</div>
				<div class="flex items-center gap-1.5">
					<kbd>Esc</kbd>
					<span>Close</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Score stats */
	.score-stat {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.stat-label {
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(113, 113, 122, 0.8);
	}

	:global(.dark) .stat-label {
		color: rgba(161, 161, 170, 0.8);
	}

	.stat-value {
		font-size: 1rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: #18181b;
	}

	:global(.dark) .stat-value {
		color: #fafafa;
	}

	/* Status badges */
	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status-badge.idle {
		background: rgba(113, 113, 122, 0.1);
		color: #71717a;
	}

	.status-badge.playing {
		background: rgba(6, 182, 212, 0.1);
		color: #06b6d4;
	}

	.status-badge.paused {
		background: rgba(234, 179, 8, 0.1);
		color: #eab308;
	}

	.status-badge.gameover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	/* Keyboard hints */
	kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.375rem;
		font-size: 0.625rem;
		font-family: inherit;
		font-weight: 500;
		background: rgba(0, 0, 0, 0.06);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 0.25rem;
		color: rgba(0, 0, 0, 0.6);
	}

	:global(.dark) kbd {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.5);
	}
</style>
