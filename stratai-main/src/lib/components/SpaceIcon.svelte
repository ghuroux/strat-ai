<script lang="ts">
	/**
	 * Legacy SpaceIcon component
	 * Now primarily shows 'personal' space icon; other spaces use dynamic icons from DB
	 */
	interface Props {
		space: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
	}

	let { space, size = 'md', class: className = '' }: Props = $props();

	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-5 h-5',
		lg: 'w-6 h-6',
		xl: 'w-8 h-8'
	};
</script>

<svg
	class="{sizeClasses[size]} {className}"
	fill="none"
	stroke="currentColor"
	viewBox="0 0 24 24"
	stroke-width="1.5"
>
	{#if space === 'personal'}
		<!-- Home icon for Personal space -->
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
		/>
	{:else}
		<!-- Default folder icon for custom spaces -->
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
		/>
	{/if}
</svg>
