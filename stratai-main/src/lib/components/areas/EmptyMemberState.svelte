<script lang="ts">
	/**
	 * EmptyMemberState.svelte - Empty state for area sharing
	 *
	 * Displayed when an area has no additional members (only the creator).
	 * Provides visual feedback and sets expectation for inviting members.
	 */

	import { Users } from 'lucide-svelte';
</script>

<div class="empty-state">
	<div class="empty-icon">
		<Users size={48} strokeWidth={1.5} />
	</div>
	<h3 class="empty-heading">No additional members yet</h3>
	<p class="empty-description">Add people or groups to start collaborating</p>
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		text-align: center;
	}

	.empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		margin-bottom: 1rem;
		color: rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.03);
		border-radius: 50%;
	}

	.empty-heading {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 0.5rem;
	}

	.empty-description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		max-width: 300px;
	}

	/* Light mode */
	:global(html.light) .empty-icon {
		color: rgba(0, 0, 0, 0.3);
		background: rgba(0, 0, 0, 0.03);
	}

	:global(html.light) .empty-heading {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .empty-description {
		color: rgba(0, 0, 0, 0.5);
	}
</style>
