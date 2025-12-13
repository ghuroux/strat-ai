<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { ArenaBattle } from '$lib/stores/arena.svelte';

	interface Props {
		battle: ArenaBattle;
		active?: boolean;
		menuOpen?: boolean;
		onMenuToggle?: (isOpen: boolean) => void;
		onclick?: () => void;
		ondelete?: () => void;
		onpin?: () => void;
		onrename?: (newTitle: string) => void;
		onexport?: () => void;
		onrerun?: () => void;
	}

	let {
		battle,
		active = false,
		menuOpen = false,
		onMenuToggle,
		onclick,
		ondelete,
		onpin,
		onrename,
		onexport,
		onrerun
	}: Props = $props();

	let isEditing = $state(false);
	let editTitle = $state('');
	let inputRef: HTMLInputElement | undefined = $state();
	let menuButtonRef: HTMLButtonElement | undefined = $state();
	let menuPosition = $state({ top: 0, left: 0 });
	let isPinned = $derived(battle.pinned ?? false);

	// Get display title (custom or truncated prompt)
	function getDisplayTitle(): string {
		if (battle.title) return battle.title;
		return battle.prompt.slice(0, 50) + (battle.prompt.length > 50 ? '...' : '');
	}

	// Format relative time
	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'Just now';
	}

	// Get status badge color
	function getStatusColor(status: ArenaBattle['status']): string {
		switch (status) {
			case 'streaming':
				return 'bg-primary-500/20 text-primary-400';
			case 'judging':
				return 'bg-amber-500/20 text-amber-400';
			case 'judged':
				return 'bg-green-500/20 text-green-400';
			case 'complete':
				return 'bg-surface-600 text-surface-300';
			default:
				return 'bg-surface-700 text-surface-400';
		}
	}

	// Get winner name
	function getWinnerName(): string | null {
		if (!battle.aiJudgment?.winnerId) return null;
		const winner = battle.models.find((m) => m.id === battle.aiJudgment?.winnerId);
		return winner?.displayName || null;
	}

	function handleItemClick() {
		if (!isEditing) {
			onclick?.();
		}
	}

	function toggleMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();

		// Calculate position for fixed dropdown - adjacent to button
		if (menuButtonRef && !menuOpen) {
			const rect = menuButtonRef.getBoundingClientRect();
			const menuHeight = 220; // Approximate height with rerun option
			// Position menu so it's vertically centered on the button
			menuPosition = {
				top: Math.max(8, rect.top + rect.height / 2 - menuHeight / 2),
				left: rect.right + 8
			};
		}

		onMenuToggle?.(!menuOpen);
	}

	function doRename(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onMenuToggle?.(false);
		isEditing = true;
		editTitle = battle.title || battle.prompt.slice(0, 50);
		setTimeout(() => inputRef?.focus(), 0);
	}

	function doPin(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onMenuToggle?.(false);
		onpin?.();
	}

	function doExport(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onMenuToggle?.(false);
		onexport?.();
	}

	function doRerun(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onMenuToggle?.(false);
		onrerun?.();
	}

	function doDelete(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onMenuToggle?.(false);
		ondelete?.();
	}

	function handleMenuMouseLeave() {
		onMenuToggle?.(false);
	}

	function submitRename() {
		const trimmed = editTitle.trim();
		if (trimmed && trimmed !== battle.title) {
			onrename?.(trimmed);
		}
		isEditing = false;
	}

	function handleInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submitRename();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			isEditing = false;
		}
	}
</script>

<div
	class="battle-item {active ? 'active' : ''}"
	role="button"
	tabindex="0"
	onclick={handleItemClick}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleItemClick()}
	in:fly={{ x: -20, duration: 200 }}
>
	<!-- Content -->
	<div class="item-content">
		{#if isEditing}
			<input
				bind:this={inputRef}
				type="text"
				bind:value={editTitle}
				onkeydown={handleInputKeydown}
				onblur={submitRename}
				onclick={(e) => e.stopPropagation()}
				class="rename-input"
				placeholder="Battle title..."
			/>
		{:else}
			<!-- Title/Prompt preview -->
			<p class="item-title">{getDisplayTitle()}</p>

			<!-- Meta info -->
			<div class="item-meta">
				<span class="model-count">{battle.models.length} models</span>
				<span class="status-badge {getStatusColor(battle.status)}">{battle.status}</span>
				<span class="time">{formatRelativeTime(battle.createdAt)}</span>
			</div>

			<!-- Winner or user vote -->
			{#if battle.aiJudgment?.winnerId}
				{@const winnerName = getWinnerName()}
				{#if winnerName}
					<div class="winner-indicator">
						<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
						</svg>
						{winnerName}
					</div>
				{/if}
			{:else if battle.aiJudgment && !battle.aiJudgment.winnerId}
				<div class="tie-indicator">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01" />
					</svg>
					Tie
				</div>
			{/if}
		{/if}
	</div>

	<!-- Pin indicator (when not hovering) -->
	{#if isPinned}
		<div class="pin-indicator">
			<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
				<path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
			</svg>
		</div>
	{/if}

	<!-- Menu trigger button -->
	<button
		bind:this={menuButtonRef}
		type="button"
		class="menu-trigger"
		onclick={toggleMenu}
		aria-label="More options"
		aria-haspopup="true"
		aria-expanded={menuOpen}
	>
		<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
			<circle cx="12" cy="5" r="2" />
			<circle cx="12" cy="12" r="2" />
			<circle cx="12" cy="19" r="2" />
		</svg>
	</button>

	<!-- Dropdown menu (fixed position) -->
	{#if menuOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="dropdown-menu"
			style="top: {menuPosition.top}px; left: {menuPosition.left}px;"
			onmouseleave={handleMenuMouseLeave}
			transition:fade={{ duration: 100 }}
		>
			<button type="button" class="dropdown-item dropdown-item-primary" onclick={doRerun}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				Rerun
			</button>
			<div class="dropdown-divider"></div>
			<button type="button" class="dropdown-item" onclick={doRename}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
				</svg>
				Rename
			</button>
			<button type="button" class="dropdown-item" onclick={doPin}>
				<svg class="w-4 h-4" viewBox="0 0 24 24">
					{#if isPinned}
						<path fill="currentColor" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
					{:else}
						<path stroke="currentColor" stroke-width="2" fill="none" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
					{/if}
				</svg>
				{isPinned ? 'Unpin' : 'Pin'}
			</button>
			<button type="button" class="dropdown-item" onclick={doExport}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				Export
			</button>
			<div class="dropdown-divider"></div>
			<button type="button" class="dropdown-item dropdown-item-danger" onclick={doDelete}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
				Delete
			</button>
		</div>
	{/if}
</div>

<style>
	.battle-item {
		position: relative;
		display: flex;
		align-items: flex-start;
		padding: 0.75rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.battle-item:hover {
		background-color: rgba(255, 255, 255, 0.03);
	}

	.battle-item.active {
		background-color: #27272a;
	}

	.item-content {
		flex: 1;
		min-width: 0;
		padding-right: 1.5rem;
	}

	.item-title {
		font-size: 0.875rem;
		color: #e4e4e7;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.item-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.model-count {
		color: #71717a;
	}

	.status-badge {
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.6875rem;
	}

	.time {
		color: #71717a;
		margin-left: auto;
	}

	.winner-indicator {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: #a78bfa;
	}

	.tie-indicator {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: #71717a;
	}

	.rename-input {
		width: 100%;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		background-color: #27272a;
		border: 1px solid #6366f1;
		border-radius: 0.25rem;
		color: #e4e4e7;
		outline: none;
	}

	.rename-input:focus {
		box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
	}

	.pin-indicator {
		position: absolute;
		right: 1.75rem;
		top: 0.75rem;
		color: #fbbf24;
		opacity: 1;
		transition: opacity 0.15s ease;
	}

	.battle-item:hover .pin-indicator {
		opacity: 0;
	}

	.menu-trigger {
		position: absolute;
		right: 0.5rem;
		top: 0.75rem;
		padding: 0.375rem;
		border-radius: 0.375rem;
		color: #71717a;
		background: transparent;
		border: none;
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
	}

	.battle-item:hover .menu-trigger,
	.menu-trigger[aria-expanded="true"] {
		opacity: 1;
	}

	.menu-trigger:hover {
		background-color: #3f3f46;
		color: #e4e4e7;
	}

	.dropdown-menu {
		position: fixed;
		width: 140px;
		padding: 0.25rem 0;
		background-color: #18181b;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
		z-index: 9999;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: #e4e4e7;
		background: none;
		border: none;
		cursor: pointer;
		transition: background-color 0.1s ease;
		text-align: left;
	}

	.dropdown-item:hover {
		background-color: #27272a;
	}

	.dropdown-item-primary {
		color: #60a5fa;
	}

	.dropdown-item-primary:hover {
		background-color: rgba(96, 165, 250, 0.1);
	}

	.dropdown-item-danger {
		color: #f87171;
	}

	.dropdown-item-danger:hover {
		background-color: rgba(248, 113, 113, 0.1);
	}

	.dropdown-divider {
		height: 1px;
		margin: 0.25rem 0;
		background-color: #3f3f46;
	}
</style>
