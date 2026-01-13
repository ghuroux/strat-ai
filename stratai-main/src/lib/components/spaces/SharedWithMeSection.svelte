<script lang="ts">
	/**
	 * SharedWithMeSection - Shows areas shared with the user from other spaces
	 *
	 * Displays on Organization Space dashboards only.
	 * Shows areas where user has explicit membership but didn't create.
	 *
	 * Implements SPACE_MEMBERSHIPS.md Phase 6
	 */
	import type { SharedAreaInfo } from '$lib/types/areas';

	interface Props {
		sharedAreas: SharedAreaInfo[];
	}

	let { sharedAreas }: Props = $props();
</script>

{#if sharedAreas.length > 0}
	<section class="shared-with-me-section">
		<header class="section-header">
			<h2 class="section-title">Shared with Me</h2>
			<span class="section-count">{sharedAreas.length}</span>
		</header>

		<div class="shared-areas-grid">
			{#each sharedAreas as area (area.id)}
				<a
					href="/spaces/{area.spaceSlug}/{area.slug}"
					class="shared-area-card"
					style="--card-color: {area.color || '#6366f1'}"
				>
					<div class="card-header">
						<div class="card-icon">
							{#if area.icon}
								<span class="icon-emoji">{area.icon}</span>
							{:else}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
									/>
								</svg>
							{/if}
						</div>
						<div class="card-title">
							<h3 class="title">{area.name}</h3>
							<span class="space-badge">{area.spaceName}</span>
						</div>
					</div>
					<div class="shared-by">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
							/>
						</svg>
						<span>Shared by {area.sharedBy.name}</span>
					</div>
				</a>
			{/each}
		</div>
	</section>
{/if}

<style>
	.shared-with-me-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		margin-bottom: 0.5rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.section-count {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.5);
	}

	.shared-areas-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 0.75rem;
	}

	.shared-area-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		text-decoration: none;
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.shared-area-card:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		background: color-mix(in srgb, var(--card-color) 15%, transparent);
		border-radius: 0.5rem;
		color: var(--card-color);
		flex-shrink: 0;
	}

	.card-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.icon-emoji {
		font-size: 1.125rem;
	}

	.card-title {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.space-badge {
		display: inline-flex;
		align-items: center;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--card-color);
		padding: 0.125rem 0.5rem;
		background: color-mix(in srgb, var(--card-color) 10%, transparent);
		border-radius: 9999px;
		width: fit-content;
	}

	.shared-by {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.45);
	}

	.shared-by svg {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.shared-areas-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
