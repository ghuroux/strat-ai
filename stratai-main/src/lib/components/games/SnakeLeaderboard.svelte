<!--
	SnakeLeaderboard.svelte - Org-wide Leaderboard Display

	Displays top 10 org scores with usernames.
	Highlights current user's position on the leaderboard.
	Handles loading and empty states.
-->
<script lang="ts">
	import { Trophy, Medal, Award, User } from 'lucide-svelte';
	import type { GameScoreWithUser } from '$lib/server/persistence/game-scores-postgres';

	// =============================================================================
	// Props
	// =============================================================================

	interface Props {
		leaderboard: GameScoreWithUser[];
		currentUserId: string;
		personalRank?: number | null;
		isLoading?: boolean;
	}

	let { leaderboard, currentUserId, personalRank, isLoading = false }: Props = $props();

	// =============================================================================
	// Helpers
	// =============================================================================

	/**
	 * Get display name for a user
	 */
	function getDisplayName(entry: GameScoreWithUser): string {
		if (entry.displayName) return entry.displayName;
		if (entry.firstName) return entry.firstName;
		return entry.username;
	}

	/**
	 * Get rank icon for top 3
	 */
	function getRankIcon(rank: number) {
		switch (rank) {
			case 1:
				return Trophy;
			case 2:
				return Medal;
			case 3:
				return Award;
			default:
				return null;
		}
	}

	/**
	 * Get rank color for top 3
	 */
	function getRankColor(rank: number): string {
		switch (rank) {
			case 1:
				return 'text-yellow-500';
			case 2:
				return 'text-zinc-400';
			case 3:
				return 'text-amber-600';
			default:
				return 'text-zinc-500';
		}
	}

	/**
	 * Check if entry is the current user
	 */
	function isCurrentUser(entry: GameScoreWithUser): boolean {
		return entry.userId === currentUserId;
	}
</script>

<div class="leaderboard">
	<h3 class="leaderboard-title">
		<Trophy size={16} class="text-yellow-500" />
		<span>Top 10</span>
	</h3>

	{#if isLoading}
		<!-- Loading skeleton -->
		<div class="leaderboard-list">
			{#each Array(5) as _, i}
				<div class="leaderboard-entry skeleton">
					<div class="rank-badge skeleton-badge"></div>
					<div class="entry-content">
						<div class="skeleton-name"></div>
						<div class="skeleton-score"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if leaderboard.length === 0}
		<!-- Empty state -->
		<div class="empty-state">
			<User size={24} class="text-zinc-500" />
			<p>No scores yet</p>
			<span>Be the first to play!</span>
		</div>
	{:else}
		<!-- Leaderboard entries -->
		<div class="leaderboard-list">
			{#each leaderboard as entry, index}
				{@const rank = index + 1}
				{@const RankIcon = getRankIcon(rank)}
				<div
					class="leaderboard-entry"
					class:current-user={isCurrentUser(entry)}
					class:top-three={rank <= 3}
				>
					<div class="rank-badge {getRankColor(rank)}">
						{#if RankIcon}
							<RankIcon size={14} />
						{:else}
							<span>{rank}</span>
						{/if}
					</div>

					<div class="entry-content">
						<span class="entry-name" class:highlight={isCurrentUser(entry)}>
							{getDisplayName(entry)}
							{#if isCurrentUser(entry)}
								<span class="you-badge">you</span>
							{/if}
						</span>
						<span class="entry-score">{entry.score.toLocaleString()}</span>
					</div>
				</div>
			{/each}
		</div>

		<!-- Personal rank if not in top 10 -->
		{#if personalRank && personalRank > 10}
			<div class="personal-rank">
				<span class="rank-label">Your rank:</span>
				<span class="rank-value">#{personalRank}</span>
			</div>
		{/if}
	{/if}
</div>

<style>
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
		gap: 0.625rem;
		padding: 0.5rem 0.625rem;
		border-radius: 0.5rem;
		transition: background-color 0.15s;
	}

	.leaderboard-entry:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	:global(.light) .leaderboard-entry:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	.leaderboard-entry.current-user {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.2);
	}

	:global(.light) .leaderboard-entry.current-user {
		background: rgba(34, 197, 94, 0.08);
	}

	.rank-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	.entry-content {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-width: 0;
	}

	.entry-name {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.85);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	:global(.light) .entry-name {
		color: rgba(0, 0, 0, 0.85);
	}

	.entry-name.highlight {
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

	.entry-score {
		font-size: 0.8125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		font-variant-numeric: tabular-nums;
	}

	:global(.light) .entry-score {
		color: rgba(0, 0, 0, 0.7);
	}

	.personal-rank {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	:global(.light) .personal-rank {
		border-color: rgba(0, 0, 0, 0.08);
	}

	.rank-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	:global(.light) .rank-label {
		color: rgba(0, 0, 0, 0.5);
	}

	.rank-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
	}

	:global(.light) .rank-value {
		color: rgba(0, 0, 0, 0.9);
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1.5rem 1rem;
		text-align: center;
		gap: 0.25rem;
	}

	.empty-state p {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		margin-top: 0.5rem;
	}

	:global(.light) .empty-state p {
		color: rgba(0, 0, 0, 0.7);
	}

	.empty-state span {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	:global(.light) .empty-state span {
		color: rgba(0, 0, 0, 0.4);
	}

	/* Skeleton loading */
	.skeleton {
		animation: pulse 1.5s ease-in-out infinite;
	}

	.skeleton-badge {
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 0.375rem;
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.light) .skeleton-badge {
		background: rgba(0, 0, 0, 0.1);
	}

	.skeleton-name {
		width: 60%;
		height: 0.75rem;
		border-radius: 0.25rem;
		background: rgba(255, 255, 255, 0.08);
	}

	:global(.light) .skeleton-name {
		background: rgba(0, 0, 0, 0.08);
	}

	.skeleton-score {
		width: 2.5rem;
		height: 0.75rem;
		border-radius: 0.25rem;
		background: rgba(255, 255, 255, 0.06);
	}

	:global(.light) .skeleton-score {
		background: rgba(0, 0, 0, 0.06);
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>
