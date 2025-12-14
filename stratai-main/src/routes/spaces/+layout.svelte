<script lang="ts">
	import { page } from '$app/stores';
	import { SPACES, isValidSpace } from '$lib/config/spaces';
	import type { SpaceType } from '$lib/types/chat';

	let { children } = $props();

	// Get current space from URL param (if in [space] route)
	let currentSpace = $derived.by(() => {
		const spaceParam = $page.params.space;
		if (spaceParam && isValidSpace(spaceParam)) {
			return spaceParam as SpaceType;
		}
		return null;
	});

	// Get space config for theming
	let spaceConfig = $derived(currentSpace ? SPACES[currentSpace] : null);
</script>

<!-- Apply space-specific CSS variables via data attribute -->
<div
	class="h-screen flex flex-col overflow-hidden"
	data-space={currentSpace}
>
	{@render children()}
</div>

<style>
	/* Space theming via CSS custom properties */
	[data-space="work"] {
		--space-accent: #3b82f6;
		--space-accent-light: #dbeafe;
		--space-accent-dark: #2563eb;
		--space-accent-muted: rgba(59, 130, 246, 0.15);
		--space-accent-ring: rgba(59, 130, 246, 0.4);
	}

	[data-space="research"] {
		--space-accent: #a855f7;
		--space-accent-light: #f3e8ff;
		--space-accent-dark: #9333ea;
		--space-accent-muted: rgba(168, 85, 247, 0.15);
		--space-accent-ring: rgba(168, 85, 247, 0.4);
	}

	[data-space="random"] {
		--space-accent: #f97316;
		--space-accent-light: #ffedd5;
		--space-accent-dark: #ea580c;
		--space-accent-muted: rgba(249, 115, 22, 0.15);
		--space-accent-ring: rgba(249, 115, 22, 0.4);
	}

	[data-space="personal"] {
		--space-accent: #22c55e;
		--space-accent-light: #dcfce7;
		--space-accent-dark: #16a34a;
		--space-accent-muted: rgba(34, 197, 94, 0.15);
		--space-accent-ring: rgba(34, 197, 94, 0.4);
	}
</style>
